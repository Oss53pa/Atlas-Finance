-- ============================================================================
-- Migration 16: Performance Indexes
-- Critical indexes for most-frequent accounting queries
-- ============================================================================

-- 1. Balance generale (sum debit/credit par compte sur un exercice)
--    journal_lines has no exercice_id; queries join via journal_entries.date
--    Composite on (tenant_id, account_code) already exists as idx_journal_lines_account
--    Add a covering index for date-range balance queries (join path)
CREATE INDEX IF NOT EXISTS idx_jl_tenant_account_entry
  ON journal_lines(tenant_id, account_code, entry_id);

-- 2. Grand Livre d'un compte (toutes les lignes chronologiques)
--    idx_journal_lines_entry already covers entry_id; add date on journal_entries
CREATE INDEX IF NOT EXISTS idx_je_tenant_date_id
  ON journal_entries(tenant_id, date, id);

-- 3. Journal entries par exercice et journal
--    idx_journal_entries_tenant_journal exists; add composite with date for range scans
CREATE INDEX IF NOT EXISTS idx_je_tenant_journal_date
  ON journal_entries(tenant_id, journal, date);

-- 4. Journal entries status filtering (used by validation / posting flows)
--    idx_journal_entries_tenant_status already exists; add composite with date
CREATE INDEX IF NOT EXISTS idx_je_status_date
  ON journal_entries(tenant_id, status, date);

-- 5. Assets par statut (disposal queries, depreciation runs)
--    idx_assets_tenant_status already covers (tenant_id, status)
--    Add acquisition_date for depreciation prorata scans
CREATE INDEX IF NOT EXISTS idx_assets_tenant_status_acq
  ON assets(tenant_id, status, acquisition_date);

-- 6. Audit trail par tenant et timestamp (audit log browsing)
CREATE INDEX IF NOT EXISTS idx_audit_tenant_ts
  ON audit_logs(tenant_id, timestamp DESC);

-- 7. Lettrage lookup (already exists from migration 006, ensure present)
CREATE INDEX IF NOT EXISTS idx_lettrages_tenant_ref
  ON lettrages(tenant_id, reference);

-- 8. Rapprochement bancaire par tenant et statut
CREATE INDEX IF NOT EXISTS idx_rapprochements_tenant_statut
  ON rapprochements(tenant_id, statut);

-- 9. Ventilations analytiques par section
CREATE INDEX IF NOT EXISTS idx_ventilations_section
  ON ventilations_analytiques(section_id);

-- 10. Journal lines lettrage_code for lettrage resolution
--     (partial index already exists from migration 006, ensure present)
CREATE INDEX IF NOT EXISTS idx_jl_lettrage
  ON journal_lines(lettrage_code) WHERE lettrage_code IS NOT NULL;

-- 11. Periodes comptables status lookup (period lock checks)
CREATE INDEX IF NOT EXISTS idx_periodes_status
  ON periodes_comptables(tenant_id, status);
