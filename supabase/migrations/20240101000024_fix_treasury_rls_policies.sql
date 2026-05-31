-- ============================================================================
-- Migration: Fix Treasury RLS Policies
-- Replaces current_setting('app.current_company_id', true)::UUID with
-- get_user_company_id() for the 8 tables created in migration 000014.
-- Note: these tables use "company_id" (not "tenant_id") as tenant column.
-- Idempotent: DROP POLICY IF EXISTS before each CREATE POLICY.
-- ============================================================================

-- ============================================================================
-- PAYMENT ORDERS
-- ============================================================================
DROP POLICY IF EXISTS "payment_orders_tenant" ON payment_orders;
DROP POLICY IF EXISTS "po_select" ON payment_orders;
DROP POLICY IF EXISTS "po_insert" ON payment_orders;
DROP POLICY IF EXISTS "po_update" ON payment_orders;
DROP POLICY IF EXISTS "po_delete" ON payment_orders;

CREATE POLICY "po_select" ON payment_orders
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "po_insert" ON payment_orders
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "po_update" ON payment_orders
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "po_delete" ON payment_orders
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================================================
-- CASH REGISTER SESSIONS
-- ============================================================================
DROP POLICY IF EXISTS "cash_sessions_tenant" ON cash_register_sessions;
DROP POLICY IF EXISTS "crs_select" ON cash_register_sessions;
DROP POLICY IF EXISTS "crs_insert" ON cash_register_sessions;
DROP POLICY IF EXISTS "crs_update" ON cash_register_sessions;
DROP POLICY IF EXISTS "crs_delete" ON cash_register_sessions;

CREATE POLICY "crs_select" ON cash_register_sessions
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "crs_insert" ON cash_register_sessions
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "crs_update" ON cash_register_sessions
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "crs_delete" ON cash_register_sessions
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================================================
-- CASH MOVEMENTS
-- ============================================================================
DROP POLICY IF EXISTS "cash_movements_tenant" ON cash_movements;
DROP POLICY IF EXISTS "cm_select" ON cash_movements;
DROP POLICY IF EXISTS "cm_insert" ON cash_movements;
DROP POLICY IF EXISTS "cm_update" ON cash_movements;
DROP POLICY IF EXISTS "cm_delete" ON cash_movements;

CREATE POLICY "cm_select" ON cash_movements
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "cm_insert" ON cash_movements
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "cm_update" ON cash_movements
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "cm_delete" ON cash_movements
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================================================
-- LOAN SCHEDULES
-- ============================================================================
DROP POLICY IF EXISTS "loan_schedules_tenant" ON loan_schedules;
DROP POLICY IF EXISTS "ls_select" ON loan_schedules;
DROP POLICY IF EXISTS "ls_insert" ON loan_schedules;
DROP POLICY IF EXISTS "ls_update" ON loan_schedules;
DROP POLICY IF EXISTS "ls_delete" ON loan_schedules;

CREATE POLICY "ls_select" ON loan_schedules
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "ls_insert" ON loan_schedules
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "ls_update" ON loan_schedules
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "ls_delete" ON loan_schedules
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================================================
-- CHECKS REGISTER
-- ============================================================================
DROP POLICY IF EXISTS "checks_tenant" ON checks_register;
DROP POLICY IF EXISTS "cr_select" ON checks_register;
DROP POLICY IF EXISTS "cr_insert" ON checks_register;
DROP POLICY IF EXISTS "cr_update" ON checks_register;
DROP POLICY IF EXISTS "cr_delete" ON checks_register;

CREATE POLICY "cr_select" ON checks_register
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "cr_insert" ON checks_register
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "cr_update" ON checks_register
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "cr_delete" ON checks_register
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================================================
-- PURCHASE ORDERS
-- ============================================================================
DROP POLICY IF EXISTS "purchase_orders_tenant" ON purchase_orders;
DROP POLICY IF EXISTS "pur_select" ON purchase_orders;
DROP POLICY IF EXISTS "pur_insert" ON purchase_orders;
DROP POLICY IF EXISTS "pur_update" ON purchase_orders;
DROP POLICY IF EXISTS "pur_delete" ON purchase_orders;

CREATE POLICY "pur_select" ON purchase_orders
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "pur_insert" ON purchase_orders
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "pur_update" ON purchase_orders
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "pur_delete" ON purchase_orders
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================================================
-- GOODS RECEIPTS
-- ============================================================================
DROP POLICY IF EXISTS "goods_receipts_tenant" ON goods_receipts;
DROP POLICY IF EXISTS "gr_select" ON goods_receipts;
DROP POLICY IF EXISTS "gr_insert" ON goods_receipts;
DROP POLICY IF EXISTS "gr_update" ON goods_receipts;
DROP POLICY IF EXISTS "gr_delete" ON goods_receipts;

CREATE POLICY "gr_select" ON goods_receipts
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "gr_insert" ON goods_receipts
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "gr_update" ON goods_receipts
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "gr_delete" ON goods_receipts
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================================================
-- OFF-BALANCE COMMITMENTS
-- ============================================================================
DROP POLICY IF EXISTS "off_balance_tenant" ON off_balance_commitments;
DROP POLICY IF EXISTS "obc_select" ON off_balance_commitments;
DROP POLICY IF EXISTS "obc_insert" ON off_balance_commitments;
DROP POLICY IF EXISTS "obc_update" ON off_balance_commitments;
DROP POLICY IF EXISTS "obc_delete" ON off_balance_commitments;

CREATE POLICY "obc_select" ON off_balance_commitments
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "obc_insert" ON off_balance_commitments
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "obc_update" ON off_balance_commitments
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "obc_delete" ON off_balance_commitments
  FOR DELETE USING (company_id = get_user_company_id());
