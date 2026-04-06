-- ============================================================================
-- Migration 17: Soft Delete + Bank Account Encryption
-- OHADA legal requirement: 10-year minimum data retention
-- ============================================================================

-- ============================================================================
-- 1. Soft delete for accounting data (never hard delete)
-- ============================================================================
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Exclude soft-deleted rows from normal queries
CREATE OR REPLACE VIEW active_journal_entries AS
SELECT * FROM journal_entries WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_journal_lines AS
SELECT * FROM journal_lines WHERE deleted_at IS NULL;

-- Index for efficient filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_je_deleted_at ON journal_entries(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jl_deleted_at ON journal_lines(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- 2. Bank account encryption (using Supabase Vault / pgsodium)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Add encrypted columns for bank account numbers
-- bank_account_id is referenced in payment_orders; actual bank account
-- details live in cash_register_sessions.cash_account_id or in future
-- bank_accounts table. We add the columns here for when the table exists.
DO $$
BEGIN
  -- Create bank_accounts table if it does not exist
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'bank_accounts') THEN
    CREATE TABLE bank_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES societes(id),
      label TEXT NOT NULL,
      bank_name TEXT,
      bic TEXT,
      account_code TEXT NOT NULL,
      currency TEXT DEFAULT 'XOF',
      is_active BOOLEAN DEFAULT true,
      -- Encrypted IBAN fields
      encrypted_iban BYTEA,
      iban_nonce BYTEA,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

    CREATE POLICY bank_accounts_select ON bank_accounts
      FOR SELECT USING (tenant_id = get_user_company_id());
    CREATE POLICY bank_accounts_insert ON bank_accounts
      FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
    CREATE POLICY bank_accounts_update ON bank_accounts
      FOR UPDATE USING (tenant_id = get_user_company_id());
    CREATE POLICY bank_accounts_delete ON bank_accounts
      FOR DELETE USING (tenant_id = get_user_company_id());

    CREATE INDEX idx_bank_accounts_tenant ON bank_accounts(tenant_id);
  ELSE
    -- Table exists — just add encrypted columns
    ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS encrypted_iban BYTEA;
    ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS iban_nonce BYTEA;
  END IF;
END $$;

-- ============================================================================
-- 3. Encryption function using pgsodium AEAD
-- ============================================================================
CREATE OR REPLACE FUNCTION encrypt_bank_account(plain_iban TEXT, key_id UUID)
RETURNS TABLE(encrypted BYTEA, nonce BYTEA)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_key BYTEA;
  v_nonce BYTEA;
BEGIN
  SELECT decrypted_raw_key INTO v_key FROM pgsodium.decrypted_secrets WHERE id = key_id;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found: %', key_id;
  END IF;
  v_nonce := pgsodium.crypto_aead_ietf_nonce();
  RETURN QUERY SELECT
    pgsodium.crypto_aead_ietf_encrypt(plain_iban::BYTEA, ''::BYTEA, v_nonce, v_key),
    v_nonce;
END;
$$;

-- Decryption function (for authorized reads)
CREATE OR REPLACE FUNCTION decrypt_bank_account(cipher BYTEA, nonce BYTEA, key_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_key BYTEA;
BEGIN
  SELECT decrypted_raw_key INTO v_key FROM pgsodium.decrypted_secrets WHERE id = key_id;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Decryption key not found: %', key_id;
  END IF;
  RETURN convert_from(
    pgsodium.crypto_aead_ietf_decrypt(cipher, ''::BYTEA, nonce, v_key),
    'UTF8'
  );
END;
$$;

-- ============================================================================
-- 4. Data retention policy comments (OHADA legal requirement)
-- ============================================================================
COMMENT ON TABLE journal_entries IS 'Retention minimale: 10 ans (obligation legale OHADA Art. 24)';
COMMENT ON TABLE journal_lines IS 'Retention minimale: 10 ans (obligation legale OHADA Art. 24)';
COMMENT ON TABLE audit_logs IS 'Retention minimale: 10 ans - IMMUABLE (INSERT only)';

-- ============================================================================
-- 5. Prevent hard delete on posted entries (additional safety)
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_hard_delete_posted()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Suppression definitive interdite sur une ecriture comptabilisee (SYSCOHADA Art. 19). Utilisez le soft delete.';
  END IF;
  -- For non-posted entries, perform soft delete instead of hard delete
  UPDATE journal_entries SET deleted_at = now() WHERE id = OLD.id;
  -- Cancel the actual DELETE
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_hard_delete_entries
BEFORE DELETE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_posted();
