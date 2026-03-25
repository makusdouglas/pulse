import jwt
from fastapi import HTTPException, status
from jwt import PyJWKClient

from infra.config import get_settings

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        settings = get_settings()
        if not settings.clerk_jwks_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="CLERK_JWKS_URL not configured",
            )
        _jwks_client = PyJWKClient(settings.clerk_jwks_url)
    return _jwks_client


def decode_clerk_jwt(token: str) -> dict:
    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"require": ["exp", "iat", "sub"]},
        )
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        ) from e
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from e
    return payload


def extract_gym_id(payload: dict) -> str:
    org_id = payload.get("org_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must belong to an organization",
        )
    return org_id
