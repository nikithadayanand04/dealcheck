"""CSV import for price data and survey data, with row-level validation.
Used by the admin upload page and by the seed script."""
from __future__ import annotations

import csv
import io
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import config
from .database import PriceHistory, Product, QUESTION_COLS, SurveyResponse
from .features import normalise_answer
from .urls import normalise_product_id

PRICE_COLUMNS = ["product_id", "platform", "name", "category", "mrp", "date", "price"]
SURVEY_COLUMNS = QUESTION_COLS + ["label_impulse"]
MAX_REJECTS_REPORTED = 50


def _reader(text: str):
    text = text.lstrip("﻿")
    reader = csv.DictReader(io.StringIO(text))
    reader.fieldnames = [(h or "").strip().lower() for h in (reader.fieldnames or [])]
    return reader


def _num(v, field):
    try:
        x = float(str(v).replace(",", "").replace("₹", "").strip())
    except ValueError:
        raise ValueError(f"{field} is not a number")
    if not (0 < x <= config.MAX_PRICE):
        raise ValueError(f"{field} must be between 1 and {config.MAX_PRICE:,}")
    return x


def import_prices(db: Session, text: str, source: str = "dataset") -> dict:
    reader = _reader(text)
    missing = [c for c in PRICE_COLUMNS if c not in reader.fieldnames]
    if missing:
        raise ValueError(f"Missing column(s): {', '.join(missing)}. Required: {', '.join(PRICE_COLUMNS)}")

    cat_lookup = {c.lower(): c for c in config.CATEGORIES}
    products: dict[tuple, Product] = {(p.platform, p.platform_product_id): p for p in db.scalars(select(Product))}
    existing = {(pid, d): ph for pid, d, ph in
                ((ph.product_id, ph.date, ph) for ph in db.scalars(select(PriceHistory)))}
    added = updated = 0
    rejected = []
    today = date.today()

    for i, row in enumerate(reader, start=2):  # row 1 is the header
        try:
            platform = (row.get("platform") or "").strip().lower()
            if platform not in config.PLATFORMS:
                raise ValueError(f"platform must be one of {', '.join(config.PLATFORMS)}")
            ppid = (row.get("product_id") or "").strip()
            if not ppid or len(ppid) > 64:
                raise ValueError("product_id is empty or too long")
            category = cat_lookup.get((row.get("category") or "").strip().lower())
            if not category:
                raise ValueError(f"category must be one of {', '.join(config.CATEGORIES)}")
            mrp = _num(row.get("mrp"), "mrp")
            price = _num(row.get("price"), "price")
            if price > mrp:
                raise ValueError("price is higher than mrp")
            try:
                d = date.fromisoformat((row.get("date") or "").strip())
            except ValueError:
                raise ValueError("date must be in YYYY-MM-DD format")
            if d > today:
                raise ValueError("date is in the future")
        except ValueError as e:
            if len(rejected) < MAX_REJECTS_REPORTED:
                rejected.append({"row": i, "reason": str(e)})
            else:
                rejected.append(None)
            continue

        key = (platform, normalise_product_id(platform, ppid))
        prod = products.get(key)
        if prod is None:
            prod = Product(platform=key[0], platform_product_id=key[1], name=(row.get("name") or "").strip()[:300] or None,
                           category=category, mrp=mrp)
            db.add(prod)
            db.flush()
            products[key] = prod
        else:
            prod.mrp = mrp
            prod.category = prod.category or category
            if not prod.name and row.get("name"):
                prod.name = row["name"].strip()[:300]
        ph = existing.get((prod.id, d))
        if ph:
            if ph.price != price:
                ph.price = price
                updated += 1
        else:
            ph = PriceHistory(product_id=prod.id, date=d, price=price, source=source)
            db.add(ph)
            existing[(prod.id, d)] = ph
            added += 1
    db.commit()
    reported = [r for r in rejected if r]
    return {"rows_added": added, "rows_updated": updated, "rows_rejected": len(rejected), "rejected": reported}


def import_survey(db: Session, text: str, source: str = "upload") -> dict:
    reader = _reader(text)
    missing = [c for c in SURVEY_COLUMNS if c not in reader.fieldnames]
    if missing:
        raise ValueError(f"Missing column(s): {', '.join(missing)}. Required: {', '.join(SURVEY_COLUMNS)}")
    added = 0
    rejected = []
    for i, row in enumerate(reader, start=2):
        try:
            answers = {}
            for q in QUESTION_COLS:
                v = normalise_answer(q, row.get(q, ""))
                if v is None:
                    raise ValueError(f"{q} has an unknown answer '{row.get(q)}'")
                answers[q] = v
            lab = str(row.get("label_impulse", "")).strip().lower()
            if lab in ("1", "yes", "true"):
                label = 1
            elif lab in ("0", "no", "false"):
                label = 0
            else:
                raise ValueError("label_impulse must be 1/0 or yes/no")
        except ValueError as e:
            rejected.append({"row": i, "reason": str(e)})
            continue
        db.add(SurveyResponse(**answers, label_impulse=label, source=source))
        added += 1
    db.commit()
    return {"rows_added": added, "rows_rejected": len(rejected), "rejected": rejected[:MAX_REJECTS_REPORTED]}
