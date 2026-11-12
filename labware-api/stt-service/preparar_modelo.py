"""Provisiona o modelo small antes da inicialização offline do serviço."""
import os
import sys
from pathlib import Path


def preparar():
    destino = Path(__file__).resolve().parent / "models" / "small"
    obrigatorios = ("model.bin", "config.json", "tokenizer.json")
    if all((destino / nome).is_file() for nome in obrigatorios):
        return 0

    # Este processo prepara o modelo. O servidor continua operando offline.
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    from faster_whisper.utils import download_model
    from huggingface_hub.errors import LocalEntryNotFoundError

    try:
        cache = Path(download_model("small", local_files_only=True))
        if all((cache / nome).is_file() for nome in obrigatorios):
            print("Modelo small encontrado no cache local.", flush=True)
            return 0
    except LocalEntryNotFoundError:
        pass

    if os.environ.get("HF_HUB_OFFLINE", "").upper() in {"1", "TRUE", "YES", "ON"}:
        print("[ERRO] Modelo ausente e HF_HUB_OFFLINE esta habilitado. "
              "Provisione o modelo local ou desabilite essa variavel para o primeiro download.", flush=True)
        return 1

    print("Baixando Whisper small para models/small. O primeiro download pode levar alguns minutos...", flush=True)
    try:
        download_model("small", output_dir=str(destino), local_files_only=False)
    except Exception as erro:
        print(f"[ERRO] Falha ao preparar o modelo: {erro}", file=sys.stderr)
        print("Verifique a conexao e execute iniciar.cmd novamente para retomar o download.", file=sys.stderr)
        return 1

    if not all((destino / nome).is_file() for nome in obrigatorios):
        print("[ERRO] Download incompleto: faltam arquivos do modelo.", file=sys.stderr)
        return 1
    print("Modelo small preparado para uso offline.", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(preparar())
