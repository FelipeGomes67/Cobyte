"""Serviço de transcrição com Faster-Whisper, VAD e filtros de qualidade."""
import math
import time
from typing import Any
from fastapi import HTTPException
from app.api.schemas import TranscricaoDTO
from app.config import Settings
from app.core.logging import logger


def executar_transcricao(
    modelo: Any,
    caminho_arquivo: str,
    nome_arquivo: str,
    total_bytes: int,
    settings: Settings,
) -> TranscricaoDTO:
    """Executa a inferência do áudio, valida duração e filtra silêncio/alucinações."""
    inicio = time.monotonic()
    try:
        segmentos, info = modelo.transcribe(
            caminho_arquivo,
            language="pt",
            beam_size=settings.beam_size,
            temperature=settings.temperature,
            vad_filter=True,
            vad_parameters={
                "min_speech_duration_ms": 250,
                "min_silence_duration_ms": 500,
            },
            condition_on_previous_text=False,
            no_speech_threshold=0.6,
            log_prob_threshold=-1.0,
            compression_ratio_threshold=2.4,
        )

        if not math.isfinite(info.duration) or info.duration <= 0:
            raise HTTPException(status_code=422, detail="Áudio sem duração válida")

        if info.duration > settings.max_duration_seconds:
            raise HTTPException(
                status_code=422, detail="Áudio excede a duração permitida"
            )

        texto = " ".join(
            s.text.strip()
            for s in segmentos
            if s.text.strip()
            and getattr(s, "no_speech_prob", 0.0) <= 0.6
            and getattr(s, "avg_logprob", 0.0) >= -1.0
        )

        if not texto:
            raise HTTPException(
                status_code=422,
                detail="Não foi detectada fala no áudio. Grave novamente falando próximo ao microfone.",
            )

        tempo_processamento = time.monotonic() - inicio
        logger.info(
            "Transcrição concluída: bytes=%d duracao=%.2f tempo=%.2f",
            total_bytes,
            info.duration,
            tempo_processamento,
        )

        return TranscricaoDTO(
            nomeArquivo=nome_arquivo,
            duracaoSegundos=info.duration,
            idioma="pt",
            probabilidadeIdioma=info.language_probability,
            transcricao=texto,
        )

    except HTTPException:
        raise
    except ValueError:
        logger.warning("STT recusou áudio inválido")
        raise HTTPException(
            status_code=422, detail="Arquivo de áudio inválido ou corrompido"
        ) from None
    except Exception as exc:
        if type(exc).__name__ in {"InvalidDataError", "EOFError"}:
            logger.warning("STT recusou áudio corrompido")
            raise HTTPException(
                status_code=422, detail="Arquivo de áudio inválido ou corrompido"
            ) from None

        # Não registrar áudio, transcrição nem mensagens arbitrárias do decodificador
        logger.error("Falha STT: tipo=%s", type(exc).__name__)
        raise HTTPException(
            status_code=500, detail="Não foi possível transcrever o áudio"
        ) from None

