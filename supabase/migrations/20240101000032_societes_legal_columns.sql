-- Migration 32: Add legal columns to societes table
-- Adds: raison_sociale, nif, rccm, capital_social, forme_juridique, regime_fiscal, ville, pays, site_web

ALTER TABLE societes ADD COLUMN IF NOT EXISTS raison_sociale TEXT;
ALTER TABLE societes ADD COLUMN IF NOT EXISTS nif TEXT;
ALTER TABLE societes ADD COLUMN IF NOT EXISTS rccm TEXT;
ALTER TABLE societes ADD COLUMN IF NOT EXISTS capital_social NUMERIC DEFAULT 0;
ALTER TABLE societes ADD COLUMN IF NOT EXISTS forme_juridique TEXT DEFAULT 'SARL';
ALTER TABLE societes ADD COLUMN IF NOT EXISTS regime_fiscal TEXT DEFAULT 'Reel normal';
ALTER TABLE societes ADD COLUMN IF NOT EXISTS ville TEXT;
ALTER TABLE societes ADD COLUMN IF NOT EXISTS pays TEXT DEFAULT 'Cote d''Ivoire';
ALTER TABLE societes ADD COLUMN IF NOT EXISTS site_web TEXT;

-- Backfill raison_sociale from nom for existing rows
UPDATE societes SET raison_sociale = nom WHERE raison_sociale IS NULL;

-- RPC: update_societe_legal(p_data JSONB)
-- Allows authenticated users to update their own company's legal info securely.
-- Uses SECURITY DEFINER so RLS is bypassed at the function level,
-- but access is still scoped to the calling user's company via get_user_company_id().
CREATE OR REPLACE FUNCTION update_societe_legal(p_data JSONB)
RETURNS societes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tid UUID := get_user_company_id();
  v_result societes;
BEGIN
  IF v_tid IS NULL THEN RAISE EXCEPTION 'No company for user'; END IF;
  UPDATE societes SET
    raison_sociale  = COALESCE(p_data->>'raisonSociale', raison_sociale),
    nom             = COALESCE(p_data->>'raisonSociale', nom),
    nif             = COALESCE(p_data->>'nif', nif),
    rccm            = COALESCE(p_data->>'rccm', rccm),
    capital_social  = COALESCE((p_data->>'capitalSocial')::NUMERIC, capital_social),
    forme_juridique = COALESCE(p_data->>'formeJuridique', forme_juridique),
    regime_fiscal   = COALESCE(p_data->>'regimeFiscal', regime_fiscal),
    email           = COALESCE(p_data->>'email', email),
    telephone       = COALESCE(p_data->>'telephone', telephone),
    address         = COALESCE(p_data->>'adresse', address),
    ville           = COALESCE(p_data->>'ville', ville),
    pays            = COALESCE(p_data->>'pays', pays),
    site_web        = COALESCE(p_data->>'siteWeb', site_web),
    updated_at      = NOW()
  WHERE id = v_tid
  RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Company not found: %', v_tid; END IF;
  RETURN v_result;
END;
$$;
