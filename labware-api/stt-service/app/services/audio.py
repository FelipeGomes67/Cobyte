"""Utilitários para validação, sanitização e manipulação de arquivos de áudio."""
import os
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Generator, Tuple
from fastapi import HTTPException, UploadFile
from app.core.logging import logger


def sanitize_filename(filename: str | None) -> str:
    """Sanitiza o nome do arquivo para evitar Path Traversal e caracteres de controle."""
    raw = (filename or "").replace("\\", "/").rsplit("/", 1)[-1]
    cleaned = "".join(c for c in raw if c.isprintable())[:255]
    return cleaned or "audio"


def validate_extension(filename: str, allowed_extensions: frozenset[str]) -> str:
    """Valida a extensão do arquivo enviado."""
    extensao = Path(filename).suffix.lower()
    if extensao not in allowed_extensions:
        raise HTTPException(status_code=415, detail="Extensão de áudio não permitida")
    return extensao


@contextmanager
def save_temp_audio(
    upload_file: UploadFile,
    extensao: str,
    max_bytes: int,
    chunk_size: int = 64 * 1024,
) -> Generator[Tuple[str, int], None, None]:
    """Salva o upload em arquivo temporário com limite de bytes e garante exclusão ao final."""
    temp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            prefix="labware-stt-", suffix=extensao, delete=False
        ) as destino:
            temp_path = destino.name
            total_bytes = 0
            while bloco := upload_file.file.read(chunk_size):
                total_bytes += len(bloco)
                if total_bytes > max_bytes:
                    raise HTTPException(
                        status_code=413, detail="Áudio excede o tamanho permitido"
                    )
                destino.write(bloco)

        if total_bytes == 0:
            raise HTTPException(status_code=400, detail="Arquivo de áudio vazio")

        yield (temp_path, total_bytes)
    finally:
        try:
            upload_file.file.close()
        except OSError:
            logger.error("Falha ao fechar stream de upload")

        if temp_path:
            try:
                os.remove(temp_path)
            except FileNotFoundError:
                pass
            except OSError:
                logger.error("Falha ao remover arquivo temporário: %s", temp_path)

