"""End-to-end lifecycle test — import -> score -> dashboard -> actions."""

import pathlib

import pytest

pytestmark = pytest.mark.integration

_CSV_DIR = pathlib.Path(__file__).parent / "csv_fixtures"


def _upload_csv(client, headers, entity_type: str, filename: str):
    filepath = _CSV_DIR / filename
    with open(filepath, "rb") as f:
        return client.post(
            "/import/csv",
            headers=headers,
            files={"file": (filename, f, "text/csv")},
            data={"entity_type": entity_type},
        )


class TestFullLifecycle:
    def test_import_score_dashboard_actions(self, client_a):
        """Complete flow: import CSV data -> score -> check dashboard -> create action."""
        client, headers = client_a

        # 1. Import members
        resp = _upload_csv(client, headers, "members", "members.csv")
        assert resp.status_code == 200
        assert resp.json()["stats"]["inserted"] == 3

        # 2. Import checkins
        resp = _upload_csv(client, headers, "checkins", "checkins.csv")
        assert resp.status_code == 200
        assert resp.json()["stats"]["inserted"] == 6

        # 3. Import payments
        resp = _upload_csv(client, headers, "payments", "payments.csv")
        assert resp.status_code == 200
        assert resp.json()["stats"]["inserted"] == 3

        # 4. List members — verify all 3 imported
        resp = client.get("/members", headers=headers)
        data = resp.json()
        assert data["total"] == 3
        members = {m["email"]: m for m in data["members"]}
        assert "ana@test.com" in members
        assert "bruno@test.com" in members
        assert "carla@test.com" in members

        ana_id = members["ana@test.com"]["id"]
        bruno_id = members["bruno@test.com"]["id"]

        # 5. Score Ana (5 checkins, paid payment — lower risk)
        resp = client.get(f"/members/{ana_id}/score", headers=headers)
        assert resp.status_code == 200
        ana_score = resp.json()
        assert ana_score["member"]["email"] == "ana@test.com"
        assert 0 <= ana_score["score"] <= 100
        assert ana_score["tier"] in ("critical", "medium", "low", "safe")

        # 6. Score Bruno (1 checkin, overdue payment — higher risk)
        resp = client.get(f"/members/{bruno_id}/score", headers=headers)
        assert resp.status_code == 200
        bruno_score = resp.json()
        assert bruno_score["score"] >= ana_score["score"]

        # 7. Check dashboard stats
        resp = client.get("/dashboard/stats", headers=headers)
        assert resp.status_code == 200
        dashboard = resp.json()
        assert dashboard["total_members"] == 3
        assert dashboard["active_members"] == 3

        # 8. Check at-risk endpoint
        resp = client.get("/at-risk", headers=headers)
        assert resp.status_code == 200

        # 9. Create a retention action for Bruno
        resp = client.post(
            "/actions",
            headers=headers,
            json={
                "member_id": bruno_id,
                "action_type": "contact",
                "channel": "whatsapp",
                "message": "Bruno, sentimos sua falta! Volte a treinar conosco.",
            },
        )
        assert resp.status_code == 201
        action = resp.json()
        assert action["member_name"] == "Bruno Costa"

        # 10. Verify action appears in list
        resp = client.get("/actions", headers=headers)
        data = resp.json()
        assert data["total"] == 1
        assert data["actions"][0]["channel"] == "whatsapp"

        # 11. Check payments
        resp = client.get("/payments", headers=headers)
        data = resp.json()
        assert data["total"] == 3
