"""Feature engineering shared by training (ml/) and live prediction (backend/).
Keeping one implementation avoids train/serve mismatch."""
from __future__ import annotations

import json
from datetime import date, timedelta
from functools import lru_cache

import numpy as np
import pandas as pd

from . import config

# --------------------------------------------------------------------------
# Sale calendar
# --------------------------------------------------------------------------


@lru_cache(maxsize=1)
def sale_events() -> list[dict]:
    with open(config.SALE_CALENDAR_PATH) as f:
        return json.load(f)["events"]


def _windows_for_year(year: int):
    for ev in sale_events():
        m, d = (int(x) for x in ev["start"].split("-"))
        start = date(year, m, d)
        yield ev["name"], start, start + timedelta(days=ev["days"] - 1)


def in_sale_window(d: date) -> bool:
    return any(s <= d <= e for _, s, e in _windows_for_year(d.year))


def days_to_next_sale(d: date) -> int:
    """0 while a sale is running, else days until the next sale starts."""
    best = None
    for year in (d.year, d.year + 1):
        for _, s, e in _windows_for_year(year):
            if s <= d <= e:
                return 0
            if s > d:
                diff = (s - d).days
                best = diff if best is None else min(best, diff)
    return int(best)


# --------------------------------------------------------------------------
# Price-drop features
# --------------------------------------------------------------------------
PRICE_NUMERIC = ["ratio_m30", "ratio_min90", "slope7", "vol30", "days_to_sale", "shown_discount"]
PRICE_CATEGORICAL = ["category", "platform"]
PRICE_FEATURES = PRICE_NUMERIC + PRICE_CATEGORICAL
_SLOPE_X = np.arange(7) - 3.0


def daily_series(history: list[tuple[date, float]]) -> pd.Series:
    """Daily price series, forward-filled between recorded days."""
    s = pd.Series({pd.Timestamp(d): float(p) for d, p in history}).sort_index()
    s = s[~s.index.duplicated(keep="last")]
    return s.asfreq("D").ffill()


def price_feature_frame(s: pd.Series, mrp: float, category: str, platform: str, with_label: bool = False) -> pd.DataFrame:
    """One row per day. Only rows with >= 30 days of history are kept."""
    df = pd.DataFrame({"price": s})
    m30 = s.shift(1).rolling(config.WINDOW_DAYS, min_periods=config.MIN_POINTS).median()
    min90 = s.rolling(config.CONTEXT_DAYS + 1, min_periods=1).min()
    mean7 = s.rolling(7).mean()
    slope = s.rolling(7).apply(lambda w: float(np.dot(_SLOPE_X, w) / 28.0), raw=True)
    df["ratio_m30"] = s / m30
    df["ratio_min90"] = s / min90
    df["slope7"] = slope / mean7
    df["vol30"] = s.rolling(config.WINDOW_DAYS, min_periods=config.MIN_POINTS).std() / s.rolling(config.WINDOW_DAYS, min_periods=config.MIN_POINTS).mean()
    df["days_to_sale"] = [days_to_next_sale(ts.date()) for ts in df.index]
    df["shown_discount"] = (mrp - s) / mrp * 100 if mrp else 0.0
    df["category"] = category or "Others"
    df["platform"] = platform or "other"
    if with_label:
        h = config.DROP_HORIZON_DAYS
        future_min = s[::-1].shift(1).rolling(h, min_periods=h).min()[::-1]
        df["label"] = np.where(future_min.isna(), np.nan, (future_min <= config.DROP_THRESHOLD * s).astype(float))
    first = s.index[0]
    df = df[df.index >= first + pd.Timedelta(days=config.MIN_DAYS_FOR_DROP_PREDICTION)]
    df = df.replace([np.inf, -np.inf], np.nan).dropna(subset=PRICE_NUMERIC + (["label"] if with_label else []))
    return df


# --------------------------------------------------------------------------
# Impulse quiz
# --------------------------------------------------------------------------
QUESTIONS = {
    "q1": {"text": "Did you plan to buy this before you saw the sale?", "options": {"yes": "Yes", "no": "No"}},
    "q2": {"text": "How long have you been looking at this product today?", "options": {"lt5": "Less than 5 minutes", "5to30": "5–30 minutes", "gt30": "More than 30 minutes"}},
    "q3": {"text": "Did a timer, \"only few left\" or \"X people bought this\" message influence you?", "options": {"not_at_all": "Not at all", "a_little": "A little", "a_lot": "A lot"}},
    "q4": {"text": "Would you buy it at its normal price?", "options": {"yes": "Yes", "maybe": "Maybe", "no": "No"}},
    "q5": {"text": "Do you already own something similar?", "options": {"yes": "Yes", "no": "No"}},
    "q6": {"text": "How are you paying?", "options": {"full": "Full payment", "emi": "EMI", "bnpl": "Buy-Now-Pay-Later", "cod": "Cash on delivery"}},
    "q7": {"text": "How are you feeling right now?", "options": {"calm": "Calm", "bored": "Bored", "stressed": "Stressed", "excited": "Excited"}},
    "q8": {"text": "How often do you buy during sales?", "options": {"rarely": "Rarely", "sometimes": "Sometimes", "every_sale": "Every sale"}},
    "q9": {"text": "How much of your monthly spending budget have you used so far?", "options": {"lt25": "Less than 25%", "25to75": "25–75%", "gt75": "More than 75%"}},
    "q10": {"text": "Your age group", "options": {"18-22": "18–22", "23-30": "23–30", "31-45": "31–45", "45plus": "45+"}},
}

# accept codes or the visible labels (case/space/dash-insensitive) in uploaded CSVs
def _norm(x: str) -> str:
    return str(x).strip().lower().replace("–", "-").replace("—", "-").replace(" ", "")


_ALIASES = {q: {**{_norm(c): c for c in v["options"]}, **{_norm(l): c for c, l in v["options"].items()}} for q, v in QUESTIONS.items()}
_ALIASES["q10"].update({"45+": "45plus"})
_ALIASES["q9"].update({"<25%": "lt25", ">75%": "gt75"})
_ALIASES["q2"].update({"<5min": "lt5", ">30min": "gt30", "5-30min": "5to30"})


def normalise_answer(q: str, value) -> str | None:
    return _ALIASES[q].get(_norm(value))


IMPULSE_FEATURES = [
    "not_planned", "quick_decision", "urgency", "not_at_normal_price", "owns_similar",
    "pay_emi", "pay_bnpl", "pay_cod", "mood_bored", "mood_stressed", "mood_excited",
    "sale_frequency", "budget_used", "age_group",
]

REASON_TEXT = {
    "not_planned": "You didn't plan this purchase before you saw the sale.",
    "quick_decision": "You're deciding quickly, with little time spent comparing.",
    "urgency": "Timers or \"only few left\" messages are influencing your decision.",
    "not_at_normal_price": "You wouldn't buy it at its normal price, so the discount is doing the convincing.",
    "owns_similar": "You already own something similar.",
    "pay_emi": "Paying by EMI spreads the cost, which makes spending feel smaller.",
    "pay_bnpl": "Buy-Now-Pay-Later makes spending feel painless right now.",
    "pay_cod": "Cash on delivery delays the moment you actually pay.",
    "mood_bored": "Shopping out of boredom often leads to unplanned buys.",
    "mood_stressed": "Shopping while stressed is a common trigger for impulse buying.",
    "mood_excited": "Excitement can rush a decision.",
    "sale_frequency": "You tend to buy during most sales.",
    "budget_used": "You've already used a large part of this month's budget.",
    "age_group": "People in your age group showed more impulse buying in our survey.",
}


def encode_impulse(a: dict) -> dict:
    return {
        "not_planned": 1.0 if a["q1"] == "no" else 0.0,
        "quick_decision": {"lt5": 2, "5to30": 1, "gt30": 0}[a["q2"]],
        "urgency": {"not_at_all": 0, "a_little": 1, "a_lot": 2}[a["q3"]],
        "not_at_normal_price": {"yes": 0, "maybe": 1, "no": 2}[a["q4"]],
        "owns_similar": 1.0 if a["q5"] == "yes" else 0.0,
        "pay_emi": 1.0 if a["q6"] == "emi" else 0.0,
        "pay_bnpl": 1.0 if a["q6"] == "bnpl" else 0.0,
        "pay_cod": 1.0 if a["q6"] == "cod" else 0.0,
        "mood_bored": 1.0 if a["q7"] == "bored" else 0.0,
        "mood_stressed": 1.0 if a["q7"] == "stressed" else 0.0,
        "mood_excited": 1.0 if a["q7"] == "excited" else 0.0,
        "sale_frequency": {"rarely": 0, "sometimes": 1, "every_sale": 2}[a["q8"]],
        "budget_used": {"lt25": 0, "25to75": 1, "gt75": 2}[a["q9"]],
        "age_group": {"18-22": 0, "23-30": 1, "31-45": 2, "45plus": 3}[a["q10"]],
    }


def impulse_frame(rows: list[dict]) -> pd.DataFrame:
    return pd.DataFrame([encode_impulse(r) for r in rows], columns=IMPULSE_FEATURES).astype(float)


def impulse_level(score: float) -> str:
    if score <= config.IMPULSE_LOW_MAX:
        return "low"
    if score <= config.IMPULSE_MEDIUM_MAX:
        return "medium"
    return "high"
