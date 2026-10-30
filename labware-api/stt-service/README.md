# STT Service

Serviço local de Speech-to-Text (FastAPI + Faster-Whisper).

## Requisitos
- **Python 3.12**

## Como Rodar

### 1. Preparar o ambiente
```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
```

### 2. Iniciar o serviço
```powershell
.\iniciar.cmd
```

O serviço iniciará em **http://127.0.0.1:8000**.
Swagger               **http://127.0.0.1:8000/docs#/**
