-- ============================================================================
-- Durcissement de sécurité de l'ossature d'intégration
--
-- Réf. docs/integration-suite-atlas/DESIGN.md § 2 « Sécurité »
--
-- Deux failles relevées par le linter Supabase APRÈS application des migrations
-- 082/083/084 — corrigées ici. À appliquer systématiquement avec elles.
--
-- 1. `v_subledger_reconciliation` créée en SECURITY DEFINER (défaut Postgres
--    pour une vue) : elle s'exécutait avec les droits de son créateur, donc
--    SANS la RLS de l'appelant → un utilisateur authentifié pouvait lire les
--    comptes collectifs d'un AUTRE tenant.
--
-- 2. next_entry_number / get_single_account_balance / integration_period_status
--    en SECURITY DEFINER, exposées via /rest/v1/rpc et exécutables par `anon`
--    (EXECUTE accordé à PUBLIC par défaut). Elles prennent `p_tenant_id` EN
--    PARAMÈTRE : n'importe qui pouvait demander le solde d'un compte ou le
--    statut de période de n'importe quel tenant, et brûler des numéros de
--    séquence.
--
-- Correction : SECURITY INVOKER. Les tables sous-jacentes (journal_entries,
-- journal_lines, periodes_comptables, fiscal_years, entry_sequences) portent
-- déjà la RLS — c'est ELLE qui doit trancher, pas les droits du créateur.
-- Les Edge Functions passent en service_role : elles ne sont pas affectées.
-- ============================================================================

alter view public.v_subledger_reconciliation set (security_invoker = on);

create or replace function public.next_entry_number(
  p_tenant_id uuid,
  p_journal text,
  p_fy      text
) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v bigint;
begin
  if p_tenant_id is null or p_journal is null or p_fy is null then
    raise exception 'next_entry_number: paramètres obligatoires manquants';
  end if;

  insert into public.entry_sequences (tenant_id, journal_code, fiscal_year, last_value, updated_at)
  values (p_tenant_id, p_journal, p_fy, 1, now())
  on conflict (tenant_id, journal_code, fiscal_year)
    do update set last_value = public.entry_sequences.last_value + 1,
                  updated_at = now()
  returning last_value into v;

  return p_journal || '-' || p_fy || '-' || lpad(v::text, 6, '0');
end $$;

create or replace function public.get_single_account_balance(
  p_tenant_id uuid,
  p_account text,
  p_as_of   date default null,
  p_include_drafts boolean default false
) returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(jl.debit - jl.credit), 0)::numeric
  from public.journal_lines jl
  join public.journal_entries je on je.id = jl.entry_id
  where jl.tenant_id = p_tenant_id
    and jl.account_code = p_account
    and (p_include_drafts or je.status in ('validated', 'posted'))
    and (p_as_of is null or je.date <= p_as_of);
$$;

create or replace function public.integration_period_status(
  p_tenant_id uuid,
  p_date      date
) returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_status  text;
  v_fy      record;
  v_next    date;
begin
  select status into v_status
  from public.periodes_comptables
  where tenant_id = p_tenant_id
    and p_date between start_date and end_date
  limit 1;

  v_status := case
    when v_status in ('closed','cloturee','clôturée','archivee','archivée') then 'closed'
    when v_status in ('locked','verrouillee','verrouillée')                 then 'locked'
    when v_status is null                                                    then 'no_period'
    else 'open'
  end;

  select * into v_fy
  from public.fiscal_years
  where tenant_id = p_tenant_id and p_date between start_date and end_date
  limit 1;

  if v_fy.id is not null and coalesce(v_fy.is_closed, false) then
    v_status := 'closed';
  end if;

  select min(start_date) into v_next
  from public.periodes_comptables
  where tenant_id = p_tenant_id
    and start_date > p_date
    and status not in ('closed','cloturee','clôturée','archivee','archivée','locked','verrouillee','verrouillée');

  return jsonb_build_object(
    'status', v_status,
    'fiscal_year', v_fy.name,
    'fiscal_year_closed', coalesce(v_fy.is_closed, false),
    'next_open_date', v_next
  );
end $$;

-- ⚠️ Le REVOKE ... FROM anon ne suffit PAS : Postgres accorde EXECUTE à PUBLIC
-- par défaut sur toute fonction, et `anon` en hérite. Il faut révoquer à la
-- racine (PUBLIC) puis ré-accorder explicitement.
revoke execute on function public.next_entry_number(uuid, text, text) from public;
revoke execute on function public.get_single_account_balance(uuid, text, date, boolean) from public;
revoke execute on function public.integration_period_status(uuid, date) from public;

grant execute on function public.next_entry_number(uuid, text, text) to authenticated, service_role;
grant execute on function public.get_single_account_balance(uuid, text, date, boolean) to authenticated, service_role;
grant execute on function public.integration_period_status(uuid, date) to authenticated, service_role;
