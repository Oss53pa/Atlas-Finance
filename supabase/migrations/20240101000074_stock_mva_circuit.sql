-- =====================================================================
-- Module STOCK — SoD/gouvernance : enregistrement dans l'engine MVA (wf_*).
-- Purement ADDITIF : nouveau object_type 'stock_movement' (n'existait pas),
-- circuit scope par tenant (mêmes tables/RLS que journal_entry, payment_batch…
-- déjà enregistrés). Aucune modification des Edge Functions wf-submit/wf-act
-- ni des autres object_type. Appelé à l'ACTIVATION du module (comme
-- stock_seed_defaults), idempotent.
--
-- Circuits (calqués sur le motif OD simple/contrôlée déjà en place) :
--   - défaut : « Mouvement stock — validation simple » (1 étape, Comptable)
--   - règle amount_xof >= 1 000 000 : « … validation renforcée »
--     (Comptable → DAF, signature OTP à l'étape DAF)
-- =====================================================================
create or replace function public.stock_seed_mva_circuit(p_tenant uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_def_simple uuid; v_def_controle uuid;
begin
  if exists (select 1 from public.wf_definition where tenant_id = p_tenant and object_type = 'stock_movement') then
    return; -- idempotent : déjà seedé pour ce tenant
  end if;

  insert into public.wf_object_registry (object_type, label, module_path, sensitivity, batchable, external_linkable, active)
  values ('stock_movement', 'Mouvement de stock', '/stock/pending', 'high', false, false, true)
  on conflict (object_type) do nothing;

  insert into public.wf_definition (id, tenant_id, object_type, name, version, status, is_default)
  values (gen_random_uuid(), p_tenant, 'stock_movement', 'Mouvement stock — validation simple', 1, 'active', true)
  returning id into v_def_simple;

  insert into public.wf_stage (id, tenant_id, definition_id, position, name, mode, quorum, required_role, sla_hours, signature_level)
  values (gen_random_uuid(), p_tenant, v_def_simple, 1, 'Comptable', 'ANY', 1, 'comptable', 24, 'none');

  insert into public.wf_definition (id, tenant_id, object_type, name, version, status, is_default)
  values (gen_random_uuid(), p_tenant, 'stock_movement', 'Mouvement stock — validation renforcée', 1, 'active', false)
  returning id into v_def_controle;

  insert into public.wf_stage (id, tenant_id, definition_id, position, name, mode, quorum, required_role, sla_hours, signature_level)
  values
    (gen_random_uuid(), p_tenant, v_def_controle, 1, 'Comptable', 'ANY', 1, 'comptable', 24, 'none'),
    (gen_random_uuid(), p_tenant, v_def_controle, 2, 'DAF',       'ANY', 1, 'daf',       24, 'otp');

  insert into public.wf_rule (id, tenant_id, object_type, conditions, definition_id, priority, active)
  values (
    gen_random_uuid(), p_tenant, 'stock_movement',
    jsonb_build_object('amount_xof', jsonb_build_object('gte', 1000000)),
    v_def_controle, 100, true
  );
end $$;
