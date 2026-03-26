"""Dashboard endpoint — GET /dashboard/stats."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.deps import get_current_gym_id, get_db
from api.schemas.dashboard import DashboardStats
from api.schemas.score import ScoreResponse, TierCounts

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_MEMBER_COUNTS_SQL = text("""
SELECT
    COUNT(*)                                     AS total_members,
    COUNT(*) FILTER (WHERE status = 'active')    AS active_members
FROM members
WHERE gym_id = :gym_id
""")

_SCORE_STATS_SQL = text("""
SELECT
    COUNT(*) FILTER (WHERE cs.score >= 10)       AS at_risk_count,
    COUNT(*) FILTER (WHERE cs.tier = 'critical') AS critical,
    COUNT(*) FILTER (WHERE cs.tier = 'medium')   AS medium,
    COUNT(*) FILTER (WHERE cs.tier = 'low')      AS low,
    COUNT(*) FILTER (WHERE cs.tier = 'safe')     AS safe,
    COALESCE(AVG(cs.score), 0)::float            AS avg_score
FROM churn_scores cs
INNER JOIN members m ON m.id = cs.member_id
WHERE cs.gym_id = :gym_id
  AND m.status = 'active'
  AND cs.computed_at = (
      SELECT MAX(cs2.computed_at) FROM churn_scores cs2
      WHERE cs2.member_id = cs.member_id
  )
""")

_RECENT_SCORES_SQL = text("""
SELECT cs.member_id, m.name AS member_name,
       cs.score, cs.tier, cs.reasons, cs.computed_at
FROM churn_scores cs
INNER JOIN members m ON m.id = cs.member_id
WHERE cs.gym_id = :gym_id
  AND m.status = 'active'
  AND cs.computed_at = (
      SELECT MAX(cs2.computed_at) FROM churn_scores cs2
      WHERE cs2.member_id = cs.member_id
  )
ORDER BY cs.score DESC
LIMIT 10
""")


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    gym_id: str = Depends(get_current_gym_id),
) -> DashboardStats:
    """Return dashboard summary statistics for the gym."""
    mc = db.execute(_MEMBER_COUNTS_SQL, {"gym_id": gym_id}).fetchone()
    total_members = mc.total_members if mc else 0
    active_members = mc.active_members if mc else 0

    ss = db.execute(_SCORE_STATS_SQL, {"gym_id": gym_id}).fetchone()
    at_risk_count = ss.at_risk_count if ss else 0
    avg_score = round(ss.avg_score, 1) if ss else 0.0
    tier_counts = TierCounts(
        critical=ss.critical if ss else 0,
        medium=ss.medium if ss else 0,
        low=ss.low if ss else 0,
        safe=ss.safe if ss else 0,
    )

    rows = db.execute(_RECENT_SCORES_SQL, {"gym_id": gym_id}).fetchall()
    recent_scores = [
        ScoreResponse(
            member_id=str(r.member_id),
            member_name=r.member_name,
            score=r.score,
            tier=r.tier,
            reasons=r.reasons if isinstance(r.reasons, list) else [],
            computed_at=r.computed_at,
        )
        for r in rows
    ]

    return DashboardStats(
        total_members=total_members,
        active_members=active_members,
        at_risk_count=at_risk_count,
        tier_counts=tier_counts,
        avg_score=avg_score,
        recent_scores=recent_scores,
    )
