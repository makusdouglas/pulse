"""Tests for feature extraction module — use_cases/features.py."""

from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock, call, patch

import pytest

from use_cases.features import (
    MemberFeatures,
    _compute_freq_trend,
    _row_to_features,
    extract_all_features,
    extract_features,
)

GYM_ID = "gym-aaaa-bbbb-cccc"
MEMBER_ID = "member-1111-2222-3333"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _feature_row(**overrides):
    """Build a mock DB row matching the SQL SELECT output."""
    defaults = {
        "member_id": MEMBER_ID,
        "days_without_checkin": 5,
        "freq_last_30d": 12,
        "freq_prev_30d": 10,
        "avg_duration_min": Decimal("45.0"),
        "avg_duration_prev": Decimal("50.0"),
        "overdue_payments": 0,
        "late_payment_ratio": 0.0,
        "months_enrolled": 8,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


# ===================================================================
# _compute_freq_trend
# ===================================================================
class TestComputeFreqTrend:
    def test_positive_trend(self):
        assert _compute_freq_trend(15, 10) == 50.0

    def test_negative_trend(self):
        assert _compute_freq_trend(5, 10) == -50.0

    def test_zero_baseline_returns_zero(self):
        assert _compute_freq_trend(10, 0) == 0.0

    def test_no_change(self):
        assert _compute_freq_trend(10, 10) == 0.0

    def test_complete_drop(self):
        assert _compute_freq_trend(0, 10) == -100.0

    def test_double_frequency(self):
        assert _compute_freq_trend(20, 10) == 100.0

    def test_rounding(self):
        result = _compute_freq_trend(7, 3)
        assert result == 133.33

    def test_both_zero(self):
        assert _compute_freq_trend(0, 0) == 0.0


# ===================================================================
# _row_to_features
# ===================================================================
class TestRowToFeatures:
    def test_maps_all_fields(self):
        row = _feature_row()
        features = _row_to_features(row, GYM_ID)

        assert features.member_id == MEMBER_ID
        assert features.gym_id == GYM_ID
        assert features.computed_at == date.today()
        assert features.days_without_checkin == 5
        assert features.freq_last_30d == 12
        assert features.freq_prev_30d == 10
        assert features.overdue_payments == 0
        assert features.months_enrolled == 8

    def test_computes_freq_trend(self):
        row = _feature_row(freq_last_30d=5, freq_prev_30d=10)
        features = _row_to_features(row, GYM_ID)
        assert features.freq_trend == -50.0

    def test_avg_duration_converted_to_float(self):
        row = _feature_row(avg_duration_min=Decimal("45.5"))
        features = _row_to_features(row, GYM_ID)
        assert isinstance(features.avg_duration_min, float)
        assert features.avg_duration_min == 45.5

    def test_avg_duration_none_stays_none(self):
        row = _feature_row(avg_duration_min=None)
        features = _row_to_features(row, GYM_ID)
        assert features.avg_duration_min is None

    def test_avg_duration_prev_none_stays_none(self):
        row = _feature_row(avg_duration_prev=None)
        features = _row_to_features(row, GYM_ID)
        assert features.avg_duration_prev is None

    def test_avg_duration_prev_converted_to_float(self):
        row = _feature_row(avg_duration_prev=Decimal("60.0"))
        features = _row_to_features(row, GYM_ID)
        assert isinstance(features.avg_duration_prev, float)
        assert features.avg_duration_prev == 60.0

    def test_late_payment_ratio_passed_through(self):
        row = _feature_row(late_payment_ratio=0.35)
        features = _row_to_features(row, GYM_ID)
        assert features.late_payment_ratio == 0.35

    def test_freq_trend_zero_when_prev_zero(self):
        row = _feature_row(freq_last_30d=10, freq_prev_30d=0)
        features = _row_to_features(row, GYM_ID)
        assert features.freq_trend == 0.0


# ===================================================================
# extract_features (single member)
# ===================================================================
class TestExtractFeatures:
    def test_returns_features_for_existing_member(self):
        db = MagicMock()
        db.execute.return_value.fetchone.return_value = _feature_row()

        result = extract_features(db, GYM_ID, MEMBER_ID)

        assert result is not None
        assert result.member_id == MEMBER_ID
        assert result.gym_id == GYM_ID

    def test_returns_none_when_member_not_found(self):
        db = MagicMock()
        db.execute.return_value.fetchone.return_value = None

        result = extract_features(db, GYM_ID, "nonexistent")

        assert result is None

    def test_persists_features_to_db(self):
        db = MagicMock()
        db.execute.return_value.fetchone.return_value = _feature_row()

        extract_features(db, GYM_ID, MEMBER_ID)

        # 2 execute calls: SELECT + UPSERT
        assert db.execute.call_count == 2

    def test_passes_correct_params_to_query(self):
        db = MagicMock()
        db.execute.return_value.fetchone.return_value = _feature_row()

        extract_features(db, GYM_ID, MEMBER_ID)

        first_call = db.execute.call_args_list[0]
        params = first_call[0][1]
        assert params["gym_id"] == GYM_ID
        assert params["member_id"] == MEMBER_ID

    def test_upsert_contains_computed_fields(self):
        db = MagicMock()
        row = _feature_row(freq_last_30d=5, freq_prev_30d=10)
        db.execute.return_value.fetchone.return_value = row

        extract_features(db, GYM_ID, MEMBER_ID)

        upsert_call = db.execute.call_args_list[1]
        upsert_params = upsert_call[0][1]
        assert upsert_params["freq_trend"] == -50.0
        assert upsert_params["member_id"] == MEMBER_ID
        assert upsert_params["gym_id"] == GYM_ID

    def test_does_not_persist_when_member_not_found(self):
        db = MagicMock()
        db.execute.return_value.fetchone.return_value = None

        extract_features(db, GYM_ID, "nonexistent")

        # Only 1 execute call (SELECT), no UPSERT
        assert db.execute.call_count == 1


# ===================================================================
# extract_all_features (batch)
# ===================================================================
class TestExtractAllFeatures:
    def test_returns_features_for_all_members(self):
        db = MagicMock()
        rows = [
            _feature_row(member_id="m1"),
            _feature_row(member_id="m2"),
            _feature_row(member_id="m3"),
        ]
        db.execute.return_value.fetchall.return_value = rows

        results = extract_all_features(db, GYM_ID)

        assert len(results) == 3
        assert results[0].member_id == "m1"
        assert results[1].member_id == "m2"
        assert results[2].member_id == "m3"

    def test_returns_empty_list_when_no_members(self):
        db = MagicMock()
        db.execute.return_value.fetchall.return_value = []

        results = extract_all_features(db, GYM_ID)

        assert results == []

    def test_persists_each_member(self):
        db = MagicMock()
        rows = [_feature_row(member_id="m1"), _feature_row(member_id="m2")]
        db.execute.return_value.fetchall.return_value = rows

        extract_all_features(db, GYM_ID)

        # 1 batch SELECT + 2 UPSERTs
        assert db.execute.call_count == 3

    def test_passes_gym_id_to_query(self):
        db = MagicMock()
        db.execute.return_value.fetchall.return_value = []

        extract_all_features(db, GYM_ID)

        first_call = db.execute.call_args_list[0]
        params = first_call[0][1]
        assert params["gym_id"] == GYM_ID

    def test_all_features_have_correct_gym_id(self):
        db = MagicMock()
        rows = [_feature_row(member_id="m1")]
        db.execute.return_value.fetchall.return_value = rows

        results = extract_all_features(db, GYM_ID)

        assert all(f.gym_id == GYM_ID for f in results)

    def test_all_features_have_today_as_computed_at(self):
        db = MagicMock()
        rows = [_feature_row(member_id="m1")]
        db.execute.return_value.fetchall.return_value = rows

        results = extract_all_features(db, GYM_ID)

        assert all(f.computed_at == date.today() for f in results)


# ===================================================================
# MemberFeatures dataclass
# ===================================================================
class TestMemberFeaturesDataclass:
    def test_all_fields_accessible(self):
        features = MemberFeatures(
            member_id="m1",
            gym_id="g1",
            computed_at=date.today(),
            days_without_checkin=5,
            freq_last_30d=10,
            freq_prev_30d=8,
            freq_trend=25.0,
            avg_duration_min=45.0,
            avg_duration_prev=50.0,
            overdue_payments=1,
            months_enrolled=6,
            late_payment_ratio=0.1,
        )
        assert features.member_id == "m1"
        assert features.days_without_checkin == 5
        assert features.late_payment_ratio == 0.1

    def test_nullable_fields(self):
        features = MemberFeatures(
            member_id="m1",
            gym_id="g1",
            computed_at=date.today(),
            days_without_checkin=0,
            freq_last_30d=0,
            freq_prev_30d=0,
            freq_trend=0.0,
            avg_duration_min=None,
            avg_duration_prev=None,
            overdue_payments=0,
            months_enrolled=0,
            late_payment_ratio=0.0,
        )
        assert features.avg_duration_min is None
        assert features.avg_duration_prev is None


# ===================================================================
# Retroactive validation stub
# ===================================================================
class TestRetroactiveValidation:
    """Placeholder tests for retroactive validation (>65% cancellation catch rate).

    These require production data with actual cancellations and cannot run
    as unit tests. They are structured as integration test stubs that will
    be activated when real gym data is available.
    """

    @pytest.mark.skip(reason="Requires production data — run manually after deployment")
    def test_scoring_catches_65_percent_of_cancellations(self):
        """Score all members who later cancelled and verify >=65% had score >= 30.

        Logic:
        1. For each cancelled member, extract features as of 30 days before cancellation
        2. Run calculate_score on those features
        3. Count how many had tier 'critical' or 'medium' (score >= 30)
        4. Assert catch rate >= 0.65
        """
        pass

    @pytest.mark.skip(reason="Requires production data — run manually after deployment")
    def test_scoring_does_not_flag_more_than_50_percent_active(self):
        """Score all active members and verify <50% are flagged as at-risk.

        If more than half are flagged, the system is too noisy to be useful.
        """
        pass
