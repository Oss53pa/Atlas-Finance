-- Archivage du modèle FNA hérité, PEUPLÉ mais référencé nulle part dans le code.
--
-- Ces 6 tables sont l'ancien socle « FNA » (grand livre, tiers, comptes, budgets,
-- imports) remplacé par journal_entries / journal_lines / accounts / third_parties.
-- Aucune référence dans src/ ni dans les Edge Functions ; aucune FK entrante ;
-- aucune vue/fonction dépendante (vérifié avant migration). Les exposer via RLS
-- tenant créerait un grand livre parallèle de 8496 écritures visible sans
-- consommateur — d'où leur retrait de `public`.
--
-- SUPPRESSION RÉVERSIBLE : on les DÉPLACE vers le schéma zz_legacy_fna plutôt que
-- de les DROP. Elles quittent public → hors de portée de l'application et de
-- l'API PostgREST, mais restent restaurables. La purge définitive (drop schema
-- zz_legacy_fna cascade) est une décision distincte à exécuter séparément.
--
-- Lignes au moment de l'archivage : fna_gl_entries 8496, fna_gl_tiers 3834,
-- fna_accounts 548, fna_tiers_unmatched 469, fna_budgets 464, fna_imports 15.

create schema if not exists zz_legacy_fna;
comment on schema zz_legacy_fna is
  'Cimetière : anciennes tables FNA peuplées mais inutilisées (remplacées par journal_entries/journal_lines/accounts/third_parties). Restaurables via ALTER TABLE ... SET SCHEMA public. Purge définitive : DROP SCHEMA zz_legacy_fna CASCADE.';

do $$
declare t text;
begin
  foreach t in array array['fna_gl_entries','fna_gl_tiers','fna_accounts','fna_tiers_unmatched','fna_budgets','fna_imports'] loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('alter table public.%I set schema zz_legacy_fna', t);
    end if;
  end loop;
end $$;
