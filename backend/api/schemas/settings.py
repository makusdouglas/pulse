"""Pydantic schemas for gym settings endpoints."""

from __future__ import annotations

from zoneinfo import available_timezones

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class GymSettingsResponse(BaseModel):
    id: str
    name: str
    slug: str
    email: EmailStr | None
    phone: str | None
    timezone: str


class UpdateGymSettingsRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    timezone: str | None = Field(None, max_length=50)

    @model_validator(mode="before")
    @classmethod
    def reject_null_for_not_null_fields(cls, data: dict) -> dict:
        if isinstance(data, dict):
            for field in ("name", "timezone"):
                if field in data and data[field] is None:
                    raise ValueError(f"{field} cannot be null")
        return data

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str | None) -> str | None:
        if v is not None and v not in available_timezones():
            raise ValueError(f"Invalid timezone: {v}")
        return v
