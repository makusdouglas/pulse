import pytest
from fastapi import HTTPException

from api.deps import get_current_gym_id


class TestGetCurrentGymId:
    def test_valid_bearer(self, monkeypatch, gym_id):
        payload = {"org_id": gym_id, "sub": "user_123", "exp": 9999999999, "iat": 1700000000}
        monkeypatch.setattr("api.deps.decode_clerk_jwt", lambda t: payload)

        result = get_current_gym_id(authorization="Bearer fake-token")
        assert result == gym_id

    def test_missing_bearer_prefix(self):
        with pytest.raises(HTTPException) as exc_info:
            get_current_gym_id(authorization="Token abc123")
        assert exc_info.value.status_code == 401

    def test_empty_header(self):
        with pytest.raises(HTTPException) as exc_info:
            get_current_gym_id(authorization="")
        assert exc_info.value.status_code == 401
