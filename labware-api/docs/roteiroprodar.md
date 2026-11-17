# Roteiro para rodar em outro computador Windows

## 1. Antes de sair

- Garanta que todos tenham a mesma versão do repositório. Alterações locais sem commit/push não chegam a quem clona ou dá pull.
- Leve as credenciais do Neon, o JWT_SECRET e, se testar Web Push, o mesmo par de chaves VAPID já usado com esse banco. Compartilhe por um meio privado, nunca por commit.
- Use internet na primeira preparação: Maven, npm, Ollama e Whisper precisam baixar dependências/modelos.
- O teste compartilha o banco Neon: chamados, mensagens e alterações de perfil feitas pelos amigos afetam os mesmos dados.

## 2. Instalar uma vez em cada máquina

- Git.
- JDK 17; selecione esse JDK no projeto e na execução do IntelliJ.
- Node.js 22.12 ou superior compatível com o Vite instalado; confira com `node --version` e `npm --version`.
- Python 3.12 com o launcher `py`; confira com `py -3.12 --version`.
- Ollama para Windows.
- Mailpit para Windows, se for testar os e-mails locais. Extraia `mailpit.exe` em `Cobyte/mailpit-windows-amd64/` ou configure o caminho da máquina.

Não é necessário instalar Maven globalmente: o projeto usa `mvnw.cmd`.
Com o Neon configurado, não é necessário instalar PostgreSQL local.

## 3. Obter o projeto

Clone o repositório ou atualize uma cópia limpa com `git pull --ff-only`.
Confirme o commit com `git log -1 --oneline`.
Abra `labware-api/pom.xml` no IntelliJ e recarregue o projeto Maven.

## 4. Variáveis da API no IntelliJ

Em **Run > Edit Configurations > LabwareApiApplication > Environment variables**
(se necessário, **Modify options > Environment variables**), preencha:

| Variável | Valor a configurar |
|---|---|
| `DB_URL` | URL JDBC do Neon, `jdbc:postgresql://HOST/BANCO?sslmode=require` |
| `DB_USERNAME` | Usuário do Neon |
| `DB_PASSWORD` | Senha do Neon |
| `JWT_SECRET` | Seu segredo atual, com pelo menos 32 bytes |
| `UPLOADS_ARMAZENAMENTO` | `banco` |

Confira também o **Working directory**: a pasta `labware-api` daquela máquina.
Não copie caminhos `C:\Users\felipe\...` para outra máquina.
As variáveis da configuração do IntelliJ não são automaticamente aplicadas aos terminais abertos separadamente.

Valores opcionais; os padrões já atendem ao teste no mesmo computador:

| Variável | Padrão / uso |
|---|---|
| `STT_SERVICE_URL` | `http://localhost:8000` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` |
| `OLLAMA_MODEL` | `llama3.2` |
| `IA_TIMEOUT_MS` | `30000`; computador lento pode precisar de ajuste |
| `IA_MAX_TOKENS` | `768` |
| `MAIL_HOST` / `MAIL_PORT` | `localhost` / `1025` para Mailpit |
| `MAIL_SMTP_AUTH` / `MAIL_STARTTLS_ENABLE` | `false` / `false` para Mailpit |
| `FRONTEND_URL` | `http://localhost:5173`, usado nos links dos e-mails |
| `CORS_ORIGENS` | `http://localhost:5173`; múltiplas origens separadas por vírgula |
| `WEB_PUSH_PUBLIC_KEY` | Chave pública VAPID, se testar Web Push |
| `WEB_PUSH_PRIVATE_KEY` | Chave privada correspondente; nunca versionar |
| `WEB_PUSH_SUBJECT` | Contato VAPID, por exemplo `mailto:seu-email@dominio.com` |

O esquema está com `ddl-auto: update` e Flyway desabilitado: a API tenta atualizar as tabelas ao iniciar. O usuário do banco precisa ter permissão para isso. Não apague tabelas para resolver erros.

## 5. Preparar a IA local

Com o Ollama aberto, no terminal:

```powershell
ollama pull llama3.2
ollama list
ollama run llama3.2
```

Envie uma mensagem curta para conferir o modelo e digite `/bye` para sair da conversa.
O serviço deve continuar disponível na porta 11434. Se não estiver, execute `ollama serve` em um terminal; não inicie uma segunda instância se ele já estiver ativo.
Instalar o Ollama sem baixar `llama3.2` não basta. O primeiro carregamento pode ser mais lento e a velocidade depende do hardware.

## 6. Preparar e iniciar o STT

Na pasta `labware-api/stt-service`:

```powershell
.\iniciar.cmd
```

O script cria a `.venv` com Python 3.12, instala dependências ausentes e prepara o Whisper `small` quando necessário. Aguarde o download e a mensagem de inicialização concluída; deixe esse terminal aberto.
Não copie a `.venv` de outro computador: ela contém caminhos e binários locais.

Se precisar preparar manualmente, execute uma linha de cada vez:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe preparar_modelo.py
.\iniciar.cmd
```

Confira `http://localhost:8000/health`: deve indicar `model_loaded: true`.
Não defina `STT_MODEL_PATH` apontando para a pasta de outra máquina.
Não habilite `HF_HUB_OFFLINE` antes de baixar o modelo.
Para testar sem internet depois, os modelos do Ollama e do Whisper precisam estar provisionados nessa máquina; o banco Neon continua exigindo conexão.

## 7. Mailpit

O `iniciar.cmd` procura o executável em caminhos relativos e pode abri-lo automaticamente.
Se estiver em outro lugar, configure **no terminal do STT**, antes de iniciar:

```powershell
$env:MAILPIT_PATH = 'C:\caminho\da-maquina\mailpit.exe'
.\iniciar.cmd
```

Ou execute `mailpit.exe` manualmente uma única vez.
Abra `http://localhost:8025`; o SMTP usa a porta 1025.
Mailpit captura os e-mails localmente: não entrega para caixas reais como Gmail. A caixa de cada computador é independente.
Sem Mailpit/SMTP ativo, o teste de e-mail não funcionará, mesmo que a API inicie.

## 8. Iniciar a API

Execute `LabwareApiApplication` no IntelliJ, com as variáveis acima.
Espere a mensagem `Started LabwareApiApplication`.
Confira `http://localhost:8080/swagger-ui/index.html`.

Não execute a API simultaneamente pelo IntelliJ e pelo Maven na mesma porta.
Se surgir `NoClassDefFoundError` ou classe antiga, pare a execução e faça **Build > Rebuild Project**. Alternativamente, na pasta `labware-api`, rode `mvnw.cmd clean compile -DskipTests` antes de iniciar novamente. Evite recompilar/limpar a saída enquanto a API está iniciando.

## 9. Instalar e iniciar o frontend

Na pasta `labware-web`:

```powershell
npm ci
npm run dev
```

Abra **http://localhost:5173** no navegador desse computador.
O Vite encaminha `/api` para `http://127.0.0.1:8080`. Não precisa colocar o IP de Felipe em nenhum arquivo.
Não é necessário criar `.env` para esse fluxo. Se existir um `.env.local` antigo com `VITE_API_BASE_URL`, remova/corrija o valor caso aponte para outra máquina e reinicie o Vite.
Os certificados locais não são necessários para testar o microfone em `localhost`; permita o acesso quando solicitado.

## 10. Conferência rápida da apresentação

- Login de cliente, suporte e ADMIN.
- Cadastro pendente e vínculo com empresa pelo suporte.
- Abertura por texto; conferir categoria, prioridade, justificativa e alerta de revisão.
- Participar do atendimento; mudar categoria/prioridade em Em Análise.
- Chat: suporte não participante só lê; participante envia.
- Aguardar solicitante e responder como cliente: conferir retomada do SLA.
- Abrir por voz: permitir microfone, gravar, ouvir e transcrever.
- Baixar uma evidência e conferir foto do usuário.
- Notificação no sino e e-mail no Mailpit.
- Resolver, avaliar e consultar histórico.

Evidências e fotos novas ficam compartilhadas no banco com `UPLOADS_ARMAZENAMENTO=banco`. Arquivos antigos que só existiam no disco de Felipe precisam ser migrados pelo ADMIN, na máquina original, em Configurações > Arquivos. Compartilhar o banco não compartilha automaticamente pastas antigas.

## 11. Celular / outro dispositivo: opcional

Para expor o site à mesma rede, use `npm run dev:rede` e consulte o IP atual com `ipconfig`.
HTTP por IP não permite gravação pelo navegador. Para isso, use o HTTPS opcional:

```powershell
pwsh -NoProfile -File tools/dev/gerar-https.ps1 -Ip IP_ATUAL_DA_MAQUINA
npm run dev:https
```

O gerador exige PowerShell 7 (`pwsh`). Instale/confie no certificado público `public/labware-local-ca.cer` no celular e abra `https://IP_ATUAL_DA_MAQUINA:5174`.
Para disponibilizar o download do certificado antes disso, pode manter `npm run dev:rede` em outro terminal e abrir `http://IP_ATUAL_DA_MAQUINA:5173/labware-local-ca.cer`.
Se gerar um certificado novo, será preciso instalar/confiar no novo certificado no celular. Certificados e chaves locais estão ignorados no Git; não copie as chaves privadas para os amigos.
Libere a conexão do Node no firewall apenas quando for usar a rede local. Não é necessário expor STT, Ollama ou SMTP ao celular: o frontend usa o proxy e a API chama esses serviços no computador.
