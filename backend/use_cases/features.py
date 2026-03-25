"""Feature extraction for churn scoring.

Computes behavioral features from checkins, payments, and member data.
Results are upserted into the member_features table. Extra computed
fields (avg_duration_prev, late_payment_ratio) are returned in the
dataclass but NOT persisted — they are consumed by calculate_score.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


@dataclass
class MemberFeatures:
    member_id: str
    gym_id: str
    computed_at: date
    days_without_checkin: int
    freq_last_30d: int
    freq_prev_30d: int
    freq_trend: float
    avg_duration_min: float | None
    avg_duration_prev: float | None  # 60-30d window, not persisted
    overdue_payments: int
    months_enrolled: int
    late_payment_ratio: float  # not persisted


# --------------------------------------------------------------------------- #
# SQL: batch feature extraction for all active members of a gym
# --------------------------------------------------------------------------- #
_BATCH_FEATURES_SQL = text("""
WITH checkin_agg AS (
    SELECT
        c.member_id,
        MAX(c.ts::date)                                                           AS last_checkin_date,
        COUNT(*) FILTER (WHERE c.ts >= CURRENT_DATE - 30)                         AS freq_last_30d,
        COUNT(*) FILTER (WHERE c.ts >= CURRENT_DATE - 60
                           AND c.ts <  CURRENT_DATE - 30)                         AS freq_prev_30d,
        AVG(c.duration_min) FILTER (WHERE c.ts >= CURRENT_DATE - 30)              AS avg_duration_min,
        AVG(c.duration_min) FILTER (WHERE c.ts >= CURRENT_DATE - 60
                                      AND c.ts <  CURRENT_DATE - 30)              AS avg_duration_prev
    FROM checkins c
    INNER JOIN members m ON m.id = c.member_id
    WHERE c.gym_id = :gym_id
      AND m.status = 'active'
    GROUP BY c.member_id
),
payment_agg AS (
    SELECT
        p.member_id,
        COUNT(*) FILTER (
            WHERE p.status = 'overdue'
              AND p.due_date >= CURRENT_DATE - 90
        )                                                                         AS overdue_payments,
        CASE
            WHEN COUNT(*) = 0 THEN 0.0
            ELSE COUNT(*) FILTER (
                WHERE p.paid_at IS NOT NULL AND p.paid_at > p.due_date
            )::float / COUNT(*)
        END                                                                       AS late_payment_ratio
    FROM payments p
    INNER JOIN members m ON m.id = p.member_id
    WHERE p.gym_id = :gym_id
      AND m.status = 'active'
    GROUP BY p.member_id
)
SELECT
    am.id::text                                               AS member_id,
    COALESCE(CURRENT_DATE - ca.last_checkin_date, 9999)::int  AS days_without_checkin,
    COALESCE(ca.freq_last_30d, 0)::int                        AS freq_last_30d,
    COALESCE(ca.freq_prev_30d, 0)::int                        AS freq_prev_30d,
    ca.avg_duration_min::numeric(5,1),
    ca.avg_duration_prev::numeric(5,1),
    COALESCE(pa.overdue_payments, 0)::int                     AS overdue_payments,
    COALESCE(pa.late_payment_ratio, 0.0)::float               AS late_payment_ratio,
    (EXTRACT(YEAR  FROM age(CURRENT_DATE, am.enrolled_at)) * 12 +
     EXTRACT(MONTH FROM age(CURRENT_DATE, am.enrolled_at)))::int AS months_enrolled
FROM members am
LEFT JOIN checkin_agg  ca ON ca.member_id = am.id
LEFT JOIN payment_agg  pa ON pa.member_id = am.id
WHERE am.gym_id = :gym_id
  AND am.status = 'active'
""")

# --------------------------------------------------------------------------- #
# SQL: single-member feature extraction
# --------------------------------------------------------------------------- #
_SINGLE_FEATURES_SQL = text("""
WITH checkin_agg AS (
    SELECT
        MAX(c.ts::date)                                                           AS last_checkin_date,
        COUNT(*) FILTER (WHERE c.ts >= CURRENT_DATE - 30)                         AS freq_last_30d,
        COUNT(*) FILTER (WHERE c.ts >= CURRENT_DATE - 60
                           AND c.ts <  CURRENT_DATE - 30)                         AS freq_prev_30d,
        AVG(c.duration_min) FILTER (WHERE c.ts >= CURRENT_DATE - 30)              AS avg_duration_min,
        AVG(c.duration_min) FILTER (WHERE c.ts >= CURRENT_DATE - 60
                                      AND c.ts <  CURRENT_DATE - 30)              AS avg_duration_prev
    FROM checkins c
    WHERE c.member_id = :member_id AND c.gym_id = :gym_id
),
payment_agg AS (
    SELECT
        COUNT(*) FILTER (
            WHERE p.status = 'overdue'
              AND p.due_date >= CURRENT_DATE - 90
        )                                                                         AS overdue_payments,
        CASE
            WHEN COUNT(*) = 0 THEN 0.0
            ELSE COUNT(*) FILTER (
                WHERE p.paid_at IS NOT NULL AND p.paid_at > p.due_date
            )::float / COUNT(*)
        END                                                                       AS late_payment_ratio
    FROM payments p
    WHERE p.member_id = :member_id AND p.gym_id = :gym_id
)
SELECT
    m.id::text                                                AS member_id,
    COALESCE(CURRENT_DATE - ca.last_checkin_date, 9999)::int  AS days_without_checkin,
    COALESCE(ca.freq_last_30d, 0)::int                        AS freq_last_30d,
    COALESCE(ca.freq_prev_30d, 0)::int                        AS freq_prev_30d,
    ca.avg_duration_min::numeric(5,1),
    ca.avg_duration_prev::numeric(5,1),
    COALESCE(pa.overdue_payments, 0)::int                     AS overdue_payments,
    COALESCE(pa.late_payment_ratio, 0.0)::float               AS late_payment_ratio,
    (EXTRACT(YEAR  FROM age(CURRENT_DATE, m.enrolled_at)) * 12 +
     EXTRACT(MONTH FROM age(CURRENT_DATE, m.enrolled_at)))::int AS months_enrolled
FROM members m, checkin_agg ca, payment_agg pa
WHERE m.id = :member_id AND m.gym_id = :gym_id
""")

# --------------------------------------------------------------------------- #
# SQL: upsert into member_features
# --------------------------------------------------------------------------- #
_UPSERT_FEATURES_SQL = text("""
INSERT INTO member_features
    (member_id, gym_id, computed_at, days_without_checkin,
     freq_last_30d, freq_prev_30d, freq_trend,
     avg_duration_min, overdue_payments, months_enrolled)
VALUES
    (:member_id, :gym_id, CURRENT_DATE, :days_without_checkin,
     :freq_last_30d, :freq_prev_30d, :freq_trend,
     :avg_duration_min, :overdue_payments, :months_enrolled)
ON CONFLICT (member_id, computed_at) DO UPDATE SET
    days_without_checkin = EXCLUDED.days_without_checkin,
    freq_last_30d        = EXCLUDED.freq_last_30d,
    freq_prev_30d        = EXCLUDED.freq_prev_30d,
    freq_trend           = EXCLUDED.freq_trend,
    avg_duration_min     = EXCLUDED.avg_duration_min,
    overdue_payments     = EXCLUDED.overdue_payments,
    months_enrolled      = EXCLUDED.months_enrolled
""")


def _compute_freq_trend(freq_last_30d: int, freq_prev_30d: int) -> float:
    """Percentage change in frequency between the two 30-day windows."""
    if freq_prev_30d == 0:
        return 0.0
    return round(((freq_last_30d - freq_prev_30d) / freq_prev_30d) * 100, 2)


def _row_to_features(row, gym_id: str) -> MemberFeatures:
    """Map a DB row to a MemberFeatures dataclass."""
    freq_last = row.freq_last_30d
    freq_prev = row.freq_prev_30d
    return MemberFeatures(
        member_id=row.member_id,
        gym_id=gym_id,
        computed_at=date.today(),
        days_without_checkin=row.days_without_checkin,
        freq_last_30d=freq_last,
        freq_prev_30d=freq_prev,
        freq_trend=_compute_freq_trend(freq_last, freq_prev),
        avg_duration_min=float(row.avg_duration_min) if row.avg_duration_min is not None else None,
        avg_duration_prev=float(row.avg_duration_prev) if row.avg_duration_prev is not None else None,
        overdue_payments=row.overdue_payments,
        months_enrolled=row.months_enrolled,
        late_payment_ratio=row.late_payment_ratio,
    )


def _persist_features(db: Session, features: MemberFeatures) -> None:
    """Upsert a single MemberFeatures row into the member_features table."""
    db.execute(
        _UPSERT_FEATURES_SQL,
        {
            "member_id": features.member_id,
            "gym_id": features.gym_id,
            "days_without_checkin": features.days_without_checkin,
            "freq_last_30d": features.freq_last_30d,
            "freq_prev_30d": features.freq_prev_30d,
            "freq_trend": features.freq_trend,
            "avg_duration_min": features.avg_duration_min,
            "overdue_payments": features.overdue_payments,
            "months_enrolled": features.months_enrolled,
        },
    )


def extract_features(db: Session, gym_id: str, member_id: str) -> MemberFeatures | None:
    """Extract features for a single member and upsert into member_features.

    Returns None if the member does not exist or is not active.
    """
    row = db.execute(
        _SINGLE_FEATURES_SQL,
        {"gym_id": gym_id, "member_id": member_id},
    ).fetchone()

    if row is None:
        logger.warning("Member %s not found in gym %s", member_id, gym_id)
        return None

    features = _row_to_features(row, gym_id)
    _persist_features(db, features)
    return features


def extract_all_features(db: Session, gym_id: str) -> list[MemberFeatures]:
    """Extract features for all active members and upsert into member_features.

    Returns the list of computed features (one per active member).
    """
    rows = db.execute(_BATCH_FEATURES_SQL, {"gym_id": gym_id}).fetchall()

    results: list[MemberFeatures] = []
    for row in rows:
        features = _row_to_features(row, gym_id)
        _persist_features(db, features)
        results.append(features)

    logger.info("Extracted features for %d active members in gym %s", len(results), gym_id)
    return results
