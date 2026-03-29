import os
import sys
import uuid
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

# Skip mocking when running integration tests (they need real psycopg2 + celery).
if not os.environ.get("PULSE_INTEGRATION"):
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

# Mock celery before any import of tasks.celery_app triggers broker connection.


class _FakeCrontab:
    """Minimal crontab replacement that stores hour/minute as sets."""

    def __init__(self, hour=0, minute=0):
        self.hour = {hour} if isinstance(hour, int) else set(hour)
        self.minute = {minute} if isinstance(minute, int) else set(minute)


class _FakeCeleryConf:
    """Stores Celery config as real attributes."""

    def __init__(self):
        self.beat_schedule = {}
        self.broker_url = ""
        self.task_serializer = "json"
        self.timezone = "UTC"

    def update(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


class _FakeCelery:
    """Minimal Celery replacement — task() is a pass-through decorator."""

    def __init__(self, name="", broker="", backend="", **kwargs):
        self.conf = _FakeCeleryConf()
        self.conf.broker_url = broker

    def task(self, *args, **kwargs):
        """Return the decorated function unchanged."""
        def decorator(fn):
            return fn
        return decorator

    def autodiscover_tasks(self, packages):
        pass


_celery_module = MagicMock()
_celery_module.Celery = _FakeCelery

_celery_schedules = MagicMock()
_celery_schedules.crontab = _FakeCrontab

sys.modules.setdefault("celery", _celery_module)
sys.modules.setdefault("celery.schedules", _celery_schedules)


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
    monkeypatch.setattr("api.deps.decode_clerk_jwt", _fake_decode)
    return _fake_decode


@pytest.fixture
def mock_session_local(monkeypatch, gym_id):
    """Patches SessionLocal and _resolve_gym_id in deps to return a mock DB session."""
    mock_session = MagicMock()
    mock_session.execute = MagicMock()
    mock_session.commit = MagicMock()
    mock_session.rollback = MagicMock()
    mock_session.close = MagicMock()

    monkeypatch.setattr("api.deps.SessionLocal", lambda: mock_session)
    monkeypatch.setattr("api.deps._resolve_gym_id", lambda db, org_id: gym_id)
    return mock_session


@pytest.fixture
def client(mock_decode_clerk_jwt, mock_session_local):
    """TestClient with mocked auth and DB."""
    from api.main import app

    return TestClient(app)


@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer fake-jwt-token"}
