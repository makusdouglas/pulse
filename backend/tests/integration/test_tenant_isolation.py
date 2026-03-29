"""Tenant isolation tests — verify gym A cannot see gym B's data via RLS."""

import pytest

from tests.integration.factories import (
    create_action,
    create_churn_score,
    create_member,
    create_notification,
    create_payment,
    get_db_session,
)

pytestmark = pytest.mark.integration


class TestTenantIsolation:
    def test_gym_a_cannot_see_gym_b_members(self, client_a, client_b, gym_a_uuid, gym_b_uuid):
        ca, ha = client_a
        db = get_db_session()
        try:
            create_member(db, gym_b_uuid, name="Secret Member", email="secret@gymb.com")
        finally:
            db.close()

        resp = ca.get("/members", headers=ha)
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_gym_b_cannot_see_gym_a_members(self, client_a, client_b, gym_a_uuid, gym_b_uuid):
        cb, hb = client_b
        db = get_db_session()
        try:
            create_member(db, gym_a_uuid, name="Gym A Member", email="member@gyma.com")
        finally:
            db.close()

        resp = cb.get("/members", headers=hb)
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_gym_a_cannot_see_gym_b_payments(self, client_a, client_b, gym_a_uuid, gym_b_uuid):
        ca, ha = client_a
        db = get_db_session()
        try:
            member_id = create_member(db, gym_b_uuid, name="B Payer", email="payer@gymb.com")
            create_payment(db, gym_b_uuid, member_id)
        finally:
            db.close()

        resp = ca.get("/payments", headers=ha)
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_gym_a_cannot_see_gym_b_notifications(self, client_a, client_b, gym_a_uuid, gym_b_uuid):
        ca, ha = client_a
        db = get_db_session()
        try:
            create_notification(db, gym_b_uuid, title="Secret Alert")
        finally:
            db.close()

        resp = ca.get("/notifications", headers=ha)
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_gym_a_cannot_mark_gym_b_notification_read(self, client_a, client_b, gym_a_uuid, gym_b_uuid):
        ca, ha = client_a
        db = get_db_session()
        try:
            notif_id = create_notification(db, gym_b_uuid, title="B's Alert")
        finally:
            db.close()

        resp = ca.put(f"/notifications/{notif_id}/read", headers=ha)
        assert resp.status_code == 404

    def test_gym_a_cannot_see_gym_b_actions(self, client_a, client_b, gym_a_uuid, gym_b_uuid):
        ca, ha = client_a
        db = get_db_session()
        try:
            member_id = create_member(db, gym_b_uuid, name="B Actor", email="actor@gymb.com")
            create_action(db, gym_b_uuid, member_id)
        finally:
            db.close()

        resp = ca.get("/actions", headers=ha)
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_gym_a_cannot_score_gym_b_member(self, client_a, client_b, gym_a_uuid, gym_b_uuid):
        ca, ha = client_a
        db = get_db_session()
        try:
            member_id = create_member(db, gym_b_uuid, name="B Scored", email="scored@gymb.com")
        finally:
            db.close()

        resp = ca.get(f"/members/{member_id}/score", headers=ha)
        assert resp.status_code == 404

    def test_each_gym_sees_only_own_data(self, client_a, client_b, gym_a_uuid, gym_b_uuid):
        ca, ha = client_a
        cb, hb = client_b
        db = get_db_session()
        try:
            create_member(db, gym_a_uuid, name="A Member 1", email="a1@gyma.com")
            create_member(db, gym_a_uuid, name="A Member 2", email="a2@gyma.com")
            create_member(db, gym_b_uuid, name="B Member 1", email="b1@gymb.com")
        finally:
            db.close()

        resp_a = ca.get("/members", headers=ha)
        resp_b = cb.get("/members", headers=hb)

        assert resp_a.json()["total"] == 2
        assert resp_b.json()["total"] == 1
