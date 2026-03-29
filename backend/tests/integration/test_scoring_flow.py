"""Integration tests for on-demand scoring — GET /members/{id}/score."""

import uuid
from datetime import date, datetime, timedelta

import pytest

from tests.integration.factories import (
    create_checkin,
    create_member,
    create_payment,
    get_db_session,
)

pytestmark = pytest.mark.integration


class TestScoreMember:
    def test_score_safe_member(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            member_id = create_member(
                db, gym_a_uuid, name="Healthy Ana", email="ana@test.com",
                enrolled_at=date.today() - timedelta(days=365),
            )
            for i in range(5):
                create_checkin(
                    db, gym_a_uuid, member_id,
                    ts=datetime.now() - timedelta(days=i * 5),
                    duration_min=60,
                )
            create_payment(
                db, gym_a_uuid, member_id,
                due_date=date.today() - timedelta(days=30),
                status="paid",
                paid_at=date.today() - timedelta(days=30),
            )
        finally:
            db.close()

        resp = client.get(f"/members/{member_id}/score", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["score"] < 30
        assert data["tier"] in ("safe", "low")
        assert data["member"]["name"] == "Healthy Ana"
        assert "signals" in data

    def test_score_high_risk_member(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            member_id = create_member(
                db, gym_a_uuid, name="At Risk Bruno", email="bruno@test.com",
                enrolled_at=date.today() - timedelta(days=365),
            )
            create_checkin(
                db, gym_a_uuid, member_id,
                ts=datetime.now() - timedelta(days=25),
                duration_min=30,
            )
            create_payment(
                db, gym_a_uuid, member_id,
                due_date=date.today() - timedelta(days=60),
                status="overdue",
                paid_at=None,
            )
        finally:
            db.close()

        resp = client.get(f"/members/{member_id}/score", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["score"] >= 30
        assert data["tier"] in ("critical", "medium")
        assert len(data["reasons"]) > 0

    def test_score_nonexistent_member_returns_404(self, client_a):
        client, headers = client_a
        fake_id = str(uuid.uuid4())
        resp = client.get(f"/members/{fake_id}/score", headers=headers)
        assert resp.status_code == 404

    def test_score_persists_to_churn_scores(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            member_id = create_member(db, gym_a_uuid, name="Persisted", email="persist@test.com")
        finally:
            db.close()

        client.get(f"/members/{member_id}/score", headers=headers)

        from sqlalchemy import text
        db = get_db_session()
        try:
            db.execute(text("SET LOCAL row_security = off"))
            row = db.execute(
                text("SELECT score, tier FROM churn_scores WHERE member_id = :mid"),
                {"mid": member_id},
            ).fetchone()
            assert row is not None
            assert 0 <= row.score <= 100
            assert row.tier in ("critical", "medium", "low", "safe")
        finally:
            db.close()
