"""Pydantic schemas for dashboard endpoint."""

from __future__ import annotations

from pydantic import BaseModel, Field

from api.schemas.score import ScoreResponse, TierCounts


class DashboardStats(BaseModel):
    total_members: int = 0
    active_members: int = 0
    at_risk_count: int = 0
    tier_counts: TierCounts = Field(default_factory=TierCounts)
    avg_score: float = 0.0
    recent_scores: list[ScoreResponse] = Field(default_factory=list)
