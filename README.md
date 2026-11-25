# CoBYTE — Labware

Sistema de gestão de chamados de suporte para ambientes de laboratório. Reúne abertura por texto ou áudio, triagem por IA local, atendimento com chat, controle de SLA, notificações e avaliação do atendimento.

## Funcionalidades

- Cadastro público com nome da empresa informado livremente. O suporte ou ADMIN vincula o cliente a uma empresa oficial antes de liberar os chamados.
- Abertura de chamados com evidência obrigatória e opção de transcrever áudio. O relato transcrito pode ser revisado antes do envio.
- Triagem com categoria, prioridade, título técnico sugerido, sintoma e impacto operacional. Dados insuficientes ficam sinalizados para revisão.
- Chat com identificação do autor, foto, anexos e mensagens internas do suporte.
- Participação de mais de um técnico no atendimento.
- Fluxo controlado de status, cancelamento com justificativa e avaliação de 1 a 5 estrelas pelo solicitante.
- SLA pausado enquanto o chamado aguarda o solicitante. A resposta do cliente retoma o atendimento e a contagem do prazo.
- Notificações no sino e em uma página própria, preferências, e-mails com contexto e Web Push opcional por dispositivo.
- Alertas específicos para chamados críticos e para prazos de SLA com até uma hora restante.
- Dashboard, histórico, filtros e relatórios.
- Perfil com edição de dados, foto com recorte e alteração de senha.
- Administração de usuários, perfis, vínculos de empresa e exclusão definitiva de chamados e registros associados.

### Perfis de acesso

| Perfil | Uso principal |
| --- | --- |
| CLIENTE | Abrir e acompanhar seus chamados, consultar chamados da empresa e interagir nos atendimentos permitidos. |
| SUPORTE | Atender chamados, participar como técnico, confirmar classificação, acompanhar métricas e vincular clientes pendentes. |
| ADMIN | Gerenciar usuários, perfis, empresas, clientes pendentes e exclusão de chamados. A interface administrativa tem navegação própria. |

O cliente não altera a própria empresa no perfil. O cadastro público cria contas CLIENTE; contas internas devem ser provisionadas ou gerenciadas por um ADMIN autorizado. Não há credenciais padrão documentadas para acesso.

## Tecnologias e estrutura

| Parte | Tecnologias |
| --- | --- |
| API | Java 17, Spring Boot 4.1.1, Spring Security/JWT, JPA, Validation, Mail e SpringDoc OpenAPI |
| Frontend | React 19, Vite 8, React Router, Axios, Lucide e CSS por área |
| Banco | PostgreSQL, local ou hospedado, como Neon |
| Triagem | Spring AI e Ollama local, com modelo configurável |
| Transcrição | Python 3.12, FastAPI, Uvicorn, Faster-Whisper e PyAV |

```text
Cobyte/
├── labware-api/
│   ├── src/main/java/com/labware/api/
│   ├── src/main/resources/application.yml
│   ├── src/test/
│   ├── stt-service/
│   ├── docs/schema_labware_completo.sql
│   ├── iniciar-api.cmd
│   └── iniciar-api.ps1
├── labware-web/
│   ├── src/
│   ├── public/
│   └── package.json
└── relatos/
    ├── audios_gerados/
    ├── DadosTeste.csv
    └── novos_relatos.txt
```

O frontend usa a API para autenticação, chamados e transcrição. A API acessa o PostgreSQL, o Ollama e o serviço Python. Os arquivos em `relatos/` são material de teste manual; não são necessários para executar a aplicação.

## Executar no Windows

Os comandos abaixo são para PowerShell. Abra terminais separados para os serviços e parta da raiz do repositório em cada etapa.

### Pré-requisitos

- Git.
- JDK 17 ou superior.
- Node.js compatível com o Vite instalado: `20.19+` na linha 20, ou `22.12+`.
- Python 3.12 com o launcher `py`.
- PostgreSQL acessível e um banco criado, ou conexão de um banco hospedado.
- Ollama instalado para a triagem.
- Mailpit opcional para visualizar e-mails localmente.

O Maven Wrapper está no projeto; não é necessário instalar o Maven separadamente. O primeiro preparo precisa de internet para baixar dependências e modelos.

### 1. Preparar o Ollama

Com o Ollama em execução, instale o modelo que será configurado na API:

```powershell
ollama pull llama3.2
ollama list
```

Para usar Qwen 2.5 7B, instale-o e ajuste `OLLAMA_MODEL` na configuração da API:

```powershell
ollama pull qwen2.5:7b
```

O padrão do código continua sendo `llama3.2`. Instalar outro modelo não o seleciona automaticamente; o nome configurado deve coincidir com um modelo instalado na máquina que executa o Ollama.

A triagem possui timeout e fallback por regras. Uma resposta preenchida pela IA ainda pode estar incorreta; o suporte deve conferir a classificação e os avisos de revisão.

### 2. Preparar e iniciar a transcrição

```powershell
cd labware-api/stt-service
.\iniciar.cmd
```

O inicializador prepara a `.venv` com Python 3.12, instala dependências quando necessário, provisiona o modelo Whisper `small` e inicia o serviço. O primeiro download pode demorar.

Para preparar manualmente, execute uma linha por vez:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe preparar_modelo.py
.\iniciar.cmd
```

Não copie a `.venv` de outra máquina: recrie-a após clonar o projeto. Se a pasta existente usar outra versão de Python, renomeie-a antes de preparar novamente.

Confira o carregamento do modelo:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

O retorno deve indicar `model_loaded: true`. A documentação do serviço fica em [localhost:8000/docs](http://localhost:8000/docs).

A transcrição carrega o modelo localmente, sem baixá-lo durante as requisições. Para usar uma pasta já provisionada, configure `STT_MODEL_PATH` no ambiente do serviço Python; ela precisa conter `model.bin`, `config.json` e `tokenizer.json`.

### 3. Configurar e iniciar a API

```powershell
cd labware-api
.\iniciar-api.cmd
```

Na primeira execução sem configuração, o inicializador cria `labware-api/.env` e encerra pedindo o preenchimento dos dados. Edite esse arquivo e execute o comando novamente.

O formato aceito pelo inicializador é `NOME: valor` ou `NOME=valor`. Exemplo com valores fictícios:

```dotenv
DB_URL: jdbc:postgresql://localhost:5432/labware
DB_USERNAME: postgres
DB_PASSWORD: SUA_SENHA_DO_BANCO
JWT_SECRET: SUBSTITUA_POR_UMA_CHAVE_ALEATORIA_DE_NO_MINIMO_32_BYTES

OLLAMA_BASE_URL: http://localhost:11434
OLLAMA_MODEL: llama3.2
STT_SERVICE_URL: http://localhost:8000
UPLOADS_ARMAZENAMENTO: banco

WEB_PUSH_PUBLIC_KEY:
WEB_PUSH_PRIVATE_KEY:
WEB_PUSH_SUBJECT:
```

Substitua os exemplos pelas configurações da sua máquina. No Neon, utilize a URL JDBC do seu banco e o SSL exigido pela conexão, por exemplo `jdbc:postgresql://SEU_HOST/SEU_BANCO?sslmode=require`.

Para selecionar o Qwen, use:

```dotenv
OLLAMA_MODEL: qwen2.5:7b
```

A chave JWT precisa ter pelo menos 32 bytes. O `.env` é privado e ignorado pelo Git; não coloque credenciais reais em arquivos versionados.

Valide apenas a configuração, sem iniciar a API:

```powershell
.\iniciar-api.cmd -ValidarConfiguracao
```

O inicializador usa a própria pasta para localizar os arquivos, sem depender de um caminho como `C:\Users\nome-do-usuario\...`. Ele inicia somente a API: Ollama, STT e Mailpit são serviços separados.

#### Executar pelo IntelliJ IDEA

Abra o módulo `labware-api` como projeto Maven, selecione o JDK e execute `com.labware.api.LabwareApiApplication`.

Configure as variáveis em **Run/Debug Configurations → Environment variables**. Os nomes são os mesmos do exemplo acima, mas os valores devem ser preenchidos no formato esperado pelo IntelliJ.

O Spring Boot não lê automaticamente o `.env` pelo inicializador quando a aplicação é executada diretamente pelo IntelliJ. Portanto, configure o ambiente da execução na IDE ou utilize `iniciar-api.cmd`. Reinicie a API após mudar suas variáveis.

### 4. Iniciar o frontend

```powershell
cd labware-web
npm ci
npm run dev
```

O frontend usa `http://localhost:8080` como endereço padrão da API. Para outro endereço, crie `labware-web/.env.local` com:

```dotenv
VITE_API_URL=http://localhost:8080
```

Para liberar outra origem do frontend, configure `CORS_ALLOWED_ORIGINS` na API com as URLs autorizadas separadas por vírgula.

Informe a URL base sem `/api`. Reinicie o Vite após alterar o arquivo. Variáveis `VITE_*` são públicas e incorporadas no build; nunca coloque senhas, segredo JWT ou chave privada de push nelas.

## Endereços locais

| Serviço | Endereço |
| --- | --- |
| Aplicação web | [http://localhost:5173](http://localhost:5173) |
| API | [http://localhost:8080](http://localhost:8080) |
| Swagger da API | [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) |
| Contrato OpenAPI | [http://localhost:8080/api-docs](http://localhost:8080/api-docs) |
| Saúde do STT | [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) |
| Ollama | http://localhost:11434 |
| Mailpit, quando iniciado | [http://localhost:8025](http://localhost:8025) |

### E-mails e Web Push

A configuração de e-mail local aponta para SMTP em `localhost:1025`. O Mailpit captura as mensagens e permite consultá-las pela interface na porta 8025.

O inicializador do STT procura o Mailpit nas pastas locais previstas e também aceita `MAILPIT_PATH`, com o caminho do executável. Se ele não estiver disponível, o STT continua funcionando. Para outro servidor SMTP, configure `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH` e `MAIL_STARTTLS_ENABLE` no ambiente da API.

O Web Push é opcional. Preencha as três variáveis `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY` e `WEB_PUSH_SUBJECT` com um par VAPID e um assunto válido, como um contato `mailto:`. Cada navegador precisa autorizar e ativar as notificações do dispositivo. A autorização do navegador é separada das preferências de e-mail.

Para links de notificações e e-mails em outro endereço, configure `FRONTEND_URL` na API. O frontend de produção precisa usar HTTPS.

### Arquivos e banco compartilhado

`UPLOADS_ARMAZENAMENTO=banco` armazena os arquivos de forma compartilhada no banco. Isso permite acessar as evidências e fotos em máquinas diferentes que usam o mesmo banco.

O modo `local` usa as pastas configuradas por `UPLOADS_DIRETORIO` e `UPLOADS_DIRETORIO_FOTOS`. Compartilhar apenas o banco não replica esses arquivos entre computadores.

Atualmente, o projeto utiliza `spring.jpa.hibernate.ddl-auto=update` e o Flyway está desabilitado. O schema SQL em [labware-api/docs/schema_labware_completo.sql](labware-api/docs/schema_labware_completo.sql) é uma referência completa para criação em banco vazio; não é uma migração para aplicar sobre um banco existente nem é executado automaticamente.

## Regras do atendimento

- O chamado começa em Aberto e entra em Em análise antes do atendimento.
- Categoria e prioridade precisam ser definidas e salvas antes de avançar para o atendimento.
- A prioridade só pode ser alterada em Em análise.
- Em atendimento não retorna para Em análise.
- Aguardando solicitante pausa o SLA; uma resposta do cliente retoma Em atendimento.
- Resolvido pode ser fechado ou reaberto para atendimento. Fechado e Cancelado são estados finais.
- O cancelamento exige justificativa.
- A exclusão pelo ADMIN é definitiva no banco e remove os registros vinculados ao chamado. E-mails já entregues, cópias baixadas e backups não são recolhidos. A limpeza de arquivos locais ocorre no servidor e eventuais falhas são informadas.

A API verifica as permissões; ocultar um botão no frontend não substitui a autorização do servidor.

## Validação do código

Na pasta `labware-api`:

```powershell
.\mvnw.cmd compile -DskipTests
```

Na pasta `labware-web`:

```powershell
npm run lint
npm run build
```

Para executar as suítes de teste, separadamente:

```powershell
# Dentro de labware-api
.\mvnw.cmd test

# Dentro de labware-web
npm test

# Dentro de labware-api/stt-service, com as dependências de desenvolvimento
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest
```

Os testes de integração Java configuram H2 em memória. Os testes locais não substituem a verificação de transcrição com áudio real nem a conferência das respostas do Ollama.

## Problemas comuns após clonar

| Sintoma | O que conferir |
| --- | --- |
| STT não inicia | Python 3.12, dependências da `.venv`, modelo `small` provisionado e porta 8000 livre. |
| Modelo Whisper não encontrado | Execute `preparar_modelo.py` com a Python da `.venv`, ou confira `STT_MODEL_PATH`. |
| Triagem usa fallback | Confira `ollama list`, o serviço Ollama e se `OLLAMA_MODEL` corresponde ao modelo instalado. |
| API não conecta ao banco | URL JDBC, usuário, senha, conectividade e SSL do banco hospedado. |
| Cliente não consegue abrir chamado | Confirme se o suporte ou ADMIN já vinculou sua empresa. |
| Arquivo existe em uma máquina, mas não em outra | Confira o modo de armazenamento; arquivos locais não são compartilhados apenas pelo banco. |
| Aviso sobre Mailpit ausente | Configure `MAILPIT_PATH` ou inicie um SMTP separado, se quiser testar e-mails. |
| Frontend não alcança a API | Confira `VITE_API_URL`, a porta da API e as origens CORS autorizadas. |
| Microfone não funciona pelo IP do celular | A gravação precisa de um contexto seguro. O HTTP local do computador e o acesso por IP no celular têm comportamentos diferentes; use HTTPS com certificado confiável para esse acesso. |

Para testar somente no computador, utilize os endereços `localhost` acima. O comando `npm run dev:rede` expõe o frontend na rede, mas também exige que o celular consiga alcançar a API e que a origem esteja autorizada no CORS. O modo `npm run dev:https` depende dos certificados locais esperados em `labware-web/.certs/` e usa a porta 5174.
