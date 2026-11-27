# Cobyte · Central de Suporte

Frontend React e Vite com login e cadastro integrados à API Spring Boot em `../cobyte-api`.

## Executar

Inicie a API na porta 8080 e execute neste diretório:

```sh
npm ci
npm run dev
```

A URL da API é configurada por `VITE_API_URL` em `.env.local`, usando `http://localhost:8080` quando não informada. Informe a URL base sem `/api`. O arquivo `src/services/api.js` centraliza o Axios, o token e o tratamento de erros. Configure `CORS_ALLOWED_ORIGINS` na API com a origem exata do frontend, como `http://localhost:5173`.

```dotenv
VITE_API_URL=http://localhost:8080
```

Na Vercel, selecione `cobyte-web` como **Root Directory** e configure a URL HTTPS da API. Faça um novo deploy após alterar variáveis ou publicar código. As rotas SPA são tratadas por `vercel.json`. Variáveis `VITE_*` são públicas; credenciais do banco, segredo JWT, chave interna do STT e chave privada de push ficam somente no backend.

## Autenticação

- Login: `POST /api/auth/login`, com `email` e `senha`.
- Cadastro: `POST /api/auth/cadastrar`, com `nome`, `email`, `senha` e `empresaInformada`; depois tenta fazer login automaticamente para obter o JWT.
- O token é salvo no localStorage na chave `cobyte-token`. Senhas não são armazenadas no navegador.
- Ao recarregar, `GET /api/usuarios/me` valida a sessão e recupera o usuário antes de liberar as rotas.
- O cliente HTTP em `src/services/api.js` envia `Authorization: Bearer <token>` nas requisições autenticadas e encerra a sessão ao receber 401.
- Sair remove o token. Contas devem existir na API; credenciais fictícias não autenticam mais.
- ADMIN tem navegação própria e pode abrir os detalhes dos chamados pela listagem administrativa; SUPORTE usa as telas de atendimento e CLIENTE usa as telas de cliente. A autorização efetiva continua sendo responsabilidade da API.

## Validação

Execute nesta pasta:

```sh
npm run lint
npm run build
npm test
```

## Escopo atual

- Chamados por texto ou áudio, evidências, transcrição revisável e triagem por IA.
- Na gravação ativa, o botão mostra pausa. Quando pausado, volta ao microfone para retomar.
- Chat, anexos, imagens, reprodução de áudio e visualização dos formatos suportados.
- Atendimento com vários técnicos, fluxo de status, SLA, cancelamento e avaliações.
- Dashboard da empresa com os principais problemas em ordem decrescente de ocorrências e desempate alfabético.
- Chamados cancelados exibem “Cancelado” na prioridade e na categoria, preservando a classificação original no banco.
- Perfil com edição de dados e senha, foto com recorte e zoom e editor responsivo.
- O envio da foto aguarda a preparação da imagem e só confirma sucesso após reler o perfil e carregar a foto salva na API. Depois, a prévia local é substituída pela imagem da API.
- Notificações, preferências, Web Push opcional, histórico, filtros, relatórios e administração.

O cliente precisa ter sua empresa vinculada pelo suporte ou ADMIN para acessar os recursos operacionais. Fotos da API são carregadas pelo Axios, incluindo o cabeçalho necessário para o ngrok.

Consulte o [README principal](../README.md) para configurar banco, Ollama, STT e inicializadores. Os testes automatizados não substituem a conferência manual de microfone, recorte da foto e acesso pelo domínio de produção.
