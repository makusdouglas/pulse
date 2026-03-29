"""Pydantic schemas for at-risk / scoring endpoints."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from api.schemas.pagination import PaginatedResponse


class ScoreResponse(BaseModel):
    member_id: str
    member_name: str
    score: int
    tier: str
    reasons: list[str] = Field(default_factory=list)
    computed_at: date


class TierCounts(BaseModel):
    critical: int = 0
    medium: int = 0
    low: int = 0
    safe: int = 0


class AtRiskResponse(PaginatedResponse):
    members: list[ScoreResponse]
    tier_counts: TierCounts
