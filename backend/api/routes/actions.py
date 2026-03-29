"""Retention actions endpoints — GET /actions + POST /actions."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.deps import get_current_gym_id, get_db
from api.schemas.action import ActionListResponse, ActionResponse, CreateActionRequest

router = APIRouter(prefix="/actions", tags=["actions"])

MAX_PAGE_SIZE = 100

_MEMBER_CHECK_SQL = text(
    "SELECT name FROM members WHERE id = :member_id AND gym_id = :gym_id"
)

_INSERT_ACTION_SQL = text("""
INSERT INTO actions_log (member_id, gym_id, action_type, channel, message)
VALUES (:member_id, :gym_id, :action_type, :channel, :message)
RETURNING id::text, sent_at
""")


@router.get("", response_model=ActionListResponse)
def list_actions(
    member_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
    gym_id: str = Depends(get_current_gym_id),
) -> ActionListResponse:
    """List retention actions with optional member filter."""
    conditions = ["a.gym_id = :gym_id"]
    params: dict = {"gym_id": gym_id}

    if member_id:
        conditions.append("a.member_id = :member_id")
        params["member_id"] = str(member_id)

    where = " AND ".join(conditions)

    total = db.execute(
        text(f"SELECT COUNT(*) FROM actions_log a WHERE {where}"),  # noqa: S608
        params,
    ).scalar() or 0

    offset = (page - 1) * page_size
    params["limit"] = page_size
    params["offset"] = offset

    rows = db.execute(
        text(
            f"SELECT a.id::text, a.member_id::text, m.name AS member_name, "  # noqa: S608
            f"a.action_type, a.channel, a.message, a.sent_at, a.result "
            f"FROM actions_log a "
            f"INNER JOIN members m ON m.id = a.member_id "
            f"WHERE {where} "
            f"ORDER BY a.sent_at DESC "
            f"LIMIT :limit OFFSET :offset"
        ),
        params,
    ).fetchall()

    actions = [
        ActionResponse(
            id=r.id,
            member_id=r.member_id,
            member_name=r.member_name,
            action_type=r.action_type,
            channel=r.channel,
            message=r.message,
            sent_at=r.sent_at,
            result=r.result,
        )
        for r in rows
    ]

    return ActionListResponse(
        actions=actions,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=ActionResponse, status_code=status.HTTP_201_CREATED)
def create_action(
    body: CreateActionRequest,
    db: Session = Depends(get_db),
    gym_id: str = Depends(get_current_gym_id),
) -> ActionResponse:
    """Create a new retention action for a member."""
    member = db.execute(
        _MEMBER_CHECK_SQL,
        {"member_id": body.member_id, "gym_id": gym_id},
    ).fetchone()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this gym",
        )

    row = db.execute(
        _INSERT_ACTION_SQL,
        {
            "member_id": body.member_id,
            "gym_id": gym_id,
            "action_type": body.action_type,
            "channel": body.channel,
            "message": body.message,
        },
    ).fetchone()

    return ActionResponse(
        id=row.id,
        member_id=body.member_id,
        member_name=member.name,
        action_type=body.action_type,
        channel=body.channel,
        message=body.message,
        sent_at=row.sent_at,
        result=None,
    )
