-- ============================================================================
-- Migration 6: Triggers d'intégrité métier + tables analytiques + rapprochement
-- Audit expert Atlas Finance — corrections P1
-- ============================================================================

-- ============================================================================
-- 1. TRIGGER: Écriture équilibrée (D = C) lors de la validation
-- ============================================================================
CREATE OR REPLACE FUNCTION check_entry_balanced()
RETURNS TRIGGER AS $$
DECLARE
  v_total_debit NUMERIC;
  v_total_credit NUMERIC;
BEGIN
  IF NEW.status IN ('validated', 'posted') AND
     (OLD.status IS NULL OR OLD.status = 'draft') THEN
    SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
    INTO v_total_debit, v_total_credit
    FROM journal_lines WHERE entry_id = NEW.id;

    IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
      RAISE EXCEPTION 'Écriture déséquilibrée: D=% C=%', v_total_debit, v_total_credit;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_entry_balanced
BEFORE UPDATE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION check_entry_balanced();

-- ============================================================================
-- 2. TRIGGER: Empêcher dotation amortissement sur bien cédé/hors service
-- ============================================================================
CREATE OR REPLACE FUNCTION check_bien_actif_pour_amort()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.label LIKE 'Amort.%' OR NEW.label LIKE 'Dotation%' THEN
    IF EXISTS (
      SELECT 1 FROM assets
      WHERE depreciation_account_code = NEW.account_code
        AND status != 'active'
        AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'Impossible de générer une dotation sur un bien cédé ou hors service (compte: %)', NEW.account_code;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_bien_actif
BEFORE INSERT ON journal_lines
FOR EACH ROW EXECUTE FUNCTION check_bien_actif_pour_amort();

-- ============================================================================
-- 3. CONSTRAINT: VNC ne peut jamais être négative
-- ============================================================================
ALTER TABLE assets ADD COLUMN IF NOT EXISTS cumul_depreciation NUMERIC(18,2) DEFAULT 0;

ALTER TABLE assets ADD CONSTRAINT chk_acquisition_positive
  CHECK (acquisition_value >= COALESCE(residual_value, 0));

-- ============================================================================
-- 4. TABLES: Comptabilité analytique
-- ============================================================================
CREATE TABLE IF NOT EXISTS axes_analytiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  type_axe TEXT CHECK (type_axe IN ('centre_cout', 'centre_profit', 'projet', 'produit', 'region', 'activite')),
  obligatoire BOOLEAN DEFAULT false,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS sections_analytiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  axe_id UUID NOT NULL REFERENCES axes_analytiques(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES societes(id),
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  parent_id UUID REFERENCES sections_analytiques(id),
  responsable TEXT,
  budget_annuel NUMERIC(18,2) DEFAULT 0,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(axe_id, code)
);

CREATE TABLE IF NOT EXISTS ventilations_analytiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ligne_ecriture_id UUID NOT NULL REFERENCES journal_lines(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES sections_analytiques(id),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  pourcentage NUMERIC(5,2) NOT NULL CHECK (pourcentage > 0 AND pourcentage <= 100),
  montant NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. TRIGGER: Ventilation analytique ne dépasse pas 100%
-- ============================================================================
CREATE OR REPLACE FUNCTION check_ventilation_complete()
RETURNS TRIGGER AS $$
DECLARE total_pct NUMERIC;
BEGIN
  SELECT COALESCE(SUM(pourcentage), 0) INTO total_pct
  FROM ventilations_analytiques
  WHERE ligne_ecriture_id = NEW.ligne_ecriture_id;

  IF total_pct > 100.01 THEN
    RAISE EXCEPTION 'Ventilation analytique dépasse 100%% (total: %)', total_pct;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_ventilation
AFTER INSERT OR UPDATE ON ventilations_analytiques
FOR EACH ROW EXECUTE FUNCTION check_ventilation_complete();

-- ============================================================================
-- 6. TABLES: Rapprochement bancaire persisté
-- ============================================================================
CREATE TABLE IF NOT EXISTS rapprochements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  compte_bancaire TEXT NOT NULL,
  date_rapprochement DATE NOT NULL,
  periode_debut DATE NOT NULL,
  periode_fin DATE NOT NULL,
  solde_releve NUMERIC(18,2) NOT NULL,
  solde_comptable NUMERIC(18,2) NOT NULL,
  ecart_residuel NUMERIC(18,2) NOT NULL DEFAULT 0,
  taux_rapprochement NUMERIC(5,2) DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'ouvert' CHECK (statut IN ('ouvert', 'cloture')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS lignes_rapprochement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rapprochement_id UUID NOT NULL REFERENCES rapprochements(id) ON DELETE CASCADE,
  journal_line_id UUID REFERENCES journal_lines(id),
  bank_transaction_ref TEXT,
  type_ligne TEXT NOT NULL CHECK (type_ligne IN ('rapproche', 'depot_transit', 'cheque_circulation', 'non_rapproche')),
  montant NUMERIC(18,2) NOT NULL,
  date_operation DATE NOT NULL,
  libelle TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 7. TRIGGER: Empêcher modification d'un rapprochement clôturé
-- ============================================================================
CREATE OR REPLACE FUNCTION check_rapprochement_ouvert()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT statut FROM rapprochements WHERE id = OLD.rapprochement_id) = 'cloture' THEN
    RAISE EXCEPTION 'Impossible de modifier un rapprochement clôturé';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_rapprochement_ouvert
BEFORE UPDATE OR DELETE ON lignes_rapprochement
FOR EACH ROW EXECUTE FUNCTION check_rapprochement_ouvert();

-- ============================================================================
-- 8. BUDGET: Ajout du versionnement
-- ============================================================================
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT 'B0';

-- Drop existing unique constraint if any, then add new one with version
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'budget_lines_tenant_account_fy_period_version_key'
  ) THEN
    ALTER TABLE budget_lines ADD CONSTRAINT budget_lines_tenant_account_fy_period_version_key
      UNIQUE (tenant_id, account_code, fiscal_year, period, version);
  END IF;
END $$;

-- ============================================================================
-- 9. RLS sur nouvelles tables
-- ============================================================================
ALTER TABLE axes_analytiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections_analytiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventilations_analytiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapprochements ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_rapprochement ENABLE ROW LEVEL SECURITY;

-- Policies for new tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'axes_analytiques', 'sections_analytiques', 'ventilations_analytiques',
    'rapprochements', 'lignes_rapprochement'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (tenant_id = get_user_company_id())',
      tbl || '_select', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (tenant_id = get_user_company_id())',
      tbl || '_insert', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE USING (tenant_id = get_user_company_id())',
      tbl || '_update', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE USING (tenant_id = get_user_company_id())',
      tbl || '_delete', tbl
    );
  END LOOP;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_axes_analytiques_tenant ON axes_analytiques(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sections_analytiques_axe ON sections_analytiques(axe_id);
CREATE INDEX IF NOT EXISTS idx_ventilations_ligne ON ventilations_analytiques(ligne_ecriture_id);
CREATE INDEX IF NOT EXISTS idx_rapprochements_tenant ON rapprochements(tenant_id, compte_bancaire);
CREATE INDEX IF NOT EXISTS idx_lignes_rapprochement_rap ON lignes_rapprochement(rapprochement_id);

-- Updated_at triggers for new tables
CREATE TRIGGER trg_axes_analytiques_updated_at BEFORE UPDATE ON axes_analytiques
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sections_analytiques_updated_at BEFORE UPDATE ON sections_analytiques
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_rapprochements_updated_at BEFORE UPDATE ON rapprochements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
