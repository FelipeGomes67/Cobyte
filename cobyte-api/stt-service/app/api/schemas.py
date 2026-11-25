"""Esquemas de dados (DTOs) da API."""
from pydantic import BaseModel, Field


class TranscricaoDTO(BaseModel):
    nomeArquivo: str = Field(description="Nome do arquivo sanitizado")
    duracaoSegundos: float = Field(description="Duração do áudio em segundos")
    idioma: str = Field(description="Idioma identificado/forçado (ex: pt)")
    probabilidadeIdioma: float = Field(description="Probabilidade estimada para o idioma")
    transcricao: str = Field(description="Texto transcrito do áudio")


class HealthDTO(BaseModel):
    status: str = Field(default="ok")
    model_loaded: bool
    device: str

