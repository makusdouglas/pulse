"""Integration tests for GET /dashboard/stats."""

import pytest

from tests.integration.factories import (
    create_churn_score,
    create_member,
    get_db_session,
)

pytestmark = pytest.mark.integration


class TestDashboard:
    def test_dashboard_empty_gym(self, client_a):
        client, headers = client_a
        resp = client.get("/dashboard/stats", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_members"] == 0
        assert data["active_members"] == 0
        assert data["at_risk_count"] == 0

    def test_dashboard_with_scored_members(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            m1 = create_member(db, gym_a_uuid, name="Critical", email="crit@test.com")
            m2 = create_member(db, gym_a_uuid, name="Safe", email="safe@test.com")
            m3 = create_member(db, gym_a_uuid, name="Medium", email="med@test.com")

            create_churn_score(db, gym_a_uuid, m1, score=75, tier="critical")
            create_churn_score(db, gym_a_uuid, m2, score=5, tier="safe")
            create_churn_score(db, gym_a_uuid, m3, score=45, tier="medium")
        finally:
            db.close()

        resp = client.get("/dashboard/stats", headers=headers)
        data = resp.json()
        assert data["total_members"] == 3
        assert data["active_members"] == 3
        assert data["at_risk_count"] == 2
        assert data["tier_counts"]["critical"] == 1
        assert data["tier_counts"]["medium"] == 1
        assert data["tier_counts"]["safe"] == 1
