# STT Service

Serviço local de Speech-to-Text (FastAPI + Faster-Whisper).

## Requisitos
- **Python 3.12**

## Como Rodar

Configure `STT_INTERNAL_API_KEY` no ambiente antes de iniciar o serviço e use o mesmo valor no `.env` da API Java. Gere um segredo aleatório com pelo menos 32 bytes. O serviço verifica o cabeçalho `X-Internal-Api-Key` inclusive nas rotas de documentação e health, antes de ler o corpo do upload.

No PowerShell, use `$env:STT_INTERNAL_API_KEY = 'SEU_SEGREDO_PRIVADO'`. O arquivo `.env.example` é apenas referência e não é carregado automaticamente. Nunca coloque a chave em variáveis `VITE_*`.

Por padrão, o serviço recusa inicializar sem uma chave. Para desenvolvimento estritamente local, `STT_ALLOW_LOCAL_WITHOUT_KEY=true` permite ausência de chave apenas com `STT_HOST` e cliente em loopback. Não use essa exceção em rede ou por túnel. O upload tem limite de 10 MB, limite de corpo multipart e verificação da assinatura do áudio antes da transcrição.

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
