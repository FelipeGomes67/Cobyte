@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo [ERRO] Ambiente virtual .venv nao encontrado.
  echo Execute no terminal: py -3.12 -m venv .venv ^&^& .\.venv\Scripts\pip install -r requirements.txt
  exit /b 1
)

if not exist "models\small\model.bin" (
  echo [AVISO] Modelo small local nao encontrado em models\small.
  echo O servico tentara usar o modelo do cache ou falhara se nao estiver provisionado.
)

if "%STT_MODEL_PATH%"=="" set "STT_MODEL_PATH=%~dp0models\small"
if "%STT_DEVICE%"=="" set "STT_DEVICE=cpu"

echo Iniciando STT Service (Python 3.12) em http://127.0.0.1:8000...
".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
exit /b %errorlevel%
