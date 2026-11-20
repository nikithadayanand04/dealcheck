import csv
from datetime import date, timedelta

from sqlalchemy import func, select

from backend.app.database import ImpulseResponse, SessionLocal

QUIZ = {"q1": "no", "q2": "lt5", "q3": "a_lot", "q4": "no", "q5": "yes", "q6": "bnpl",
        "q7": "bored", "q8": "every_sale", "q9": "gt75", "q10": "18-22"}
CALM = {"q1": "yes", "q2": "gt30", "q3": "not_at_all", "q4": "yes", "q5": "no", "q6": "full",
        "q7": "calm", "q8": "rarely", "q9": "lt25", "q10": "45plus"}


def first_product(seeded):
    with open(seeded["prices"]) as f:
        return next(csv.DictReader(f))


def link_for(row):
    pid = row["product_id"]
    return {"amazon": f"https://www.amazon.in/x/dp/{pid}",
            "flipkart": f"https://www.flipkart.com/x/p/itmabc?pid={pid}",
            "myntra": f"https://www.myntra.com/x/y/{pid}/buy"}[row["platform"]]


def test_health_and_meta(client):
    assert client.get("/api/health").json()["models"] == {"impulse": True, "price_drop": True}
    m = client.get("/api/meta").json()
    assert m["thresholds"]["genuine_below"] == 5 and len(m["questions"]) == 10


def test_link_found(client, seeded):
    r = client.post("/api/check/link", json={"url": link_for(first_product(seeded))})
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["status"] == "ok" and b["verdict"] in {"genuine", "inflated", "fake"}
    assert b["confidence"] == "high" and len(b["history"]) > 30
    assert 0 <= b["drop_probability"] <= 1 and b["suggestion"] in {"wait", "buy"}
    assert b["ddi"] == round(b["advertised_discount"] - b["real_discount"], 1) or abs(
        b["ddi"] - (b["advertised_discount"] - b["real_discount"])) <= 0.1


def test_link_not_found_then_manual(client):
    r = client.post("/api/check/link", json={"url": "https://www.amazon.in/dp/B0NOTHERE1"})
    assert r.json()["status"] == "not_found" and r.json()["product_id"] == "B0NOTHERE1"
    today = date.today()
    past = [{"date": (today - timedelta(days=i)).isoformat(), "price": 900} for i in range(1, 7)]
    r = client.post("/api/check/manual", json={"platform": "amazon", "platform_product_id": "B0NOTHERE1",
                                                "category": "Electronics", "mrp": 2000, "sale_price": 800, "past_prices": past})
    b = r.json()
    assert r.status_code == 200 and b["ddi"] == 48.9 and b["verdict"] == "fake" and b["confidence"] == "low"
    assert b["drop_probability"] is None and "30 days" in b["drop_note"]


def test_link_errors(client):
    r = client.post("/api/check/link", json={"url": "https://www.ebay.com/itm/1"})
    assert r.status_code == 400 and "only" in r.json()["error"]
    assert client.post("/api/check/link", json={"url": ""}).status_code == 422


def test_manual_validation(client):
    r = client.post("/api/check/manual", json={"mrp": 500, "sale_price": 600})
    assert r.status_code == 422 and r.json()["error"] == "Sale price can't be higher than MRP"
    future = (date.today() + timedelta(days=2)).isoformat()
    r = client.post("/api/check/manual", json={"mrp": 500, "sale_price": 400, "past_prices": [{"date": future, "price": 450}]})
    assert r.status_code == 422 and "future" in r.json()["error"]
    assert client.post("/api/check/manual", json={"mrp": -1, "sale_price": 1}).status_code == 422
    assert client.post("/api/check/manual", json={"mrp": 500, "sale_price": 400, "advertised_pct": 120}).status_code == 422
    r = client.post("/api/check/manual", json={"mrp": 500, "sale_price": 400})
    assert r.status_code == 200 and r.json()["verdict"] == "insufficient" and r.json()["advertised_discount"] == 20.0


def test_impulse_consent(client):
    def count():
        with SessionLocal() as db:
            return db.scalar(select(func.count(ImpulseResponse.id)))
    before = count()
    hi = client.post("/api/impulse", json={**QUIZ, "consent": False}).json()
    assert count() == before and hi["saved"] is False
    lo = client.post("/api/impulse", json={**CALM, "consent": True}).json()
    assert count() == before + 1
    assert hi["score"] > lo["score"] and hi["level"] in {"medium", "high"} and 1 <= len(hi["reasons"]) <= 3
    assert client.post("/api/impulse", json={**QUIZ, "q6": "crypto"}).status_code == 422


def test_learn(client):
    assert len(client.get("/api/learn").json()["patterns"]) == 8


def test_admin_requires_login(client):
    assert client.get("/api/admin/analytics").status_code == 401
    assert client.get("/api/admin/analytics", headers={"Authorization": "Bearer nope"}).status_code == 401
    assert client.post("/api/admin/login", json={"password": "wrong"}).status_code == 401


def test_admin_upload_prices(client, admin_headers):
    today = date.today()
    good = f"product_id,platform,name,category,mrp,date,price\nTESTP1,myntra,Test,Fashion,999,{today - timedelta(days=1)},899\n"
    bad = (f"TESTP2,shopsy,Test,Fashion,999,{today},899\nTESTP3,myntra,Test,Fashion,999,{today},1200\n"
           f"TESTP4,myntra,Test,Fashion,999,20-11-2026,800\nTESTP5,myntra,Test,Fashion,999,{today + timedelta(days=3)},800\n")
    r = client.post("/api/admin/upload/prices", headers=admin_headers, files={"file": ("p.csv", good + bad, "text/csv")})
    b = r.json()
    assert r.status_code == 200 and b["rows_added"] == 1 and b["rows_rejected"] == 4
    reasons = " ".join(x["reason"] for x in b["rejected"])
    assert "platform" in reasons and "higher than mrp" in reasons and "YYYY-MM-DD" in reasons and "future" in reasons
    r = client.post("/api/admin/upload/prices", headers=admin_headers, files={"file": ("p.csv", "a,b\n1,2\n", "text/csv")})
    assert r.status_code == 400 and "Missing column" in r.json()["error"]
    r = client.post("/api/admin/upload/prices", headers=admin_headers, files={"file": ("p.txt", good, "text/plain")})
    assert r.status_code == 400


def test_admin_upload_survey_retrain_activate(client, admin_headers):
    text = "q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,label_impulse\nNo,Less than 5 minutes,A lot,No,Yes,BNPL,Bored,Every sale,More than 75%,18–22,yes\n"
    text += "maybe,lt5,a_lot,no,yes,bnpl,bored,every_sale,gt75,18-22,1\n"
    b = client.post("/api/admin/upload/survey", headers=admin_headers, files={"file": ("s.csv", text, "text/csv")}).json()
    assert b["rows_added"] == 1 and b["rows_rejected"] == 1

    r = client.post("/api/admin/retrain", headers=admin_headers, json={"model": "impulse"})
    assert r.status_code == 200, r.text
    new = r.json()
    assert new["is_active"] is False and "logistic_regression" in new["metrics"]
    act = client.post("/api/admin/activate-model", headers=admin_headers, json={"version_id": new["id"]}).json()
    assert act["is_active"] is True
    models = client.get("/api/admin/models", headers=admin_headers).json()
    assert sum(1 for m in models if m["model_name"] == "impulse" and m["is_active"]) == 1
    assert client.post("/api/admin/activate-model", headers=admin_headers, json={"version_id": 99999}).status_code == 404


def test_admin_analytics_and_export(client, admin_headers):
    a = client.get("/api/admin/analytics", headers=admin_headers).json()
    assert a["dataset"]["rows"] > 0 and len(a["dataset"]["festive_vs_normal"]) == 2
    assert a["usage"]["total_checks"] >= 1
    r = client.get("/api/admin/export", headers=admin_headers)
    assert r.status_code == 200 and r.text.startswith("id,created_at,mode")
