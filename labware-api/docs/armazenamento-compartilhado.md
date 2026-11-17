# Armazenamento compartilhado de evidências e fotos

O modo padrão é banco (UPLOADS_ARMAZENAMENTO=banco). A tabela arquivo_compartilhado armazena o conteúdo binário como bytea, com chave separada dos metadados de anexos e usuários. Não se usa Large Object/OID. As listagens não carregam o conteúdo; os downloads continuam passando pela autorização do chamado. As fotos mantêm o endpoint e a URL versionada existentes.

Novos uploads funcionam em qualquer instância da API que use o mesmo banco. O limite é de 10 MB, conforme configuração atual. Fotos são validadas e convertidas para PNG, com limite também após conversão. O conteúdo ocupa o espaço do banco Neon e entra no backup dele.

## Ativação
Reinicie a API atualizada em todas as máquinas. O ddl-auto:update atualmente configurado cria a tabela. Não é necessário configurar um provedor externo ou enviar arquivos ao Git. Não use versões antigas da API depois de migrar, pois não reconhecem os caminhos db:.

Se o ambiente usa ddl-auto:validate, crie previamente a tabela:

    CREATE TABLE arquivo_compartilhado (
      chave varchar(180) PRIMARY KEY,
      conteudo bytea NOT NULL,
      criado_em timestamp NOT NULL
    );

## Arquivos antigos
Entre como ADMIN na máquina com os uploads originais e abra Configurações > Arquivos > Copiar arquivos locais para o banco.
A execução processa lotes de 20 anexos e 20 fotos, com transação individual. Ela pode ser repetida e não apaga os originais. Cópias já concluídas são ignoradas. Arquivos ausentes são relatados e permanecem com os metadados originais.
A migração usa UPLOADS_DIRETORIO (uploads/chamados por padrão) e labware.uploads.diretorio-fotos (uploads/fotos por padrão). Para fotos, também é possível configurar UPLOADS_DIRETORIO_FOTOS.
Copie uma foto/anexo e confirme o download a partir da segunda máquina antes de remover backups locais. Não é possível reconstruir um binário apenas com o registro do anexo no banco.

Endpoint administrativo: POST /api/armazenamento/migrar-local?aposAnexo=0&aposUsuario=0.
Use proximoAnexo/proximoUsuario na próxima chamada enquanto temMais=true. Resultados não expõem os caminhos físicos.

UPLOADS_ARMAZENAMENTO=local mantém o modo anterior para desenvolvimento isolado. Arquivos já migrados continuam sendo lidos do banco mesmo nesse modo. Migração exige modo banco.
