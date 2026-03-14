-- ============================================================================
-- Migration 7: Triggers sécurité clôtures + piste d'audit + tables fiscales
-- Audit expert Atlas Finance — corrections P0 + P1 + P2
-- ============================================================================

-- ============================================================================
-- P0.1 — AF-CL01: Empêcher écriture sur période/exercice clôturé
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_write_on_closed_period()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérification exercice clôturé
  IF EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE tenant_id = NEW.tenant_id
      AND NEW.date BETWEEN start_date AND end_date
      AND is_closed = true
  ) THEN
    RAISE EXCEPTION 'Écriture impossible : exercice clôturé (SYSCOHADA Art. 19)';
  END IF;

  -- Vérification période mensuelle clôturée (si table fiscal_periods existe)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'fiscal_periods' AND table_schema = 'public'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM fiscal_periods
      WHERE tenant_id = NEW.tenant_id
        AND NEW.date BETWEEN start_date AND end_date
        AND status IN ('cloturee', 'locked')
    ) THEN
      RAISE EXCEPTION 'Écriture impossible : période comptable clôturée';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_write_on_closed_period
BEFORE INSERT OR UPDATE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION prevent_write_on_closed_period();

-- ============================================================================
-- P0.2 — AF-CL03: Empêcher réouverture d'un exercice clôturé
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_exercice_reopen()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_closed = true AND NEW.is_closed = false THEN
    RAISE EXCEPTION 'Un exercice clôturé ne peut pas être réouvert (SYSCOHADA Art. 19 — irréversibilité)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_exercice_reopen
BEFORE UPDATE ON fiscal_years
FOR EACH ROW EXECUTE FUNCTION prevent_exercice_reopen();

-- ============================================================================
-- P0.3 — AF-CL04: Piste d'audit append-only (bloquer UPDATE/DELETE)
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'La piste d''audit est immuable — % interdit (SYSCOHADA Art. 20)', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Appliquer sur audit_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_audit_modification'
  ) THEN
    CREATE TRIGGER trg_prevent_audit_modification
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
  END IF;
END $$;

-- Supprimer toute policy DELETE sur audit_logs
DROP POLICY IF EXISTS audit_logs_delete ON audit_logs;

-- ============================================================================
-- P1.5 — AF-CL02: RPC clôture annuelle atomique
-- ============================================================================
CREATE OR REPLACE FUNCTION execute_annual_closure(
  p_fiscal_year_id UUID,
  p_tenant_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_fy RECORD;
  v_resultat NUMERIC(18,2);
  v_entry_id UUID;
  v_entry_number TEXT;
  v_total_debit NUMERIC(18,2);
  v_total_credit NUMERIC(18,2);
BEGIN
  -- 1. Récupérer et vérifier l'exercice
  SELECT * INTO v_fy FROM fiscal_years
  WHERE id = p_fiscal_year_id AND tenant_id = p_tenant_id;

  IF v_fy IS NULL THEN
    RAISE EXCEPTION 'Exercice non trouvé (id=%)', p_fiscal_year_id;
  END IF;
  IF v_fy.is_closed THEN
    RAISE EXCEPTION 'Exercice déjà clôturé';
  END IF;

  -- 2. Vérifier absence de brouillons
  IF EXISTS (
    SELECT 1 FROM journal_entries
    WHERE tenant_id = p_tenant_id
      AND date BETWEEN v_fy.start_date AND v_fy.end_date
      AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'Des écritures brouillon existent — validez-les avant la clôture';
  END IF;

  -- 3. Vérifier équilibre balance
  SELECT COALESCE(SUM(jl.debit), 0), COALESCE(SUM(jl.credit), 0)
  INTO v_total_debit, v_total_credit
  FROM journal_lines jl
  JOIN journal_entries je ON je.id = jl.entry_id
  WHERE je.tenant_id = p_tenant_id
    AND je.date BETWEEN v_fy.start_date AND v_fy.end_date
    AND je.status IN ('validated', 'posted');

  IF ABS(v_total_debit - v_total_credit) > 1 THEN
    RAISE EXCEPTION 'Balance déséquilibrée : D=% C=% écart=%',
      v_total_debit, v_total_credit, ABS(v_total_debit - v_total_credit);
  END IF;

  -- 4. Calcul résultat net (Produits classe 7 - Charges classe 6 + HAO classe 8)
  SELECT
    COALESCE(SUM(CASE WHEN jl.account_code ~ '^7' THEN jl.credit - jl.debit ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN jl.account_code ~ '^6' THEN jl.debit - jl.credit ELSE 0 END), 0)
    + COALESCE(SUM(CASE WHEN jl.account_code ~ '^8[2468]' THEN jl.credit - jl.debit ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN jl.account_code ~ '^8[1357]' THEN jl.debit - jl.credit ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN jl.account_code ~ '^89' THEN jl.debit - jl.credit ELSE 0 END), 0)
  INTO v_resultat
  FROM journal_lines jl
  JOIN journal_entries je ON je.id = jl.entry_id
  WHERE je.tenant_id = p_tenant_id
    AND je.date BETWEEN v_fy.start_date AND v_fy.end_date
    AND je.status IN ('validated', 'posted');

  -- 5. Générer l'écriture de détermination du résultat (journal CL)
  v_entry_number := 'CL-' || to_char(v_fy.end_date, 'YYYYMMDD') || '-001';

  INSERT INTO journal_entries (id, tenant_id, entry_number, journal, date, label, status, total_debit, total_credit, created_at, updated_at)
  VALUES (gen_random_uuid(), p_tenant_id, v_entry_number, 'CL', v_fy.end_date,
    'Détermination du résultat — Clôture ' || v_fy.code, 'posted',
    CASE WHEN v_resultat >= 0 THEN 0 ELSE ABS(v_resultat) END,
    CASE WHEN v_resultat >= 0 THEN v_resultat ELSE 0 END,
    now(), now())
  RETURNING id INTO v_entry_id;

  -- Écriture résultat : D/C sur compte 120 (bénéfice) ou 129 (perte)
  IF v_resultat >= 0 THEN
    INSERT INTO journal_lines (id, entry_id, tenant_id, account_code, account_name, label, debit, credit, created_at)
    VALUES (gen_random_uuid(), v_entry_id, p_tenant_id, '120', 'Résultat de l''exercice (bénéfice)',
      'Résultat net exercice ' || v_fy.code, 0, v_resultat, now());
  ELSE
    INSERT INTO journal_lines (id, entry_id, tenant_id, account_code, account_name, label, debit, credit, created_at)
    VALUES (gen_random_uuid(), v_entry_id, p_tenant_id, '129', 'Résultat de l''exercice (perte)',
      'Résultat net exercice ' || v_fy.code, ABS(v_resultat), 0, now());
  END IF;

  -- 6. Verrouiller toutes les écritures de l'exercice
  UPDATE journal_entries
  SET status = 'posted', updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND date BETWEEN v_fy.start_date AND v_fy.end_date
    AND status = 'validated';

  -- 7. Clôturer l'exercice (le trigger trg_prevent_exercice_reopen empêchera la réouverture)
  UPDATE fiscal_years
  SET is_closed = true, updated_at = now()
  WHERE id = p_fiscal_year_id;

  -- 8. Piste d'audit
  INSERT INTO audit_logs (id, tenant_id, action, entity_type, entity_id, details, timestamp)
  VALUES (gen_random_uuid(), p_tenant_id, 'CLOTURE_ANNUELLE', 'fiscal_year',
    p_fiscal_year_id::TEXT,
    jsonb_build_object(
      'resultat_net', v_resultat,
      'fiscal_year_code', v_fy.code,
      'entry_id', v_entry_id,
      'total_debit', v_total_debit,
      'total_credit', v_total_credit
    )::TEXT,
    now());

  RETURN jsonb_build_object(
    'success', true,
    'resultat_net', v_resultat,
    'entry_id', v_entry_id,
    'fiscal_year_code', v_fy.code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- P1.7 — AF-ER01: RPC Bilan SYSCOHADA
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_bilan(p_tenant_id UUID, p_fiscal_year_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_fy RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_fy FROM fiscal_years WHERE id = p_fiscal_year_id AND tenant_id = p_tenant_id;
  IF v_fy IS NULL THEN RAISE EXCEPTION 'Exercice non trouvé'; END IF;

  WITH soldes AS (
    SELECT
      jl.account_code,
      COALESCE(SUM(jl.debit), 0) AS total_debit,
      COALESCE(SUM(jl.credit), 0) AS total_credit,
      COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) AS solde_net
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.entry_id
    WHERE je.tenant_id = p_tenant_id
      AND je.date <= v_fy.end_date
      AND je.status IN ('validated', 'posted')
    GROUP BY jl.account_code
  ),
  actif AS (
    SELECT
      COALESCE(SUM(CASE WHEN account_code ~ '^2[0-7]' THEN solde_net ELSE 0 END), 0) AS immo_brut,
      COALESCE(SUM(CASE WHEN account_code ~ '^28' THEN -solde_net ELSE 0 END), 0) AS immo_amort,
      COALESCE(SUM(CASE WHEN account_code ~ '^29' THEN -solde_net ELSE 0 END), 0) AS immo_deprec,
      COALESCE(SUM(CASE WHEN account_code ~ '^3' THEN solde_net ELSE 0 END), 0) AS stocks,
      COALESCE(SUM(CASE WHEN account_code ~ '^39' THEN -solde_net ELSE 0 END), 0) AS stocks_deprec,
      COALESCE(SUM(CASE WHEN account_code ~ '^4' AND solde_net > 0 THEN solde_net ELSE 0 END), 0) AS creances,
      COALESCE(SUM(CASE WHEN account_code ~ '^5' AND solde_net > 0 THEN solde_net ELSE 0 END), 0) AS treso_actif,
      COALESCE(SUM(CASE WHEN account_code = '476' THEN solde_net ELSE 0 END), 0) AS ecart_conv_actif
    FROM soldes
  ),
  passif AS (
    SELECT
      COALESCE(SUM(CASE WHEN account_code ~ '^1[0-5]' THEN -solde_net ELSE 0 END), 0) AS capitaux_propres,
      COALESCE(SUM(CASE WHEN account_code ~ '^1[6-9]' THEN -solde_net ELSE 0 END), 0) AS dettes_fin,
      COALESCE(SUM(CASE WHEN account_code ~ '^4' AND solde_net < 0 THEN -solde_net ELSE 0 END), 0) AS dettes_circ,
      COALESCE(SUM(CASE WHEN account_code ~ '^5' AND solde_net < 0 THEN -solde_net ELSE 0 END), 0) AS treso_passif,
      COALESCE(SUM(CASE WHEN account_code = '477' THEN -solde_net ELSE 0 END), 0) AS ecart_conv_passif
    FROM soldes
  )
  SELECT jsonb_build_object(
    'actif', jsonb_build_object(
      'immobilisations_brut', a.immo_brut,
      'amortissements', a.immo_amort,
      'depreciations_immo', a.immo_deprec,
      'immobilisations_net', a.immo_brut - a.immo_amort - a.immo_deprec,
      'stocks_brut', a.stocks,
      'stocks_deprec', a.stocks_deprec,
      'stocks_net', a.stocks - a.stocks_deprec,
      'creances', a.creances,
      'tresorerie_actif', a.treso_actif,
      'ecart_conversion_actif', a.ecart_conv_actif,
      'total_actif', (a.immo_brut - a.immo_amort - a.immo_deprec) + (a.stocks - a.stocks_deprec) + a.creances + a.treso_actif + a.ecart_conv_actif
    ),
    'passif', jsonb_build_object(
      'capitaux_propres', p.capitaux_propres,
      'dettes_financieres', p.dettes_fin,
      'dettes_circulantes', p.dettes_circ,
      'tresorerie_passif', p.treso_passif,
      'ecart_conversion_passif', p.ecart_conv_passif,
      'total_passif', p.capitaux_propres + p.dettes_fin + p.dettes_circ + p.treso_passif + p.ecart_conv_passif
    ),
    'exercice', v_fy.code,
    'date_generation', now()
  ) INTO v_result
  FROM actif a, passif p;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- P1.7 — AF-ER01: RPC Compte de Résultat SYSCOHADA
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_cdr(p_tenant_id UUID, p_fiscal_year_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_fy RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_fy FROM fiscal_years WHERE id = p_fiscal_year_id AND tenant_id = p_tenant_id;
  IF v_fy IS NULL THEN RAISE EXCEPTION 'Exercice non trouvé'; END IF;

  WITH mouvements AS (
    SELECT
      jl.account_code,
      COALESCE(SUM(jl.debit), 0) AS total_debit,
      COALESCE(SUM(jl.credit), 0) AS total_credit
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.entry_id
    WHERE je.tenant_id = p_tenant_id
      AND je.date BETWEEN v_fy.start_date AND v_fy.end_date
      AND je.status IN ('validated', 'posted')
    GROUP BY jl.account_code
  )
  SELECT jsonb_build_object(
    'produits_exploitation', (SELECT COALESCE(SUM(total_credit - total_debit), 0) FROM mouvements WHERE account_code ~ '^7[0-5789]'),
    'charges_exploitation', (SELECT COALESCE(SUM(total_debit - total_credit), 0) FROM mouvements WHERE account_code ~ '^6[0-5689]'),
    'resultat_exploitation',
      (SELECT COALESCE(SUM(total_credit - total_debit), 0) FROM mouvements WHERE account_code ~ '^7[0-5789]')
      - (SELECT COALESCE(SUM(total_debit - total_credit), 0) FROM mouvements WHERE account_code ~ '^6[0-5689]'),
    'produits_financiers', (SELECT COALESCE(SUM(total_credit - total_debit), 0) FROM mouvements WHERE account_code ~ '^77'),
    'charges_financieres', (SELECT COALESCE(SUM(total_debit - total_credit), 0) FROM mouvements WHERE account_code ~ '^67'),
    'resultat_financier',
      (SELECT COALESCE(SUM(total_credit - total_debit), 0) FROM mouvements WHERE account_code ~ '^77')
      - (SELECT COALESCE(SUM(total_debit - total_credit), 0) FROM mouvements WHERE account_code ~ '^67'),
    'produits_hao', (SELECT COALESCE(SUM(total_credit - total_debit), 0) FROM mouvements WHERE account_code ~ '^8[2468]'),
    'charges_hao', (SELECT COALESCE(SUM(total_debit - total_credit), 0) FROM mouvements WHERE account_code ~ '^8[1357]'),
    'resultat_hao',
      (SELECT COALESCE(SUM(total_credit - total_debit), 0) FROM mouvements WHERE account_code ~ '^8[2468]')
      - (SELECT COALESCE(SUM(total_debit - total_credit), 0) FROM mouvements WHERE account_code ~ '^8[1357]'),
    'impot_resultat', (SELECT COALESCE(SUM(total_debit - total_credit), 0) FROM mouvements WHERE account_code ~ '^89'),
    'resultat_net',
      (SELECT COALESCE(SUM(total_credit - total_debit), 0) FROM mouvements WHERE account_code ~ '^7')
      - (SELECT COALESCE(SUM(total_debit - total_credit), 0) FROM mouvements WHERE account_code ~ '^6')
      + (SELECT COALESCE(SUM(total_credit - total_debit), 0) FROM mouvements WHERE account_code ~ '^8[2468]')
      - (SELECT COALESCE(SUM(total_debit - total_credit), 0) FROM mouvements WHERE account_code ~ '^8[13579]'),
    'exercice', v_fy.code,
    'date_generation', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- P1.8 — AF-ER04: Table archivage états financiers
-- ============================================================================
CREATE TABLE IF NOT EXISTS etats_financiers_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id),
  type TEXT NOT NULL CHECK (type IN ('bilan','cdr','tafire','sig','annexes','ratios')),
  periode TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  contenu JSONB NOT NULL,
  hash_sha256 TEXT NOT NULL,
  pdf_storage_path TEXT,
  genere_par UUID REFERENCES profiles(id),
  genere_le TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE etats_financiers_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY etats_archives_select ON etats_financiers_archives
  FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY etats_archives_insert ON etats_financiers_archives
  FOR INSERT WITH CHECK (tenant_id = get_user_company_id());

-- Append-only: pas de modification ni suppression
CREATE TRIGGER trg_protect_etats_archives
BEFORE UPDATE OR DELETE ON etats_financiers_archives
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

CREATE INDEX idx_etats_archives_tenant_fy ON etats_financiers_archives(tenant_id, fiscal_year_id);
CREATE INDEX idx_etats_archives_type ON etats_financiers_archives(tenant_id, type, periode);

-- ============================================================================
-- P2.2 — AF-ER05: Table déclarations fiscales
-- ============================================================================
CREATE TABLE IF NOT EXISTS declarations_fiscales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  type TEXT NOT NULL CHECK (type IN ('TVA','IS','IMF','patente','CNPS')),
  periode TEXT NOT NULL,
  montant_base NUMERIC(18,2) DEFAULT 0,
  montant_taxe NUMERIC(18,2) DEFAULT 0,
  montant_credit_reporte NUMERIC(18,2) DEFAULT 0,
  montant_net_a_payer NUMERIC(18,2) DEFAULT 0,
  statut TEXT DEFAULT 'brouillon' CHECK (statut IN ('brouillon','validee','deposee','payee')),
  contenu JSONB,
  hash_sha256 TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, type, periode)
);

ALTER TABLE declarations_fiscales ENABLE ROW LEVEL SECURITY;

CREATE POLICY decl_fiscales_select ON declarations_fiscales
  FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY decl_fiscales_insert ON declarations_fiscales
  FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY decl_fiscales_update ON declarations_fiscales
  FOR UPDATE USING (tenant_id = get_user_company_id());

CREATE TRIGGER trg_declarations_fiscales_updated_at
BEFORE UPDATE ON declarations_fiscales
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_declarations_tenant_type ON declarations_fiscales(tenant_id, type, periode);

-- ============================================================================
-- P3.3 — AF-I07: Table catégories d'immobilisations paramétrables
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories_immobilisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  duree_amortissement_mois INTEGER NOT NULL,
  taux_lineaire NUMERIC(8,4),
  taux_degressif NUMERIC(8,4),
  compte_bilan TEXT NOT NULL,
  compte_amortissement TEXT NOT NULL,
  compte_dotation TEXT NOT NULL,
  compte_reprise TEXT,
  methode_defaut TEXT DEFAULT 'linear' CHECK (methode_defaut IN ('linear','declining')),
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

ALTER TABLE categories_immobilisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY cat_immo_select ON categories_immobilisations
  FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY cat_immo_insert ON categories_immobilisations
  FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY cat_immo_update ON categories_immobilisations
  FOR UPDATE USING (tenant_id = get_user_company_id());

CREATE TRIGGER trg_cat_immo_updated_at
BEFORE UPDATE ON categories_immobilisations
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
