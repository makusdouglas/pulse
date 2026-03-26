"""At-risk members endpoint — GET /at-risk."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.deps import get_current_gym_id, get_db
from api.schemas.score import AtRiskResponse, ScoreResponse, TierCounts

router = APIRouter(prefix="/at-risk", tags=["risk"])

MAX_PAGE_SIZE = 100

_TIER_COUNTS_SQL = text("""
SELECT
    COUNT(*) FILTER (WHERE cs.tier = 'critical') AS critical,
    COUNT(*) FILTER (WHERE cs.tier = 'medium')   AS medium,
    COUNT(*) FILTER (WHERE cs.tier = 'low')      AS low,
    COUNT(*) FILTER (WHERE cs.tier = 'safe')      AS safe
FROM churn_scores cs
INNER JOIN members m ON m.id = cs.member_id
WHERE cs.gym_id = :gym_id
  AND m.status = 'active'
  AND cs.computed_at = (
      SELECT MAX(cs2.computed_at) FROM churn_scores cs2
      WHERE cs2.member_id = cs.member_id
  )
""")


@router.get("", response_model=AtRiskResponse)
def list_at_risk(
    tier: str | None = Query(None, pattern="^(critical|medium|low|safe)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
    gym_id: str = Depends(get_current_gym_id),
) -> AtRiskResponse:
    """List members at risk, sorted by score descending."""
    # Tier counts (always unfiltered for the summary)
    tc_row = db.execute(_TIER_COUNTS_SQL, {"gym_id": gym_id}).fetchone()
    tier_counts = TierCounts(
        critical=tc_row.critical if tc_row else 0,
        medium=tc_row.medium if tc_row else 0,
        low=tc_row.low if tc_row else 0,
        safe=tc_row.safe if tc_row else 0,
    )

    # Build filtered query
    conditions = [
        "cs.gym_id = :gym_id",
        "m.status = 'active'",
        "cs.computed_at = (SELECT MAX(cs2.computed_at) FROM churn_scores cs2 WHERE cs2.member_id = cs.member_id)",
    ]
    params: dict = {"gym_id": gym_id}

    if tier:
        conditions.append("cs.tier = :tier")
        params["tier"] = tier

    where = " AND ".join(conditions)

    total = db.execute(
        text(
            f"SELECT COUNT(*) FROM churn_scores cs "  # noqa: S608
            f"INNER JOIN members m ON m.id = cs.member_id "
            f"WHERE {where}"
        ),
        params,
    ).scalar() or 0

    offset = (page - 1) * page_size
    params["limit"] = page_size
    params["offset"] = offset

    rows = db.execute(
        text(
            f"SELECT cs.member_id, m.name AS member_name, "  # noqa: S608
            f"cs.score, cs.tier, cs.reasons, cs.computed_at "
            f"FROM churn_scores cs "
            f"INNER JOIN members m ON m.id = cs.member_id "
            f"WHERE {where} "
            f"ORDER BY cs.score DESC "
            f"LIMIT :limit OFFSET :offset"
        ),
        params,
    ).fetchall()

    members = [
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

    return AtRiskResponse(
        members=members,
        total=total,
        page=page,
        page_size=page_size,
        tier_counts=tier_counts,
    )
