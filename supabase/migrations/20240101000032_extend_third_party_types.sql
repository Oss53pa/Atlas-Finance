-- ============================================================================
-- Étendre third_parties.type pour supporter Personnel, État, Organismes sociaux
-- SYSCOHADA : 401=fournisseur, 411=client, 42x=personnel, 43x=org.social,
--             44x=état, 46x-47x=autres débiteurs/créditeurs
-- ============================================================================

-- 1. Supprimer l'ancienne contrainte restrictive
ALTER TABLE third_parties DROP CONSTRAINT IF EXISTS third_parties_type_check;

-- 2. Ajouter la nouvelle contrainte étendue
ALTER TABLE third_parties ADD CONSTRAINT third_parties_type_check
  CHECK (type IN ('customer','supplier','both','employee','state','social_org','other'));

-- 3. Reclasser les tiers existants selon le préfixe de leur code
UPDATE third_parties SET type =
  CASE
    WHEN code ~ '^40[0-9]' THEN 'supplier'    -- 401xxx : fournisseurs
    WHEN code ~ '^41[0-9]' THEN 'customer'    -- 411xxx : clients
    WHEN code ~ '^4[2][0-9]' THEN 'employee'  -- 42xxxx : personnel
    WHEN code ~ '^43[0-9]' THEN 'social_org'  -- 431xxx : organismes sociaux
    WHEN code ~ '^44[0-9]' THEN 'state'       -- 441xxx : état/impôts
    WHEN code ~ '^4[6-7][0-9]' THEN 'other'  -- 46x-47x : autres tiers
    ELSE type  -- garder la valeur actuelle si pas de correspondance
  END
WHERE type IS NOT NULL;

-- 4. Ajouter colonne account_class pour faciliter le filtrage
ALTER TABLE third_parties ADD COLUMN IF NOT EXISTS account_class TEXT;

UPDATE third_parties SET account_class = SUBSTRING(code, 1, 3)
WHERE account_class IS NULL AND code ~ '^[0-9]';
