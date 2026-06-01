-- ════════════════════════════════════════════════════════════════════════
-- 20240101000034 — Backfill des intitulés de comptes (Cahier v3, LOT 5 / A4)
-- ------------------------------------------------------------------------
-- ⚠️  NON APPLIQUÉE AUTOMATIQUEMENT EN PRODUCTION — À EXÉCUTER MANUELLEMENT
--     APRÈS DÉCISION EXPLICITE.
--
-- Raison : journal_entries porte une chaîne de hash d'intégrité (hash/previous_hash).
-- Si le hash d'une écriture a été calculé en incluant `account_name` de ses lignes,
-- réécrire `account_name` a posteriori invaliderait la vérification d'intégrité
-- SHA-256 (piste d'audit OHADA). À n'exécuter que si :
--   1. on a vérifié que hashEntry() N'inclut PAS account_name, OU
--   2. on accepte de recalculer/réceller la chaîne de hash ensuite.
--
-- Le correctif principal A4 est fait À LA SOURCE (import) : les nouvelles écritures
-- prennent le libellé du compte (colonne LIBELLE) au lieu de retomber sur le numéro.
-- Ce backfill ne concerne que les DONNÉES HISTORIQUES déjà importées « code = nom ».
-- ------------------------------------------------------------------------

-- Régression : pour chaque ligne dont l'intitulé == le code, reprendre le nom du
-- compte correspondant dans `accounts` (même tenant), uniquement s'il est différent.
UPDATE public.journal_lines jl
   SET account_name = a.name
  FROM public.accounts a
 WHERE a.tenant_id = jl.tenant_id
   AND a.code = jl.account_code
   AND jl.account_name = jl.account_code
   AND a.name <> a.code;
