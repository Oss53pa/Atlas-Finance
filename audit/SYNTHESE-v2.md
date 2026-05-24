# Atlas Finance (WiseBook ERP v3.0) — SYNTHÈSE RE-AUDIT
**Date** : 2026-05-24  
**Commit de référence** : branche `master` — post-fix lot P1/P2  
**Auditeurs** :
- **Agent 1** — Expert-comptable SYSCOHADA senior (rapport `04-audit-metier-approfondi.md`)
- **Agent 2** — Architecte logiciel senior / TypeScript expert (rapport `05-audit-architecture-code.md`)

---

## 1. Verdict global

| Périmètre | Verdict |
|-----------|---------|
| Conformité SYSCOHADA métier | **CONFORME avec conditions** |
| Architecture & sécurité | **PROD-READY WITH CONDITIONS** |
| **VERDICT GLOBAL** | **🟡 PRODUCTION AVEC CONDITIONS — P0 bloquants à résoudre** |

La dette P0 résiduelle est localisée et corrigible en < 1 journée. Le chemin `local/desktop` (DexieAdapter) est aujourd'hui le plus sûr pour un déploiement immédiat. Le chemin SaaS/Supabase nécessite encore les correctifs A-01 (search_path migration 19) et la couverture de tests SupabaseAdapter.

---

## 2. État des P0 initiaux (6 bloquants d'origine)

| ID | Titre | Statut |
|----|-------|--------|
| P0-1 | Fuite inter-tenant (RPC SECURITY DEFINER) | ✅ **CORRIGÉ** — Migration 18 + `get_user_company_id()` |
| P0-2 | Couche services fantôme (apiService stub) | ✅ **CORRIGÉ** — fail-loud + restructuration |
| P0-3 | Clôture cassée (1200/1290 → 131/139) | ✅ **CORRIGÉ + VÉRIFIÉ** — Agent 1 confirme |
| P0-4 | Immuabilité mode local (DexieAdapter) | ✅ **CORRIGÉ** — `assertPostedEntryImmutable` |
| P0-5 | Saisie 20 comptes en dur + bandeau DEBUG | ✅ **CORRIGÉ** — adapter.getAll + debug retiré |
| P0-6 | Bypass RBAC (atlas-demo-mode en prod) | ✅ **CORRIGÉ** — isDemoMode gated sessionStorage |

---

## 3. Nouveaux P0 identifiés lors du re-audit

| ID | Sévérité | Composant | Finding | Correctif |
|----|----------|-----------|---------|-----------|
| **A-01** | **P0** | `supabase/migrations/20240101000018` | Les 4 fonctions SECURITY DEFINER manquent `SET search_path = public, pg_temp` — risque d'injection search_path PostgreSQL | Migration 19 à déployer (spawn_task) |

> **Action immédiate** : créer une migration 19 qui `ALTER FUNCTION` pour ajouter `SET search_path = public, pg_temp` aux 4 fonctions. Déployée en prod avant tout trafic SaaS.

---

## 4. P1 — Majeurs (corrigés dans ce lot)

| ID | Composant | Finding | Statut |
|----|-----------|---------|--------|
| **A-02** | `SupabaseAdapter.update()` | Pas de garde immutabilité `posted` en SaaS | ✅ **CORRIGÉ** — garde ajouté (vérif statut pré-update) |
| **A-03** | `SupabaseAdapter.delete()` | Suppression physique `posted`/`validated` possible en SaaS | ✅ **CORRIGÉ** — garde statut ajouté |
| **A-04** | `carryForwardService.calculerSoldesCloture` | Brouillons inclus dans les soldes d'à-nouveaux | ✅ **CORRIGÉ** — filtre `validated\|posted` ajouté (ligne 73) |
| **A-05** | `AuthContext.isDev` | Détection dev via `VITE_APP_ENV` (runtime) au lieu de `import.meta.env.DEV` (compile-time) | ✅ **CORRIGÉ** — aligné sur `import.meta.env.DEV` |
| **F-01** | `prophet/audit/controls/*.ts` | 86/108 contrôles SYSCOHADA lisent `r.totalDebit/totalCredit` inexistants → tous = 0 | 🔶 **EN COURS** — spawn_task actif |
| **F-02** | `resultAffectationService.ts` | Réserve légale à 5 % au lieu de 10 % (OHADA art.546 AUSCGIE) | ✅ **CORRIGÉ** — 10 % + commentaire légal |
| **F-03** | `resultAffectationService.ts` | RAN créditeur sur compte 120 (regroupement) au lieu de 121 | ✅ **CORRIGÉ** — compte 121 |
| **F-04** | `affectationResultatService.ts` | Cas perte : écriture conditionnée à `reportANouveau < 0`, fragile si autre ventilation | 🔶 À revoir lors du sprint affectation |
| **F-07** | `carryForwardService` | 131/139 reporté en N+1 sans affectation préalable (résultat fantôme) | 🔶 Documenté — affectation volontairement manuelle (AG requis) |
| **F-08** | `tvaValidation.ts` | Comptes TVA français (4457) ≠ OHADA (4431/445) dans taxationService | 🔶 À corriger — plan comptable TVA à aligner OHADA |
| **F-15** | `financialStatementsService` | Double comptage conditionnel résultat (classe 13 + classes 6/7) sans garde-fou | 🔶 Garde-fou à brancher (`verifierCoherenceResultat`) |
| **F-19** | `depreciationService` (core + postingService) | Dégressif ×2 uniforme — NON conforme coefficients SYSCOHADA | ✅ **CORRIGÉ** — table 1.5/2.0/2.5/3.0 par durée |

---

## 5. P2 — Mineurs importants (non bloquants prod)

| ID | Domaine | Finding |
|----|---------|---------|
| F-05/F-07 | Clôture | Affectation non déclenchée automatiquement (intentionnel — AG) |
| F-06 | À-nouveaux | `includeResultat` avec classe '12' = code mort (résultat en 13) |
| F-09 | TVA | Exigibilité encaissement/débits non gérée (prestataires services) |
| F-11 | TVA CM | TVA Cameroun 17,5 %+CAC calculée mais non ventilée automatiquement |
| F-12 | IS | Minimum IS = 1 % par défaut ; planchers forfaitaires pays manquants |
| F-16 | Bilan étendu | `financialStatementsExtendedService` : mapping postes erroné (2182 doublé, RE inversé) |
| F-20 | Amortissement | Prorata 1ʳᵉ annuité absent en dégressif (core) |
| F-21 | Amortissement | Bascule dégressif→linéaire dans le tableau mais pas dans la dotation postée |
| F-23 | Change | Provision pour perte de change latente (476→6594/499) non générée |
| F-24 | TAFIRE | TAFIRE annoncé non réellement calculé (étape = totaux par classe) |
| A-07 | SupabaseAdapter | `rpc()` injecte toujours `p_tenant_id` (risque signature mismatch) |
| A-08 | Affectation perte | Écriture D129/C139 potentiellement déséquilibrée si ventilation partielle |

---

## 6. P3 — Dettes techniques (backlog)

| ID | Finding |
|----|---------|
| F-06 | `includeResultat` classe '12' = code mort |
| F-10 | Report crédit TVA (4449) N→N+1 non tracé |
| F-13 | HAO 87/89 dans assiette IS (à vérifier finement) |
| F-14 | Fallback IS 25 %/1 % documenté |
| F-17 | SIG 8 soldes (CAFG sans 798/865) |
| F-22 | Compte dotation 681000 en dur dans le core |
| A-09 | `atlas-tenant-id` en localStorage |
| A-10 | Legacy REST services (`api.service.ts` + 23 fichiers) toujours présents |
| A-11 | Hooks barrel — hooks morts potentiels |
| A-12 | `p4Improvements.test.ts` + `auditCorrections.test.ts` ont `@ts-nocheck` |

---

## 7. Conformités confirmées ✅

| Domaine | Détail |
|---------|--------|
| Détermination résultat | 131/139 classe 13, équilibré, Money — P0-3 VALIDÉ par Agent 1 |
| Contrepassation | Inversion D/C, reversedBy réel, Art.19, blocage double-extourne |
| Régénération à-nouveaux | Par contrepassation — Art.19 respecté |
| Balance / continuité | D=C, Actif=Passif, trous de numérotation, brouillons exclus |
| Taux IS/TVA par pays | Cohérents entre `isCalculation.ts` et `syscohada.ts` |
| Réserve légale | 10 % OHADA — `affectationResultatService.ts` et `core` ✅ |
| RAN créditeur | Compte 121 dans `affectationResultatService.ts` ✅ |
| Immuabilité Art.19 | DexieAdapter + SupabaseAdapter (post-fix) |
| Exclusion brouillons | Balance, clôture, TVA/IS, à-nouveaux (post-fix) |
| Proph3t — sécurité | Aucune clé API en dur, providers auto-détectés |
| RBAC | isDemoMode sessionStorage gated, role = 'user' par défaut DB |
| CI | tsc BLOCKING, vitest BLOCKING, @ts-nocheck guard (274) |
| Tests d'intégration | 11 tests sur DexieAdapter réel — assertions comptablement correctes |

---

## 8. Métriques qualité (post-corrections)

| Métrique | Valeur | Cible |
|----------|--------|-------|
| `tsc --noEmit` erreurs | **0** | 0 ✅ |
| Tests Vitest (run) | **757 passés, 0 échec** | 100 % ✅ |
| `@ts-nocheck` fichiers | **274** (= baseline) | ≤ 274 ✅ |
| Vulnérabilités npm (prod) | **0** | 0 ✅ |
| Sentry DSN | En place (warning si absent) | ✅ |

---

## 9. Roadmap production

### Immédiat (avant premier trafic SaaS)
1. **Migration 19** : `ALTER FUNCTION` pour ajouter `SET search_path = public, pg_temp` aux 4 fonctions SECURITY DEFINER (A-01)
2. **F-01** : corriger `r.totalDebit` → `r.debitMouvement` dans les 8 fichiers de contrôles Proph3t (spawn_task actif)
3. Recette fonctionnelle OHADA sur données de test (exercice complet : saisie → validation → clôture → états)

### Sprint suivant (< 1 semaine)
4. **F-08** : aligner `tvaValidation.ts` sur le plan comptable OHADA (supprimer références 4457/PCG français)
5. **F-15** : brancher `verifierCoherenceResultat` dans `computeBilan` pour détecter le double-comptage
6. **F-04** : revoir la logique perte dans `affectationResultatService` (rendre inconditionnelle la contrepartie 139)
7. **F-16** : corriger `financialStatementsExtendedService` mapping postes (2182 doublé, RE)
8. **A-12** : retirer `@ts-nocheck` de `p4Improvements.test.ts` + `auditCorrections.test.ts`

### Backlog (< 1 mois)
9. F-21 : Bascule dégressif→linéaire dans les dotations postées
10. F-23 : Provision pour perte de change latente à la clôture
11. F-24 : TAFIRE complet (flux investissement/financement)
12. F-09 : Exigibilité TVA encaissement/débits
13. A-09 : Dériver tenant_id du JWT Supabase, ne plus stocker en localStorage

---

## 10. Angles morts non couverts (hors périmètre audit)

1. RPCs PostgreSQL production (`generate_bilan`, `get_trial_balance`) — lignée migrations ATLAS divergente, non auditées ici
2. Mode Supabase SaaS de `getTrialBalance` — présumé même type `TrialBalanceRow` → même bug F-01
3. Provisions & dépréciations créances/stocks (491, 39, 19) — calcul dotations non audité en profondeur
4. Stocks inventaire permanent vs intermittent — variation stocks (603x) non automatisée
5. TAFIRE complet — seule CAFG vérifiée
6. Multidevise / arrondi FCFA adverse

---

*Rapport consolidé à partir des audits indépendants agents 1 & 2. Aucun fichier source modifié par les agents en lecture seule. Les corrections appliquées dans ce lot sont tracées dans le git log.*
