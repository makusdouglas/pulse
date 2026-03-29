"""Integration tests for /gym/settings endpoints."""

import pytest

pytestmark = pytest.mark.integration


class TestGymSettings:
    def test_get_default_settings(self, client_a):
        client, headers = client_a
        resp = client.get("/gym/settings", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "My Gym"

    def test_update_settings(self, client_a):
        client, headers = client_a
        resp = client.put(
            "/gym/settings",
            headers=headers,
            json={"name": "Iron Fitness", "email": "contact@iron.com", "phone": "11999990000"},
        )
        assert resp.status_code == 200

        get_resp = client.get("/gym/settings", headers=headers)
        data = get_resp.json()
        assert data["name"] == "Iron Fitness"
        assert data["email"] == "contact@iron.com"
        assert data["phone"] == "11999990000"

    def test_update_settings_no_fields_returns_400(self, client_a):
        client, headers = client_a
        resp = client.put(
            "/gym/settings",
            headers=headers,
            json={},
        )
        assert resp.status_code == 400
