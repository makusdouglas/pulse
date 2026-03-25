import sys
import uuid
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

# Mock psycopg2 before any import of infra.database triggers engine creation.
# This avoids needing Postgres C libraries installed for unit tests.
_psycopg2_mock = MagicMock()
_psycopg2_mock.connect.return_value = MagicMock()
_psycopg2_mock.extensions = MagicMock()
_psycopg2_mock.extensions.POLL_OK = 1
_psycopg2_mock.paramstyle = "pyformat"
sys.modules.setdefault("psycopg2", _psycopg2_mock)
sys.modules.setdefault("psycopg2.extensions", _psycopg2_mock.extensions)
sys.modules.setdefault("psycopg2.extras", MagicMock())


@pytest.fixture
def gym_id():
    return str(uuid.uuid4())


@pytest.fixture
def mock_jwt_payload(gym_id):
    return {
        "sub": "user_abc123",
        "org_id": gym_id,
        "exp": 9999999999,
        "iat": 1700000000,
    }


@pytest.fixture
def mock_decode_clerk_jwt(monkeypatch, mock_jwt_payload):
    """Patches decode_clerk_jwt globally so auth always succeeds with mock payload."""

    def _fake_decode(token: str) -> dict:
        return mock_jwt_payload

    monkeypatch.setattr("api.auth.decode_clerk_jwt", _fake_decode)
    monkeypatch.setattr("api.middleware.decode_clerk_jwt", _fake_decode)
    monkeypatch.setattr("api.deps.decode_clerk_jwt", _fake_decode)
    return _fake_decode


@pytest.fixture
def mock_session_local(monkeypatch):
    """Patches SessionLocal in deps to return a mock DB session."""
    mock_session = MagicMock()
    mock_session.execute = MagicMock()
    mock_session.commit = MagicMock()
    mock_session.rollback = MagicMock()
    mock_session.close = MagicMock()

    monkeypatch.setattr("api.deps.SessionLocal", lambda: mock_session)
    return mock_session


@pytest.fixture
def client(mock_decode_clerk_jwt, mock_session_local):
    """TestClient with mocked auth and DB."""
    from api.main import app

    return TestClient(app)


@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer fake-jwt-token"}
