-- ============================================================================
-- Analytique · Lot A·1 (3/3) — Contrôles typés C1..C10 (CDC §6).
--
-- Le run n'exposait qu'un booléen `reconcilie` + une vue de réconciliation. Cette
-- table matérialise un RAPPORT DE CONTRÔLE structuré attaché à chaque run : un
-- enregistrement par contrôle, avec sévérité (bloquant|avertissement) et
-- résultat (ok|ko). A·1 alimente C1..C4/C6 ; C5/C7..C10 sont posés (typés) et
-- complétés en A·3 (versionnage, clés variables, écarts, verrouillage).
--
--   C1  Réconciliation Σ ventilé = Σ GL                         bloquant
--   C2  Couverture 100 % (ventilé ou file acceptée)             bloquant
--   C3  Cohérence sémantique axe/classe (7x⇏centre_cout…)       bloquant
--   C4  Sections auxiliaires à zéro après déversement           bloquant
--   C5  Section close/gelée ne reçoit rien                      bloquant   (A·3)
--   C6  Σ % d'une règle multi-sections = 100                    bloquant
--   C7  Clé variable rafraîchie sur la période                  avertissement (A·3)
--   C8  Variation > X % vs M-1 / budget                         avertissement (A·3)
--   C9  Ligne > seuil qualifiée sans double validation          avertissement (A·3)
--   C10 Axe 1 Projet vide sur plan Projets                      bloquant   (A·3)
-- ============================================================================

create table if not exists public.ana_controle (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.societes(id) on delete cascade,
  run_id     uuid not null references public.fna_allocation_run(id) on delete cascade,
  code       text not null check (code in ('C1','C2','C3','C4','C5','C6','C7','C8','C9','C10')),
  severite   text not null check (severite in ('bloquant','avertissement')),
  resultat   text not null check (resultat in ('ok','ko','na')),
  detail     jsonb,
  created_at timestamptz not null default now(),
  unique (run_id, code)
);

create index if not exists idx_ana_controle_run on public.ana_controle(run_id);

alter table public.ana_controle enable row level security;
do $$ begin
  create policy ana_controle_sel on public.ana_controle
    for select using (tenant_id = get_user_company_id());
  create policy ana_controle_ins on public.ana_controle
    for insert with check (tenant_id = get_user_company_id());
  create policy ana_controle_del on public.ana_controle
    for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
