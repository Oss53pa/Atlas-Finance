-- ============================================================================
-- Fix settings table: composite PK (key, tenant_id) pour multi-tenancy
--
-- Problème : key TEXT PRIMARY KEY = une seule ligne par clé toutes sociétés
-- confondues. L'upsert ON CONFLICT (key) échouait silencieusement via RLS
-- pour toute société qui n'avait pas créé la ligne en premier.
-- ============================================================================

BEGIN;

-- Verrou exclusif pour éviter les insertions concurrentes pendant la migration
LOCK TABLE settings IN SHARE ROW EXCLUSIVE MODE;

-- 1. Supprimer les lignes orphelines (tenant_id absent de societes)
DELETE FROM settings
WHERE tenant_id NOT IN (SELECT id FROM societes);

-- 2. Déduplication robuste sur (key, tenant_id) :
--    - NULLS LAST : les updated_at NULL sont considérés comme les plus anciens
--    - tiebreak sur ctid pour les updated_at identiques ou tous NULL
DELETE FROM settings
WHERE ctid NOT IN (
  SELECT DISTINCT ON (key, tenant_id) ctid
  FROM settings
  ORDER BY key, tenant_id, updated_at DESC NULLS LAST, ctid DESC
);

-- 3. Remplacer la PRIMARY KEY (nom résolu dynamiquement pour éviter le hardcode)
DO $$
DECLARE
  v_pkey_name text;
BEGIN
  SELECT conname INTO v_pkey_name
  FROM pg_constraint
  WHERE conrelid = 'settings'::regclass AND contype = 'p';

  IF v_pkey_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE settings DROP CONSTRAINT %I', v_pkey_name);
  END IF;
END $$;

ALTER TABLE settings ADD PRIMARY KEY (key, tenant_id);

COMMIT;
