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


BATCH_SIZE_MEMBERS = 500
BATCH_SIZE_ROWS = 1000


def load_members(db: Session, gym_id: str, rows: list[dict]) -> LoadResult:
    """Upsert members by (gym_id, email) in bulk batches.

    Uses INSERT ... ON CONFLICT DO UPDATE with RETURNING to distinguish
    inserted vs updated rows in a single round-trip per batch.
    """
    result = LoadResult()

    for i in range(0, len(rows), BATCH_SIZE_MEMBERS):
        batch = rows[i : i + BATCH_SIZE_MEMBERS]
        try:
            # Build multi-row VALUES clause
            values_parts = []
            params: dict = {"gym_id": gym_id}
            for j, row in enumerate(batch):
                values_parts.append(
                    f"(:gym_id, :name_{j}, :email_{j}, :phone_{j}, "
                    f":enrolled_at_{j}, :cancelled_at_{j}, :status_{j})"
                )
                params[f"name_{j}"] = row["name"]
                params[f"email_{j}"] = row["email"]
                params[f"phone_{j}"] = row.get("phone")
                params[f"enrolled_at_{j}"] = row.get("enrolled_at") or date.today()
                params[f"cancelled_at_{j}"] = row.get("cancelled_at")
                params[f"status_{j}"] = row["status"]

            sql = (
                "INSERT INTO members "
                "(gym_id, name, email, phone, enrolled_at, cancelled_at, status) "
                f"VALUES {', '.join(values_parts)} "
                "ON CONFLICT (gym_id, email) DO UPDATE SET "
                "name = EXCLUDED.name, phone = EXCLUDED.phone, "
                "enrolled_at = EXCLUDED.enrolled_at, "
                "cancelled_at = EXCLUDED.cancelled_at, "
                "status = EXCLUDED.status, "
                "updated_at = now() "
                "RETURNING (xmax = 0) AS was_inserted"
            )

            rows_result = db.execute(text(sql), params).fetchall()
            for r in rows_result:
                if r.was_inserted:
                    result.inserted += 1
                else:
                    result.updated += 1
        except Exception as exc:
            logger.warning("Failed to load member batch %d: %s", i, exc)
            result.errors.append(f"Member batch starting at row {i}: {exc}")

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
    """Insert checkins in bulk batches, linking by member email.

    Skips rows whose member_email doesn't match an existing member.
    """
    result = LoadResult()

    emails = {row["member_email"] for row in rows}
    email_to_id = _resolve_member_ids(db, gym_id, emails)

    # Separate valid rows from skipped
    valid_rows = []
    for row in rows:
        member_id = email_to_id.get(row["member_email"])
        if not member_id:
            result.skipped += 1
            result.errors.append(f"Member not found: {row['member_email']}")
            continue
        valid_rows.append({**row, "_member_id": member_id})

    # Bulk insert in batches
    for i in range(0, len(valid_rows), BATCH_SIZE_ROWS):
        batch = valid_rows[i : i + BATCH_SIZE_ROWS]
        try:
            values_parts = []
            params: dict = {"gym_id": gym_id}
            for j, row in enumerate(batch):
                values_parts.append(
                    f"(:gym_id, :mid_{j}, :ts_{j}, :dur_{j})"
                )
                params[f"mid_{j}"] = row["_member_id"]
                params[f"ts_{j}"] = row["ts"]
                params[f"dur_{j}"] = row.get("duration_min")

            sql = (
                "INSERT INTO checkins (gym_id, member_id, ts, duration_min) "
                f"VALUES {', '.join(values_parts)}"
            )
            db.execute(text(sql), params)
            result.inserted += len(batch)
        except Exception as exc:
            logger.warning("Failed to load checkin batch %d: %s", i, exc)
            result.errors.append(f"Checkin batch starting at row {i}: {exc}")

    return result


def load_payments(db: Session, gym_id: str, rows: list[dict]) -> LoadResult:
    """Insert payments in bulk batches, linking by member email.

    Skips rows whose member_email doesn't match an existing member.
    """
    result = LoadResult()

    emails = {row["member_email"] for row in rows}
    email_to_id = _resolve_member_ids(db, gym_id, emails)

    # Separate valid rows from skipped
    valid_rows = []
    for row in rows:
        member_id = email_to_id.get(row["member_email"])
        if not member_id:
            result.skipped += 1
            result.errors.append(f"Member not found: {row['member_email']}")
            continue
        valid_rows.append({**row, "_member_id": member_id})

    # Bulk insert in batches
    for i in range(0, len(valid_rows), BATCH_SIZE_ROWS):
        batch = valid_rows[i : i + BATCH_SIZE_ROWS]
        try:
            values_parts = []
            params: dict = {"gym_id": gym_id}
            for j, row in enumerate(batch):
                values_parts.append(
                    f"(:gym_id, :mid_{j}, :due_{j}, :paid_{j}, :amt_{j}, :st_{j})"
                )
                params[f"mid_{j}"] = row["_member_id"]
                params[f"due_{j}"] = row["due_date"]
                params[f"paid_{j}"] = row.get("paid_at")
                params[f"amt_{j}"] = row["amount"]
                params[f"st_{j}"] = row["status"]

            sql = (
                "INSERT INTO payments "
                "(gym_id, member_id, due_date, paid_at, amount, status) "
                f"VALUES {', '.join(values_parts)}"
            )
            db.execute(text(sql), params)
            result.inserted += len(batch)
        except Exception as exc:
            logger.warning("Failed to load payment batch %d: %s", i, exc)
            result.errors.append(f"Payment batch starting at row {i}: {exc}")

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
