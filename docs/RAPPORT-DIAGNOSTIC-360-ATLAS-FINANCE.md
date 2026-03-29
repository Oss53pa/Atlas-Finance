# RAPPORT DÉTAILLÉ — DIAGNOSTIC 360° DE TOUS LES MODULES

## Confrontation Simulation Comptable vs Code Réel d'Atlas Finance

**Date :** 28 Mars 2026
**Version :** Atlas Finance / WiseBook ERP
**Référentiel :** SYSCOHADA Révisé — Système Normal
**Méthode :** Simulation exhaustive d'un exercice comptable complet (COSMOS MALL SA) confrontée à l'analyse du code source
**Périmètre :** 16 modules, 116 sous-modules, ~583 écritures simulées

---

## LÉGENDE

| Symbole | Signification |
|---------|--------------|
| ✅ 100% | Fonctionnel, testé, production-ready |
| ⚠️ Partiel | Infrastructure existe mais incomplet ou non connecté |
| 🔴 Absent | Pas implémenté du tout |
| 📄 UI Only | Interface existe mais pas de logique métier derrière |
| 📚 Doc Only | Documenté dans la knowledge base Prophet mais pas opérationnalisé |

---

## TABLE DES MATIÈRES

1. [Module A — Cycle Locatif (Revenus)](#module-a--cycle-locatif-revenus)
2. [Module B — Cycle Achats / Fournisseurs](#module-b--cycle-achats--fournisseurs)
3. [Module C — Trésorerie & Règlements](#module-c--trésorerie--règlements)
4. [Module D — Lettrage](#module-d--lettrage)
5. [Module E — Rapprochements Bancaires](#module-e--rapprochements-bancaires)
6. [Module F — Recouvrement](#module-f--recouvrement)
7. [Module G — Immobilisations](#module-g--immobilisations)
8. [Module H — Paie & Charges Sociales](#module-h--paie--charges-sociales)
9. [Module I — Fiscalité](#module-i--fiscalité)
10. [Module J — Gestion Budgétaire](#module-j--gestion-budgétaire)
11. [Module K — Stocks](#module-k--stocks)
12. [Module L — Opérations Inter-Sociétés](#module-l--opérations-inter-sociétés)
13. [Module M — Opérations en Devises](#module-m--opérations-en-devises)
14. [Module N — Écritures de Clôture](#module-n--écritures-de-clôture)
15. [Module O — États de Synthèse](#module-o--états-de-synthèse)
16. [Tableau de Synthèse Global](#tableau-de-synthèse-global)
17. [Top 10 Lacunes Critiques](#top-10-des-lacunes-critiques)
18. [Points Forts](#points-forts)
19. [Conclusion](#conclusion)

---

## MODULE A — CYCLE LOCATIF (REVENUS)

### Verdict global : 🔴 MODULE QUASI-ABSENT (5%)

Ce module est le **coeur de métier** d'un centre commercial. C'est le plus critique et le plus absent.

### A.1 Quittancement / Appels de Fonds

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Génération automatique des appels de loyer mensuels | 🔴 Absent | Aucun service de facturation locataire n'existe. Pas de table `leases`, `rentInvoices`, `tenantBilling` |
| Calcul loyer HT + charges HT + TVA | 🔴 Absent | Pas de logique de calcul de loyer. Le plan comptable a les comptes 706x mais aucun service ne les alimente automatiquement |
| Quittance / reçu de paiement | 🔴 Absent | Pas de génération de quittance |
| Facturation récurrente mensuelle | 🔴 Absent | Pas de mécanisme de récurrence |

**Impact** : Impossible de générer automatiquement les appels de fonds. Tout doit être saisi manuellement comme écriture comptable.

### A.2 Gestion des Baux

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Table `leases` / Entité Bail | 🔴 Absent | Aucune table bail dans le schéma DB (`src/lib/db.ts`) ni dans les migrations Supabase |
| Franchise de loyer | 🔴 Absent | Pas de logique de période gratuite |
| Loyer progressif / paliers | 🔴 Absent | Pas de mécanisme de paliers |
| Avenant modificatif | 🔴 Absent | Pas de suivi des modifications |
| Indexation / révision annuelle | 🔴 Absent | Pas de calcul d'indexation (IPC, BCEAO) |
| Résiliation / sortie locataire | 🔴 Absent | Pas de workflow de fin de bail |
| Renouvellement automatique | 🔴 Absent | |
| Bail 3/6/9, précaire, saisonnier | 🔴 Absent | Aucune typologie de bail |

### A.3 Dépôts de Garantie

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Réception dépôt | 🔴 Absent | Pas de table `securityDeposits`. Le compte 165 existe dans le plan comptable mais aucun service ne le gère |
| Suivi / restitution | 🔴 Absent | |
| Retenues pour dégradations | 🔴 Absent | |
| Calcul intérêts sur dépôt | 🔴 Absent | |

### A.4 Fonds Marketing Mutualisé

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Facturation contribution marketing | 🔴 Absent | |
| Suivi du fonds (entrées/dépenses) | 🔴 Absent | |

### A.5 Revenus Parking

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Gestion des places | 🔴 Absent | Pas de table `parkingSpaces` |
| Tarification | 🔴 Absent | |
| Comptabilisation recettes | 🔴 Absent | Possible manuellement via écriture, mais pas de module dédié |

### A.6 Espaces Publicitaires & Événementiels

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Catalogue d'espaces | 🔴 Absent | |
| Réservation / planification | 🔴 Absent | |
| Facturation | 🔴 Absent | |

### A.7 Régularisation Annuelle des Charges

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Provision vs charges réelles | 🔴 Absent | Pas de logique de comparaison charges appelées / charges réelles |
| Appel complémentaire / avoir | 🔴 Absent | |
| Clés de répartition par surface | 🔴 Absent | |

### A.8–A.10 Avenants, Résiliation, Indexation

Tous **🔴 Absents**.

### Ce qui existe partiellement

| Élément | Statut | Détail |
|---------|--------|--------|
| FundCallsPage.tsx | 📄 UI Only | Page "Appels de Fonds" mais conçue pour des appels de fonds génériques (workflow validation), **pas pour la facturation locative** |
| Plan comptable 706x | ✅ Existe | Les comptes de produits locatifs existent dans le plan comptable |
| Système tiers (thirdParties) | ⚠️ Partiel | Les clients/locataires peuvent être saisis comme tiers, mais sans lien avec un bail |

---

## MODULE B — CYCLE ACHATS / FOURNISSEURS

### Verdict global : ⚠️ PARTIELLEMENT FONCTIONNEL (40%)

### Ce qui fonctionne

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Saisie d'écriture comptable achat | ✅ 100% | Via le journal de saisie. D 6xx + D 445 / C 401. Fonctionne correctement |
| Plan comptable fournisseurs | ✅ 100% | Comptes 401xxx, 408, 409 présents |
| TVA déductible | ✅ 100% | Compte 445100 géré, calcul TVA fonctionnel (`src/utils/tvaValidation.ts`) |
| Lettrage fournisseurs | ✅ 100% | 4 algorithmes de rapprochement (`src/services/lettrageService.ts`) |

### Ce qui est partiel

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Retenue de garantie (RG 5%) | ⚠️ Partiel | Possible via saisie manuelle (comptes 4017xx) mais **pas de workflow automatisé** ni de suivi des RG avec libération |
| Avoir fournisseur | ⚠️ Partiel | Saisie manuelle possible (écriture inverse) mais **pas de lien automatique** facture → avoir |
| Facture en devise EUR | ⚠️ Partiel | Le service `exchangeRateService` gère les taux historiques mais **pas de conversion automatique** lors de la saisie d'une facture fournisseur en devise |
| Facture non parvenue (FNP) | ⚠️ Partiel | Le service de régularisation (`regularisationsService.ts`) gère les FNP en clôture, mais **pas de workflow de suivi en cours d'année** |
| Retenue à la source non-résident | ⚠️ Partiel | Le calcul existe (`retenueSourceCalc.ts`) mais **pas intégré dans le flux de paiement** fournisseur |

### Ce qui manque

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Bon de commande / Circuit d'achat | 🔴 Absent | Pas de module de commande fournisseur, pas de three-way matching (commande/réception/facture) |
| Réception de marchandise | 🔴 Absent | |
| Facture contestée / litige | 🔴 Absent | Pas de compte d'attente automatisé, pas de workflow de litige |
| Contrats fournisseurs | 🔴 Absent | Pas de gestion des contrats (renouvellement, échéance, conditions) |
| Escompte fournisseur | 🔴 Absent | Pas de calcul d'escompte pour paiement anticipé |

---

## MODULE C — TRÉSORERIE & RÈGLEMENTS

### Verdict global : ⚠️ PARTIELLEMENT FONCTIONNEL (45%)

### Ce qui fonctionne très bien

| Fonctionnalité | Statut | Fichier clé |
|---------------|--------|-------------|
| **Rapprochement bancaire** | ✅ 95% | `rapprochementBancaireService.ts` — Import CSV, 4 algorithmes de matching, score de confiance, état de rapprochement SYSCOHADA, lettrage automatique |
| Position de trésorerie dynamique | ✅ 100% | `positionService.ts` — Calcul des soldes depuis les écritures validées (comptes 52x, 53x) |
| Soldes bancaires en temps réel | ✅ 100% | Calcul dynamique depuis `journalEntries` |

### Ce qui est partiel

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Encaissements clients (virement) | ⚠️ Partiel | Saisie manuelle (D 521 / C 411) fonctionne. Mais **pas de workflow de règlement client** automatisé |
| Décaissements fournisseurs | ⚠️ Partiel | Saisie manuelle fonctionne. **Pas de lot de paiement**, pas d'ordre de virement |
| Virement interne (compte 585) | ⚠️ Partiel | Le compte 585 existe. La saisie manuelle fonctionne. **Pas de workflow dédié** (2 écritures automatiques) |
| Gestion des emprunts | 📄 UI Only | `SimpleLoansPage.tsx` — Interface squelette avec statistiques, mais **aucune logique de calcul** (pas de tableau d'amortissement, pas de génération d'échéances) |
| Prévisions de trésorerie | ⚠️ Partiel | `treasury-advanced.service.ts` — Endpoints API définis mais **pas de logique de calcul** |
| Effets de commerce | ⚠️ Partiel | `effetsCommerceService.ts` — Lettres de change et billets à ordre gérés, mais **pas les chèques simples** |

### Ce qui manque

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Chèque à encaisser (5112) | 🔴 Absent | Pas de registre de chèques entrants, pas de workflow remise en banque |
| Chèque impayé / rejeté | 🔴 Absent | Pas de gestion automatique du rejet (réimputation client + frais) |
| Mobile Money (Orange Money, Wave) | 🔴 Absent | Type de paiement défini dans l'interface mais **aucune intégration** |
| TPE / Carte bancaire | 🔴 Absent | Idem — type défini, pas d'intégration |
| Brouillard de caisse | 🔴 Absent | Pas de module de caisse quotidien (ouverture/clôture, comptage, écart) |
| Approvisionnement caisse ↔ banque | 🔴 Absent | Pas de workflow dédié |
| Tableau d'amortissement d'emprunt | 🔴 Absent | Pas de génération de tableau, pas de calcul d'intérêts, pas d'échéancier |
| Gestion de découvert | 🔴 Absent | |
| Paiement par lot / batch | 🔴 Absent | Pas de traitement groupé des paiements |

---

## MODULE D — LETTRAGE

### Verdict global : ✅ FONCTIONNEL (90%)

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Lettrage automatique | ✅ 100% | 4 algorithmes : exact, tolérance, référence, somme-N (`src/services/lettrageService.ts`) |
| Lettrage manuel | ✅ 100% | Sélection utilisateur + application |
| Délettrage | ✅ 100% | Suppression des codes de lettrage |
| Comptes clients (411) | ✅ 100% | |
| Comptes fournisseurs (401) | ✅ 100% | |
| Statistiques de lettrage | ✅ 100% | Taux de lettrage par compte, montants non lettrés |
| Interface utilisateur | ✅ 100% | `LettragePage.tsx`, `LettrageAutomatiquePage.tsx` |
| Lettrage TVA | 🔴 Absent | Pas de rapprochement TVA déclarée / TVA comptabilisée |
| Lettrage comptes personnel | 🔴 Absent | Pas de lettrage 421/431 |

---

## MODULE E — RAPPROCHEMENTS BANCAIRES

### Verdict global : ✅ FONCTIONNEL (85%)

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Import relevé CSV | ✅ 100% | Format Date;Libellé;Référence;Débit;Crédit;Solde |
| Matching automatique | ✅ 100% | 4 niveaux : exact, tolérance, référence, somme-N |
| Score de confiance | ✅ 100% | 0 à 1, par élément |
| État de rapprochement SYSCOHADA | ✅ 100% | `genererEtatRapprochement()` conforme |
| Écritures de régularisation | ⚠️ Partiel | Identification des écarts mais **pas de génération automatique** des écritures |
| Import MT940 / OFX | 🔴 Absent | Mentionné dans le code mais non implémenté |
| Multi-devises | 🔴 Absent | |
| Historique des rapprochements | ⚠️ Partiel | Tables `rapprochements` et `lignes_rapprochement` créées (migration 000006) mais **persistance non confirmée** dans le service |
| Suivi des suspens >30 jours | 🔴 Absent | |

---

## MODULE F — RECOUVREMENT

### Verdict global : ✅ FONCTIONNEL (80%)

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Balance âgée (0-30, 31-60, 61-90, >90j) | ✅ 100% | `RecouvrementModule.tsx` — Buckets complets avec scoring |
| Relance amiable / ferme | ✅ 100% | Types d'actions : appel, email, courrier, SMS, visite |
| Mise en demeure | ✅ 100% | Action de type "mise en demeure" avec suivi |
| Passage en créance douteuse (416) | ✅ 100% | Reclassement 411 → 416 géré |
| Provisionnement (491) | ✅ 100% | Dotation 659400 / 491000 |
| Contentieux judiciaire | ✅ 100% | Statut "judiciaire", coordination avocat/huissier |
| Créance irrécouvrable | ⚠️ Partiel | Le concept existe mais **pas de régularisation TVA automatique** (annulation TVA collectée sur créance perdue) |
| Échéancier négocié | ✅ 100% | Plan de remboursement avec échéances |
| KPIs recouvrement | ✅ 100% | DSO, taux de recouvrement, taux de couverture provisions |
| Intérêts de retard | 🔴 Absent | Pas de calcul automatique des pénalités contractuelles |

---

## MODULE G — IMMOBILISATIONS

### Verdict global : ✅ FONCTIONNEL (75%)

### Ce qui fonctionne parfaitement

| Fonctionnalité | Statut | Fichier clé |
|---------------|--------|-------------|
| Registre des immobilisations | ✅ 100% | `DBAsset` dans `db.ts`, 22 pages UI dédiées |
| Amortissement linéaire | ✅ 100% | `packages/core/src/services/depreciationService.ts` + `src/utils/depreciationService.ts` |
| Amortissement dégressif | ✅ 100% | Double-declining avec coefficients SYSCOHADA (1,5× / 2× / 2,5×) |
| Bascule dégressif → linéaire | ✅ 100% | Automatique quand linéaire > dégressif |
| Prorata temporis 360 jours | ✅ 100% | Conforme SYSCOHADA (12 × 30) |
| Cession via compte 481 (4 étapes) | ✅ 100% | `depreciationPostingService.ts` — Sortie VO, annulation amort., produit cession, résultat. Validation solde 481 = 0 |
| VNC jamais négative | ✅ 100% | Guard implémenté (AF-I06) |
| Bouclage Σ annuités = VO | ✅ 100% | Ajustement dernière annuité (AF-I09) |
| Tableau d'amortissement | ✅ 100% | Génération complète année par année |
| Réévaluation libre/légale | ✅ 100% | `reevaluationService.ts` — Preview + exécution, comptes 1051/1052 |
| Posting comptable | ✅ 100% | D 681x / C 28xx avec mise à jour cumul |

### Ce qui est partiel

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Approche par composants | 📄 UI Only | Onglet "Composants" dans le formulaire asset, mais **pas de calcul séparé par composant**, pas de durées différentes par composant |
| Immobilisations en cours | ⚠️ Partiel | Le compte 239000 existe et les acomptes peuvent être saisis, mais **pas de workflow de capitalisation** (transfert en-cours → actif) |
| Inventaire physique | 📄 UI Only | `InventairePhysiquePage.tsx` — Interface complète (sessions, comptage, écarts, photos) mais **données mock**, pas de persistance |
| Test de dépréciation | 📄 UI Only | Interface dans la section clôture avec champs (valeur recouvrable, valeur d'utilité) mais **aucune logique de calcul ni de posting** |
| Mise au rebut | ⚠️ Partiel | Le statut `scrapped` existe dans le DB schema mais **pas d'écriture comptable dédiée** (traité comme cession à prix zéro) |

### Ce qui manque

| Fonctionnalité | Statut |
|---------------|--------|
| Remplacement de composant | 🔴 Absent |
| Transfert d'immobilisation entre sites | 🔴 Absent |
| Changement de méthode d'amortissement | 🔴 Absent |
| Rattrapage d'amortissement rétroactif | 🔴 Absent |
| Reprise de dépréciation | 🔴 Absent |
| Intérêts intercalaires (capitalisation pendant construction) | 🔴 Absent |

---

## MODULE H — PAIE & CHARGES SOCIALES

### Verdict global : ⚠️ CALCULS OK, MODULE OPÉRATIONNEL ABSENT (50%)

### Ce qui fonctionne (moteur de calcul)

| Fonctionnalité | Statut | Fichier clé |
|---------------|--------|-------------|
| Calcul bulletin de paie (CI, SN, CM) | ✅ 100% | `src/utils/paieCalculation.ts` — Brut, cotisations, net |
| CNPS salariale/patronale avec plafonds | ✅ 100% | PF 5,75%, AT 2%, Retraite 7,7%/6,3%, plafond 70 000/j |
| IRPP / IGR par tranche | ✅ 100% | `src/utils/irppCalculation.ts` — 8 tranches CI, quotient familial |
| Taxes employeur (ITS, CN) | ✅ 100% | `src/utils/taxesSalairesCalc.ts` — 14+ pays OHADA |
| FDFP (TA 0,4% + FC 1,2%) | ✅ 100% | Intégré au calcul paie |
| Heures supplémentaires | ✅ 100% | Majoration paramétrable |
| Avantages en nature | ✅ 100% | Intégrés au calcul |
| Indemnités non imposables | ✅ 100% | Séparées du brut imposable |
| Retenue source non-résidents | ✅ 100% | `src/utils/retenueSourceCalc.ts` — 17 pays, BIC/BNC/loyers/dividendes |

### Ce qui est documenté mais pas opérationnalisé

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Écritures comptables de paie | 📚 Doc Only | `prophet/knowledge/paie.ts` documente les schémas D 661 / C 421, C 431, C 447, mais **pas de génération automatique d'écritures** depuis le bulletin |
| Provision 13ème mois | 📚 Doc Only | Documenté dans `cloture.ts` (D 6611 / C 4286) mais **pas de calcul automatique mensuel** |
| Provision congés payés | 📚 Doc Only | Documenté (D 6612 / C 4282) mais **pas de suivi par salarié** |
| Solde de tout compte | 📚 Doc Only | Documenté dans `paie_licenciement` mais **aucune fonction de calcul** |
| Congé maternité | 📚 Doc Only | Aucune gestion |

### Ce qui manque complètement

| Fonctionnalité | Statut |
|---------------|--------|
| **Module RH / Gestion des employés** | 🔴 Absent — Pas de table `employees`, pas de fiche salarié, pas de contrat |
| **Interface bulletin de paie** | 🔴 Absent — Le calcul existe mais aucune page UI pour générer/visualiser les bulletins |
| **Registre de paie** | 🔴 Absent — Pas de journal de paie récapitulatif |
| **Batch de paie mensuel** | 🔴 Absent — Pas de traitement groupé |
| **Posting automatique paie → journal** | 🔴 Absent — Le calcul ne crée pas d'écritures comptables |
| **Gestion des absences** | 🔴 Absent |
| **Gestion des congés** | 🔴 Absent |
| **DISA (déclaration annuelle)** | 🔴 Absent |
| **Avance sur salaire** | 🔴 Absent |
| **Prêt au personnel** | 🔴 Absent |
| **SMIG / validation salaire minimum** | 🔴 Absent |

**En résumé** : Le **moteur de calcul** est excellent (3 pays, barèmes complets, multi-cotisations). Mais il n'y a **aucun module opérationnel** — pas de fiche employé, pas d'interface bulletin, pas de posting automatique. C'est un moteur sans carrosserie.

---

## MODULE I — FISCALITÉ

### Verdict global : ✅ CALCULS EXCELLENTS (70%)

### Ce qui fonctionne

| Fonctionnalité | Statut | Fichier clé |
|---------------|--------|-------------|
| TVA mensuelle (collectée − déductible) | ✅ 100% | `declarationFiscaleService.ts`, `tvaValidation.ts` — 17 pays OHADA |
| Taux TVA par pays | ✅ 100% | CI 18%/9%, SN 18%/10%, CM 19,25% avec CAC |
| IS / BIC calcul | ✅ 100% | `taxationService.ts` — Résultat fiscal, réintégrations, minimum forfaitaire |
| Minimum forfaitaire (IMF) | ✅ 100% | CI 0,5% CA min 3M, SN 0,5% min 500K |
| Patente | ✅ 100% | `patenteCalculation.ts` — Barèmes CI/CM/SN |
| Précompte sur achats | ✅ 100% | `precompteCalculation.ts` — 3 pays, seuils |
| Retenue à la source | ✅ 100% | `retenueSourceCalc.ts` — BIC, BNC, loyers, dividendes, intérêts, non-résidents |
| Détection automatique taxes | ✅ 100% | `TaxDetectionEngine.ts` — Détecte les taxes déclenchées depuis les comptes actifs |
| Dashboard fiscal | ✅ 100% | `TaxationDashboard.tsx`, `LiasseFiscalePage.tsx` |
| Échéances fiscales | ✅ 100% | `EcheancesFiscalesPage.tsx` — Alertes délais |

### Ce qui manque

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Acomptes IS trimestriels | 🔴 Absent | Pas de workflow de versement d'acomptes (449200) ni de suivi |
| Contribution foncière | 🔴 Absent | Pas de calcul (dépend de la valeur locative cadastrale) |
| Report déficit fiscal | 🔴 Absent | Pas de suivi multi-exercice des déficits reportables |
| Liasse fiscale complète | ⚠️ Partiel | Page existe mais pas de génération automatique des annexes |
| AIRSI | 🔴 Absent | |
| TVA export / taux zéro | ⚠️ Partiel | Taux 0% défini mais pas de workflow d'identification |
| Génération PDF déclarations | 🔴 Absent | |
| E-filing (télédéclaration) | 🔴 Absent | |

---

## MODULE J — GESTION BUDGÉTAIRE

### Verdict global : ✅ FONCTIONNEL (80%)

### Ce qui fonctionne

| Fonctionnalité | Statut | Fichier clé |
|---------------|--------|-------------|
| Création budget (matrice mois × comptes) | ✅ 100% | `budget.service.ts` (1 028 lignes) |
| Budget vs Réalisé | ✅ 100% | `budgetAnalysisService.ts` — Écarts, % |
| Alertes budgétaires | ✅ 100% | Seuils paramétrables depuis `settings`, 4 niveaux de sévérité |
| Taux d'exécution | ✅ 100% | `getTauxExecution()` |
| Dashboard budget | ✅ 100% | 5 pages UI dédiées |
| Comptabilité analytique (axes, sections) | ✅ 100% | `analytics.service.ts` — Multi-axes, hiérarchique |
| Centres de coût | ✅ 100% | Types admin/opérationnel/support, budgets par section |
| Ventilation analytique | ✅ 100% | Trigger SQL Σ ≤ 100% |

### Ce qui manque

| Fonctionnalité | Statut |
|---------------|--------|
| Versionnement B0/B1/B2 (workflow comparaison) | ⚠️ Partiel — Champ `version` existe mais pas de workflow |
| Budget de trésorerie | 🔴 Absent |
| Budget d'investissement (CAPEX) | 🔴 Absent |
| Projection à fin d'année | 🔴 Absent |

---

## MODULE K — STOCKS

### Verdict global : ✅ FONCTIONNEL (85%)

| Fonctionnalité | Statut | Fichier clé |
|---------------|--------|-------------|
| Fiches articles | ✅ 100% | `inventoryService.ts` (545 lignes) |
| CUMP (Coût Unitaire Moyen Pondéré) | ✅ 100% | Recalcul automatique à chaque mouvement |
| FIFO | ✅ 100% | Méthode alternative avec couches de coût |
| Mouvements (entrée, sortie, ajustement, transfert) | ✅ 100% | Quantité + coût unitaire + total |
| Variation de stocks (compte 603) | ✅ 100% | Génération écriture D 603x / C 3x ou inverse |
| KPIs (rupture, surstock, valeur) | ✅ 100% | |
| Provision dépréciation stocks | 🔴 Absent | Pas de gestion d'obsolescence |
| Inventaire physique stocks | 🔴 Absent | Pas de workflow de comptage |

---

## MODULE L — OPÉRATIONS INTER-SOCIÉTÉS

### Verdict global : ⚠️ INFRASTRUCTURE SEULEMENT (25%)

| Fonctionnalité | Statut | Détail |
|---------------|--------|--------|
| Types de consolidation | ⚠️ Types définis | `consolidationService.ts` — Intégration globale, proportionnelle, mise en équivalence |
| Liens de participation | ⚠️ Types définis | Mother-subsidiary, % détention, goodwill |
| Éliminations intra-groupe | ⚠️ Types définis | Flag d'élimination sur opérations |
| Intérêts minoritaires | ⚠️ Types définis | Calcul (100 − holding%) × résultat |
| **Implémentation réelle** | 🔴 Absent | **Aucune méthode de service implémentée** — uniquement des interfaces TypeScript |

---

## MODULE M — OPÉRATIONS EN DEVISES

### Verdict global : ⚠️ PARTIEL (40%)

| Fonctionnalité | Statut | Fichier clé |
|---------------|--------|-------------|
| Taux de change (saisie, import) | ✅ 100% | `exchangeRateService.ts` |
| Taux historique (SYSCOHADA art. 48) | ✅ 100% | `getHistoricalRate()` |
| Conversion de montants | ✅ 100% | `convert()` |
| Import atomique (RPC) | ✅ 100% | Migration `20240101000012_atomic_operations.sql` |
| Positions en devises | ✅ 100% | `getCurrencyPositions()` |
| Couverture (hedging) | ✅ 100% | Forward, option, swap |
| Page MultiCurrency | ✅ 100% | `MultiCurrency.tsx` — base XAF, dynamique |
| Écarts de conversion clôture (476/477) | ✅ 100% | Edge Function `reevaluation-devises` (AF-T06) |
| Écart de change au règlement (676/776) | 🔴 Absent | **Pas de calcul automatique** du gain/perte de change lors du paiement d'une facture en devise |
| Extourne écarts de conversion | ⚠️ Partiel | Prévu dans l'Edge Function mais **pas testé** |

---

## MODULE N — ÉCRITURES DE CLÔTURE

### Verdict global : ✅ FONCTIONNEL (85%)

| Fonctionnalité | Statut | Fichier clé |
|---------------|--------|-------------|
| Orchestrateur de clôture (7 étapes) | ✅ 100% | `closureOrchestrator.ts` — Contrôles → Amort. → Régul. → Verrouillage → Résultat → Reports → Finalisation |
| CCA (476) | ✅ 100% | `regularisationsService.ts` — Prorata temporis, auto-extourne |
| PCA (477) | ✅ 100% | Idem |
| FNP (408) | ✅ 100% | Idem |
| FAE (418) | ✅ 100% | Idem |
| Affectation résultat N-1 | ✅ 100% | `affectationResultatService.ts` — Réserve légale (10% jusqu'à 20% du capital), dividendes, RAN |
| Report à nouveau | ✅ 100% | `carryForwardService.ts` — Écritures d'AN |
| Extournes | ✅ 100% | `extourneService.ts` — Contrepassation automatique |
| Clôture mensuelle | ✅ 100% | 5 sous-étapes |
| Provisions risques | ⚠️ Partiel | Possible manuellement, **pas de calcul automatique** |
| Engagement hors bilan | 🔴 Absent | Pas de module de suivi |
| Événements post-clôture | 🔴 Absent | |

---

## MODULE O — ÉTATS DE SYNTHÈSE

### Verdict global : ✅ FONCTIONNEL (90%)

| État | Statut | Fichier clé |
|------|--------|-------------|
| Balance générale (avant/après inventaire) | ✅ 100% | RPC `get_trial_balance` + service local |
| Bilan SYSCOHADA (Actif/Passif, brut/amort/net) | ✅ 100% | `financial_statements.service.ts` — Structure complète |
| Compte de résultat SYSCOHADA | ✅ 100% | Avec cascade produits/charges |
| SIG (9 soldes intermédiaires) | ✅ 100% | MB, VA, EBE, RE, RF, RAO, RHAO, RAI, RN |
| TAFIRE | ✅ 100% | `tafireService.ts` — Méthodes directe et indirecte, bouclage avec tolérance |
| Ratios financiers (20+) | ✅ 100% | Structure, liquidité, rotation, rentabilité |
| Notes annexes (immobilisations) | ⚠️ Partiel | Tableau des immobilisations disponible, **mais pas les tableaux d'amortissements/provisions au format annexe** |
| Comparatif N / N-1 | 🔴 Absent | Pas de multi-période |

---

## TABLEAU DE SYNTHÈSE GLOBAL

| # | Module | Score | Calculs | UI | Workflow | Données |
|---|--------|:-----:|:-------:|:--:|:--------:|:-------:|
| A | Cycle Locatif | **5%** | 🔴 | 📄 | 🔴 | 🔴 |
| B | Achats/Fournisseurs | **40%** | ✅ | ⚠️ | 🔴 | ⚠️ |
| C | Trésorerie | **45%** | ✅ | ⚠️ | 🔴 | ⚠️ |
| D | Lettrage | **90%** | ✅ | ✅ | ✅ | ✅ |
| E | Rapprochement Bancaire | **85%** | ✅ | ✅ | ✅ | ⚠️ |
| F | Recouvrement | **80%** | ✅ | ✅ | ✅ | ✅ |
| G | Immobilisations | **75%** | ✅ | ✅ | ⚠️ | ✅ |
| H | Paie | **50%** | ✅ | 🔴 | 🔴 | 🔴 |
| I | Fiscalité | **70%** | ✅ | ✅ | ⚠️ | ⚠️ |
| J | Budget/Analytique | **80%** | ✅ | ✅ | ✅ | ✅ |
| K | Stocks | **85%** | ✅ | ⚠️ | ⚠️ | ✅ |
| L | Inter-Sociétés | **25%** | 🔴 | 🔴 | 🔴 | ⚠️ |
| M | Devises | **40%** | ✅ | ✅ | ⚠️ | ⚠️ |
| N | Clôture | **85%** | ✅ | ✅ | ✅ | ✅ |
| O | États Financiers | **90%** | ✅ | ✅ | ✅ | ✅ |
| P | Contrôles Croisés | **75%** | ✅ | ⚠️ | ⚠️ | ⚠️ |

**Score moyen pondéré : ~63%**

---

## TOP 10 DES LACUNES CRITIQUES

Par ordre de priorité business :

| # | Lacune | Module | Impact | Effort estimé |
|---|--------|--------|--------|---------------|
| **1** | **Aucun module de gestion locative** (baux, facturation, dépôts) | A | 🔴 Bloquant pour immobilier | Très élevé |
| **2** | **Module RH/Paie inexistant** (employés, bulletins, posting) malgré moteur de calcul | H | 🔴 Bloquant pour toute entreprise | Élevé |
| **3** | **Pas de workflow de paiement** (ordres de virement, lots, validation) | C | 🟠 Critique opérationnel | Moyen |
| **4** | **Pas de gestion de caisse** (brouillard, comptage, écart) | C | 🟠 Critique opérationnel | Moyen |
| **5** | **Pas de tableau d'amortissement d'emprunt** | C | 🟠 Critique financier | Faible |
| **6** | **Pas de circuit d'achat** (commande, réception, facture) | B | 🟡 Important | Élevé |
| **7** | **Composants bâtiment non calculés** séparément | G | 🟡 Non-conformité SYSCOHADA | Moyen |
| **8** | **Acomptes IS non gérés** | I | 🟡 Risque fiscal | Faible |
| **9** | **Consolidation non implémentée** (types seulement) | L | 🟡 Groupes uniquement | Élevé |
| **10** | **Gain/perte de change au règlement** non automatique | M | 🟡 Non-conformité | Faible |

---

## POINTS FORTS

Ce qui est réellement excellent dans Atlas Finance :

| Domaine | Appréciation | Fichier clé |
|---------|-------------|-------------|
| **Rapprochement bancaire** | Production-ready. 4 algorithmes, scoring, état SYSCOHADA | `rapprochementBancaireService.ts` |
| **Lettrage** | Complet, multi-algorithme, avec statistiques | `lettrageService.ts` |
| **Amortissements** | Linéaire, dégressif, bascule, prorata 360j, cession 481, réévaluation | `depreciationService.ts`, `depreciationPostingService.ts` |
| **Moteur fiscal** | 17 pays OHADA, TVA/IS/IRPP/retenues/patente/précompte | `tvaValidation.ts`, `taxationService.ts`, etc. |
| **Moteur de paie** | 3 pays, barèmes complets, CNPS plafonnée, HS, avantages nature | `paieCalculation.ts`, `irppCalculation.ts` |
| **États financiers** | Bilan, CR, SIG, TAFIRE, ratios — structure SYSCOHADA complète | `financial_statements.service.ts`, `tafireService.ts` |
| **Clôture** | Orchestrateur 7 étapes, CCA/PCA/FNP/FAE, affectation résultat, reports | `closureOrchestrator.ts` |
| **Budget/Analytique** | Multi-axes, alertes, centres de coût, ventilation | `budget.service.ts`, `analytics.service.ts` |
| **Architecture technique** | DataAdapter (Dexie/Supabase/Hybrid), Money/Decimal.js, hash chain SHA-256, RLS multi-tenant | Architecture globale |

---

## CONCLUSION

Atlas Finance est un **excellent moteur comptable et fiscal** avec des **fondations techniques solides** (architecture DataAdapter, précision Decimal.js, intégrité SHA-256, multi-tenant RLS). Le coeur comptable (saisie, lettrage, rapprochement, clôture, états financiers) est fonctionnel et conforme SYSCOHADA.

### Les deux lacunes majeures

1. **L'absence totale de module de gestion locative** (baux, facturation automatique, dépôts, indexation, régularisation charges) — bloquant pour tout usage en gestion immobilière/centre commercial
2. **L'absence de module RH/Paie opérationnel** malgré un moteur de calcul complet et précis (3 pays, barèmes exacts) — le moteur existe mais il n'y a ni interface, ni fiche employé, ni posting automatique

### Le paradoxe principal

Les **moteurs de calcul** sont souvent excellents (paie, fiscalité, amortissements, stocks) mais il manque les **couches opérationnelles** (UI, workflow, persistance, posting automatique) pour les rendre utilisables par un comptable ou un gestionnaire au quotidien.

### Recommandation

Pour atteindre une couverture fonctionnelle de 85%+ :
1. Créer le module de gestion locative (tables leases, units, deposits + services + UI)
2. Créer le module RH/Paie (tables employees, payslips + interface + auto-posting)
3. Ajouter les workflows de paiement (ordres, lots, validation)
4. Implémenter le brouillard de caisse
5. Ajouter le tableau d'amortissement d'emprunt

---

*Rapport généré le 28 Mars 2026 — Atlas Finance / WiseBook ERP*
*Méthode : Simulation comptable exhaustive (COSMOS MALL SA, 12 mois, 583 écritures) confrontée à l'analyse statique du code source*
