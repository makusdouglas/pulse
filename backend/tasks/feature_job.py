"""Daily feature extraction job — runs at 2:30 AM for all gyms."""

from __future__ import annotations

import logging

from sqlalchemy import text

from infra.database import SessionLocal
from infra.tenant import clear_tenant, set_tenant
from tasks.celery_app import celery_app
from use_cases.features import extract_all_features

logger = logging.getLogger(__name__)

_ALL_GYMS_SQL = text("SELECT id::text FROM gyms")


@celery_app.task(name="tasks.feature_job.extract_features_all_gyms", max_retries=3)
def extract_features_all_gyms() -> dict:
    """Extract behavioral features for all active members across all gyms."""
    db = SessionLocal()
    try:
        gym_ids = [row.id for row in db.execute(_ALL_GYMS_SQL).fetchall()]
    finally:
        db.close()

    total_members = 0
    results: dict[str, int] = {}

    for gym_id in gym_ids:
        db = SessionLocal()
        tenant_token = None
        try:
            tenant_token = set_tenant(gym_id)
            db.execute(
                text("SET LOCAL app.current_gym_id = :gym_id"),
                {"gym_id": gym_id},
            )
            features = extract_all_features(db, gym_id)
            db.commit()
            count = len(features)
            results[gym_id] = count
            total_members += count
            logger.info("Feature extraction complete for gym %s: %d members", gym_id, count)
        except Exception:
            db.rollback()
            logger.exception("Feature extraction failed for gym %s", gym_id)
        finally:
            if tenant_token is not None:
                clear_tenant(tenant_token)
            db.close()

    logger.info(
        "Feature extraction complete: %d gyms, %d members total",
        len(gym_ids), total_members,
    )
    return {"gyms_processed": len(gym_ids), "total_members": total_members, "per_gym": results}
