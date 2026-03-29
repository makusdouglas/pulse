"""Pydantic schemas for payment endpoints."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class PaymentResponse(BaseModel):
    id: str
    member_id: str
    member_name: str
    amount: float
    due_date: date
    paid_at: date | None
    status: str


class PaymentListResponse(BaseModel):
    payments: list[PaymentResponse]
    total: int
    page: int
    page_size: int
