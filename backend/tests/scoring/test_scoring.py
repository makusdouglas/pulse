"""Tests for the scoring engine — rules, signals, tiers, and orchestration."""

from datetime import date
from unittest.mock import MagicMock, patch

import pytest

from use_cases.calculate_score import (
    ChurnScore,
    ChurnSignals,
    _classify_tier,
    calculate_score,
    score_all_members,
    score_member,
)
from use_cases.features import MemberFeatures, _compute_freq_trend


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _make_features(**overrides) -> MemberFeatures:
    """Build a safe (zero-risk) MemberFeatures with optional overrides."""
    defaults = {
        "member_id": "aaaaaaaa-1111-2222-3333-444444444444",
        "gym_id": "bbbbbbbb-1111-2222-3333-444444444444",
        "computed_at": date(2026, 3, 25),
        "days_without_checkin": 2,
        "freq_last_30d": 12,
        "freq_prev_30d": 10,
        "freq_trend": 20.0,
        "avg_duration_min": 60.0,
        "avg_duration_prev": 55.0,
        "overdue_payments": 0,
        "months_enrolled": 12,
        "late_payment_ratio": 0.0,
    }
    defaults.update(overrides)
    return MemberFeatures(**defaults)


# ===================================================================
# _compute_freq_trend
# ===================================================================
class TestComputeFreqTrend:
    def test_positive_trend(self):
        assert _compute_freq_trend(12, 8) == 50.0

    def test_negative_trend(self):
        assert _compute_freq_trend(4, 10) == -60.0

    def test_zero_baseline_returns_zero(self):
        assert _compute_freq_trend(5, 0) == 0.0

    def test_no_change(self):
        assert _compute_freq_trend(10, 10) == 0.0

    def test_complete_drop(self):
        assert _compute_freq_trend(0, 8) == -100.0


# ===================================================================
# ChurnSignals.total
# ===================================================================
class TestChurnSignalsTotal:
    def test_all_zeros(self):
        assert ChurnSignals().total == 0

    def test_sum_all_signals(self):
        s = ChurnSignals(
            dias_sem_treino=40,
            queda_frequencia=30,
            inadimplencia=20,
            queda_duracao=15,
            baixa_frequencia=10,
            historico_pagamento=10,
            aluno_novo=5,
        )
        assert s.total == 130

    def test_partial_signals(self):
        s = ChurnSignals(dias_sem_treino=40, inadimplencia=20)
        assert s.total == 60


# ===================================================================
# _classify_tier
# ===================================================================
class TestClassifyTier:
    @pytest.mark.parametrize(
        "score,expected",
        [
            (0, "safe"),
            (5, "safe"),
            (9, "safe"),
            (10, "low"),
            (20, "low"),
            (29, "low"),
            (30, "medium"),
            (45, "medium"),
            (59, "medium"),
            (60, "critical"),
            (80, "critical"),
            (100, "critical"),
        ],
    )
    def test_tier_boundaries(self, score, expected):
        assert _classify_tier(score) == expected


# ===================================================================
# Rule 1: dias_sem_treino (> 14 days → +40)
# ===================================================================
class TestRuleDiasSemTreino:
    def test_no_points_within_14_days(self):
        result = calculate_score(_make_features(days_without_checkin=14))
        assert result.signals.dias_sem_treino == 0

    def test_adds_40_above_14_days(self):
        result = calculate_score(_make_features(days_without_checkin=15))
        assert result.signals.dias_sem_treino == 40

    def test_adds_40_at_30_days(self):
        result = calculate_score(_make_features(days_without_checkin=30))
        assert result.signals.dias_sem_treino == 40

    def test_never_trained_uses_9999(self):
        result = calculate_score(_make_features(days_without_checkin=9999))
        assert result.signals.dias_sem_treino == 40
        assert any("Nunca registrou" in r for r in result.reasons)

    def test_reason_shows_days(self):
        result = calculate_score(_make_features(days_without_checkin=20))
        assert any("20 dias" in r for r in result.reasons)


# ===================================================================
# Rule 2: queda_frequencia (freq dropped > 50% → +30)
# ===================================================================
class TestRuleQuedaFrequencia:
    def test_no_points_stable_frequency(self):
        result = calculate_score(_make_features(freq_last_30d=10, freq_prev_30d=10))
        assert result.signals.queda_frequencia == 0

    def test_no_points_at_exactly_50_percent(self):
        result = calculate_score(_make_features(freq_last_30d=5, freq_prev_30d=10))
        assert result.signals.queda_frequencia == 0

    def test_adds_30_below_50_percent(self):
        result = calculate_score(_make_features(freq_last_30d=4, freq_prev_30d=10))
        assert result.signals.queda_frequencia == 30

    def test_no_points_when_prev_is_zero(self):
        result = calculate_score(_make_features(freq_last_30d=0, freq_prev_30d=0))
        assert result.signals.queda_frequencia == 0

    def test_reason_shows_frequency_change(self):
        result = calculate_score(_make_features(freq_last_30d=2, freq_prev_30d=10))
        assert any("10" in r and "2" in r for r in result.reasons)


# ===================================================================
# Rule 3: inadimplencia (overdue > 0 → +20)
# ===================================================================
class TestRuleInadimplencia:
    def test_no_points_zero_overdue(self):
        result = calculate_score(_make_features(overdue_payments=0))
        assert result.signals.inadimplencia == 0

    def test_adds_20_one_overdue(self):
        result = calculate_score(_make_features(overdue_payments=1))
        assert result.signals.inadimplencia == 20

    def test_adds_20_multiple_overdue(self):
        result = calculate_score(_make_features(overdue_payments=3))
        assert result.signals.inadimplencia == 20

    def test_reason_shows_count(self):
        result = calculate_score(_make_features(overdue_payments=2))
        assert any("2 pagamento" in r for r in result.reasons)


# ===================================================================
# Rule 4: queda_duracao (duration dropped > 30% → +15)
# ===================================================================
class TestRuleQuedaDuracao:
    def test_no_points_stable_duration(self):
        result = calculate_score(
            _make_features(avg_duration_min=50.0, avg_duration_prev=50.0)
        )
        assert result.signals.queda_duracao == 0

    def test_no_points_at_exactly_70_percent(self):
        result = calculate_score(
            _make_features(avg_duration_min=70.0, avg_duration_prev=100.0)
        )
        assert result.signals.queda_duracao == 0

    def test_adds_15_below_70_percent(self):
        result = calculate_score(
            _make_features(avg_duration_min=69.0, avg_duration_prev=100.0)
        )
        assert result.signals.queda_duracao == 15

    def test_no_points_when_prev_is_none(self):
        result = calculate_score(
            _make_features(avg_duration_min=30.0, avg_duration_prev=None)
        )
        assert result.signals.queda_duracao == 0

    def test_no_points_when_current_is_none(self):
        result = calculate_score(
            _make_features(avg_duration_min=None, avg_duration_prev=60.0)
        )
        assert result.signals.queda_duracao == 0

    def test_no_points_when_prev_is_zero(self):
        result = calculate_score(
            _make_features(avg_duration_min=10.0, avg_duration_prev=0.0)
        )
        assert result.signals.queda_duracao == 0

    def test_reason_shows_durations(self):
        result = calculate_score(
            _make_features(avg_duration_min=20.0, avg_duration_prev=60.0)
        )
        assert any("60" in r and "20" in r for r in result.reasons)


# ===================================================================
# Rule 5: baixa_frequencia (< 4 checkins → +10)
# ===================================================================
class TestRuleBaixaFrequencia:
    def test_no_points_at_4(self):
        result = calculate_score(_make_features(freq_last_30d=4))
        assert result.signals.baixa_frequencia == 0

    def test_adds_10_at_3(self):
        result = calculate_score(_make_features(freq_last_30d=3))
        assert result.signals.baixa_frequencia == 10

    def test_adds_10_at_zero(self):
        result = calculate_score(_make_features(freq_last_30d=0))
        assert result.signals.baixa_frequencia == 10

    def test_reason_shows_count(self):
        result = calculate_score(_make_features(freq_last_30d=2))
        assert any("2 treino" in r for r in result.reasons)


# ===================================================================
# Rule 6: historico_pagamento (late ratio > 30% → +10)
# ===================================================================
class TestRuleHistoricoPagamento:
    def test_no_points_at_30_percent(self):
        result = calculate_score(_make_features(late_payment_ratio=0.3))
        assert result.signals.historico_pagamento == 0

    def test_adds_10_above_30_percent(self):
        result = calculate_score(_make_features(late_payment_ratio=0.31))
        assert result.signals.historico_pagamento == 10

    def test_no_points_at_zero(self):
        result = calculate_score(_make_features(late_payment_ratio=0.0))
        assert result.signals.historico_pagamento == 0

    def test_reason_shows_percentage(self):
        result = calculate_score(_make_features(late_payment_ratio=0.5))
        assert any("50%" in r for r in result.reasons)


# ===================================================================
# Rule 7: aluno_novo (< 3 months → +5)
# ===================================================================
class TestRuleAlunoNovo:
    def test_no_points_at_3_months(self):
        result = calculate_score(_make_features(months_enrolled=3))
        assert result.signals.aluno_novo == 0

    def test_adds_5_at_2_months(self):
        result = calculate_score(_make_features(months_enrolled=2))
        assert result.signals.aluno_novo == 5

    def test_adds_5_at_zero_months(self):
        result = calculate_score(_make_features(months_enrolled=0))
        assert result.signals.aluno_novo == 5

    def test_reason_shows_months(self):
        result = calculate_score(_make_features(months_enrolled=1))
        assert any("1 mes" in r for r in result.reasons)


# ===================================================================
# Score cap and tier assignment
# ===================================================================
class TestScoreCapAndTier:
    def test_score_capped_at_100(self):
        """All 7 rules active = 40+30+20+15+10+10+5 = 130, capped at 100."""
        features = _make_features(
            days_without_checkin=20,      # +40
            freq_last_30d=1,              # +10 (baixa) + +30 (queda, if prev > 2)
            freq_prev_30d=10,             # triggers queda_frequencia
            avg_duration_min=20.0,        # +15 (queda_duracao)
            avg_duration_prev=60.0,
            overdue_payments=2,           # +20
            late_payment_ratio=0.5,       # +10
            months_enrolled=1,            # +5
        )
        result = calculate_score(features)
        assert result.signals.total == 130
        assert result.score == 100
        assert result.tier == "critical"

    def test_safe_member_score_zero(self):
        features = _make_features()  # all defaults are safe
        result = calculate_score(features)
        assert result.score == 0
        assert result.tier == "safe"
        assert result.reasons == []

    def test_tier_boundary_at_10(self):
        # baixa_frequencia alone = +10 → low
        # Set freq_prev_30d=0 to avoid triggering queda_frequencia rule
        features = _make_features(freq_last_30d=3, freq_prev_30d=0)
        result = calculate_score(features)
        assert result.score == 10
        assert result.tier == "low"

    def test_tier_boundary_at_30(self):
        # queda_frequencia (+30) alone → medium
        features = _make_features(freq_last_30d=4, freq_prev_30d=10)
        result = calculate_score(features)
        assert result.signals.queda_frequencia == 30
        assert result.score == 30
        assert result.tier == "medium"

    def test_tier_boundary_at_60(self):
        # dias_sem_treino (+40) + inadimplencia (+20) = 60 → critical
        features = _make_features(days_without_checkin=20, overdue_payments=1)
        result = calculate_score(features)
        assert result.score == 60
        assert result.tier == "critical"


# ===================================================================
# PT-BR reasons
# ===================================================================
class TestReasons:
    def test_no_reasons_for_safe_member(self):
        result = calculate_score(_make_features())
        assert result.reasons == []

    def test_one_reason_per_active_rule(self):
        features = _make_features(
            days_without_checkin=20,
            overdue_payments=1,
        )
        result = calculate_score(features)
        assert len(result.reasons) == 2

    def test_all_7_reasons_when_all_rules_active(self):
        features = _make_features(
            days_without_checkin=20,
            freq_last_30d=1,
            freq_prev_30d=10,
            avg_duration_min=20.0,
            avg_duration_prev=60.0,
            overdue_payments=2,
            late_payment_ratio=0.5,
            months_enrolled=1,
        )
        result = calculate_score(features)
        assert len(result.reasons) == 7


# ===================================================================
# Combined scenarios
# ===================================================================
class TestCombinedScenarios:
    def test_medium_risk_member(self):
        """Member with inactivity + low frequency → medium tier."""
        features = _make_features(
            days_without_checkin=20,  # +40
            freq_last_30d=3,         # +10 (baixa)
            freq_prev_30d=0,         # no baseline → no queda_frequencia
        )
        result = calculate_score(features)
        assert result.score == 50
        assert result.tier == "medium"

    def test_low_risk_new_member(self):
        """New member with low frequency → low tier."""
        features = _make_features(
            freq_last_30d=3,    # +10
            freq_prev_30d=0,    # no baseline → no queda_frequencia
            months_enrolled=1,  # +5
        )
        result = calculate_score(features)
        assert result.score == 15
        assert result.tier == "low"


# ===================================================================
# score_member (with mocks)
# ===================================================================
class TestScoreMember:
    @patch("use_cases.calculate_score._persist_score")
    @patch("use_cases.calculate_score.extract_features")
    def test_returns_score_for_existing_member(self, mock_extract, mock_persist):
        features = _make_features(days_without_checkin=20)
        mock_extract.return_value = features

        db = MagicMock()
        result = score_member(db, features.gym_id, features.member_id)

        assert result is not None
        assert result.score == 40
        assert result.tier == "medium"
        mock_extract.assert_called_once_with(db, features.gym_id, features.member_id)
        mock_persist.assert_called_once()

    @patch("use_cases.calculate_score._persist_score")
    @patch("use_cases.calculate_score.extract_features")
    def test_returns_none_when_member_not_found(self, mock_extract, mock_persist):
        mock_extract.return_value = None

        db = MagicMock()
        result = score_member(db, "gym-1", "unknown-member")

        assert result is None
        mock_persist.assert_not_called()


# ===================================================================
# score_all_members (with mocks)
# ===================================================================
class TestScoreAllMembers:
    @patch("use_cases.calculate_score._persist_score")
    @patch("use_cases.calculate_score.extract_all_features")
    def test_scores_all_active_members(self, mock_extract_all, mock_persist):
        features_list = [
            _make_features(member_id="m1", days_without_checkin=2),   # safe
            _make_features(member_id="m2", days_without_checkin=20),  # medium (+40)
            _make_features(member_id="m3", overdue_payments=1, days_without_checkin=20),  # critical
        ]
        mock_extract_all.return_value = features_list

        db = MagicMock()
        results = score_all_members(db, "gym-1")

        assert len(results) == 3
        assert results[0].tier == "safe"
        assert results[1].tier == "medium"
        assert results[2].tier == "critical"
        assert mock_persist.call_count == 3

    @patch("use_cases.calculate_score._persist_score")
    @patch("use_cases.calculate_score.extract_all_features")
    def test_returns_empty_list_when_no_members(self, mock_extract_all, mock_persist):
        mock_extract_all.return_value = []

        db = MagicMock()
        results = score_all_members(db, "gym-1")

        assert results == []
        mock_persist.assert_not_called()
