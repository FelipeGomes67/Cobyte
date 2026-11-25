# Cobyte no RunPod

Esta implantação usa um GPU Pod Linux x86_64 com API Java 17, Ollama e STT Python 3.12 no mesmo container. O frontend continua na Vercel e o PostgreSQL no Neon.

## Preparar a imagem

### Sem Docker local: GitHub Actions

1. No Docker Hub, crie o repositório `cobyte-runpod` e um Personal Access Token com permissão de escrita (Read & Write). Não envie o token pelo chat.
2. No repositório do código no GitHub, abra Settings > Secrets and variables > Actions.
3. Na aba Variables, crie `DOCKERHUB_USERNAME` com seu usuário do Docker Hub.
4. Na aba Secrets, crie `DOCKERHUB_TOKEN` com o token de acesso.
5. Faça commit e push dos arquivos de `deploy/runpod`, `.dockerignore` e `.github/workflows/publicar-runpod.yml` para a branch principal.
6. Abra Actions > Publicar imagem do Cobyte para RunPod > Run workflow. A publicação é manual e não ocorre a cada push.
7. Aguarde o resultado verde e use `SEU_USUARIO/cobyte-runpod:1` como Container image no RunPod. Também é publicada uma tag com o SHA do commit para identificar a versão exata.

Para imagem privada, configure no RunPod uma credencial de leitura do Docker Hub. Os segredos do banco, JWT e VAPID ficam somente no RunPod, sem serem enviados ao build. A construção usa os recursos e a cota de GitHub Actions da sua conta; confira a disponibilidade antes de executar. O build não testa inferência com GPU.

### Com Docker local

Instale Docker Desktop com containers Linux e execute na raiz do repositório. Substitua SEU_USUARIO pelo usuário de um registry Docker seu.

    docker build --platform linux/amd64 -f deploy/runpod/Dockerfile -t SEU_USUARIO/cobyte-runpod:1 .
    docker login
    docker push SEU_USUARIO/cobyte-runpod:1

O contexto Docker tem uma lista explícita de arquivos permitidos. O .env, uploads e modelos locais ficam fora da imagem. Os modelos são baixados na primeira inicialização e armazenados em /workspace.

O Dockerfile fixa Ollama 0.13.0 e CUDA 12.8.1 com cuDNN. Atualizações dessas versões devem passar por build e teste de inferência. O launcher prepara o Whisper small antes de iniciar o serviço offline. Se qualquer serviço terminar, ele encerra o conjunto e retorna erro.

## Criar o Pod

Use Pods com imagem personalizada SEU_USUARIO/cobyte-runpod:1. Para imagem privada, configure as credenciais de leitura no RunPod.

Configuração inicial sugerida para medir desempenho com os modelos atuais:

| Campo | Valor inicial |
| --- | --- |
| GPU | NVIDIA com pelo menos 12 GB de VRAM, compatível com CUDA 12.8 |
| RAM do sistema | Pelo menos 16 GB |
| vCPU | Pelo menos 4 |
| Container disk | 30 GB |
| Volume disk ou network volume | 30 GB, montado em /workspace |
| Expose HTTP Ports | Apenas 8080 |
| Docker command | Deixar vazio para usar o ENTRYPOINT da imagem |

A disponibilidade e o preço dependem da GPU, do datacenter e do armazenamento escolhido. Confira o total estimado antes de criar o Pod. O volume pode continuar gerando cobrança quando o Pod está parado.

## Variáveis no painel do RunPod

Preencha as variáveis de ambiente do Pod com os valores atuais do ambiente. A imagem não lê o .env do seu computador.

| Nome | Valor |
| --- | --- |
| DB_URL | URL JDBC do Neon, incluindo sslmode=require |
| DB_USERNAME | Usuário do Neon |
| DB_PASSWORD | Senha do Neon |
| JWT_SECRET | Segredo próprio, com pelo menos 32 bytes |
| CORS_ALLOWED_ORIGINS | URL HTTPS exata do frontend na Vercel |
| FRONTEND_URL | A mesma URL do frontend |
| WEB_PUSH_PUBLIC_KEY | Chave pública VAPID, se usar push |
| WEB_PUSH_PRIVATE_KEY | Chave privada VAPID, se usar push |
| WEB_PUSH_SUBJECT | mailto:seu-email@exemplo.com, se usar push |
| MAIL_HOST, MAIL_PORT | SMTP externo para envio real de e-mails |
| MAIL_USERNAME, MAIL_PASSWORD | Credenciais desse SMTP |
| MAIL_SMTP_AUTH, MAIL_STARTTLS_ENABLE | Conforme o provedor SMTP |

As três variáveis de push devem estar todas preenchidas ou todas vazias. O Mailpit local não fica acessível pelo localhost do Pod.

Os padrões da imagem são STT_DEVICE=cuda, OLLAMA_MODEL=llama3.2, STT com prazo de 80 segundos e áudio com duração máxima de 120 segundos. Os serviços internos usam loopback nas portas 8000 e 11434. O launcher define seus endereços para a API. O armazenamento de anexos e fotos usa o banco.

## Publicar e conferir

1. Inicie o Pod e acompanhe os logs. Aguarde os downloads e a mensagem Cobyte pronto.
2. Na aba Connect, abra o endereço HTTPS da porta 8080. O formato usual é https://ID_DO_POD-8080.proxy.runpod.net.
3. Confira /swagger-ui.html, faça login com uma conta de teste e abra um chamado de texto.
4. Na Vercel, configure VITE_API_URL com o endereço HTTPS da porta 8080, sem /api, e faça redeploy. O Root Directory continua cobyte-web.
5. Teste transcrição, classificação, anexos, mensagens, e-mail e push no endereço público.
6. No terminal do Pod, use nvidia-smi e ollama ps durante as requisições para confirmar uso de GPU.

O proxy HTTP do RunPod tem limite de 100 segundos. A inferência real deve ser medida com seus áudios. Chamadas que ultrapassam esse prazo precisam de fluxo assíncrono com acompanhamento ou outra entrada HTTPS. Os tempos configurados são limites de espera e não garantem a latência total de cada fluxo.

## Verificar localmente

Dentro de cobyte-api:

    .\mvnw.cmd -DskipTests package

Dentro de cobyte-api/stt-service:

    .\.venv\Scripts\python.exe -m pytest ..\..\deploy\runpod\tests -q

Na raiz, com Docker e GPU NVIDIA disponíveis, construa a imagem e execute:

    docker run --rm --gpus all --env-file cobyte-api/.env -p 127.0.0.1:8080:8080 -v cobyte-modelos:/workspace SEU_USUARIO/cobyte-runpod:1

O arquivo usado em --env-file precisa ter os campos exigidos na tabela, usando NOME=valor. Ajuste o CORS para a origem usada nesse teste.

## Referências

- [Portas e limite do proxy](https://docs.runpod.io/pods/configuration/expose-ports)
- [Ollama com GPU em Docker](https://docs.ollama.com/docker)
- [Requisitos do Faster Whisper](https://github.com/SYSTRAN/faster-whisper)
- [Armazenamento dos Pods](https://www.runpod.io/blog/where-did-my-files-go-a-straight-guide-to-runpod-storage)
