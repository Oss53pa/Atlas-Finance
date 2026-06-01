-- Performance indexes: tenant_id on tables used by the app
-- CONCURRENTLY avoids locking the table during index creation

-- Index tenant_id on app-used tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lignes_rapprochement_tenant ON lignes_rapprochement(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provisions_tenant ON provisions(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_revision_items_tenant ON revision_items(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hedging_positions_tenant ON hedging_positions(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ventilations_analytiques_tenant ON ventilations_analytiques(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sections_analytiques_tenant ON sections_analytiques(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);

-- Composite indexes on most-queried tables (tenant + date/status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_lines_tenant_account ON journal_lines(tenant_id, account_code);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_tenant_code ON accounts(tenant_id, code);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_third_parties_tenant_type ON third_parties(tenant_id, type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_tenant_status ON assets(tenant_id, status);
