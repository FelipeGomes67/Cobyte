BEGIN;

ALTER TABLE chamado ADD COLUMN IF NOT EXISTS id_publico uuid;
ALTER TABLE chamado ALTER COLUMN id_publico SET DEFAULT gen_random_uuid();
UPDATE chamado SET id_publico = gen_random_uuid() WHERE id_publico IS NULL;
ALTER TABLE chamado ALTER COLUMN id_publico SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_chamado_id_publico ON chamado (id_publico);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS versao_sessao uuid;

COMMIT;
