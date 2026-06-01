-- ============================================================================
-- Extension des types de tiers SYSCOHADA
-- Nouveaux types : customer, supplier, both, personnel, other
-- Remplace l'ancienne migration 000032_extend_third_party_types.sql
-- IDEMPOTENT : rejouable sans erreur
-- ============================================================================

-- 1. Supprimer l'ancienne CHECK constraint et en créer une nouvelle étendue
--    (idempotent via DO $$ BEGIN ... END $$)

ALTER TABLE third_parties DROP CONSTRAINT IF EXISTS third_parties_type_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'third_parties_type_check'
      AND conrelid = 'third_parties'::regclass
  ) THEN
    ALTER TABLE third_parties ADD CONSTRAINT third_parties_type_check
      CHECK (type IN ('customer', 'supplier', 'both', 'personnel', 'other'));
  END IF;
END
$$;

-- 2. Ajouter la colonne collectif_account si elle n'existe pas déjà

ALTER TABLE third_parties ADD COLUMN IF NOT EXISTS collectif_account TEXT;

-- 3. Reclassification non-destructive et rejouable (une seule fois par type)

-- Migrer les anciens types legacy AVANT la reclassification par code
-- (sinon la contrainte CHECK les bloque)
UPDATE third_parties SET type = 'personnel' WHERE type IN ('employee');
UPDATE third_parties SET type = 'other'     WHERE type IN ('social_org', 'state');
UPDATE third_parties SET type = 'other'     WHERE type = 'both';

-- Reclasser vers 'personnel' : tiers avec code commençant par 42
UPDATE third_parties
SET type               = 'personnel',
    collectif_account  = COALESCE(collectif_account, '422')
WHERE (code ~ '^42' OR collectif_account ~ '^42')
  AND type NOT IN ('personnel')
  AND tenant_id IS NOT NULL;

-- Reclasser vers 'other' : codes 43x/44x/46x/47x
UPDATE third_parties
SET type               = 'other',
    collectif_account  = COALESCE(collectif_account, '471')
WHERE (code ~ '^4[34567]' OR collectif_account ~ '^4[34567]')
  AND type NOT IN ('other', 'personnel')
  AND tenant_id IS NOT NULL;

-- 4. Préremplir collectif_account selon type si null

UPDATE third_parties SET collectif_account = '411' WHERE type = 'customer'  AND collectif_account IS NULL;
UPDATE third_parties SET collectif_account = '401' WHERE type = 'supplier'  AND collectif_account IS NULL;
UPDATE third_parties SET collectif_account = '422' WHERE type = 'personnel' AND collectif_account IS NULL;
UPDATE third_parties SET collectif_account = '471' WHERE type = 'other'     AND collectif_account IS NULL;

-- 5. RPC upsert_third_party(p_data JSONB) SECURITY DEFINER

CREATE OR REPLACE FUNCTION upsert_third_party(p_data JSONB)
RETURNS third_parties
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tid    UUID := get_user_company_id();
  v_result third_parties;
BEGIN
  IF v_tid IS NULL THEN
    RAISE EXCEPTION 'No company for user';
  END IF;

  INSERT INTO third_parties (
    id, tenant_id, code, name, type,
    email, phone, address, tax_id,
    balance, is_active, collectif_account
  )
  VALUES (
    COALESCE((p_data->>'id')::UUID, gen_random_uuid()),
    v_tid,
    p_data->>'code',
    p_data->>'name',
    p_data->>'type',
    p_data->>'email',
    p_data->>'phone',
    p_data->>'address',
    p_data->>'tax_id',
    COALESCE((p_data->>'balance')::NUMERIC, 0),
    COALESCE((p_data->>'is_active')::BOOLEAN, true),
    p_data->>'collectif_account'
  )
  ON CONFLICT (id) DO UPDATE SET
    name              = EXCLUDED.name,
    type              = EXCLUDED.type,
    email             = EXCLUDED.email,
    phone             = EXCLUDED.phone,
    address           = EXCLUDED.address,
    tax_id            = EXCLUDED.tax_id,
    is_active         = EXCLUDED.is_active,
    collectif_account = EXCLUDED.collectif_account
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;
