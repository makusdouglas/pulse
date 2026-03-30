"""Integration tests for the import wizard flow — real DB, full lifecycle."""

import pytest
from sqlalchemy import text

from tests.integration.factories import create_member, get_db_session

pytestmark = pytest.mark.integration


def _csv_bytes(header: str, *rows: str) -> bytes:
    return "\n".join([header] + list(rows)).encode("utf-8")


MEMBERS_CSV = _csv_bytes(
    "nome,email,telefone,matricula_em,cancelamento_em",
    "Ana Souza,ana@email.com,11987654321,05/01/2025,",
    "Bruno Lima,bruno@email.com,11976543210,12/01/2025,",
    "Carlos Fonseca,carlos@email.com,11932108765,18/08/2024,15/01/2025",
)

PAYMENTS_CSV = _csv_bytes(
    "email_aluno,vencimento,pago_em,valor,status",
    "ana@email.com,10/01/2025,08/01/2025,149.90,pago",
    "bruno@email.com,15/02/2025,15/02/2025,199.90,pago",
    "carlos@email.com,20/10/2024,,149.90,atrasado",
)

CHECKINS_CSV = _csv_bytes(
    "email_aluno,data_hora,duracao_min",
    "ana@email.com,06/01/2025 07:30,60",
    "bruno@email.com,13/01/2025 18:00,75",
    "ana@email.com,08/01/2025 07:15,55",
)


class TestPreviewWithRealDB:
    def test_preview_members_marks_existing(self, client_a, gym_a_uuid):
        client, headers = client_a

        # Pre-create Ana in the DB
        db = get_db_session()
        try:
            create_member(db, gym_a_uuid, "Ana Existente", email="ana@email.com")
        finally:
            db.close()

        response = client.post(
            "/import/wizard/preview",
            headers=headers,
            files={"file": ("alunos.csv", MEMBERS_CSV, "text/csv")},
            data={"entity_type": "members"},
        )

        assert response.status_code == 200
        body = response.json()
        assert len(body["rows"]) == 3

        ana = next(r for r in body["rows"] if r["email"] == "ana@email.com")
        bruno = next(r for r in body["rows"] if r["email"] == "bruno@email.com")
        carlos = next(r for r in body["rows"] if r["email"] == "carlos@email.com")

        assert ana["exists"] is True
        assert bruno["exists"] is False
        assert carlos["exists"] is False

    def test_preview_members_none_existing(self, client_a, gym_a_uuid):
        client, headers = client_a

        response = client.post(
            "/import/wizard/preview",
            headers=headers,
            files={"file": ("alunos.csv", MEMBERS_CSV, "text/csv")},
            data={"entity_type": "members"},
        )

        body = response.json()
        assert all(r["exists"] is False for r in body["rows"])

    def test_preview_payments_does_not_add_exists(self, client_a, gym_a_uuid):
        client, headers = client_a

        response = client.post(
            "/import/wizard/preview",
            headers=headers,
            files={"file": ("pag.csv", PAYMENTS_CSV, "text/csv")},
            data={"entity_type": "payments"},
        )

        body = response.json()
        assert len(body["rows"]) == 3
        assert "exists" not in body["rows"][0]


class TestCommitWithRealDB:
    def test_full_wizard_lifecycle(self, client_a, gym_a_uuid):
        """Simulate the complete wizard: preview → select → commit → verify DB."""
        client, headers = client_a

        # Step 1: Preview members
        resp = client.post(
            "/import/wizard/preview",
            headers=headers,
            files={"file": ("alunos.csv", MEMBERS_CSV, "text/csv")},
            data={"entity_type": "members"},
        )
        assert resp.status_code == 200
        members = resp.json()["rows"]
        assert len(members) == 3

        # Exclude Carlos (simulating user unchecking)
        selected_members = [m for m in members if m["email"] != "carlos@email.com"]

        # Step 2: Preview payments
        resp = client.post(
            "/import/wizard/preview",
            headers=headers,
            files={"file": ("pag.csv", PAYMENTS_CSV, "text/csv")},
            data={"entity_type": "payments"},
        )
        assert resp.status_code == 200
        all_payments = resp.json()["rows"]

        # Filter out Carlos's payments (client-side)
        selected_emails = {m["email"] for m in selected_members}
        payments = [p for p in all_payments if p["member_email"] in selected_emails]

        # Step 3: Preview checkins
        resp = client.post(
            "/import/wizard/preview",
            headers=headers,
            files={"file": ("ci.csv", CHECKINS_CSV, "text/csv")},
            data={"entity_type": "checkins"},
        )
        assert resp.status_code == 200
        all_checkins = resp.json()["rows"]
        checkins = [c for c in all_checkins if c["member_email"] in selected_emails]

        # Commit
        resp = client.post(
            "/import/wizard/commit",
            headers=headers,
            json={
                "members": selected_members,
                "payments": payments,
                "checkins": checkins,
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["members"]["inserted"] == 2  # Ana + Bruno (not Carlos)
        assert body["payments"]["inserted"] == 2  # Ana + Bruno (not Carlos)
        assert body["checkins"]["inserted"] == 3  # 2 Ana + 1 Bruno

        # Verify in DB
        db = get_db_session()
        try:
            db.execute(
                text("SET LOCAL app.current_gym_id = :gid"),
                {"gid": gym_a_uuid},
            )
            member_count = db.execute(
                text("SELECT count(*) FROM members WHERE gym_id = :gid"),
                {"gid": gym_a_uuid},
            ).scalar()
            assert member_count == 2

            carlos_count = db.execute(
                text(
                    "SELECT count(*) FROM members "
                    "WHERE gym_id = :gid AND email = 'carlos@email.com'"
                ),
                {"gid": gym_a_uuid},
            ).scalar()
            assert carlos_count == 0
        finally:
            db.close()

    def test_commit_with_existing_member_upserts(self, client_a, gym_a_uuid):
        """Existing member should be updated, not duplicated."""
        client, headers = client_a

        # Pre-create Ana with old phone
        db = get_db_session()
        try:
            create_member(
                db, gym_a_uuid, "Ana Velha", email="ana@email.com", phone="00000000"
            )
        finally:
            db.close()

        # Commit with updated data
        resp = client.post(
            "/import/wizard/commit",
            headers=headers,
            json={
                "members": [
                    {
                        "name": "Ana Souza",
                        "email": "ana@email.com",
                        "phone": "11987654321",
                        "enrolled_at": "2025-01-05",
                        "status": "active",
                    }
                ],
            },
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["members"]["updated"] == 1
        assert body["members"]["inserted"] == 0

        # Verify update in DB
        db = get_db_session()
        try:
            row = db.execute(
                text(
                    "SELECT name, phone FROM members "
                    "WHERE gym_id = :gid AND email = 'ana@email.com'"
                ),
                {"gid": gym_a_uuid},
            ).fetchone()
            assert row.name == "Ana Souza"
            assert row.phone == "11987654321"
        finally:
            db.close()

    def test_commit_empty_data(self, client_a, gym_a_uuid):
        client, headers = client_a

        resp = client.post(
            "/import/wizard/commit",
            headers=headers,
            json={"members": []},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["members"]["inserted"] == 0

    def test_commit_atomicity_no_partial_on_success(self, client_a, gym_a_uuid):
        """All entities should be committed together."""
        client, headers = client_a

        resp = client.post(
            "/import/wizard/commit",
            headers=headers,
            json={
                "members": [
                    {
                        "name": "Ana",
                        "email": "ana@email.com",
                        "status": "active",
                    }
                ],
                "payments": [
                    {
                        "member_email": "ana@email.com",
                        "due_date": "2025-01-10",
                        "paid_at": "2025-01-08",
                        "amount": 149.90,
                        "status": "paid",
                    }
                ],
                "checkins": [
                    {
                        "member_email": "ana@email.com",
                        "ts": "2025-01-06T07:30:00",
                        "duration_min": 60,
                    }
                ],
            },
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["members"]["inserted"] == 1
        assert body["payments"]["inserted"] == 1
        assert body["checkins"]["inserted"] == 1


class TestTenantIsolationWizard:
    def test_gym_a_preview_does_not_see_gym_b_members(
        self, client_a, client_b, gym_a_uuid, gym_b_uuid
    ):
        """Gym A should not see gym B's existing members in preview."""
        client_a_inst, headers_a = client_a
        client_b_inst, headers_b = client_b

        # Create Ana in gym B
        db = get_db_session()
        try:
            create_member(db, gym_b_uuid, "Ana B", email="ana@email.com")
        finally:
            db.close()

        # Preview with gym A — Ana should NOT be marked as existing
        csv = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            "Ana A,ana@email.com,11999999999,01/01/2025,",
        )
        resp = client_a_inst.post(
            "/import/wizard/preview",
            headers=headers_a,
            files={"file": ("alunos.csv", csv, "text/csv")},
            data={"entity_type": "members"},
        )

        body = resp.json()
        assert body["rows"][0]["exists"] is False


class TestTemplateEndpointIntegration:
    def test_templates_return_valid_csv(self, client_a):
        client, headers = client_a

        for entity in ("members", "payments", "checkins"):
            resp = client.get(
                f"/import/wizard/template/{entity}",
                headers=headers,
            )
            assert resp.status_code == 200
            lines = resp.text.strip().split("\n")
            assert len(lines) == 2  # header + 1 example row
