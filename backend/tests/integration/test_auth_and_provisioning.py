"""Tests for auth bypass and gym auto-provisioning."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from api.main import app

pytestmark = pytest.mark.integration


class TestAuthRequired:
    def test_missing_auth_header_returns_401(self):
        """Endpoints requiring auth should reject requests without Authorization header."""
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.get("/members")
        assert resp.status_code == 401


class TestAutoProvisioning:
    def test_first_request_creates_gym(self, client_a):
        client, headers = client_a
        resp = client.get("/members", headers=headers)
        assert resp.status_code == 200

        from infra.database import SessionLocal
        db = SessionLocal()
        try:
            row = db.execute(
                text("SELECT id, name, clerk_org_id FROM gyms WHERE clerk_org_id = 'org_test_gym_a'")
            ).fetchone()
            assert row is not None
            assert row.name == "My Gym"
            assert row.clerk_org_id == "org_test_gym_a"
        finally:
            db.close()

    def test_second_request_reuses_existing_gym(self, client_a):
        client, headers = client_a
        client.get("/members", headers=headers)
        client.get("/members", headers=headers)

        from infra.database import SessionLocal
        db = SessionLocal()
        try:
            count = db.execute(
                text("SELECT COUNT(*) FROM gyms WHERE clerk_org_id = 'org_test_gym_a'")
            ).scalar()
            assert count == 1
        finally:
            db.close()

    def test_different_orgs_get_different_gyms(self, client_a, client_b):
        ca, ha = client_a
        cb, hb = client_b
        ca.get("/members", headers=ha)
        cb.get("/members", headers=hb)

        from infra.database import SessionLocal
        db = SessionLocal()
        try:
            rows = db.execute(
                text("SELECT clerk_org_id FROM gyms ORDER BY clerk_org_id")
            ).fetchall()
            org_ids = [r.clerk_org_id for r in rows]
            assert "org_test_gym_a" in org_ids
            assert "org_test_gym_b" in org_ids
        finally:
            db.close()
