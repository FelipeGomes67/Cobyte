"""Configuração de logging do serviço."""
import logging

LOG_FORMAT = "%(asctime)s %(levelname)s [%(name)s] %(message)s"


def setup_logging() -> logging.Logger:
    logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
    return logging.getLogger("labware.stt")


logger = setup_logging()

