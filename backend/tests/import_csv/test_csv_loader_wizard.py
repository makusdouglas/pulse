"""Tests for wizard-specific functions in use_cases/csv_loader.py."""

import uuid
from collections import namedtuple
from datetime import date, datetime
from unittest.mock import MagicMock

import pytest

from use_cases.csv_loader import (
    LoadResult,
    check_existing_members,
    commit_import,
)


@pytest.fixture
def db():
    return MagicMock()


@pytest.fixture
def gym_id():
    return str(uuid.uuid4())


# ===================================================================
# check_existing_members
# ===================================================================


class TestCheckExistingMembers:
    def test_returns_existing_emails(self, db, gym_id):
        EmailRow = namedtuple("EmailRow", ["email"])
        db.execute.return_value.fetchall.return_value = [
            EmailRow(email="joao@email.com"),
            EmailRow(email="maria@email.com"),
        ]

        result = check_existing_members(
            db, gym_id, ["joao@email.com", "maria@email.com", "new@email.com"]
        )

        assert result == {"joao@email.com", "maria@email.com"}

    def test_empty_emails_returns_empty_set(self, db, gym_id):
        result = check_existing_members(db, gym_id, [])
        assert result == set()
        db.execute.assert_not_called()

    def test_no_matches_returns_empty_set(self, db, gym_id):
        db.execute.return_value.fetchall.return_value = []

        result = check_existing_members(db, gym_id, ["new@email.com"])
        assert result == set()


# ===================================================================
# commit_import
# ===================================================================


class TestCommitImport:
    def _make_member_row(self, name="Joao", email="joao@email.com"):
        return {
            "name": name,
            "email": email,
            "phone": None,
            "enrolled_at": None,
            "cancelled_at": None,
            "status": "active",
        }

    def test_empty_import_returns_empty_results(self, db, gym_id):
        results = commit_import(db, gym_id, [], [], [])

        assert results["members"].inserted == 0
        assert results["payments"].inserted == 0
        assert results["checkins"].inserted == 0

    def test_members_only(self, db, gym_id):
        WasInsertedRow = namedtuple("WasInsertedRow", ["was_inserted"])
        db.execute.return_value.fetchall.return_value = [
            WasInsertedRow(was_inserted=True),
        ]

        members = [self._make_member_row()]
        results = commit_import(db, gym_id, members, [], [])

        assert results["members"].inserted == 1
        assert results["payments"].inserted == 0
        assert results["checkins"].inserted == 0

    def test_all_entities(self, db, gym_id):
        member_id = str(uuid.uuid4())
        WasInsertedRow = namedtuple("WasInsertedRow", ["was_inserted"])
        ResolveRow = namedtuple("ResolveRow", ["id", "email"])

        def side_effect(query, params=None):
            mock_result = MagicMock()
            sql_str = str(query)

            if "INSERT INTO members" in sql_str:
                mock_result.fetchall.return_value = [
                    WasInsertedRow(was_inserted=True),
                ]
            elif "SELECT id, email FROM members" in sql_str:
                mock_result.fetchall.return_value = [
                    ResolveRow(id=member_id, email="joao@email.com")
                ]
            return mock_result

        db.execute.side_effect = side_effect

        members = [self._make_member_row()]
        payments = [
            {
                "member_email": "joao@email.com",
                "due_date": date(2025, 1, 10),
                "paid_at": date(2025, 1, 8),
                "amount": 149.90,
                "status": "paid",
            }
        ]
        checkins = [
            {
                "member_email": "joao@email.com",
                "ts": datetime(2025, 1, 6, 7, 30),
                "duration_min": 60,
            }
        ]

        results = commit_import(db, gym_id, members, payments, checkins)

        assert results["members"].inserted == 1
        assert results["payments"].inserted == 1
        assert results["checkins"].inserted == 1

    def test_returns_dict_with_three_keys(self, db, gym_id):
        results = commit_import(db, gym_id, [], [], [])

        assert set(results.keys()) == {"members", "payments", "checkins"}
        for v in results.values():
            assert isinstance(v, LoadResult)
