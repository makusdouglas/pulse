"""Pydantic schemas for retention action endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CreateActionRequest(BaseModel):
    member_id: str
    action_type: str = Field(..., max_length=50)
    channel: str = Field(
        default="whatsapp",
        pattern="^(whatsapp|email|phone|in_person|other)$",
    )
    message: str = Field(..., min_length=1, max_length=2000)


class ActionResponse(BaseModel):
    id: str
    member_id: str
    member_name: str
    action_type: str
    channel: str
    message: str | None
    sent_at: datetime
    result: str | None


class ActionListResponse(BaseModel):
    actions: list[ActionResponse]
    total: int
    page: int
    page_size: int
