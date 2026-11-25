"""Configurações centralizadas para o STT Service."""
import math
import os
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    internal_api_key: str = field(default_factory=lambda: os.getenv("STT_INTERNAL_API_KEY", "").strip(), repr=False)
    allow_local_without_key: bool = field(default_factory=lambda: os.getenv("STT_ALLOW_LOCAL_WITHOUT_KEY", "false").lower() == "true")
    device: str = field(
        default_factory=lambda: os.getenv("STT_DEVICE", "cpu").strip().lower()
    )
    model_path: str = field(
        default_factory=lambda: os.getenv("STT_MODEL_PATH", "").strip()
    )
    max_bytes: int = field(
        default_factory=lambda: int(os.getenv("STT_MAX_BYTES", "10485760"))
    )
    max_duration_seconds: float = field(
        default_factory=lambda: float(os.getenv("STT_MAX_DURATION_SECONDS", "600"))
    )
    beam_size: int = field(
        default_factory=lambda: int(os.getenv("STT_BEAM_SIZE", "5"))
    )
    temperature: float = field(
        default_factory=lambda: float(os.getenv("STT_TEMPERATURE", "0.0"))
    )
    host: str = field(
        default_factory=lambda: os.getenv("STT_HOST", "127.0.0.1")
    )
    port: int = field(
        default_factory=lambda: int(os.getenv("STT_PORT", "8000"))
    )
    allowed_extensions: frozenset[str] = frozenset(
        {".wav", ".mp3", ".ogg", ".m4a", ".flac"}
    )
    chunk_size: int = 64 * 1024  # 64 KB por bloco de upload

    def validate(self) -> None:
        if self.internal_api_key and len(self.internal_api_key.encode("utf-8")) < 32:
            raise RuntimeError("STT_INTERNAL_API_KEY deve ter pelo menos 32 bytes")
        if not self.internal_api_key and not (
            self.allow_local_without_key and self.host in {"localhost", "127.0.0.1", "::1"}
        ):
            raise RuntimeError("Configure STT_INTERNAL_API_KEY. Desenvolvimento sem chave exige STT_ALLOW_LOCAL_WITHOUT_KEY=true e host de loopback")
        if self.max_bytes <= 0 or self.max_bytes > 10 * 1024 * 1024:
            raise RuntimeError("STT_MAX_BYTES deve ser positivo e no máximo 10 MB")
        if not math.isfinite(self.max_duration_seconds) or self.max_duration_seconds <= 0:
            raise RuntimeError("STT_MAX_DURATION_SECONDS deve ser positivo e finito")
        if self.device not in {"cpu", "cuda"}:
            raise RuntimeError("STT_DEVICE deve ser 'cpu' ou 'cuda'")
        if self.model_path:
            pasta = Path(self.model_path)
            arquivos_obrigatorios = ("model.bin", "config.json", "tokenizer.json")
            if not all((pasta / nome).is_file() for nome in arquivos_obrigatorios):
                raise RuntimeError(
                    "STT_MODEL_PATH deve conter o modelo small completo, incluindo tokenizer.json"
                )


def get_settings() -> Settings:
    settings = Settings()
    settings.validate()
    return settings

