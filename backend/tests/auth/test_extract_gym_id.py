import uuid

import pytest
from fastapi import HTTPException

from api.auth import extract_gym_id


class TestExtractGymId:
    def test_returns_org_id(self):
        gym_id = str(uuid.uuid4())
        payload = {"org_id": gym_id, "sub": "user_123"}
        assert extract_gym_id(payload) == gym_id

    def test_raises_403_when_missing(self):
        with pytest.raises(HTTPException) as exc_info:
            extract_gym_id({"sub": "user_123"})
        assert exc_info.value.status_code == 403
        assert "organization" in exc_info.value.detail.lower()

    def test_raises_403_when_empty(self):
        with pytest.raises(HTTPException) as exc_info:
            extract_gym_id({"org_id": "", "sub": "user_123"})
        assert exc_info.value.status_code == 403

    def test_raises_403_when_none(self):
        with pytest.raises(HTTPException) as exc_info:
            extract_gym_id({"org_id": None, "sub": "user_123"})
        assert exc_info.value.status_code == 403
