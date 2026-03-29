"""Celery application configuration with Redis broker and beat schedule."""

from celery import Celery
from celery.schedules import crontab

from infra.config import get_settings

settings = get_settings()

celery_app = Celery(
    "pulse",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["tasks.feature_job", "tasks.scoring_job"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
)

celery_app.conf.beat_schedule = {
    "daily-feature-extraction": {
        "task": "tasks.feature_job.extract_features_all_gyms",
        "schedule": crontab(hour=2, minute=30),
    },
    "daily-scoring": {
        "task": "tasks.scoring_job.score_all_gyms",
        "schedule": crontab(hour=3, minute=0),
    },
}
