"""Entry point do STT Service para compatibilidade retroativa e execução uvicorn."""
from app.config import get_settings
from app.main import app, lifespan
from app.services.model_loader import carregar_modelo as _carregar_modelo

_settings = get_settings()
MAX_BYTES = _settings.max_bytes
MAX_DURACAO = _settings.max_duration_seconds
EXTENSOES = set(_settings.allowed_extensions)


def carregar_modelo():
    """Wrapper para compatibilidade com mocks em testes legados."""
    settings = get_settings()
    return _carregar_modelo(settings)


__all__ = ["app", "lifespan", "carregar_modelo", "MAX_BYTES", "MAX_DURACAO", "EXTENSOES"]
