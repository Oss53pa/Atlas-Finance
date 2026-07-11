-- =====================================================================
-- Fix : la création des périodes échouait en SaaS (INSERT rejeté).
-- Le front (DBFiscalPeriod / useFiscalPeriods) utilise les statuts FR
--   'ouverte' | 'en_cloture' | 'cloturee' | 'rouverte'
-- mais le CHECK n'autorisait que 'open','closed','locked','cloturee'.
-- Insérer une période 'ouverte' violait la contrainte → génération des
-- périodes impossible (spinner « Génération des périodes… » infini).
-- On élargit la contrainte (additif : valeurs EN historiques conservées).
-- =====================================================================
alter table public.periodes_comptables
  drop constraint if exists periodes_comptables_status_check;

alter table public.periodes_comptables
  add constraint periodes_comptables_status_check
  check (status in ('open','closed','locked','ouverte','en_cloture','cloturee','rouverte'));
