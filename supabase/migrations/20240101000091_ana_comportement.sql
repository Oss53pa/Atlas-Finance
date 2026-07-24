-- ============================================================================
-- Analytique · Lot A·1 (1/3) — Comportement fixe/variable & traçabilité de ligne.
--
-- 1) Attribut `comportement` sur les règles de ventilation (fixe|variable|mixte).
--    Se propage à chaque ligne ventilée → rend possible la marge sur coûts
--    variables et le point mort (reporting A·2), sans calcul supplémentaire.
-- 2) Traçabilité de la ligne ventilée : rattachement au run, à l'étage et à la
--    règle appliquée (le moteur écrivait la ventilation sans lien vers son run).
--
-- Additif & idempotent. Montants inchangés : ventilations_analytiques.montant
-- reste en FCFA entiers (XOF sans décimale) — pas de colonne « centimes ».
-- ============================================================================

-- 1. Comportement sur la règle -----------------------------------------------
-- Nullable : NULL = dériver du compte par nature (60x variable, 61x/62x mixte,
-- 63x/64x/66x/68x fixe) ; une valeur = override explicite posé sur la règle.
alter table public.fna_allocation_rule
  add column if not exists comportement text,
  add column if not exists pct_variable numeric;   -- part variable si comportement='mixte' (0..100)

do $$ begin
  alter table public.fna_allocation_rule
    add constraint fna_allocation_rule_comportement_check
    check (comportement in ('fixe','variable','mixte'));
exception when duplicate_object then null; end $$;

-- 2. Traçabilité + comportement propagé sur la ligne ventilée -----------------
alter table public.ventilations_analytiques
  add column if not exists run_id       uuid references public.fna_allocation_run(id) on delete cascade,
  add column if not exists etage        text,
  add column if not exists regle_id     uuid references public.fna_allocation_rule(id) on delete set null,
  add column if not exists comportement text,
  add column if not exists pct_variable numeric;

do $$ begin
  alter table public.ventilations_analytiques
    add constraint ventilations_analytiques_etage_check
    check (etage in ('direct','primaire','deversement','manuel','reliquat'));
exception when duplicate_object then null; end $$;

create index if not exists idx_ventilations_run on public.ventilations_analytiques(run_id);
create index if not exists idx_ventilations_regle on public.ventilations_analytiques(regle_id);
