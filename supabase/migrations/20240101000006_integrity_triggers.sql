-- =================================================================
-- Migration 006: Integrity Triggers & Security Hardening
-- ALIGNED TO SCHEMA A (tenant_id, journal_lines, accounts, etc.)
-- =================================================================

-- ============================================================
-- 1. CHECK constraints on journal_lines
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_debit_positive' AND conrelid = 'journal_lines'::regclass) THEN
    ALTER TABLE journal_lines ADD CONSTRAINT chk_debit_positive CHECK (debit >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_credit_positive' AND conrelid = 'journal_lines'::regclass) THEN
    ALTER TABLE journal_lines ADD CONSTRAINT chk_credit_positive CHECK (credit >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_not_bilateral' AND conrelid = 'journal_lines'::regclass) THEN
    ALTER TABLE journal_lines ADD CONSTRAINT chk_not_bilateral CHECK (debit = 0 OR credit = 0);
  END IF;
END $$;

-- ============================================================
-- 2. Trigger DEFERRED: balance check (SUM debit = SUM credit)
-- ============================================================
CREATE OR REPLACE FUNCTION validate_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_diff NUMERIC(18,2);
BEGIN
  SELECT ABS(COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0))
  INTO v_diff
  FROM journal_lines
  WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id);

  IF v_diff > 0.01 THEN
    RAISE EXCEPTION 'Ecriture desequilibree (ecart: % FCFA). Total Debit doit = Total Credit.', v_diff;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_balance ON journal_lines;
CREATE CONSTRAINT TRIGGER trg_validate_balance
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_entry_balance();

-- ============================================================
-- 3. Trigger: immutability of posted entries (SYSCOHADA Art. 19)
-- ============================================================
CREATE OR REPLACE FUNCTION protect_posted_entries()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Suppression interdite - ecriture comptabilisee (SYSCOHADA Art. 19)';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'posted' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Modification du statut interdite - ecriture comptabilisee. Utilisez une contrepassation.';
    END IF;
    IF ROW(NEW.journal, NEW.date, NEW.entry_number, NEW.label)
        IS DISTINCT FROM ROW(OLD.journal, OLD.date, OLD.entry_number, OLD.label) THEN
      RAISE EXCEPTION 'Modification interdite - ecriture comptabilisee (SYSCOHADA Art. 19)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_posted ON journal_entries;
CREATE TRIGGER trg_protect_posted
BEFORE UPDATE OR DELETE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION protect_posted_entries();

-- ============================================================
-- 4. ON DELETE RESTRICT on journal_lines.entry_id
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'journal_lines_entry_id_fkey'
      AND table_name = 'journal_lines'
  ) THEN
    ALTER TABLE journal_lines DROP CONSTRAINT journal_lines_entry_id_fkey;
  END IF;
END;
$$;

ALTER TABLE journal_lines ADD CONSTRAINT journal_lines_entry_id_fkey
  FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE RESTRICT;

-- ============================================================
-- 5. Trigger: block entries on closed fiscal years
-- ============================================================
CREATE OR REPLACE FUNCTION block_closed_period()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE tenant_id = NEW.tenant_id
      AND NEW.date BETWEEN start_date AND end_date
      AND is_closed = true
  ) THEN
    RAISE EXCEPTION 'Saisie impossible : exercice comptable cloture';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_closed_period ON journal_entries;
CREATE TRIGGER trg_block_closed_period
BEFORE INSERT OR UPDATE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION block_closed_period();

-- ============================================================
-- 6. Protect audit_logs from deletion/modification
-- ============================================================
CREATE OR REPLACE FUNCTION protect_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Le journal audit est immuable - % interdit', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_audit ON audit_logs;
CREATE TRIGGER trg_protect_audit
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION protect_audit_log();

-- ============================================================
-- 7. Sequential entry numbering per journal
-- ============================================================
CREATE OR REPLACE FUNCTION generate_sequential_entry_number()
RETURNS TRIGGER AS $$
DECLARE
  v_seq INTEGER;
  v_journal_code TEXT;
BEGIN
  IF NEW.entry_number IS NULL OR NEW.entry_number = '' THEN
    v_journal_code := COALESCE(NEW.journal, 'OD');

    SELECT COALESCE(MAX(
      CAST(REGEXP_REPLACE(entry_number, '^[A-Z]+-', '') AS INTEGER)
    ), 0) + 1
    INTO v_seq
    FROM journal_entries
    WHERE tenant_id = NEW.tenant_id
      AND journal = NEW.journal
      AND entry_number ~ ('^' || v_journal_code || E'-\\d+$');

    NEW.entry_number := v_journal_code || '-' || LPAD(v_seq::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_entry_number ON journal_entries;
CREATE TRIGGER trg_entry_number
BEFORE INSERT ON journal_entries
FOR EACH ROW EXECUTE FUNCTION generate_sequential_entry_number();

-- ============================================================
-- 8. RLS on profiles
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'profiles' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END;
$$;

DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;

CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (id = auth.uid());
CREATE POLICY profiles_insert ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- 9. Add missing columns to journal_lines
-- ============================================================
ALTER TABLE journal_lines
  ADD COLUMN IF NOT EXISTS date_echeance DATE;
-- lettrage_code already exists in migration 002

-- ============================================================
-- 10. Add missing columns to accounts
-- ============================================================
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS collective_account_id UUID REFERENCES accounts(id),
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
-- normal_balance already exists in migration 002

-- ============================================================
-- 11. Add OHADA fields to third_parties
-- ============================================================
ALTER TABLE third_parties
  ADD COLUMN IF NOT EXISTS rccm TEXT,
  ADD COLUMN IF NOT EXISTS regime_fiscal TEXT,
  ADD COLUMN IF NOT EXISTS forme_juridique TEXT,
  ADD COLUMN IF NOT EXISTS account_code_tiers TEXT,
  ADD COLUMN IF NOT EXISTS collective_account TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30;

-- ============================================================
-- 12. Table: lettrages
-- ============================================================
CREATE TABLE IF NOT EXISTS lettrages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  reference TEXT NOT NULL,
  account_code TEXT NOT NULL,
  date_lettrage TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES profiles(id),
  montant NUMERIC(18,2) NOT NULL,
  type TEXT DEFAULT 'complet' CHECK (type IN ('complet', 'partiel')),
  method TEXT CHECK (method IN ('exact', 'reference', 'sum_n', 'manual')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, reference)
);

ALTER TABLE lettrages ENABLE ROW LEVEL SECURITY;

CREATE POLICY lettrages_select ON lettrages FOR SELECT
  USING (tenant_id = get_user_company_id());
CREATE POLICY lettrages_insert ON lettrages FOR INSERT
  WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY lettrages_update ON lettrages FOR UPDATE
  USING (tenant_id = get_user_company_id());
CREATE POLICY lettrages_delete ON lettrages FOR DELETE
  USING (tenant_id = get_user_company_id());

-- ============================================================
-- 13. RPC: validate_journal_entry
-- ============================================================
CREATE OR REPLACE FUNCTION validate_journal_entry(p_entry_id UUID)
RETURNS void AS $$
DECLARE
  v_entry RECORD;
  v_diff NUMERIC(18,2);
BEGIN
  SELECT * INTO v_entry FROM journal_entries WHERE id = p_entry_id;
  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Ecriture non trouvee';
  END IF;
  IF v_entry.status != 'draft' THEN
    RAISE EXCEPTION 'Seules les ecritures brouillon peuvent etre validees (statut: %)', v_entry.status;
  END IF;

  SELECT ABS(COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0))
  INTO v_diff FROM journal_lines WHERE entry_id = p_entry_id;

  IF v_diff > 0.01 THEN
    RAISE EXCEPTION 'Ecriture desequilibree (ecart: %)', v_diff;
  END IF;

  UPDATE journal_entries SET status = 'validated', updated_at = now()
  WHERE id = p_entry_id;

  INSERT INTO audit_logs (id, tenant_id, action, entity_type, entity_id, details, timestamp)
  VALUES (gen_random_uuid(), v_entry.tenant_id, 'VALIDATE', 'journal_entry', p_entry_id::TEXT,
          jsonb_build_object('from', 'draft', 'to', 'validated')::TEXT, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 14. RPC: post_journal_entry
-- ============================================================
CREATE OR REPLACE FUNCTION post_journal_entry(p_entry_id UUID)
RETURNS void AS $$
DECLARE
  v_entry RECORD;
BEGIN
  SELECT * INTO v_entry FROM journal_entries WHERE id = p_entry_id;
  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Ecriture non trouvee';
  END IF;
  IF v_entry.status != 'validated' THEN
    RAISE EXCEPTION 'Seules les ecritures validees peuvent etre comptabilisees (statut: %)', v_entry.status;
  END IF;

  UPDATE journal_entries SET status = 'posted', updated_at = now()
  WHERE id = p_entry_id;

  INSERT INTO audit_logs (id, tenant_id, action, entity_type, entity_id, details, timestamp)
  VALUES (gen_random_uuid(), v_entry.tenant_id, 'POST', 'journal_entry', p_entry_id::TEXT,
          jsonb_build_object('from', 'validated', 'to', 'posted')::TEXT, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 15. RPC: apply_lettrage
-- ============================================================
CREATE OR REPLACE FUNCTION apply_lettrage(
  p_tenant_id UUID,
  p_line_ids UUID[],
  p_lettrage_code TEXT
)
RETURNS void AS $$
DECLARE
  v_total_debit NUMERIC(18,2);
  v_total_credit NUMERIC(18,2);
  v_account TEXT;
BEGIN
  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM journal_lines WHERE id = ANY(p_line_ids);

  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Lettrage desequilibre (Debit: % / Credit: %)', v_total_debit, v_total_credit;
  END IF;

  SELECT account_code INTO v_account
  FROM journal_lines WHERE id = p_line_ids[1];

  UPDATE journal_lines SET lettrage_code = p_lettrage_code
  WHERE id = ANY(p_line_ids);

  INSERT INTO lettrages (tenant_id, reference, account_code, montant, type, method)
  VALUES (p_tenant_id, p_lettrage_code, v_account, v_total_debit, 'complet', 'manual');

  INSERT INTO audit_logs (id, tenant_id, action, entity_type, entity_id, details, timestamp)
  VALUES (gen_random_uuid(), p_tenant_id, 'LETTRAGE', 'journal_lines', NULL,
          jsonb_build_object('code', p_lettrage_code, 'lines', array_length(p_line_ids, 1), 'montant', v_total_debit)::TEXT,
          now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 16. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_lettrages_tenant ON lettrages(tenant_id, reference);
CREATE INDEX IF NOT EXISTS idx_lettrages_account ON lettrages(tenant_id, account_code);
CREATE INDEX IF NOT EXISTS idx_jl_lettrage ON journal_lines(lettrage_code) WHERE lettrage_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jl_echeance ON journal_lines(date_echeance) WHERE date_echeance IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jl_account ON journal_lines(account_code);
CREATE INDEX IF NOT EXISTS idx_je_status ON journal_entries(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_je_journal ON journal_entries(tenant_id, journal);
