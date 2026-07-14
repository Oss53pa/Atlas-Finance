-- ============================================================================
-- Espace collaboratif — ABANDON MANUEL d'un espace (sortie sans clôture).
-- Un espace peut désormais être retiré de la vue active sans clôture opposable :
-- statut 'abandonne' (déjà accepté — colonne status = text libre) + traçabilité
-- de l'auteur et de la date. Distinct de l'archivage (closeSpace → rapport scellé
-- + closure_hash). Réactivable (les colonnes sont remises à NULL).
-- Mapping camelCase→snake_case dans SupabaseAdapter (normalizeGeneric + toSnake).
-- Idempotent (add column if not exists). abandon_reason existe déjà (migration 55).
-- ============================================================================

alter table public.collab_channels
  add column if not exists abandoned_at timestamptz,
  add column if not exists abandoned_by text;
