"""Autenticação interna e limite de corpo antes do parser multipart."""
import hmac
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse


class InternalSecurityMiddleware:
    def __init__(self, app, application):
        self.app = app
        self.application = application

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        settings = self.application.state.settings
        headers = dict(scope.get("headers", []))
        key = headers.get(b"x-internal-api-key", b"")
        configured = settings.internal_api_key.encode("utf-8")
        local_dev = (
            not configured and settings.allow_local_without_key
            and settings.host in {"127.0.0.1", "localhost", "::1"}
            and (scope.get("client") or ("", 0))[0] in {"127.0.0.1", "::1"}
        )
        if not local_dev and (not configured or not hmac.compare_digest(key, configured)):
            return await JSONResponse({"detail": "Acesso interno não autorizado"}, status_code=401)(scope, receive, send)

        # Inclui margem fixa para cabeçalhos/form-data, sem aceitar corpo ilimitado.
        limit = settings.max_bytes + 64 * 1024
        content_length = headers.get(b"content-length")
        if content_length:
            try:
                length = int(content_length)
                if length < 0:
                    raise ValueError()
            except ValueError:
                return await JSONResponse({"detail": "Tamanho de requisição inválido"}, status_code=400)(scope, receive, send)
            if length > limit:
                return await JSONResponse({"detail": "Áudio excede o tamanho permitido"}, status_code=413)(scope, receive, send)
        total = 0

        async def limited_receive():
            nonlocal total
            message = await receive()
            if message["type"] == "http.request":
                total += len(message.get("body", b""))
                if total > limit:
                    raise HTTPException(413, "Áudio excede o tamanho permitido")
            return message

        await self.app(scope, limited_receive, send)
