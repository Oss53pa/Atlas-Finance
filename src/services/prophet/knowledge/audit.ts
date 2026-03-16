// @ts-nocheck
/**
 * Knowledge Base — Audit et contrôle interne
 * Normes ISA, assertions, matérialité, procédures
 */
import type { SyscohadaKnowledgeChunk } from '../../proph3t/types/knowledge';

export const auditKnowledge: SyscohadaKnowledgeChunk[] = [
  {
    id: 'audit_assertions',
    category: 'audit',
    title: "Les 7 assertions d'audit (ISA 315)",
    content: `Les assertions sont les critères de qualité que les états financiers doivent satisfaire :

Pour les flux (charges/produits) :
1. Réalité (Occurrence) : les opérations enregistrées se sont réellement produites
2. Exhaustivité (Completeness) : toutes les opérations sont enregistrées
3. Exactitude (Accuracy) : les montants sont corrects
4. Séparation des exercices (Cut-off) : les opérations sont enregistrées dans le bon exercice
5. Classification : les opérations sont imputées dans les bons comptes

Pour les soldes (actif/passif) :
6. Existence : les actifs et passifs existent réellement à la date du bilan
7. Valorisation (Valuation) : les éléments sont évalués correctement
8. Droits et obligations : l'entité détient les droits sur les actifs

Pour la présentation :
9. Classification et compréhensibilité
10. Exactitude et valorisation`,
    legal_references: ['ISA 315', 'ISA 500'],
    keywords: ['assertions', 'audit', 'ISA 315', 'réalité', 'exhaustivité', 'exactitude', 'cut-off'],
  },
  {
    id: 'audit_materialite',
    category: 'audit',
    title: 'Seuil de matérialité (ISA 320)',
    content: `Le seuil de matérialité est le montant au-delà duquel une erreur influence la décision des utilisateurs.

Méthodes de calcul courantes :
1. % du résultat courant : 5% à 10% (si résultat stable)
2. % du CA : 0,5% à 2%
3. % du total actif : 1% à 2%
4. % des capitaux propres : 2% à 5%

En pratique OHADA :
- Grandes entreprises : 5% du résultat courant avant impôt
- PME : 1-2% du CA
- Entités déficitaires : 1% du total actif

Matérialité de performance (ISA 320.11) : généralement 50-75% du seuil de matérialité global.
Seuil de remontée des anomalies : généralement 5% du seuil de matérialité.

L'auditeur peut réviser le seuil en cours d'audit si de nouvelles informations apparaissent.`,
    legal_references: ['ISA 320', 'ISA 450'],
    keywords: ['matérialité', 'seuil', 'ISA 320', 'erreur significative', 'audit'],
  },
  {
    id: 'audit_echantillonnage',
    category: 'audit',
    title: "Échantillonnage en audit (ISA 530)",
    content: `L'échantillonnage permet de tirer des conclusions sur une population à partir d'un sous-ensemble.

Méthodes :
1. Échantillonnage statistique : sélection aléatoire, extrapolation des résultats
2. Échantillonnage non-statistique : jugement professionnel

Taille d'échantillon : facteurs déterminants :
- Taille de la population
- Risque acceptable d'erreur
- Taux d'erreur attendu
- Seuil de matérialité

Méthodes de sélection :
- Aléatoire simple
- Systématique (tous les N éléments)
- Par unité monétaire (MUS/PPS) : probabilité proportionnelle au montant
- Stratifié : division en sous-populations homogènes

En zone OHADA, l'échantillonnage par unité monétaire est recommandé pour les soldes clients et stocks.`,
    legal_references: ['ISA 530'],
    keywords: ['échantillonnage', 'ISA 530', 'statistique', 'MUS', 'PPS', 'population'],
  },
  {
    id: 'audit_procedures',
    category: 'audit',
    title: "Procédures d'audit substantives",
    content: `Les procédures substantives visent à détecter les anomalies significatives au niveau des assertions.

1. Tests de détail :
   - Confirmation externe (banques, clients, fournisseurs) — ISA 505
   - Inspection physique (stocks, immobilisations)
   - Examen des pièces justificatives
   - Recalcul (amortissements, provisions, TVA)
   - Analyse des journaux comptables

2. Procédures analytiques substantives :
   - Comparaison N / N-1 (variations significatives)
   - Analyse des ratios (marge, rotation stocks, DSO)
   - Test de vraisemblance (charges de personnel / effectif)
   - Analyse de Benford sur les premiers chiffres

3. Procédures spécifiques SYSCOHADA :
   - Vérification de l'équilibre Débit = Crédit
   - Contrôle du sens normal des soldes (classe 1-5 au bilan, 6-7 gestion)
   - Vérification Actif = Passif
   - Cohérence résultat bilan / résultat compte de résultat`,
    legal_references: ['ISA 500', 'ISA 505', 'ISA 520'],
    keywords: ['procédures', 'audit', 'substantives', 'tests détail', 'analytiques', 'confirmation'],
  },
  {
    id: 'audit_fraude',
    category: 'audit',
    title: 'Détection de la fraude (ISA 240)',
    content: `L'auditeur doit considérer le risque de fraude tout au long de sa mission.

Triangle de la fraude (Cressey) :
1. Pression (besoin financier, objectifs irréalistes)
2. Opportunité (contrôle interne faible)
3. Rationalisation (justification morale)

Indicateurs d'alerte (red flags) :
- Écritures passées à des dates/heures inhabituelles (week-end, nuit)
- Écritures manuelles de montants ronds ou juste sous un seuil d'approbation
- Distribution non conforme à Benford des premiers chiffres
- Augmentation inexpliquée de la marge ou du CA en fin d'exercice
- Comptes clients ou fournisseurs avec soldes inhabituels
- Transactions circulaires ou avec des parties liées non divulguées

Tests PROPH3T :
- Analyse de Benford (tool analyser_benford)
- Détection des écritures week-end/nuit
- Identification des montants juste sous les seuils
- Recherche de schémas répétitifs (mêmes montants, mêmes comptes)`,
    legal_references: ['ISA 240', 'ISA 315'],
    keywords: ['fraude', 'ISA 240', 'Benford', 'red flags', 'triangle', 'anomalies'],
  },
  {
    id: 'audit_rapport',
    category: 'audit',
    title: "Rapport d'audit et opinions (ISA 700-705)",
    content: `L'auditeur émet une opinion sur les états financiers :

1. Opinion non modifiée (sans réserve) : les EF donnent une image fidèle — ISA 700
2. Opinion avec réserve : désaccord ou limitation sur un point non pervasif — ISA 705
3. Opinion défavorable : les EF ne donnent PAS une image fidèle (désaccord pervasif) — ISA 705
4. Impossibilité d'exprimer une opinion : limitation pervasive des travaux — ISA 705

Paragraphes d'emphase (ISA 706) :
- Observation : attirer l'attention sur un point sans modifier l'opinion
- Incertitude significative sur la continuité d'exploitation (ISA 570)

En zone OHADA, le Commissaire aux Comptes est nommé pour 6 exercices (AUSCGIE Art. 694).
Son rapport doit être présenté à l'AG dans les 6 mois suivant la clôture.`,
    legal_references: ['ISA 700, 705, 706', 'AUSCGIE Art. 694-715'],
    keywords: ['rapport', 'opinion', 'réserve', 'CAC', 'commissaire comptes', 'ISA 700'],
  },
  {
    id: 'audit_controle_interne',
    category: 'audit',
    title: 'Évaluation du contrôle interne (ISA 315)',
    content: `L'évaluation du contrôle interne est une étape essentielle de l'audit.

Composantes du contrôle interne (COSO) :
1. Environnement de contrôle : culture, éthique, gouvernance
2. Évaluation des risques : identification et gestion des risques
3. Activités de contrôle : séparation des fonctions, autorisations, rapprochements
4. Information et communication : systèmes d'information, reporting
5. Pilotage : supervision et suivi des contrôles

Séparation des fonctions clés :
- Autorisation ≠ Exécution ≠ Enregistrement ≠ Conservation
- Exemple : celui qui commande ≠ celui qui réceptionne ≠ celui qui paie

Points d'attention en PME OHADA :
- Concentration des pouvoirs (dirigeant = comptable)
- Absence de rapprochements bancaires réguliers
- Factures sans bon de commande préalable
- Pas de suivi des créances échues`,
    legal_references: ['ISA 315', 'COSO 2013'],
    keywords: ['contrôle interne', 'ISA 315', 'COSO', 'séparation fonctions', 'risques'],
  },
  {
    id: 'audit_confirmation_externe',
    category: 'audit',
    title: 'Confirmations externes (ISA 505)',
    content: `La confirmation externe (circularisation) est une preuve d'audit de haute qualité.

Comptes concernés :
1. Banques : soldes, emprunts, garanties, engagements hors bilan
2. Clients : soldes débiteurs, litiges, retours
3. Fournisseurs : soldes créditeurs, avoirs à recevoir
4. Avocats : litiges en cours, provisions
5. Administrations fiscales et sociales

Types :
- Confirmation positive : demander au tiers de confirmer le solde
- Confirmation négative : demander de répondre uniquement en cas de désaccord

Taux de réponse attendu :
- Banques : 100% (obligatoire)
- Clients : 60-80%
- Fournisseurs : 40-60%

Non-réponses : procédures alternatives obligatoires (examen des règlements ultérieurs, pièces).`,
    legal_references: ['ISA 505', 'ISA 500'],
    keywords: ['confirmation', 'circularisation', 'banques', 'clients', 'fournisseurs', 'ISA 505'],
  },
  {
    id: 'audit_continuite',
    category: 'audit',
    title: "Continuité d'exploitation (ISA 570)",
    content: `L'auditeur doit évaluer si l'entité peut poursuivre son activité dans un avenir prévisible (12 mois).

Indicateurs de doute :
- Financiers : capitaux propres < 50% du capital (AUSCGIE Art. 664), FR négatif persistant, déficits récurrents
- Opérationnels : perte de clients majeurs, difficultés d'approvisionnement
- Juridiques : redressement judiciaire, litiges significatifs

En droit OHADA (AUSCGIE Art. 664) :
Si les capitaux propres deviennent inférieurs à la moitié du capital social, l'AG doit être convoquée dans les 4 mois pour décider de la dissolution ou de la continuation.

Conséquences comptables si discontinuité :
- Évaluation des actifs en valeur liquidative (pas en coût historique)
- Reclassement des dettes LT en CT
- Mention obligatoire dans les notes annexes`,
    legal_references: ['ISA 570', 'AUSCGIE Art. 664-665', 'AUDCIF Art. 39'],
    keywords: ['continuité', 'exploitation', 'ISA 570', 'going concern', 'dissolution', 'capitaux propres'],
  },
  {
    id: 'audit_cycle_ventes',
    category: 'audit',
    title: 'Audit du cycle ventes-clients',
    content: `Objectifs d'audit du cycle ventes-clients :
- Exhaustivité : toutes les ventes sont enregistrées
- Réalité : les ventes correspondent à des livraisons effectives
- Valorisation : les créances sont correctement évaluées (provisions clients douteux)
- Cut-off : les ventes sont rattachées au bon exercice

Procédures :
1. Rapprochement CA déclaré (TVA) / CA comptabilisé
2. Test de séquence numérique des factures
3. Circularisation des clients (ISA 505)
4. Analyse de l'ancienneté des créances (aging)
5. Test des dernières livraisons / premières factures N+1 (cut-off)
6. Revue des avoirs et retours après clôture
7. Évaluation de la provision pour créances douteuses (comptes 491)

Points d'attention SYSCOHADA :
- Compte 411 (clients) doit avoir un solde débiteur normal
- Les clients créditeurs doivent être reclassés en 419 (avances clients)`,
    legal_references: ['ISA 500, 505', 'AUDCIF Art. 39-41'],
    keywords: ['ventes', 'clients', 'créances', 'aging', 'circularisation', 'cut-off'],
  },
  {
    id: 'audit_cycle_achats',
    category: 'audit',
    title: 'Audit du cycle achats-fournisseurs',
    content: `Objectifs d'audit du cycle achats-fournisseurs :
- Réalité : les achats correspondent à des livraisons/prestations effectives
- Exhaustivité : toutes les charges sont enregistrées (FNP ?)
- Valorisation : les dettes sont correctement évaluées
- Séparation : les charges sont dans le bon exercice

Procédures :
1. Rapprochement bon de commande / bon de réception / facture (3-way match)
2. Circularisation des fournisseurs principaux
3. Recherche de factures non parvenues (FNP) : vérifier les réceptions sans facture
4. Test du cut-off : dernières réceptions avant clôture / premières factures N+1
5. Analyse des variations significatives charges N vs N-1
6. Vérification de la TVA déductible (droit à déduction)

Points d'attention SYSCOHADA :
- Compte 401 (fournisseurs) doit avoir un solde créditeur normal
- Les fournisseurs débiteurs → reclasser en 409 (avances fournisseurs)
- Vérifier la correcte imputation (601 marchandises vs 602 matières vs 604 services)`,
    legal_references: ['ISA 500', 'AUDCIF Art. 17'],
    keywords: ['achats', 'fournisseurs', 'FNP', '3-way match', 'cut-off', 'dettes'],
  },
  {
    id: 'audit_rapprochement_bancaire',
    category: 'audit',
    title: 'Rapprochement bancaire',
    content: `Le rapprochement bancaire est un contrôle fondamental de la trésorerie.

Principe : rapprocher le solde comptable (compte 52x) avec le solde du relevé bancaire à la même date.

Écarts courants :
1. Chèques émis non encaissés : comptabilisés mais pas débités par la banque
2. Virements reçus non comptabilisés : crédités par la banque mais pas enregistrés
3. Frais bancaires non comptabilisés
4. Erreurs de saisie (montant, sens)

Points d'attention pour l'auditeur :
- Ancienneté des éléments en rapprochement (> 3 mois = suspect)
- Rapprochements non effectués = risque de fraude
- Solde du relevé ≠ solde comptable → réconciliation obligatoire
- Vérifier que les écarts anciens sont justifiés et régularisés

Le rapprochement doit être fait mensuellement. En audit, c'est une procédure substantive incontournable.`,
    legal_references: ['ISA 500', 'AUDCIF Art. 45-47'],
    keywords: ['rapprochement bancaire', 'trésorerie', 'banque', 'réconciliation', 'écarts'],
  },
];
