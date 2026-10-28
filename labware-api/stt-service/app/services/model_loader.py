"""Carregamento seguro e offline do modelo Faster-Whisper."""
import os
from pathlib import Path
from app.config import Settings
from app.core.logging import logger

# Força modo offline e remove telemetria
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"


def carregar_modelo(settings: Settings):
    """Carrega o modelo Whisper localmente sem efetuar downloads na inicialização."""
    from faster_whisper import WhisperModel

    compute_type = "int8" if settings.device == "cpu" else "float16"
    modelo_origem = settings.model_path or "small"

    logger.info(
        "Carregando modelo Faster-Whisper: device=%s compute_type=%s origem=%s",
        settings.device,
        compute_type,
        modelo_origem,
    )

    return WhisperModel(
        modelo_origem,
        device=settings.device,
        compute_type=compute_type,
        local_files_only=True,
    )

