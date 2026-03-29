"""CSV data loader — inserts parsed rows into the database.

Handles member upserts (by gym_id + email), checkin inserts,
and payment inserts. All operations are scoped by gym_id.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


@dataclass
class LoadResult:
    inserted: int = 0
    updated: int = 0
    skipped: int = 0
    errors: list[str] = field(default_factory=list)


def load_members(db: Session, gym_id: str, rows: list[dict]) -> LoadResult:
    """Upsert members by (gym_id, email).

    If a member with the same email exists for this gym, update their fields.
    Otherwise, insert a new member.
    """
    result = LoadResult()

    for row in rows:
        try:
            existing = db.execute(
                text(
                    "SELECT id FROM members "
                    "WHERE gym_id = :gym_id AND email = :email "
                    "LIMIT 1"
                ),
                {"gym_id": gym_id, "email": row["email"]},
            ).fetchone()

            if existing:
                db.execute(
                    text(
                        "UPDATE members SET "
                        "name = :name, phone = :phone, "
                        "enrolled_at = :enrolled_at, "
                        "cancelled_at = :cancelled_at, "
                        "status = :status, "
                        "updated_at = now() "
                        "WHERE gym_id = :gym_id AND email = :email"
                    ),
                    {
                        "gym_id": gym_id,
                        "email": row["email"],
                        "name": row["name"],
                        "phone": row.get("phone"),
                        "enrolled_at": row.get("enrolled_at"),
                        "cancelled_at": row.get("cancelled_at"),
                        "status": row["status"],
                    },
                )
                result.updated += 1
            else:
                db.execute(
                    text(
                        "INSERT INTO members "
                        "(gym_id, name, email, phone, enrolled_at, cancelled_at, status) "
                        "VALUES (:gym_id, :name, :email, :phone, :enrolled_at, :cancelled_at, :status)"
                    ),
                    {
                        "gym_id": gym_id,
                        "name": row["name"],
                        "email": row["email"],
                        "phone": row.get("phone"),
                        "enrolled_at": row.get("enrolled_at"),
                        "cancelled_at": row.get("cancelled_at"),
                        "status": row["status"],
                    },
                )
                result.inserted += 1
        except Exception as exc:
            logger.warning("Failed to load member row: %s", exc)
            result.errors.append(f"Member {row.get('email')}: {exc}")

    return result


def _resolve_member_ids(
    db: Session, gym_id: str, emails: set[str]
) -> dict[str, str]:
    """Resolve member emails to their UUIDs."""
    if not emails:
        return {}

    rows = db.execute(
        text(
            "SELECT id, email FROM members "
            "WHERE gym_id = :gym_id AND email = ANY(:emails)"
        ),
        {"gym_id": gym_id, "emails": list(emails)},
    ).fetchall()

    return {row.email: str(row.id) for row in rows}


def load_checkins(db: Session, gym_id: str, rows: list[dict]) -> LoadResult:
    """Insert checkins, linking by member email.

    Skips rows whose member_email doesn't match an existing member.
    """
    result = LoadResult()

    emails = {row["member_email"] for row in rows}
    email_to_id = _resolve_member_ids(db, gym_id, emails)

    for row in rows:
        member_id = email_to_id.get(row["member_email"])
        if not member_id:
            result.skipped += 1
            result.errors.append(
                f"Member not found: {row['member_email']}"
            )
            continue

        try:
            db.execute(
                text(
                    "INSERT INTO checkins (gym_id, member_id, ts, duration_min) "
                    "VALUES (:gym_id, :member_id, :ts, :duration_min)"
                ),
                {
                    "gym_id": gym_id,
                    "member_id": member_id,
                    "ts": row["ts"],
                    "duration_min": row.get("duration_min"),
                },
            )
            result.inserted += 1
        except Exception as exc:
            logger.warning("Failed to load checkin row: %s", exc)
            result.errors.append(
                f"Checkin {row['member_email']} @ {row['ts']}: {exc}"
            )

    return result


def load_payments(db: Session, gym_id: str, rows: list[dict]) -> LoadResult:
    """Insert payments, linking by member email.

    Skips rows whose member_email doesn't match an existing member.
    """
    result = LoadResult()

    emails = {row["member_email"] for row in rows}
    email_to_id = _resolve_member_ids(db, gym_id, emails)

    for row in rows:
        member_id = email_to_id.get(row["member_email"])
        if not member_id:
            result.skipped += 1
            result.errors.append(
                f"Member not found: {row['member_email']}"
            )
            continue

        try:
            db.execute(
                text(
                    "INSERT INTO payments "
                    "(gym_id, member_id, due_date, paid_at, amount, status) "
                    "VALUES (:gym_id, :member_id, :due_date, :paid_at, :amount, :status)"
                ),
                {
                    "gym_id": gym_id,
                    "member_id": member_id,
                    "due_date": row["due_date"],
                    "paid_at": row.get("paid_at"),
                    "amount": row["amount"],
                    "status": row["status"],
                },
            )
            result.inserted += 1
        except Exception as exc:
            logger.warning("Failed to load payment row: %s", exc)
            result.errors.append(
                f"Payment {row['member_email']} @ {row['due_date']}: {exc}"
            )

    return result


def load_csv_data(
    db: Session, gym_id: str, entity_type: str, rows: list[dict]
) -> LoadResult:
    """Route parsed rows to the correct loader by entity type."""
    loaders = {
        "members": load_members,
        "checkins": load_checkins,
        "payments": load_payments,
    }
    loader = loaders.get(entity_type)
    if not loader:
        raise ValueError(f"Unknown entity type: {entity_type}")
    return loader(db, gym_id, rows)


def check_existing_members(
    db: Session, gym_id: str, emails: list[str]
) -> set[str]:
    """Return the set of emails that already exist for this gym."""
    if not emails:
        return set()

    rows = db.execute(
        text(
            "SELECT email FROM members "
            "WHERE gym_id = :gym_id AND email = ANY(:emails)"
        ),
        {"gym_id": gym_id, "emails": emails},
    ).fetchall()

    return {row.email for row in rows}


def commit_import(
    db: Session,
    gym_id: str,
    members: list[dict],
    payments: list[dict],
    checkins: list[dict],
) -> dict[str, LoadResult]:
    """Insert all entities in a single transaction.

    Members are upserted first so email→ID resolution works for
    payments and checkins. The caller (get_db dependency) handles
    commit/rollback.
    """
    members_result = load_members(db, gym_id, members) if members else LoadResult()
    payments_result = load_payments(db, gym_id, payments) if payments else LoadResult()
    checkins_result = load_checkins(db, gym_id, checkins) if checkins else LoadResult()

    return {
        "members": members_result,
        "payments": payments_result,
        "checkins": checkins_result,
    }
