"""Generate SYNTHETIC demo data so the website runs before real data is collected.

    python -m ml.generate_synthetic

Writes data/synthetic_prices.csv (200 products x 365 days) and data/synthetic_survey.csv (300 rows).
SYNTHETIC – FOR TESTING ONLY. Replace with the real collected dataset and survey before reporting results.
Product names are generic ("Synthetic Headphones #017") and IDs use a "SYN" pattern so they can never be
confused with real listings.
"""
from __future__ import annotations

import csv
from datetime import date, timedelta

import numpy as np

from backend.app import config
from backend.app.features import QUESTIONS, in_sale_window

RNG = np.random.default_rng(2026)
N_PRODUCTS = 200
N_DAYS = 365
N_SURVEY = 300

CATEGORY_ITEMS = {
    "Electronics": (["Headphones", "Smartwatch", "Power Bank", "Bluetooth Speaker", "Earbuds", "Keyboard"], 500, 25000),
    "Fashion": (["Sneakers", "Kurta", "Denim Jacket", "Handbag", "Sunglasses", "T-shirt"], 300, 5000),
    "Home": (["Mixer Grinder", "Bedsheet Set", "Air Fryer", "Water Bottle", "Table Lamp", "Cookware Set"], 300, 12000),
    "Beauty": (["Face Serum", "Hair Dryer", "Perfume", "Sunscreen", "Trimmer", "Lipstick Set"], 150, 3000),
    "Books": (["Novel", "Exam Guide", "Cookbook", "Biography", "Comic Set", "Self-help Book"], 150, 1200),
    "Others": (["Yoga Mat", "Backpack", "Pet Bed", "Board Game", "Desk Organiser", "Umbrella"], 200, 4000),
}


def _price_tag(x: float) -> float:
    """Shop-style prices: 1234 -> 1229 / 1239 ; small items -> x9."""
    if x >= 100:
        return float(max(round(x / 10) * 10 - 1, 9))
    return float(max(round(x) - 1, 9))


def _sale_windows(days: list[date]) -> np.ndarray:
    return np.array([in_sale_window(d) for d in days])


def gen_prices(path):
    end = date.today()
    days = [end - timedelta(days=N_DAYS - 1 - i) for i in range(N_DAYS)]
    in_sale = _sale_windows(days)
    # days until next sale start (for the pre-sale inflation ramp)
    starts = [i for i in range(1, N_DAYS) if in_sale[i] and not in_sale[i - 1]]
    platforms = ["amazon", "flipkart", "myntra"]
    rows = []
    for k in range(1, N_PRODUCTS + 1):
        cat = list(CATEGORY_ITEMS)[k % len(CATEGORY_ITEMS)]
        items, lo, hi = CATEGORY_ITEMS[cat]
        platform = "myntra" if cat in ("Fashion", "Beauty") and RNG.random() < 0.5 else platforms[RNG.integers(0, 2)]
        name = f"Synthetic {items[RNG.integers(len(items))]} #{k:03d}"
        pid = {"amazon": f"B0SYN{k:05d}", "flipkart": f"SYNPID{k:05d}", "myntra": f"990{k:04d}"}[platform]
        base = float(np.exp(RNG.uniform(np.log(lo), np.log(hi))))
        honest_mrp = RNG.random() < 0.45
        mrp = _price_tag(base * (RNG.uniform(1.0, 1.15) if honest_mrp else RNG.uniform(1.4, 2.5)))
        inflater = RNG.random() < 0.4
        sparse = RNG.random() < 0.2

        drift = np.cumsum(RNG.normal(0, 0.003, N_DAYS))
        price = base * np.exp(drift)
        # random short dips (flash deals)
        for _ in range(RNG.poisson(4)):
            s = RNG.integers(0, N_DAYS - 5)
            price[s:s + RNG.integers(2, 6)] *= RNG.uniform(0.88, 0.95)
        # pre-sale inflation for "inflater" sellers
        if inflater:
            for s in starts:
                ramp = RNG.integers(10, 21)
                bump = RNG.uniform(1.08, 1.25)
                a = max(0, s - ramp)
                price[a:s] *= np.linspace(1.0, bump, s - a)
        # sale days: honest sellers cut 5-20% below the usual price; inflaters' "sale" price
        # ends up close to (sometimes above) the usual price
        sale_depth = RNG.uniform(0.80, 0.95)
        if inflater:
            sale_depth *= RNG.uniform(1.0, 1.13)
        price[in_sale] = base * np.exp(drift[in_sale]) * sale_depth
        price = np.minimum(price, mrp)

        for i, d in enumerate(days):
            if sparse and RNG.random() > 0.6 and i != N_DAYS - 1:
                continue
            rows.append([pid, platform, name, cat, mrp, d.isoformat(), min(_price_tag(price[i]), mrp)])

    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["product_id", "platform", "name", "category", "mrp", "date", "price"])
        w.writerows(rows)
    return len(rows)


def gen_survey(path):
    codes = {q: list(v["options"]) for q, v in QUESTIONS.items()}
    probs = {
        "q1": [0.55, 0.45], "q2": [0.35, 0.4, 0.25], "q3": [0.35, 0.4, 0.25], "q4": [0.4, 0.35, 0.25],
        "q5": [0.4, 0.6], "q6": [0.45, 0.15, 0.15, 0.25], "q7": [0.4, 0.25, 0.15, 0.2],
        "q8": [0.3, 0.45, 0.25], "q9": [0.35, 0.45, 0.2], "q10": [0.45, 0.35, 0.15, 0.05],
    }
    rows = []
    for _ in range(N_SURVEY):
        a = {q: codes[q][RNG.choice(len(codes[q]), p=probs[q])] for q in codes}
        logit = (-3.1 + 1.4 * (a["q1"] == "no") + 0.5 * {"lt5": 2, "5to30": 1, "gt30": 0}[a["q2"]]
                 + 0.6 * {"not_at_all": 0, "a_little": 1, "a_lot": 2}[a["q3"]]
                 + 0.5 * {"yes": 0, "maybe": 1, "no": 2}[a["q4"]] + 0.3 * (a["q5"] == "yes")
                 + 0.6 * (a["q6"] == "bnpl") + 0.3 * (a["q6"] == "emi")
                 + 0.4 * (a["q7"] == "bored") + 0.5 * (a["q7"] == "stressed") + 0.3 * (a["q7"] == "excited")
                 + 0.35 * {"rarely": 0, "sometimes": 1, "every_sale": 2}[a["q8"]]
                 + 0.3 * {"lt25": 0, "25to75": 1, "gt75": 2}[a["q9"]]
                 - 0.2 * {"18-22": 0, "23-30": 1, "31-45": 2, "45plus": 3}[a["q10"]]
                 + RNG.normal(0, 0.4))
        label = int(RNG.random() < 1 / (1 + np.exp(-logit)))
        rows.append([a[f"q{i}"] for i in range(1, 11)] + [label])
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow([f"q{i}" for i in range(1, 11)] + ["label_impulse"])
        w.writerows(rows)
    return len(rows)


if __name__ == "__main__":
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    n1 = gen_prices(config.DATA_DIR / "synthetic_prices.csv")
    n2 = gen_survey(config.DATA_DIR / "synthetic_survey.csv")
    print(f"SYNTHETIC data written: {n1} price rows, {n2} survey rows -> {config.DATA_DIR}")
