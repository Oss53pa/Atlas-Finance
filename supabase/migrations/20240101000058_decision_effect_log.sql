-- ============================================================================
-- Effets FNA des décisions (Doc Maître §B5) — journal d'application RÉEL.
-- À l'approbation finale, l'effet du registre (space_decision_effect) est
-- APPLIQUÉ : une ligne opposable est écrite ici, avec la cible résolue depuis
-- l'ancrage métier de l'espace (compte/période/tiers). Aucune écriture comptable
-- automatique (interdit) : l'écriture éventuelle reste passée par un humain et
-- liée à la décision. Souverain serveur (service_role) ; SELECT tenant seul.
-- ============================================================================

create table if not exists public.space_effect_log (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null,
  decision_id   uuid not null references public.space_decision(id),
  decision_ref  text,
  effect_key    text not null,           -- suspens.set_status | partner.flag_write_off | period.unlock_step
  target        jsonb not null default '{}',   -- {accountCode?, period?, partnerId?}
  params        jsonb not null default '{}',
  applied_at    timestamptz not null default now()
);
create index if not exists idx_effect_log_tenant on public.space_effect_log(tenant_id, applied_at desc);
create index if not exists idx_effect_log_decision on public.space_effect_log(decision_id);

alter table public.space_effect_log enable row level security;
do $$ begin
  create policy sel_effect_log on public.space_effect_log for select using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
revoke insert, update, delete on public.space_effect_log from authenticated, anon;
