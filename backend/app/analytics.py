"""Research analytics for the admin dashboard.

Dataset section: DDI for every product-day in the price dataset that has >= 5 prices
in the previous 30 days (same rule as the live check), grouped by platform, category
and festive vs normal days.
Usage section: what visitors actually checked and their impulse scores.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import config
from .database import Check, ImpulseResponse, PriceHistory, Product
from .ddi import r1, verdict_for
from .features import in_sale_window

_cache: dict = {"key": None, "value": None}


def _dataset_frame(db: Session) -> pd.DataFrame:
    rows = db.execute(
        select(PriceHistory.product_id, PriceHistory.date, PriceHistory.price, Product.mrp, Product.platform, Product.category)
        .join(Product, Product.id == PriceHistory.product_id).where(Product.mrp.is_not(None))
    ).all()
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows, columns=["product_id", "date", "price", "mrp", "platform", "category"])
    df["date"] = pd.to_datetime(df["date"])
    out = []
    for pid, g in df.sort_values("date").groupby("product_id"):
        s = g.set_index("date")["price"]
        roll = s.rolling(f"{config.WINDOW_DAYS}D", closed="left")
        g = g.assign(m30=roll.median().values, points=roll.count().values)
        out.append(g)
    d = pd.concat(out)
    d = d[d["points"] >= config.MIN_POINTS].copy()
    d["ad"] = (d["mrp"] - d["price"]) / d["mrp"] * 100
    d["rd"] = (d["m30"] - d["price"]) / d["m30"] * 100
    d["ddi"] = (d["ad"] - d["rd"]).round(1)
    d["verdict"] = [verdict_for(x, config.MIN_POINTS) for x in d["ddi"]]
    d["festive"] = [in_sale_window(x.date()) for x in d["date"]]
    return d


def _group(d: pd.DataFrame, col: str) -> list[dict]:
    g = d.groupby(col)["ddi"].agg(["mean", "count"]).reset_index()
    return [{"name": str(r[col]), "avg_ddi": r1(r["mean"]), "count": int(r["count"])} for _, r in g.iterrows()]


def compute(db: Session) -> dict:
    key = (db.scalar(select(func.count(PriceHistory.id))), db.scalar(select(func.max(PriceHistory.id))),
           db.scalar(select(func.count(Product.id))))
    if _cache["key"] != key:
        d = _dataset_frame(db)
        if d.empty:
            dataset = {"rows": 0}
        else:
            vc = d["verdict"].value_counts()
            dataset = {
                "rows": int(len(d)),
                "products": int(d["product_id"].nunique()),
                "avg_ddi": r1(d["ddi"].mean()),
                "pct_fake": r1((d["verdict"] == "fake").mean() * 100),
                "by_platform": _group(d, "platform"),
                "by_category": _group(d, "category"),
                "festive_vs_normal": [
                    {"name": "Festive sale days", "avg_ddi": r1(d.loc[d["festive"], "ddi"].mean()) if d["festive"].any() else None,
                     "count": int(d["festive"].sum())},
                    {"name": "Normal days", "avg_ddi": r1(d.loc[~d["festive"], "ddi"].mean()) if (~d["festive"]).any() else None,
                     "count": int((~d["festive"]).sum())},
                ],
                "verdicts": [{"name": k, "count": int(vc.get(k, 0))} for k in ("genuine", "inflated", "fake")],
            }
        _cache.update(key=key, value=dataset)
    dataset = _cache["value"]

    checks_total = db.scalar(select(func.count(Check.id))) or 0
    verdict_rows = db.execute(select(Check.verdict, func.count(Check.id)).group_by(Check.verdict)).all()
    scores = [s for (s,) in db.execute(select(ImpulseResponse.impulse_score)).all()]
    hist = np.histogram(scores, bins=10, range=(0, 100))[0].tolist() if scores else [0] * 10
    usage = {
        "total_checks": int(checks_total),
        "check_verdicts": [{"name": v, "count": int(c)} for v, c in verdict_rows],
        "impulse_responses": len(scores),
        "avg_impulse_score": r1(float(np.mean(scores))) if scores else None,
        "impulse_histogram": [{"bin": f"{i*10}–{i*10+9 if i < 9 else 100}", "count": c} for i, c in enumerate(hist)],
    }
    return {"dataset": dataset, "usage": usage}
