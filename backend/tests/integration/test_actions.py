"""Integration tests for /actions endpoints."""

import uuid

import pytest

from tests.integration.factories import create_member, get_db_session

pytestmark = pytest.mark.integration


class TestCreateAction:
    def test_create_action_success(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            member_id = create_member(db, gym_a_uuid, name="Ana", email="ana@test.com")
        finally:
            db.close()

        resp = client.post(
            "/actions",
            headers=headers,
            json={
                "member_id": member_id,
                "action_type": "contact",
                "channel": "whatsapp",
                "message": "Ola Ana, sentimos sua falta!",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["member_id"] == member_id
        assert data["member_name"] == "Ana"
        assert data["action_type"] == "contact"
        assert data["channel"] == "whatsapp"

    def test_create_action_member_not_found(self, client_a):
        client, headers = client_a
        fake_id = str(uuid.uuid4())
        resp = client.post(
            "/actions",
            headers=headers,
            json={
                "member_id": fake_id,
                "action_type": "contact",
                "channel": "whatsapp",
                "message": "Hello",
            },
        )
        assert resp.status_code == 404


class TestListActions:
    def test_list_actions_empty(self, client_a):
        client, headers = client_a
        resp = client.get("/actions", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_list_actions_after_create(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            member_id = create_member(db, gym_a_uuid, name="Bruno", email="bruno@test.com")
        finally:
            db.close()

        client.post(
            "/actions",
            headers=headers,
            json={
                "member_id": member_id,
                "action_type": "followup",
                "channel": "email",
                "message": "Follow up message",
            },
        )

        resp = client.get("/actions", headers=headers)
        data = resp.json()
        assert data["total"] == 1
        assert data["actions"][0]["action_type"] == "followup"

    def test_list_actions_filter_by_member(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            m1 = create_member(db, gym_a_uuid, name="Ana", email="ana@test.com")
            m2 = create_member(db, gym_a_uuid, name="Bruno", email="bruno@test.com")
        finally:
            db.close()

        for mid in [m1, m2]:
            client.post(
                "/actions",
                headers=headers,
                json={
                    "member_id": mid,
                    "action_type": "contact",
                    "channel": "whatsapp",
                    "message": "Msg",
                },
            )

        resp = client.get(f"/actions?member_id={m1}", headers=headers)
        data = resp.json()
        assert data["total"] == 1
        assert data["actions"][0]["member_name"] == "Ana"
