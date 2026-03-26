"""Tests for API endpoints — members, at-risk, dashboard."""

from datetime import date
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Helpers — mock DB rows as SimpleNamespace (attribute-access like real rows)
# ---------------------------------------------------------------------------
def _member_row(**overrides):
    defaults = {
        "id": "aaaaaaaa-1111-2222-3333-444444444444",
        "name": "Joao Silva",
        "email": "joao@email.com",
        "phone": "11999887766",
        "status": "active",
        "enrolled_at": date(2024, 3, 15),
        "cancelled_at": None,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _score_row(**overrides):
    defaults = {
        "member_id": "aaaaaaaa-1111-2222-3333-444444444444",
        "member_name": "Joao Silva",
        "score": 45,
        "tier": "medium",
        "reasons": ["Sem treinar ha 20 dias"],
        "computed_at": date(2026, 3, 25),
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _tier_counts_row(**overrides):
    defaults = {"critical": 2, "medium": 5, "low": 3, "safe": 10}
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _member_counts_row(**overrides):
    defaults = {"total_members": 50, "active_members": 40}
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _score_stats_row(**overrides):
    defaults = {
        "at_risk_count": 10,
        "critical": 2,
        "medium": 5,
        "low": 3,
        "safe": 30,
        "avg_score": 25.5,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _setup_db_responses(mock_session, calls):
    """Configure mock_session.execute to return different results per call.

    The first call is always SET LOCAL from get_db (deps.py), so we prepend
    a no-op result for it automatically.

    Each item in `calls` is a dict with optional keys:
      - "scalar": value for .scalar()
      - "fetchone": value for .fetchone()
      - "fetchall": value for .fetchall()
    """
    results = [MagicMock()]  # SET LOCAL app.current_gym_id
    for c in calls:
        result_mock = MagicMock()
        result_mock.scalar.return_value = c.get("scalar")
        result_mock.fetchone.return_value = c.get("fetchone")
        result_mock.fetchall.return_value = c.get("fetchall", [])
        results.append(result_mock)
    mock_session.execute.side_effect = results


# ===================================================================
# GET /members
# ===================================================================
class TestListMembers:
    def test_returns_paginated_members(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 2},  # COUNT(*)
            {"fetchall": [_member_row(), _member_row(id="bbbb", name="Maria Santos")]},
        ])

        response = client.get("/members", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 2
        assert body["page"] == 1
        assert body["page_size"] == 20
        assert len(body["members"]) == 2
        assert body["members"][0]["name"] == "Joao Silva"

    def test_pagination_page_2(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 25},
            {"fetchall": [_member_row(name="Page 2 Member")]},
        ])

        response = client.get("/members?page=2&page_size=10", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 25
        assert body["page"] == 2
        assert body["page_size"] == 10

    def test_search_filter(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 1},
            {"fetchall": [_member_row(name="Joao Silva")]},
        ])

        response = client.get("/members?search=joao", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()["members"]) == 1

    def test_status_filter(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 1},
            {"fetchall": [_member_row(status="cancelled")]},
        ])

        response = client.get("/members?status=cancelled", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["members"][0]["status"] == "cancelled"

    def test_empty_result(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 0},
            {"fetchall": []},
        ])

        response = client.get("/members", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 0
        assert body["members"] == []

    def test_page_size_capped_at_100(self, client, auth_headers):
        response = client.get("/members?page_size=200", headers=auth_headers)
        assert response.status_code == 422

    def test_no_auth_returns_error(self, client):
        response = client.get("/members")
        assert response.status_code in (401, 422)

    def test_response_schema_structure(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"scalar": 1},
            {"fetchall": [_member_row()]},
        ])

        body = client.get("/members", headers=auth_headers).json()
        assert "members" in body
        assert "total" in body
        assert "page" in body
        assert "page_size" in body

        member = body["members"][0]
        assert "id" in member
        assert "name" in member
        assert "email" in member
        assert "status" in member


# ===================================================================
# GET /members/{member_id}/score
# ===================================================================
class TestGetMemberScore:
    def test_returns_score_for_existing_member(
        self, client, auth_headers, mock_session_local
    ):
        member = _member_row()
        # First call: fetch member row
        _setup_db_responses(mock_session_local, [
            {"fetchone": member},
        ])

        from use_cases.calculate_score import ChurnScore, ChurnSignals

        mock_result = ChurnScore(
            member_id=str(member.id),
            score=45,
            tier="medium",
            reasons=["Sem treinar ha 20 dias"],
            signals=ChurnSignals(dias_sem_treino=40, baixa_frequencia=10),
        )

        with patch("api.routes.members.score_member", return_value=mock_result):
            response = client.get(
                f"/members/{member.id}/score", headers=auth_headers
            )

        assert response.status_code == 200
        body = response.json()
        assert body["score"] == 45
        assert body["tier"] == "medium"
        assert len(body["reasons"]) == 1
        assert body["signals"]["dias_sem_treino"] == 40
        assert body["signals"]["baixa_frequencia"] == 10
        assert body["member"]["name"] == "Joao Silva"

    def test_404_member_not_found(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"fetchone": None},
        ])

        response = client.get(
            "/members/nonexistent-id/score", headers=auth_headers
        )
        assert response.status_code == 404

    def test_404_score_member_returns_none(
        self, client, auth_headers, mock_session_local
    ):
        _setup_db_responses(mock_session_local, [
            {"fetchone": _member_row()},
        ])

        with patch("api.routes.members.score_member", return_value=None):
            response = client.get(
                "/members/aaaaaaaa-1111-2222-3333-444444444444/score",
                headers=auth_headers,
            )

        assert response.status_code == 404

    def test_response_includes_signals_breakdown(
        self, client, auth_headers, mock_session_local
    ):
        _setup_db_responses(mock_session_local, [
            {"fetchone": _member_row()},
        ])

        from use_cases.calculate_score import ChurnScore, ChurnSignals

        mock_result = ChurnScore(
            member_id="aaaaaaaa-1111-2222-3333-444444444444",
            score=70,
            tier="critical",
            reasons=["Sem treinar ha 20 dias", "2 pagamento(s) em atraso"],
            signals=ChurnSignals(dias_sem_treino=40, inadimplencia=20, baixa_frequencia=10),
        )

        with patch("api.routes.members.score_member", return_value=mock_result):
            body = client.get(
                "/members/aaaaaaaa-1111-2222-3333-444444444444/score",
                headers=auth_headers,
            ).json()

        signals = body["signals"]
        assert signals["dias_sem_treino"] == 40
        assert signals["inadimplencia"] == 20
        assert signals["queda_frequencia"] == 0
        assert signals["queda_duracao"] == 0


# ===================================================================
# GET /at-risk
# ===================================================================
class TestListAtRisk:
    def test_returns_at_risk_members(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"fetchone": _tier_counts_row()},     # tier counts
            {"scalar": 2},                         # total count
            {"fetchall": [                          # member rows
                _score_row(score=80, tier="critical"),
                _score_row(member_id="bbbb", member_name="Maria", score=35, tier="medium"),
            ]},
        ])

        response = client.get("/at-risk", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 2
        assert len(body["members"]) == 2
        assert body["members"][0]["score"] == 80
        assert body["tier_counts"]["critical"] == 2
        assert body["tier_counts"]["medium"] == 5

    def test_tier_filter(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"fetchone": _tier_counts_row()},
            {"scalar": 2},
            {"fetchall": [
                _score_row(score=80, tier="critical"),
                _score_row(member_id="bbbb", score=70, tier="critical"),
            ]},
        ])

        response = client.get("/at-risk?tier=critical", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert all(m["tier"] == "critical" for m in body["members"])

    def test_invalid_tier_rejected(self, client, auth_headers):
        response = client.get("/at-risk?tier=invalid", headers=auth_headers)
        assert response.status_code == 422

    def test_pagination(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"fetchone": _tier_counts_row()},
            {"scalar": 25},
            {"fetchall": [_score_row()]},
        ])

        response = client.get("/at-risk?page=2&page_size=10", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["page"] == 2
        assert body["page_size"] == 10
        assert body["total"] == 25

    def test_empty_result(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"fetchone": _tier_counts_row(critical=0, medium=0, low=0, safe=0)},
            {"scalar": 0},
            {"fetchall": []},
        ])

        response = client.get("/at-risk", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 0
        assert body["members"] == []

    def test_response_schema_structure(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"fetchone": _tier_counts_row()},
            {"scalar": 1},
            {"fetchall": [_score_row()]},
        ])

        body = client.get("/at-risk", headers=auth_headers).json()
        assert "members" in body
        assert "total" in body
        assert "page" in body
        assert "page_size" in body
        assert "tier_counts" in body

        member = body["members"][0]
        assert "member_id" in member
        assert "member_name" in member
        assert "score" in member
        assert "tier" in member
        assert "reasons" in member


# ===================================================================
# GET /dashboard/stats
# ===================================================================
class TestDashboardStats:
    def test_returns_dashboard_stats(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"fetchone": _member_counts_row()},      # member counts
            {"fetchone": _score_stats_row()},          # score stats
            {"fetchall": [_score_row(), _score_row(member_id="bbbb", score=80)]},  # recent
        ])

        response = client.get("/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["total_members"] == 50
        assert body["active_members"] == 40
        assert body["at_risk_count"] == 10
        assert body["avg_score"] == 25.5

    def test_tier_counts(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"fetchone": _member_counts_row()},
            {"fetchone": _score_stats_row(critical=3, medium=7, low=5, safe=25)},
            {"fetchall": []},
        ])

        body = client.get("/dashboard/stats", headers=auth_headers).json()
        assert body["tier_counts"]["critical"] == 3
        assert body["tier_counts"]["medium"] == 7
        assert body["tier_counts"]["low"] == 5
        assert body["tier_counts"]["safe"] == 25

    def test_recent_scores(self, client, auth_headers, mock_session_local):
        recent = [
            _score_row(member_name=f"Member {i}", score=90 - i * 10)
            for i in range(3)
        ]
        _setup_db_responses(mock_session_local, [
            {"fetchone": _member_counts_row()},
            {"fetchone": _score_stats_row()},
            {"fetchall": recent},
        ])

        body = client.get("/dashboard/stats", headers=auth_headers).json()
        assert len(body["recent_scores"]) == 3
        assert body["recent_scores"][0]["member_name"] == "Member 0"
        assert body["recent_scores"][0]["score"] == 90

    def test_empty_gym(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"fetchone": _member_counts_row(total_members=0, active_members=0)},
            {"fetchone": _score_stats_row(
                at_risk_count=0, critical=0, medium=0, low=0, safe=0, avg_score=0.0
            )},
            {"fetchall": []},
        ])

        body = client.get("/dashboard/stats", headers=auth_headers).json()
        assert body["total_members"] == 0
        assert body["active_members"] == 0
        assert body["at_risk_count"] == 0
        assert body["avg_score"] == 0.0
        assert body["recent_scores"] == []

    def test_response_schema_structure(self, client, auth_headers, mock_session_local):
        _setup_db_responses(mock_session_local, [
            {"fetchone": _member_counts_row()},
            {"fetchone": _score_stats_row()},
            {"fetchall": []},
        ])

        body = client.get("/dashboard/stats", headers=auth_headers).json()
        assert "total_members" in body
        assert "active_members" in body
        assert "at_risk_count" in body
        assert "tier_counts" in body
        assert "avg_score" in body
        assert "recent_scores" in body
