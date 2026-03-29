"""Gym settings endpoints — GET /gym/settings + PUT /gym/settings."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.deps import get_db, get_gym_uuid
from api.schemas.settings import GymSettingsResponse, UpdateGymSettingsRequest

router = APIRouter(prefix="/gym", tags=["settings"])

_GET_SETTINGS_SQL = text("""
SELECT id::text, name, slug, email, phone, timezone
FROM gyms
WHERE id = :gym_id
""")

_ALLOWED_FIELDS = {"name", "email", "phone", "timezone"}


@router.get("/settings", response_model=GymSettingsResponse)
def get_gym_settings(
    db: Session = Depends(get_db),
    gym_id: str = Depends(get_gym_uuid),
) -> GymSettingsResponse:
    """Get current gym profile settings."""
    row = db.execute(_GET_SETTINGS_SQL, {"gym_id": gym_id}).fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gym not found",
        )

    return GymSettingsResponse(
        id=row.id,
        name=row.name,
        slug=row.slug,
        email=row.email,
        phone=row.phone,
        timezone=row.timezone,
    )


@router.put("/settings", response_model=GymSettingsResponse)
def update_gym_settings(
    body: UpdateGymSettingsRequest,
    db: Session = Depends(get_db),
    gym_id: str = Depends(get_gym_uuid),
) -> GymSettingsResponse:
    """Update gym profile settings. Only provided fields are updated."""
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if k in _ALLOWED_FIELDS}

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    set_clauses = [f"{key} = :{key}" for key in updates]
    set_sql = ", ".join(set_clauses)
    updates["gym_id"] = gym_id

    db.execute(
        text(
            f"UPDATE gyms SET {set_sql}, updated_at = now() "  # noqa: S608
            f"WHERE id = :gym_id"
        ),
        updates,
    )

    row = db.execute(_GET_SETTINGS_SQL, {"gym_id": gym_id}).fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gym not found",
        )

    return GymSettingsResponse(
        id=row.id,
        name=row.name,
        slug=row.slug,
        email=row.email,
        phone=row.phone,
        timezone=row.timezone,
    )
