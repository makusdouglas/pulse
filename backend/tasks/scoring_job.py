"""Daily scoring job — runs at 3:00 AM for all gyms (after feature extraction)."""

from __future__ import annotations

import logging

from sqlalchemy import text

from infra.database import SessionLocal
from tasks.celery_app import celery_app
from use_cases.calculate_score import score_all_members

logger = logging.getLogger(__name__)

_ALL_GYMS_SQL = text("SELECT id::text FROM gyms")


@celery_app.task(name="tasks.scoring_job.score_all_gyms", max_retries=3)
def score_all_gyms() -> dict:
    """Score all active members across all gyms."""
    db = SessionLocal()
    try:
        gym_ids = [row.id for row in db.execute(_ALL_GYMS_SQL).fetchall()]
    finally:
        db.close()

    total_scored = 0
    all_tier_counts: dict[str, int] = {"critical": 0, "medium": 0, "low": 0, "safe": 0}
    results: dict[str, int] = {}

    for gym_id in gym_ids:
        db = SessionLocal()
        try:
            db.execute(
                text("SET LOCAL app.current_gym_id = :gym_id"),
                {"gym_id": gym_id},
            )
            scores = score_all_members(db, gym_id)
            db.commit()
            count = len(scores)
            results[gym_id] = count
            total_scored += count

            for s in scores:
                all_tier_counts[s.tier] = all_tier_counts.get(s.tier, 0) + 1

            logger.info("Scoring complete for gym %s: %d members", gym_id, count)
        except Exception:
            db.rollback()
            logger.exception("Scoring failed for gym %s", gym_id)
        finally:
            db.close()

    logger.info(
        "Scoring complete: %d gyms, %d members total, tiers=%s",
        len(gym_ids), total_scored, all_tier_counts,
    )
    return {
        "gyms_processed": len(gym_ids),
        "total_scored": total_scored,
        "tier_counts": all_tier_counts,
        "per_gym": results,
    }
