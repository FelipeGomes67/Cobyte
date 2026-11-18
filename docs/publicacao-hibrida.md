# Publicação híbrida: Vercel + API local

## Frontend

Na Vercel, importe este repositório e selecione **Root Directory: labware-web**, framework Vite, comando `npm run build` e saída `dist`.

Configure `VITE_API_URL` com a URL HTTPS do túnel, sem `/api`. Use somente a URL, sem sintaxe de link Markdown. O Axios remove barras finais e centraliza autenticação, STT, anexos, perfil e Web Push. A variável antiga `VITE_API_BASE_URL` foi substituída.

Para desenvolvimento, copie `labware-web/.env.example` para `.env.local`. O padrão é `http://localhost:8080`. No celular ou ao abrir o frontend com HTTPS, configure uma API HTTPS acessível pelo dispositivo, como o próprio túnel.

O `vercel.json` permite recarregar rotas como `/chamados/123`. O worker ativo do Web Push é `/push-sw.js`; ele permanece hospedado no frontend e abre URLs na origem da Vercel. O `/sw.js` legado também resolve destinos pela origem do frontend.

## Serviços locais e túnel

1. Configure a conexão com o Neon no backend, inicie Ollama e STT e configure os serviços de e-mail usados no ambiente. Não é necessário iniciar PostgreSQL local.
2. Carregue as chaves VAPID no ambiente do backend e inicie o Spring Boot na porta 8080.
3. Execute `cloudflared tunnel --url http://localhost:8080` e copie a URL HTTPS exibida.
4. Configure essa URL em `VITE_API_URL` na Vercel e publique. Quando a URL do túnel mudar, atualize a variável e faça redeploy.

O navegador acessa apenas a API pelo túnel. Ollama e STT continuam acessíveis localmente pelo backend, sem precisar de túneis próprios.

## Backend

O banco PostgreSQL está hospedado no **Neon**. A API local conecta diretamente ao Neon; o navegador não recebe credenciais do banco.

No terminal PowerShell em que iniciará a API, mantenha as credenciais Neon que já utiliza ou configure os valores obtidos em **Connect** no painel do Neon:

```powershell
$env:DB_URL = "jdbc:postgresql://SEU_HOST_NEON:5432/SEU_BANCO?sslmode=require"
$env:DB_USERNAME = "SEU_USUARIO_NEON"
$env:DB_PASSWORD = "SUA_SENHA_NEON"
.\mvnw.cmd spring-boot:run
```

Substitua os exemplos pelos dados reais. Use o formato JDBC na `DB_URL`, preservando os parâmetros de segurança da conexão Java fornecida pelo Neon. Essas variáveis sobrescrevem os valores padrão locais do `application.yml`. Não adicione credenciais ao Git nem às variáveis `VITE_*`. A conexão com Neon não foi testada nesta preparação.

Referências da conexão: [Neon](https://github.com/neondatabase/website/blob/main/content/docs/connect/connect-from-any-app.md) e [formato JDBC PostgreSQL](https://jdbc.postgresql.org/documentation/use/).

O `application.properties` contém `server.forward-headers-strategy=framework` e a propriedade de origens extras. As demais configurações continuam no `application.yml`.

O CORS aceita `http://localhost:*`, `http://127.0.0.1:*` e `https://*.vercel.app`, com credenciais, métodos GET/POST/PUT/PATCH/DELETE/OPTIONS e cabeçalhos Authorization/Content-Type. Para domínio próprio ou desenvolvimento HTTPS, defina `CORS_ALLOWED_ORIGINS`, separado por vírgulas. Exemplo: `https://suporte.exemplo.com,https://localhost:5174`. A variável antiga `CORS_ORIGENS` continua como fallback.

Configure também `FRONTEND_URL` com a URL do frontend publicado caso utilize links enviados por e-mail. As chaves privadas VAPID e demais segredos permanecem somente no backend.

## Validação local

- API: `mvnw.cmd compile -DskipTests`.
- CORS: `mvnw.cmd -Dtest=CorsConfigTest test` (preflight, credenciais, origens e métodos).
- Frontend: `npm run lint` e `npm run build`.

Não foi executado deploy, iniciado túnel nem realizado push nesta preparação. A integração com os domínios reais depende da URL gerada e da publicação.

Resultado local: compilação da API, lint, build e dois testes de CORS passaram. O build mantém o aviso de pacote JavaScript acima de 500 kB, sem impedir a geração. As alterações pendentes da rodada anterior de testes foram preservadas.

Referências: [SPA Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite) e [padrões de origem do Spring](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/cors/CorsConfiguration.html).
