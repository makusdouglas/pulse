from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

import api.auth as auth_module
from api.auth import _get_jwks_client


class TestGetJwksClient:
    def test_raises_500_when_not_configured(self):
        old = auth_module._jwks_client
        auth_module._jwks_client = None

        try:
            with patch("api.auth.get_settings") as mock_settings:
                mock_settings.return_value = MagicMock(clerk_jwks_url="")
                with pytest.raises(HTTPException) as exc_info:
                    _get_jwks_client()
                assert exc_info.value.status_code == 500
        finally:
            auth_module._jwks_client = old
