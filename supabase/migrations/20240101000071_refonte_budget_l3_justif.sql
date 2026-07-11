-- =============================================================================
-- Refonte OPEX/CAPEX — Lot 3 : justification par ligne budgétaire (§10.4)
-- Additif & idempotent. Commentaire/justification par ligne (les pièces jointes
-- réutiliseront le bucket documents ultérieurement).
-- =============================================================================
alter table public.budget_lines add column if not exists commentaire text;
