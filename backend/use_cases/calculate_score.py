"""Rule-based churn scoring engine.

Applies 7 behavioral rules to member features and produces a churn
risk score (0-100), tier classification, and human-readable reasons
in PT-BR. Persists results to the churn_scores table.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session

from use_cases.features import MemberFeatures, extract_all_features, extract_features

logger = logging.getLogger(__name__)


@dataclass
class ChurnSignals:
    """Individual signal scores contributing to the total churn score."""

    dias_sem_treino: int = 0
    queda_frequencia: int = 0
    inadimplencia: int = 0
    queda_duracao: int = 0
    baixa_frequencia: int = 0
    historico_pagamento: int = 0
    aluno_novo: int = 0

    @property
    def total(self) -> int:
        return (
            self.dias_sem_treino
            + self.queda_frequencia
            + self.inadimplencia
            + self.queda_duracao
            + self.baixa_frequencia
            + self.historico_pagamento
            + self.aluno_novo
        )


@dataclass
class ChurnScore:
    """Result of scoring a single member."""

    member_id: str
    score: int
    tier: str
    reasons: list[str] = field(default_factory=list)
    signals: ChurnSignals = field(default_factory=ChurnSignals)


# --------------------------------------------------------------------------- #
# Tier thresholds
# --------------------------------------------------------------------------- #
def _classify_tier(score: int) -> str:
    if score >= 60:
        return "critical"
    if score >= 30:
        return "medium"
    if score >= 10:
        return "low"
    return "safe"


# --------------------------------------------------------------------------- #
# The 7 scoring rules
# --------------------------------------------------------------------------- #
def calculate_score(features: MemberFeatures) -> ChurnScore:
    """Apply 7 churn rules to a member's features.

    Returns a ChurnScore with score (0-100), tier, PT-BR reasons,
    and the individual signal breakdown.
    """
    signals = ChurnSignals()
    reasons: list[str] = []

    # Rule 1 — dias_sem_treino (> 14 days without checkin → +40)
    if features.days_without_checkin > 14:
        signals.dias_sem_treino = 40
        if features.days_without_checkin >= 9999:
            reasons.append("Nunca registrou um treino")
        else:
            reasons.append(f"Sem treinar ha {features.days_without_checkin} dias")

    # Rule 2 — queda_frequencia (freq dropped > 50% vs previous period → +30)
    if features.freq_prev_30d > 0 and features.freq_last_30d < features.freq_prev_30d * 0.5:
        signals.queda_frequencia = 30
        reasons.append(
            f"Frequencia caiu de {features.freq_prev_30d} para "
            f"{features.freq_last_30d} treinos/mes"
        )

    # Rule 3 — inadimplencia (overdue payments in last 90 days → +20)
    if features.overdue_payments > 0:
        signals.inadimplencia = 20
        reasons.append(f"{features.overdue_payments} pagamento(s) em atraso")

    # Rule 4 — queda_duracao (avg duration dropped > 30% vs previous period → +15)
    if (
        features.avg_duration_prev is not None
        and features.avg_duration_min is not None
        and features.avg_duration_prev > 0
        and features.avg_duration_min < features.avg_duration_prev * 0.7
    ):
        signals.queda_duracao = 15
        reasons.append(
            f"Duracao media caiu de {features.avg_duration_prev:.0f} para "
            f"{features.avg_duration_min:.0f} min"
        )

    # Rule 5 — baixa_frequencia (< 4 checkins in last 30 days → +10)
    if features.freq_last_30d < 4:
        signals.baixa_frequencia = 10
        reasons.append(f"Apenas {features.freq_last_30d} treino(s) nos ultimos 30 dias")

    # Rule 6 — historico_pagamento (> 30% of payments paid late → +10)
    if features.late_payment_ratio > 0.3:
        signals.historico_pagamento = 10
        pct = int(features.late_payment_ratio * 100)
        reasons.append(f"Historico de atrasos em {pct}% dos pagamentos")

    # Rule 7 — aluno_novo (< 3 months enrolled → +5)
    if features.months_enrolled < 3:
        signals.aluno_novo = 5
        reasons.append(f"Aluno novo ({features.months_enrolled} mes(es) de matricula)")

    score = min(signals.total, 100)
    tier = _classify_tier(score)

    return ChurnScore(
        member_id=features.member_id,
        score=score,
        tier=tier,
        reasons=reasons,
        signals=signals,
    )


# --------------------------------------------------------------------------- #
# SQL: upsert churn_scores
# --------------------------------------------------------------------------- #
_UPSERT_SCORE_SQL = text("""
INSERT INTO churn_scores
    (member_id, gym_id, computed_at, score, tier, reasons, origin)
VALUES
    (:member_id, :gym_id, CURRENT_DATE, :score, :tier, CAST(:reasons AS jsonb), 'rules')
ON CONFLICT (member_id, computed_at) DO UPDATE SET
    score   = EXCLUDED.score,
    tier    = EXCLUDED.tier,
    reasons = EXCLUDED.reasons,
    origin  = EXCLUDED.origin
""")


def _persist_score(db: Session, gym_id: str, result: ChurnScore) -> None:
    """Upsert a churn score into the churn_scores table."""
    db.execute(
        _UPSERT_SCORE_SQL,
        {
            "member_id": result.member_id,
            "gym_id": gym_id,
            "score": result.score,
            "tier": result.tier,
            "reasons": json.dumps(result.reasons, ensure_ascii=False),
        },
    )


def score_member(db: Session, gym_id: str, member_id: str) -> ChurnScore | None:
    """Extract features, calculate score, and persist for a single member.

    Returns None if the member is not found or not active.
    """
    features = extract_features(db, gym_id, member_id)
    if features is None:
        return None

    result = calculate_score(features)
    _persist_score(db, gym_id, result)

    logger.info(
        "Scored member %s: score=%d tier=%s",
        member_id, result.score, result.tier,
    )
    return result


def score_all_members(db: Session, gym_id: str) -> list[ChurnScore]:
    """Extract features and score all active members of a gym.

    Persists both member_features and churn_scores rows.
    Returns the list of ChurnScore results.
    """
    all_features = extract_all_features(db, gym_id)

    results: list[ChurnScore] = []
    for features in all_features:
        result = calculate_score(features)
        _persist_score(db, gym_id, result)
        results.append(result)

    tier_counts = {}
    for r in results:
        tier_counts[r.tier] = tier_counts.get(r.tier, 0) + 1

    logger.info(
        "Scored %d members in gym %s: %s",
        len(results), gym_id, tier_counts,
    )
    return results
