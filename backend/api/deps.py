import logging
from collections.abc import Generator

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.auth import decode_clerk_jwt, extract_gym_id
from infra.database import SessionLocal
from infra.tenant import clear_tenant, get_tenant, set_tenant

logger = logging.getLogger(__name__)


def get_current_gym_id(authorization: str | None = Header(None)) -> str:
    """Extract Clerk org_id from JWT. Returns the raw Clerk string."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )

    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_clerk_jwt(token)
    return extract_gym_id(payload)


def _resolve_gym_id(db: Session, clerk_org_id: str) -> str:
    """Resolve Clerk org_id → internal UUID. Auto-provisions gym if not found."""
    row = db.execute(
        text("SELECT id::text AS id FROM gyms WHERE clerk_org_id = :org_id"),
        {"org_id": clerk_org_id},
    ).fetchone()
    if row:
        return row.id

    # Auto-provision with UPSERT to handle concurrent requests
    result = db.execute(
        text(
            "INSERT INTO gyms (clerk_org_id, name, slug) "
            "VALUES (:org_id, :name, :slug) "
            "ON CONFLICT (clerk_org_id) DO NOTHING "
            "RETURNING id::text AS id"
        ),
        {"org_id": clerk_org_id, "name": "My Gym", "slug": clerk_org_id},
    )
    new_row = result.fetchone()
    if new_row:
        logger.info("Auto-provisioned gym for clerk_org_id=%s", clerk_org_id)
        return new_row.id

    # INSERT returned nothing (conflict) — fetch existing row
    row = db.execute(
        text("SELECT id::text AS id FROM gyms WHERE clerk_org_id = :org_id"),
        {"org_id": clerk_org_id},
    ).fetchone()
    if row:
        return row.id

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to resolve gym for this organization",
    )


def get_db(
    clerk_org_id: str = Depends(get_current_gym_id),
) -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        gym_uuid = _resolve_gym_id(db, clerk_org_id)
        set_tenant(gym_uuid)
        db.execute(text("SET LOCAL app.current_gym_id = :gym_id"), {"gym_id": gym_uuid})
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        clear_tenant()
        db.close()


def get_gym_uuid() -> str:
    """Return the resolved UUID gym_id from tenant context (set by get_db)."""
    return get_tenant()
