-- ============================================================================
-- MVA Lot 6 Vague C — Rapport de clôture d'espace (Doc Maître §A9) + base de
-- connaissance. À l'archivage, le rapport (problème, solutions retenues/écartées,
-- décisions, chronologie, pièces, hash) est persisté ici, conservé ≥ 10 ans
-- (OHADA), interrogeable en plein-texte (search_vector). La recherche sémantique
-- pgvector (embeddings) est une évolution v2 ; le plein-texte français en tient
-- lieu honnêtement en v1.
-- ============================================================================
create table if not exists public.space_report (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  space_id uuid not null,
  title text,
  content jsonb not null,
  hash text,
  search_text text,
  generated_at timestamptz not null default now(),
  retention_until timestamptz not null default (now() + interval '10 years')
);
alter table public.space_report add column if not exists search_vector tsvector
  generated always as (to_tsvector('french', coalesce(search_text, ''))) stored;
create index if not exists idx_space_report_tenant on public.space_report(tenant_id, generated_at desc);
create index if not exists idx_space_report_search on public.space_report using gin(search_vector);
create index if not exists idx_space_report_space on public.space_report(space_id);

alter table public.space_report enable row level security;
do $$ begin
  create policy sr_sel on public.space_report for select using (tenant_id = get_user_company_id());
  create policy sr_ins on public.space_report for insert with check (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
revoke update, delete on public.space_report from authenticated, anon;
