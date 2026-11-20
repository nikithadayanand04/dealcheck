from datetime import date, timedelta

import pytest

from backend.app.ddi import analyse, fmt_inr, r1, verdict_for

REF = date(2026, 11, 20)


def flat_history(m30, n=25):
    """n past prices whose median is exactly m30."""
    return [(REF - timedelta(days=i + 1), m30) for i in range(n)]


# The four worked examples from the specification
@pytest.mark.parametrize("mrp,p,m30,ad,rd,ddi,verdict", [
    (2000, 800, 900, 60.0, 11.1, 48.9, "fake"),
    (1000, 700, 950, 30.0, 26.3, 3.7, "genuine"),
    (5000, 4000, 4500, 20.0, 11.1, 8.9, "inflated"),
    (1500, 1200, 1100, 20.0, -9.1, 29.1, "fake"),
])
def test_spec_examples(mrp, p, m30, ad, rd, ddi, verdict):
    r = analyse(mrp, p, flat_history(m30), REF)
    assert (r["advertised_discount"], r["real_discount"], r["ddi"], r["verdict"]) == (ad, rd, ddi, verdict)
    assert r["m30"] == m30
    assert r["confidence"] == "high"


def test_shown_discount_overrides_mrp_calculation():
    r = analyse(2000, 800, flat_history(900), REF, advertised_pct=55)
    assert r["advertised_discount"] == 55.0 and r["ddi"] == 43.9


def test_threshold_boundaries():
    assert verdict_for(4.9, 25) == "genuine"
    assert verdict_for(5.0, 25) == "inflated"
    assert verdict_for(15.0, 25) == "inflated"
    assert verdict_for(15.1, 25) == "fake"
    assert verdict_for(40, 4) == "insufficient"
    assert verdict_for(None, 25) == "insufficient"


def test_window_excludes_reference_day_and_older_than_30_days():
    hist = [(REF, 1), (REF - timedelta(days=31), 1)] + flat_history(900, 6)
    r = analyse(2000, 800, hist, REF)
    assert r["points_30d"] == 6 and r["m30"] == 900


def test_confidence_levels():
    assert analyse(1000, 900, flat_history(950, 20), REF)["confidence"] == "high"
    assert analyse(1000, 900, flat_history(950, 10), REF)["confidence"] == "medium"
    assert analyse(1000, 900, flat_history(950, 5), REF)["confidence"] == "low"
    r = analyse(1000, 900, flat_history(950, 3), REF)
    assert r["confidence"] == "insufficient" and r["verdict"] == "insufficient" and r["ddi"] is not None
    assert "rough estimate" in r["explanation"]


def test_no_history():
    r = analyse(1000, 900, [], REF)
    assert r["m30"] is None and r["real_discount"] is None and r["ddi"] is None
    assert r["verdict"] == "insufficient" and r["advertised_discount"] == 10.0


def test_median_not_mean():
    hist = flat_history(1000, 9) + [(REF - timedelta(days=20), 100)]   # one flash price
    assert analyse(1200, 900, hist, REF)["m30"] == 1000


def test_rounding_and_formatting():
    assert r1(48.85) == 48.9 and r1(-9.0909) == -9.1
    assert fmt_inr(100000) == "₹1,00,000" and fmt_inr(1234567) == "₹12,34,567" and fmt_inr(900) == "₹900"


def test_explanations():
    assert "only ₹100" in analyse(2000, 800, flat_history(900), REF)["explanation"]
    assert "higher than usual" in analyse(1500, 1200, flat_history(1100), REF)["explanation"]


def test_explanation_no_real_saving():
    r = analyse(579, 529, flat_history(529), REF)
    assert r["verdict"] == "inflated" and "no real saving" in r["explanation"]
