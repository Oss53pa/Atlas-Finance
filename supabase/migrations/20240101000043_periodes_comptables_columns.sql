-- =====================================================================
-- Fix : « Créer les périodes mensuelles » échouait silencieusement.
-- Le front (DBFiscalPeriod / useFiscalPeriods) écrit type/progression et la
-- réouverture (reopened_at/by), colonnes absentes de periodes_comptables →
-- l'INSERT était rejeté. (Le normaliseur SupabaseAdapter corrige la relecture.)
-- =====================================================================
alter table public.periodes_comptables
  add column if not exists type        text default 'mensuelle',
  add column if not exists progression integer default 0,
  add column if not exists reopened_at timestamptz,
  add column if not exists reopened_by uuid;
