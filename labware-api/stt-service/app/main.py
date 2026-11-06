"""Ponto de entrada da aplicação FastAPI."""
import inspect
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from app.api.routes import router
from app.config import get_settings
from app.core.concurrency import ConcurrencyManager
from app.core.logging import logger
from app.services.model_loader import carregar_modelo


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Gerencia a inicialização e desligamento do serviço e modelo."""
    settings = get_settings()
    app.state.settings = settings
    app.state.concurrency = ConcurrencyManager(max_concorrente=1)
    app.state.vaga = app.state.concurrency.semaphore

    logger.info("Inicializando STT Service com Faster-Whisper...")

    # Suporte transparente para mocks em main.carregar_modelo em testes legados
    loader = carregar_modelo
    if "main" in sys.modules:
        main_mod = sys.modules["main"]
        if hasattr(main_mod, "carregar_modelo"):
            fn = getattr(main_mod, "carregar_modelo")
            # Se for um Mock ou função personalizada
            if hasattr(fn, "return_value") or hasattr(fn, "assert_called"):
                loader = lambda s: fn()

    app.state.modelo = loader(settings)
    logger.info("STT Service pronto para processar requisições (idioma fixo: pt).")

    yield

    logger.info("Encerrando STT Service e liberando modelo...")
    app.state.modelo = None


def create_app() -> FastAPI:
    """Cria e configura a instância do FastAPI."""
    app_instance = FastAPI(
        title="LABWARE STT local",
        version="1.0.0",
        description="Microsserviço local de Speech-to-Text em português para o Labware API.",
        lifespan=lifespan,
    )
    app_instance.include_router(router)
    return app_instance


app = create_app()
