-- ============================================================================
-- L3 — Authentification des satellites de la Suite Atlas
--
-- Réf. docs/integration-suite-atlas/DESIGN.md § L3.1
--
-- L'ingestion n'est PAS authentifiée par un utilisateur final : c'est une
-- APPLICATION (Atlas Trade / Procure / People) qui parle au Grand Livre.
-- Une clé par (tenant, satellite), révocable, jamais stockée en clair.
--
-- Migration ADDITIVE et IDEMPOTENTE.
-- ============================================================================

create table if not exists public.integration_api_keys (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.societes(id) on delete cascade,
  source_system text not null check (source_system in ('atlas_trade','atlas_procure','atlas_people')),
  label         text not null default '',
  -- SHA-256 de la clé. Le secret n'existe en clair qu'au moment de sa
  -- création, côté administrateur : il n'est JAMAIS relisible ensuite.
  key_hash      text not null,
  active        boolean not null default true,
  last_used_at  timestamptz,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  revoked_at    timestamptz,
  unique (key_hash)
);

create index if not exists integration_api_keys_lookup_idx
  on public.integration_api_keys (key_hash, active);

create index if not exists integration_api_keys_tenant_idx
  on public.integration_api_keys (tenant_id, source_system, active);

alter table public.integration_api_keys enable row level security;

-- Lecture des MÉTADONNÉES seulement (le hash ne permet pas de rejouer la clé).
-- Écriture réservée au service-role via l'Edge Function d'administration.
do $$ begin
  drop policy if exists integration_api_keys_all on public.integration_api_keys;
  create policy integration_api_keys_all on public.integration_api_keys
    using (tenant_id = get_user_company_id())
    with check (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

comment on table public.integration_api_keys
  is 'Clés de service par (tenant, satellite) pour l''Edge Function integration-ingest. Secret jamais stocké en clair, révocable.';

-- ─── Statut de période exposé aux satellites (L6.1) ─────────────────────────
-- Un satellite doit pouvoir dire à SON utilisateur, au moment de la saisie,
-- que la période est close — et non trois jours plus tard par un rejet.
--
-- ⚠️ Sans cette exposition, le verrou de clôture d'Atlas F&A redevient
-- COSMÉTIQUE à l'échelle de la suite : c'est exactement le défaut qui a déjà
-- dû être corrigé une fois en interne.

create or replace function public.integration_period_status(
  p_tenant_id uuid,
  p_date      date
) returns jsonb
language plpgsql
stable
security definer
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

  -- Normalisation FR/EN → forme canonique (miroir de canonicalPeriodStatus).
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

comment on function public.integration_period_status(uuid, date)
  is 'Statut de la période comptable à une date, pour que les satellites contrôlent AVANT d''émettre. Miroir serveur de canonicalPeriodStatus.';
