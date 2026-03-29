"""Notification endpoints — GET /notifications + PUT /notifications/read-all + PUT /notifications/{id}/read."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from starlette.responses import Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.deps import get_current_gym_id, get_db
from api.schemas.notification import NotificationListResponse, NotificationResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])

MAX_PAGE_SIZE = 100


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
    gym_id: str = Depends(get_current_gym_id),
) -> NotificationListResponse:
    """List notifications for the current gym, newest first."""
    params: dict = {"gym_id": gym_id}

    total = db.execute(
        text("SELECT COUNT(*) FROM notifications WHERE gym_id = :gym_id"),
        params,
    ).scalar() or 0

    unread_count = db.execute(
        text(
            "SELECT COUNT(*) FROM notifications "
            "WHERE gym_id = :gym_id AND is_read = false"
        ),
        params,
    ).scalar() or 0

    offset = (page - 1) * page_size
    params["limit"] = page_size
    params["offset"] = offset

    rows = db.execute(
        text(
            "SELECT id::text, type, title, description, is_read, "
            "member_id::text, created_at "
            "FROM notifications "
            "WHERE gym_id = :gym_id "
            "ORDER BY created_at DESC "
            "LIMIT :limit OFFSET :offset"
        ),
        params,
    ).fetchall()

    notifications = [
        NotificationResponse(
            id=r.id,
            type=r.type,
            title=r.title,
            description=r.description,
            is_read=r.is_read,
            member_id=r.member_id,
            created_at=r.created_at,
        )
        for r in rows
    ]

    return NotificationListResponse(
        notifications=notifications,
        total=total,
        page=page,
        page_size=page_size,
        unread_count=unread_count,
    )


@router.put("/read-all", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    gym_id: str = Depends(get_current_gym_id),
) -> Response:
    """Mark all unread notifications as read for the current gym."""
    db.execute(
        text(
            "UPDATE notifications SET is_read = true "
            "WHERE gym_id = :gym_id AND is_read = false"
        ),
        {"gym_id": gym_id},
    )


@router.put("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    gym_id: str = Depends(get_current_gym_id),
) -> Response:
    """Mark a notification as read. Only succeeds if it belongs to this gym."""
    result = db.execute(
        text(
            "UPDATE notifications SET is_read = true "
            "WHERE id = :id AND gym_id = :gym_id AND is_read = false"
        ),
        {"id": notification_id, "gym_id": gym_id},
    )

    if result.rowcount == 0:
        exists = db.execute(
            text("SELECT 1 FROM notifications WHERE id = :id AND gym_id = :gym_id"),
            {"id": notification_id, "gym_id": gym_id},
        ).fetchone()

        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )
