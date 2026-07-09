-- ============================================================================
-- MVA Lot 6 Vague B — Administration des circuits : trace + exécution client de
-- la simulation. wf_admin_log (audit des modifications de circuits, écrit par
-- l'Edge Function wf-admin en service_role). Autorise l'appel client de
-- wf_resolve_definition pour la « simulation à blanc » (read-only, RLS tenant).
-- ============================================================================
create table if not exists public.wf_admin_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  actor_id text,
  action text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_wf_admin_log on public.wf_admin_log(tenant_id, created_at desc);
alter table public.wf_admin_log enable row level security;
do $$ begin
  create policy wal_sel on public.wf_admin_log for select using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
revoke insert, update, delete on public.wf_admin_log from authenticated, anon;

grant execute on function public.wf_resolve_definition(uuid, text, jsonb) to authenticated;
