"""Tests for new API endpoints — payments, actions, settings, notifications."""

from datetime import date, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _setup_db_responses(mock_session, calls):
    """Configure mock_session.execute to return different results per call.

    The first call is always SET LOCAL from get_db (deps.py), so we prepend
    a no-op result for it automatically.
    """
    results = [MagicMock()]  # SET LOCAL app.current_gym_id
    for c in calls:
        result_mock = MagicMock()
        result_mock.scalar.return_value = c.get("scalar")
        result_mock.fetchone.return_value = c.get("fetchone")
        result_mock.fetchall.return_value = c.get("fetchall", [])
        result_mock.rowcount = c.get("rowcount", 0)
        results.append(result_mock)
    mock_session.execute.side_effect = results


def _payment_row(**overrides):
    defaults = {
        "id": "pay-1111",
        "member_id": "mem-1111",
        "member_name": "Joao Silva",
        "amount": 149.90,
        "due_date": date(2026, 3, 15),
        "paid_at": date(2026, 3, 14),
        "status": "paid",
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _action_row(**overrides):
    defaults = {
        "id": "act-1111",
        "member_id": "mem-1111",
        "member_name": "Joao Silva",
        "action_type": "retention_call",
        "channel": "whatsapp",
        "message": "Oi, sentimos sua falta!",
        "sent_at": datetime(2026, 3, 25, 10, 30),
        "result": "delivered",
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _settings_row(**overrides):
    defaults = {
        "id": "gym-1111",
        "name": "Academia Pulse",
        "slug": "academia-pulse",
        "email": "contato@pulse.com",
        "phone": "(11) 99123-4567",
        "timezone": "America/Sao_Paulo",
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _notification_row(**overrides):
    defaults = {
        "id": "notif-1111",
        "type": "churn_alert",
        "title": "Aluno atingiu score critico",
        "description": "Ana Silva atingiu score 82",
        "read": False,
        "member_id": "mem-1111",
        "created_at": datetime(2026, 3, 25, 10, 0),
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


# ===================================================================
# GET /payments
# ===================================================================
class TestListPayments:
    def test_returns_paginated_payments(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 2},
            {"fetchall": [_payment_row(), _payment_row(id="pay-2222", member_name="Maria")]},
        ])

        response = client.get("/payments", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 2
        assert len(body["payments"]) == 2
        assert body["payments"][0]["member_name"] == "Joao Silva"

    def test_status_filter(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 1},
            {"fetchall": [_payment_row(status="overdue")]},
        ])

        response = client.get("/payments?status=overdue", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["payments"][0]["status"] == "overdue"

    def test_member_id_filter(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 1},
            {"fetchall": [_payment_row()]},
        ])

        response = client.get("/payments?member_id=mem-1111", headers=auth_headers)
        assert response.status_code == 200

    def test_invalid_status_rejected(self, client, auth_headers):
        response = client.get("/payments?status=invalid", headers=auth_headers)
        assert response.status_code == 422

    def test_empty_result(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 0},
            {"fetchall": []},
        ])

        response = client.get("/payments", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 0
        assert body["payments"] == []

    def test_pagination(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 50},
            {"fetchall": [_payment_row()]},
        ])

        response = client.get("/payments?page=3&page_size=10", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["page"] == 3
        assert body["page_size"] == 10

    def test_no_auth_returns_error(self, client):
        response = client.get("/payments")
        assert response.status_code in (401, 422)


# ===================================================================
# GET /actions + POST /actions
# ===================================================================
class TestListActions:
    def test_returns_paginated_actions(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 1},
            {"fetchall": [_action_row()]},
        ])

        response = client.get("/actions", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 1
        assert len(body["actions"]) == 1
        assert body["actions"][0]["channel"] == "whatsapp"

    def test_member_filter(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 1},
            {"fetchall": [_action_row()]},
        ])

        response = client.get("/actions?member_id=mem-1111", headers=auth_headers)
        assert response.status_code == 200

    def test_empty_result(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 0},
            {"fetchall": []},
        ])

        response = client.get("/actions", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 0
        assert body["actions"] == []


class TestCreateAction:
    def test_creates_action_successfully(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"fetchone": SimpleNamespace()},  # member exists check
            {"fetchone": SimpleNamespace(id="act-new", sent_at=datetime(2026, 3, 25, 10, 0))},  # INSERT RETURNING
            {"scalar": "Joao Silva"},  # member name
        ])

        response = client.post("/actions", headers=auth_headers, json={
            "member_id": "mem-1111",
            "action_type": "retention_call",
            "channel": "whatsapp",
            "message": "Oi, sentimos sua falta!",
        })
        assert response.status_code == 201
        body = response.json()
        assert body["id"] == "act-new"
        assert body["channel"] == "whatsapp"

    def test_404_member_not_in_gym(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"fetchone": None},  # member NOT found
        ])

        response = client.post("/actions", headers=auth_headers, json={
            "member_id": "nonexistent",
            "action_type": "call",
            "channel": "phone",
            "message": "Test message",
        })
        assert response.status_code == 404

    def test_invalid_channel_rejected(self, client, auth_headers):
        response = client.post("/actions", headers=auth_headers, json={
            "member_id": "mem-1111",
            "action_type": "call",
            "channel": "telegram",
            "message": "Test",
        })
        assert response.status_code == 422

    def test_empty_message_rejected(self, client, auth_headers):
        response = client.post("/actions", headers=auth_headers, json={
            "member_id": "mem-1111",
            "action_type": "call",
            "channel": "whatsapp",
            "message": "",
        })
        assert response.status_code == 422


# ===================================================================
# GET /gym/settings + PUT /gym/settings
# ===================================================================
class TestGetGymSettings:
    def test_returns_gym_settings(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"fetchone": _settings_row()},
        ])

        response = client.get("/gym/settings", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["name"] == "Academia Pulse"
        assert body["timezone"] == "America/Sao_Paulo"

    def test_404_gym_not_found(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"fetchone": None},
        ])

        response = client.get("/gym/settings", headers=auth_headers)
        assert response.status_code == 404


class TestUpdateGymSettings:
    def test_updates_name(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {},  # UPDATE statement
            {"fetchone": _settings_row(name="Novo Nome")},  # re-read
        ])

        response = client.put("/gym/settings", headers=auth_headers, json={
            "name": "Novo Nome",
        })
        assert response.status_code == 200
        body = response.json()
        assert body["name"] == "Novo Nome"

    def test_partial_update(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {},  # UPDATE
            {"fetchone": _settings_row(email="novo@email.com")},  # re-read
        ])

        response = client.put("/gym/settings", headers=auth_headers, json={
            "email": "novo@email.com",
        })
        assert response.status_code == 200
        body = response.json()
        assert body["email"] == "novo@email.com"

    def test_empty_body_rejected(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [])

        response = client.put("/gym/settings", headers=auth_headers, json={})
        assert response.status_code == 400


# ===================================================================
# GET /notifications + PUT /notifications/{id}/read
# ===================================================================
class TestListNotifications:
    def test_returns_notifications(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 3},  # total
            {"scalar": 2},  # unread_count
            {"fetchall": [_notification_row(), _notification_row(id="notif-2222", read=True)]},
        ])

        response = client.get("/notifications", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 3
        assert body["unread_count"] == 2
        assert len(body["notifications"]) == 2

    def test_empty_result(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 0},
            {"scalar": 0},
            {"fetchall": []},
        ])

        response = client.get("/notifications", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 0
        assert body["unread_count"] == 0
        assert body["notifications"] == []

    def test_pagination(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 50},
            {"scalar": 10},
            {"fetchall": [_notification_row()]},
        ])

        response = client.get("/notifications?page=2&page_size=5", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["page"] == 2
        assert body["page_size"] == 5


class TestMarkNotificationRead:
    def test_marks_as_read(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"rowcount": 1},  # UPDATE succeeded
        ])

        response = client.put("/notifications/notif-1111/read", headers=auth_headers)
        assert response.status_code == 204

    def test_404_not_found(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"rowcount": 0},  # UPDATE matched nothing
            {"fetchone": None},  # doesn't exist
        ])

        response = client.put("/notifications/nonexistent/read", headers=auth_headers)
        assert response.status_code == 404

    def test_already_read_is_idempotent(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"rowcount": 0},  # UPDATE matched nothing (already read)
            {"fetchone": SimpleNamespace()},  # but exists
        ])

        response = client.put("/notifications/notif-1111/read", headers=auth_headers)
        assert response.status_code == 204
