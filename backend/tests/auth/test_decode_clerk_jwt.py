from unittest.mock import MagicMock, patch

import jwt as pyjwt
import pytest
from fastapi import HTTPException

from api.auth import decode_clerk_jwt


def _mock_jwks():
    mock_client = MagicMock()
    mock_key = MagicMock()
    mock_key.key = "fake-key"
    mock_client.get_signing_key_from_jwt.return_value = mock_key
    return mock_client


class TestDecodeClerkJwt:
    def test_raises_401_on_expired(self):
        with (
            patch("api.auth._get_jwks_client", return_value=_mock_jwks()),
            patch("api.auth.jwt.decode", side_effect=pyjwt.ExpiredSignatureError("expired")),
        ):
            with pytest.raises(HTTPException) as exc_info:
                decode_clerk_jwt("some.expired.token")
            assert exc_info.value.status_code == 401
            assert "expired" in exc_info.value.detail.lower()

    def test_raises_401_on_invalid(self):
        with (
            patch("api.auth._get_jwks_client", return_value=_mock_jwks()),
            patch("api.auth.jwt.decode", side_effect=pyjwt.InvalidTokenError("bad token")),
        ):
            with pytest.raises(HTTPException) as exc_info:
                decode_clerk_jwt("some.invalid.token")
            assert exc_info.value.status_code == 401
            assert "invalid token" in exc_info.value.detail.lower()

    def test_returns_payload(self):
        expected = {"sub": "user_123", "org_id": "gym_abc", "exp": 9999999999, "iat": 1700000000}

        with (
            patch("api.auth._get_jwks_client", return_value=_mock_jwks()),
            patch("api.auth.jwt.decode", return_value=expected),
        ):
            result = decode_clerk_jwt("valid.jwt.token")
            assert result == expected
