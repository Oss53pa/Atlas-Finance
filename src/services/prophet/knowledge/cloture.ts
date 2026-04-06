
/**
 * Knowledge Base — Procédures de clôture comptable
 * Checklist, provisions, régularisations, report à nouveau
 */
import type { SyscohadaKnowledgeChunk } from '../../proph3t/types/knowledge';

export const clotureKnowledge: SyscohadaKnowledgeChunk[] = [
  {
    id: 'cloture_checklist_mensuelle',
    category: 'cloture',
    title: 'Checklist de clôture mensuelle',
    content: `Opérations mensuelles avant clôture provisoire :
1. Rapprochements bancaires (tous les comptes 52x)
2. Lettrage des comptes clients (411) et fournisseurs (401)
3. Comptabilisation de la paie et des charges sociales
4. Déclaration TVA (liquidation 4431/4452 → 4441)
5. Comptabilisation des factures fournisseurs reçues
6. Analyse des balances âgées clients et fournisseurs
7. Vérification de l'équilibre débit = crédit
8. Vérification des soldes aberrants (sens anormal)
9. État de rapprochement caisse physique vs compte 57x
10. Archivage des pièces justificatives du mois

Points de vigilance :
- Aucune écriture ne doit être passée sur un mois clôturé
- Le lettrage mensuel facilite grandement la clôture annuelle`,
    legal_references: ['AUDCIF Art. 16 (obligation de tenir les livres)'],
    keywords: ['clôture mensuelle', 'checklist', 'rapprochement', 'lettrage', 'TVA'],
  },
  {
    id: 'cloture_checklist_annuelle',
    category: 'cloture',
    title: 'Checklist de clôture annuelle SYSCOHADA',
    content: `Étapes de la clôture annuelle (dans l'ordre) :

Phase 1 — Pré-clôture (M-1 à M0)
1. Inventaire physique des stocks et immobilisations
2. Confirmation des soldes bancaires au 31/12
3. Circularisation clients/fournisseurs/avocats
4. Rapprochement exhaustif de tous les comptes de tiers

Phase 2 — Régularisations (M0)
5. Charges Constatées d'Avance (CCA) → compte 476
6. Factures Non Parvenues (FNP) → compte 408
7. Factures À Établir (FAE) → compte 418
8. Produits Constatés d'Avance (PCA) → compte 477
9. Provision pour congés payés
10. Provision pour gratification / 13ème mois
11. Provision pour risques et charges
12. Provision pour dépréciation de créances (clients douteux)
13. Variation de stocks (inventaire permanent ou intermittent)

Phase 3 — Amortissements et dépréciations (M0)
14. Dotations aux amortissements (681/28x)
15. Tests de dépréciation des immobilisations
16. Dépréciation des stocks obsolètes (39x)

Phase 4 — Fiscalité (M0 à M+1)
17. Calcul IS provisoire → écriture 695/441
18. Calcul participation employés (si applicable)
19. Réconciliation CA comptable / CA déclaré TVA

Phase 5 — Validation (M+1 à M+4)
20. Vérification globale D = C, Actif = Passif
21. Génération des états financiers SYSCOHADA
22. Revue par le CAC
23. Approbation par l'AG et dépôt (dans les 4 mois)`,
    legal_references: ['AUDCIF Art. 8, 23', 'AUSCGIE Art. 140-143'],
    keywords: ['clôture annuelle', 'checklist', 'inventaire', 'régularisations', 'amortissements', 'IS'],
  },
  {
    id: 'cloture_provisions',
    category: 'cloture',
    title: 'Provisions et dépréciations à la clôture',
    content: `Les provisions et dépréciations à constater en clôture :

1. Provisions pour dépréciation de créances clients (491)
   - Évaluation par client de la probabilité de non-recouvrement
   - Taux courants : 25% (retard 90j), 50% (retard 180j), 100% (retard >360j ou litige)
   - Écriture : D 6594 → C 491

2. Dépréciation des stocks (39x)
   - Stocks obsolètes, endommagés ou à rotation lente
   - Valoriser au plus bas entre coût et valeur nette de réalisation
   - Écriture : D 659x → C 39x

3. Provisions pour risques et charges (19x)
   - Litiges en cours (consultation des avocats)
   - Garanties données aux clients
   - Restructurations décidées
   - Écriture : D 691x → C 19x

4. Provision pour congés payés
   - Obligation si congés acquis non pris à la clôture
   - D 6612 → C 4282

5. Provision pour impôts (441)
   - IS estimé non encore liquidé
   - D 695 → C 441

Règle SYSCOHADA : les provisions sont obligatoires dès que le risque est probable et le montant estimable (principe de prudence).`,
    legal_references: ['AUDCIF Art. 46-48', 'SYSCOHADA révisé Art. 46'],
    keywords: ['provisions', 'dépréciation', 'créances douteuses', 'stocks', 'risques', 'clôture'],
  },
  {
    id: 'cloture_report_nouveau',
    category: 'cloture',
    title: 'Report à nouveau et ouverture du nouvel exercice',
    content: `Le report à nouveau (RAN) connecte deux exercices successifs.

Après affectation du résultat par l'AG :
- Si bénéfice non distribué → 121 Report à nouveau créditeur
- Si perte → 129 Report à nouveau débiteur

Écritures d'ouverture N+1 :
1. Reprise des soldes bilanciels (classes 1-5)
   - Les comptes de bilan sont reportés : soldes identiques au 31/12 N = 01/01 N+1
   - Principe d'intangibilité du bilan d'ouverture (AUDCIF Art. 34)

2. Extourne des régularisations
   - Contre-passer les CCA, FNP, FAE, PCA
   - D 6xx → C 476 (extourne CCA)
   - D 408 → C 6xx (extourne FNP)
   - etc.

3. Les comptes de gestion (classes 6-7) sont remis à zéro
   - Ils ne sont pas reportés
   - Le résultat est transféré en classe 1 (131/139 puis RAN après AG)

4. Vérification post-ouverture :
   - Balance d'ouverture N+1 = Balance de clôture N (classes 1-5)
   - Total D = Total C en ouverture
   - Comptes 6/7 à zéro`,
    legal_references: ['AUDCIF Art. 34 (intangibilité)', 'AUSCGIE Art. 143'],
    keywords: ['report à nouveau', 'ouverture', 'extourne', 'bilan', 'intangibilité'],
  },
  {
    id: 'cloture_cut_off',
    category: 'cloture',
    title: 'Séparation des exercices (cut-off)',
    content: `Le principe d'indépendance des exercices (AUDCIF Art. 48) impose de rattacher chaque opération à l'exercice auquel elle se rapporte.

Cas courants :

1. Charges payées d'avance (CCA 476)
   Loyer janvier N+1 payé en décembre N → CCA
   D 476 CCA → C 6xx (montant de janvier)

2. Charges à payer non facturées (FNP 408)
   Prestation reçue en décembre N, facture en janvier N+1 → FNP
   D 6xx → C 408 FNP (montant estimé)

3. Produits constatés d'avance (PCA 477)
   Abonnement encaissé en décembre N couvrant janvier N+1 → PCA
   D 7xx → C 477 PCA

4. Produits à recevoir (FAE 418)
   Prestation livrée en décembre N, facture en janvier N+1 → FAE
   D 418 FAE → C 7xx

Points critiques pour l'audit :
- Examiner les 5 derniers jours de décembre et les 5 premiers jours de janvier
- Vérifier la concordance entre bons de livraison et factures
- Le cut-off est la première cause de retraitements en audit`,
    legal_references: ['AUDCIF Art. 48', 'ISA 500'],
    keywords: ['cut-off', 'séparation exercices', 'CCA', 'FNP', 'FAE', 'PCA', 'régularisation'],
  },
  {
    id: 'cloture_amortissements',
    category: 'cloture',
    title: 'Amortissements en clôture SYSCOHADA',
    content: `Les amortissements doivent être calculés et comptabilisés à la clôture de chaque exercice.

Méthodes autorisées :
1. Linéaire (par défaut) : annuité constante = Base / Durée
2. Dégressif : coefficient × taux linéaire (si autorisé fiscalement)
3. Unités d'œuvre : proportionnel à l'utilisation

Règles SYSCOHADA révisé :
- La durée d'amortissement doit refléter la durée d'utilité réelle (pas la durée fiscale)
- Si durée fiscale ≠ durée comptable → amortissement dérogatoire (compte 151/851)
- Prorata temporis obligatoire en première et dernière année
- La valeur résiduelle est déduite de la base amortissable si significative

Écriture :
D 681 Dotations aux amortissements d'exploitation ... annuité
  C 28x Amortissements des immobilisations .......... annuité

Vérification en audit :
- Tableau d'amortissement cohérent avec la fiche immobilisation
- Dates de mise en service correctes
- Durées conformes aux usages du secteur
- Immobilisations totalement amorties toujours en service → à signaler`,
    legal_references: ['AUDCIF Art. 28-30, 45', 'SYSCOHADA révisé 2017 Art. 28-30'],
    keywords: ['amortissement', 'clôture', 'linéaire', 'dégressif', 'dotation', 'durée', 'prorata'],
  },
  {
    id: 'cloture_inventaire_physique',
    category: 'cloture',
    title: 'Inventaire physique obligatoire',
    content: `L'inventaire physique est obligatoire au moins une fois par exercice (AUDCIF Art. 43).

Éléments à inventorier :
1. Stocks (marchandises, matières, produits finis, en-cours)
2. Immobilisations corporelles (existence et état)
3. Caisse (comptage physique des espèces)
4. Effets de commerce (traites, billets à ordre)

Organisation :
- Planification : équipes, zones, procédure de comptage
- Double comptage recommandé (indépendance)
- Date : au plus proche du 31/12 (si décalage, ajuster les mouvements intercalaires)
- Documentation : feuilles de comptage numérotées, signées

Écarts d'inventaire :
- Stock physique > stock comptable : D 3x → C 603x (bonus)
- Stock physique < stock comptable : D 603x → C 3x (malus/perte)
- Rechercher les causes : vol, casse, erreurs de saisie

Présence de l'auditeur :
L'auditeur doit assister à l'inventaire physique (ISA 501) pour vérifier :
- La procédure est correctement appliquée
- Les comptages sont fiables
- Les écarts sont investigués`,
    legal_references: ['AUDCIF Art. 43', 'ISA 501'],
    keywords: ['inventaire', 'physique', 'stocks', 'comptage', 'écarts', 'caisse'],
  },
  {
    id: 'cloture_is_comptabilisation',
    category: 'cloture',
    title: "Comptabilisation de l'IS en clôture",
    content: `L'IS doit être provisionné en clôture (principe d'indépendance des exercices).

Calcul de l'IS provisionné :
1. Résultat comptable avant impôt
2. + Réintégrations (charges non déductibles : amendes, dons excessifs, amortissements excédentaires)
3. - Déductions (produits exonérés, plus-values réinvesties)
4. = Résultat fiscal
5. - Déficits antérieurs reportables
6. = Base imposable
7. × Taux IS du pays
8. = IS brut
9. Comparaison avec le minimum d'imposition → IS dû = Max(IS brut, IMF)
10. - Acomptes versés
11. = Solde IS à payer (ou crédit d'impôt)

Écriture de provision IS :
D 695 Impôt sur les bénéfices ........... IS dû
  C 441 État, impôt sur les bénéfices .... IS dû

Si acomptes > IS dû :
D 4495 État, crédit d'IS ................ excédent
  C 695 Impôt sur les bénéfices ......... excédent

L'IS définitif sera ajusté lors de la déclaration fiscale (M+3/M+4).`,
    legal_references: ['AUDCIF Art. 48', 'CGI-CI Art. 1-36', 'CGI-CM Art. 1-20'],
    keywords: ['IS', 'impôt', 'provision', 'clôture', 'réintégrations', 'déductions', 'résultat fiscal'],
  },
];
