# Audit métier approfondi — Conformité SYSCOHADA révisé (AUDCIF)
**Application : WiseBook ERP / « Atlas Finance » v3.0 — Système Normal**
**Auditeur : expert-comptable / CAC senior — mission LECTURE SEULE**
**Date : 2026-05-23 — branche `master` @ 699be6d**

---

## 0. Méthode & état des vérifications

- **Mode** : lecture seule. **Aucun fichier source modifié.** Seul ce rapport est écrit.
- **`npx tsc --noEmit`** : **exit 0** (aucune erreur de type). ⚠️ Réserve : les contrôles d'audit Proph3t portent `// @ts-nocheck` en tête → le compilateur ne voit PAS le bug `totalDebit/totalCredit` (cf. F-01).
- **`npx vitest run --exclude "**/.claude/**"`** : **56 fichiers, 757 tests PASSÉS**, 0 échec d'assertion. **2 « unhandled errors »** (`storage.getItem is not a function`) dans `proph3t.test.ts` / `proph3t-tools.test.ts` — défaut d'environnement de test (mock localStorage absent), PAS une régression comptable, mais Vitest avertit de possibles faux positifs.
- **Aucune régression introduite** par cet audit (lecture seule confirmée).

Légende : **VÉRIFIÉ** = code lu ligne à ligne / test exécuté. **SUPPOSÉ** = déduction non exécutée.
Sévérité : **P0 Bloquant / P1 Majeur / P2-P3 Mineur**.

---

## 1. Détermination du résultat — `closureService.generateResultatEntry`
`src/services/closureService.ts:398-541`

**VÉRIFIÉ — CONFORME (P3 mineur résiduel).** Le correctif P0-3 est **JUSTE**.
- Solde net par compte de classe 6 et 7 calculé en `Money` (Decimal.js), pas de float natif (`closureService.ts:416-425`).
- Chaque compte 7 est **débité** de son solde créditeur, chaque compte 6 **crédité** de son solde débiteur pour ramener à zéro (`:437-489`) — correct.
- Contrepartie sur **131 (bénéfice, crédit) / 139 (perte, débit)**, classe 13 « Résultat net de l'exercice » (`:504-513`). **Conforme SYSCOHADA révisé** : le résultat apparaît bien au poste bilan CH (131/139), et non plus sur la classe 12 (1200/1290) comme avant. **Confirmé** par le test `integration.criticalPaths.test.ts:104-130` (bénéfice 400 sur 131 crédit, écriture équilibrée, ni 1200 ni 1290).
- Équilibre garanti par construction : `resultatNet = Σdébits(produits soldés) − Σcrédits(charges soldés)`, la contrepartie ferme l'écart (`:492-513`).

**Anomalie P3** : la sélection des écritures filtre `validated|posted` (`:408-411`) mais **n'exclut pas explicitement les écritures contrepassées** (`reversed === true`). Une écriture contrepassée ET sa contrepassation s'annulant (les deux étant `validated`), le solde net reste juste — donc impact nul en pratique, mais à durcir.
**Anomalie P3** : journal `'CL'` (clôture) ; or `JOURNAUX_OBLIGATOIRES` (syscohada.ts:138-146) liste bien `CL` → cohérent.

---

## 2. Affectation du résultat — TROIS implémentations divergentes
`src/services/cloture/affectationResultatService.ts`, `src/services/cloture/resultAffectationService.ts`, `packages/core/src/services/affectationResultatService.ts`

**VÉRIFIÉ — NON-CONFORMITÉS MULTIPLES (P1).** Il existe **trois** services d'affectation au comportement **incohérent entre eux**, ce qui est un risque métier majeur (selon le point d'appel, le résultat est traité différemment).

### F-02 (P1) — Taux de réserve légale incohérent : 10 % vs 5 %
- `affectationResultatService.ts:93` et `packages/core/.../affectationResultatService.ts:73` : `percentage(money(resultatNet), 10)` → **10 %**.
- `resultAffectationService.ts:148` : `money(montantResultat).multiply(0.05)` → **5 %**, commentaire « 5% minimum per OHADA » (`:9, :145`).

**Verdict SYSCOHADA** : l'Acte uniforme OHADA (droit des sociétés, art. 546 AUSCGIE) impose une dotation à la réserve légale **= 1/10ᵉ (10 %) du bénéfice net**, jusqu'à plafond 20 % du capital. **La valeur 5 % de `resultAffectationService.ts` est NON CONFORME.** Les deux autres services (10 %) sont corrects. Le plafond 20 % du capital est correct partout (`affectationResultatService.ts:78`, `resultAffectationService.ts:144`).

### F-03 (P1) — Compte « Report à nouveau créditeur » : 121 vs 120
- `affectationResultatService.ts:65` et core (`:45`) : RAN créditeur = **121**.
- `resultAffectationService.ts:299` : RAN créditeur = **120**.

**Verdict SYSCOHADA** : le plan OHADA prévoit **121 = Report à nouveau créditeur** et **129 = Report à nouveau débiteur** ; **120** est le compte de regroupement (à 2 chiffres), non mouvementé directement. `resultAffectationService.ts` qui crédite **120** est **NON CONFORME** (devrait être 121). Note : l'orchestrateur (étape 15) teste justement le solde de **120/129** (`closureOrchestrator.ts:731-732`) → cohérent avec ce service-ci mais pas avec les deux autres.

### F-04 (P1) — Cas PERTE : écriture incohérente dans `affectationResultatService.genererEcrituresAffectation`
`affectationResultatService.ts:199-271`
En cas de perte (`isBenefice === false`), la 1ʳᵉ ligne **débite 129** (RAN débiteur) du montant `Math.abs(resultatNet)` (`:201-206`). Puis, si `ventilation.reportANouveau < 0`, le code **crédite 139** (résultat perte) (`:262-270`). Résultat : l'écriture en perte est `D 129 / C 139` — **ce qui est le bon sens SYSCOHADA** (on solde 139 créditeur, on reporte la perte en 129 débiteur). **MAIS** la 1ʳᵉ ligne devrait débiter le RAN seulement de la part *reportée*, et l'apurement de 139 être systématique (pas conditionné à `reportANouveau < 0`). Si l'utilisateur ventile une perte autrement (ex. imputation sur réserves), l'écriture devient déséquilibrée/fausse. Logique fragile, **à revoir**. Le service `resultAffectationService.posterAffectation` traite la perte plus proprement : `D 139 / C 129` (`:252-315`) — **conforme**.

### F-05 (P2) — Affectation jamais déclenchée dans le workflow orchestré
`closureService.executerCloture` (`:184-373`) ne génère **aucune écriture d'affectation** : il calcule le résultat (131/139) puis fait les à-nouveaux. **Aucun des 3 services d'affectation n'est appelé** par le flux automatique (vérifié : `genererEcrituresAffectation`/`posterAffectation` ne sont référencés que par l'UI, cf. grep). Conséquence : 131/139 n'est jamais soldé vers réserves/RAN par la clôture automatique (cf. F-07).

---

## 3. À-nouveaux — `carryForwardService`
`src/services/cloture/carryForwardService.ts`, `packages/core/src/services/carryForwardService.ts`

**VÉRIFIÉ — majoritairement CONFORME, 2 réserves.**
- Soldes nets par compte des classes **1-5** (`BILAN_CLASSES`, `:55`), reportés D/C en `Money` (`:90-91`). Équilibre vérifié avant persistance (`:160-163`). **Conforme** : seuls les comptes de bilan sont reportés ; les classes 6/7 (gestion) sont exclues. **Confirmé** par `integration.accountingFlows.test.ts:60-81`.
- **F-06 (P3) — `includeResultat` = code mort confirmé.** `previewCarryForward` ajoute la classe **'12'** quand `includeResultat` est vrai (`:120`). Or, depuis le correctif P0-3, le résultat vit sur la classe **13** (131/139), reportée de toute façon via la classe '1' (`charAt(0) === '1'`). Ajouter '12' est donc **inopérant** (aucun compte 12x à reporter en l'absence d'affectation). Le flag est appelé avec `includeResultat: true` (`closureService.ts:334`, `closureOrchestrator.ts:754`) **sans effet**. À supprimer.
- **F-07 (P1) — 131/139 reporté à nouveau au lieu d'être affecté.** Puisque (F-05) l'affectation n'est pas exécutée, le solde **131/139** (classe 13) est repris tel quel comme à-nouveau dans l'exercice N+1 (classe '1'). **Non-conforme** : SYSCOHADA exige que le résultat de N soit affecté (réserves/RAN/dividendes) AVANT l'ouverture de N+1 ; reporter 131/139 en l'état laisse un « résultat de l'exercice » fantôme à l'ouverture de N+1, jamais ventilé. La régénération par **contrepassation** (et non suppression) des AN validés est en revanche **CONFORME** à l'intangibilité (Art. 19) — `supprimerCarryForward:228-268`, **confirmée** par test (`integration.accountingFlows.test.ts:73-81`).

---

## 4. TVA — `taxationService` + `tvaValidation`
`src/features/taxation/services/taxationService.ts`, `src/utils/tvaValidation.ts`

**VÉRIFIÉ — partiellement conforme (P1 + P2).**

### F-08 (P1) — Mapping des comptes TVA incohérent entre services
- `taxationService.calculerDeclarationTVA` (`:109-112`) : **TVA collectée = solde des comptes `443x`**, **TVA déductible = `445x`**. C'est **CONFORME** au plan OHADA : **443 = État, TVA facturée (collectée)** ; **445 = État, TVA récupérable (déductible)**. **Confirmé** par `integration.criticalPaths.test.ts:133-143` (443 crédit = collectée).
- MAIS `tvaValidation.ts:27-32` définit **TVA_COLLECTEE = ['44571','4457',…]** et **TVA_DUE = ['444','4444']**. Le compte **4457 n'existe PAS** dans le plan OHADA standard (4457 est une logique « TVA collectée » du PCG **français**, pas SYSCOHADA). En OHADA : 4431 TVA facturée sur ventes, 4434 TVA facturée HAO, 4441 État TVA due, 4449 État crédit de TVA, 4451/4452 TVA récupérable. **`tvaValidation` mélange plans français et OHADA → contrôles de sens TVA potentiellement faux.** Les deux modules ne partagent pas le même référentiel de comptes : risque d'incohérence entre saisie validée et déclaration.

### F-09 (P2) — Exigibilité TVA non gérée (débits vs encaissements)
`calculerDeclarationTVA` agrège purement les soldes 443/445 sur la période, **sans distinction du régime d'exigibilité**. En OHADA, la TVA sur **prestations de services** est en principe exigible à **l'encaissement** (sauf option « débits »), alors que sur les **livraisons de biens** elle l'est à la facturation. Le service ne modélise ni 4458 (TVA en attente / sur encaissements), ni l'option débits. **Non-conforme pour les prestataires de services** — la TVA collectée peut être surévaluée (déclarée à la facture alors que due à l'encaissement). `details.prestationsHT` est calculé (`:120`) mais jamais utilisé pour ajuster l'exigibilité.

### F-10 (P3) — `tvaDue = Math.max(0, …)` masque le crédit de TVA dans le champ principal
`:114-127` : `tvaDue` est plafonné à ≥ 0 et le crédit est exposé séparément (`creditTVA`). Acceptable, mais le report du crédit de TVA sur la période suivante n'est pas tracé (pas de report N→N+1 du compte 4449). **À surveiller.**

### F-11 (P2) — Cameroun : `calculerTVACameroun` (17,5 % + 10 % CAC) non branché
`tvaValidation.ts:358-362` calcule correctement le 19,25 % camerounais (TVA 17,5 % + CAC 10 % sur TVA). Mais `taxationService` agrège les comptes 443/445 sans logique pays → la ventilation TVA/CAC n'est jamais comptabilisée séparément. **SUPPOSÉ** non bloquant si la saisie ventile déjà, mais non automatisé.

---

## 5. Impôt sur les sociétés (IS) — `isCalculation` + `taxationService`
`src/utils/isCalculation.ts`, `taxationService.calculerDeclarationIS`

**VÉRIFIÉ — CONFORME dans l'ensemble (P2 résiduels).**
- Taux IS par pays (`isCalculation.ts:8-26`) : CI 25 %, SN 30 %, CM 33 %, BF 27,5 %, TG 27 %… **cohérents** avec `TAUX_PAR_PAYS` de `syscohada.ts:109-132` (CI 0,25 ; CM 0,33 ; BF 0,275 ; TG 0,27). VÉRIFIÉ.
- Résultat fiscal = comptable + réintégrations − déductions − déficits antérieurs imputés (sans rendre négatif) (`:81-89`) — **correct**.
- IS dû = `max(IS brut, minimum IS)` (`:99-100`) — **correct** (minimum de perception OHADA).
- **F-12 (P2)** : le minimum IS par défaut est **1 % du CA** (`:74, taxationService.ts:188`). Or les taux varient fortement (CM 2,2 %, SN 0,5 %…) et beaucoup de pays ont un **plancher en valeur absolue** (ex. CI : minimum forfaitaire ≥ 3 000 000 FCFA) non modélisé. `MINIMUM_IS_RATES` (`:29-35`) ne couvre que 5 pays ; les autres retombent sur 1 %. **Approximation** — à compléter par pays.
- **F-13 (P2)** : `calculerDeclarationIS` agrège le résultat comptable y compris **HAO classes 81-88** (`:157-161`) dans l'assiette IS. C'est correct sur le principe (résultat global imposable), mais le compte **87 (participation des travailleurs)** et **89 (impôts sur le résultat lui-même)** ne devraient pas entrer dans la base IS. Le code inclut 88 (subventions équilibre) en produit HAO mais **exclut 87/89 de l'agrégat HAO** (`:157-160`) → globalement correct, mais à auditer finement.
- **F-14 (P3)** : fallback silencieux quand `calculateIS` échoue → taux 25 % / minimum 1 % avec `details: null` (`:182-189`). Documenté, non bloquant.

---

## 6. États financiers — Bilan / CR / SIG / Ratios
`src/features/financial/services/financialStatementsService.ts`, `src/services/financialStatementsExtendedService.ts`

**VÉRIFIÉ — CONFORME avec anomalies P1/P2 sur le mapping postes.**

### F-15 (P1) — Double comptage potentiel du résultat dans les capitaux propres
`financialStatementsService.computeBilan:268-298`. Les capitaux propres additionnent :
`reportANouveau` (= −net classe 12, `:271`) + `resultatEnInstance` (= −net classe 13, `:273`) + `resultatExercice` (= produits−charges classes 6/7, `:276`).
**Problème** : APRÈS la clôture (écriture de détermination du résultat, §1), le résultat est posté sur **131/139 (classe 13)** ET les comptes 6/7 sont soldés à zéro → `resultatExercice` (classes 6/7) = 0 et `resultatEnInstance` (classe 13) = le résultat. OK.
**AVANT** clôture : 6/7 non soldés → `resultatExercice` = résultat, `resultatEnInstance` = 0. OK.
**MAIS** si la détermination du résultat est passée SANS solder les 6/7 (cas partiel/erreur), ou si une écriture manuelle alimente 13 en cours d'exercice, on additionne **deux fois** le résultat (classe 13 + classes 6/7). L'équilibre Actif=Passif est alors faux. **Non-conformité conditionnelle** — la cohérence repose entièrement sur la discipline de clôture, sans garde-fou (le contrôle croisé `verifierCoherenceResultat:801-814` existe mais n'est pas câblé dans `computeBilan`).

### F-16 (P2) — `financialStatementsExtendedService` : mapping postes erroné
`src/services/financialStatementsExtendedService.ts` :
- **`AM` et `AN` partagent le préfixe `2182`** (`:87-88`) → le matériel de transport est **compté deux fois** dans le brut actif.
- Poste **`RE` « Autres achats »** déclaré `nature: 'credit'` (`:232`) alors qu'un achat est une **charge (débit)** → montant inversé.
- Poste **`BI`/`DK`/`DM`** : le préfixe `'44'` figure à la fois en créance actif (`:97 BI`) et en dette passif (`:159 DK`) — le même compte 44x est rattaché aux deux côtés ; comme le solde net par compte décide du signe, le risque est limité, mais le préfixe large `'44'` empêche une présentation fine (TVA déductible 445 ≠ dette fiscale 441).
- Ces mappings **divergent de la table canonique** `BILAN_ACTIF_CODES`/`COMPTE_RESULTAT_CODES` de `packages/shared/src/constants/syscohada.ts` (qui, elle, est **CONFORME**). Deux référentiels de postes coexistent → risque d'états divergents selon le service appelé.

### F-17 (P2) — SIG : 8 soldes au lieu des 9 SYSCOHADA
`computeSIG:414-459`. Calcule : marge commerciale, production de l'exercice, valeur ajoutée, EBE, résultat d'exploitation, résultat courant (= RAO), résultat HAO (« exceptionnel »), résultat net, **CAFG**. Le **« Résultat des Activités Ordinaires »** SYSCOHADA est assimilé au `resultatCourant` (exploitation + financier) — acceptable. **CAFG** = résultat net + dotations − reprises + VNC cessions(81) − produits cessions(82) (`:436-445`) : **formule globalement conforme** (méthode additive). Réserve : ne retraite pas les **subventions d'investissement virées au résultat (865/865)** ni la quote-part 798 → CAFG légèrement approximée. **VÉRIFIÉ correct dans le principe.**

### F-18 (P3) — Compte de résultat : `chiffreAffaires` = ventes marchandises (70) seulement
`computeCompteResultat:334, 381`. `chiffreAffaires` est mappé sur `creditByPrefix('70')`. En SYSCOHADA, le **CA = 70 (ventes) entièrement** → correct, mais le libellé « chiffreAffaires » utilisé dans les ratios (`:513 rentabiliteCommerciale`) inclut bien tout le 70. OK. La séparation `productionVendue`/`productionStockee` (71/73) est correcte (`:336-338`, correctif P0-1 confirmé).

---

## 7. Amortissements — `depreciationService` (core + utils) + `postingService`
`packages/core/src/services/depreciationService.ts`, `src/utils/depreciationService.ts`, `src/services/postingService.ts`

**VÉRIFIÉ — CONFORME avec réserve majeure sur le dégressif.**

### F-19 (P1) — Dégressif : coefficient fixe ×2, NON conforme aux coefficients OHADA/fiscaux
- `packages/core/.../depreciationService.ts:61` : `tauxDegressif = 2 / dureeVie` (**double-declining ×2 systématique**).
- `postingService.ts:66` : `tauxDégressif = (100/duree) × 2`.
**Verdict** : le SYSCOHADA renvoie à la fiscalité locale pour l'amortissement dégressif, qui applique des **coefficients par tranche de durée** (typiquement 1,5 pour 3-4 ans ; 2 pour 5-6 ans ; 2,5 au-delà), **pas un ×2 uniforme**. Un bien de durée 3-4 ans amorti à ×2 **surdote** la 1ʳᵉ annuité → charge fiscale non déductible sur l'excédent. **Non-conforme aux coefficients dégressifs réglementaires.**

### F-20 (P2) — Prorata de 1ʳᵉ annuité absent en dégressif ; et linéaire mensualisé sans prorata jour
- `core` : `calculerAmortissements` (dégressif) ne fait **aucun prorata temporis** de la 1ʳᵉ annuité (`:59-63`) — le dégressif OHADA démarre au **1ᵉʳ jour du mois d'acquisition** (prorata mensuel), pas en année pleine.
- `utils/depreciationService` : la mensualisation (`calculerAmortissementMensuel:72-103`, `÷12`) gère implicitement un prorata via `doitEtreAmorti` (skip avant date d'acquisition) — **meilleur**, mais le linéaire utilise une **année commerciale 360 j** (`calculerAnneesEcoulees:105-117`) cohérente SYSCOHADA. Les **deux** implémentations (core vs utils) divergent → le résultat dépend du chemin d'appel. `postingService` utilise `utils/DepreciationService` (`:13`).

### F-21 (P3) — Bascule dégressif→linéaire : présente dans le TABLEAU, absente dans la DOTATION mensuelle postée
- La bascule (quand l'annuité linéaire restante > dégressive) est implémentée dans `genererTableauAmortissement` (`utils/:272-282`) — **conforme**. ✅
- Mais `calculerAmortissementMensuel`/`genererEcritureAmortissement` (réellement postées par `posterAmortissements`) **n'appliquent PAS** la bascule → la dotation comptabilisée chaque mois reste purement dégressive, jamais basculée. **Incohérence tableau vs écriture réelle.**
- Garde-fous corrects : VNC ≥ 0 (core `:66-69`), bouclage Σdotations = base (utils `:300-310`), validation 681x/28x au D/C (`:315-360`). ✅

### F-22 (P3) — Compte de dotation `681000` en dur dans le core
`core/depreciationService.ts:86` : `accountCode: '681000'` fixe, alors que `postingService`/`utils` mappent par classe (6811 incorp., 6813 corp., etc. — `:194-204`). Le core ignore la ventilation par nature d'immobilisation. Non bloquant (le flux posté passe par `utils`).

---

## 8. Change — `foreignCurrencyPaymentService`
`src/services/foreignCurrencyPaymentService.ts`

**VÉRIFIÉ — CONFORME pour le réalisé (P2 sur le latent).**
- Perte de change réalisée → **676**, gain réalisé → **776**, avec sens D/C correct selon fournisseur/client (`:105-174`). **Conforme SYSCOHADA** (676 charges financières / 776 produits financiers). Équilibre vérifié (`:178-183`).
- **F-23 (P2)** : `extourneEcartsConversion` (`:215-284`) **contrepasse** les écarts de conversion 476/477 à l'ouverture N+1 — correct pour l'extourne. **MAIS** le service ne **comptabilise pas la dotation de la provision pour perte de change latente** à la clôture : SYSCOHADA exige, sur écart de conversion **actif** (476, perte latente), une **provision (D 6594/679 → C 499/194)**. Seul l'écart 476/477 et son extourne sont gérés ; la provision pour risque de change latent **n'est pas générée automatiquement**. Non-conforme au principe de prudence sur les pertes latentes.

---

## 9. Contrepassation — `reversalService`
`src/utils/reversalService.ts`

**VÉRIFIÉ — CONFORME (Art. 19 AUDCIF).**
- Inversion débit↔crédit ligne à ligne (`:73-74`), conservation tiers/analytique/lettrage (`:70-76`), `reversalOf` + `reversedBy` + `reversedAt`, marquage `reversed=true` sur l'originale (`:78, 85-90`), blocage de la double contrepassation (`:50-52`) et des brouillons (`:46-48`). **Confirmé** par `integration.accountingFlows.test.ts:33-57` (l'id `reversedBy` pointe vers une écriture réelle — fix F2-4). Numérotation séquentielle par journal (`:26-36`). **Aucune suppression physique** — intangibilité respectée. ✅

---

## 10. FEC — `fecExportService`
`src/services/export/fecExportService.ts`

**VÉRIFIÉ — HORS PÉRIMÈTRE SYSCOHADA (P3).** Le service produit le **FEC français 18 colonnes (art. A47 A-1 LPF / DGFiP)**. **Ce format n'est PAS le standard légal OHADA.** Aucun État OHADA n'exige le FEC français ; certaines DGI (CI, SN) imposent leurs propres formats (balance/grand-livre EDI). Le module est techniquement correct (équilibre vérifié `:262-265`, exclusion brouillons `:138-139`, dates AAAAMMJJ) mais **sa pertinence SYSCOHADA est nulle** — il devrait être renommé/positionné comme export optionnel, et un export conforme aux DGI OHADA reste à produire. Détail mineur : `Idevise` par défaut `'XAF'` (zone CEMAC) — non valable en zone UEMOA (XOF).

---

## 11. Numérotation des pièces / continuité — `trialBalanceService`
`src/services/trialBalanceService.ts`

**VÉRIFIÉ — CONFORME (P3).** Équilibre global D=C en `Money` (`:59-79`), équilibre par écriture (`:82-98`), Actif=Passif avec ventilation classe 4 raisonnée (`:104-147`), détection des **trous de numérotation par journal** (`:160-191`). **Confirmé** par `integration.accountingFlows.test.ts:84-97` (balance équilibrée, brouillon déséquilibré exclu). Réserve P3 : le contrôle Actif=Passif ne distingue pas 419 (clients créditeurs → passif) / 409 (fournisseurs débiteurs → actif), mais le fallback net>0/net<0 sur 44-48 limite l'impact. La continuité repose sur `parseInt(n.split('-')[1])` → suppose un format `XX-NNNN` ; un format de n° différent casse silencieusement la détection (`:171-174`).

---

## 12. ⛔ BUG MAJEUR CONFIRMÉ — Contrôles d'audit Proph3t sur champs inexistants
`src/services/prophet/audit/controls/*.ts`

### F-01 (P1 — possiblement P0 selon usage) — 86/108 contrôles SYSCOHADA calculent sur `undefined → 0`

**VÉRIFIÉ — bug confirmé, ampleur quantifiée.**
- `adapter.getTrialBalance()` retourne des `TrialBalanceRow` dont les champs réels sont **`debitMouvement` / `creditMouvement` / `debitSolde` / `creditSolde`** (`packages/shared/src/types/accounting.ts:319-328` ; implémentation `DexieAdapter.ts:372-392`). **Il n'existe AUCUN champ `totalDebit` / `totalCredit`.**
- Or les contrôles lisent systématiquement `(r.totalDebit || 0)` / `(r.totalCredit || 0)` — ex. `fondamentaux.ts:27-28` (C01 Équilibre D=C), `:43` (C02 Actif=Passif), `:67-77` (C03 résultat), `fiscal.ts:32-38` (C98 TVA), `:53-57` (C99 IS). **`r.totalDebit` étant `undefined`, `|| 0` ramène tout à 0.**
- **Décompte exact** : **108 contrôles** au total (12+15+11+15+15+15+15+10 par fichier) ; **86 d'entre eux appellent `getTrialBalance()`** et dépendent de `totalDebit/totalCredit` (grep : tresorerie 7, transversaux 1, fiscal 11, tiers 13, chargesProduits 15, fondamentaux 12, capitauxPropres 12, immobilisations 15). **≈ 80 % du moteur d'audit SYSCOHADA renvoie des verdicts FAUX** (typiquement « OK : Total D=0, C=0. Équilibré » ; « Résultat CR=0 »). Les ~22 contrôles restants utilisent `getJournalEntries()` (ex. C04, C14, C15) et **fonctionnent correctement**.

**Impact métier** : un cabinet qui s'appuie sur ces contrôles « rouge/vert » obtient des **assurances erronées** (faux OK) sur l'équilibre, le résultat, la TVA, l'IS, le sens des soldes, etc. **Risque de certification à tort.** C'est le défaut métier le plus grave de l'application.
**Aggravant** : `// @ts-nocheck` en tête de **chacun** des 8 fichiers de contrôles masque ce bug au compilateur — d'où `tsc` vert malgré l'erreur. Correctif (hors périmètre lecture seule) : remplacer `r.totalDebit` par `r.debitMouvement` (mouvements) ou `r.debitSolde`/`r.creditSolde` (soldes selon le contrôle), retirer `@ts-nocheck`, et ajouter un test qui ferait échouer la lecture d'un champ absent.

---

## 13. Tests d'intégration — justesse comptable des assertions

**VÉRIFIÉ — assertions comptablement CORRECTES (pas seulement vertes).**
- `integration.criticalPaths.test.ts` : refus écriture déséquilibrée (`:45-50`), respect de l'id (`:52-59`), **immuabilité posted** D/C (`:61-87`, Art. 19), exclusion brouillons des soldes (`:90-102`), **résultat sur 131 et non 1200/1290** (`:104-130`), TVA limitée aux validées (`:133-143`). Toutes **justes** au regard du SYSCOHADA.
- `integration.accountingFlows.test.ts` : contrepassation (`:33-57`), régénération AN **par contrepassation** (`:60-81`), balance équilibrée + exclusion brouillon (`:84-97`), **verrou de période** sur exercice clôturé (`:100-107`). Toutes **justes**.
**Réserve** : aucun test ne couvre (a) l'affectation du résultat (F-02/F-03/F-04), (b) le dégressif/bascule (F-19/F-21), (c) **les contrôles Proph3t** (F-01 — d'où sa survie). L'absence de test sur F-01 est la cause racine de sa non-détection.

---

## 14. Angles morts (non couverts ou non vérifiables en lecture seule)

1. **Mode Supabase (SaaS)** : les RPC `generate_bilan` / `generate_cdr` / `get_trial_balance` (PostgreSQL) **non auditées** ici (lignée de migrations divergente sur ATLAS STUDIO). Le mapping `mapRPCToBilan` (`financialStatementsService.ts:47-87`) suppose des champs snake_case dont la **justesse SQL n'est pas vérifiée**. Les états en prod SaaS peuvent différer du calcul JS audité.
2. **`getTrialBalance` côté Supabase** (`SupabaseAdapter.ts:249`) : si elle retourne `totalDebit/totalCredit` (et non `debitMouvement`…), les contrôles Proph3t fonctionneraient en SaaS mais pas en local — **divergence de comportement non vérifiée** (SUPPOSÉ : même type `TrialBalanceRow`, donc même bug).
3. **Provisions & dépréciations** (créances 491/659, stocks 39, risques 19) : calcul des dotations non audité en profondeur (seuls les états annexes `getProvisionNote` lus).
4. **Stocks / inventaire permanent vs intermittent** : la variation de stock (603x/6032) et l'inventaire (étape `INVENTAIRE_STOCKS` purement informative, `closureOrchestrator.ts:376-409`) ne génèrent **aucune écriture** — l'ajustement de stock de clôture n'est pas automatisé.
5. **Crédit-bail / location-acquisition (17)**, **subventions (14/865)**, **réévaluation** (test présent mais logique non auditée).
6. **TAFIRE complet** : seule la CAFG (composante du SIG) a été vérifiée ; le tableau TAFIRE (variation BFR, flux d'investissement/financement) n'a **pas** de service dédié audité (l'étape `ETATS_FINANCIERS` ne fait que journaliser des totaux par classe, `closureOrchestrator.ts:651-693` — **le TAFIRE annoncé n'est pas réellement calculé**).
7. **Multidevise / arrondi FCFA** : `Money` sur Decimal.js audité indirectement ; pas de test d'arrondi adverse.

---

## 15. Tableau récapitulatif

| ID | Sévérité | Domaine | Conformité SYSCOHADA | Description | Fichier:ligne |
|----|----------|---------|----------------------|-------------|---------------|
| F-01 | **P1** (P0 si prod) | Audit Proph3t | ❌ NON CONFORME | 86/108 contrôles lisent `r.totalDebit/totalCredit` inexistants → calcul sur 0, verdicts faux ; `@ts-nocheck` masque le bug | `prophet/audit/controls/fondamentaux.ts:27-28,43,67-77` ; `fiscal.ts:32-38` ; type `shared/.../accounting.ts:319-328` |
| F-02 | **P1** | Affectation résultat | ❌ NON CONFORME | Réserve légale à **5 %** au lieu de **10 %** (1/10ᵉ OHADA) dans un des 3 services | `cloture/resultAffectationService.ts:148` |
| F-03 | **P1** | Affectation résultat | ❌ NON CONFORME | RAN créditeur sur **120** (compte de regroupement) au lieu de **121** | `cloture/resultAffectationService.ts:299` |
| F-04 | **P1** | Affectation résultat | ⚠️ FRAGILE | Cas perte : écriture conditionnée à `reportANouveau<0`, déséquilibre si ventilation autre | `cloture/affectationResultatService.ts:201-270` |
| F-05 | **P2** | Clôture | ⚠️ INCOMPLET | Aucun service d'affectation appelé par la clôture automatique | `closureService.ts:184-373` |
| F-06 | **P3** | À-nouveaux | ⚠️ CODE MORT | `includeResultat` ajoute classe '12' inopérante (résultat en classe 13) | `cloture/carryForwardService.ts:120` ; `closureService.ts:334` |
| F-07 | **P1** | À-nouveaux | ❌ NON CONFORME | 131/139 reporté tel quel en N+1 sans affectation préalable (résultat fantôme) | `cloture/carryForwardService.ts:55` ; `closureOrchestrator.ts:723-757` |
| F-08 | **P1** | TVA | ⚠️ INCOHÉRENT | `tvaValidation` utilise comptes français (4457) ≠ OHADA (4431/445) du `taxationService` | `utils/tvaValidation.ts:27-32` |
| F-09 | **P2** | TVA | ❌ NON CONFORME | Exigibilité encaissement/débits non gérée (prestations de services) | `taxation/services/taxationService.ts:102-135` |
| F-10 | **P3** | TVA | ⚠️ INCOMPLET | Report du crédit de TVA (4449) N→N+1 non tracé | `taxationService.ts:114-127` |
| F-11 | **P2** | TVA CM | ⚠️ NON BRANCHÉ | TVA Cameroun 17,5 %+CAC calculée mais pas comptabilisée séparément | `tvaValidation.ts:358-362` |
| F-12 | **P2** | IS | ⚠️ APPROX. | Minimum IS = 1 % défaut ; planchers en valeur absolue & 12 pays manquants | `utils/isCalculation.ts:29-35,74` |
| F-13 | **P2** | IS | ⚠️ À VÉRIFIER | Assiette IS inclut HAO ; traitement 87/89 à confirmer | `taxationService.ts:157-161` |
| F-14 | **P3** | IS | ✅ documenté | Fallback taux 25 %/min 1 % si pays non couvert | `taxationService.ts:182-189` |
| F-15 | **P1** | Bilan | ⚠️ CONDITIONNEL | Risque double comptage résultat (classe 13 + classes 6/7) sans garde-fou | `financial/.../financialStatementsService.ts:268-298` |
| F-16 | **P2** | Bilan/CR | ❌ NON CONFORME | Mapping postes erroné : 2182 doublé (AM/AN), RE en 'credit', 44 des deux côtés | `financialStatementsExtendedService.ts:87-88,159,232` |
| F-17 | **P3** | SIG | ✅ CONFORME (approx CAFG) | 8 soldes (RAO=résultat courant) ; CAFG sans 798/865 | `financialStatementsService.ts:414-459` |
| F-18 | **P3** | CR | ✅ CONFORME | CA=70 ; séparation production vendue/stockée OK (P0-1) | `financialStatementsService.ts:334-338` |
| F-19 | **P1** | Amortissement | ❌ NON CONFORME | Dégressif ×2 uniforme au lieu des coefficients OHADA par durée (1,5/2/2,5) | `core/.../depreciationService.ts:61` ; `postingService.ts:66` |
| F-20 | **P2** | Amortissement | ⚠️ DIVERGENT | Prorata 1ʳᵉ annuité absent en dégressif (core) ; 2 implémentations divergentes | `core/.../depreciationService.ts:59-63` ; `utils/depreciationService.ts:105-117` |
| F-21 | **P3** | Amortissement | ⚠️ INCOHÉRENT | Bascule dégressif→linéaire dans le tableau mais PAS dans la dotation postée | `utils/depreciationService.ts:272-282` vs `:72-103` |
| F-22 | **P3** | Amortissement | ⚠️ MINEUR | Compte dotation `681000` en dur dans le core (pas de ventilation par nature) | `core/.../depreciationService.ts:86` |
| F-23 | **P2** | Change | ❌ NON CONFORME | Provision pour perte de change latente (476→6594/499) non générée à la clôture | `foreignCurrencyPaymentService.ts:215-284` |
| F-24 | **P2** | TAFIRE | ⚠️ ABSENT | Le TAFIRE annoncé n'est pas réellement calculé (étape journalise des totaux) | `closureOrchestrator.ts:651-693` |
| OK-1 | — | Détermination résultat | ✅ CONFORME | 131/139 classe 13, équilibré, Money — correctif P0-3 VALIDÉ | `closureService.ts:398-541` |
| OK-2 | — | Contrepassation | ✅ CONFORME | Inversion D/C, reversedBy réel, intangibilité Art. 19 | `utils/reversalService.ts:39-108` |
| OK-3 | — | Régénération AN | ✅ CONFORME | Par contrepassation, pas de suppression d'écriture validée | `cloture/carryForwardService.ts:228-268` |
| OK-4 | — | Balance/continuité | ✅ CONFORME | D=C, Actif=Passif, trous de n° par journal, exclusion brouillons | `trialBalanceService.ts:46-217` |
| OK-5 | — | Taux IS/TVA pays | ✅ CONFORME | Taux IS & TVA par pays cohérents entre `isCalculation` et `syscohada.ts` | `utils/isCalculation.ts:8-26` ; `shared/.../syscohada.ts:109-132` |

**Synthèse sévérités** : P0 conditionnel : 0 (F-01 devient P0 si l'audit Proph3t est utilisé en certification). **P1 : 7** (F-01, F-02, F-03, F-04, F-07, F-08, F-15, F-19 → en réalité 8). **P2 : 9**. **P3 : 8**. **Conformités validées : 5.**
