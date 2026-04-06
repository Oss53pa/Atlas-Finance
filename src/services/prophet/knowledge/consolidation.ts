
/**
 * Knowledge Base — Consolidation SYSCOHADA, Multi-devises, Analytique,
 * Provisions, Immobilisations avancées, Scoring, Règles métier
 */
import type { SyscohadaKnowledgeChunk } from '../../proph3t/types/knowledge';

export const consolidationKnowledge: SyscohadaKnowledgeChunk[] = [
  // ── CONSOLIDATION ──────────────────────────────────────────
  {
    id: 'conso-001',
    category: 'consolidation',
    title: 'AUDCIF art. 74-99 — Comptes consolidés SYSCOHADA',
    content: `Les articles 74 à 99 de l'Acte Uniforme OHADA relatif au Droit Comptable et à l'Information Financière (AUDCIF) définissent les obligations de consolidation. Toute entité contrôlant une ou plusieurs autres entités doit établir des comptes consolidés annuels comprenant le bilan consolidé, le compte de résultat consolidé et les notes annexes. Le périmètre de consolidation inclut la société mère et toutes les filiales sous contrôle exclusif, contrôle conjoint ou influence notable. L'exercice de consolidation doit coïncider avec celui de la société mère. Les comptes individuels doivent être retraités selon les méthodes du groupe avant consolidation.`,
    legal_references: ['AUDCIF art. 74', 'AUDCIF art. 75', 'AUDCIF art. 76', 'AUDCIF art. 77-99'],
    keywords: ['consolidation', 'comptes consolides', 'perimetre', 'societe mere', 'filiale', 'AUDCIF', 'controle exclusif', 'groupe'],
  },
  {
    id: 'conso-002',
    category: 'consolidation',
    title: 'Méthodes de consolidation OHADA — Guide pratique',
    content: `Trois méthodes de consolidation sont prévues par le SYSCOHADA : (1) Intégration globale — pour les filiales sous contrôle exclusif (>50% des droits de vote). Les actifs, passifs, charges et produits sont intégrés à 100%, les intérêts minoritaires sont isolés au passif (compte 14). (2) Intégration proportionnelle — pour les co-entreprises sous contrôle conjoint. Intégration au prorata du taux de détention. (3) Mise en équivalence — pour les entités sous influence notable (20-50%). Seule la quote-part des capitaux propres et du résultat est reprise. L'écart d'acquisition (goodwill) est la différence entre le prix d'acquisition et la quote-part de l'actif net juste valeur. Il est amorti sur sa durée d'utilité estimée (max 20 ans) selon SYSCOHADA.`,
    legal_references: ['AUDCIF art. 80', 'AUDCIF art. 81', 'AUDCIF art. 82', 'AUDCIF art. 83'],
    keywords: ['integration globale', 'integration proportionnelle', 'mise en equivalence', 'goodwill', 'ecart acquisition', 'interets minoritaires', 'taux detention'],
  },
  {
    id: 'conso-003',
    category: 'consolidation',
    title: 'Éliminations inter-sociétés en consolidation SYSCOHADA',
    content: `Lors de la consolidation, toutes les transactions entre entités du groupe doivent être éliminées : (1) Créances et dettes réciproques : les comptes 41X (clients) de l'entité vendeuse et 40X (fournisseurs) de l'entité acheteuse s'annulent. (2) Produits et charges réciproques : les ventes (compte 70X) de l'une et les achats (compte 60X) de l'autre s'éliminent. (3) Dividendes intra-groupe : les produits de participations (compte 77X) reçus d'une filiale sont éliminés. (4) Profits internes sur stocks : si une entité du groupe a vendu des stocks à une autre avec marge, le profit non réalisé à la clôture est éliminé. (5) Plus-values internes sur cessions d'immobilisations entre entités du groupe.`,
    legal_references: ['AUDCIF art. 85', 'AUDCIF art. 86', 'AUDCIF art. 87'],
    keywords: ['elimination', 'intercompany', 'reciproque', 'creance', 'dette', 'profit interne', 'stocks', 'dividende'],
  },

  // ── MULTI-DEVISES ──────────────────────────────────────────
  {
    id: 'devise-001',
    category: 'devises',
    title: 'SYSCOHADA art. 37 — Opérations en devises étrangères',
    content: `L'article 37 du SYSCOHADA révisé traite des opérations en devises : (1) À la date de transaction : les opérations en devises sont converties au cours du jour de la transaction. (2) À la clôture : les éléments monétaires (créances, dettes, trésorerie) sont réévalués au cours de clôture. Les éléments non monétaires restent au cours historique. (3) Les différences de change sont comptabilisées : gains latents → compte 4786 (écarts de conversion passif) ; pertes latentes → compte 4784 (écarts de conversion actif) avec constitution d'une provision pour risques de change (compte 1971). (4) À la date de règlement : les gains de change réalisés → compte 776 ; les pertes de change réalisées → compte 676. Zone UEMOA : parité fixe 1 EUR = 655,957 FCFA (XOF). Zone CEMAC : parité fixe 1 EUR = 655,957 FCFA (XAF).`,
    legal_references: ['SYSCOHADA art. 37', 'SYSCOHADA art. 52-10', 'Accord monétaire UEMOA/CEMAC'],
    keywords: ['devise', 'change', 'conversion', 'taux', 'XOF', 'XAF', 'EUR', 'BCEAO', 'BEAC', 'ecart conversion', '776', '676', '4784', '4786', 'cloture'],
  },
  {
    id: 'devise-002',
    category: 'devises',
    title: 'Taux de change BCEAO/BEAC — Méthodes de conversion',
    content: `Dans l'espace OHADA, deux zones monétaires coexistent : (1) Zone UEMOA (8 pays : Bénin, Burkina Faso, Côte d'Ivoire, Guinée-Bissau, Mali, Niger, Sénégal, Togo) utilisant le franc CFA (XOF) émis par la BCEAO, arrimé à l'euro : 1 EUR = 655,957 XOF. (2) Zone CEMAC (6 pays : Cameroun, Centrafrique, Congo, Gabon, Guinée équatoriale, Tchad) utilisant le franc CFA (XAF) émis par la BEAC, même parité fixe. (3) Autres pays OHADA : Comores (KMF, parité fixe EUR), Guinée (GNF, taux flottant), RDC (CDF, taux flottant). Pour la consolidation multi-devises : méthode du cours de clôture pour le bilan, cours moyen pour le compte de résultat, cours historique pour les capitaux propres. L'écart de conversion est porté en capitaux propres consolidés.`,
    legal_references: ['Traité UEMOA art. 6', 'Convention CEMAC', 'SYSCOHADA art. 37'],
    keywords: ['BCEAO', 'BEAC', 'UEMOA', 'CEMAC', 'XOF', 'XAF', 'KMF', 'GNF', 'parite fixe', 'euro', 'cours cloture', 'cours moyen'],
  },

  // ── CRÉDIT-BAIL ────────────────────────────────────────────
  {
    id: 'immo-cb-001',
    category: 'immobilisations',
    title: 'SYSCOHADA art. 52 — Traitement du crédit-bail',
    content: `Le SYSCOHADA révisé maintient le traitement du crédit-bail hors bilan (contrairement à IFRS 16) : (1) Chez le preneur : les redevances de crédit-bail sont comptabilisées en charges (compte 623 — Redevances de crédit-bail). Le bien n'apparaît pas au bilan du preneur. En fin de contrat, si le preneur lève l'option d'achat, le bien est inscrit à l'actif pour le prix de levée d'option. (2) Information en annexe obligatoire : engagements de crédit-bail ventilés par échéance (<1 an, 1-5 ans, >5 ans). (3) Cependant, certains pays OHADA ayant adopté les normes IFRS localement autorisent le traitement IFRS 16 : inscription au bilan d'un droit d'utilisation (actif) et d'une dette locative (passif), avec amortissement du droit d'utilisation et charge d'intérêts sur la dette.`,
    legal_references: ['SYSCOHADA art. 52', 'SYSCOHADA art. 52-1', 'IFRS 16'],
    keywords: ['credit bail', 'leasing', 'hors bilan', 'redevance', '623', 'option achat', 'IFRS 16', 'droit utilisation', 'dette locative'],
  },

  // ── DÉFAILLANCE / ALTMAN ───────────────────────────────────
  {
    id: 'audit-altman-001',
    category: 'audit',
    title: 'Altman Z-score — Application marchés émergents africains',
    content: `Le modèle Altman Z''-score adapté aux marchés émergents et aux entreprises non cotées utilise 4 ratios : Z'' = 6,56×X1 + 3,26×X2 + 6,72×X3 + 1,05×X4. X1 = Fonds de Roulement / Total Actif (liquidité). X2 = Résultats non distribués (Report à nouveau + Réserves) / Total Actif (rentabilité cumulée). X3 = Résultat d'exploitation (EBIT) / Total Actif (productivité des actifs). X4 = Valeur comptable des Capitaux Propres / Total Dettes (structure financière). Interprétation : Z'' > 2,6 = zone sûre ; 1,1 < Z'' < 2,6 = zone grise ; Z'' < 1,1 = zone de danger (risque élevé de défaillance dans les 2 ans). Attention : le modèle a été calibré sur des données américaines, les seuils peuvent nécessiter un ajustement pour le contexte africain OHADA.`,
    legal_references: ['Altman E.I. (1968, 2005)', 'OHADA art. 547 — Continuité exploitation'],
    keywords: ['altman', 'z-score', 'defaillance', 'risque', 'faillite', 'solvabilite', 'BFR', 'EBIT', 'capitaux propres', 'zone danger'],
  },

  // ── RÈGLES OHADA ───────────────────────────────────────────
  {
    id: 'regles-001',
    category: 'regles_ohada',
    title: 'OHADA art. 664-3 — Convocation AG pertes importantes',
    content: `L'article 664-3 de l'Acte Uniforme OHADA relatif au Droit des Sociétés Commerciales et du GIE dispose que lorsque les capitaux propres deviennent inférieurs à la moitié du capital social, le gérant (SARL) ou le conseil d'administration (SA) doit convoquer l'assemblée générale extraordinaire dans les 4 mois suivant l'approbation des comptes ayant fait apparaître la perte. L'assemblée doit se prononcer sur la dissolution anticipée ou la poursuite de l'activité. En cas de poursuite, la société dispose de 2 exercices pour reconstituer ses capitaux propres à un niveau au moins égal à la moitié du capital. À défaut, tout intéressé peut demander la dissolution judiciaire.`,
    legal_references: ['OHADA AUSCGIE art. 664-3', 'OHADA AUSCGIE art. 664-4', 'OHADA AUSCGIE art. 664-5'],
    keywords: ['capitaux propres', 'capital', 'pertes', 'AG', 'assemblee generale', 'dissolution', 'continuite', '664-3'],
  },
  {
    id: 'regles-002',
    category: 'regles_ohada',
    title: 'OHADA art. 547 — Continuité d\'exploitation',
    content: `Le principe de continuité d'exploitation est fondamental en SYSCOHADA. L'article 547 impose au dirigeant de déclencher une procédure d'alerte lorsque des faits de nature à compromettre la continuité de l'exploitation sont détectés. Indicateurs de rupture de continuité : (1) Capitaux propres négatifs. (2) Résultat net négatif sur 3 exercices consécutifs. (3) Incapacité de payer les dettes échues (cessation de paiement). (4) Perte de la moitié du capital social (art. 664-3). (5) Trésorerie nette constamment négative. (6) Perte de clients ou fournisseurs majeurs. Si la continuité n'est plus assurée, les comptes doivent être établis en valeurs liquidatives et une note annexe doit le mentionner.`,
    legal_references: ['OHADA AUSCGIE art. 547', 'SYSCOHADA art. 39', 'ISA 570'],
    keywords: ['continuite exploitation', 'going concern', 'alerte', 'cessation paiement', 'liquidation', 'capitaux negatifs'],
  },

  // ── PROVISIONS (SYSCOHADA art. 38-42) ──────────────────────
  {
    id: 'provisions-001',
    category: 'cloture',
    title: 'SYSCOHADA art. 38-42 — Provisions et dépréciations',
    content: `Les articles 38 à 42 du SYSCOHADA définissent le traitement des provisions : (1) Provisions pour dépréciation des créances (compte 491) : constituées lorsque le recouvrement d'une créance est incertain. Méthodes : individuelle (créance par créance) ou statistique (balance âgée avec taux par tranche). Dotation au compte 6594. (2) Provisions pour dépréciation des stocks (compte 39X) : constituées lorsque la valeur nette de réalisation est inférieure au coût. Dotation au compte 6593. (3) Provisions pour risques et charges (comptes 19X) : litiges en cours (191), garanties données (194), restructurations (195), grosses réparations (1572). Dotation au compte 691X. (4) Reprises de provisions quand le risque disparaît : compte 791X (exploitation), 797 (financier), 7971 (HAO). Principe de non-compensation : on ne compense jamais dotation et reprise.`,
    legal_references: ['SYSCOHADA art. 38', 'SYSCOHADA art. 39', 'SYSCOHADA art. 40', 'SYSCOHADA art. 41', 'SYSCOHADA art. 42'],
    keywords: ['provision', 'depreciation', 'creance douteuse', '491', '39X', '19X', 'dotation', 'reprise', 'balance agee', 'stock', 'risque', 'litige'],
  },

  // ── COMPTABILITÉ ANALYTIQUE ────────────────────────────────
  {
    id: 'analytique-001',
    category: 'analytique',
    title: 'Comptabilité analytique SYSCOHADA — Classes 9',
    content: `Le SYSCOHADA prévoit l'utilisation de la classe 9 pour la comptabilité analytique de gestion. La comptabilité analytique n'est pas obligatoire mais fortement recommandée pour les entreprises dépassant certains seuils. Elle permet : (1) Le calcul des coûts de revient par produit, activité ou centre de responsabilité. (2) L'analyse de la rentabilité par segment. (3) Le contrôle budgétaire (comparaison budget/réalisé). (4) Les clés de répartition des charges indirectes : prorata du chiffre d'affaires, prorata de l'effectif, prorata de la surface, clés fixes négociées. Comptes utilisés : 90X (comptes de liaison), 92X (charges incorporées), 93X (produits incorporés), 97X (différences d'incorporation). La ventilation analytique doit être cohérente avec la comptabilité générale (contrôle de concordance).`,
    legal_references: ['SYSCOHADA Titre V — Comptabilité analytique', 'AUDCIF art. 17'],
    keywords: ['analytique', 'centre cout', 'repartition', 'budget', 'realise', 'ecart', 'classe 9', 'cout revient', 'rentabilite', 'segment'],
  },

  // ── ÉTATS FINANCIERS TAFIRE ────────────────────────────────
  {
    id: 'etats-tafire-001',
    category: 'etats_financiers',
    title: 'TAFIRE — Tableau Financier des Ressources et Emplois SYSCOHADA',
    content: `Le TAFIRE est un état financier obligatoire pour les entreprises du système normal SYSCOHADA. Il remplace le tableau de financement classique et le tableau de flux de trésorerie. Structure : (1ère partie) Détermination de la CAF (Capacité d'Autofinancement) : Résultat net + Dotations nettes (DAP - reprises) − Plus-values de cession + Moins-values de cession. (2ème partie) Tableau de financement : Ressources = CAF + Cessions d'immobilisations + Augmentation de capital + Emprunts nouveaux. Emplois = Investissements + Remboursements d'emprunts + Distributions de dividendes. Variation du BFR = Variation stocks + Variation créances − Variation dettes. Variation de trésorerie = Ressources nettes − Emplois nets ± Variation BFR. Le solde doit correspondre à la variation des comptes de trésorerie (classe 5).`,
    legal_references: ['SYSCOHADA art. 28', 'AUDCIF art. 32', 'AUDCIF art. 33'],
    keywords: ['TAFIRE', 'CAF', 'autofinancement', 'tableau financement', 'flux', 'tresorerie', 'BFR', 'ressources', 'emplois', 'investissement'],
  },
];
