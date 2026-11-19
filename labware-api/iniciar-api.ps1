param(
    [string]$ArquivoEnv = (Join-Path $PSScriptRoot '.env'),
    [switch]$ValidarConfiguracao
)

$ErrorActionPreference = 'Stop'

try {
    if (-not (Test-Path -LiteralPath $ArquivoEnv -PathType Leaf)) {
        if (-not $PSBoundParameters.ContainsKey('ArquivoEnv')) {
            @'
# Configuracao privada desta maquina. Este arquivo e ignorado pelo Git.
# Preencha os valores sem $env:, sem ponto e virgula e sem links Markdown.
# Pode usar aspas simples ou duplas envolvendo o valor completo.
DB_URL:
DB_USERNAME:
DB_PASSWORD:
JWT_SECRET:

# Web Push e opcional. Preencha as tres variaveis ou deixe as tres vazias.
WEB_PUSH_PUBLIC_KEY:
WEB_PUSH_PRIVATE_KEY:
WEB_PUSH_SUBJECT:

OLLAMA_BASE_URL: http://localhost:11434
OLLAMA_MODEL: llama3.2
STT_SERVICE_URL: http://localhost:8000
UPLOADS_ARMAZENAMENTO: banco
'@ | Set-Content -LiteralPath $ArquivoEnv -Encoding UTF8
            throw 'Criei o arquivo .env privado ao lado deste script. Preencha DB_URL, DB_USERNAME, DB_PASSWORD e JWT_SECRET e execute novamente.'
        }
        throw 'Arquivo de ambiente nao encontrado.'
    }

    # Faz somente leitura de texto. Nao executa expressoes, comandos ou expansoes.
    $configuracao = @{}
    $numeroLinha = 0
    foreach ($linha in [System.IO.File]::ReadAllLines((Resolve-Path -LiteralPath $ArquivoEnv).Path)) {
        $numeroLinha++
        $texto = $linha.Trim()
        if (-not $texto -or $texto.StartsWith('#')) { continue }
        if ($texto -notmatch '^([A-Z][A-Z0-9_]*)\s*[:=](.*)$') {
            throw "Formato invalido na linha $numeroLinha do .env. Use NOME: valor."
        }
        $nome = $Matches[1]
        $valor = $Matches[2].Trim()
        if ($configuracao.ContainsKey($nome)) {
            throw "Variavel duplicada no .env: $nome."
        }
        if ($valor.StartsWith('"') -or $valor.StartsWith("'")) {
            $aspas = $valor.Substring(0, 1)
            if ($valor.Length -lt 2 -or -not $valor.EndsWith($aspas)) {
                throw "Aspas incompletas na linha $numeroLinha do .env."
            }
            $valor = $valor.Substring(1, $valor.Length - 2)
        }
        $configuracao[$nome] = $valor
    }

    $faltantes = @('DB_URL', 'DB_USERNAME', 'DB_PASSWORD', 'JWT_SECRET') |
        Where-Object { -not $configuracao.ContainsKey($_) -or [string]::IsNullOrWhiteSpace($configuracao[$_]) }
    if ($faltantes) { throw ('Preencha no .env: ' + ($faltantes -join ', ') + '.') }
    if (-not $configuracao['DB_URL'].StartsWith('jdbc:postgresql://')) {
        throw 'DB_URL deve ser uma URL JDBC PostgreSQL iniciada por jdbc:postgresql://.'
    }
    if ([System.Text.Encoding]::UTF8.GetByteCount($configuracao['JWT_SECRET']) -lt 32) {
        throw 'JWT_SECRET precisa ter pelo menos 32 bytes.'
    }
    $push = @('WEB_PUSH_PUBLIC_KEY', 'WEB_PUSH_PRIVATE_KEY', 'WEB_PUSH_SUBJECT')
    $pushPreenchido = @($push | Where-Object { -not [string]::IsNullOrWhiteSpace($configuracao[$_]) })
    if ($pushPreenchido.Count -ne 0 -and $pushPreenchido.Count -ne 3) {
        throw 'Preencha as tres variaveis WEB_PUSH_* ou deixe as tres vazias.'
    }
    foreach ($nome in @('OLLAMA_BASE_URL', 'STT_SERVICE_URL')) {
        if (-not [string]::IsNullOrWhiteSpace($configuracao[$nome])) {
            $url = $null
            if (-not [Uri]::TryCreate($configuracao[$nome], [UriKind]::Absolute, [ref]$url) -or $url.Scheme -notin @('http', 'https')) {
                throw "$nome deve conter uma URL http:// ou https://, sem formatacao Markdown."
            }
        }
    }

    if ($ValidarConfiguracao) {
        Write-Output 'Configuracao do .env valida. Nenhum segredo foi exibido e a API nao foi iniciada.'
        exit 0
    }

    $wrapper = Join-Path $PSScriptRoot 'mvnw.cmd'
    if (-not (Test-Path -LiteralPath $wrapper -PathType Leaf)) {
        throw 'mvnw.cmd nao encontrado ao lado do inicializador.'
    }
    $anteriores = @{}
    foreach ($nome in $configuracao.Keys) {
        $anteriores[$nome] = [Environment]::GetEnvironmentVariable($nome, 'Process')
    }
    Push-Location -LiteralPath $PSScriptRoot
    try {
        foreach ($nome in $configuracao.Keys) {
            [Environment]::SetEnvironmentVariable($nome, $configuracao[$nome], 'Process')
        }
        Write-Output 'Iniciando a API com o .env local. Ollama, STT e Mailpit devem ser iniciados separadamente.'
        & $wrapper 'spring-boot:run'
        $codigo = $LASTEXITCODE
    }
    finally {
        foreach ($nome in $anteriores.Keys) {
            [Environment]::SetEnvironmentVariable($nome, $anteriores[$nome], 'Process')
        }
        Pop-Location
    }
    exit $codigo
}
catch {
    Write-Error $_.Exception.Message -ErrorAction Continue
    exit 1
}
