# Entrega de email

Os filtros de mensagens, status e atribuições continuam valendo para os avisos internos e os emails. Não há opção separada de permissão de email.

O evento `EmailNotificacao` deve ser publicado dentro de uma transação. O listener salva um registro em `email_pendente` na mesma transação da notificação. Se houver rollback, nenhum email é enfileirado. O agendador só encontra registros confirmados, inclusive após reiniciar a aplicação.

O processamento verifica até 20 registros por execução e usa `FOR UPDATE SKIP LOCKED` no PostgreSQL. Cada envio tem sua própria transação; instâncias concorrentes ignoram registros que já estão sendo enviados. Os timeouts SMTP continuam definidos no `application.yml`.

## Configuração

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `MAIL_QUEUE_ENABLED` | `true` | Habilita o processamento; desabilitar preserva os registros na fila. |
| `MAIL_QUEUE_INTERVAL_MS` | `10000` | Intervalo entre o fim de um lote e o início do próximo. |
| `MAIL_MAX_ATTEMPTS` | `8` | Total máximo de tentativas por email. |

Falhas de SMTP são reagendadas em 30, 60, 120 segundos e assim por diante, até o teto de uma hora entre tentativas. Após esgotar o limite, o registro fica em `FALHOU`. Emails enviados ficam em `ENVIADO`, com horário e quantidade de tentativas. `ultimo_erro` armazena somente o tipo da exceção, sem detalhes privados do SMTP.

A entrega pode ser duplicada se o servidor SMTP aceitar o email e o processo cair antes de confirmar `ENVIADO` no banco. SMTP e PostgreSQL não compartilham uma transação; a fila oferece retentativa persistente, sem garantia de entrega única.

Para recuperar registros em `FALHOU`, corrija o problema no SMTP e, com acesso administrativo ao banco, altere o estado para `PENDENTE`, zere `tentativas` e defina `proxima_tentativa` para o horário atual. Não há endpoint público para essa operação. Não há remoção automática do histórico; a retenção deverá ser definida conforme a operação.

Com o `ddl-auto: update` atual, o Hibernate cria a tabela ao iniciar. A definição SQL também está em `schema_labware_completo.sql`; não execute o schema completo sobre uma base existente.

Os testes de integração usam H2 em memória, sem SMTP real. Eles verificam commit/rollback, seleção dos pendentes e carregamento de empresas. O comportamento de concorrência de `SKIP LOCKED` entre instâncias PostgreSQL exige validação nesse banco.
