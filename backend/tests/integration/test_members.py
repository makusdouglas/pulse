"""Integration tests for /members endpoints."""

import pytest

from tests.integration.factories import create_member, get_db_session

pytestmark = pytest.mark.integration


class TestListMembers:
    def test_list_members_empty(self, client_a):
        client, headers = client_a
        resp = client.get("/members", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["members"] == []

    def test_list_members_with_data(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            create_member(db, gym_a_uuid, name="Alice", email="alice@test.com")
            create_member(db, gym_a_uuid, name="Bob", email="bob@test.com")
        finally:
            db.close()

        resp = client.get("/members", headers=headers)
        data = resp.json()
        assert data["total"] == 2
        assert len(data["members"]) == 2
        names = {m["name"] for m in data["members"]}
        assert names == {"Alice", "Bob"}

    def test_list_members_pagination(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            for i in range(25):
                create_member(db, gym_a_uuid, name=f"Member {i:03d}", email=f"m{i}@test.com")
        finally:
            db.close()

        resp = client.get("/members?page=1&page_size=10", headers=headers)
        data = resp.json()
        assert data["total"] == 25
        assert len(data["members"]) == 10
        assert data["page"] == 1
        assert data["page_size"] == 10

        resp2 = client.get("/members?page=3&page_size=10", headers=headers)
        data2 = resp2.json()
        assert len(data2["members"]) == 5

    def test_list_members_search_by_name(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            create_member(db, gym_a_uuid, name="Ana Silva", email="ana@test.com")
            create_member(db, gym_a_uuid, name="Bruno Costa", email="bruno@test.com")
        finally:
            db.close()

        resp = client.get("/members?search=Ana", headers=headers)
        data = resp.json()
        assert data["total"] == 1
        assert data["members"][0]["name"] == "Ana Silva"

    def test_list_members_search_by_email(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            create_member(db, gym_a_uuid, name="Ana", email="ana@test.com")
            create_member(db, gym_a_uuid, name="Bruno", email="bruno@test.com")
        finally:
            db.close()

        resp = client.get("/members?search=bruno@test", headers=headers)
        data = resp.json()
        assert data["total"] == 1
        assert data["members"][0]["name"] == "Bruno"

    def test_list_members_filter_by_status(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            create_member(db, gym_a_uuid, name="Active", email="active@test.com", status="active")
            create_member(db, gym_a_uuid, name="Cancelled", email="cancel@test.com", status="cancelled")
        finally:
            db.close()

        resp = client.get("/members?status=active", headers=headers)
        data = resp.json()
        assert data["total"] == 1
        assert data["members"][0]["name"] == "Active"
