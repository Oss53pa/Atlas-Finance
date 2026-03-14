#!/bin/bash
# ============================================================
# SCRIPT DE DÉPLOIEMENT PRODUCTION — Atlas Finance / WiseBook
# ============================================================
# Usage: ./scripts/deploy-production.sh
# ATTENTION: Ce script déploie en PRODUCTION. Assurez-vous que
# le staging a été validé d'abord.
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_step() { echo -e "\n${BLUE}[ÉTAPE]${NC} $1"; }
log_ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}  ⚠${NC} $1"; }
log_fail() { echo -e "${RED}  ✗${NC} $1"; exit 1; }

echo ""
echo "============================================================"
echo "  ⚠️  DÉPLOIEMENT PRODUCTION — Atlas Finance"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo ""
echo "  ATTENTION: Vous êtes sur le point de déployer en PRODUCTION."
echo "  Assurez-vous que:"
echo "    ✓ Le staging a été testé et validé"
echo "    ✓ La migration Supabase a été vérifiée sur staging"
echo "    ✓ Les smoke tests sont OK"
echo ""

read -p "  Confirmer le déploiement production? (oui/NON) " CONFIRM
if [ "$CONFIRM" != "oui" ]; then
  log_fail "Déploiement annulé (tapez 'oui' pour confirmer)"
fi

# ============================================================
# ÉTAPE 1 — Vérifications
# ============================================================
log_step "1/5 — Vérifications"

BRANCH=$(git branch --show-current)
log_ok "Branche: $BRANCH"

if [ -n "$(git status --porcelain -- ':!*.tsbuildinfo')" ]; then
  log_fail "Working tree non propre — committez d'abord"
fi
log_ok "Working tree propre"

# Tests
npx vitest run 2>&1 | tail -3
log_ok "Tests passent"

# Build
pnpm run build 2>&1 | tail -3
log_ok "Build réussi"

# ============================================================
# ÉTAPE 2 — Backup base de données
# ============================================================
log_step "2/5 — Backup base de données"

BACKUP_DATE=$(date '+%Y%m%d_%H%M%S')

if command -v supabase >/dev/null 2>&1; then
  echo "  Création du backup avant migration..."
  # Note: Supabase Pro/Enterprise offre des backups automatiques
  # Pour les plans gratuits, utiliser pg_dump si accès direct
  log_warn "Vérifiez que le backup automatique Supabase est actif"
  log_warn "Ou créez un backup manuel via le dashboard Supabase"
else
  log_warn "Supabase CLI non trouvé"
  log_warn "Créez un backup manuel via https://app.supabase.com → Settings → Backups"
fi

read -p "  Backup vérifié? (o/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Oo]$ ]]; then
  log_fail "Créez un backup avant de continuer"
fi

# ============================================================
# ÉTAPE 3 — Migration Supabase Production
# ============================================================
log_step "3/5 — Migration Supabase Production"

echo ""
echo "  Migration 006 — Changements irréversibles:"
echo "    - PK settings: (key) → (tenant_id, key)"
echo "    - FK journal_lines: CASCADE → RESTRICT"
echo "    - 3 CHECK constraints sur journal_lines"
echo "    - 6 triggers de protection"
echo ""

if command -v supabase >/dev/null 2>&1; then
  read -p "  Appliquer la migration en PRODUCTION? (oui/NON) " MIGRATE_CONFIRM
  if [ "$MIGRATE_CONFIRM" = "oui" ]; then
    supabase db push 2>&1
    MIGRATION_EXIT=$?
    if [ $MIGRATION_EXIT -ne 0 ]; then
      log_fail "MIGRATION ÉCHOUÉE — Restaurez le backup!"
    fi
    log_ok "Migration production appliquée"
  else
    log_warn "Migration ignorée — à appliquer manuellement"
  fi
else
  log_warn "Appliquez la migration manuellement:"
  echo "    supabase link --project-ref <prod-project-ref>"
  echo "    supabase db push"
fi

# ============================================================
# ÉTAPE 4 — Déploiement frontend
# ============================================================
log_step "4/5 — Déploiement frontend production"

if command -v vercel >/dev/null 2>&1; then
  read -p "  Déployer sur Vercel PRODUCTION? (oui/NON) " DEPLOY_CONFIRM
  if [ "$DEPLOY_CONFIRM" = "oui" ]; then
    vercel --prod 2>&1
    log_ok "Déployé sur Vercel (production)"
  else
    log_warn "Déploiement Vercel ignoré"
  fi
else
  log_warn "Vercel CLI non trouvé — déploiement via git:"
  echo "    git push origin main"

  read -p "  Pusher vers origin/main? (oui/NON) " PUSH_CONFIRM
  if [ "$PUSH_CONFIRM" = "oui" ]; then
    git push origin main 2>&1
    log_ok "Poussé vers origin/main"
  fi
fi

# ============================================================
# ÉTAPE 5 — Vérification post-déploiement
# ============================================================
log_step "5/5 — Vérification post-déploiement"

echo ""
echo "  CHECKLIST POST-PRODUCTION:"
echo ""
echo "  [ ] Site accessible (pas de 500/502)"
echo "  [ ] Connexion utilisateur OK"
echo "  [ ] Saisie d'écriture → validation → comptabilisation"
echo "  [ ] Écriture postée non modifiable (test)"
echo "  [ ] Balance équilibrée"
echo "  [ ] Grand livre avec solde progressif"
echo "  [ ] Aucune donnée mock visible"
echo "  [ ] Vérifier les logs Supabase (pas d'erreur)"
echo "  [ ] Vérifier les métriques Vercel"
echo ""
echo "============================================================"
echo "  DÉPLOIEMENT PRODUCTION TERMINÉ"
echo "  Commit: $(git log --oneline -1)"
echo "  Date:   $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
