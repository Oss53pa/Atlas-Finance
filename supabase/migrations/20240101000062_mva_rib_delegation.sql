-- ============================================================================
-- MVA Lot 5 Vague B — Anti-fraude RIB (partner_master) + quarantaine + délégations.
-- Modification de RIB → circuit renforcé (2 valideurs distincts + signature OTP)
-- puis QUARANTAINE : aucun paiement vers le nouveau RIB pendant N jours. Délégations
-- bornées (types, plafond, dates). Souverain serveur (SELECT-only tenant).
-- ============================================================================

-- Quarantaine d'un RIB fraîchement activé.
create table if not exists public.partner_rib_quarantine (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null,
  partner_id       text,
  new_rib          text,
  instance_id      uuid references public.wf_instance(id),
  decision_ref     text,
  quarantine_until timestamptz not null,
  released_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists idx_rib_quarantine on public.partner_rib_quarantine(tenant_id, partner_id, quarantine_until);

-- Un paiement vers ce tiers/RIB est-il bloqué (quarantaine active) ?
create or replace function public.is_rib_under_quarantine(p_tenant uuid, p_partner text)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.partner_rib_quarantine
    where tenant_id = p_tenant and partner_id = p_partner
      and released_at is null and quarantine_until > now()
  );
$$;

-- Délégations bornées (types d'objets, plafond, fenêtre de dates).
create table if not exists public.wf_delegation (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null,
  ref            text,
  delegator_id   text not null,
  delegator_role text,
  delegate_id    text not null,
  object_types   text[] not null default '{}',   -- vide = tous
  max_amount_xof bigint,
  from_date      date,
  to_date        date,
  reason         text,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);
create index if not exists idx_wf_delegation on public.wf_delegation(tenant_id, delegate_id, active);

alter table public.partner_rib_quarantine enable row level security;
alter table public.wf_delegation          enable row level security;
do $$ begin
  create policy prq_sel on public.partner_rib_quarantine for select using (tenant_id = get_user_company_id());
  create policy wdel_sel on public.wf_delegation          for select using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
revoke insert, update, delete on public.partner_rib_quarantine, public.wf_delegation from authenticated, anon;
