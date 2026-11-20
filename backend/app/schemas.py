from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from . import config

Platform = Literal["amazon", "flipkart", "myntra", "other"]
Category = Literal["Electronics", "Fashion", "Home", "Beauty", "Books", "Others"]
Price = Field(gt=0, le=config.MAX_PRICE)


class LinkCheck(BaseModel):
    url: str = Field(min_length=1, max_length=2000)


class PastPrice(BaseModel):
    date: date
    price: float = Field(gt=0, le=config.MAX_PRICE)

    @field_validator("date")
    @classmethod
    def not_future(cls, v: date):
        if v > date.today():
            raise ValueError("Past price dates can't be in the future")
        return v


class ManualCheck(BaseModel):
    name: Optional[str] = Field(default=None, max_length=300)
    platform: Platform = "other"
    category: Category = "Others"
    mrp: float = Field(gt=0, le=config.MAX_PRICE)
    sale_price: float = Field(gt=0, le=config.MAX_PRICE)
    advertised_pct: Optional[float] = Field(default=None, ge=0, le=99)
    platform_product_id: Optional[str] = Field(default=None, max_length=64)
    past_prices: list[PastPrice] = Field(default_factory=list, max_length=10)

    @model_validator(mode="after")
    def check_prices(self):
        if self.sale_price > self.mrp:
            raise ValueError("Sale price can't be higher than MRP")
        return self


class ObserveCheck(BaseModel):
    """Prices read from a product page by the browser button and confirmed by the shopper."""
    url: str = Field(min_length=1, max_length=2000)
    price: float = Field(gt=0, le=config.MAX_PRICE)
    mrp: float = Field(gt=0, le=config.MAX_PRICE)
    advertised_pct: Optional[float] = Field(default=None, ge=0, le=99)
    name: Optional[str] = Field(default=None, max_length=300)
    category: Optional[Category] = None

    @model_validator(mode="after")
    def check_prices(self):
        if self.price > self.mrp:
            raise ValueError("Price can't be higher than MRP")
        return self


YesNo = Literal["yes", "no"]


class ImpulseAnswers(BaseModel):
    q1: YesNo
    q2: Literal["lt5", "5to30", "gt30"]
    q3: Literal["not_at_all", "a_little", "a_lot"]
    q4: Literal["yes", "maybe", "no"]
    q5: YesNo
    q6: Literal["full", "emi", "bnpl", "cod"]
    q7: Literal["calm", "bored", "stressed", "excited"]
    q8: Literal["rarely", "sometimes", "every_sale"]
    q9: Literal["lt25", "25to75", "gt75"]
    q10: Literal["18-22", "23-30", "31-45", "45plus"]
    consent: bool = False


class AdminLogin(BaseModel):
    password: str = Field(min_length=1, max_length=200)


class RetrainRequest(BaseModel):
    model: Literal["impulse", "price_drop"]


class ActivateRequest(BaseModel):
    version_id: int
