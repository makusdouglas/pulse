"""Tests for api/routes/upload.py — POST /import/csv endpoint."""

import io
from unittest.mock import MagicMock, patch

import pytest


def _csv_bytes(header: str, *rows: str) -> bytes:
    return "\n".join([header] + list(rows)).encode("utf-8")


VALID_MEMBERS_CSV = _csv_bytes(
    "nome,email,telefone,matricula_em,cancelamento_em",
    "Joao Silva,joao@email.com,11999887766,15/03/2024,",
)


class TestImportCSVEndpoint:
    def test_valid_members_import(self, client, auth_headers):
        with patch("api.routes.upload.load_csv_data") as mock_load:
            from use_cases.csv_loader import LoadResult

            mock_load.return_value = LoadResult(inserted=1, updated=0, skipped=0)

            response = client.post(
                "/import/csv",
                headers=auth_headers,
                files={"file": ("alunos.csv", VALID_MEMBERS_CSV, "text/csv")},
                data={"entity_type": "members"},
            )

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"
        assert body["entity_type"] == "members"
        assert body["stats"]["inserted"] == 1
        assert body["stats"]["total_rows"] == 1

    def test_invalid_entity_type(self, client, auth_headers):
        response = client.post(
            "/import/csv",
            headers=auth_headers,
            files={"file": ("test.csv", b"col1\nval", "text/csv")},
            data={"entity_type": "invalid"},
        )

        assert response.status_code == 422
        assert "Invalid entity_type" in response.json()["detail"]

    def test_missing_columns(self, client, auth_headers):
        bad_csv = _csv_bytes("nome,email", "Joao,joao@email.com")

        response = client.post(
            "/import/csv",
            headers=auth_headers,
            files={"file": ("alunos.csv", bad_csv, "text/csv")},
            data={"entity_type": "members"},
        )

        assert response.status_code == 422
        assert "Missing required columns" in response.json()["detail"]

    def test_no_auth_returns_401(self, client):
        response = client.post(
            "/import/csv",
            files={"file": ("test.csv", b"data", "text/csv")},
            data={"entity_type": "members"},
        )

        assert response.status_code in (401, 422)

    def test_unsupported_content_type(self, client, auth_headers):
        response = client.post(
            "/import/csv",
            headers=auth_headers,
            files={"file": ("test.json", b"{}", "application/json")},
            data={"entity_type": "members"},
        )

        assert response.status_code == 422
        assert "Unsupported file type" in response.json()["detail"]

    def test_all_rows_invalid_returns_error_status(self, client, auth_headers):
        bad_csv = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            ",bad-email,,99/99/9999,",
        )

        with patch("api.routes.upload.load_csv_data") as mock_load:
            response = client.post(
                "/import/csv",
                headers=auth_headers,
                files={"file": ("alunos.csv", bad_csv, "text/csv")},
                data={"entity_type": "members"},
            )

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "error"
        assert body["stats"]["error_count"] > 0
        assert body["stats"]["inserted"] == 0

    def test_response_schema_structure(self, client, auth_headers):
        with patch("api.routes.upload.load_csv_data") as mock_load:
            from use_cases.csv_loader import LoadResult

            mock_load.return_value = LoadResult(inserted=1)

            response = client.post(
                "/import/csv",
                headers=auth_headers,
                files={"file": ("alunos.csv", VALID_MEMBERS_CSV, "text/csv")},
                data={"entity_type": "members"},
            )

        body = response.json()
        assert "status" in body
        assert "entity_type" in body
        assert "stats" in body
        assert "errors" in body

        stats = body["stats"]
        assert "inserted" in stats
        assert "updated" in stats
        assert "skipped" in stats
        assert "total_rows" in stats
        assert "error_count" in stats

    def test_checkins_entity_type_accepted(self, client, auth_headers):
        csv = _csv_bytes(
            "email_aluno,data_hora,duracao_min",
            "joao@email.com,15/03/2024 08:30,65",
        )

        with patch("api.routes.upload.load_csv_data") as mock_load:
            from use_cases.csv_loader import LoadResult

            mock_load.return_value = LoadResult(inserted=1)

            response = client.post(
                "/import/csv",
                headers=auth_headers,
                files={"file": ("checkins.csv", csv, "text/csv")},
                data={"entity_type": "checkins"},
            )

        assert response.status_code == 200
        assert response.json()["entity_type"] == "checkins"

    def test_payments_entity_type_accepted(self, client, auth_headers):
        csv = _csv_bytes(
            "email_aluno,vencimento,pago_em,valor,status",
            "joao@email.com,10/04/2024,08/04/2024,149.90,pago",
        )

        with patch("api.routes.upload.load_csv_data") as mock_load:
            from use_cases.csv_loader import LoadResult

            mock_load.return_value = LoadResult(inserted=1)

            response = client.post(
                "/import/csv",
                headers=auth_headers,
                files={"file": ("pagamentos.csv", csv, "text/csv")},
                data={"entity_type": "payments"},
            )

        assert response.status_code == 200
        assert response.json()["entity_type"] == "payments"
