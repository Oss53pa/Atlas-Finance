-- ============================================================================
-- DIAGNOSTIC — Fuite RLS cross-tenant (P0-1) — À EXÉCUTER SUR LA BASE LIVE
-- ----------------------------------------------------------------------------
-- Contexte : un correctif documenté (supabase/fixes/p0-20260429/) supprime des
-- policies `public_read_*` / `allow_select_*(true)` qui exposaient les données
-- de TOUS les tenants en lecture. Ces scripts ne sont PAS dans supabase/migrations
-- → rien ne prouve depuis le code qu'ils ont été appliqués en production.
--
-- Ce fichier ne MODIFIE rien : il ne fait que DIAGNOSTIQUER. Lance-le dans le
-- SQL editor Supabase (rôle postgres). Interprétation en bas.
-- ============================================================================

-- 1) Policies publiques/anonymes dangereuses encore présentes ?
--    Toute ligne ici = fuite potentielle cross-tenant.
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (
        policyname LIKE 'public_read_%'
     OR policyname LIKE 'allow_select_%'
     OR qual = 'true'
     OR 'anon' = ANY (roles)
  )
ORDER BY tablename, policyname;

-- 2) Tables sensibles : ont-elles TOUJOURS leurs policies multi-tenant ?
--    Chaque table listée devrait avoir >= 1 policy filtrant par tenant.
SELECT tablename, count(*) AS nb_policies, array_agg(policyname ORDER BY policyname) AS policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'journal_entries','journal_lines','audit_logs','third_parties',
    'settings','fiscal_years','assets','invoices','subscriptions','tenants'
  )
GROUP BY tablename
ORDER BY tablename;

-- 3) Tables sensibles SANS RLS activée du tout (le pire cas).
SELECT c.relname AS table_sans_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
  AND c.relname IN (
    'journal_entries','journal_lines','audit_logs','third_parties',
    'settings','fiscal_years','assets','invoices','subscriptions','tenants'
  )
ORDER BY 1;

-- 4) Vues qui contournent la RLS (security_invoker manquant → exécutées avec les
--    droits du créateur, donc bypass des policies des tables sous-jacentes).
SELECT c.relname AS vue,
       COALESCE((SELECT option_value FROM pg_options_to_table(c.reloptions)
                 WHERE option_name = 'security_invoker'), 'non défini') AS security_invoker
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v'
ORDER BY 1;

-- ============================================================================
-- INTERPRÉTATION
--   Requête 1 : DOIT être VIDE. Toute ligne = fuite → appliquer
--               supabase/fixes/p0-20260429/02_supprimer_public_read_policies.sql
--               (précédé de 01_backup, suivi de 03/08/09 pour les grants).
--   Requête 2 : chaque table DOIT avoir >= 1 policy tenant. Une table absente ou
--               à 0 policy = à réparer (script 03_completer_policies_rls.sql).
--   Requête 3 : DOIT être VIDE. Une table listée n'a AUCUNE protection.
--   Requête 4 : les vues exposant des données tenant DOIVENT être `true`
--               (security_invoker). Sinon → 04_securiser_vues.sql.
-- ============================================================================
