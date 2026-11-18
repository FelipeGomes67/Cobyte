# Segurança e migração dos chamados

## Permissões

| Perfil | Permissão no chamado |
| --- | --- |
| Solicitante da empresa atual | Lê, responde, envia anexos e executa as ações do cliente previstas para o status |
| Outro cliente da empresa atual | Lê o chamado, as mensagens públicas e os anexos públicos. Pode marcar a própria leitura |
| Cliente sem vínculo ou de outra empresa | Acesso bloqueado, inclusive se ele abriu o chamado antes de mudar de empresa |
| Suporte | Lê chamados e pode participar do atendimento. Alterações exigem participação |
| Administrador | Acessa a administração. Mantém exceções operacionais para edição e precisa participar para enviar mensagens |

Os anexos de notas internas ficam fora da listagem pública e o download verifica essa visibilidade. O servidor obtém identidade e perfil da sessão e do banco. O vínculo da empresa também limita listagens e notificações.

## Atualização da API e do frontend

1. Faça backup do Neon e valide o procedimento em uma branch de teste com dados sintéticos.
2. Em uma janela de manutenção, pare a API anterior e aplique [V001__uuid_publico_chamado.sql](../db/migracoes-manuais/V001__uuid_publico_chamado.sql) no banco escolhido. A migração preenche registros existentes, preserva IDs internos e relacionamentos e cria o índice único. O script pode ser reaplicado sem trocar UUIDs. O Flyway permanece desativado neste projeto e o script é manual.
3. Configure na API os valores novos de `DB_PASSWORD`, `JWT_SECRET` e das chaves VAPID pelos canais próprios do ambiente. `JWT_SECRET` é obrigatório e precisa ter pelo menos 32 bytes. Mantenha `DB_URL` e `DB_USERNAME` apontando para o Neon. Se usar Vercel, configure `CORS_ALLOWED_ORIGINS` com os domínios exatos que devem chamar a API.
4. Suba a API e publique o frontend na mesma janela. `VITE_API_URL` deve apontar para o túnel ativo.
5. Refaça o login e, após trocar o par VAPID, reative as inscrições de Web Push. Verifique chamados, anexos, mensagens e notificações com contas de teste.

O contrato público usa UUID no campo `id` do chamado e em links novos de e-mail e push. As notificações do aplicativo passam a retornar o UUID dos chamados já vinculados. Links numéricos antigos, incluindo e-mails anteriores, precisam ser substituídos pelo link atual da listagem. Os tokens antigos exigem novo login. Troca de senha ou perfil administrativo revoga as sessões da conta.

Em caso de retorno, publique o frontend e a API anteriores juntos. As colunas novas podem permanecer no banco e o valor padrão de UUID permite inserir chamados com a API anterior. Se já tiver distribuído links UUID, considere o impacto temporário de restaurar o contrato antigo.

## Limites

| Propriedade do Spring | Padrão |
| --- | --- |
| `labware.limites.login-ip` | 60 solicitações por minuto |
| `labware.limites.login-conta` | 6 solicitações por minuto |
| `labware.limites.cadastro-ip` | 12 solicitações por minuto |
| `labware.limites.ia-usuario` | 8 solicitações por minuto, incluindo criação, triagem e transcrição |
| `labware.limites.inferencias-simultaneas` | 2 requisições |

Os limites são locais à instância. Atrás do túnel, login e cadastro compartilham a cota do endereço do conector, enquanto o login também tem uma cota por conta. As requisições excedentes recebem 429 com `Retry-After`. Ajuste os valores conforme o uso real.

O armazenamento valida extensão e assinatura do conteúdo para imagens, PDFs e áudios suportados. A validação por assinatura não inclui antivírus nem inspeção completa do documento. Os downloads continuam autenticados e são entregues como anexos. Fotos de perfil preservam a validação e a conversão já existentes.

## Validação

- Migração aplicada duas vezes em PostgreSQL 18 descartável, com verificação dos UUIDs dos registros preexistentes e de um novo registro.
- Testes HTTP com Spring Security real, JWTs sintéticos e H2. Cobrem acesso sem sessão, isolamento entre empresas, alterações pelo autor e por colega, rotas ADMIN, revogação, visibilidade de anexos e limite de login.
- Testes de serviço cobrem permissões dos técnicos, limites, validação de arquivos e CORS. O frontend passou em lint, testes e build.
- Conexão real com Neon, entrega externa de e-mail e Web Push e inferência via túnel precisam ser verificadas no ambiente de implantação.

Nenhum segredo real foi usado nesta validação. A rotação e a aplicação da migração no ambiente real ficam para a janela de implantação.
