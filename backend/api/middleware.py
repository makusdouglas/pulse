import logging

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

_PUBLIC_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}


class TenantMiddleware(BaseHTTPMiddleware):
    """Lightweight middleware — tenant context is managed by get_db() in deps.py.

    This middleware is kept as a hook for future cross-cutting concerns
    (request logging, rate limiting, etc.) but no longer manages tenant state.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if request.url.path in _PUBLIC_PATHS:
            return await call_next(request)

        return await call_next(request)
