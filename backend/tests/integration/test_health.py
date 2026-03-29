"""Smoke test — validates the integration test setup works."""

import pytest
from fastapi.testclient import TestClient

from api.main import app

pytestmark = pytest.mark.integration


class TestHealth:
    def test_health_returns_ok_without_auth(self):
        """GET /health should return 200 without any auth header."""
        client = TestClient(app)
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
