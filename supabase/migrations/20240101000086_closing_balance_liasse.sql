-- ============================================================================
-- Vague D — Balance générale de clôture pour Liass'Pilot (UEMOA + CEMAC)
--
-- Atlas F&A ne produit pas les annexes de liasse (c'est le métier de
-- Liass'Pilot) : il expose la BALANCE GÉNÉRALE DE CLÔTURE (8 colonnes) que
-- Liass'Pilot récupère pour bâtir la DSF des 14 pays.
--
-- État : « après inventaire, avant affectation du résultat » = balance BRUTE
-- de toutes les écritures validées/postées de l'exercice. Miroir serveur de
-- src/services/fiscal/closingBalanceService.ts (buildClosingBalance).
--
-- Additive et idempotente. SECURITY INVOKER (la RLS de journal_lines /
-- journal_entries tranche ; le service-role de l'Edge Function la contourne
-- légitimement).
-- ============================================================================

create or replace function public.get_closing_trial_balance(
  p_tenant_id      uuid,
  p_fiscal_year_id uuid
) returns table (
  account_code    text,
  account_name    text,
  opening_debit   numeric,
  opening_credit  numeric,
  movement_debit  numeric,
  movement_credit numeric,
  closing_debit   numeric,
  closing_credit  numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with fy as (
    select start_date, end_date
    from public.fiscal_years
    where id = p_fiscal_year_id and tenant_id = p_tenant_id
  ),
  -- Écritures retenues : validées/postées, brouillons EXCLUS. Les à-nouveaux
  -- (journal AN/RAN) forment l'ouverture quelle que soit leur date ; les autres
  -- ne comptent que dans les bornes de l'exercice.
  lines as (
    select
      jl.account_code,
      jl.account_name,
      (je.journal in ('AN','RAN')) as is_opening,
      jl.debit, jl.credit
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    cross join fy
    where jl.tenant_id = p_tenant_id
      and je.status in ('validated','posted')
      and (
        je.journal in ('AN','RAN')
        or (je.date >= fy.start_date and je.date <= fy.end_date)
      )
  ),
  agg as (
    select
      account_code,
      max(account_name) as account_name,
      coalesce(sum(debit)  filter (where is_opening), 0)      as opening_debit,
      coalesce(sum(credit) filter (where is_opening), 0)      as opening_credit,
      coalesce(sum(debit)  filter (where not is_opening), 0)  as movement_debit,
      coalesce(sum(credit) filter (where not is_opening), 0)  as movement_credit
    from lines
    group by account_code
  )
  select
    account_code,
    account_name,
    opening_debit,
    opening_credit,
    movement_debit,
    movement_credit,
    -- Solde de clôture présenté par SIGNE (un compte à solde inversé se place
    -- du bon côté ; jamais de GREATEST(...,0) qui écraserait le solde inversé).
    case when (opening_debit + movement_debit) - (opening_credit + movement_credit) >= 0
         then (opening_debit + movement_debit) - (opening_credit + movement_credit)
         else 0 end as closing_debit,
    case when (opening_credit + movement_credit) - (opening_debit + movement_debit) > 0
         then (opening_credit + movement_credit) - (opening_debit + movement_debit)
         else 0 end as closing_credit
  from agg
  where not (opening_debit = 0 and opening_credit = 0
             and movement_debit = 0 and movement_credit = 0)
  order by account_code;
$$;

comment on function public.get_closing_trial_balance(uuid, uuid)
  is 'Balance générale de clôture 8 colonnes (après inventaire, avant affectation) pour Liass''Pilot. Validées/postées uniquement.';

-- Défense en profondeur : pas d'exécution anonyme.
revoke execute on function public.get_closing_trial_balance(uuid, uuid) from public;
grant execute on function public.get_closing_trial_balance(uuid, uuid) to authenticated, service_role;

-- ─── Liass'Pilot = nouveau consommateur du bus d'intégration ────────────────
-- La clé d'API de Liass'Pilot est en LECTURE SEULE (elle ne fait que tirer la
-- balance) — le CHECK source_system doit l'admettre.

do $$
begin
  alter table public.integration_api_keys
    drop constraint if exists integration_api_keys_source_system_check;
  alter table public.integration_api_keys
    add constraint integration_api_keys_source_system_check
    check (source_system in ('atlas_trade','atlas_procure','atlas_people','liasse_pilot'));
end $$;
