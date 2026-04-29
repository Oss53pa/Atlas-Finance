-- ============================================================================
-- ATLAS F&A — SCRIPT 05 : NUMÉROTATION SÉQUENTIELLE ROBUSTE (P0-3)
-- ============================================================================
-- Objectif : Garantir l'unicité et la continuité des numéros d'écritures
--            comptables même en cas d'inserts concurrents (obligation OHADA)
-- Durée estimée : 30 secondes - 2 minutes selon le volume
-- Risque : MOYEN — modifie un trigger critique
-- Pré-requis : Tester en DEV/STAGING d'abord
-- ============================================================================
-- CONTEXTE :
-- Un user A et un user B insèrent des écritures sur le même journal en même
-- temps. Sans lock approprié, ils peuvent obtenir le même numéro → unique
-- constraint violation, OU pire des trous si l'INSERT échoue.
--
-- Solution : utiliser pg_advisory_xact_lock par (tenant, journal, exercice)
-- Cela sérialise les inserts dans une même séquence sans bloquer les autres.
-- ============================================================================

BEGIN;

-- 1. Backup de la fonction actuelle (au cas où)
CREATE TABLE IF NOT EXISTS _atlas_fa_function_backup_20260429 (
  function_name text,
  function_definition text,
  backed_up_at timestamptz DEFAULT now()
);

INSERT INTO _atlas_fa_function_backup_20260429 (function_name, function_definition)
SELECT
  'generate_sequential_entry_number',
  pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'generate_sequential_entry_number'
ON CONFLICT DO NOTHING;

-- 2. Recréer la fonction avec verrou avisory + format robuste
CREATE OR REPLACE FUNCTION public.generate_sequential_entry_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_year text;
  v_sequence_number integer;
  v_lock_key bigint;
  v_journal_clean text;
BEGIN
  -- Si entry_number déjà fourni, on respecte (cas import historique)
  IF NEW.entry_number IS NOT NULL AND NEW.entry_number != '' THEN
    RETURN NEW;
  END IF;

  -- Extraire l'année de l'écriture
  v_year := to_char(NEW.date, 'YYYY');

  -- Nettoyer le code journal (alphanumérique uniquement, max 4 chars)
  v_journal_clean := UPPER(SUBSTRING(REGEXP_REPLACE(NEW.journal, '[^A-Za-z0-9]', '', 'g'), 1, 4));

  -- 🔒 VERROU APPLICATIF : sérialise les inserts sur (tenant, journal, year)
  -- Le hash garantit qu'on ne bloque QUE les inserts dans la même séquence
  v_lock_key := hashtextextended(
    NEW.tenant_id::text || '|' || v_journal_clean || '|' || v_year,
    0
  );
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Calculer le prochain numéro DANS la séquence (tenant + journal + année)
  -- ATTENTION : on regarde les entry_number existants pour cette combinaison
  SELECT COALESCE(
    MAX(
      NULLIF(
        REGEXP_REPLACE(entry_number, '^[A-Z0-9]+-' || v_year || '-', ''),
        ''
      )::integer
    ),
    0
  ) + 1
  INTO v_sequence_number
  FROM journal_entries
  WHERE tenant_id = NEW.tenant_id
    AND UPPER(SUBSTRING(REGEXP_REPLACE(journal, '[^A-Za-z0-9]', '', 'g'), 1, 4)) = v_journal_clean
    AND to_char(date, 'YYYY') = v_year
    AND entry_number ~ ('^' || v_journal_clean || '-' || v_year || '-[0-9]+$');

  -- Format final : VEN-2026-000123
  NEW.entry_number := v_journal_clean || '-' || v_year || '-' || LPAD(v_sequence_number::text, 6, '0');

  RETURN NEW;
END;
$function$;

-- 3. Vérifier que le trigger pointe bien sur la nouvelle fonction
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_entry_number'
      AND tgrelid = 'public.journal_entries'::regclass
  ) THEN
    -- Créer le trigger s'il n'existe pas
    CREATE TRIGGER trg_entry_number
      BEFORE INSERT ON public.journal_entries
      FOR EACH ROW
      EXECUTE FUNCTION public.generate_sequential_entry_number();
    RAISE NOTICE '✅ Trigger trg_entry_number créé';
  ELSE
    RAISE NOTICE '✅ Trigger trg_entry_number déjà présent (pointe vers la nouvelle fonction)';
  END IF;
END $$;

-- 4. Index pour optimiser le calcul du prochain numéro
CREATE INDEX IF NOT EXISTS idx_je_tenant_journal_year_number
  ON journal_entries (tenant_id, journal, (to_char(date, 'YYYY')), entry_number);

COMMIT;

-- ============================================================================
-- VÉRIFICATION POST-EXÉCUTION
-- ============================================================================

-- 1. Vérifier qu'il n'y a pas de DOUBLONS d'entry_number
SELECT
  tenant_id,
  entry_number,
  COUNT(*) as nb_doublons
FROM journal_entries
GROUP BY tenant_id, entry_number
HAVING COUNT(*) > 1;
-- ⚠️ Doit retourner ZÉRO ligne. Sinon problème historique à régler.

-- 2. Vérifier qu'il n'y a pas de TROUS dans la séquence par journal
WITH sequences AS (
  SELECT
    tenant_id,
    UPPER(SUBSTRING(REGEXP_REPLACE(journal, '[^A-Za-z0-9]', '', 'g'), 1, 4)) as journal_code,
    to_char(date, 'YYYY') as year,
    NULLIF(REGEXP_REPLACE(entry_number, '^[A-Z0-9]+-[0-9]{4}-', ''), '')::integer as num,
    entry_number
  FROM journal_entries
  WHERE entry_number ~ '^[A-Z0-9]+-[0-9]{4}-[0-9]+$'
),
expected AS (
  SELECT
    tenant_id, journal_code, year,
    MIN(num) as min_num,
    MAX(num) as max_num,
    COUNT(*) as actual_count,
    (MAX(num) - MIN(num) + 1) as expected_count
  FROM sequences
  GROUP BY tenant_id, journal_code, year
)
SELECT
  tenant_id, journal_code, year,
  min_num, max_num, actual_count, expected_count,
  (expected_count - actual_count) as nb_trous
FROM expected
WHERE actual_count != expected_count
ORDER BY nb_trous DESC;
-- ⚠️ Si des trous existent, c'est historique. Loi OHADA = présomption de fraude.
-- Action : enquêter ou créer écritures de régularisation.

-- 3. Test de concurrence (à exécuter en 2 sessions parallèles pour valider) :
-- Session 1: BEGIN; INSERT INTO journal_entries (...) VALUES (...);
-- Session 2: BEGIN; INSERT INTO journal_entries (...) VALUES (...);
-- → Avec advisory_xact_lock, la session 2 attend la session 1, pas de doublon

-- ============================================================================
-- ROLLBACK D'URGENCE
-- ============================================================================
-- DROP FUNCTION public.generate_sequential_entry_number() CASCADE;
-- Puis recréer depuis _atlas_fa_function_backup_20260429
