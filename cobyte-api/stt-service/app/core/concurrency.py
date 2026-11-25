"""Controle de concorrência para inferência do modelo."""
import threading
from contextlib import contextmanager
from typing import Generator
from fastapi import HTTPException


class ConcurrencyManager:
    """Gerencia vagas de execução simultânea para proteger CPU/GPU contra sobrecarga."""

    def __init__(self, max_concorrente: int = 1) -> None:
        self.semaphore = threading.BoundedSemaphore(max_concorrente)

    @contextmanager
    def acquire(self) -> Generator[None, None, None]:
        adquirido = self.semaphore.acquire(blocking=False)
        if not adquirido:
            raise HTTPException(
                status_code=503,
                detail="Serviço STT ocupado; tente novamente",
                headers={"Retry-After": "5"},
            )
        try:
            yield
        finally:
            self.semaphore.release()

