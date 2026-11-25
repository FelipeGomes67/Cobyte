# STT Service

Serviço local de Speech-to-Text (FastAPI + Faster-Whisper).

## Requisitos
- **Python 3.12**

## Como Rodar

Configure `STT_INTERNAL_API_KEY` uma única vez no arquivo `cobyte-api/.env`, com pelo menos 32 bytes aleatórios. O `iniciar.cmd` carrega essa chave automaticamente, usando o mesmo valor da API Java, inclusive depois de reiniciar o computador. O serviço verifica o cabeçalho `X-Internal-Api-Key` inclusive nas rotas de documentação e health, antes de ler o corpo do upload.

O inicializador lê apenas `STT_INTERNAL_API_KEY` do `.env` da API, nos formatos `NOME=valor` ou `NOME: valor`, com aspas opcionais. Não executa o conteúdo do arquivo nem importa as credenciais do banco. A chave do arquivo tem precedência sobre a do terminal. Quando não houver essa configuração no arquivo, mantém o suporte à variável de ambiente. O `.env.example` do STT continua sendo apenas referência para as demais variáveis. Nunca coloque a chave em variáveis `VITE_*`.

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
