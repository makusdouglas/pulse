"""Test data factories — insert rows directly via SQL for setting up preconditions."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta

from sqlalchemy import text
from sqlalchemy.orm import Session


def create_member(
    db: Session,
    gym_id: str,
    name: str = "Test Member",
    email: str | None = None,
    phone: str | None = None,
    status: str = "active",
    enrolled_at: date | None = None,
    cancelled_at: date | None = None,
) -> str:
    """Insert a member and return its UUID."""
    member_id = str(uuid.uuid4())
    email = email or f"{name.lower().replace(' ', '.')}@test.com"
    enrolled_at = enrolled_at or date.today() - timedelta(days=180)

    db.execute(text("SET LOCAL row_security = off"))
    db.execute(
        text(
            "INSERT INTO members (id, gym_id, name, email, phone, status, enrolled_at, cancelled_at) "
            "VALUES (:id, :gym_id, :name, :email, :phone, :status, :enrolled_at, :cancelled_at)"
        ),
        {
            "id": member_id,
            "gym_id": gym_id,
            "name": name,
            "email": email,
            "phone": phone,
            "status": status,
            "enrolled_at": enrolled_at,
            "cancelled_at": cancelled_at,
        },
    )
    db.commit()
    return member_id


def create_checkin(
    db: Session,
    gym_id: str,
    member_id: str,
    ts: datetime | None = None,
    duration_min: int = 60,
) -> str:
    """Insert a checkin and return its UUID."""
    checkin_id = str(uuid.uuid4())
    ts = ts or datetime.now()

    db.execute(text("SET LOCAL row_security = off"))
    db.execute(
        text(
            "INSERT INTO checkins (id, member_id, gym_id, ts, duration_min) "
            "VALUES (:id, :member_id, :gym_id, :ts, :duration_min)"
        ),
        {
            "id": checkin_id,
            "member_id": member_id,
            "gym_id": gym_id,
            "ts": ts,
            "duration_min": duration_min,
        },
    )
    db.commit()
    return checkin_id


def create_payment(
    db: Session,
    gym_id: str,
    member_id: str,
    due_date: date | None = None,
    amount: float = 150.00,
    status: str = "paid",
    paid_at: date | None = None,
) -> str:
    """Insert a payment and return its UUID."""
    payment_id = str(uuid.uuid4())
    due_date = due_date or date.today() - timedelta(days=30)
    if status == "paid" and paid_at is None:
        paid_at = due_date

    db.execute(text("SET LOCAL row_security = off"))
    db.execute(
        text(
            "INSERT INTO payments (id, member_id, gym_id, due_date, amount, status, paid_at) "
            "VALUES (:id, :member_id, :gym_id, :due_date, :amount, :status, :paid_at)"
        ),
        {
            "id": payment_id,
            "member_id": member_id,
            "gym_id": gym_id,
            "due_date": due_date,
            "amount": amount,
            "status": status,
            "paid_at": paid_at,
        },
    )
    db.commit()
    return payment_id


def create_churn_score(
    db: Session,
    gym_id: str,
    member_id: str,
    score: int = 50,
    tier: str = "medium",
    reasons: str = "[]",
    computed_at: date | None = None,
) -> str:
    """Insert a churn_score and return its UUID."""
    score_id = str(uuid.uuid4())
    computed_at = computed_at or date.today()

    db.execute(text("SET LOCAL row_security = off"))
    db.execute(
        text(
            "INSERT INTO churn_scores (id, member_id, gym_id, score, tier, reasons, computed_at) "
            "VALUES (:id, :member_id, :gym_id, :score, :tier, CAST(:reasons AS jsonb), :computed_at)"
        ),
        {
            "id": score_id,
            "member_id": member_id,
            "gym_id": gym_id,
            "score": score,
            "tier": tier,
            "reasons": reasons,
            "computed_at": computed_at,
        },
    )
    db.commit()
    return score_id


def create_notification(
    db: Session,
    gym_id: str,
    title: str = "Test notification",
    description: str | None = None,
    type: str = "churn_alert",
    member_id: str | None = None,
    is_read: bool = False,
) -> str:
    """Insert a notification and return its UUID."""
    notif_id = str(uuid.uuid4())

    db.execute(text("SET LOCAL row_security = off"))
    db.execute(
        text(
            "INSERT INTO notifications (id, gym_id, member_id, type, title, description, is_read) "
            "VALUES (:id, :gym_id, :member_id, :type, :title, :description, :is_read)"
        ),
        {
            "id": notif_id,
            "gym_id": gym_id,
            "member_id": member_id,
            "type": type,
            "title": title,
            "description": description,
            "is_read": is_read,
        },
    )
    db.commit()
    return notif_id


def create_action(
    db: Session,
    gym_id: str,
    member_id: str,
    action_type: str = "contact",
    channel: str = "whatsapp",
    message: str = "Test action message",
) -> str:
    """Insert an action_log entry and return its UUID."""
    action_id = str(uuid.uuid4())

    db.execute(text("SET LOCAL row_security = off"))
    db.execute(
        text(
            "INSERT INTO actions_log (id, member_id, gym_id, action_type, channel, message) "
            "VALUES (:id, :member_id, :gym_id, :action_type, :channel, :message)"
        ),
        {
            "id": action_id,
            "member_id": member_id,
            "gym_id": gym_id,
            "action_type": action_type,
            "channel": channel,
            "message": message,
        },
    )
    db.commit()
    return action_id


def get_db_session():
    """Get a fresh DB session for factory use inside tests."""
    from infra.database import SessionLocal
    return SessionLocal()
