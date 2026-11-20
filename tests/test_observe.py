"""The browser-button flow: prices read from a real product page are saved and build history."""
from datetime import date, timedelta

from sqlalchemy import select

from backend.app.database import PriceHistory, Product, SessionLocal

URL = "https://www.amazon.in/Some-Real-Product/dp/B0OBSERVE1/ref=sr_1_1"


def test_first_observation_saves_and_says_not_enough_data(client):
    r = client.post("/api/check/observe", json={"url": URL, "price": 1499, "mrp": 2999, "name": "Real earbuds", "category": "Electronics"})
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["mode"] == "observed" and b["verdict"] == "insufficient" and b["tracked_days"] == 1
    assert b["advertised_discount"] == 50.0 and "Saved" in b["tracking_note"]
    with SessionLocal() as db:
        p = db.scalar(select(Product).where(Product.platform_product_id == "B0OBSERVE1"))
        rows = db.scalars(select(PriceHistory).where(PriceHistory.product_id == p.id)).all()
        assert p.name == "Real earbuds" and p.mrp == 2999 and len(rows) == 1 and rows[0].source == "observed"


def test_same_day_reobservation_updates_not_duplicates(client):
    client.post("/api/check/observe", json={"url": URL, "price": 1399, "mrp": 2999})
    with SessionLocal() as db:
        p = db.scalar(select(Product).where(Product.platform_product_id == "B0OBSERVE1"))
        rows = db.scalars(select(PriceHistory).where(PriceHistory.product_id == p.id)).all()
        assert len(rows) == 1 and rows[0].price == 1399


def test_history_builds_into_a_verdict_and_link_mode_works(client):
    with SessionLocal() as db:   # simulate the team checking the product on 6 earlier days
        p = db.scalar(select(Product).where(Product.platform_product_id == "B0OBSERVE1"))
        for i in range(1, 7):
            db.add(PriceHistory(product_id=p.id, date=date.today() - timedelta(days=i), price=1450, source="observed"))
        db.commit()
    b = client.post("/api/check/observe", json={"url": URL, "price": 1400, "mrp": 2999}).json()
    assert b["verdict"] == "fake" and b["m30"] == 1450 and b["tracked_days"] == 7
    # the plain link now works too
    link = client.post("/api/check/link", json={"url": URL}).json()
    assert link["status"] == "ok" and link["sale_price"] == 1400


def test_guards(client):
    assert client.post("/api/check/observe", json={"url": URL, "price": 3500, "mrp": 2999}).status_code == 422
    r = client.post("/api/check/observe", json={"url": URL, "price": 50, "mrp": 2999})   # 50 vs usual 1450: likely a typo
    assert r.status_code == 422 and "double-check" in r.json()["error"]
    assert client.post("/api/check/observe", json={"url": "https://example.com/x", "price": 10, "mrp": 20}).status_code == 400


def test_admin_price_export_roundtrip(client, admin_headers):
    r = client.get("/api/admin/export/prices?source=observed", headers=admin_headers)
    assert r.status_code == 200
    lines = r.text.strip().splitlines()
    assert lines[0] == "product_id,platform,name,category,mrp,date,price,source" and len(lines) >= 8
    assert all(l.endswith(",observed") for l in lines[1:])
    a = client.get("/api/admin/analytics", headers=admin_headers).json()
    assert a["usage"]["observed_prices"] >= 7 and a["usage"]["observed_products"] >= 1
    assert client.get("/api/admin/export/prices").status_code == 401
