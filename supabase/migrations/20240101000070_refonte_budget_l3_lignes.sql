-- =============================================================================
-- Refonte OPEX/CAPEX — Lot 3 : précision des lignes budgétaires
-- Doc : docs/refonte-opex-capex/DESIGN.md §3.3
--
-- Additif & idempotent. Ajoute à budget_lines :
--   - nature (opex|capex|revenus) — précise budget_type (backfill depuis budget_type)
--   - source_prefill — traçabilité de la méthode d'élaboration (manuel/n1/import/…)
--   - capex_request_id — lien vers le BC/CAR pour les lignes CAPEX
-- budget_type est conservé (compat vues existantes v_budget_vs_actual).
-- =============================================================================
alter table public.budget_lines
  add column if not exists nature           text,
  add column if not exists source_prefill   text,
  add column if not exists capex_request_id uuid references public.capex_requests(id) on delete set null;

-- Backfill nature à partir de budget_type (exploitation→opex, investissement→capex).
update public.budget_lines
   set nature = case when budget_type = 'investissement' then 'capex' else 'opex' end
 where nature is null;

alter table public.budget_lines alter column nature set default 'opex';

alter table public.budget_lines drop constraint if exists budget_lines_nature_check;
alter table public.budget_lines add  constraint budget_lines_nature_check
  check (nature in ('opex', 'capex', 'revenus'));

alter table public.budget_lines drop constraint if exists budget_lines_source_prefill_check;
alter table public.budget_lines add  constraint budget_lines_source_prefill_check
  check (source_prefill is null or source_prefill in
    ('manuel', 'n1', 'n1_indexe', 'zbb', 'contrat', 'copie_version', 'import', 'car'));
