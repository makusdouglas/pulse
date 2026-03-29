"""Pydantic schemas for notification endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from api.schemas.pagination import PaginatedResponse


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    description: str | None
    is_read: bool
    member_id: str | None
    created_at: datetime


class NotificationListResponse(PaginatedResponse):
    notifications: list[NotificationResponse]
    unread_count: int
