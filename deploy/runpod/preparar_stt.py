"""Baixa o modelo antes de iniciar o STT, que continua operando offline."""
import os
from pathlib import Path


def preparar():
    from faster_whisper.utils import download_model

    destino = Path(os.environ["STT_MODEL_PATH"])
    obrigatorios = ("model.bin", "config.json", "tokenizer.json")
    if not all((destino / nome).is_file() for nome in obrigatorios):
        destino.mkdir(parents=True, exist_ok=True)
        download_model("small", output_dir=str(destino), local_files_only=False)
    if not all((destino / nome).is_file() for nome in obrigatorios):
        raise RuntimeError("Download do modelo STT incompleto")


if __name__ == "__main__":
    preparar()
