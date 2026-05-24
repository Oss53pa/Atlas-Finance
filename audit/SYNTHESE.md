# Synthèse d'audit pré-production — Atlas Finance (WiseBook ERP v3.0)

**Date :** 2026-05-21
**Objet :** Verdict Go / No-Go de mise en production, consolidé à partir de trois audits indépendants menés en parallèle.
**Référentiel produit :** SYSCOHADA révisé (OHADA / AUDCIF), Système Normal — *et non* le PCG français.
**Cible :** logiciel de comptabilité multi-tenant (SaaS Supabase + desktop local Dexie/Electron).

## Rapports sources
- [`01-audit-metier.md`](01-audit-metier.md) — Expert-comptable / conformité SYSCOHADA (P0=5, P1=7, P2=16, P3=3)
- [`02-audit-technique.md`](02-audit-technique.md) — Dev senior / QA / Sécurité (chiffres exécutés)
- [`03-audit-uxui.md`](03-audit-uxui.md) — UX / UI / Accessibilité (app lancée en direct)

---

## 1. VERDICT GLOBAL : **NO-GO**

Les **trois experts concluent indépendamment au NO-GO.** Atlas Finance n'est **pas prêt** pour la production en l'état.

Le projet possède un **noyau de calcul financier de bonne facture** — c'est réel et il faut le préserver : classe `Money`/Decimal.js (95,9 % couverte), chaîne d'intégrité SHA-256 (100 % couverte), validateur d'équilibre D=C robuste (`entryGuard`), triggers PostgreSQL d'immuabilité SYSCOHADA Art. 19 côté Supabase, et une couche de saisie d'écriture riche (wizard, contrôle D=C live, raccourcis clavier, verrou d'intangibilité).

Mais autour de ce noyau, l'audit révèle des **défauts bloquants convergents et corroborés** sur les trois axes :

| Axe | Verdict | Symptôme le plus grave |
|---|---|---|
| **Métier / comptable** | NO-GO | Clôture cassée : résultat imputé sur la classe 12 (RAN) au lieu de 13 → résultat absent du bilan. |
| **Technique / sécurité** | NO-GO | Fuite de données **inter-tenant** via RPC `SECURITY DEFINER` qui font confiance au client. |
| **UX / adoption** | NO-GO | Saisie inutilisable (20 comptes en dur), bandeau « DEBUG INPUT » sur chaque page, données mockées. |

Aggravant transverse : **le filet de tests est trompeur** (couverture réelle 3,46 %, adaptateur de test divergent du code de prod, CI qui n'échoue jamais). Les « tests verts » ne garantissent **rien** sur le comportement de production. La confiance pré-prod est donc structurellement faible.

---

## 2. Tableau de bord — chiffres VÉRIFIÉS (commandes exécutées)

| Indicateur | Valeur réelle | Seuil / attendu | État |
|---|---|---|---|
| Tests | **746 passés / 54 fichiers / 0 échec** | (mémoire annonçait 455) | ⚠️ verts mais non représentatifs |
| Couverture lignes | **3,46 %** | 70 % | ❌ |
| Couverture modules critiques | money 95,9 % · integrity 100 % · **contrepassation 10 %** · cession 40 % · TVA 55 % | — | ⚠️ noyau OK, périphérie non testée |
| Erreurs TypeScript | **1** … mais **`@ts-nocheck` sur 304 fichiers** | 0, typage actif | ❌ typage neutralisé |
| Lint | **4341 problèmes (346 erreurs)** dont 999 `any`, 1 `rules-of-hooks` | 0 (`--max-warnings 0`) | ❌ |
| Build | **OK** (chunk 724 kB) | < 700 kB | ⚠️ build sans `tsc` |
| `npm audit` | **7 vulns (2 HIGH)** : `vite` (fix), `xlsx` (**no fix**) | 0 high | ❌ |
| CI | `lint || true`, `tsc || true`, **0 test** | bloquante | ❌ cosmétique |

> **Note de périmètre :** l'audit technique a porté sur la branche `fix/premium-dashboard-charts` (commit `d05746c`), **pas `master`**, et l'arbre de travail comporte de nombreuses modifications non committées. L'« état courant » est donc mouvant — un gel de branche est requis avant toute campagne de correction/re-audit.

---

## 3. Convergences entre experts (corroborations fortes)

Plusieurs défauts ont été trouvés **indépendamment par deux ou trois auditeurs** — ce sont les plus fiables :

1. **`apiService` est un stub vide → états financiers SYSCOHADA renvoient du vide** : trouvé par l'audit comptable (`F5-2`, « backend Django inexistant ») **et** technique (`T-03`, 29 services concernés). Corroboré.
2. **`@ts-nocheck` sur 304 fichiers** : trouvé par UX (`UX-29`) **et** technique (`T-11`), chiffre identique. C'est la cause-racine systémique des régressions silencieuses.
3. **`create()` écrase l'`id` fourni** → divergence test/prod et contrepassation cassée : comptable (`F2-4`) **et** technique (`T-10/T-16`).
4. **`tranprimary` (Tailwind cassé) ×158 dans 100 fichiers** : UX (`UX-06`) **et** technique (`T-24`), chiffre identique.
5. **`console.log [DEBUG]` / bandeau DEBUG dans le layout de prod** : UX (`UX-30`) **et** technique (`T-25`).
6. **Immuabilité absente en mode local Dexie** : comptable (`F2-1`) **et** technique (`T-04/§3.5`).

**Divergence tranchée par re-vérification directe :** l'audit UX a reproduit en direct un crash global imputé à `RBACGuard` (Rules of Hooks). **Vérification :** le code actuel de `RBACGuard.tsx:66-100` est **correct** (hooks avant tout `return`) — ce point a été corrigé. La violation `rules-of-hooks` restante signalée par ESLint est en réalité dans **`src/components/tasks/TasksModule.tsx:41`** : un `useState` placé **hors** du composant (le composant commence ligne 42) → **crash garanti à l'ouverture du module Tâches**. C'est ce défaut-là qu'il faut corriger (P1), pas RBACGuard. Le crash global observé par l'UX provenait d'une version antérieure du fichier ; **à re-vérifier sur le build courant**.

---

## 4. Top 5 bloquants P0 (à corriger AVANT toute prod)

| # | Bloquant | Domaine | Pourquoi c'est P0 | Réf. | Effort |
|---|---|---|---|---|---|
| **P0-1** | **Fuite de données inter-tenant.** Les RPC `get_trial_balance` / `get_account_balance` (`SECURITY DEFINER`) et `import_exchange_rates` font confiance au `p_tenant_id` envoyé par le client (lu dans `localStorage`). Un utilisateur authentifié peut lire/écrire la comptabilité d'un **autre client**. | Sécurité (SaaS) | Violation de confidentialité majeure, contournement du RLS. Inacceptable pour un produit comptable multi-tenant. | T-01, T-02 ; `migrations/...000009:146,188`, `...000012:12` ; `SupabaseAdapter.ts:236,247` | **M** (réécrire les RPC pour utiliser `get_user_company_id()`, + tests d'isolation) |
| **P0-2** | **Couche services fantôme.** `apiService.get/post/...` renvoie `{results:[],count:0}` sans appel réseau ; **29 services** en dépendent, dont **les états financiers SYSCOHADA** (`financial_statements.service.ts`, backend Django inexistant). Selon le câblage UI, bilan/CR/dashboards affichent du **vide silencieux**. | Fonctionnel / métier | Le cœur du produit (états financiers) peut être non fonctionnel sans aucune erreur visible. | T-03, F5-2 ; `api.service.ts:280-298` ; `financial_statements.service.ts` | **L** (rebrancher sur `financialStatementsExtendedService` / DataAdapter, ou supprimer le code mort) |
| **P0-3** | **Clôture annuelle cassée + non conforme.** La détermination du résultat impute sur **1200/1290** (classe 12 « Report à nouveau ») alors que bilan, affectation et contrôles utilisent **131/139** (classe 13). Résultat absent du bilan, jamais affecté, soldes fantômes permanents ; l'écriture contourne le contrôle de compte (`skipSyncValidation`). | Métier / comptable | Le résultat de l'exercice est faux et n'apparaît pas au bilan. Défaut comptable rédhibitoire. | F4-1 ; `closureService.ts:491-508,528` | **M** (corriger les comptes de contrepartie + tests détermination→affectation) |
| **P0-4** | **Aucune immuabilité ni verrou de période en mode LOCAL (Dexie/Electron).** `create/update/delete` génériques ne valident ni l'équilibre, ni le verrou de période, ni le statut `posted`. Pire : suppression **physique** d'écritures à-nouveau (`carryForwardService.ts:225-236`). La protection n'existe **que** côté Supabase. + En SaaS, `saveJournalEntry` n'insère pas les `journal_lines` (écritures sans lignes). | Métier + Données | Violation frontale de l'intangibilité SYSCOHADA (Art. 19) sur tout le build desktop ; écritures incomplètes en SaaS. | F2-1, F4-2, T-04 ; `DexieAdapter.ts:244-297` ; `SupabaseAdapter.ts:270-282` | **Élevé** (chemin d'écriture verrouillé unique + verrous de période + insertion des lignes SaaS) |
| **P0-5** | **Saisie d'écriture inutilisable + image de débogage.** Le sélecteur de compte est figé à **~20 comptes en dur** (pas le plan SYSCOHADA réel) → impraticable en compta réelle. Et un **bandeau « DEBUG INPUT » jaune** s'affiche au-dessus de **chaque page** authentifiée. | UX / adoption | Aucun comptable ne peut saisir une vraie écriture ni faire confiance à un logiciel affichant un champ DEBUG. | UX-21 (`JournalEntryModal.tsx:110-130`), UX-30 (`ModernDoubleSidebarLayout.tsx:948-958`) | **M** (câbler au plan en base) + **XS** (retirer le DEBUG) |

### Autres P0 à traiter dans le même lot
- **P0-6 — Bypass RBAC en production** via `sessionStorage 'atlas-demo-mode'='1'` (accès UI admin pour n'importe qui) + élévation de privilèges via `user_metadata` modifiable. Réf. T-05, T-06 (`RBACGuard.tsx:69,118,126`). Effort **S**. *(Conditionner strictement à `import.meta.env.DEV`.)*

> **Au total : 6 bloquants P0** (5 mis en avant + 1). Aucune mise en production n'est défendable tant qu'ils subsistent.

---

## 5. Top 10 risques P1 (à corriger sous 30 jours)

| # | Risque | Domaine | Réf. | Effort |
|---|---|---|---|---|
| P1-1 | **États financiers incluent les brouillons** (`getBalanceByAccount` sans filtre de statut ; dotations d'amortissement créées en `draft`) → bilan/CR potentiellement faux et incohérents avec la balance de vérification. | Métier | F5-1 ; `DexieAdapter.ts:360-381`, `postingService.ts:188` | M |
| P1-2 | **Filet de tests illusoire** : couverture 3,46 % et adaptateur de test divergent du code réel (gère l'`id` et saute la validation contrairement aux vrais adaptateurs). Établir des tests d'intégration sur les chemins comptables critiques. | Tests | T-09, T-10 | L |
| P1-3 | **Contrepassation cassée** : `create()` écrase l'`id` → `reverseEntry` référence un `id` inexistant, `reversedBy` pointe dans le vide ; et le bouton « Contrepassation » de l'UI n'a aucun dialogue rendu. La voie légale du « no-delete » est inopérante. | Métier + UX | F2-4, T-16 ; UX-03 | M |
| P1-4 | **CI non bloquante et sans tests** (`lint || true`, `tsc || true`, 0 `vitest`) + `ci-cd.yml` obsolète référençant un `backend/` Django inexistant. Aucune régression n'est détectée. | CI/CD | T-07, T-08 ; `.github/workflows/` | S |
| P1-5 | **Migrations sans rollback + sources SQL multiples divergentes** (`migrations/` vs `combined_*.sql`) + tables dupliquées (migr. 13/14). `supabase db push` direct en prod. Risque d'incident DB irréversible. | CI/CD / DB | T-14 | M |
| P1-6 | **Numérotation des pièces incohérente** (formats 2 vs 3 segments) → le contrôle de continuité compare des dates à des numéros ; 3 générateurs concurrents sans verrou (risque de collision). | Métier | F2-3 ; `trialBalanceService.ts:170-179` | M |
| P1-7 | **TVA / IS calculés en float natif et incluant les brouillons** ; fallback IS silencieux, taux/minimum codés en dur. Déclarations fiscales potentiellement fausses. | Métier | F6-1, F6-3 ; `taxationService.ts:62,74,172` | M |
| P1-8 | **Dépendances HIGH** : `vite` (fix dispo) et `xlsx@0.18.5` (Prototype Pollution + ReDoS, **aucun fix** — sur fichiers Excel importés par l'utilisateur). Migrer vers `exceljs`/SheetJS officiel. | Sécurité | T-13 | M |
| P1-9 | **Observabilité aveugle en prod** : Sentry n'est initialisé que si `VITE_SENTRY_DSN` est défini, absent de `.env.production`. Pas d'alerting. | Observabilité | T-15 ; `main.tsx:9-10` | S |
| P1-10 | **Écrans clés non câblés / mockés** : liste des écritures vide avec badge « 8 » mensonger, validation factice, saisie pré-remplie de fausses lignes à chaque ouverture, `TasksModule.tsx:41` (`useState` hors composant → crash du module Tâches). | UX / Tech | UX-02, UX-20 ; `EntriesPage.tsx`, `JournalEntryModal.tsx:192-196` ; `TasksModule.tsx:41` | M |

### P1 supplémentaires importants (au-delà du top 10)
- **`@ts-nocheck` ×304 + 999 `any`** (cause-racine, T-11/UX-29) — réactiver le typage progressivement (L).
- **`tranprimary` ×158** (icônes/transforms cassés partout, UX-06/T-24) — replace global (M).
- **Accessibilité débranchée** (`AccessibilityProvider` jamais monté, UX-10) + **contrastes AA échoués** (`text-tertiary` 3,4:1, amber-texte 2,5:1, UX-11) (S+S).
- **Double classe `Money`** (src vs core) divergente (F10-1) ; **plan comptable résultat-perte dupliqué** 129000 vs 139 (F1-2).
- **Verrouillage de clôture en `validated`** (réversible) au lieu de `posted` (F4-3).

---

## 6. Backlog P2 / P3 (améliorations — après stabilisation)

Détail complet dans les trois rapports. Principaux thèmes :

- **Comptable (P2/P3)** : mappings de postes Bilan/CR divergents (3 sources), journal CA mappé sur le 531 (CCP) au lieu de 57x, dégressif fiscal en ×2 fixe au lieu des coefficients OHADA, écarts de conversion latents de clôture non gérés, FEC au format **français** présenté comme conformité (non requis OHADA), pièces justificatives non obligatoires, séparation des tâches non imposée par le code. *(Réf. F1-1, F3-2, F10-3, F7-2, F8-1, F2-7, F9-1.)*
- **Technique (P2)** : aucune virtualisation des grandes listes + lectures O(n) en mémoire, `transaction()` SaaS no-op (pas d'atomicité multi-tables côté client), mode `hybrid` jamais câblé (dégrade en local, syncQueue en mémoire), absence d'en-têtes de sécurité HTTP (`vercel.json`), hash local sans ancre externe, duplication massive de services (treasury ×4, tiers ×6…), worktrees `.claude/` scannés par Vitest. *(Réf. T-17 à T-23.)*
- **UX (P2/P3)** : modal de saisie hors-thème (bleu générique vs Petrol Cream), pas d'autosave / garde « modifications non enregistrées », devise incohérente FCFA vs XAF, utilitaires `dark:` morts (pas de classe `.dark`), cibles tactiles < 44 px, spinners au lieu de skeletons, animations infinies sans reduce-motion, iconographie mixte lucide/heroicons. *(Réf. UX-07, UX-22, UX-25, UX-12, UX-14, UX-18, UX-31, UX-08.)*

---

## 7. Estimation d'effort et chemin critique

Barème : XS < 1 h · S ≈ ½ j · M ≈ 1-3 j · L > 3 j (souvent 1-3 sem.).

| Lot | Contenu | Effort estimé |
|---|---|---|
| **P0 — blocage prod** | P0-1 (M) + P0-2 (**L**, le plus long : tri/rebranchement des 29 services) + P0-3 (M) + P0-4 (**Élevé**, refonte du chemin d'écriture local + lignes SaaS) + P0-5 (M+XS) + P0-6 (S) | **≈ 4 à 6 semaines** (2 développeurs) |
| **P1 — sous 30 j** | Filtrage brouillons, fix contrepassation/`id`, CI réelle + tests d'intégration critiques, migrations réversibles, numérotation, TVA/IS, deps, Sentry, écrans câblés | **≈ 3 à 4 semaines** |
| **Durcissement & QA** | Réactivation typage (par lots), `tranprimary`, accessibilité + contrastes, campagne de tests E2E Playwright, **tests utilisateurs comptables (3-5 experts OHADA)** | **≈ 2 à 3 semaines** |
| **Re-audit + UAT** | Re-vérification indépendante des P0/P1 corrigés sur branche gelée, recette métier | **≈ 1 à 2 semaines** |

Les **deux pôles longs** (« long poles ») sont **P0-2** (rebranchement de la couche services) et **P0-4** (immuabilité/transactions en mode local) — ce sont eux qui dimensionnent le planning.

---

## 8. Recommandation de date de mise en production

**Aucune mise en prod avant correction et re-vérification des 6 bloquants P0.**

- **Estimation réaliste : 8 à 11 semaines** à partir d'aujourd'hui (2026-05-21), soit une cible **fin juillet → mi-août 2026**, **conditionnée** à :
  1. les 6 P0 corrigés **et** re-vérifiés par un audit indépendant sur **branche gelée** ;
  2. les 10 P1 traités (en particulier : tests d'intégration réels sur les chemins comptables, CI bloquante, migrations réversibles) ;
  3. une recette métier (UAT) par de vrais experts-comptables OHADA sur les parcours saisie → clôture → états.
- **Go-conditionnel possible plus tôt UNIQUEMENT** pour un périmètre restreint (ex. mode SaaS seul, sans le mode local desktop ; ou pilote fermé encadré) **si et seulement si** P0-1, P0-2, P0-3, P0-4(SaaS), P0-5, P0-6 sont levés et un monitoring (Sentry) actif. Le mode **local/desktop** ne devrait pas être mis en prod tant que P0-4 (immuabilité Dexie) n'est pas résolu.

> ⚠️ **Avertissement sur la confiance :** tant que la couverture de tests reste à 3,46 % avec un adaptateur de test divergent, **toute affirmation « c'est corrigé » devra être prouvée par des tests d'intégration sur le code de production**, pas par la suite actuelle. C'est la condition de crédibilité de la prochaine itération.

---

## 9. Angles morts (non vérifiables sans accès supplémentaire)

Communs aux trois audits :
- **Base de données de production réelle** : `pg_policies` effectives, chiffrement RGPD réel (`soft_delete_encryption` migr. 17), comportement runtime des triggers, RPC réellement déployées (drift SQL).
- **Charge / volumétrie réelle** : O(n) en mémoire et absence de virtualisation non éprouvés sur 10k+ écritures.
- **Pentest applicatif** : flux JWT, buckets storage, Edge Functions (`ai-proxy`, `atlas-sso`) non testés en intrusion.
- **E2E Playwright** : 5 specs présentes mais **non exécutées** ; à lancer une fois le P0-5/UX-01 levés.
- **Calculs métier en exécution réelle** : TAFIRE, SIG, prorata temporis d'amortissement, réévaluation de change de clôture — typés mais non exécutés sur jeu d'écritures réel.
- **Conformité fiscale réelle** : formulaires CERFA/OHADA, exigibilité, télédéclaration — hors périmètre code.
- **Tests utilisateurs réels & lecteurs d'écran** (NVDA/JAWS/VoiceOver) : non réalisés — à mener sur 3-5 experts-comptables OHADA.
- **Câblage UI exact** des services : impossible de garantir partout si l'UI consomme le stub `apiService` (vide) ou le service DataAdapter réel — à tracer écran par écran.

---

## 10. Points forts à préserver (ne pas casser pendant les corrections)

- `Money` / Decimal.js — calculs monétaires précis, 95,9 % couverts.
- `integrity.ts` — chaîne de hash SHA-256, 100 % couverte.
- `entryGuard.safeAddEntry` — validations métier SYSCOHADA solides (équilibre Money, doublon de pièce, contrôle caisse, hash).
- Triggers PostgreSQL d'intégrité (équilibre DEFERRABLE, immuabilité Art. 19, blocage période close, `audit_logs` immuable) — **excellents, mais SaaS uniquement**.
- RLS de base présent sur les tables tenant ; `.env` non commité ; **aucune clé `service_role` côté client** ; DOMPurify sur les 2 injections HTML ; Sentry `beforeSend` qui purge les montants.
- UX : verrou d'intangibilité dans le modal de saisie, wizard D=C live + raccourcis clavier, Error Boundary FR sans fuite de stack en prod, formats monétaires fr-FR corrects, vocabulaire métier juste (Débit/Crédit, Lettrage, Report à nouveau), DataTable complet, design system « Petrol Cream » cohérent.

---

*Synthèse établie à partir de trois audits indépendants exécutés en parallèle (lecture de code + exécution réelle de tests/lint/build/`npm audit` + lancement de l'application). Divergences entre auditeurs tranchées par re-vérification directe du code (RBACGuard / TasksModule). Aucun fichier source n'a été modifié au cours de l'audit.*
