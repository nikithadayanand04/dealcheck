"""Loads the active models once, serves predictions, and runs/records training."""
from __future__ import annotations

import json
import threading
from datetime import datetime, timezone

import joblib
import pandas as pd
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from . import config
from .database import Product, PriceHistory, ModelVersion, SurveyResponse, QUESTION_COLS
from .features import daily_series, impulse_frame, price_feature_frame, PRICE_FEATURES

_lock = threading.Lock()
_active: dict[str, dict] = {}


def load_active(db: Session) -> None:
    global _active
    loaded = {}
    for mv in db.scalars(select(ModelVersion).where(ModelVersion.is_active.is_(True))):
        try:
            loaded[mv.model_name] = joblib.load(config.MODELS_DIR / mv.file_path)
            loaded[mv.model_name]["version_id"] = mv.id
        except FileNotFoundError:
            continue
    with _lock:
        _active = loaded


def available() -> dict:
    return {"impulse": "impulse" in _active, "price_drop": "price_drop" in _active}


def predict_impulse(answers: dict) -> tuple[float, list[str]] | None:
    from ml.training import explain_impulse
    bundle = _active.get("impulse")
    if not bundle:
        return None
    x = impulse_frame([answers])
    prob = float(bundle["pipeline"].predict_proba(x)[0, 1])
    return prob, explain_impulse(bundle, x)


def predict_drop(history: list[tuple], mrp: float, category: str | None, platform: str | None) -> float | None:
    bundle = _active.get("price_drop")
    if not bundle or len(history) < 2:
        return None
    s = daily_series(history)
    if (s.index[-1] - s.index[0]).days < config.MIN_DAYS_FOR_DROP_PREDICTION:
        return None
    f = price_feature_frame(s, mrp, category, platform)
    if f.empty or f.index[-1] != s.index[-1]:
        return None
    return float(bundle["pipeline"].predict_proba(f[PRICE_FEATURES].iloc[[-1]])[0, 1])


# --------------------------------------------------------------------------
# Training + registry
# --------------------------------------------------------------------------
def _gather_price_data(db: Session):
    products = [{"id": p.id, "mrp": p.mrp, "category": p.category, "platform": p.platform}
                for p in db.scalars(select(Product).where(Product.mrp.is_not(None)))]
    rows = db.execute(select(PriceHistory.product_id, PriceHistory.date, PriceHistory.price)).all()
    histories: dict[int, list] = {}
    for pid, d, price in rows:
        histories.setdefault(pid, []).append((d, price))
    return products, histories


def train_and_register(db: Session, model_name: str, activate: bool = False) -> ModelVersion:
    from ml.training import train_impulse, train_price_drop
    if model_name == "impulse":
        rows = db.scalars(select(SurveyResponse)).all()
        answers = [{q: getattr(r, q) for q in QUESTION_COLS} for r in rows]
        bundle, metrics = train_impulse(answers, [r.label_impulse for r in rows])
    elif model_name == "price_drop":
        bundle, metrics = train_price_drop(*_gather_price_data(db))
    else:
        raise ValueError("Unknown model")

    config.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
    fname = f"{model_name}_{stamp}.joblib"
    joblib.dump(bundle, config.MODELS_DIR / fname)
    mv = ModelVersion(model_name=model_name, algorithm=bundle["algorithm"], metrics_json=json.dumps(metrics),
                      file_path=fname, is_active=False)
    db.add(mv)
    db.commit()
    if activate:
        activate_version(db, mv.id)
    return mv


def activate_version(db: Session, version_id: int) -> ModelVersion:
    mv = db.get(ModelVersion, version_id)
    if mv is None:
        raise LookupError("Model version not found")
    if not (config.MODELS_DIR / mv.file_path).exists():
        raise LookupError("Model file is missing on the server. Retrain the model.")
    db.execute(update(ModelVersion).where(ModelVersion.model_name == mv.model_name).values(is_active=False))
    mv.is_active = True
    db.commit()
    load_active(db)
    return mv
