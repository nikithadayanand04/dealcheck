from datetime import date, datetime, timezone

from sqlalchemy import (Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text,
                        UniqueConstraint, create_engine)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from . import config

_kwargs = {"connect_args": {"check_same_thread": False}} if config.DATABASE_URL.startswith("sqlite") else {"pool_pre_ping": True}
if config.DATABASE_URL.startswith("sqlite"):
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
engine = create_engine(config.DATABASE_URL, **_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def utcnow():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (UniqueConstraint("platform", "platform_product_id"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    platform: Mapped[str] = mapped_column(String(20))
    platform_product_id: Mapped[str] = mapped_column(String(64))
    name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    category: Mapped[str | None] = mapped_column(String(30), nullable=True)
    mrp: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PriceHistory(Base):
    __tablename__ = "price_history"
    __table_args__ = (UniqueConstraint("product_id", "date"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    date: Mapped[date] = mapped_column(Date)
    price: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(20), default="dataset")


class Check(Base):
    __tablename__ = "checks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    platform: Mapped[str | None] = mapped_column(String(20), nullable=True)
    category: Mapped[str | None] = mapped_column(String(30), nullable=True)
    mode: Mapped[str] = mapped_column(String(10))
    mrp: Mapped[float] = mapped_column(Float)
    sale_price: Mapped[float] = mapped_column(Float)
    m30: Mapped[float | None] = mapped_column(Float, nullable=True)
    ad: Mapped[float] = mapped_column(Float)
    rd: Mapped[float | None] = mapped_column(Float, nullable=True)
    ddi: Mapped[float | None] = mapped_column(Float, nullable=True)
    verdict: Mapped[str] = mapped_column(String(20))
    confidence: Mapped[str] = mapped_column(String(20))
    drop_probability: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


QUESTION_COLS = [f"q{i}" for i in range(1, 11)]


class ImpulseResponse(Base):
    """Answers from website visitors who ticked the consent box (anonymous)."""
    __tablename__ = "impulse_responses"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    q1: Mapped[str] = mapped_column(String(20)); q2: Mapped[str] = mapped_column(String(20))
    q3: Mapped[str] = mapped_column(String(20)); q4: Mapped[str] = mapped_column(String(20))
    q5: Mapped[str] = mapped_column(String(20)); q6: Mapped[str] = mapped_column(String(20))
    q7: Mapped[str] = mapped_column(String(20)); q8: Mapped[str] = mapped_column(String(20))
    q9: Mapped[str] = mapped_column(String(20)); q10: Mapped[str] = mapped_column(String(20))
    impulse_score: Mapped[float] = mapped_column(Float)
    consent: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SurveyResponse(Base):
    """Labelled research survey rows used to train the impulse model."""
    __tablename__ = "survey_responses"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    q1: Mapped[str] = mapped_column(String(20)); q2: Mapped[str] = mapped_column(String(20))
    q3: Mapped[str] = mapped_column(String(20)); q4: Mapped[str] = mapped_column(String(20))
    q5: Mapped[str] = mapped_column(String(20)); q6: Mapped[str] = mapped_column(String(20))
    q7: Mapped[str] = mapped_column(String(20)); q8: Mapped[str] = mapped_column(String(20))
    q9: Mapped[str] = mapped_column(String(20)); q10: Mapped[str] = mapped_column(String(20))
    label_impulse: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(30), default="upload")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ModelVersion(Base):
    __tablename__ = "model_versions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    model_name: Mapped[str] = mapped_column(String(30))
    algorithm: Mapped[str] = mapped_column(String(60))
    metrics_json: Mapped[str] = mapped_column(Text)
    file_path: Mapped[str] = mapped_column(String(300))
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    trained_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


def init_db():
    Base.metadata.create_all(engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
