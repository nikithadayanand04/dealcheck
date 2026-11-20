"""DealCheck API. Run from the project root:  uvicorn backend.app.main:app --reload"""
from __future__ import annotations

import csv
import io
import json
import secrets
import time
from contextlib import asynccontextmanager
from datetime import date, timedelta

import bcrypt
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import analytics, config, content, ml_service
from .database import Check, ImpulseResponse, ModelVersion, PriceHistory, Product, SessionLocal, get_db, init_db
from .ddi import analyse
from .features import QUESTIONS, impulse_level
from .importers import import_prices, import_survey
from .schemas import ActivateRequest, AdminLogin, ImpulseAnswers, LinkCheck, ManualCheck, RetrainRequest
from .urls import LinkError, normalise_product_id, parse_product_url

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with SessionLocal() as db:
        ml_service.load_active(db)
    yield


limiter = Limiter(key_func=get_remote_address, default_limits=[config.RATE_LIMIT])
app = FastAPI(title="DealCheck API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware, allow_origins=config.ALLOWED_ORIGINS, allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


# ---------------------------------------------------------------- errors
@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    return JSONResponse({"error": exc.detail}, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    errs = exc.errors()
    msgs = []
    for e in errs:
        msg = str(e.get("msg", "Invalid input")).removeprefix("Value error, ")
        field = ".".join(str(x) for x in e.get("loc", [])[1:])
        msgs.append(f"{field}: {msg}" if field and not msg[0].isupper() else msg)
    return JSONResponse({"error": msgs[0] if msgs else "Invalid input", "details": msgs}, status_code=422)


@app.exception_handler(RateLimitExceeded)
async def rate_limited(_: Request, exc: RateLimitExceeded):
    return JSONResponse({"error": "Too many requests. Please wait a minute and try again."}, status_code=429)


# ---------------------------------------------------------------- helpers
def _history(db: Session, product_id: int, since: date | None = None) -> list[tuple[date, float]]:
    q = select(PriceHistory.date, PriceHistory.price).where(PriceHistory.product_id == product_id)
    if since:
        q = q.where(PriceHistory.date >= since)
    return [(d, p) for d, p in db.execute(q.order_by(PriceHistory.date)).all()]


def _build_result(db: Session, *, mode, mrp, sale_price, history, ref_date, advertised_pct=None,
                  product: Product | None = None, name=None, platform=None, category=None) -> dict:
    res = analyse(mrp, sale_price, history, ref_date, advertised_pct)
    full_hist = [(d, p) for d, p in history if d < ref_date] + [(ref_date, sale_price)]
    prob = ml_service.predict_drop(full_hist, mrp, category, platform)
    chart_from = ref_date - timedelta(days=config.CONTEXT_DAYS)
    res.update({
        "status": "ok",
        "mode": mode,
        "product": {"name": name, "platform": platform, "category": category,
                    "product_id": product.platform_product_id if product else None},
        "price_date": ref_date.isoformat(),
        "history": [{"date": d.isoformat(), "price": p} for d, p in full_hist if d >= chart_from],
        "drop_probability": round(prob, 3) if prob is not None else None,
        "suggestion": None if prob is None else ("wait" if prob >= 0.5 else "buy"),
        "drop_note": None if prob is not None else (
            "Needs at least 30 days of price history." if ml_service.available()["price_drop"] else "Prediction model not trained yet."),
    })
    db.add(Check(product_id=product.id if product else None, platform=platform, category=category, mode=mode,
                 mrp=mrp, sale_price=sale_price, m30=res["m30"], ad=res["advertised_discount"], rd=res["real_discount"],
                 ddi=res["ddi"], verdict=res["verdict"], confidence=res["confidence"], drop_probability=res["drop_probability"]))
    db.commit()
    return res


# ---------------------------------------------------------------- public API
@app.get("/api/health")
def health():
    return {"status": "ok", "models": ml_service.available()}


@app.get("/api/meta")
def meta():
    return {
        "thresholds": {"genuine_below": config.GENUINE_MAX, "inflated_up_to": config.INFLATED_MAX,
                       "min_points": config.MIN_POINTS, "window_days": config.WINDOW_DAYS},
        "platforms": config.PLATFORMS, "categories": config.CATEGORIES,
        "questions": QUESTIONS, "models": ml_service.available(),
    }


@app.post("/api/check/link")
def check_link(body: LinkCheck, db: Session = Depends(get_db)):
    try:
        platform, ppid = parse_product_url(body.url)
    except LinkError as e:
        raise HTTPException(400, str(e))
    product = db.scalar(select(Product).where(Product.platform == platform, Product.platform_product_id == ppid))
    hist = _history(db, product.id) if product else []
    if not product or not hist or not product.mrp:
        if not product:
            db.add(Product(platform=platform, platform_product_id=ppid))   # add to tracking list
            db.commit()
        return {"status": "not_found", "platform": platform, "product_id": ppid,
                "message": "We don't have enough price history for this product yet. Enter the prices you see to get an estimate."}
    ref_date, sale_price = hist[-1]
    return _build_result(db, mode="link", mrp=product.mrp, sale_price=sale_price, history=hist[:-1], ref_date=ref_date,
                         product=product, name=product.name, platform=platform, category=product.category)


@app.post("/api/check/manual")
def check_manual(body: ManualCheck, db: Session = Depends(get_db)):
    today = date.today()
    product = None
    history: dict[date, float] = {}
    if body.platform_product_id and body.platform != "other":
        ppid = normalise_product_id(body.platform, body.platform_product_id)
        product = db.scalar(select(Product).where(Product.platform == body.platform, Product.platform_product_id == ppid))
        if product is None:
            product = Product(platform=body.platform, platform_product_id=ppid)
            db.add(product)
        product.name = product.name or body.name
        product.category = product.category or body.category
        db.flush()
        # trusted dataset prices first; user-entered prices are used for this check only, never stored
        history.update({d: p for d, p in _history(db, product.id, today - timedelta(days=config.CONTEXT_DAYS)) if d < today})
    for pp in body.past_prices:
        if pp.date < today:
            history[pp.date] = pp.price
    return _build_result(db, mode="manual", mrp=body.mrp, sale_price=body.sale_price, history=sorted(history.items()),
                         ref_date=today, advertised_pct=body.advertised_pct, product=product,
                         name=body.name or (product.name if product else None), platform=body.platform, category=body.category)


@app.post("/api/impulse")
def impulse(body: ImpulseAnswers, db: Session = Depends(get_db)):
    answers = body.model_dump(exclude={"consent"})
    pred = ml_service.predict_impulse(answers)
    if pred is None:
        raise HTTPException(503, "The impulse model hasn't been trained yet. Please try again later.")
    prob, reasons = pred
    score = round(prob * 100)
    level = impulse_level(score)
    advice = {
        "low": "Looks like a planned purchase.",
        "medium": "Take a short break and compare prices once before you buy.",
        "high": "Add it to your wishlist and decide after 24 hours.",
    }[level]
    if not reasons:
        reasons = ["Your answers look mostly like a planned, considered purchase."]
    if body.consent:
        db.add(ImpulseResponse(**answers, impulse_score=score, consent=True))
        db.commit()
    return {"score": score, "level": level, "advice": advice, "reasons": reasons, "saved": body.consent}


@app.get("/api/learn")
def learn():
    return {"patterns": content.DARK_PATTERNS, "anchoring": content.ANCHORING, "complaint": content.COMPLAINT}


# ---------------------------------------------------------------- admin
_tokens: dict[str, float] = {}


def require_admin(authorization: str = Header(default="")) -> None:
    token = authorization.removeprefix("Bearer ").strip()
    exp = _tokens.get(token)
    if not token or not exp or exp < time.time():
        _tokens.pop(token, None)
        raise HTTPException(401, "Please log in again.")


@app.post("/api/admin/login")
@limiter.limit("5/minute")
def admin_login(request: Request, body: AdminLogin):
    if not config.ADMIN_PASSWORD_HASH:
        raise HTTPException(503, "Admin login is not set up. Set ADMIN_PASSWORD_HASH in backend/.env.")
    if not bcrypt.checkpw(body.password.encode(), config.ADMIN_PASSWORD_HASH.encode()):
        raise HTTPException(401, "Incorrect password.")
    for t, exp in list(_tokens.items()):
        if exp < time.time():
            _tokens.pop(t, None)
    token = secrets.token_urlsafe(32)
    _tokens[token] = time.time() + config.TOKEN_TTL_SECONDS
    return {"token": token, "expires_in": config.TOKEN_TTL_SECONDS}


async def _read_csv(file: UploadFile) -> str:
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(400, "Please upload a .csv file.")
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File is larger than 10 MB.")
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(400, "The file must be UTF-8 encoded CSV.")


@app.post("/api/admin/upload/prices", dependencies=[Depends(require_admin)])
async def upload_prices(file: UploadFile = File(...), db: Session = Depends(get_db)):
    text = await _read_csv(file)
    try:
        return import_prices(db, text)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/api/admin/upload/survey", dependencies=[Depends(require_admin)])
async def upload_survey(file: UploadFile = File(...), db: Session = Depends(get_db)):
    text = await _read_csv(file)
    try:
        return import_survey(db, text)
    except ValueError as e:
        raise HTTPException(400, str(e))


def _mv_dict(mv: ModelVersion) -> dict:
    return {"id": mv.id, "model_name": mv.model_name, "algorithm": mv.algorithm, "is_active": mv.is_active,
            "trained_at": mv.trained_at.isoformat(), "metrics": json.loads(mv.metrics_json)}


@app.post("/api/admin/retrain", dependencies=[Depends(require_admin)])
def retrain(body: RetrainRequest, db: Session = Depends(get_db)):
    from ml.training import TrainingError
    try:
        mv = ml_service.train_and_register(db, body.model, activate=False)
    except TrainingError as e:
        raise HTTPException(400, str(e))
    return _mv_dict(mv)


@app.post("/api/admin/activate-model", dependencies=[Depends(require_admin)])
def activate(body: ActivateRequest, db: Session = Depends(get_db)):
    try:
        return _mv_dict(ml_service.activate_version(db, body.version_id))
    except LookupError as e:
        raise HTTPException(404, str(e))


@app.get("/api/admin/models", dependencies=[Depends(require_admin)])
def models(db: Session = Depends(get_db)):
    return [_mv_dict(m) for m in db.scalars(select(ModelVersion).order_by(ModelVersion.id.desc()))]


@app.get("/api/admin/analytics", dependencies=[Depends(require_admin)])
def admin_analytics(db: Session = Depends(get_db)):
    return analytics.compute(db)


@app.get("/api/admin/export", dependencies=[Depends(require_admin)])
def export(db: Session = Depends(get_db)):
    cols = ["id", "created_at", "mode", "platform", "category", "mrp", "sale_price", "m30", "ad", "rd", "ddi",
            "verdict", "confidence", "drop_probability"]
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(cols)
    for c in db.scalars(select(Check).order_by(Check.id)):
        w.writerow([getattr(c, k).isoformat() if k == "created_at" else getattr(c, k) for k in cols])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=dealcheck_checks.csv"})
