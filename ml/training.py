"""Model training for DealCheck.

Model 1 – price_drop : will the price fall >= 5% within the next 14 days?
           Time-based split (latest 20% of dates = test) to avoid leaking the future.
Model 2 – impulse    : probability that a purchase is impulsive, from the 10 quiz answers.
           Stratified 5-fold cross-validation (small survey dataset).

The discount VERDICT is not learned: it is the transparent DDI rule (see backend/app/ddi.py),
because training a model on labels made from the same rule would be target leakage.
"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score, precision_score,
                             recall_score, roc_auc_score)
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from backend.app import config
from backend.app.features import (IMPULSE_FEATURES, PRICE_CATEGORICAL, PRICE_FEATURES, PRICE_NUMERIC,
                                  daily_series, impulse_frame, price_feature_frame)

RANDOM_STATE = 42

# numpy 2 on macOS (Accelerate BLAS) emits false 'overflow/divide by zero in matmul' warnings;
# feature ranges are checked and finite, so only these specific messages are silenced.
warnings.filterwarnings("ignore", message=".*encountered in matmul", category=RuntimeWarning)


class TrainingError(ValueError):
    pass


def _metrics(y_true, y_pred, y_prob) -> dict:
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 3),
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 3),
        "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 3),
        "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 3),
        "roc_auc": round(float(roc_auc_score(y_true, y_prob)), 3) if len(set(y_true)) > 1 else None,
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "n": int(len(y_true)),
        "positive_rate": round(float(np.mean(y_true)), 3),
    }


# --------------------------------------------------------------------------
# Impulse model
# --------------------------------------------------------------------------
def train_impulse(answers: list[dict], labels: list[int]) -> tuple[dict, dict]:
    """Returns (bundle_to_save, metrics). Logistic Regression is deployed because it can
    explain each prediction; Random Forest is trained only for comparison."""
    if len(answers) < config.MIN_SURVEY_ROWS:
        raise TrainingError(f"Need at least {config.MIN_SURVEY_ROWS} survey responses to train (have {len(answers)}).")
    y = np.asarray(labels, dtype=int)
    counts = np.bincount(y, minlength=2)
    if counts.min() < 10:
        raise TrainingError("Need at least 10 impulsive and 10 non-impulsive responses to train.")
    X = impulse_frame(answers)
    minority_share = counts.min() / counts.sum()
    cw = "balanced" if minority_share < 0.35 else None

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    lr = Pipeline([("scale", StandardScaler()), ("clf", LogisticRegression(max_iter=1000, class_weight=cw))])
    rf = RandomForestClassifier(n_estimators=300, max_depth=6, min_samples_leaf=3, class_weight=cw, random_state=RANDOM_STATE)

    results = {}
    for name, model in (("logistic_regression", lr), ("random_forest", rf)):
        prob = cross_val_predict(model, X, y, cv=cv, method="predict_proba")[:, 1]
        results[name] = _metrics(y, (prob >= 0.5).astype(int), prob)

    lr.fit(X, y)
    coefs = dict(zip(IMPULSE_FEATURES, lr.named_steps["clf"].coef_[0].round(3).tolist()))
    metrics = {
        "deployed": "logistic_regression",
        "validation": "stratified 5-fold cross-validation",
        "class_weight": cw or "none",
        "logistic_regression": results["logistic_regression"],
        "random_forest": results["random_forest"],
        "coefficients": coefs,
    }
    bundle = {"kind": "impulse", "pipeline": lr, "features": IMPULSE_FEATURES, "algorithm": "Logistic Regression"}
    return bundle, metrics


def explain_impulse(bundle: dict, x: pd.DataFrame, top: int = 3) -> list[str]:
    from backend.app.features import REASON_TEXT
    pipe = bundle["pipeline"]
    z = pipe.named_steps["scale"].transform(x)[0]
    contrib = pipe.named_steps["clf"].coef_[0] * z
    order = np.argsort(-contrib)
    return [REASON_TEXT[bundle["features"][i]] for i in order[:top] if contrib[i] > 0.05]


# --------------------------------------------------------------------------
# Price-drop model
# --------------------------------------------------------------------------
def build_price_dataset(products: list[dict], histories: dict[int, list[tuple]]) -> pd.DataFrame:
    frames = []
    for p in products:
        hist = histories.get(p["id"], [])
        if len(hist) < 2 or not p.get("mrp"):
            continue
        s = daily_series(hist)
        if len(s) < config.MIN_DAYS_FOR_DROP_PREDICTION + config.DROP_HORIZON_DAYS + 1:
            continue
        f = price_feature_frame(s, p["mrp"], p.get("category"), p.get("platform"), with_label=True)
        if not f.empty:
            f["product_id"] = p["id"]
            frames.append(f)
    if not frames:
        raise TrainingError("Not enough price history to train. Each product needs at least 45 days of prices.")
    return pd.concat(frames).rename_axis("date").reset_index()


def train_price_drop(products: list[dict], histories: dict[int, list[tuple]]) -> tuple[dict, dict]:
    data = build_price_dataset(products, histories)
    if data["product_id"].nunique() < 10:
        raise TrainingError("Need price history for at least 10 products to train.")
    data = data.sort_values("date")
    cutoff = data["date"].quantile(0.8)
    train, test = data[data["date"] <= cutoff], data[data["date"] > cutoff]
    if test["label"].nunique() < 2 or train["label"].nunique() < 2:
        raise TrainingError("Training data has only one outcome (always drops or never drops). Add more varied data.")

    def pre():
        return ColumnTransformer([
            ("num", StandardScaler(), PRICE_NUMERIC),
            ("cat", OneHotEncoder(handle_unknown="ignore"), PRICE_CATEGORICAL),
        ])

    candidates = {
        "Logistic Regression": Pipeline([("pre", pre()), ("clf", LogisticRegression(max_iter=2000, class_weight="balanced"))]),
        "Random Forest": Pipeline([("pre", pre()), ("clf", RandomForestClassifier(
            n_estimators=200, max_depth=10, min_samples_leaf=20, class_weight="balanced_subsample",
            n_jobs=-1, random_state=RANDOM_STATE))]),
    }
    results = {}
    for name, model in candidates.items():
        model.fit(train[PRICE_FEATURES], train["label"].astype(int))
        prob = model.predict_proba(test[PRICE_FEATURES])[:, 1]
        results[name] = _metrics(test["label"].astype(int).values, (prob >= 0.5).astype(int), prob)

    best = max(results, key=lambda k: results[k]["roc_auc"] or 0)
    final = candidates[best]
    final.fit(data[PRICE_FEATURES], data["label"].astype(int))   # refit on all data for deployment
    metrics = {
        "deployed": best,
        "validation": f"time-based split: train up to {pd.Timestamp(cutoff).date()}, test after",
        "train_rows": int(len(train)), "test_rows": int(len(test)),
        "products": int(data["product_id"].nunique()),
        **{k.lower().replace(" ", "_"): v for k, v in results.items()},
    }
    bundle = {"kind": "price_drop", "pipeline": final, "features": PRICE_FEATURES, "algorithm": best}
    return bundle, metrics
