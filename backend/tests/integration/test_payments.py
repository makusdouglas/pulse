"""Integration tests for GET /payments."""

import pytest

from tests.integration.factories import create_member, create_payment, get_db_session

pytestmark = pytest.mark.integration


class TestListPayments:
    def test_list_payments_empty(self, client_a):
        client, headers = client_a
        resp = client.get("/payments", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["payments"] == []

    def test_list_payments_with_data(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            m = create_member(db, gym_a_uuid, name="Ana", email="ana@test.com")
            create_payment(db, gym_a_uuid, m, status="paid", amount=150.00)
            create_payment(db, gym_a_uuid, m, status="overdue", amount=150.00)
        finally:
            db.close()

        resp = client.get("/payments", headers=headers)
        data = resp.json()
        assert data["total"] == 2

    def test_list_payments_filter_by_status(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            m = create_member(db, gym_a_uuid, name="Bruno", email="bruno@test.com")
            create_payment(db, gym_a_uuid, m, status="paid")
            create_payment(db, gym_a_uuid, m, status="overdue")
            create_payment(db, gym_a_uuid, m, status="pending")
        finally:
            db.close()

        resp = client.get("/payments?status=overdue", headers=headers)
        data = resp.json()
        assert data["total"] == 1
        assert data["payments"][0]["status"] == "overdue"

    def test_list_payments_filter_by_member(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            m1 = create_member(db, gym_a_uuid, name="Ana", email="ana@test.com")
            m2 = create_member(db, gym_a_uuid, name="Bruno", email="bruno@test.com")
            create_payment(db, gym_a_uuid, m1, status="paid")
            create_payment(db, gym_a_uuid, m2, status="paid")
        finally:
            db.close()

        resp = client.get(f"/payments?member_id={m1}", headers=headers)
        data = resp.json()
        assert data["total"] == 1

    def test_list_payments_pagination(self, client_a, gym_a_uuid):
        client, headers = client_a
        db = get_db_session()
        try:
            m = create_member(db, gym_a_uuid, name="Ana", email="ana@test.com")
            for _ in range(15):
                create_payment(db, gym_a_uuid, m)
        finally:
            db.close()

        resp = client.get("/payments?page=1&page_size=10", headers=headers)
        data = resp.json()
        assert data["total"] == 15
        assert len(data["payments"]) == 10
