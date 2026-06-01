-- ════════════════════════════════════════════════════════════════════════
-- 20240101000035 — RPC de migration par lot (Cahier v3, LOT 6 / A7)
-- ------------------------------------------------------------------------
-- • save_journal_entry_batch(p_entry, p_lines, p_batch_id) : comme
--   save_journal_entry mais tague migration_batch_id CÔTÉ SERVEUR.
-- • purge_migration_batch(p_batch_id, p_dry_run) : suppression STRICTEMENT
--   bornée à (tenant courant + batch_id). Garde-fou : batch_id obligatoire
--   (jamais de purge globale). Les données manuelles (batch_id NULL) intactes.
--   p_dry_run=true par défaut → pré-flight (compteurs, aucune suppression).
-- Additif. APPLIQUÉE en prod.
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.save_journal_entry_batch(p_entry jsonb, p_lines jsonb, p_batch_id uuid)
 RETURNS journal_entries
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_tenant UUID; v_id UUID; v_entry journal_entries;
BEGIN
  v_tenant := get_user_company_id();
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Acces refuse : aucun tenant.'; END IF;
  IF p_batch_id IS NULL THEN RAISE EXCEPTION 'batch_id obligatoire pour un import de migration.'; END IF;
  v_id := COALESCE(NULLIF(p_entry->>'id', '')::UUID, gen_random_uuid());
  INSERT INTO journal_entries (
    id, tenant_id, entry_number, journal, date, reference, label, status,
    total_debit, total_credit, reversal_of, reversal_reason,
    hash, previous_hash, created_by, created_at, updated_at, migration_batch_id
  ) VALUES (
    v_id, v_tenant, p_entry->>'entryNumber', p_entry->>'journal', (p_entry->>'date')::DATE,
    p_entry->>'reference', p_entry->>'label', COALESCE(NULLIF(p_entry->>'status',''),'draft'),
    COALESCE((p_entry->>'totalDebit')::NUMERIC,0), COALESCE((p_entry->>'totalCredit')::NUMERIC,0),
    NULLIF(p_entry->>'reversalOf','')::UUID, p_entry->>'reversalReason',
    p_entry->>'hash', p_entry->>'previousHash', auth.uid(), now(), now(), p_batch_id
  ) RETURNING * INTO v_entry;
  INSERT INTO journal_lines (
    id, entry_id, tenant_id, account_code, account_name, third_party_code,
    third_party_name, label, debit, credit, analytical_code, lettrage_code, migration_batch_id
  )
  SELECT COALESCE(NULLIF(l->>'id','')::UUID, gen_random_uuid()), v_id, v_tenant,
    l->>'accountCode', COALESCE(l->>'accountName', l->>'accountCode'),
    l->>'thirdPartyCode', l->>'thirdPartyName', l->>'label',
    COALESCE((l->>'debit')::NUMERIC,0), COALESCE((l->>'credit')::NUMERIC,0),
    l->>'analyticalCode', l->>'lettrageCode', p_batch_id
  FROM jsonb_array_elements(COALESCE(p_lines,'[]'::jsonb)) AS l;
  RETURN v_entry;
END;
$function$;

CREATE OR REPLACE FUNCTION public.purge_migration_batch(p_batch_id uuid, p_dry_run boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_tenant UUID; v_counts jsonb;
BEGIN
  v_tenant := get_user_company_id();
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Acces refuse : aucun tenant.'; END IF;
  IF p_batch_id IS NULL THEN RAISE EXCEPTION 'batch_id obligatoire (garde-fou anti-purge globale).'; END IF;
  SELECT jsonb_build_object(
    'journal_lines',   (SELECT count(*) FROM journal_lines   WHERE tenant_id=v_tenant AND migration_batch_id=p_batch_id),
    'journal_entries', (SELECT count(*) FROM journal_entries WHERE tenant_id=v_tenant AND migration_batch_id=p_batch_id),
    'accounts',        (SELECT count(*) FROM accounts        WHERE tenant_id=v_tenant AND migration_batch_id=p_batch_id),
    'third_parties',   (SELECT count(*) FROM third_parties   WHERE tenant_id=v_tenant AND migration_batch_id=p_batch_id),
    'assets',          (SELECT count(*) FROM assets          WHERE tenant_id=v_tenant AND migration_batch_id=p_batch_id)
  ) INTO v_counts;
  IF p_dry_run THEN RETURN jsonb_build_object('dry_run', true, 'batch_id', p_batch_id, 'counts', v_counts); END IF;
  DELETE FROM journal_lines   WHERE tenant_id=v_tenant AND migration_batch_id=p_batch_id;
  DELETE FROM journal_entries WHERE tenant_id=v_tenant AND migration_batch_id=p_batch_id;
  DELETE FROM assets          WHERE tenant_id=v_tenant AND migration_batch_id=p_batch_id;
  DELETE FROM third_parties   WHERE tenant_id=v_tenant AND migration_batch_id=p_batch_id;
  DELETE FROM accounts        WHERE tenant_id=v_tenant AND migration_batch_id=p_batch_id;
  UPDATE migration_sessions SET status='rolled_back', completed_at=now()
   WHERE tenant_id=v_tenant AND batch_id=p_batch_id;
  RETURN jsonb_build_object('dry_run', false, 'batch_id', p_batch_id, 'deleted', v_counts);
END;
$function$;

REVOKE ALL ON FUNCTION public.purge_migration_batch(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_journal_entry_batch(jsonb, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_migration_batch(uuid, boolean) TO authenticated;
