-- ============================================================================
-- Analytique · Lot A·1 (2/3) — File de qualification (CDC §5.4).
--
-- Le reliquat non matché par aucune règle tombait dans un simple rapport visuel
-- (topNonFleches) puis disparaissait. Cette table le matérialise : chaque ligne
-- de GL non fléchée devient une entrée qualifiable manuellement, promouvable en
-- règle en un clic, ou acceptée sur une section « À QUALIFIER » par défaut.
--
-- La suggestion PROPH3T est ADVISORY ONLY : suggestion_ia est renseigné, jamais
-- une affectation automatique (contrainte plateforme).
--
-- Clé (tenant_id, ligne_gl_id) unique → une affectation manuelle PERSISTE d'un
-- run à l'autre (le moteur upsert et la ré-applique tant qu'aucune règle ne
-- couvre la ligne).
-- ============================================================================

create table if not exists public.ana_qualification (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.societes(id) on delete cascade,
  run_id       uuid references public.fna_allocation_run(id) on delete set null,
  ligne_gl_id  uuid not null,                       -- → journal_lines(id)
  statut       text not null default 'en_attente'
                 check (statut in ('en_attente','affecte','defaut_accepte')),
  suggestion_ia jsonb,
  section_id   uuid references public.sections_analytiques(id) on delete set null,
  promue_en_regle_id uuid references public.fna_allocation_rule(id) on delete set null,
  affecte_par  uuid,
  affecte_le   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (tenant_id, ligne_gl_id)
);

create index if not exists idx_ana_qualif_run on public.ana_qualification(run_id);
create index if not exists idx_ana_qualif_statut on public.ana_qualification(tenant_id, statut);

alter table public.ana_qualification enable row level security;
do $$ begin
  create policy ana_qualif_sel on public.ana_qualification
    for select using (tenant_id = get_user_company_id());
  create policy ana_qualif_ins on public.ana_qualification
    for insert with check (tenant_id = get_user_company_id());
  create policy ana_qualif_upd on public.ana_qualification
    for update using (tenant_id = get_user_company_id());
  create policy ana_qualif_del on public.ana_qualification
    for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
