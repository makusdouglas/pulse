"""Integration tests for CSV import flow — POST /import/csv."""

import pathlib

import pytest

pytestmark = pytest.mark.integration

_CSV_DIR = pathlib.Path(__file__).parent / "csv_fixtures"


def _upload_csv(client, headers, entity_type: str, filename: str):
    """Helper to POST a CSV file to /import/csv."""
    filepath = _CSV_DIR / filename
    with open(filepath, "rb") as f:
        return client.post(
            "/import/csv",
            headers=headers,
            files={"file": (filename, f, "text/csv")},
            data={"entity_type": entity_type},
        )


class TestImportMembers:
    def test_import_members_csv(self, client_a):
        client, headers = client_a
        resp = _upload_csv(client, headers, "members", "members.csv")
        assert resp.status_code == 200
        data = resp.json()
        assert data["entity_type"] == "members"
        assert data["stats"]["total_rows"] == 3
        assert data["stats"]["inserted"] == 3
        assert data["stats"]["skipped"] == 0

    def test_import_members_duplicate_upserts(self, client_a):
        client, headers = client_a
        _upload_csv(client, headers, "members", "members.csv")
        resp = _upload_csv(client, headers, "members", "members.csv")
        data = resp.json()
        assert data["stats"]["total_rows"] == 3
        assert data["stats"]["updated"] == 3
        assert data["stats"]["inserted"] == 0

        members_resp = client.get("/members", headers=headers)
        assert members_resp.json()["total"] == 3


class TestImportCheckins:
    def test_import_checkins_links_to_members(self, client_a):
        client, headers = client_a
        _upload_csv(client, headers, "members", "members.csv")
        resp = _upload_csv(client, headers, "checkins", "checkins.csv")
        assert resp.status_code == 200
        data = resp.json()
        assert data["entity_type"] == "checkins"
        assert data["stats"]["inserted"] == 6

    def test_import_checkins_skips_unknown_emails(self, client_a):
        client, headers = client_a
        resp = _upload_csv(client, headers, "checkins", "checkins.csv")
        assert resp.status_code == 200
        data = resp.json()
        assert data["stats"]["inserted"] == 0
        assert data["stats"]["skipped"] == 6


class TestImportPayments:
    def test_import_payments_links_to_members(self, client_a):
        client, headers = client_a
        _upload_csv(client, headers, "members", "members.csv")
        resp = _upload_csv(client, headers, "payments", "payments.csv")
        assert resp.status_code == 200
        data = resp.json()
        assert data["entity_type"] == "payments"
        assert data["stats"]["inserted"] == 3


class TestImportValidation:
    def test_import_invalid_entity_type(self, client_a):
        client, headers = client_a
        filepath = _CSV_DIR / "members.csv"
        with open(filepath, "rb") as f:
            resp = client.post(
                "/import/csv",
                headers=headers,
                files={"file": ("members.csv", f, "text/csv")},
                data={"entity_type": "invalid"},
            )
        assert resp.status_code == 422
