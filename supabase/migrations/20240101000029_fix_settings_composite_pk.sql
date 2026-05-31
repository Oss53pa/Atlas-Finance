-- ============================================================================
-- Fix settings table: composite PK (key, tenant_id) pour multi-tenancy
--
-- Problème : key TEXT PRIMARY KEY permettait une seule ligne par clé toutes
-- sociétés confondues. L'upsert ON CONFLICT (key) échouait silencieusement
-- (RLS bloquait l'UPDATE sans retourner d'erreur) pour les sociétés n'ayant
-- pas créé la ligne en premier.
-- ============================================================================

BEGIN;

-- 1. Supprimer les lignes orphelines (tenant_id invalide, ex: UUID impossible)
DELETE FROM settings
WHERE tenant_id NOT IN (SELECT id FROM societes);

-- 2. Parmi les doublons sur key, conserver uniquement la ligne la plus récente
DELETE FROM settings s1
WHERE EXISTS (
  SELECT 1 FROM settings s2
  WHERE s2.key = s1.key
    AND s2.tenant_id = s1.tenant_id
    AND s2.updated_at > s1.updated_at
);

-- 3. Remplacer la PRIMARY KEY
ALTER TABLE settings DROP CONSTRAINT settings_pkey;
ALTER TABLE settings ADD PRIMARY KEY (key, tenant_id);

COMMIT;
