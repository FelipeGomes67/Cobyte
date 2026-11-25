"""Verificação interna dos três serviços."""
from urllib.request import urlopen


def verificar():
    for url in (
        "http://127.0.0.1:11434/api/tags",
        "http://127.0.0.1:8000/health",
        "http://127.0.0.1:8080/api-docs",
    ):
        with urlopen(url, timeout=2) as resposta:
            if resposta.status != 200:
                raise RuntimeError("Serviço indisponível")


if __name__ == "__main__":
    verificar()
