"""Integration tests for /notifications endpoints."""

import uuid

import pytest

from tests.integration.factories import create_notification, get_db_session

pytestmark = pytest.mark.integration


class TestListNotifications:
    def test_list_notifications_empty(self, client_a):
        client, headers = client_a
        resp = client.get("/notifications", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["unread_count"] == 0
        assert data["notifications"] == []

    def test_list_notifications_with_data(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            create_notification(db, gym_a_uuid, title="Alert 1")
            create_notification(db, gym_a_uuid, title="Alert 2")
            create_notification(db, gym_a_uuid, title="Read Alert", is_read=True)
        finally:
            db.close()

        resp = client.get("/notifications", headers=headers)
        data = resp.json()
        assert data["total"] == 3
        assert data["unread_count"] == 2


class TestMarkNotificationRead:
    def test_mark_single_read(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            notif_id = create_notification(db, gym_a_uuid, title="To Read")
        finally:
            db.close()

        resp = client.put(f"/notifications/{notif_id}/read", headers=headers)
        assert resp.status_code == 204

        list_resp = client.get("/notifications", headers=headers)
        data = list_resp.json()
        assert data["unread_count"] == 0

    def test_mark_nonexistent_notification_returns_404(self, client_a):
        client, headers = client_a
        fake_id = str(uuid.uuid4())
        resp = client.put(f"/notifications/{fake_id}/read", headers=headers)
        assert resp.status_code == 404


class TestMarkAllRead:
    def test_mark_all_read(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            create_notification(db, gym_a_uuid, title="Unread 1")
            create_notification(db, gym_a_uuid, title="Unread 2")
            create_notification(db, gym_a_uuid, title="Unread 3")
        finally:
            db.close()

        resp = client.put("/notifications/read-all", headers=headers)
        assert resp.status_code == 204

        list_resp = client.get("/notifications", headers=headers)
        assert list_resp.json()["unread_count"] == 0
