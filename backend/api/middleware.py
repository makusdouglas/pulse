import logging

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from api.auth import decode_clerk_jwt, extract_gym_id
from infra.tenant import clear_tenant, set_tenant

logger = logging.getLogger(__name__)

_PUBLIC_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if request.url.path in _PUBLIC_PATHS:
            return await call_next(request)

        token_reset = None
        try:
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                jwt_token = auth_header.removeprefix("Bearer ").strip()
                payload = decode_clerk_jwt(jwt_token)
                gym_id = extract_gym_id(payload)
                token_reset = set_tenant(gym_id)
        except Exception:
            logger.debug("TenantMiddleware: skipping tenant setup (auth failed)")

        try:
            response = await call_next(request)
        finally:
            if token_reset is not None:
                clear_tenant(token_reset)

        return response
