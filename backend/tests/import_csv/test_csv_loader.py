"""Tests for use_cases/csv_loader.py — DB loading with mock sessions."""

import uuid
from collections import namedtuple
from datetime import date, datetime
from unittest.mock import MagicMock, call

import pytest

from use_cases.csv_loader import (
    LoadResult,
    load_checkins,
    load_csv_data,
    load_members,
    load_payments,
)


@pytest.fixture
def db():
    return MagicMock()


@pytest.fixture
def gym_id():
    return str(uuid.uuid4())


# ===================================================================
# load_members
# ===================================================================


class TestLoadMembers:
    def test_insert_new_member(self, db, gym_id):
        db.execute.return_value.fetchone.return_value = None  # no existing

        rows = [
            {
                "name": "Joao Silva",
                "email": "joao@email.com",
                "phone": "11999887766",
                "enrolled_at": date(2024, 3, 15),
                "cancelled_at": None,
                "status": "active",
            }
        ]

        result = load_members(db, gym_id, rows)

        assert result.inserted == 1
        assert result.updated == 0
        assert result.errors == []
        assert db.execute.call_count == 2  # SELECT + INSERT

    def test_update_existing_member(self, db, gym_id):
        MemberRow = namedtuple("MemberRow", ["id"])
        db.execute.return_value.fetchone.return_value = MemberRow(
            id=uuid.uuid4()
        )

        rows = [
            {
                "name": "Joao Updated",
                "email": "joao@email.com",
                "phone": "11999000000",
                "enrolled_at": date(2024, 3, 15),
                "cancelled_at": None,
                "status": "active",
            }
        ]

        result = load_members(db, gym_id, rows)

        assert result.inserted == 0
        assert result.updated == 1
        assert result.errors == []

    def test_multiple_members_mixed(self, db, gym_id):
        """First member exists (update), second is new (insert)."""
        MemberRow = namedtuple("MemberRow", ["id"])
        db.execute.return_value.fetchone.side_effect = [
            MemberRow(id=uuid.uuid4()),  # first: exists
            None,  # second: new
        ]

        rows = [
            {
                "name": "Joao",
                "email": "joao@email.com",
                "phone": None,
                "enrolled_at": None,
                "cancelled_at": None,
                "status": "active",
            },
            {
                "name": "Maria",
                "email": "maria@email.com",
                "phone": None,
                "enrolled_at": None,
                "cancelled_at": None,
                "status": "active",
            },
        ]

        result = load_members(db, gym_id, rows)

        assert result.updated == 1
        assert result.inserted == 1

    def test_db_error_captured(self, db, gym_id):
        db.execute.side_effect = Exception("DB connection failed")

        rows = [
            {
                "name": "Joao",
                "email": "joao@email.com",
                "phone": None,
                "enrolled_at": None,
                "cancelled_at": None,
                "status": "active",
            }
        ]

        result = load_members(db, gym_id, rows)

        assert result.inserted == 0
        assert len(result.errors) == 1
        assert "joao@email.com" in result.errors[0]


# ===================================================================
# load_checkins
# ===================================================================


class TestLoadCheckins:
    def _mock_resolve(self, db, email_map: dict):
        """Configure db.execute to return member lookup results."""
        ResolveRow = namedtuple("ResolveRow", ["id", "email"])

        def side_effect(query, params=None):
            mock_result = MagicMock()
            sql_str = str(query)
            if "SELECT id, email FROM members" in sql_str:
                mock_result.fetchall.return_value = [
                    ResolveRow(id=mid, email=email)
                    for email, mid in email_map.items()
                ]
            return mock_result

        db.execute.side_effect = side_effect

    def test_insert_checkins(self, db, gym_id):
        member_id = str(uuid.uuid4())
        self._mock_resolve(db, {"joao@email.com": member_id})

        rows = [
            {
                "member_email": "joao@email.com",
                "ts": datetime(2024, 3, 15, 8, 30),
                "duration_min": 65,
            }
        ]

        result = load_checkins(db, gym_id, rows)

        assert result.inserted == 1
        assert result.skipped == 0

    def test_skip_unknown_member(self, db, gym_id):
        self._mock_resolve(db, {})  # no members found

        rows = [
            {
                "member_email": "unknown@email.com",
                "ts": datetime(2024, 3, 15, 8, 30),
                "duration_min": 65,
            }
        ]

        result = load_checkins(db, gym_id, rows)

        assert result.inserted == 0
        assert result.skipped == 1
        assert "unknown@email.com" in result.errors[0]

    def test_mixed_found_and_missing(self, db, gym_id):
        member_id = str(uuid.uuid4())
        self._mock_resolve(db, {"joao@email.com": member_id})

        rows = [
            {
                "member_email": "joao@email.com",
                "ts": datetime(2024, 3, 15, 8, 30),
                "duration_min": 65,
            },
            {
                "member_email": "missing@email.com",
                "ts": datetime(2024, 3, 16, 19, 0),
                "duration_min": 45,
            },
        ]

        result = load_checkins(db, gym_id, rows)

        assert result.inserted == 1
        assert result.skipped == 1


# ===================================================================
# load_payments
# ===================================================================


class TestLoadPayments:
    def _mock_resolve(self, db, email_map: dict):
        ResolveRow = namedtuple("ResolveRow", ["id", "email"])

        def side_effect(query, params=None):
            mock_result = MagicMock()
            sql_str = str(query)
            if "SELECT id, email FROM members" in sql_str:
                mock_result.fetchall.return_value = [
                    ResolveRow(id=mid, email=email)
                    for email, mid in email_map.items()
                ]
            return mock_result

        db.execute.side_effect = side_effect

    def test_insert_payments(self, db, gym_id):
        member_id = str(uuid.uuid4())
        self._mock_resolve(db, {"joao@email.com": member_id})

        rows = [
            {
                "member_email": "joao@email.com",
                "due_date": date(2024, 4, 10),
                "paid_at": date(2024, 4, 8),
                "amount": 149.90,
                "status": "paid",
            }
        ]

        result = load_payments(db, gym_id, rows)

        assert result.inserted == 1
        assert result.skipped == 0

    def test_skip_unknown_member(self, db, gym_id):
        self._mock_resolve(db, {})

        rows = [
            {
                "member_email": "ghost@email.com",
                "due_date": date(2024, 4, 10),
                "paid_at": None,
                "amount": 149.90,
                "status": "pending",
            }
        ]

        result = load_payments(db, gym_id, rows)

        assert result.inserted == 0
        assert result.skipped == 1
        assert "ghost@email.com" in result.errors[0]


# ===================================================================
# load_csv_data (router)
# ===================================================================


class TestLoadCsvData:
    def test_routes_to_members(self, db, gym_id):
        db.execute.return_value.fetchone.return_value = None
        rows = [
            {
                "name": "Test",
                "email": "test@test.com",
                "phone": None,
                "enrolled_at": None,
                "cancelled_at": None,
                "status": "active",
            }
        ]
        result = load_csv_data(db, gym_id, "members", rows)
        assert isinstance(result, LoadResult)
        assert result.inserted == 1

    def test_unknown_entity_type_raises(self, db, gym_id):
        with pytest.raises(ValueError, match="Unknown entity type"):
            load_csv_data(db, gym_id, "unknown", [])
