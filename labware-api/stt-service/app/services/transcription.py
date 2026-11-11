"""Serviço de transcrição com Whisper/Faster-Whisper e filtros de qualidade."""
import math
import time
import traceback
from typing import Any
from fastapi import HTTPException
from app.api.schemas import TranscricaoDTO
from app.config import Settings
from app.core.logging import logger

# Compatibilidade com versões recentes do PyAV (av 14+) onde metadata_errors foi descontinuado
try:
    import av
    _original_av_open = av.open

    def _safe_av_open(*args, **kwargs):
        try:
            return _original_av_open(*args, **kwargs)
        except TypeError as e:
            if "metadata_errors" in str(e) and "metadata_errors" in kwargs:
                kwargs.pop("metadata_errors", None)
                return _original_av_open(*args, **kwargs)
            raise

    av.open = _safe_av_open
except Exception:
    pass


def executar_transcricao(
    modelo: Any,
    caminho_arquivo: str,
    nome_arquivo: str,
    total_bytes: int,
    settings: Settings,
) -> TranscricaoDTO:
    """Executa a inferência do áudio, valida duração e compõe a transcrição."""
    inicio = time.monotonic()
    caminho_str = str(caminho_arquivo)
    try:
        # Chamada mantendo estritamente o caminho do arquivo e language='pt' (removendo argumentos incompatíveis)
        try:
            resultado = modelo.transcribe(caminho_str, language="pt")
        except TypeError as err_kw:
            logger.warning("STT: modelo.transcribe lançou TypeError (%s). Tentando chamada apenas com o caminho.", err_kw)
            resultado = modelo.transcribe(caminho_str)

        duracao = 0.0
        prob_idioma = 1.0
        texto = ""

        # Tratamento de retorno agnóstico: Faster-Whisper tupla (segments, info) vs OpenAI Whisper dict {"text": ...}
        if isinstance(resultado, tuple) and len(resultado) == 2:
            segments, info = resultado
            duracao = float(getattr(info, "duration", 0.0) or 0.0)
            prob_idioma = float(getattr(info, "language_probability", 1.0) or 1.0)
            texto = " ".join([s.text.strip() for s in segments if hasattr(s, "text") and s.text])
        elif isinstance(resultado, dict):
            texto = str(resultado.get("text", "")).strip()
            duracao = float(resultado.get("duration", 0.0) or 0.0)
            prob_idioma = float(resultado.get("language_probability", 1.0) or 1.0)
        elif isinstance(resultado, str):
            texto = resultado.strip()
            duracao = 1.0
            prob_idioma = 1.0
        else:
            texto = str(getattr(resultado, "text", "")).strip()
            duracao = float(getattr(resultado, "duration", 0.0) or 0.0)
            prob_idioma = float(getattr(resultado, "language_probability", 1.0) or 1.0)

        if not math.isfinite(duracao) or duracao <= 0:
            if not texto:
                raise HTTPException(status_code=422, detail="Áudio sem duração válida")
            duracao = 1.0

        if duracao > settings.max_duration_seconds:
            raise HTTPException(
                status_code=422, detail="Áudio excede a duração permitida"
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
            duracao,
            tempo_processamento,
        )

        return TranscricaoDTO(
            nomeArquivo=nome_arquivo,
            duracaoSegundos=duracao,
            idioma="pt",
            probabilidadeIdioma=prob_idioma,
            transcricao=texto,
        )

    except HTTPException:
        raise
    except ValueError:
        traceback.print_exc()
        logger.warning("STT recusou áudio inválido")
        raise HTTPException(
            status_code=422, detail="Arquivo de áudio inválido ou corrompido"
        ) from None
    except Exception as exc:
        traceback.print_exc()
        if type(exc).__name__ in {"InvalidDataError", "EOFError"}:
            logger.warning("STT recusou áudio corrompido")
            raise HTTPException(
                status_code=422, detail="Arquivo de áudio inválido ou corrompido"
            ) from None

        logger.error("Falha STT: tipo=%s mensagem=%s", type(exc).__name__, exc)
        raise HTTPException(
            status_code=500, detail="Não foi possível transcrever o áudio"
        ) from None

