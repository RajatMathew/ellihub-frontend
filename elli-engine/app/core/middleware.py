from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings


class ApiKeyMiddleware(BaseHTTPMiddleware):
    EXCLUDED_PATHS = {"/", "/docs", "/openapi.json", "/redoc", "/health/live", "/health/ready"}

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in self.EXCLUDED_PATHS:
            return await call_next(request)

        api_key = request.headers.get(settings.api_key_header)
        if api_key not in settings.api_keys:
            return JSONResponse({"detail": "Invalid or missing API key."}, status_code=401)
        return await call_next(request)
