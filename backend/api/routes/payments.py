"""Payments endpoint — GET /payments."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.deps import get_current_gym_id, get_db
from api.schemas.payment import PaymentListResponse, PaymentResponse

router = APIRouter(prefix="/payments", tags=["payments"])

MAX_PAGE_SIZE = 100


@router.get("", response_model=PaymentListResponse)
def list_payments(
    member_id: str | None = Query(None),
    payment_status: str | None = Query(None, alias="status", pattern="^(pending|paid|overdue|cancelled)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
    gym_id: str = Depends(get_current_gym_id),
) -> PaymentListResponse:
    """List payments with optional filters."""
    conditions = ["p.gym_id = :gym_id"]
    params: dict = {"gym_id": gym_id}

    if member_id:
        conditions.append("p.member_id = :member_id")
        params["member_id"] = str(member_id)

    if payment_status:
        conditions.append("p.status = :status")
        params["status"] = payment_status

    where = " AND ".join(conditions)

    total = db.execute(
        text(f"SELECT COUNT(*) FROM payments p WHERE {where}"),  # noqa: S608
        params,
    ).scalar() or 0

    offset = (page - 1) * page_size
    params["limit"] = page_size
    params["offset"] = offset

    rows = db.execute(
        text(
            f"SELECT p.id::text, p.member_id::text, m.name AS member_name, "  # noqa: S608
            f"p.amount, p.due_date, p.paid_at, p.status "
            f"FROM payments p "
            f"INNER JOIN members m ON m.id = p.member_id "
            f"WHERE {where} "
            f"ORDER BY p.due_date DESC "
            f"LIMIT :limit OFFSET :offset"
        ),
        params,
    ).fetchall()

    payments = [
        PaymentResponse(
            id=r.id,
            member_id=r.member_id,
            member_name=r.member_name,
            amount=r.amount,
            due_date=r.due_date,
            paid_at=r.paid_at,
            status=r.status,
        )
        for r in rows
    ]

    return PaymentListResponse(
        payments=payments,
        total=total,
        page=page,
        page_size=page_size,
    )
