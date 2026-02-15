-- ============================================================================
-- Migration 00004: RLS Policies renforcées pour Factures et Paiements
-- WiseBook ERP - Supabase Migration
-- ============================================================================
--
-- Les Edge Functions utilisent service_role_key (bypass RLS complet),
-- mais ces policies servent de filet de sécurité au cas où un appel
-- passerait directement par le client anon_key.
--
-- Principe : un utilisateur ne peut accéder qu'aux données de sa société
-- (company_id) via la fonction get_user_company_id().
-- ============================================================================

-- ============================================================================
-- 1. SUPPLIER INVOICES - Policies par company_id (via suppliers)
-- ============================================================================

-- Vérifier que RLS est activé (déjà fait dans migration 00003, mais sécurité)
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;

-- Supprimer l'ancienne policy si elle existe (idempotent)
DROP POLICY IF EXISTS "Company isolation" ON supplier_invoices;

-- SELECT : un utilisateur ne voit que les factures de sa société
CREATE POLICY "supplier_invoices_select_company"
  ON supplier_invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = supplier_invoices.supplier_id
        AND s.company_id = get_user_company_id()
    )
  );

-- INSERT : un utilisateur ne peut créer que pour les fournisseurs de sa société
CREATE POLICY "supplier_invoices_insert_company"
  ON supplier_invoices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = supplier_invoices.supplier_id
        AND s.company_id = get_user_company_id()
    )
  );

-- UPDATE : un utilisateur ne peut modifier que les factures de sa société
CREATE POLICY "supplier_invoices_update_company"
  ON supplier_invoices
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = supplier_invoices.supplier_id
        AND s.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = supplier_invoices.supplier_id
        AND s.company_id = get_user_company_id()
    )
  );

-- DELETE : un utilisateur ne peut supprimer que les factures de sa société
CREATE POLICY "supplier_invoices_delete_company"
  ON supplier_invoices
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = supplier_invoices.supplier_id
        AND s.company_id = get_user_company_id()
    )
  );

-- ============================================================================
-- 2. SUPPLIER PAYMENTS - Policies par company_id (via suppliers)
-- ============================================================================

ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company isolation" ON supplier_payments;

CREATE POLICY "supplier_payments_select_company"
  ON supplier_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = supplier_payments.supplier_id
        AND s.company_id = get_user_company_id()
    )
  );

CREATE POLICY "supplier_payments_insert_company"
  ON supplier_payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = supplier_payments.supplier_id
        AND s.company_id = get_user_company_id()
    )
  );

CREATE POLICY "supplier_payments_update_company"
  ON supplier_payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = supplier_payments.supplier_id
        AND s.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = supplier_payments.supplier_id
        AND s.company_id = get_user_company_id()
    )
  );

CREATE POLICY "supplier_payments_delete_company"
  ON supplier_payments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s
      WHERE s.id = supplier_payments.supplier_id
        AND s.company_id = get_user_company_id()
    )
  );

-- ============================================================================
-- 3. SUPPLIER PAYMENT INVOICES - Policies (via payments → suppliers)
-- ============================================================================

ALTER TABLE supplier_payment_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company isolation" ON supplier_payment_invoices;

CREATE POLICY "supplier_payment_invoices_select_company"
  ON supplier_payment_invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM supplier_payments sp
      JOIN suppliers s ON s.id = sp.supplier_id
      WHERE sp.id = supplier_payment_invoices.payment_id
        AND s.company_id = get_user_company_id()
    )
  );

CREATE POLICY "supplier_payment_invoices_insert_company"
  ON supplier_payment_invoices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM supplier_payments sp
      JOIN suppliers s ON s.id = sp.supplier_id
      WHERE sp.id = supplier_payment_invoices.payment_id
        AND s.company_id = get_user_company_id()
    )
  );

CREATE POLICY "supplier_payment_invoices_delete_company"
  ON supplier_payment_invoices
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM supplier_payments sp
      JOIN suppliers s ON s.id = sp.supplier_id
      WHERE sp.id = supplier_payment_invoices.payment_id
        AND s.company_id = get_user_company_id()
    )
  );
