# LabWare · Central de Suporte

Frontend React e Vite com login e cadastro integrados à API Spring Boot em `../labware-api`.

## Executar

Inicie a API na porta 8080 e execute neste diretório:

```sh
npm install
npm run dev
```

A URL da API é configurada pela constante `URL_API` em `src/services/service.js`, inicialmente `http://localhost:8080/api`. Esse arquivo centraliza a instância Axios, o envio do token e o tratamento de erros. Libere a origem do frontend no CORS da API (por padrão, `http://localhost:5173`).

## Autenticação

- Login: `POST /api/auth/login`, com `email` e `senha`.
- Cadastro: `POST /api/auth/cadastrar`, com `nome`, `email` e `senha`; depois faz login automaticamente para obter o JWT.
- O token é salvo no localStorage na chave `labware-token`. Senhas não são armazenadas no navegador.
- Ao recarregar, `GET /api/auth/me` valida o token e recupera o usuário antes de liberar as rotas.
- O cliente HTTP em `src/services/service.js` envia `Authorization: Bearer <token>` nas requisições autenticadas e encerra a sessão ao receber 401.
- Sair remove o token. Contas devem existir na API; credenciais fictícias não autenticam mais.
- Perfis SUPORTE e ADMIN usam as telas de suporte; CLIENTE usa as telas de cliente. A autorização efetiva continua sendo responsabilidade da API.

## Validação

Cadastro validado manualmente pelo responsável pelo projeto com a API real em 30/10/2026.

```sh
npm run lint
npm run build
node --test tests/authService.test.js
```

## Escopo atual

Temporariamente, a tela de login oferece o botão sem estilo próprio “Acessar sem login”. Ele abre as telas com um visitante em memória, incluindo relatórios, sem gerar token ou autenticar na API. Ao recarregar, o acesso de visitante termina; o login normal continua disponível ao sair.

A integração com a API cobre autenticação e cadastro. Chamados, relatórios e preferências ainda usam dados de demonstração e armazenamento local. O vínculo de um cliente com uma empresa deve ser feito no backend antes de abrir chamados reais. A troca de senha ainda não está integrada.
