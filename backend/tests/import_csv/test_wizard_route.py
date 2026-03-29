"""Tests for api/routes/import_wizard.py — preview, commit, template endpoints."""

from unittest.mock import MagicMock, patch

import pytest

from use_cases.csv_loader import LoadResult


def _csv_bytes(header: str, *rows: str) -> bytes:
    return "\n".join([header] + list(rows)).encode("utf-8")


VALID_MEMBERS_CSV = _csv_bytes(
    "nome,email,telefone,matricula_em,cancelamento_em",
    "Ana Souza,ana@email.com,11987654321,05/01/2025,",
    "Carlos Fonseca,carlos@email.com,11932108765,18/08/2024,15/01/2025",
)

VALID_PAYMENTS_CSV = _csv_bytes(
    "email_aluno,vencimento,pago_em,valor,status",
    "ana@email.com,10/01/2025,08/01/2025,149.90,pago",
)

VALID_CHECKINS_CSV = _csv_bytes(
    "email_aluno,data_hora,duracao_min",
    "ana@email.com,06/01/2025 07:30,60",
)


# ===================================================================
# POST /import/wizard/preview
# ===================================================================


class TestPreviewEndpoint:
    def test_preview_members_returns_rows(self, client, auth_headers):
        with patch(
            "api.routes.import_wizard.check_existing_members"
        ) as mock_check:
            mock_check.return_value = set()

            response = client.post(
                "/import/wizard/preview",
                headers=auth_headers,
                files={"file": ("alunos.csv", VALID_MEMBERS_CSV, "text/csv")},
                data={"entity_type": "members"},
            )

        assert response.status_code == 200
        body = response.json()
        assert body["entity_type"] == "members"
        assert body["total_rows"] == 2
        assert len(body["rows"]) == 2
        assert body["rows"][0]["name"] == "Ana Souza"
        assert body["rows"][0]["email"] == "ana@email.com"
        assert body["rows"][0]["exists"] is False

    def test_preview_members_marks_existing(self, client, auth_headers):
        with patch(
            "api.routes.import_wizard.check_existing_members"
        ) as mock_check:
            mock_check.return_value = {"ana@email.com"}

            response = client.post(
                "/import/wizard/preview",
                headers=auth_headers,
                files={"file": ("alunos.csv", VALID_MEMBERS_CSV, "text/csv")},
                data={"entity_type": "members"},
            )

        body = response.json()
        ana = next(r for r in body["rows"] if r["email"] == "ana@email.com")
        carlos = next(
            r for r in body["rows"] if r["email"] == "carlos@email.com"
        )
        assert ana["exists"] is True
        assert carlos["exists"] is False

    def test_preview_payments_no_exists_field(self, client, auth_headers):
        response = client.post(
            "/import/wizard/preview",
            headers=auth_headers,
            files={
                "file": ("pagamentos.csv", VALID_PAYMENTS_CSV, "text/csv")
            },
            data={"entity_type": "payments"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["entity_type"] == "payments"
        assert len(body["rows"]) == 1
        assert "exists" not in body["rows"][0]

    def test_preview_checkins(self, client, auth_headers):
        response = client.post(
            "/import/wizard/preview",
            headers=auth_headers,
            files={
                "file": ("checkins.csv", VALID_CHECKINS_CSV, "text/csv")
            },
            data={"entity_type": "checkins"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["entity_type"] == "checkins"
        assert len(body["rows"]) == 1

    def test_preview_invalid_entity_type(self, client, auth_headers):
        response = client.post(
            "/import/wizard/preview",
            headers=auth_headers,
            files={"file": ("test.csv", b"col1\nval", "text/csv")},
            data={"entity_type": "invalid"},
        )

        assert response.status_code == 422
        assert "Invalid entity_type" in response.json()["detail"]

    def test_preview_missing_columns(self, client, auth_headers):
        bad_csv = _csv_bytes("nome,email", "Joao,joao@email.com")

        response = client.post(
            "/import/wizard/preview",
            headers=auth_headers,
            files={"file": ("alunos.csv", bad_csv, "text/csv")},
            data={"entity_type": "members"},
        )

        assert response.status_code == 422
        assert "Missing required columns" in response.json()["detail"]

    def test_preview_returns_parse_errors(self, client, auth_headers):
        csv_with_errors = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            ",bad-email,,99/99/9999,",
            "Ana,ana@email.com,11987654321,05/01/2025,",
        )

        with patch(
            "api.routes.import_wizard.check_existing_members"
        ) as mock_check:
            mock_check.return_value = set()

            response = client.post(
                "/import/wizard/preview",
                headers=auth_headers,
                files={
                    "file": ("alunos.csv", csv_with_errors, "text/csv")
                },
                data={"entity_type": "members"},
            )

        body = response.json()
        assert body["total_rows"] == 2
        assert len(body["rows"]) == 1  # only valid row
        assert len(body["errors"]) > 0

    def test_preview_no_auth_returns_401(self, client):
        response = client.post(
            "/import/wizard/preview",
            files={"file": ("test.csv", b"data", "text/csv")},
            data={"entity_type": "members"},
        )

        assert response.status_code in (401, 422)


# ===================================================================
# POST /import/wizard/commit
# ===================================================================


class TestCommitEndpoint:
    def test_commit_members_only(self, client, auth_headers):
        with patch(
            "api.routes.import_wizard.commit_import"
        ) as mock_commit:
            mock_commit.return_value = {
                "members": LoadResult(inserted=2),
                "payments": LoadResult(),
                "checkins": LoadResult(),
            }

            response = client.post(
                "/import/wizard/commit",
                headers=auth_headers,
                json={
                    "members": [
                        {
                            "name": "Ana",
                            "email": "ana@email.com",
                            "status": "active",
                        },
                        {
                            "name": "Bruno",
                            "email": "bruno@email.com",
                            "status": "active",
                        },
                    ],
                    "payments": [],
                    "checkins": [],
                },
            )

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"
        assert body["members"]["inserted"] == 2
        assert body["payments"]["inserted"] == 0
        assert body["checkins"]["inserted"] == 0

    def test_commit_all_entities(self, client, auth_headers):
        with patch(
            "api.routes.import_wizard.commit_import"
        ) as mock_commit:
            mock_commit.return_value = {
                "members": LoadResult(inserted=1),
                "payments": LoadResult(inserted=3),
                "checkins": LoadResult(inserted=5),
            }

            response = client.post(
                "/import/wizard/commit",
                headers=auth_headers,
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
                            "amount": 149.90,
                            "status": "paid",
                        }
                    ],
                    "checkins": [
                        {
                            "member_email": "ana@email.com",
                            "ts": "2025-01-06T07:30:00",
                        }
                    ],
                },
            )

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"
        assert body["members"]["inserted"] == 1
        assert body["payments"]["inserted"] == 3
        assert body["checkins"]["inserted"] == 5

    def test_commit_partial_errors(self, client, auth_headers):
        with patch(
            "api.routes.import_wizard.commit_import"
        ) as mock_commit:
            mock_commit.return_value = {
                "members": LoadResult(inserted=1, errors=["some error"]),
                "payments": LoadResult(),
                "checkins": LoadResult(),
            }

            response = client.post(
                "/import/wizard/commit",
                headers=auth_headers,
                json={
                    "members": [
                        {
                            "name": "Ana",
                            "email": "ana@email.com",
                            "status": "active",
                        }
                    ],
                },
            )

        body = response.json()
        assert body["status"] == "partial"
        assert len(body["errors"]) == 1

    def test_commit_total_failure(self, client, auth_headers):
        with patch(
            "api.routes.import_wizard.commit_import"
        ) as mock_commit:
            mock_commit.return_value = {
                "members": LoadResult(errors=["fail1", "fail2"]),
                "payments": LoadResult(),
                "checkins": LoadResult(),
            }

            response = client.post(
                "/import/wizard/commit",
                headers=auth_headers,
                json={
                    "members": [
                        {
                            "name": "Ana",
                            "email": "ana@email.com",
                            "status": "active",
                        }
                    ],
                },
            )

        body = response.json()
        assert body["status"] == "error"

    def test_commit_response_schema(self, client, auth_headers):
        with patch(
            "api.routes.import_wizard.commit_import"
        ) as mock_commit:
            mock_commit.return_value = {
                "members": LoadResult(inserted=1),
                "payments": LoadResult(),
                "checkins": LoadResult(),
            }

            response = client.post(
                "/import/wizard/commit",
                headers=auth_headers,
                json={
                    "members": [
                        {
                            "name": "Ana",
                            "email": "ana@email.com",
                            "status": "active",
                        }
                    ],
                },
            )

        body = response.json()
        assert "status" in body
        assert "members" in body
        assert "payments" in body
        assert "checkins" in body
        assert "errors" in body

        for entity in ("members", "payments", "checkins"):
            stats = body[entity]
            assert "inserted" in stats
            assert "updated" in stats
            assert "skipped" in stats

    def test_commit_no_auth_returns_401(self, client):
        response = client.post(
            "/import/wizard/commit",
            json={"members": []},
        )

        assert response.status_code in (401, 422)


# ===================================================================
# GET /import/wizard/template/{entity_type}
# ===================================================================


class TestTemplateEndpoint:
    def test_download_members_template(self, client, auth_headers):
        response = client.get(
            "/import/wizard/template/members",
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]
        assert "attachment" in response.headers.get("content-disposition", "")
        content = response.text
        assert "nome" in content
        assert "email" in content
        assert "Joao Silva" in content

    def test_download_payments_template(self, client, auth_headers):
        response = client.get(
            "/import/wizard/template/payments",
            headers=auth_headers,
        )

        assert response.status_code == 200
        content = response.text
        assert "email_aluno" in content
        assert "vencimento" in content

    def test_download_checkins_template(self, client, auth_headers):
        response = client.get(
            "/import/wizard/template/checkins",
            headers=auth_headers,
        )

        assert response.status_code == 200
        content = response.text
        assert "email_aluno" in content
        assert "data_hora" in content

    def test_invalid_entity_type_returns_404(self, client, auth_headers):
        response = client.get(
            "/import/wizard/template/invalid",
            headers=auth_headers,
        )

        assert response.status_code == 404
