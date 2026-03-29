"""Integration tests for GET /at-risk."""

import pytest

from tests.integration.factories import (
    create_churn_score,
    create_member,
    get_db_session,
)

pytestmark = pytest.mark.integration


class TestAtRisk:
    def test_at_risk_empty(self, client_a):
        client, headers = client_a
        resp = client.get("/at-risk", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["members"] == []

    def test_at_risk_returns_scored_members(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            m1 = create_member(db, gym_a_uuid, name="Critical", email="crit@test.com")
            m2 = create_member(db, gym_a_uuid, name="Safe", email="safe@test.com")
            create_churn_score(db, gym_a_uuid, m1, score=70, tier="critical")
            create_churn_score(db, gym_a_uuid, m2, score=5, tier="safe")
        finally:
            db.close()

        resp = client.get("/at-risk", headers=headers)
        data = resp.json()
        assert data["total"] >= 1

    def test_at_risk_filter_by_tier(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            m1 = create_member(db, gym_a_uuid, name="Critical", email="crit@test.com")
            m2 = create_member(db, gym_a_uuid, name="Medium", email="med@test.com")
            m3 = create_member(db, gym_a_uuid, name="Safe", email="safe@test.com")
            create_churn_score(db, gym_a_uuid, m1, score=70, tier="critical")
            create_churn_score(db, gym_a_uuid, m2, score=40, tier="medium")
            create_churn_score(db, gym_a_uuid, m3, score=5, tier="safe")
        finally:
            db.close()

        resp = client.get("/at-risk?tier=critical", headers=headers)
        data = resp.json()
        assert data["total"] == 1
        assert data["members"][0]["member_name"] == "Critical"

    def test_at_risk_pagination(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            for i in range(15):
                mid = create_member(db, gym_a_uuid, name=f"Risk {i}", email=f"risk{i}@test.com")
                create_churn_score(db, gym_a_uuid, mid, score=60 + i, tier="critical")
        finally:
            db.close()

        resp = client.get("/at-risk?page=1&page_size=10", headers=headers)
        data = resp.json()
        assert data["total"] == 15
        assert len(data["members"]) == 10
