import contextlib
from unittest.mock import MagicMock

import pytest

from api.deps import get_db


def _make_mock_request():
    """Create a mock Request with state attribute."""
    request = MagicMock()
    request.state = MagicMock()
    return request


class TestGetDb:
    def test_sets_local_and_yields_session(self, monkeypatch, gym_id):
        mock_session = MagicMock()
        monkeypatch.setattr("api.deps.SessionLocal", lambda: mock_session)
        monkeypatch.setattr("api.deps._resolve_gym_id", lambda db, org_id: gym_id)

        request = _make_mock_request()
        gen = get_db(request=request, clerk_org_id=gym_id)
        session = next(gen)

        assert session is mock_session
        assert request.state.gym_uuid == gym_id
        mock_session.execute.assert_called_once()
        call_args = mock_session.execute.call_args
        sql_text = str(call_args[0][0])
        assert "SET LOCAL app.current_gym_id" in sql_text

        with contextlib.suppress(StopIteration):
            next(gen)

        mock_session.commit.assert_called_once()
        mock_session.close.assert_called_once()

    def test_rollbacks_on_exception(self, monkeypatch, gym_id):
        mock_session = MagicMock()
        monkeypatch.setattr("api.deps.SessionLocal", lambda: mock_session)
        monkeypatch.setattr("api.deps._resolve_gym_id", lambda db, org_id: gym_id)

        request = _make_mock_request()
        gen = get_db(request=request, clerk_org_id=gym_id)
        next(gen)

        with pytest.raises(ValueError):
            gen.throw(ValueError("test error"))

        mock_session.rollback.assert_called_once()
        mock_session.close.assert_called_once()
        mock_session.commit.assert_not_called()
