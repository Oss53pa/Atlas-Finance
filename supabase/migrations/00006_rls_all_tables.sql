-- ============================================================================
-- Migration 00006: RLS Policies pour TOUTES les tables comptables
-- WiseBook ERP - Supabase Migration
-- ============================================================================
--
-- Complète les policies existantes (00004 = supplier_invoices/payments,
-- 00005 = knowledge_base/chat_logs) en ajoutant RLS sur :
-- - fiscal_years, chart_of_accounts, journals
-- - journal_entries, journal_entry_lines
-- - societes, devises
-- - suppliers, customers, tiers (si existent depuis 00003)
--
-- Principe : isolation par company_id via get_user_company_id().
-- ============================================================================

-- ============================================================================
-- 1. FISCAL YEARS
-- ============================================================================
ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_years_select"
  ON fiscal_years FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "fiscal_years_insert"
  ON fiscal_years FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "fiscal_years_update"
  ON fiscal_years FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "fiscal_years_delete"
  ON fiscal_years FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================================
-- 2. CHART OF ACCOUNTS
-- ============================================================================
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coa_select"
  ON chart_of_accounts FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "coa_insert"
  ON chart_of_accounts FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "coa_update"
  ON chart_of_accounts FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "coa_delete"
  ON chart_of_accounts FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================================
-- 3. JOURNALS
-- ============================================================================
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journals_select"
  ON journals FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "journals_insert"
  ON journals FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "journals_update"
  ON journals FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "journals_delete"
  ON journals FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================================
-- 4. JOURNAL ENTRIES
-- ============================================================================
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_entries_select"
  ON journal_entries FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "journal_entries_insert"
  ON journal_entries FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "journal_entries_update"
  ON journal_entries FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "journal_entries_delete"
  ON journal_entries FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================================
-- 5. JOURNAL ENTRY LINES (via journal_entries.company_id)
-- ============================================================================
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_entry_lines_select"
  ON journal_entry_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.entry_id
        AND je.company_id = get_user_company_id()
    )
  );

CREATE POLICY "journal_entry_lines_insert"
  ON journal_entry_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.entry_id
        AND je.company_id = get_user_company_id()
    )
  );

CREATE POLICY "journal_entry_lines_update"
  ON journal_entry_lines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.entry_id
        AND je.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.entry_id
        AND je.company_id = get_user_company_id()
    )
  );

CREATE POLICY "journal_entry_lines_delete"
  ON journal_entry_lines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.entry_id
        AND je.company_id = get_user_company_id()
    )
  );

-- ============================================================================
-- 6. SOCIETES (l'utilisateur ne voit que SA société)
-- ============================================================================
ALTER TABLE societes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "societes_select"
  ON societes FOR SELECT
  USING (id = get_user_company_id());

CREATE POLICY "societes_update"
  ON societes FOR UPDATE
  USING (id = get_user_company_id())
  WITH CHECK (id = get_user_company_id());

-- INSERT/DELETE : réservé aux admins via service_role_key

-- ============================================================================
-- 7. SUPPLIERS (si table existe depuis 00003)
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
    ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "suppliers_select" ON suppliers FOR SELECT USING (company_id = get_user_company_id())';
    EXECUTE 'CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT WITH CHECK (company_id = get_user_company_id())';
    EXECUTE 'CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id())';
    EXECUTE 'CREATE POLICY "suppliers_delete" ON suppliers FOR DELETE USING (company_id = get_user_company_id())';
  END IF;
END $$;

-- ============================================================================
-- 8. CUSTOMERS (si table existe depuis 00003)
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "customers_select" ON customers FOR SELECT USING (company_id = get_user_company_id())';
    EXECUTE 'CREATE POLICY "customers_insert" ON customers FOR INSERT WITH CHECK (company_id = get_user_company_id())';
    EXECUTE 'CREATE POLICY "customers_update" ON customers FOR UPDATE USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id())';
    EXECUTE 'CREATE POLICY "customers_delete" ON customers FOR DELETE USING (company_id = get_user_company_id())';
  END IF;
END $$;

-- ============================================================================
-- 9. TIERS (si table existe depuis 00003)
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tiers') THEN
    ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "tiers_select" ON tiers FOR SELECT USING (company_id = get_user_company_id())';
    EXECUTE 'CREATE POLICY "tiers_insert" ON tiers FOR INSERT WITH CHECK (company_id = get_user_company_id())';
    EXECUTE 'CREATE POLICY "tiers_update" ON tiers FOR UPDATE USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id())';
    EXECUTE 'CREATE POLICY "tiers_delete" ON tiers FOR DELETE USING (company_id = get_user_company_id())';
  END IF;
END $$;

-- ============================================================================
-- 10. DEVISES
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'devises') THEN
    ALTER TABLE devises ENABLE ROW LEVEL SECURITY;

    -- Les devises sont en lecture seule pour tous les utilisateurs authentifiés
    EXECUTE 'CREATE POLICY "devises_select" ON devises FOR SELECT USING (auth.role() = ''authenticated'')';
    -- INSERT/UPDATE/DELETE réservé au service_role
  END IF;
END $$;
