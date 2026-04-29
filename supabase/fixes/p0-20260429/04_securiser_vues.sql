-- ============================================================================
-- ATLAS F&A — SCRIPT 04 : SÉCURISATION DES VUES (P0-4)
-- ============================================================================
-- Objectif : Forcer security_invoker sur les vues qui agrègent des données
--            multi-tenant (active_journal_entries, active_journal_lines)
-- Durée estimée : < 5 secondes
-- Risque : FAIBLE
-- ============================================================================
-- CONTEXTE :
-- En PostgreSQL, par défaut une VIEW utilise les permissions du créateur
-- (security_definer implicite). Cela signifie qu'une vue peut bypasser les RLS
-- de la table sous-jacente. Pour Atlas F&A, c'est inacceptable.
-- ============================================================================

BEGIN;

-- 1. Inspecter les vues existantes
DO $$
DECLARE
  v_record RECORD;
  v_count integer := 0;
BEGIN
  RAISE NOTICE '🔍 Vues présentes dans le schéma public :';
  FOR v_record IN
    SELECT viewname FROM pg_views WHERE schemaname = 'public' ORDER BY viewname
  LOOP
    RAISE NOTICE '  - %', v_record.viewname;
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'TOTAL : % vues', v_count;
END $$;

-- 2. Activer security_invoker sur active_journal_entries
ALTER VIEW IF EXISTS public.active_journal_entries
  SET (security_invoker = true);

-- 3. Activer security_invoker sur active_journal_lines
ALTER VIEW IF EXISTS public.active_journal_lines
  SET (security_invoker = true);

-- 4. Activer security_invoker sur TOUTES les vues du schéma public (sécurité par défaut)
DO $$
DECLARE
  v_record RECORD;
  v_count integer := 0;
BEGIN
  FOR v_record IN
    SELECT viewname FROM pg_views WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v_record.viewname);
    v_count := v_count + 1;
    RAISE NOTICE '  🔐 security_invoker activé sur vue : %', v_record.viewname;
  END LOOP;
  RAISE NOTICE '';
  RAISE NOTICE '✅ TOTAL : % vues sécurisées', v_count;
END $$;

COMMIT;

-- ============================================================================
-- VÉRIFICATION POST-EXÉCUTION
-- ============================================================================

-- Vérifier que security_invoker est bien activé sur toutes les vues
SELECT
  c.relname as view_name,
  CASE
    WHEN 'security_invoker=true' = ANY(c.reloptions) THEN '✅ SÉCURISÉE'
    ELSE '❌ NON SÉCURISÉE'
  END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
  AND n.nspname = 'public'
ORDER BY c.relname;
