#!/bin/bash
# ============================================================
# SCRIPT DE DÉPLOIEMENT STAGING — Atlas Finance / WiseBook
# ============================================================
# Usage: ./scripts/deploy-staging.sh
# Prérequis: supabase CLI, pnpm, accès au projet Supabase staging
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_step() { echo -e "\n${BLUE}[ÉTAPE]${NC} $1"; }
log_ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}  ⚠${NC} $1"; }
log_fail() { echo -e "${RED}  ✗${NC} $1"; exit 1; }

echo ""
echo "============================================================"
echo "  DÉPLOIEMENT STAGING — Atlas Finance"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo ""

# ============================================================
# ÉTAPE 0 — Vérifications préalables
# ============================================================
log_step "0/7 — Vérifications préalables"

# Vérifier qu'on est sur la bonne branche
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "master" ] && [ "$BRANCH" != "main" ] && [ "$BRANCH" != "develop" ]; then
  log_warn "Branche actuelle: $BRANCH (attendu: master, main ou develop)"
  read -p "  Continuer quand même? (o/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    log_fail "Déploiement annulé"
  fi
fi
log_ok "Branche: $BRANCH"

# Vérifier que le working tree est propre
if [ -n "$(git status --porcelain -- ':!*.tsbuildinfo')" ]; then
  log_warn "Des modifications non committées existent:"
  git status --short -- ':!*.tsbuildinfo'
  read -p "  Continuer quand même? (o/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    log_fail "Committez vos modifications d'abord"
  fi
else
  log_ok "Working tree propre"
fi

# Vérifier les outils requis
command -v pnpm >/dev/null 2>&1 || log_fail "pnpm n'est pas installé"
log_ok "pnpm disponible"

command -v npx >/dev/null 2>&1 || log_fail "npx n'est pas installé"
log_ok "npx disponible"

# ============================================================
# ÉTAPE 1 — Tests
# ============================================================
log_step "1/7 — Exécution des tests Vitest"

npx vitest run --reporter=verbose 2>&1 | tail -5
VITEST_EXIT=$?

if [ $VITEST_EXIT -ne 0 ]; then
  log_fail "Tests échoués — déploiement annulé"
fi
log_ok "Tous les tests passent"

# ============================================================
# ÉTAPE 2 — Build TypeScript
# ============================================================
log_step "2/7 — Vérification TypeScript + Build Vite"

npx tsc --noEmit --project tsconfig.app.json 2>&1 | tail -5
TSC_EXIT=${PIPESTATUS[0]}

if [ $TSC_EXIT -ne 0 ]; then
  log_warn "Erreurs TypeScript détectées (non bloquant pour le build Vite)"
fi

pnpm run build 2>&1 | tail -10
BUILD_EXIT=$?

if [ $BUILD_EXIT -ne 0 ]; then
  log_fail "Build échoué — déploiement annulé"
fi
log_ok "Build réussi"

# ============================================================
# ÉTAPE 3 — Migration Supabase (staging)
# ============================================================
log_step "3/7 — Migration Supabase"

echo ""
echo "  La migration 006 contient des changements CRITIQUES:"
echo "    - CHECK constraints sur journal_lines (debit >= 0, credit >= 0)"
echo "    - Trigger équilibre D=C (DEFERRED)"
echo "    - Trigger immutabilité posted (SYSCOHADA Art. 19)"
echo "    - ON DELETE RESTRICT (remplace CASCADE)"
echo "    - RLS sur profiles (empêche changement company_id)"
echo "    - PK settings (tenant_id, key) — remplace (key)"
echo "    - Trigger protection audit_logs"
echo "    - Table periodes_comptables + trigger blocage"
echo "    - Table journaux + trigger numérotation séquentielle"
echo "    - Table lettrages"
echo "    - Colonnes OHADA sur third_parties (rccm, etc.)"
echo "    - RPC validate_journal_entry, post_journal_entry, apply_lettrage"
echo "    - Fix get_dashboard_kpis (trésorerie)"
echo ""

# Vérifier si Supabase CLI est disponible
if command -v supabase >/dev/null 2>&1; then
  echo "  Supabase CLI détecté."
  read -p "  Appliquer la migration sur le projet Supabase lié? (o/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Oo]$ ]]; then
    echo ""
    echo "  ⚡ Application de la migration..."
    supabase db push 2>&1
    MIGRATION_EXIT=$?
    if [ $MIGRATION_EXIT -ne 0 ]; then
      log_fail "Migration Supabase échouée — VÉRIFIEZ LES DONNÉES EXISTANTES"
    fi
    log_ok "Migration Supabase appliquée"
  else
    log_warn "Migration Supabase ignorée — à appliquer manuellement"
  fi
else
  log_warn "Supabase CLI non trouvé — migration à appliquer manuellement:"
  echo "    supabase link --project-ref <your-project-ref>"
  echo "    supabase db push"
fi

# ============================================================
# ÉTAPE 4 — Vérification post-migration
# ============================================================
log_step "4/7 — Vérification post-migration"

echo ""
echo "  TESTS MANUELS À EFFECTUER APRÈS MIGRATION:"
echo ""
echo "  1. Trigger équilibre D=C:"
echo "     INSERT INTO journal_lines (entry_id, account_code, debit, credit, tenant_id)"
echo "     VALUES ('<entry_id>', '411000', 1000, 0, '<tenant_id>');"
echo "     -- Doit échouer: 'Écriture déséquilibrée'"
echo ""
echo "  2. Trigger immutabilité posted:"
echo "     UPDATE journal_entries SET description = 'test'"
echo "     WHERE id = '<posted_entry_id>';"
echo "     -- Doit échouer: 'Modification interdite (SYSCOHADA Art. 19)'"
echo ""
echo "  3. Trigger blocage période close:"
echo "     -- Clôturer un exercice, puis tenter un INSERT"
echo "     -- Doit échouer: 'Saisie impossible : exercice clôturé'"
echo ""
echo "  4. RLS profiles:"
echo "     -- Tenter de changer company_id via API"
echo "     -- Doit échouer silencieusement (RLS violation)"
echo ""
echo "  5. Audit logs immuables:"
echo "     DELETE FROM audit_logs WHERE id = '<any_id>';"
echo "     -- Doit échouer: 'Le journal d'audit est immuable'"
echo ""

read -p "  Appuyer sur Entrée pour continuer..." -r

# ============================================================
# ÉTAPE 5 — Déploiement frontend (Vercel)
# ============================================================
log_step "5/7 — Déploiement frontend"

if command -v vercel >/dev/null 2>&1; then
  read -p "  Déployer sur Vercel staging? (o/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Oo]$ ]]; then
    vercel --prod=false 2>&1
    log_ok "Déployé sur Vercel (staging)"
  else
    log_warn "Déploiement Vercel ignoré"
  fi
else
  log_warn "Vercel CLI non trouvé — déploiement via git push:"
  echo "    git push origin $BRANCH"
  echo "    (GitHub Actions déploiera automatiquement si configuré)"

  read -p "  Pusher vers origin/$BRANCH? (o/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Oo]$ ]]; then
    git push origin "$BRANCH" 2>&1
    log_ok "Poussé vers origin/$BRANCH"
  else
    log_warn "Push ignoré"
  fi
fi

# ============================================================
# ÉTAPE 6 — Smoke tests
# ============================================================
log_step "6/7 — Smoke tests (manuels)"

echo ""
echo "  CHECKLIST SMOKE TEST STAGING:"
echo ""
echo "  [ ] Page d'accueil se charge sans erreur console"
echo "  [ ] Connexion utilisateur fonctionne"
echo "  [ ] Dashboard comptabilité affiche des données (ou état vide propre)"
echo "  [ ] Plan comptable affiche les comptes depuis la DB"
echo "  [ ] Saisie d'écriture fonctionne (créer un brouillon)"
echo "  [ ] Validation d'écriture fonctionne (brouillon → validé)"
echo "  [ ] Balance de vérification exclut les brouillons"
echo "  [ ] Grand livre affiche le solde progressif correct"
echo "  [ ] Module Clients affiche les tiers depuis la DB"
echo "  [ ] Module Fournisseurs affiche les tiers depuis la DB"
echo "  [ ] Lettrage fonctionne (sélection + application)"
echo "  [ ] OCR affiche le bandeau 'en cours de déploiement'"
echo "  [ ] Signature affiche le bandeau 'en cours d'intégration'"
echo "  [ ] Pas de données fictives visibles nulle part"
echo "  [ ] Pas d'erreur 500 / erreur réseau"
echo ""

# ============================================================
# ÉTAPE 7 — Résumé
# ============================================================
log_step "7/7 — Résumé du déploiement"

echo ""
echo "============================================================"
echo "  DÉPLOIEMENT STAGING TERMINÉ"
echo "============================================================"
echo ""
echo "  Branche:     $BRANCH"
echo "  Commit:      $(git log --oneline -1)"
echo "  Date:        $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "  Migration:   20240101000006_integrity_triggers.sql"
echo "  Tables:      journaux, periodes_comptables, lettrages (+3)"
echo "  Triggers:    6 (équilibre, immutabilité, période, séquence, audit)"
echo "  RPC:         3 (validate_entry, post_entry, apply_lettrage)"
echo "  Contraintes: 3 CHECK + FK RESTRICT"
echo ""
echo "  PROCHAINES ÉTAPES:"
echo "    1. Effectuer les smoke tests ci-dessus"
echo "    2. Valider avec l'équipe"
echo "    3. Si OK → déployer en production:"
echo "       ./scripts/deploy-production.sh"
echo "       ou: git merge develop → main + push"
echo ""
echo "============================================================"
