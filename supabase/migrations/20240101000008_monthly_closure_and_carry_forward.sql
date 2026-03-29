-- ============================================================================
-- Migration 8: Monthly Closure RPC + Full Annual Closure with N+1 + AN
-- Atlas F&A — SYSCOHADA compliance
-- ============================================================================

-- ============================================================================
-- P0.6 — AF-ER-004: Atomic Monthly Closure RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_monthly_closure(
  p_tenant_id UUID,
  p_periode_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_periode RECORD;
  v_entry_count INTEGER;
  v_draft_count INTEGER;
  v_posted_count INTEGER;
BEGIN
  -- Fetch the period
  SELECT * INTO v_periode
  FROM periodes_comptables
  WHERE id = p_periode_id AND tenant_id = p_tenant_id;

  IF v_periode IS NULL THEN
    RAISE EXCEPTION 'Période non trouvée (id: %)', p_periode_id;
  END IF;

  IF v_periode.status IN ('closed', 'locked', 'cloturee') THEN
    RAISE EXCEPTION 'Période déjà clôturée (code: %)', v_periode.code;
  END IF;

  -- Check no draft entries in the period
  SELECT COUNT(*) INTO v_draft_count
  FROM journal_entries
  WHERE tenant_id = p_tenant_id
    AND date BETWEEN v_periode.start_date AND v_periode.end_date
    AND status = 'draft';

  IF v_draft_count > 0 THEN
    RAISE EXCEPTION '% écriture(s) en brouillon doivent être validées avant la clôture de la période %',
      v_draft_count, v_periode.code;
  END IF;

  -- Count validated entries
  SELECT COUNT(*) INTO v_entry_count
  FROM journal_entries
  WHERE tenant_id = p_tenant_id
    AND date BETWEEN v_periode.start_date AND v_periode.end_date
    AND status IN ('validated', 'posted');

  -- Post all validated entries
  UPDATE journal_entries
  SET status = 'posted', updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND date BETWEEN v_periode.start_date AND v_periode.end_date
    AND status = 'validated';

  GET DIAGNOSTICS v_posted_count = ROW_COUNT;

  -- Lock the period
  UPDATE periodes_comptables
  SET status = 'closed',
      closed_at = now()
  WHERE id = p_periode_id AND tenant_id = p_tenant_id;

  -- Audit trail
  INSERT INTO audit_logs (tenant_id, action, entity_type, entity_id, details, timestamp)
  VALUES (
    p_tenant_id,
    'CLOTURE_MENSUELLE',
    'periode',
    p_periode_id::TEXT,
    jsonb_build_object(
      'periode_code', v_periode.code,
      'start_date', v_periode.start_date,
      'end_date', v_periode.end_date,
      'entry_count', v_entry_count,
      'posted_count', v_posted_count
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'periode_code', v_periode.code,
    'entry_count', v_entry_count,
    'posted_count', v_posted_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- P1.2 — AF-CL-008: Full Annual Closure with N+1 creation + AN entries
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_full_annual_closure(
  p_fiscal_year_id UUID,
  p_tenant_id UUID,
  p_create_next_year BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
  v_fy RECORD;
  v_next_fy_id UUID;
  v_closure_result JSONB;
  v_an_entry_id UUID;
  v_an_entry_number TEXT;
  v_an_total_debit NUMERIC(18,2) := 0;
  v_an_total_credit NUMERIC(18,2) := 0;
  v_an_line_count INTEGER := 0;
  v_compte RECORD;
  v_next_year_start DATE;
  v_next_year_end DATE;
  v_next_year_code TEXT;
BEGIN
  -- Step 1: Execute standard annual closure (existing RPC)
  SELECT execute_annual_closure(p_fiscal_year_id, p_tenant_id) INTO v_closure_result;

  IF NOT (v_closure_result->>'success')::BOOLEAN THEN
    RAISE EXCEPTION 'Échec de la clôture annuelle: %', v_closure_result;
  END IF;

  -- Load fiscal year details
  SELECT * INTO v_fy FROM fiscal_years WHERE id = p_fiscal_year_id;

  IF NOT p_create_next_year THEN
    RETURN jsonb_build_object(
      'success', true,
      'closure', v_closure_result,
      'next_year_created', false
    );
  END IF;

  -- Step 2: Create fiscal year N+1
  v_next_year_start := v_fy.end_date + INTERVAL '1 day';
  v_next_year_end := (v_fy.end_date + INTERVAL '1 year')::DATE;
  v_next_year_code := EXTRACT(YEAR FROM v_next_year_start)::TEXT;

  -- Check if N+1 already exists
  SELECT id INTO v_next_fy_id
  FROM fiscal_years
  WHERE tenant_id = p_tenant_id AND code = v_next_year_code;

  IF v_next_fy_id IS NULL THEN
    INSERT INTO fiscal_years (id, tenant_id, code, name, start_date, end_date, is_closed, is_active)
    VALUES (
      gen_random_uuid(),
      p_tenant_id,
      v_next_year_code,
      'Exercice ' || v_next_year_code,
      v_next_year_start,
      v_next_year_end,
      false,
      true
    )
    RETURNING id INTO v_next_fy_id;

    -- Create 12 monthly periods for N+1
    FOR i IN 0..11 LOOP
      INSERT INTO periodes_comptables (
        id, tenant_id, fiscal_year_id, code, label,
        start_date, end_date, status
      ) VALUES (
        gen_random_uuid(),
        p_tenant_id,
        v_next_fy_id,
        LPAD((i + 1)::TEXT, 2, '0') || '/' || v_next_year_code,
        TO_CHAR(v_next_year_start + (i || ' month')::INTERVAL, 'TMMonth YYYY'),
        (v_next_year_start + (i || ' month')::INTERVAL)::DATE,
        ((v_next_year_start + ((i + 1) || ' month')::INTERVAL) - INTERVAL '1 day')::DATE,
        'open'
      );
    END LOOP;

    -- Deactivate old fiscal year
    UPDATE fiscal_years SET is_active = false WHERE id = p_fiscal_year_id;
  END IF;

  -- Step 3: Generate carry-forward entries (Reports à Nouveau)
  -- Create AN journal entry header
  v_an_entry_id := gen_random_uuid();
  v_an_entry_number := 'AN-' || TO_CHAR(v_next_year_start, 'YYYYMMDD') || '-001';

  INSERT INTO journal_entries (
    id, tenant_id, entry_number, journal, date, label, status,
    total_debit, total_credit, created_at
  ) VALUES (
    v_an_entry_id,
    p_tenant_id,
    v_an_entry_number,
    'AN',
    v_next_year_start,
    'Reports à nouveau — Exercice ' || v_fy.code,
    'posted',
    0, 0,
    now()
  );

  -- Insert AN lines for all balance sheet accounts (classes 1-5) with non-zero balances
  FOR v_compte IN
    SELECT
      jl.account_code,
      COALESCE(MAX(jl.account_name), jl.account_code) AS account_name,
      SUM(jl.debit) - SUM(jl.credit) AS solde_net
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.entry_id
    WHERE je.tenant_id = p_tenant_id
      AND je.date BETWEEN v_fy.start_date AND v_fy.end_date
      AND je.status = 'posted'
      AND jl.account_code ~ '^[12345]'
    GROUP BY jl.account_code
    HAVING ABS(SUM(jl.debit) - SUM(jl.credit)) > 0.01
    ORDER BY jl.account_code
  LOOP
    INSERT INTO journal_lines (
      id, entry_id, tenant_id, account_code, account_name, label,
      debit, credit
    ) VALUES (
      gen_random_uuid(),
      v_an_entry_id,
      p_tenant_id,
      v_compte.account_code,
      v_compte.account_name,
      'Report à nouveau ' || v_compte.account_code,
      CASE WHEN v_compte.solde_net > 0 THEN v_compte.solde_net ELSE 0 END,
      CASE WHEN v_compte.solde_net < 0 THEN ABS(v_compte.solde_net) ELSE 0 END
    );

    v_an_total_debit := v_an_total_debit + CASE WHEN v_compte.solde_net > 0 THEN v_compte.solde_net ELSE 0 END;
    v_an_total_credit := v_an_total_credit + CASE WHEN v_compte.solde_net < 0 THEN ABS(v_compte.solde_net) ELSE 0 END;
    v_an_line_count := v_an_line_count + 1;
  END LOOP;

  -- Update AN entry totals
  UPDATE journal_entries
  SET total_debit = v_an_total_debit,
      total_credit = v_an_total_credit
  WHERE id = v_an_entry_id;

  -- Verify AN balance
  IF ABS(v_an_total_debit - v_an_total_credit) > 1 THEN
    RAISE EXCEPTION 'Reports à nouveau déséquilibrés: D=% C=% (écart: %)',
      v_an_total_debit, v_an_total_credit,
      ABS(v_an_total_debit - v_an_total_credit);
  END IF;

  -- Audit trail
  INSERT INTO audit_logs (tenant_id, action, entity_type, entity_id, details, timestamp)
  VALUES (
    p_tenant_id,
    'CLOTURE_ANNUELLE_COMPLETE',
    'fiscal_year',
    p_fiscal_year_id::TEXT,
    jsonb_build_object(
      'closure_result', v_closure_result,
      'next_fiscal_year_id', v_next_fy_id,
      'next_year_code', v_next_year_code,
      'an_entry_id', v_an_entry_id,
      'an_line_count', v_an_line_count,
      'an_total_debit', v_an_total_debit,
      'an_total_credit', v_an_total_credit
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'closure', v_closure_result,
    'next_year_created', true,
    'next_fiscal_year_id', v_next_fy_id,
    'next_year_code', v_next_year_code,
    'an_entry_id', v_an_entry_id,
    'an_line_count', v_an_line_count,
    'an_balanced', ABS(v_an_total_debit - v_an_total_credit) < 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- P0.5 — AF-CL-003: Period reopening requests table
-- ============================================================================

CREATE TABLE IF NOT EXISTS demandes_reouverture (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  periode_id UUID NOT NULL,
  motif TEXT NOT NULL CHECK (length(motif) >= 50),
  demandeur_id UUID NOT NULL,
  validateur_id UUID,
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'validee', 'rejetee')),
  motif_rejet TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE demandes_reouverture ENABLE ROW LEVEL SECURITY;

CREATE POLICY demandes_reouverture_tenant ON demandes_reouverture
  FOR ALL USING (tenant_id = get_user_company_id())
  WITH CHECK (tenant_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_demandes_reouverture_tenant
  ON demandes_reouverture(tenant_id, statut);
