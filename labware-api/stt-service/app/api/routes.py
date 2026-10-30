"""Definição de rotas da API FastAPI."""
import sys
from fastapi import APIRouter, File, Request, UploadFile
from app.api.schemas import HealthDTO, TranscricaoDTO
from app.config import Settings
from app.core.concurrency import ConcurrencyManager
from app.services.audio import sanitize_filename, save_temp_audio, validate_extension
from app.services.transcription import executar_transcricao

router = APIRouter()


@router.get("/health", response_model=HealthDTO)
def health_check(request: Request) -> HealthDTO:
    """Endpoint de verificação de integridade e prontidão do serviço."""
    modelo_carregado = getattr(request.app.state, "modelo", None) is not None
    settings: Settings = request.app.state.settings
    return HealthDTO(
        status="ok" if modelo_carregado else "starting",
        model_loaded=modelo_carregado,
        device=settings.device,
    )


@router.post("/transcrever", response_model=TranscricaoDTO)
def transcrever(request: Request, arquivo: UploadFile = File(...)) -> TranscricaoDTO:
    """Recebe um arquivo de áudio via multipart/form-data e retorna a transcrição."""
    settings: Settings = request.app.state.settings
    nome_sanitizado = sanitize_filename(arquivo.filename)
    extensao = validate_extension(nome_sanitizado, settings.allowed_extensions)

    # Suporte para sobrescrita de MAX_BYTES em módulos legados durante testes
    max_bytes = settings.max_bytes
    if "main" in sys.modules and hasattr(sys.modules["main"], "MAX_BYTES"):
        max_bytes = getattr(sys.modules["main"], "MAX_BYTES")

    concurrency: ConcurrencyManager = request.app.state.concurrency
    with concurrency.acquire():
        with save_temp_audio(
            arquivo, extensao, max_bytes, settings.chunk_size
        ) as (caminho_temp, total_bytes):
            return executar_transcricao(
                modelo=request.app.state.modelo,
                caminho_arquivo=caminho_temp,
                nome_arquivo=nome_sanitizado,
                total_bytes=total_bytes,
                settings=settings,
            )
