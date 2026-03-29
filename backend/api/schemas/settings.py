"""Pydantic schemas for gym settings endpoints."""

from __future__ import annotations

from pydantic import BaseModel, Field


class GymSettingsResponse(BaseModel):
    id: str
    name: str
    slug: str
    email: str | None
    phone: str | None
    timezone: str


class UpdateGymSettingsRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=30)
    timezone: str | None = Field(None, max_length=50)
