-- ============================================================================
-- Migration 18 : Correctifs de sécurité & d'intégrité (audit pré-production)
--
-- P0-1 — Fuite de données inter-tenant : les RPC SECURITY DEFINER ci-dessous
--        faisaient confiance au `p_tenant_id` fourni par le client (lu depuis
--        localStorage, donc falsifiable) et contournaient ainsi le RLS. Elles
--        dérivent désormais le tenant côté serveur via get_user_company_id().
--
-- P0-4 — Écriture SaaS sans lignes : `saveJournalEntry` n'insérait jamais les
--        `journal_lines`. Nouvelle RPC `save_journal_entry` qui insère l'entête
--        ET les lignes ATOMIQUEMENT (une seule transaction → le trigger
--        DEFERRABLE valide l'équilibre au commit), tenant dérivé serveur.
--
-- NOTE DÉPLOIEMENT : à appliquer via `supabase db push` / migration. Idempotent
-- (CREATE OR REPLACE). N'altère aucune donnée existante.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- P0-1 : get_account_balance — ignore le p_tenant_id client, force le tenant
--        de l'utilisateur authentifié. Signature conservée (compat adapter).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_account_balance(
  p_prefixes TEXT[],
  p_tenant_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_debit NUMERIC(18,2);
  v_credit NUMERIC(18,2);
  v_count BIGINT;
  v_prefix_pattern TEXT;
  v_tenant UUID;
BEGIN
  -- SÉCURITÉ : on n'utilise JAMAIS p_tenant_id (falsifiable côté client).
  v_tenant := get_user_company_id();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Accès refusé : aucun tenant associé à l''utilisateur courant.';
  END IF;
  IF p_tenant_id IS NOT NULL AND p_tenant_id <> v_tenant THEN
    RAISE EXCEPTION 'Accès refusé : tenant demandé (%) différent du tenant de l''utilisateur.', p_tenant_id;
  END IF;

  v_prefix_pattern := '^(' || array_to_string(p_prefixes, '|') || ')';

  SELECT
    COALESCE(SUM(jl.debit), 0),
    COALESCE(SUM(jl.credit), 0),
    COUNT(*)
  INTO v_debit, v_credit, v_count
  FROM journal_lines jl
  JOIN journal_entries je ON je.id = jl.entry_id
  WHERE je.tenant_id = v_tenant
    AND je.status IN ('validated', 'posted')
    AND jl.account_code ~ v_prefix_pattern
    AND (p_start_date IS NULL OR je.date >= p_start_date)
    AND (p_end_date IS NULL OR je.date <= p_end_date);

  RETURN json_build_object(
    'debit', v_debit,
    'credit', v_credit,
    'solde', v_debit - v_credit,
    'lignes', v_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- P0-1 : get_trial_balance (overload date-range) — idem, tenant serveur.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_trial_balance(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  account_code TEXT,
  account_name TEXT,
  total_debit NUMERIC,
  total_credit NUMERIC,
  solde_debiteur NUMERIC,
  solde_crediteur NUMERIC
) AS $$
DECLARE
  v_tenant UUID;
BEGIN
  v_tenant := get_user_company_id();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Accès refusé : aucun tenant associé à l''utilisateur courant.';
  END IF;
  IF p_tenant_id IS NOT NULL AND p_tenant_id <> v_tenant THEN
    RAISE EXCEPTION 'Accès refusé : tenant demandé (%) différent du tenant de l''utilisateur.', p_tenant_id;
  END IF;

  RETURN QUERY
  SELECT
    jl.account_code,
    jl.account_name,
    COALESCE(SUM(jl.debit), 0) AS total_debit,
    COALESCE(SUM(jl.credit), 0) AS total_credit,
    GREATEST(COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0), 0) AS solde_debiteur,
    GREATEST(COALESCE(SUM(jl.credit), 0) - COALESCE(SUM(jl.debit), 0), 0) AS solde_crediteur
  FROM journal_lines jl
  JOIN journal_entries je ON jl.entry_id = je.id
  WHERE je.tenant_id = v_tenant
    AND je.status IN ('validated', 'posted')
    AND (p_start_date IS NULL OR je.date >= p_start_date)
    AND (p_end_date IS NULL OR je.date <= p_end_date)
  GROUP BY jl.account_code, jl.account_name
  ORDER BY jl.account_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- P0-1 : import_exchange_rates — écriture inter-tenant. Tenant serveur imposé.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION import_exchange_rates(
  p_rates JSONB,
  p_tenant_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_tid UUID;
BEGIN
  -- SÉCURITÉ : tenant dérivé du profil authentifié, jamais du paramètre client.
  v_tid := get_user_company_id();
  IF v_tid IS NULL THEN
    RAISE EXCEPTION 'Accès refusé : aucun tenant associé à l''utilisateur courant.';
  END IF;
  IF p_tenant_id IS NOT NULL AND p_tenant_id <> v_tid THEN
    RAISE EXCEPTION 'Accès refusé : tenant demandé (%) différent du tenant de l''utilisateur.', p_tenant_id;
  END IF;

  FOR i IN 0..jsonb_array_length(p_rates) - 1 LOOP
    INSERT INTO exchange_rates (
      id, tenant_id, from_currency, to_currency, rate, date, provider, created_at
    )
    VALUES (
      gen_random_uuid(),
      v_tid,
      p_rates->i->>'fromCurrency',
      p_rates->i->>'toCurrency',
      (p_rates->i->>'rate')::NUMERIC,
      (p_rates->i->>'date')::DATE,
      COALESCE(p_rates->i->>'provider', 'import'),
      now()
    )
    ON CONFLICT (tenant_id, from_currency, to_currency, date)
    DO UPDATE SET rate = EXCLUDED.rate, provider = EXCLUDED.provider;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- P0-4 : save_journal_entry — insertion ATOMIQUE entête + lignes.
--        Tenant dérivé serveur. L'équilibre D=C est garanti par le trigger
--        DEFERRABLE validate_entry_balance qui s'évalue au commit (donc après
--        l'insertion de toutes les lignes).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION save_journal_entry(
  p_entry JSONB,
  p_lines JSONB
)
RETURNS journal_entries AS $$
DECLARE
  v_tenant UUID;
  v_id UUID;
  v_entry journal_entries;
BEGIN
  v_tenant := get_user_company_id();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Accès refusé : aucun tenant associé à l''utilisateur courant.';
  END IF;

  v_id := COALESCE(NULLIF(p_entry->>'id', '')::UUID, gen_random_uuid());

  INSERT INTO journal_entries (
    id, tenant_id, entry_number, journal, date, reference, label, status,
    total_debit, total_credit, reversal_of, reversal_reason,
    hash, previous_hash, created_by, created_at, updated_at
  ) VALUES (
    v_id,
    v_tenant,
    p_entry->>'entryNumber',
    p_entry->>'journal',
    (p_entry->>'date')::DATE,
    p_entry->>'reference',
    p_entry->>'label',
    COALESCE(NULLIF(p_entry->>'status', ''), 'draft'),
    COALESCE((p_entry->>'totalDebit')::NUMERIC, 0),
    COALESCE((p_entry->>'totalCredit')::NUMERIC, 0),
    NULLIF(p_entry->>'reversalOf', '')::UUID,
    p_entry->>'reversalReason',
    p_entry->>'hash',
    p_entry->>'previousHash',
    auth.uid(),
    now(),
    now()
  )
  RETURNING * INTO v_entry;

  INSERT INTO journal_lines (
    id, entry_id, tenant_id, account_code, account_name,
    third_party_code, third_party_name, label, debit, credit,
    analytical_code, lettrage_code
  )
  SELECT
    COALESCE(NULLIF(l->>'id', '')::UUID, gen_random_uuid()),
    v_id,
    v_tenant,
    l->>'accountCode',
    COALESCE(l->>'accountName', l->>'accountCode'),
    l->>'thirdPartyCode',
    l->>'thirdPartyName',
    l->>'label',
    COALESCE((l->>'debit')::NUMERIC, 0),
    COALESCE((l->>'credit')::NUMERIC, 0),
    l->>'analyticalCode',
    l->>'lettrageCode'
  FROM jsonb_array_elements(COALESCE(p_lines, '[]'::jsonb)) AS l;

  RETURN v_entry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
