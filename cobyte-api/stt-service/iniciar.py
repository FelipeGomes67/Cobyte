"""Inicializa o STT com a mesma chave privada usada pela API Java."""
import os
from pathlib import Path
import re
import sys


def carregar_chave(arquivo_env: Path) -> None:
    # Leitura literal: nunca executa comandos nem expande valores do .env.
    if not arquivo_env.is_file():
        return  # Mantem suporte a configuracao pelo ambiente.

    chave = None
    for linha in arquivo_env.read_text(encoding="utf-8-sig").splitlines():
        correspondencia = re.fullmatch(r"STT_INTERNAL_API_KEY\s*[:=](.*)", linha.strip())
        if not correspondencia:
            continue
        if chave is not None:
            raise ValueError("STT_INTERNAL_API_KEY duplicada no .env da API.")
        chave = correspondencia.group(1).strip()
        if chave.startswith(('"', "'")):
            if len(chave) < 2 or chave[-1] != chave[0]:
                raise ValueError("Aspas incompletas em STT_INTERNAL_API_KEY no .env da API.")
            chave = chave[1:-1]

    if chave is not None:
        # O arquivo tem precedencia para evitar divergencia com a API Java.
        os.environ["STT_INTERNAL_API_KEY"] = chave


def main() -> int:
    try:
        carregar_chave(Path(__file__).resolve().parent.parent / ".env")
        from app.config import get_settings

        get_settings()
    except (OSError, UnicodeError, ValueError, RuntimeError):
        print(
            "[ERRO] Confira o .env em cobyte-api e STT_INTERNAL_API_KEY "
            "(minimo 32 bytes), alem das configuracoes STT do ambiente.",
            file=sys.stderr,
        )
        return 1

    if "--validar" in sys.argv[1:]:
        print("Configuracao do STT valida. Nenhum segredo foi exibido.")
        return 0

    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, workers=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
