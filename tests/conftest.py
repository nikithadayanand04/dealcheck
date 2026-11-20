"""Test setup: a throw-away SQLite database and model folder, high rate limit, known admin password."""
import os
import sys
import tempfile
from pathlib import Path

import bcrypt
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

_tmp = tempfile.mkdtemp(prefix="dealcheck_test_")
TEST_ADMIN_PASSWORD = "test-only-password"
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["RATE_LIMIT"] = "10000/minute"
os.environ["ADMIN_PASSWORD_HASH"] = bcrypt.hashpw(TEST_ADMIN_PASSWORD.encode(), bcrypt.gensalt(4)).decode()
os.environ["ALLOWED_ORIGIN"] = "http://localhost:5173"

from backend.app import config  # noqa: E402

config.MODELS_DIR = Path(_tmp) / "models"


@pytest.fixture(scope="session")
def seeded():
    """Small synthetic dataset loaded and both models trained + active."""
    from backend.app.database import SessionLocal, init_db
    from backend.app.importers import import_prices, import_survey
    from backend.app.ml_service import train_and_register
    import ml.generate_synthetic as g

    g.N_PRODUCTS, g.N_DAYS = 30, 200
    prices, survey = Path(_tmp) / "p.csv", Path(_tmp) / "s.csv"
    g.gen_prices(prices)
    g.gen_survey(survey)
    init_db()
    with SessionLocal() as db:
        import_prices(db, prices.read_text(), source="synthetic")
        import_survey(db, survey.read_text(), source="synthetic")
        train_and_register(db, "impulse", activate=True)
        train_and_register(db, "price_drop", activate=True)
    return {"prices": prices, "survey": survey}


@pytest.fixture(scope="session")
def client(seeded):
    from fastapi.testclient import TestClient
    from backend.app.main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def admin_headers(client):
    r = client.post("/api/admin/login", json={"password": TEST_ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}
