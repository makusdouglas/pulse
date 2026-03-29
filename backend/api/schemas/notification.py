"""Pydantic schemas for notification endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    description: str | None
    read: bool
    member_id: str | None
    created_at: datetime


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    total: int
    page: int
    page_size: int
    unread_count: int
