"""Discount Deception Index — the core formula of the project.

    AD  = advertised discount %   = shown %, else (MRP - P) / MRP x 100
    RD  = real discount %         = (M30 - P) / M30 x 100      (can be negative)
    DDI = AD - RD

M30 is the median of prices recorded in the 30 days before the reference date
(the reference date itself is excluded). Values are rounded to 1 decimal
(half-up) and the verdict is decided on the rounded DDI so what the user sees
always matches the verdict.
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from statistics import median
from typing import Iterable, Optional

from . import config


def r1(x: Optional[float]) -> Optional[float]:
    if x is None:
        return None
    return float(Decimal(repr(float(x))).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def fmt_inr(amount: float) -> str:
    """Indian digit grouping: 100000 -> ₹1,00,000 ; keeps paise only if present."""
    neg = amount < 0
    amount = abs(amount)
    rupees = int(Decimal(repr(amount)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    s = str(rupees)
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        s = ",".join(groups + [tail])
    return ("-" if neg else "") + "₹" + s


def advertised_discount(mrp: float, sale_price: float) -> float:
    return (mrp - sale_price) / mrp * 100


def real_discount(m30: float, sale_price: float) -> float:
    return (m30 - sale_price) / m30 * 100


def verdict_for(ddi_rounded: Optional[float], points: int) -> str:
    if points < config.MIN_POINTS or ddi_rounded is None:
        return "insufficient"
    if ddi_rounded < config.GENUINE_MAX:
        return "genuine"
    if ddi_rounded <= config.INFLATED_MAX:
        return "inflated"
    return "fake"


def confidence_for(points: int) -> str:
    if points >= config.HIGH_POINTS:
        return "high"
    if points >= config.MEDIUM_POINTS:
        return "medium"
    if points >= config.MIN_POINTS:
        return "low"
    return "insufficient"


def analyse(
    mrp: float,
    sale_price: float,
    history: Iterable[tuple[date, float]],
    ref_date: date,
    advertised_pct: Optional[float] = None,
) -> dict:
    """Full discount analysis. `history` = past (date, price) pairs; any entry
    on/after ref_date is ignored for the median."""
    history = sorted(history)
    start30 = ref_date - timedelta(days=config.WINDOW_DAYS)
    start90 = ref_date - timedelta(days=config.CONTEXT_DAYS)
    window = [p for d, p in history if start30 <= d < ref_date]
    last90 = [p for d, p in history if start90 <= d <= ref_date] + [sale_price]

    points = len(window)
    m30 = float(median(window)) if window else None
    ad = advertised_pct if advertised_pct is not None else advertised_discount(mrp, sale_price)
    rd = real_discount(m30, sale_price) if m30 else None
    ddi = (ad - rd) if rd is not None else None

    ad_r, rd_r, ddi_r = r1(ad), r1(rd), r1(ddi)
    verdict = verdict_for(ddi_r, points)

    return {
        "mrp": mrp,
        "sale_price": sale_price,
        "m30": r1(m30),
        "min90": r1(min(last90)),
        "advertised_discount": ad_r,
        "real_discount": rd_r,
        "ddi": ddi_r,
        "points_30d": points,
        "verdict": verdict,
        "confidence": confidence_for(points),
        "explanation": explain(verdict, mrp, sale_price, m30, ad_r, rd_r, points),
    }


def explain(verdict, mrp, p, m30, ad, rd, points) -> str:
    if m30 is None:
        return ("We don't have any recent prices for this product, so we can't judge the discount yet. "
                "Add a few prices you've seen in the last 30 days to get a verdict.")
    usual = fmt_inr(m30)
    real_saving = m30 - p
    claimed_saving = mrp - p
    if abs(real_saving) < 1 and verdict != "genuine":
        text = (f"This product usually sells around {usual}, which is today's price too, so there is no real "
                f"saving, even though the banner shows {ad}% off.")
    elif real_saving < 0:
        text = (f"This product usually sells around {usual}, so today's 'sale' price is actually "
                f"{fmt_inr(-real_saving)} higher than usual, even though the banner shows {ad}% off.")
    elif verdict == "genuine":
        text = (f"This product usually sells around {usual}. The real saving of {fmt_inr(real_saving)} "
                f"({rd}%) is close to the advertised {ad}% discount.")
    else:
        text = (f"This product usually sells around {usual}, so the real saving is only "
                f"{fmt_inr(real_saving)} ({rd}%), not {fmt_inr(claimed_saving)} ({ad}%) as the banner suggests.")
    if points < config.MIN_POINTS:
        text += f" Only {points} recent price point{'s' if points != 1 else ''} were available, so treat this as a rough estimate."
    return text
