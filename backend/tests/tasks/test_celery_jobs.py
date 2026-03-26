"""Tests for Celery jobs — feature extraction and scoring."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _gym_rows(*gym_ids):
    """Build mock gym rows for _ALL_GYMS_SQL query."""
    return [SimpleNamespace(id=gid) for gid in gym_ids]


def _mock_session():
    """Create a mock DB session."""
    session = MagicMock()
    session.execute = MagicMock()
    session.commit = MagicMock()
    session.rollback = MagicMock()
    session.close = MagicMock()
    return session


# ===================================================================
# celery_app configuration
# ===================================================================
class TestCeleryAppConfig:
    def test_beat_schedule_has_feature_extraction(self):
        from tasks.celery_app import celery_app

        schedule = celery_app.conf.beat_schedule
        assert "daily-feature-extraction" in schedule
        task_name = schedule["daily-feature-extraction"]["task"]
        assert task_name == "tasks.feature_job.extract_features_all_gyms"

    def test_beat_schedule_has_scoring(self):
        from tasks.celery_app import celery_app

        schedule = celery_app.conf.beat_schedule
        assert "daily-scoring" in schedule
        task_name = schedule["daily-scoring"]["task"]
        assert task_name == "tasks.scoring_job.score_all_gyms"

    def test_feature_extraction_runs_at_2_30(self):
        from tasks.celery_app import celery_app

        crontab = celery_app.conf.beat_schedule["daily-feature-extraction"]["schedule"]
        assert crontab.hour == {2}
        assert crontab.minute == {30}

    def test_scoring_runs_at_3_00(self):
        from tasks.celery_app import celery_app

        crontab = celery_app.conf.beat_schedule["daily-scoring"]["schedule"]
        assert crontab.hour == {3}
        assert crontab.minute == {0}

    def test_scoring_runs_after_feature_extraction(self):
        """Scoring at 3:00 must run after feature extraction at 2:30."""
        from tasks.celery_app import celery_app

        schedule = celery_app.conf.beat_schedule
        feat_cron = schedule["daily-feature-extraction"]["schedule"]
        score_cron = schedule["daily-scoring"]["schedule"]

        feat_time = next(iter(feat_cron.hour)) * 60 + next(iter(feat_cron.minute))
        score_time = next(iter(score_cron.hour)) * 60 + next(iter(score_cron.minute))
        assert score_time > feat_time


# ===================================================================
# feature_job — extract_features_all_gyms
# ===================================================================
class TestFeatureJob:
    @patch("tasks.feature_job.extract_all_features")
    @patch("tasks.feature_job.SessionLocal")
    def test_processes_all_gyms(self, mock_session_cls, mock_extract):
        """Job should iterate over all gyms and call extract_all_features for each."""
        gym_rows = _gym_rows("gym-1", "gym-2")

        listing_session = _mock_session()
        listing_result = MagicMock()
        listing_result.fetchall.return_value = gym_rows
        listing_session.execute.return_value = listing_result

        gym1_session = _mock_session()
        gym2_session = _mock_session()

        mock_session_cls.side_effect = [listing_session, gym1_session, gym2_session]
        mock_extract.side_effect = [
            [MagicMock(), MagicMock()],  # gym-1: 2 members
            [MagicMock()],               # gym-2: 1 member
        ]

        from tasks.feature_job import extract_features_all_gyms

        result = extract_features_all_gyms()

        assert result["gyms_processed"] == 2
        assert result["total_members"] == 3
        assert result["per_gym"]["gym-1"] == 2
        assert result["per_gym"]["gym-2"] == 1
        assert mock_extract.call_count == 2

    @patch("tasks.feature_job.extract_all_features")
    @patch("tasks.feature_job.SessionLocal")
    def test_sets_rls_context_per_gym(self, mock_session_cls, mock_extract):
        """Each gym session must SET LOCAL app.current_gym_id for RLS."""
        listing_session = _mock_session()
        listing_result = MagicMock()
        listing_result.fetchall.return_value = _gym_rows("gym-1")
        listing_session.execute.return_value = listing_result

        gym_session = _mock_session()
        mock_session_cls.side_effect = [listing_session, gym_session]
        mock_extract.return_value = []

        from tasks.feature_job import extract_features_all_gyms

        extract_features_all_gyms()

        set_local_call = gym_session.execute.call_args_list[0]
        sql_text = str(set_local_call[0][0])
        assert "SET LOCAL app.current_gym_id" in sql_text

    @patch("tasks.feature_job.extract_all_features")
    @patch("tasks.feature_job.SessionLocal")
    def test_commits_after_each_gym(self, mock_session_cls, mock_extract):
        listing_session = _mock_session()
        listing_result = MagicMock()
        listing_result.fetchall.return_value = _gym_rows("gym-1")
        listing_session.execute.return_value = listing_result

        gym_session = _mock_session()
        mock_session_cls.side_effect = [listing_session, gym_session]
        mock_extract.return_value = []

        from tasks.feature_job import extract_features_all_gyms

        extract_features_all_gyms()

        gym_session.commit.assert_called_once()

    @patch("tasks.feature_job.extract_all_features")
    @patch("tasks.feature_job.SessionLocal")
    def test_closes_sessions_always(self, mock_session_cls, mock_extract):
        listing_session = _mock_session()
        listing_result = MagicMock()
        listing_result.fetchall.return_value = _gym_rows("gym-1")
        listing_session.execute.return_value = listing_result

        gym_session = _mock_session()
        mock_session_cls.side_effect = [listing_session, gym_session]
        mock_extract.return_value = []

        from tasks.feature_job import extract_features_all_gyms

        extract_features_all_gyms()

        listing_session.close.assert_called_once()
        gym_session.close.assert_called_once()

    @patch("tasks.feature_job.extract_all_features")
    @patch("tasks.feature_job.SessionLocal")
    def test_rollback_on_error_continues_other_gyms(self, mock_session_cls, mock_extract):
        """If one gym fails, the job should continue processing others."""
        listing_session = _mock_session()
        listing_result = MagicMock()
        listing_result.fetchall.return_value = _gym_rows("gym-fail", "gym-ok")
        listing_session.execute.return_value = listing_result

        fail_session = _mock_session()
        ok_session = _mock_session()
        mock_session_cls.side_effect = [listing_session, fail_session, ok_session]
        mock_extract.side_effect = [
            RuntimeError("DB connection lost"),
            [MagicMock()],
        ]

        from tasks.feature_job import extract_features_all_gyms

        result = extract_features_all_gyms()

        fail_session.rollback.assert_called_once()
        assert result["gyms_processed"] == 2
        assert result["total_members"] == 1
        assert result["per_gym"]["gym-ok"] == 1

    @patch("tasks.feature_job.extract_all_features")
    @patch("tasks.feature_job.SessionLocal")
    def test_no_gyms_returns_empty(self, mock_session_cls, mock_extract):
        listing_session = _mock_session()
        listing_result = MagicMock()
        listing_result.fetchall.return_value = []
        listing_session.execute.return_value = listing_result

        mock_session_cls.return_value = listing_session

        from tasks.feature_job import extract_features_all_gyms

        result = extract_features_all_gyms()

        assert result["gyms_processed"] == 0
        assert result["total_members"] == 0
        mock_extract.assert_not_called()


# ===================================================================
# scoring_job — score_all_gyms
# ===================================================================
class TestScoringJob:
    @patch("tasks.scoring_job.score_all_members")
    @patch("tasks.scoring_job.SessionLocal")
    def test_processes_all_gyms(self, mock_session_cls, mock_score):
        listing_session = _mock_session()
        listing_result = MagicMock()
        listing_result.fetchall.return_value = _gym_rows("gym-1", "gym-2")
        listing_session.execute.return_value = listing_result

        gym1_session = _mock_session()
        gym2_session = _mock_session()
        mock_session_cls.side_effect = [listing_session, gym1_session, gym2_session]

        score1 = SimpleNamespace(tier="critical")
        score2 = SimpleNamespace(tier="safe")
        score3 = SimpleNamespace(tier="medium")
        mock_score.side_effect = [
            [score1, score2],
            [score3],
        ]

        from tasks.scoring_job import score_all_gyms

        result = score_all_gyms()

        assert result["gyms_processed"] == 2
        assert result["total_scored"] == 3
        assert result["per_gym"]["gym-1"] == 2
        assert result["per_gym"]["gym-2"] == 1

    @patch("tasks.scoring_job.score_all_members")
    @patch("tasks.scoring_job.SessionLocal")
    def test_aggregates_tier_counts(self, mock_session_cls, mock_score):
        listing_session = _mock_session()
        listing_result = MagicMock()
        listing_result.fetchall.return_value = _gym_rows("gym-1")
        listing_session.execute.return_value = listing_result

        gym_session = _mock_session()
        mock_session_cls.side_effect = [listing_session, gym_session]

        mock_score.return_value = [
            SimpleNamespace(tier="critical"),
            SimpleNamespace(tier="critical"),
            SimpleNamespace(tier="medium"),
            SimpleNamespace(tier="low"),
            SimpleNamespace(tier="safe"),
        ]

        from tasks.scoring_job import score_all_gyms

        result = score_all_gyms()

        assert result["tier_counts"]["critical"] == 2
        assert result["tier_counts"]["medium"] == 1
        assert result["tier_counts"]["low"] == 1
        assert result["tier_counts"]["safe"] == 1

    @patch("tasks.scoring_job.score_all_members")
    @patch("tasks.scoring_job.SessionLocal")
    def test_sets_rls_context_per_gym(self, mock_session_cls, mock_score):
        listing_session = _mock_session()
        listing_result = MagicMock()
        listing_result.fetchall.return_value = _gym_rows("gym-1")
        listing_session.execute.return_value = listing_result

        gym_session = _mock_session()
        mock_session_cls.side_effect = [listing_session, gym_session]
        mock_score.return_value = []

        from tasks.scoring_job import score_all_gyms

        score_all_gyms()

        set_local_call = gym_session.execute.call_args_list[0]
        sql_text = str(set_local_call[0][0])
        assert "SET LOCAL app.current_gym_id" in sql_text

    @patch("tasks.scoring_job.score_all_members")
    @patch("tasks.scoring_job.SessionLocal")
    def test_commits_after_each_gym(self, mock_session_cls, mock_score):
        listing_session = _mock_session()
        listing_result = MagicMock()
        listing_result.fetchall.return_value = _gym_rows("gym-1")
        listing_session.execute.return_value = listing_result

        gym_session = _mock_session()
        mock_session_cls.side_effect = [listing_session, gym_session]
        mock_score.return_value = []

        from tasks.scoring_job import score_all_gyms

        score_all_gyms()

        gym_session.commit.assert_called_once()

    @patch("tasks.scoring_job.score_all_members")
    @patch("tasks.scoring_job.SessionLocal")
    def test_rollback_on_error_continues(self, mock_session_cls, mock_score):
        listing_session = _mock_session()
        listing_result = MagicMock()
        listing_result.fetchall.return_value = _gym_rows("gym-fail", "gym-ok")
        listing_session.execute.return_value = listing_result

        fail_session = _mock_session()
        ok_session = _mock_session()
        mock_session_cls.side_effect = [listing_session, fail_session, ok_session]
        mock_score.side_effect = [
            RuntimeError("Scoring engine crashed"),
            [SimpleNamespace(tier="safe")],
        ]

        from tasks.scoring_job import score_all_gyms

        result = score_all_gyms()

        fail_session.rollback.assert_called_once()
        assert result["total_scored"] == 1
        assert result["per_gym"]["gym-ok"] == 1

    @patch("tasks.scoring_job.score_all_members")
    @patch("tasks.scoring_job.SessionLocal")
    def test_no_gyms_returns_empty(self, mock_session_cls, mock_score):
        listing_session = _mock_session()
        listing_result = MagicMock()
        listing_result.fetchall.return_value = []
        listing_session.execute.return_value = listing_result

        mock_session_cls.return_value = listing_session

        from tasks.scoring_job import score_all_gyms

        result = score_all_gyms()

        assert result["gyms_processed"] == 0
        assert result["total_scored"] == 0
        assert result["tier_counts"] == {"critical": 0, "medium": 0, "low": 0, "safe": 0}
        mock_score.assert_not_called()

    @patch("tasks.scoring_job.score_all_members")
    @patch("tasks.scoring_job.SessionLocal")
    def test_closes_sessions_always(self, mock_session_cls, mock_score):
        listing_session = _mock_session()
        listing_result = MagicMock()
        listing_result.fetchall.return_value = _gym_rows("gym-1")
        listing_session.execute.return_value = listing_result

        gym_session = _mock_session()
        mock_session_cls.side_effect = [listing_session, gym_session]
        mock_score.return_value = []

        from tasks.scoring_job import score_all_gyms

        score_all_gyms()

        listing_session.close.assert_called_once()
        gym_session.close.assert_called_once()
