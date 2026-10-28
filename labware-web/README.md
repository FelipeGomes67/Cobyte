# LabWare · Central de Suporte

Aplicação de demonstração em React, JSX e Vite. Não há backend conectado neste repositório; autenticação, cadastros, chamados e preferências usam armazenamento local do navegador e não devem ser tratados como proteção de produção.

## Executar

```sh
npm install
npm run dev
```

Validação local:

```sh
npm run lint
npm run build
```

## Contas fictícias

- Suporte: `demo@labware.com.br` / `Labware123!`
- Cliente: `cliente@labware.com.br` / `Cliente123!`

O suporte pode consultar todos os chamados e relatórios. O perfil cliente vê apenas chamados próprios. Cadastros criam perfis cliente.

As credenciais de demonstração são verificadas com PBKDF2 no navegador; o armazenamento local contém hashes, não senhas em texto puro. Isso não é autenticação segura: o código, os usuários de demonstração e as permissões rodam no cliente e podem ser inspecionados ou alterados. Em produção, autenticação e autorização devem ser validadas pelo backend.

## Dados e limitações

- `src/data/demoTickets.js` e `src/data/demoUsers.js` contêm dados fictícios claramente identificados.
- Chamados criados são salvos em `localStorage` e não sincronizam entre navegadores ou usuários.
- Preferências de notificações persistem localmente. Permissão do navegador depende do dispositivo, navegador e origem segura.
- A troca de senha não altera credenciais: a tela informa que depende de um endpoint de autenticação que ainda não existe.
- Métricas de primeira resposta exigem `firstResponseMinutes`. SLA compara `resolvedAt` com `slaDueAt`. Registros sem esses campos não entram nesses indicadores. Resolução mensal exige `resolvedAt`.
- Os gráficos podem usar os chamados fictícios de `src/data/demoTickets.js` enquanto não existe uma API conectada; essa origem fica documentada aqui e no arquivo de dados, sem aviso sobreposto à tela.
