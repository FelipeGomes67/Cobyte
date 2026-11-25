import importlib.util
from pathlib import Path
import subprocess
from unittest.mock import Mock, patch

import pytest


spec = importlib.util.spec_from_file_location("iniciar_runpod", Path(__file__).parents[1] / "iniciar.py")
iniciar = importlib.util.module_from_spec(spec)
spec.loader.exec_module(iniciar)


def configuracao():
    return {
        "DB_URL": "jdbc:postgresql://banco.example.com/teste?sslmode=require",
        "DB_USERNAME": "teste",
        "DB_PASSWORD": "senha-sintetica",
        "JWT_SECRET": "segredo-sintetico-de-teste-com-32-bytes",
        "CORS_ALLOWED_ORIGINS": "https://cobyte.example.com",
        "FRONTEND_URL": "https://cobyte.example.com",
    }


def test_exige_variaveis_antes_de_iniciar_processos():
    with pytest.raises(RuntimeError, match="DB_URL"):
        iniciar.validar_configuracao({})


def test_configuracao_completa():
    iniciar.validar_configuracao(configuracao())


def test_push_incompleto():
    dados = configuracao()
    dados["WEB_PUSH_PUBLIC_KEY"] = "chave-sintetica"
    with pytest.raises(RuntimeError, match="WEB_PUSH"):
        iniciar.validar_configuracao(dados)


def test_aguardar_aborta_se_servico_morrer():
    processo = Mock()
    processo.poll.return_value = 1
    processo.returncode = 1
    with pytest.raises(RuntimeError, match="Ollama"):
        iniciar.aguardar("http://127.0.0.1:11434/api/tags", [("Ollama", processo)], float("inf"))


def test_encerra_grupo_apos_falha_com_forca_se_necessario():
    processo = Mock(pid=123)
    processo.poll.return_value = None
    processo.wait.side_effect = [subprocess.TimeoutExpired("teste", 20), 0]
    with patch.object(iniciar.os, "killpg", create=True) as kill, \
            patch.object(iniciar.signal, "SIGKILL", 9, create=True):
        iniciar.encerrar([("API", processo)])
    assert kill.call_count == 2


def test_prontidao_respeita_timeout():
    with pytest.raises(RuntimeError, match="esgotado"):
        iniciar.aguardar("http://127.0.0.1:8000/health", [], 0)
