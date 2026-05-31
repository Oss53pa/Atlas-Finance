-- Contrainte UNIQUE (tenant_id, code) sur assets pour permettre l'upsert idempotent
-- lors des re-imports de migration sans créer de doublons.
CREATE UNIQUE INDEX IF NOT EXISTS assets_tenant_id_code_key
  ON assets (tenant_id, code);
