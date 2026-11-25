"""Inicializa e acompanha API, Ollama e STT no mesmo Pod Linux."""
import os
from pathlib import Path
import shlex
import signal
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen


def validar_configuracao(ambiente):
    obrigatorios = ("DB_URL", "DB_USERNAME", "DB_PASSWORD", "JWT_SECRET", "CORS_ALLOWED_ORIGINS", "FRONTEND_URL")
    faltantes = [nome for nome in obrigatorios if not ambiente.get(nome, "").strip()]
    if faltantes:
        raise RuntimeError("Preencha as variáveis do Pod: " + ", ".join(faltantes))
    if not ambiente["DB_URL"].startswith("jdbc:postgresql://"):
        raise RuntimeError("DB_URL deve usar o formato JDBC PostgreSQL")
    if len(ambiente["JWT_SECRET"].encode()) < 32:
        raise RuntimeError("JWT_SECRET deve ter pelo menos 32 bytes")
    push = [bool(ambiente.get(nome, "").strip()) for nome in
            ("WEB_PUSH_PUBLIC_KEY", "WEB_PUSH_PRIVATE_KEY", "WEB_PUSH_SUBJECT")]
    if any(push) and not all(push):
        raise RuntimeError("Preencha as três variáveis WEB_PUSH_*")


def conferir_processos(processos):
    for nome, processo in processos:
        if processo.poll() is not None:
            raise RuntimeError(f"O processo {nome} terminou com código {processo.returncode}")


def aguardar(url, processos, prazo):
    while time.monotonic() < prazo:
        conferir_processos(processos)
        try:
            with urlopen(url, timeout=2) as resposta:
                if resposta.status == 200:
                    return
        except (URLError, TimeoutError):
            pass
        time.sleep(1)
    raise RuntimeError("Tempo de inicialização esgotado")


def encerrar(processos):
    for _, processo in reversed(processos):
        if processo.poll() is None:
            try:
                os.killpg(processo.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
    for _, processo in reversed(processos):
        try:
            processo.wait(timeout=20)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(processo.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            processo.wait()


def main():
    ambiente = os.environ.copy()
    validar_configuracao(ambiente)
    ambiente.update(
        OLLAMA_HOST="127.0.0.1:11434",
        OLLAMA_BASE_URL="http://127.0.0.1:11434",
        STT_SERVICE_URL="http://127.0.0.1:8000",
        OLLAMA_MODELS="/workspace/ollama",
        STT_MODEL_PATH="/workspace/whisper-small",
        HF_HOME="/workspace/huggingface",
        UPLOADS_ARMAZENAMENTO="banco",
        SERVER_ADDRESS="0.0.0.0",
        SERVER_PORT="8080",
    )
    for pasta in ("OLLAMA_MODELS", "STT_MODEL_PATH", "HF_HOME"):
        Path(ambiente[pasta]).mkdir(parents=True, exist_ok=True)
    processos = []
    prazo = time.monotonic() + int(ambiente.get("COBYTE_BOOT_TIMEOUT", "1800"))

    def executar(nome, comando, cwd=None):
        processo = subprocess.Popen(comando, cwd=cwd, env=ambiente, start_new_session=True)
        processos.append((nome, processo))
        return processo

    def preparar(nome, comando):
        processo = executar(nome, comando)
        while processo.poll() is None:
            conferir_processos(processos[:-1])
            if time.monotonic() >= prazo:
                raise RuntimeError("Tempo de preparação dos modelos esgotado")
            time.sleep(1)
        if processo.returncode != 0:
            raise RuntimeError(f"Falha ao preparar {nome}")
        processos.pop()

    try:
        executar("Ollama", ["ollama", "serve"])
        aguardar("http://127.0.0.1:11434/api/tags", processos, prazo)
        preparar("modelo Ollama", ["ollama", "pull", ambiente.get("OLLAMA_MODEL", "llama3.2")])
        preparar("modelo STT", [sys.executable, "/opt/cobyte/preparar_stt.py"])
        executar("STT", [sys.executable, "-m", "uvicorn", "app.main:app",
                        "--host", "127.0.0.1", "--port", "8000", "--workers", "1"],
                 cwd="/opt/cobyte/stt")
        aguardar("http://127.0.0.1:8000/health", processos, prazo)
        executar("API", ["java", *shlex.split(ambiente.get("JAVA_OPTS", "")), "-jar", "/opt/cobyte/api.jar"])
        aguardar("http://127.0.0.1:8080/api-docs", processos, prazo)
        print("Cobyte pronto. API na porta 8080.", flush=True)
        while True:
            conferir_processos(processos)
            time.sleep(1)
    finally:
        encerrar(processos)


def interromper(_sinal, _frame):
    raise SystemExit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, interromper)
    signal.signal(signal.SIGINT, interromper)
    try:
        main()
    except Exception as erro:
        print(f"Falha na inicialização: {erro}", file=sys.stderr)
        sys.exit(1)
