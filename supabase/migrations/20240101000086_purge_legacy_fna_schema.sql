-- Purge DÉFINITIVE (irréversible) du modèle FNA hérité archivé en 20240101000085.
--
-- Le schéma zz_legacy_fna ne contenait que les 6 tables héritées (fna_gl_entries,
-- fna_gl_tiers, fna_accounts, fna_tiers_unmatched, fna_budgets, fna_imports —
-- 13 826 lignes), déjà sorties de public et référencées nulle part dans le code.
-- Contenu re-vérifié avant exécution (exactement ces 6 tables, rien d'autre).
--
-- Après cette migration, récupération possible UNIQUEMENT via restore d'un backup
-- Supabase.
drop schema if exists zz_legacy_fna cascade;
