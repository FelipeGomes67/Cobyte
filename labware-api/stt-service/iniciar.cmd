@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  py -3.12 -c "import sys" >nul 2>&1
  if errorlevel 1 (
    echo [ERRO] Python 3.12 nao encontrado pelo launcher py.
    echo Instale Python 3.12 com o launcher e execute .\iniciar.cmd novamente.
    echo No PowerShell, execute uma linha de cada vez para preparar manualmente:
    echo   py -3.12 -m venv .venv
    echo   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
    exit /b 1
  )
  echo Criando ambiente virtual com Python 3.12...
  py -3.12 -m venv .venv
  if errorlevel 1 exit /b 1
)

".venv\Scripts\python.exe" -c "import sys; sys.exit(0 if sys.version_info[:2] == (3, 12) else 1)"
if errorlevel 1 (
  echo [ERRO] A .venv existente nao usa Python 3.12.
  echo Renomeie .venv e execute novamente com Python 3.12 instalado.
  exit /b 1
)

".venv\Scripts\python.exe" -c "import fastapi, uvicorn, faster_whisper, multipart, av, requests" >nul 2>&1
if errorlevel 1 (
  echo Instalando dependencias do STT Service...
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt
  if errorlevel 1 exit /b 1
)

if not defined STT_MODEL_PATH (
  ".venv\Scripts\python.exe" preparar_modelo.py
  if errorlevel 1 exit /b 1
  if exist "%~dp0models\small\model.bin" set "STT_MODEL_PATH=%~dp0models\small"
)
if defined STT_MODEL_PATH (
  if not exist "%STT_MODEL_PATH%\model.bin" goto modelo_invalido
  if not exist "%STT_MODEL_PATH%\config.json" goto modelo_invalido
  if not exist "%STT_MODEL_PATH%\tokenizer.json" goto modelo_invalido
)

:: Permite configurar um executavel fora do projeto pela variavel MAILPIT_PATH.
if not defined MAILPIT_PATH (
  if exist "%~dp0..\..\mailpit-windows-amd64\mailpit.exe" set "MAILPIT_PATH=%~dp0..\..\mailpit-windows-amd64\mailpit.exe"
)
if not defined MAILPIT_PATH (
  if exist "%~dp0..\mailpit-windows-amd64\mailpit.exe" set "MAILPIT_PATH=%~dp0..\mailpit-windows-amd64\mailpit.exe"
)
if defined MAILPIT_PATH (
  if exist "%MAILPIT_PATH%" (
    echo Iniciando Mailpit em http://localhost:8025...
    powershell.exe -NoProfile -Command "Start-Process -FilePath $env:MAILPIT_PATH -WindowStyle Hidden"
  ) else (
    echo [AVISO] Executavel MAILPIT_PATH nao encontrado. Confira a variavel de ambiente.
  )
) else (
  echo [AVISO] Mailpit opcional nao encontrado. Defina MAILPIT_PATH com o caminho do executavel.
)

if "%STT_DEVICE%"=="" set "STT_DEVICE=cpu"
echo Iniciando STT Service em http://127.0.0.1:8000...
".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
exit /b %errorlevel%

:modelo_invalido
echo [ERRO] STT_MODEL_PATH deve conter model.bin, config.json e tokenizer.json.
exit /b 1
