# Audit de conformité comptable et financière — Atlas Finance (WiseBook ERP v3.0)

**Domaine audité :** Conformité comptable et financière (SYSCOHADA révisé)
**Date :** 2026-05-21
**Auditeur :** Expert-comptable / auditeur financier senior (audit indépendant pré-production)
**Périmètre :** Code source `src/`, `packages/{core,data,shared}`, `supabase/migrations/`
**Méthode :** Lecture du code, exécution ciblée de tests Vitest. Distinction explicite VÉRIFIÉ / SUPPOSÉ.

---

## 1. Résumé exécutif — Verdict : **NO-GO (conditionnel)**

Le socle comptable est ambitieux et globalement bien pensé sur le papier : référentiel SYSCOHADA révisé correctement modélisé (classes 1-9, postes bilan/CR, journaux obligatoires, taux par pays OHADA), classe `Money`/Decimal.js pour les calculs, chaîne de hash SHA-256, validateur d'équilibre D=C robuste, contrepassation conforme à l'art. 19, et — point fort majeur — des **triggers PostgreSQL d'immuabilité côté Supabase**. Mais l'audit révèle **3 bloquants P0** qui interdisent la mise en production en l'état :

1. **Cassure fonctionnelle de la clôture annuelle** : la détermination du résultat impute le résultat aux comptes **1200/1290** (sous-comptes de la classe 12 « Report à nouveau ») alors que tout le reste de l'application (bilan, affectation, contrôles) lit/écrit le résultat sur **131/139** (classe 13). Conséquence : résultat invisible au bilan, jamais affecté, soldes fantômes permanents. **Non conforme et faux.**
2. **Divergence test/production sur l'identité des écritures** : les adaptateurs réels (`DexieAdapter`, `SupabaseAdapter`) écrasent systématiquement l'`id` fourni par un `crypto.randomUUID()`, alors que l'adaptateur de test le conserve. `safeAddEntry` et `reverseEntry` retournent/référencent donc des `id` qui n'existent pas en base en production. **La suite de tests (455 tests verts) donne une fausse assurance.**
3. **Aucune immuabilité ni verrou de période en mode local (Dexie/Electron)** : `create/update/delete` génériques ne valident ni l'équilibre, ni le verrou de période, ni le statut `posted`. La suppression pure d'écritures (à-nouveaux) est même implémentée. La protection n'existe QUE côté Supabase.

S'ajoutent des défauts P1 (états financiers incluant les brouillons, numérotation des pièces non continue/incohérente, écritures FX sans hash ni numéro, double classe `Money`) qui doivent être traités avant toute production.

---

## 2. Référentiel détecté et périmètre

**VÉRIFIÉ — Référentiel : SYSCOHADA révisé (AUDCIF / OHADA), Système Normal.**

- `packages/shared/src/constants/syscohada.ts` : postes Bilan Actif/Passif (codes AD…BP, CA…DK), postes Compte de résultat (TA…RS), `CLASSES_SYSCOHADA` 1-9 avec `normalBalance` et `type` (bilan/gestion/special/analytique), `JOURNAUX_OBLIGATOIRES` (AC, VE, BQ, CA, OD, AN, CL), `TAUX_PAR_PAYS` (17 pays OHADA, TVA + IS). Source citée : « Acte uniforme OHADA (AUDCIF), annexe B » (`syscohada.ts:5`).
- Architecture monorepo confirmée : `packages/core` (logique pure : `Money`, ratios, amortissements, affectation, carry-forward), `packages/data` (3 adaptateurs), `packages/shared`. Code React partagé dans `src/`.
- Couche données : `DataAdapter` + `DexieAdapter` (IndexedDB local), `SupabaseAdapter` (PostgreSQL SaaS), `HybridAdapter`. 17 migrations PostgreSQL présentes (`supabase/migrations/`).
- `Money` (`src/utils/money.ts`) enrobe Decimal.js (precision 20, ROUND_HALF_UP). Intégrité : SHA-256 chaîné (`src/utils/integrity.ts`).

**Note de contexte réglementaire :** le **FEC** (Fichier des Écritures Comptables) implémenté (`src/services/export/fecExportService.ts`) est le format **français** (art. A.47 A-1 du LPF, 18 colonnes, SIREN). **SYSCOHADA/OHADA n'impose PAS ce FEC.** Voir Thème 8.

---

## 3. Findings par thème

### Thème 1 — Plan comptable

**[F1-1] P2 — Mappings de postes Bilan/CR divergents (3 sources de vérité concurrentes).**
VÉRIFIÉ. Les codes/comptes des postes bilan diffèrent entre :
- la constante canonique `packages/shared/src/constants/syscohada.ts:12-70` (ex. `AH: Terrains`, `AI: Bâtiments`, `AK: Matériel`, `AN: Titres de participation`) ;
- l'implémentation réelle des états `src/services/financialStatementsExtendedService.ts:80-101` (ex. `AJ: Terrains`, `AK: Bâtiments`, `AN: Matériel de transport`, `AQ: Titres de participation`).
Les libellés et l'affectation comptes→postes ne concordent pas. Risque : présentation du bilan non conforme aux codes officiels SYSCOHADA selon la source utilisée.

**[F1-2] P1 — Compte de résultat « perte » dupliqué et incohérent dans le plan comptable.**
VÉRIFIÉ. `src/services/accounting/planComptableService.ts:288` définit `129000 « Résultat de l'exercice (perte) »` (normalBalance debit). Or **129** est en SYSCOHADA le « Report à nouveau débiteur », PAS le résultat-perte (qui est **139**). Le référentiel `src/data/syscohada-referentiel.ts:187` et `src/data/planComptable.ts:19` définissent correctement `139 « Résultat net : perte »`. Coexistence de deux comptes contradictoires pour le résultat déficitaire.

**[F1-3] VÉRIFIÉ (point fort) — Structure des classes et comptes auxiliaires.**
`CLASSES_SYSCOHADA` (`syscohada.ts:152-162`) correcte : 1-5 bilan, 6-7 gestion, 8 spéciaux, 9 analytique, avec sens normal. Les comptes de tiers (auxiliaires) sont gérés via `thirdPartyCode`/`thirdPartyName` au niveau ligne (`DBJournalLine`), repris dans le FEC (`CompAuxNum/CompAuxLib`).

---

### Thème 2 — Écritures comptables (équilibre, immuabilité, numérotation, pièces)

**[F2-1] P0 — Aucune immuabilité ni verrou de période en mode LOCAL (Dexie/Electron).**
VÉRIFIÉ. Les méthodes génériques `DexieAdapter.create/update/delete` (`packages/data/src/adapters/DexieAdapter.ts:244-297`) :
- n'appellent JAMAIS `assertPeriodOpen` (le verrou de période n'existe que dans `saveJournalEntry`, ligne 396, qui n'est pas le chemin utilisé par le guard) ;
- ne valident pas l'équilibre D=C ;
- n'opposent aucune protection au statut `posted`.
Une écriture comptabilisée peut donc être modifiée ou supprimée en mode local. Pire, `src/services/cloture/carryForwardService.ts:225-236` (`supprimerCarryForward`) **supprime physiquement** des écritures de journal (`adapter.delete('journalEntries', …)`), ce qui viole frontalement l'immuabilité SYSCOHADA (art. 19). La protection robuste existe uniquement côté Supabase (voir F2-2).

**[F2-2] VÉRIFIÉ (point fort) — Immuabilité serveur côté Supabase.**
`supabase/migrations/20240101000006_integrity_triggers.sql` : trigger `protect_posted_entries` bloque UPDATE/DELETE d'une écriture `posted` (lignes 51-73), trigger `validate_entry_balance` impose ΣD=ΣC (lignes 25-46), `trg_block_closed_period` bloque la saisie en période close (lignes 105-113), `audit_logs` immuable (lignes 120-129), `ON DELETE RESTRICT` sur `journal_lines` (ligne 91). **MAIS** : ces protections ne couvrent PAS le mode local, et `protect_posted_entries` ne contrôle que `journal/date/entry_number/label/status` au niveau entête — la modification des lignes d'une écriture `posted` n'est pas explicitement bloquée au niveau `journal_lines`.

**[F2-3] P1 — Numérotation des pièces incohérente et non continue.**
VÉRIFIÉ. Coexistence de formats incompatibles :
- saisie utilisateur / contrepassation : `XX-000123` (2 segments, `journalEntryValidator.ts:209-224`, `reversalService.ts:26-36`) ;
- écritures système : `AMORT-20250101-001`, `AN-20250101-001`, `CL-RES-<code>` (3 segments, `postingService.ts:43-46`, `carryForwardService.ts:179`, `closureService.ts:518`).
Conséquence directe : le contrôle de continuité des numéros (`trialBalanceService.ts:170-179`) parse `entryNumber.split('-')[1]`, qui vaut la **date** (`20250101`) pour les écritures système — il compare des dates comme des numéros de séquence, produisant des « trous » fantômes et invalidant le contrôle de continuité (exigence SYSCOHADA). En outre, trois fonctions `getNextPieceNumber` distinctes co-existent avec des logiques de parsing différentes (`journalEntryValidator.ts:209`, `reversalService.ts:26`, et l'UI), sans verrou de concurrence — risque de collision de numéros.

**[F2-4] P0/P1 — Divergence test/production sur l'identité (`id`) des écritures.**
VÉRIFIÉ. `DexieAdapter.create` (`:245-246`) fait `const id = crypto.randomUUID(); const record = { ...data, id }` — il **écrase** l'`id` fourni. Idem `SupabaseAdapter.create` (`:154`). Or `safeAddEntry` construit `finalEntry` avec un `id` explicite puis `return finalEntry.id` (`entryGuard.ts:104-116`) : **l'`id` retourné n'est pas celui stocké**. `reverseEntry` (`reversalService.ts:57-107`) crée la contrepassation avec `id: reversalId`, marque l'originale `reversedBy: reversalId`, puis fait `getById('journalEntries', reversalId)` (ligne 106) — qui renvoie `undefined` en production (l'id réel diffère), et `reversedBy` pointe vers un id inexistant. **L'adaptateur de TEST conserve l'id** (`src/test/createTestAdapter.ts:51` : `const id = data.id || crypto.randomUUID()`), donc les 455 tests passent alors que la production est cassée. C'est une non-régression illusoire : à corriger en priorité (aligner les adaptateurs réels sur `data.id ?? randomUUID()`).

**[F2-5] P1 — L'édition d'écriture de `JournalsPage` est un stub non persistant + équilibre vérifié en float natif.**
VÉRIFIÉ. `src/pages/accounting/JournalsPage.tsx` : `handleSaveEntry` (`:374-414`) vérifie l'équilibre via `parseFloat` et `totalDebit !== totalCredit` (`:390`, égalité stricte float, sans `Money`) puis **ne persiste rien** (« Pour le moment, on simule la sauvegarde », `:396`) — il affiche seulement un toast de succès (`:413`). Coexistence avec le bon chemin `JournalEntryModal` (voir F2-6). Risque de confusion utilisateur et de fausse impression de sauvegarde.

**[F2-6] VÉRIFIÉ (point fort) — Chemin de saisie principal correct.**
`src/components/accounting/JournalEntryModal.tsx:570-597` : validation complète async (`validateJournalEntry` : D=C en `Money`, comptes existants, exercice/période ouverte) PUIS `safeAddEntry`. Le validateur `src/validators/journalEntryValidator.ts` impose : ≥2 lignes, pas de montants négatifs, pas de débit ET crédit sur une ligne, pas de ligne nulle, équilibre `Money`, période ouverte, comptes existants. `entryGuard.safeAddEntry` ajoute : détection de doublon de n° de pièce, contrôle solde caisse 57x ≥ 0, calcul des totaux en `Money`, hash chaîné. **Solide pour la saisie manuelle.**

**[F2-7] P2 — Pièces justificatives non contrôlées.**
SUPPOSÉ (absence constatée). Aucune obligation de pièce jointe/référence justificative n'est imposée à la validation (`reference` est optionnel, libellé seulement en warning, `journalEntryValidator.ts:142-148`). Le rattachement de justificatifs (OCR existe pour les factures mais non lié à l'écriture comme preuve obligatoire) n'est pas exigé.

---

### Thème 3 — Journaux (ventes, achats, banque, OD)

**[F3-1] VÉRIFIÉ (point fort) — Journaux obligatoires définis et mappés.**
`JOURNAUX_OBLIGATOIRES` (`syscohada.ts:138-146`) : AC/VE/BQ/CA/OD/AN/CL. Le modal mappe le type de transaction au code journal (`JournalEntryModal.tsx:553-557`).

**[F3-2] P2 — Mapping journal Caisse incorrect + journal `TR` non référencé.**
VÉRIFIÉ. `JournalEntryModal.tsx:555` : le journal `CA` (caisse) est choisi quand `reglementInfo.compteBank === '531000'`. Or **531** = « Chèques postaux (CCP) » en SYSCOHADA, pas la caisse (classe **57x**). De plus le code `TR` (transfert, `:556`) ne figure pas dans `JOURNAUX_OBLIGATOIRES`. Risque de classement de pièces dans un journal inadéquat.

---

### Thème 4 — Clôture (à-nouveaux, lettrage, verrouillage des périodes)

**[F4-1] P0 — Détermination du résultat sur comptes erronés (1200/1290 au lieu de 131/139).**
VÉRIFIÉ — défaut le plus grave. `src/services/closureService.ts:491-508` impute le résultat de l'exercice au compte **`1200` (bénéfice)** ou **`1290` (perte)** (commentaire `:394`, code `:501`). Ces comptes appartiennent à la racine **12 « Report à nouveau »**, pas au résultat (classe **13**). Or :
- le bilan lit le « Résultat net de l'exercice » sur **131/139** (`financialStatementsExtendedService.ts:152`) → le résultat n'apparaît PAS au bilan ;
- l'affectation du résultat débite **131/139** pour solder le résultat (`cloture/affectationResultatService.ts:203` & `61-62`, `cloture/resultAffectationService.ts:251`, core `affectationResultatService.ts:39-40`) → elle ne solde JAMAIS le 1200/1290, laissant un solde créditeur/débiteur permanent sur la classe 12 et créant un solde fantôme sur 131/139 ;
- les contrôles de cohérence lisent `['131','139']` (`crossControlsService.ts:257`).
De plus, l'écriture de détermination est posée avec `skipSyncValidation: true` (`closureService.ts:528`), ce qui **contourne le contrôle d'existence du compte** — 1200/1290 ne figurant pas comme comptes de résultat dans le plan seedé. **Chaîne de clôture cassée + non conforme SYSCOHADA.** Effort : moyen (corriger les comptes de contrepartie + tests d'intégration détermination→affectation).

**[F4-2] P0 — Suppression physique d'écritures à-nouveau.**
VÉRIFIÉ. `cloture/carryForwardService.ts:225-236` supprime les écritures AN existantes (`adapter.delete`) pour « régénération ». Violation de l'immuabilité ; en SaaS le trigger Postgres bloquerait si `posted`, mais l'AN est créé en `status: 'validated'` (`:184`) → non protégé, et en local rien ne protège. Devrait passer par contrepassation, pas suppression.

**[F4-3] P1 — Verrouillage de clôture faible (statut `validated`, pas `posted`).**
VÉRIFIÉ. L'étape `VERROUILLAGE` de l'orchestrateur (`cloture/closureOrchestrator.ts:625-646`) ne fait que passer les écritures à `status: 'validated'`, pas `posted`. Or le workflow autorise `validated → draft` (retour brouillon, `entryWorkflow.ts:22-26`, `retourBrouillon`). Une écriture « verrouillée par clôture » reste donc déverrouillable. Seul `isClosed` sur l'exercice et le statut de période bloquent réellement la ressaisie. L'à-nouveau et la détermination sont créés en `validated`/`posted` de façon incohérente selon le service.

**[F4-4] P2 — `includeResultat` du carry-forward est du code mort.**
VÉRIFIÉ. `cloture/carryForwardService.ts:121` (et `packages/core/.../carryForwardService.ts:89`) ajoute la chaîne `'12'` à `accountClasses`, mais le filtre compare `line.accountCode.charAt(0)` (1 caractère, `:83`) à des éléments de classe ; `'12'` (2 caractères) ne matche jamais. L'option `includeResultat` n'a donc aucun effet. (Impact limité car la classe `'1'` inclut déjà 12x/13x, mais l'intention est trompeuse et masque l'absence de traitement explicite résultat→RAN.)

**[F4-5] P2 — Lettrage : commentaire TODO trompeur sur le hash (non bloquant réellement).**
VÉRIFIÉ. `lettrageService.ts:351-355` & `416-420` modifient `entry.lines` (ajout `lettrageCode`) sans recalculer le hash, avec un TODO « AF-021 » alarmant. En réalité le hash (`integrity.ts:28-37`) ne couvre QUE `accountCode/debit/credit/label` — pas `lettrageCode` — donc le lettrage ne casse PAS la chaîne. Le lettrage sur écriture `posted` est par ailleurs une pratique comptable acceptable. Risque réel faible, mais le code suggère un défaut d'intégrité inexistant et modifie des écritures `posted` en local sans garde-fou.

**[F4-6] VÉRIFIÉ (point fort) — Calcul des soldes de clôture en `Money`.**
`carryForwardService.calculerSoldesCloture` (`:65-114`) et le service core (`packages/core/src/services/carryForwardService.ts`) accumulent débits/crédits en `Money`, ne reportent que classes 1-5, vérifient l'équilibre. La logique d'à-nouveau est saine ; le défaut est l'absence de traitement explicite du résultat avant report (F4-1/F4-4) et la suppression (F4-2).

---

### Thème 5 — États financiers (bilan, CR, SIG, TAFIRE)

**[F5-1] P1 — Les états financiers incluent les écritures BROUILLON (`draft`).**
VÉRIFIÉ. `DexieAdapter.getBalanceByAccount` (`:360-381`) ne filtre PAS sur `status` : il agrège TOUTES les écritures, brouillons compris. Or `getBalanceComparative`/bilan/CR (`financialStatementsExtendedService.ts:65,210`) s'appuient dessus. À l'inverse, `verifyTrialBalance` (`trialBalanceService.ts:47-48`) exclut les `draft`. **Le bilan/CR officiels et la balance de vérification utilisent donc des populations d'écritures différentes et peuvent diverger.** Aggravant : `posterAmortissements` crée les dotations en `status: 'draft'` (`postingService.ts:188`) → des dotations non validées polluent les états. Risque d'états financiers matériellement faux.

**[F5-2] P0 (lié) — Le service `financial_statements.service.ts` est un stub vers un backend inexistant.**
VÉRIFIÉ. `src/services/financial_statements.service.ts` (annoté `@ts-nocheck`, `:1`) appelle `apiService.get/post('/api/v1/financial_statements/...')` (`:544-705`) et documente « Backend: apps/financial_statements/urls.py (2 ViewSets) » — un backend **Django/Python qui n'existe pas** dans ce monorepo React/TS/Supabase. Tout consommateur de ce service obtiendra des erreurs HTTP. La vraie implémentation (DataAdapter) est `financialStatementsExtendedService.ts`. Risque : selon le service câblé dans l'UI, les états peuvent être totalement non fonctionnels. À vérifier au câblage UI (angle mort partiel).

**[F5-3] P2 — TAFIRE : structure typée présente, calcul réel à confirmer.**
VÉRIFIÉ partiellement. Le TAFIRE est exposé via le stub (F5-2) ; un `tafireService.ts` existe (`src/services/financial/tafireService.ts`) mais n'a pas été exécuté ici. La structure SYSCOHADA (CAFG, variation BFR, flux investissement/financement) est correctement typée (`financial_statements.service.ts:259-310`). Conformité de calcul = SUPPOSÉE, non vérifiée à l'exécution.

**[F5-4] P2 — SIG : 9 soldes typés, mapping perfectible.**
VÉRIFIÉ (types). Les 9 SIG SYSCOHADA sont modélisés (`financial_statements.service.ts:170-208`). Le mapping comptes→postes du CR réel (`financialStatementsExtendedService.ts:223-248`) présente quelques approximations : `RE « Autres achats »` mappé sur `['609']` en `nature: 'credit'` (`:232`) alors que la constante officielle vise 604/605/608 ; `RD` sur `6032/6033`. À fiabiliser pour un calcul de marge/VA exact.

**[F5-5] VÉRIFIÉ (point fort) — Bilan/CR en Decimal.js avec N-1 et amortissements nets.**
`financialStatementsExtendedService.ts:103-196` : brut/amortissement/net par poste, comparatif N-1, dépréciations (28x/29x/39x) retranchées du brut, arrondi `ROUND_HALF_UP` à 2 décimales. Le résultat est lu sur 131/139 (cohérent avec l'affectation, mais en contradiction avec la détermination F4-1).

---

### Thème 6 — TVA

**[F6-1] P1 — TVA et IS calculés en float natif et SANS filtre de statut.**
VÉRIFIÉ. `src/features/taxation/services/taxationService.ts` : `sumByPrefix`/`netByPrefix` accumulent en `+=` float natif (`:62,74`), et `getEntriesForPeriod` (`:81-84`) n'exclut pas les `draft`. La déclaration TVA (`:96-129`) et IS (`:138-192`) incluent donc les brouillons et perdent le bénéfice de `Money` sur l'agrégation (le `tvaDue` final est en `Money` mais alimenté par des sommes float). Risque : déclarations fiscales basées sur des montants non validés/imprécis.

**[F6-2] P2 — Exigibilité TVA sur les prestations de services non gérée.**
SUPPOSÉ. La TVA collectée = mouvements crédit-débit des comptes 443x sur la période (`taxationService.ts:104`), soit une logique « régime des débits ». L'exigibilité TVA sur **encaissement** pour les prestations de services (règle OHADA usuelle) n'est pas distinguée. À confirmer comme choix de gestion ou défaut.

**[F6-3] P2 — IS : fallback silencieux et taux/minimum codés en dur.**
VÉRIFIÉ. `taxationService.ts:160-180` : si `calculateIS` échoue, `catch { /* silent */ }` (`:172`) puis fallback à `tauxIS = 25 %` et minimum IS = `1 % du CA` codés en dur. Un échec de calcul fiscal est masqué silencieusement ; les taux OHADA varient par pays (cf. `TAUX_PAR_PAYS`). Le `compliance_rate: 100` du dashboard (`:290`) est une valeur en dur, non calculée.

**[F6-4] VÉRIFIÉ (point fort) — Comptes TVA conformes.**
TVA collectée 443x (crédit), déductible 445x (débit), due = collectée − déductible, crédit de TVA reporté si négatif (`taxationService.ts:104-121`). Mapping SYSCOHADA correct.

---

### Thème 7 — Multidevises / écarts de change

**[F7-1] VÉRIFIÉ (point fort) — Écart de change réalisé conforme.**
`src/services/foreignCurrencyPaymentService.ts:48-183` : règlement en devise, conversion en `Decimal.js` (ROUND_HALF_UP), perte de change → **676**, gain → **776** (comptes SYSCOHADA corrects), équilibre vérifié avant écriture, logique fournisseur/client symétrique correcte.

**[F7-2] P2 — Écart de conversion latent (clôture) sur créances/dettes en devise : non vu sur ce chemin.**
SUPPOSÉ. Seul l'écart **réalisé** au règlement est traité ici. La réévaluation de clôture des éléments monétaires en devise (écarts de conversion 478/479, provision pour perte de change 19x) n'apparaît pas dans ce service. Un `reevaluationService.ts` existe (`src/services/immobilisations/`) mais concerne les immobilisations. À vérifier hors périmètre du temps imparti.

**[F7-3] P2 — Écritures FX sans numéro de pièce ni hash d'intégrité.**
VÉRIFIÉ. `foreignCurrencyPaymentService.ts:185-189` persiste via `adapter.saveJournalEntry({ entryNumber: '', journal: 'BQ', ... })` — chemin qui valide l'équilibre et le verrou de période MAIS contourne `safeAddEntry` : pas de hash chaîné, pas de contrôle de doublon, **numéro de pièce vide**. Troisième chemin d'écriture concurrent (avec `safeAddEntry` et `create`), source d'incohérence d'intégrité.

---

### Thème 8 — Piste d'audit / FEC

**[F8-1] P3 / Hors-périmètre OHADA — FEC au format FRANÇAIS pour un produit OHADA.**
VÉRIFIÉ. `fecExportService.ts` se déclare « Conforme à l'article A.47 A-1 du Livre des Procédures Fiscales » (`:5`) — texte **français**. SYSCOHADA/OHADA n'impose pas ce FEC. Le nom de fichier utilise un `siren` (identifiant français) avec fallback `000000000` (`:197-198`) ; les identifiants OHADA (NIF/IFU/RCCM) ne sont pas utilisés. Implémenter un FEC français n'est pas nuisible (certaines administrations OHADA adoptent des formats électroniques), mais l'allégation de conformité est trompeuse pour la cible. À reclasser/documenter comme « export technique optionnel », pas comme obligation SYSCOHADA.

**[F8-2] P2 — FEC : totaux et contrôle d'équilibre en float.**
VÉRIFIÉ. `fecExportService.ts:162-163,243-246,258-266` accumulent en `+=` et testent l'équilibre via `Math.abs(d - c) > 0.01` (float), non `Money`. Le FEC filtre toutefois correctement validated/posted et avertit des brouillons exclus (`:230-233`) — bon point.

**[F8-3] VÉRIFIÉ (point fort) — Piste d'audit hashée et chaînée.**
`integrity.ts` (SHA-256 chaîné, `hashEntry`/`verifyChain`/`hashAuditLog`), `DexieAdapter.logAudit` (`:470-481`) chaîne les hash des logs, trigger Postgres rendant `audit_logs` immuable. Les transitions de statut, contrepassations, clôtures sont journalisées (`entryWorkflow.ts`, `reversalService.ts:93`, orchestrateur). Solide.

---

### Thème 9 — Contrôles internes (séparation des tâches, validation, rapprochements)

**[F9-1] P2 — Workflow de validation présent mais traçabilité d'acteur partielle.**
VÉRIFIÉ. Machine à états `draft → validated → posted` (`entryWorkflow.ts:22-26`), `posted` immuable (transitions vides), logs de transition. MAIS la séparation des tâches (préparateur ≠ valideur ≠ comptabilisateur) n'est pas imposée par le code : `createdBy`/`initiateur` sont des chaînes libres (ex. `'system'`, `preparePar`) sans contrôle qu'un même utilisateur ne valide pas sa propre écriture. La séparation des tâches relève des permissions RBAC (Supabase `roles/permissions`) — VÉRIFIÉ comme existant mais le lien « interdit de valider sa propre saisie » n'est pas codé.

**[F9-2] P2 — Rapprochement bancaire : modification de lignes d'écriture.**
VÉRIFIÉ. `rapprochementBancaireService.ts:428` met à jour `entry.lines` (pose d'un code de rapprochement) via `adapter.update` sans contrôle de statut, comme le lettrage (F4-5). Acceptable si métadonnée, mais sans garde-fou en local.

**[F9-3] VÉRIFIÉ (point fort) — Balance de vérification dédiée.**
`trialBalanceService.verifyTrialBalance` : ΣD=ΣC global, équilibre par écriture, Actif=Passif (classes 1-5 + résultat 6-7 calculé), continuité des numéros. Calculs en `Money`. Exclut les brouillons. Bon contrôle pré-clôture (sous réserve du bug de continuité F2-3).

---

### Thème 10 — Anomalies métier, calculs, arrondis

**[F10-1] P1 — Double classe `Money` divergente (dette technique à risque).**
VÉRIFIÉ. `src/utils/money.ts` et `packages/core/src/Money.ts` sont deux copies de la classe `Money`. La version core a des méthodes en plus (`compare`, `format`), la version `src` non. Risque de divergence comportementale silencieuse selon l'import. À unifier (le core devrait être la source unique).

**[F10-2] P2 — `Money.equals` à tolérance 0,01 par défaut + agrégations float résiduelles.**
VÉRIFIÉ. `Money.equals(other, tolerance = 0.01)` (`money.ts:55`) considère égaux deux montants à moins d'1 centime — pertinent pour FCFA sans décimales, mais une tolérance par défaut implicite peut masquer de micro-écarts dans des contextes décimaux. Plusieurs agrégations critiques restent en float natif (TVA F6-1, FEC F8-2, HAO/classTotals de l'orchestrateur `closureOrchestrator.ts:565-566,665-666`, validation `JournalsPage` F2-5), contredisant la règle « Money/Decimal partout ».

**[F10-3] P2 — Amortissement dégressif : coefficient fixe ×2 (double-declining) au lieu des coefficients OHADA.**
VÉRIFIÉ. Le taux dégressif est calculé `(100/durée)×2` (`postingService.ts:67-68`) et `2/durée` dans le core (`packages/core/src/services/depreciationService.ts:60`). Le dégressif fiscal OHADA applique des coefficients réglementaires (typiquement 1,5 / 2 / 2,5 selon la durée), pas un ×2 systématique. La bascule dégressif→linéaire (`depreciationService.ts:272-282`) et le bouclage (`:300-310`) sont bien gérés. Le prorata temporis de première annuité (date de mise en service) n'a pas été confirmé sur le tableau annuel.

**[F10-4] P2 — `@ts-nocheck` sur des services comptables critiques.**
VÉRIFIÉ. `postingService.ts:1`, `entryWorkflow.ts:1`, `carryForwardService.ts:1`, `financial_statements.service.ts:1`, `fecExportService.ts:1` désactivent totalement le typage TypeScript. Sur du code comptable, cela masque des erreurs de type potentiellement génératrices d'anomalies (ex. `null`/`undefined`, mauvais champ). À retirer progressivement.

**[F10-5] P2 — Affectation d'une perte : débit de 139 potentiellement erroné.**
VÉRIFIÉ. En cas de perte, `cloture/resultAffectationService.ts:251` et `affectationResultatService.ts:203/266` débitent/créditent 139 de façon ambiguë. Pour solder une perte (139 débiteur), il faut **créditer 139** et **débiter 129 (RAN débiteur)** ; débiter 139 amplifierait la perte. La logique mérite une revue dédiée avec jeux d'essais perte/bénéfice.

---

## 4. Angles morts (non testables sans accès complémentaire)

- **Câblage UI réel des états financiers** : impossible de confirmer ici si l'UI consomme le stub `financial_statements.service.ts` (backend fantôme) ou `financialStatementsExtendedService.ts` (réel). Vérification requise via les pages/`useAdapterQuery`.
- **Exécution réelle en mode Supabase** : les triggers Postgres (immuabilité, équilibre, verrou période) n'ont pas été exécutés contre une vraie base ; conformité supposée d'après la lecture du SQL. Le modèle `journal_lines` (table séparée) vs `lines` (tableau embarqué Dexie) crée une divergence dont l'impact sur lettrage/rapprochement (qui font `update('journalEntries', {lines})`) n'est pas vérifiable sans DB.
- **TAFIRE / SIG en exécution** : calculs non exécutés contre un jeu d'écritures réel.
- **Déclarations fiscales réelles** : conformité des formulaires CERFA/OHADA, exigibilité, télédéclaration : hors périmètre code.
- **Prorata temporis amortissements** et **réévaluation de change de clôture** : non confirmés à l'exécution.
- **Tests verts trompeurs** : la suite Vitest s'exécute via `createTestAdapter` qui (a) conserve les `id` (masque F2-4) et (b) stub `getBalanceByAccount → Map vide` (masque F5-1). La couverture est donc structurellement aveugle aux trois P0/P1 majeurs. (Couverture détaillée déléguée à l'agent dédié.)

---

## 5. Tableau récapitulatif

| ID | Sévérité | Thème | Description | Fichier:ligne | Effort |
|----|----------|-------|-------------|---------------|--------|
| F4-1 | **P0** | Clôture / États | Résultat imputé sur 1200/1290 (classe 12) au lieu de 131/139 → résultat absent du bilan, jamais affecté, soldes fantômes ; contourne le contrôle de compte | `src/services/closureService.ts:491-508,528` | Moyen |
| F2-4 | **P0** | Écritures | `create()` écrase l'`id` fourni en prod ; l'adaptateur de test le conserve → `safeAddEntry`/`reverseEntry` renvoient/référencent des id inexistants ; tests faussement verts | `packages/data/src/adapters/DexieAdapter.ts:245-246`, `SupabaseAdapter.ts:154`, `entryGuard.ts:116`, `reversalService.ts:106`, `test/createTestAdapter.ts:51` | Faible |
| F2-1 | **P0** | Écritures | Mode local : `create/update/delete` sans équilibre, sans verrou période, sans protection `posted` ; immuabilité inexistante hors Supabase | `packages/data/src/adapters/DexieAdapter.ts:244-297,396` | Élevé |
| F4-2 | **P0** | Clôture | Suppression physique d'écritures à-nouveau (devrait être contrepassation) | `src/services/cloture/carryForwardService.ts:225-236` | Faible |
| F5-2 | **P0** | États | `financial_statements.service.ts` = stub vers backend Django inexistant | `src/services/financial_statements.service.ts:544-705` | Moyen |
| F5-1 | **P1** | États / Balance | `getBalanceByAccount` n'exclut pas les `draft` → bilan/CR/TVA incluent les brouillons ; incohérent avec la balance de vérification | `packages/data/src/adapters/DexieAdapter.ts:360-381`; `postingService.ts:188` | Faible |
| F2-3 | **P1** | Écritures | Numérotation des pièces incohérente (2 vs 3 segments) → contrôle de continuité cassé ; 3 générateurs concurrents sans verrou | `journalEntryValidator.ts:209-224`; `postingService.ts:43-46`; `trialBalanceService.ts:170-179` | Moyen |
| F2-5 | **P1** | Écritures | Édition `JournalsPage` non persistante + équilibre en float strict | `src/pages/accounting/JournalsPage.tsx:374-414` | Faible |
| F4-3 | **P1** | Clôture | Verrouillage de clôture en `validated` (réversible) au lieu de `posted` | `src/services/cloture/closureOrchestrator.ts:625-646` | Faible |
| F6-1 | **P1** | TVA / IS | Déclarations TVA/IS en float natif et incluant les brouillons | `src/features/taxation/services/taxationService.ts:62,74,81-84` | Moyen |
| F1-2 | **P1** | Plan comptable | Compte de résultat-perte dupliqué/incohérent (129000 vs 139) | `src/services/accounting/planComptableService.ts:288` | Faible |
| F10-1 | **P1** | Calculs | Double classe `Money` (src vs core) divergente | `src/utils/money.ts`; `packages/core/src/Money.ts` | Faible |
| F1-1 | P2 | Plan comptable | Mappings de postes Bilan/CR divergents (3 sources) | `packages/shared/.../syscohada.ts:12-70`; `financialStatementsExtendedService.ts:80-101` | Moyen |
| F3-2 | P2 | Journaux | Journal CA mappé sur 531 (CCP) ; `TR` non référencé | `src/components/accounting/JournalEntryModal.tsx:553-557` | Faible |
| F4-4 | P2 | Clôture | `includeResultat` = code mort (filtre `charAt(0)`) | `src/services/cloture/carryForwardService.ts:121,83` | Faible |
| F4-5 | P2 | Clôture | Lettrage modifie écritures `posted` en local ; TODO hash trompeur | `src/services/lettrageService.ts:351-355,416-420` | Faible |
| F5-4 | P2 | États | Mapping comptes→postes CR approximatif (RE/RD/609) | `financialStatementsExtendedService.ts:223-248` | Moyen |
| F6-2 | P2 | TVA | Exigibilité sur encaissement (prestations) non gérée | `src/features/taxation/services/taxationService.ts:104` | Moyen |
| F6-3 | P2 | TVA / IS | Fallback IS silencieux + taux/minimum/compliance en dur | `src/features/taxation/services/taxationService.ts:172-180,290` | Faible |
| F7-2 | P2 | Multidevises | Écart de conversion latent de clôture (478/479) non vu | `src/services/foreignCurrencyPaymentService.ts` | Moyen |
| F7-3 | P2 | Multidevises | Écritures FX sans n° de pièce ni hash (`saveJournalEntry`) | `src/services/foreignCurrencyPaymentService.ts:185-189` | Faible |
| F8-2 | P2 | FEC | Totaux / équilibre FEC en float | `src/services/export/fecExportService.ts:162-266` | Faible |
| F9-1 | P2 | Contrôles internes | Séparation des tâches non imposée par le code (préparateur=valideur possible) | `src/services/entryWorkflow.ts:64-126` | Moyen |
| F9-2 | P2 | Contrôles internes | Rapprochement modifie lignes sans garde-fou de statut (local) | `src/services/rapprochementBancaireService.ts:428` | Faible |
| F10-2 | P2 | Calculs | `Money.equals` tolérance 0,01 par défaut + agrégations float résiduelles | `src/utils/money.ts:55`; `closureOrchestrator.ts:565-566,665-666` | Faible |
| F10-3 | P2 | Immobilisations | Dégressif = ×2 fixe au lieu des coefficients OHADA ; prorata 1re annuité à confirmer | `src/services/postingService.ts:67-68`; `packages/core/.../depreciationService.ts:60` | Moyen |
| F10-4 | P2 | Qualité | `@ts-nocheck` sur services comptables critiques | `postingService.ts:1`; `entryWorkflow.ts:1`; `carryForwardService.ts:1`; `fecExportService.ts:1` | Moyen |
| F10-5 | P2 | Clôture | Affectation d'une perte : sens de 139/129 à revoir | `src/services/cloture/resultAffectationService.ts:251` | Faible |
| F2-7 | P3 | Écritures | Pièces justificatives non obligatoires à la validation | `src/validators/journalEntryValidator.ts:142-148` | Moyen |
| F8-1 | P3 | FEC | FEC français (art. A47 A-1 LPF) présenté comme conformité ; non requis OHADA | `src/services/export/fecExportService.ts:5,197-198` | Faible |
| F5-3 | P3 | États | TAFIRE/SIG : structure OK, calcul réel non exécuté (angle mort) | `src/services/financial/tafireService.ts` | — |

**Synthèse sévérité :** P0 = 5, P1 = 7, P2 = 16, P3 = 3.

---

*Audit indépendant fondé sur la lecture du code et l'exécution ciblée de tests Vitest (entryGuard, reversal, carryForward, affectation, closures, trialBalance, money — tous verts, mais cf. angle mort « tests trompeurs »). Aucun fichier source n'a été modifié.*
