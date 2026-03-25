import contextlib
from unittest.mock import MagicMock

import pytest

from api.deps import get_db


class TestGetDb:
    def test_sets_local_and_yields_session(self, monkeypatch, gym_id):
        mock_session = MagicMock()
        monkeypatch.setattr("api.deps.SessionLocal", lambda: mock_session)

        gen = get_db(gym_id=gym_id)
        session = next(gen)

        assert session is mock_session
        mock_session.execute.assert_called_once()
        call_args = mock_session.execute.call_args
        sql_text = str(call_args[0][0])
        assert "SET LOCAL app.current_gym_id" in sql_text
        params = call_args[0][1] if len(call_args[0]) > 1 else call_args[1]
        assert params["gym_id"] == gym_id

        with contextlib.suppress(StopIteration):
            next(gen)

        mock_session.commit.assert_called_once()
        mock_session.close.assert_called_once()

    def test_rollbacks_on_exception(self, monkeypatch, gym_id):
        mock_session = MagicMock()
        monkeypatch.setattr("api.deps.SessionLocal", lambda: mock_session)

        gen = get_db(gym_id=gym_id)
        next(gen)

        with pytest.raises(ValueError):
            gen.throw(ValueError("test error"))

        mock_session.rollback.assert_called_once()
        mock_session.close.assert_called_once()
        mock_session.commit.assert_not_called()
