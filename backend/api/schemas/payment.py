"""Pydantic schemas for payment endpoints."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import BaseModel

from api.schemas.pagination import PaginatedResponse


class PaymentResponse(BaseModel):
    id: str
    member_id: str
    member_name: str
    amount: Decimal
    due_date: date
    paid_at: date | None
    status: str


class PaymentListResponse(PaginatedResponse):
    payments: list[PaymentResponse]
