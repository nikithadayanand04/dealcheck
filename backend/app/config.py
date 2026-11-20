"""All settings and thresholds live here so they can be changed in one place."""
import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent
DATA_DIR = ROOT_DIR / "data"
MODELS_DIR = BACKEND_DIR / "models"
SALE_CALENDAR_PATH = BACKEND_DIR / "app" / "sale_calendar.json"

load_dotenv(BACKEND_DIR / ".env")

_db = os.getenv("DATABASE_URL", f"sqlite:///{(DATA_DIR / 'dealcheck.db').as_posix()}")
# Render/Heroku give "postgres://", SQLAlchemy needs "postgresql://"
DATABASE_URL = _db.replace("postgres://", "postgresql://", 1) if _db.startswith("postgres://") else _db

ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGIN", "http://localhost:5173").split(",") if o.strip()]
RATE_LIMIT = os.getenv("RATE_LIMIT", "30/minute")
TOKEN_TTL_SECONDS = 2 * 60 * 60

# ---- Discount Deception Index (DDI) ----
GENUINE_MAX = 5.0        # DDI < 5            -> genuine
INFLATED_MAX = 15.0      # 5 <= DDI <= 15     -> slightly inflated ; > 15 -> fake
WINDOW_DAYS = 30         # window for the median "usual" price
CONTEXT_DAYS = 90        # window for chart and lowest price
MIN_POINTS = 5           # fewer points in 30 days -> "not enough data"
MEDIUM_POINTS = 10
HIGH_POINTS = 20
MAX_PRICE = 1_000_000

# ---- Price-drop model ----
MIN_DAYS_FOR_DROP_PREDICTION = 30
DROP_HORIZON_DAYS = 14
DROP_THRESHOLD = 0.95    # "drop" = price falls to <= 95% of today's price

# ---- Impulse model ----
IMPULSE_LOW_MAX = 39
IMPULSE_MEDIUM_MAX = 69
MIN_SURVEY_ROWS = 50

PLATFORMS = ["amazon", "flipkart", "myntra", "other"]
CATEGORIES = ["Electronics", "Fashion", "Home", "Beauty", "Books", "Others"]
