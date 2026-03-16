// ═══════════════════════════════════════════════════════════════════════════
// PROPH3T — COMPLÉMENT KNOWLEDGE BASE
// Ce fichier complète le prompt d'implémentation précédent.
// Il couvre les 4 lacunes identifiées dans le gap analysis :
//
// LACUNE 1 — Fiscalité 13 pays OHADA manquants (barèmes complets)
// LACUNE 2 — Consolidation groupe IG / IP / MEE avec écritures
// LACUNE 3 — Crédit-bail côté bailleur
// LACUNE 4 — Prorata TVA, Prix de transfert, Normes ISA/COSO
//
// À ajouter dans : src/services/proph3t/knowledge/
// Script de chargement : npm run populate-knowledge
// ═══════════════════════════════════════════════════════════════════════════

import type { SyscohadaKnowledgeChunk } from '../types/knowledge'

// ═══════════════════════════════════════════════════════════════════════════
// LACUNE 1 — FISCALITÉ 17 PAYS OHADA COMPLETS
// Les 4 pays prioritaires (CI, SN, CM, GA) sont dans le prompt principal.
// Ce fichier complète les 13 pays restants + enrichit les 4 existants.
// ═══════════════════════════════════════════════════════════════════════════

export const FISCALITE_17_PAYS_CHUNKS: SyscohadaKnowledgeChunk[] = [

  // ─────────────────────────────────────────────────────────────────────
  // BURKINA FASO (BF) — Zone UEMOA
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'fisc-bf-is-001',
    category: 'fiscalite_bf',
    title: 'IS Burkina Faso — Taux et calcul',
    content: `Taux IS : 27.5% sur le bénéfice fiscal net.
IMF (Impôt Minimum Forfaitaire) : 0.5% du CA HT, minimum 500 000 XOF.
L'IS est dû si IS > IMF. En cas de déficit : IMF seul dû.
Report déficitaire : 5 ans (le plus généreux de l'UEMOA).
Acomptes : 2 acomptes provisionnels (avril et juillet), chacun = 1/3 IS N-1.
Échéance déclaration : 30 avril N+1.
Réintégrations courantes : amendes et pénalités, dons > 1% CA,
amortissements excédentaires, charges somptuaires, rémunérations excessives.
Déductions : dividendes de filiales (régime mère-fille, détention > 25%).
Référence : CGI-BF Loi 058-2017.`,
    legal_references: ['CGI-BF Loi 058-2017 Art. 1-65', 'CGI-BF Art. 66-85 (IMF)'],
    examples_fcfa: 'CA = 800M XOF, Bénéfice = 120M → IS = 120M × 27.5% = 33M. IMF = 800M × 0.5% = 4M < 33M → IS dû = 33M',
    keywords: ['burkina faso', 'is', 'bic', 'imf', 'taux', '27.5%', 'impôt sociétés']
  },
  {
    id: 'fisc-bf-tva-001',
    category: 'fiscalite_bf',
    title: 'TVA Burkina Faso — Taux et régimes',
    content: `Taux normal : 18%. Aucun taux réduit.
Exonérations : produits alimentaires de base (mil, sorgho, maïs local),
médicaments, matériel agricole, eau potable, fournitures scolaires.
Déclaration : mensuelle avant le 20 du mois suivant (grandes entreprises).
Trimestrielle avant le 20 du mois suivant le trimestre (PME, CA < 100M).
Régime simplifié : CA entre 30M et 100M XOF.
TVA non déductible : véhicules de tourisme, hébergement, logement,
cadeaux et échantillons > 20 000 XOF/unité.
Crédit de TVA : remboursable pour exportateurs (délai 3 mois théorique).
Mentions obligatoires facture : NIF vendeur+acheteur, numéro IFU.
Référence : CGI-BF Loi 058-2017 Art. 230-320.`,
    legal_references: ['CGI-BF Art. 230', 'CGI-BF Art. 280 (exonérations)'],
    examples_fcfa: 'Vente HT 1 000 000 XOF → TVA = 180 000 → TTC = 1 180 000',
    keywords: ['burkina faso', 'tva', '18%', 'taxe valeur ajoutée', 'déclaration']
  },
  {
    id: 'fisc-bf-irpp-001',
    category: 'fiscalite_bf',
    title: 'IRPP Burkina Faso — Barème et charges sociales',
    content: `Barème IRPP 2025 (annuel, tranches sur revenu net imposable) :
0 → 300 000 XOF : 0%
300 001 → 600 000 XOF : 12%
600 001 → 1 500 000 XOF : 22%
1 500 001 → 3 000 000 XOF : 30%
> 3 000 000 XOF : 35%

Abattement forfaitaire : 20% sur salaire brut imposable.
Abattements supplémentaires : charges de famille (50 000/enfant/an).

CNSS (Caisse Nationale Sécurité Sociale) :
- Salarial : 5.5% (retraite 3%, maternité 2.5%)
- Patronal : 16% (retraite 8%, AT 3.5%, PF 4.5%)
Plafond cotisations CNSS : 1 500 000 XOF/mois.

Cotisation de Développement (CD) : 1% salaire brut (patronal).
Référence : CGI-BF Art. 90-160, Code Travail BF.`,
    legal_references: ['CGI-BF Art. 90', 'Code Travail BF Art. 185'],
    examples_fcfa: 'Salaire brut 400 000 XOF : Base imposable = 400 000 × 80% = 320 000. IRPP annualisé → mensuel. CNSS salarial = 22 000',
    keywords: ['burkina faso', 'irpp', 'barème', 'impôt salaire', 'cnss', 'charges sociales']
  },

  // ─────────────────────────────────────────────────────────────────────
  // MALI (ML) — Zone UEMOA
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'fisc-ml-is-001',
    category: 'fiscalite_ml',
    title: 'IS Mali — Taux et calcul',
    content: `Taux IS : 30% sur le bénéfice fiscal net.
IMF (Impôt Minimum Forfaitaire) : 1% du CA HT, minimum 300 000 XOF.
Report déficitaire : 3 ans.
Acomptes : 2 acomptes (mars et juin), chacun = 1/3 IS N-1.
Échéance déclaration : 31 mars N+1.
Taxe patronale et apprentissage (TPA) : 2% masse salariale.
Versement patronal formation professionnelle (VPFP) : 0.5% masse salariale.
Contribution de solidarité sur les salaires : 1% masse salariale.
Référence : CGI-ML Loi 06-067/AN-RM.`,
    legal_references: ['CGI-ML Loi 06-067 Art. 1-80'],
    examples_fcfa: 'Bénéfice 50M, CA 300M → IS = 50M × 30% = 15M. IMF = 300M × 1% = 3M. IS > IMF → IS dû = 15M',
    keywords: ['mali', 'is', 'bic', 'taux 30%', 'imf', 'impôt sociétés']
  },
  {
    id: 'fisc-ml-irpp-001',
    category: 'fiscalite_ml',
    title: 'IRPP Mali — Barème et charges sociales',
    content: `Barème IRPP Mali 2025 (annuel) :
0 → 1 680 000 XOF : 3%
1 680 001 → 3 600 000 XOF : 8%
3 600 001 → 6 600 000 XOF : 15%
6 600 001 → 9 600 000 XOF : 20%
9 600 001 → 18 000 000 XOF : 25%
18 000 001 → 36 000 000 XOF : 30%
> 36 000 000 XOF : 35%

Retenue à la source mensuelle sur salaires : IRTS (Impôt sur les Revenus
de Traitements et Salaires) = abattement forfaitaire 30% + barème.

INPS (Institut National Prévoyance Sociale) :
- Salarial : 3.6% (vieillesse) + 0.5% (maternité) = 4.1%
- Patronal : 8% (vieillesse) + 4% (AT) + 3.6% (PF) = 15.6%
Plafond INPS : 500 000 XOF/mois.
Référence : CGI-ML Art. 80-180, Loi INPS.`,
    legal_references: ['CGI-ML Art. 80 (IRPP)', 'Loi INPS 99-041'],
    examples_fcfa: 'Salaire brut 300 000 XOF : INPS salarial = 12 300 (4.1%). Base IRTS = 300 000 - 12 300 - 30% = ~200 000. IRTS = 6 000',
    keywords: ['mali', 'irpp', 'irts', 'inps', 'charges sociales', 'barème salaire']
  },

  // ─────────────────────────────────────────────────────────────────────
  // TOGO (TG) — Zone UEMOA
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'fisc-tg-is-001',
    category: 'fiscalite_tg',
    title: 'IS Togo — Taux et calcul',
    content: `Taux IS : 27% sur le bénéfice fiscal net.
(Taux parmi les plus compétitifs de l'UEMOA après CI 25%).
IMF (Impôt Minimum Forfaitaire) : 1% CA HT, minimum 500 000 XOF.
Report déficitaire : 5 ans.
Contribution au développement (CD) : 1% bénéfice imposable (en plus de l'IS).
IS effectif ≈ 28% en incluant CD.
Acomptes : 2 acomptes (mai et septembre).
Échéance déclaration : 30 avril N+1.
Zone franche industrielle de Lomé : exonérations IS 5 ans + taux réduit.
Référence : CGI-TG Loi 2018-025 (nouveau code fiscal).`,
    legal_references: ['CGI-TG Loi 2018-025 Art. 1-90'],
    examples_fcfa: 'Bénéfice 60M XOF → IS = 60M × 27% = 16.2M + CD = 0.6M = total 16.8M effectif',
    keywords: ['togo', 'is', 'taux 27%', 'impôt sociétés', 'contribution développement']
  },
  {
    id: 'fisc-tg-irpp-001',
    category: 'fiscalite_tg',
    title: 'IRPP Togo — Barème et charges sociales',
    content: `Barème IRPP Togo 2025 (annuel, revenu net imposable) :
0 → 900 000 XOF : 0%
900 001 → 1 800 000 XOF : 7%
1 800 001 → 3 600 000 XOF : 14%
3 600 001 → 6 000 000 XOF : 21%
6 000 001 → 12 000 000 XOF : 28%
> 12 000 000 XOF : 35%

Abattement forfaitaire : 20% du salaire brut imposable.

CNSS Togo :
- Salarial : 4% (vieillesse 2.5% + maternité 1.5%)
- Patronal : 17.5% (vieillesse 6%, AT 5%, PF 6.5%)
Plafond CNSS : 1 500 000 XOF/mois (branches longues).
Référence : CGI-TG Art. 100-200, Code Travail Togo.`,
    legal_references: ['CGI-TG Art. 100', 'Code Travail Togo Art. 152'],
    examples_fcfa: 'Salaire brut 500 000 XOF : CNSS salarial = 20 000 (4%). Net imposable = 500 000 - 20 000 - 20% = 384 000. IRPP annualisé = 0 (sous seuil)',
    keywords: ['togo', 'irpp', 'cnss', 'charges sociales', 'barème', 'lomé']
  },

  // ─────────────────────────────────────────────────────────────────────
  // BÉNIN (BJ) — Zone UEMOA
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'fisc-bj-is-001',
    category: 'fiscalite_bj',
    title: 'IS Bénin — Taux et calcul',
    content: `Taux IS : 30% sur le bénéfice fiscal net.
IS PME : 25% (CA < 100M XOF, secteur hors pétrole).
IMF : 1% CA HT, minimum 200 000 XOF.
Report déficitaire : 3 ans.
Acomptes : 3 acomptes (avril, juillet, octobre).
Échéance déclaration : 31 mars N+1.
Taxe Professionnelle Synthétique (TPS) : régime des micro-entreprises
CA < 30M XOF : taux unique de 4% CA (libératoire IS + TVA).
Référence : CGI-BJ Loi 2018-42 du 19 janvier 2018.`,
    legal_references: ['CGI-BJ Loi 2018-42 Art. 1-100'],
    examples_fcfa: 'PME CA 80M, Bénéfice 12M → IS PME = 12M × 25% = 3M. IMF = 80M × 1% = 0.8M. IS dû = 3M',
    keywords: ['bénin', 'is', 'taux 30%', '25% pme', 'tps', 'micro-entreprise']
  },
  {
    id: 'fisc-bj-irpp-001',
    category: 'fiscalite_bj',
    title: 'IRPP Bénin — Barème et charges sociales',
    content: `Barème IRPP Bénin 2025 :
0 → 60 000 XOF/mois : 0%
60 001 → 130 000 : 10%
130 001 → 280 000 : 15%
280 001 → 530 000 : 19%
530 001 → 800 000 : 24%
800 001 → 1 500 000 : 28%
> 1 500 000 : 35%

Retenue à la source sur salaires mensuelle.
Abattement : 15% (frais professionnels).

CNSS Bénin :
- Salarial : 3.6% (retraite 2.4% + assurance maladie 1.2%)
- Patronal : 15.4% (retraite 6.4% + AT 1.75% + PF 7.25%)
Plafond CNSS : aucun plafond salarial spécifique.
Référence : CGI-BJ Art. 150-250, Loi CNSS.`,
    legal_references: ['CGI-BJ Art. 150', 'Code Travail Bénin'],
    examples_fcfa: 'Salaire brut 250 000 XOF/mois : CNSS salarial = 9 000. Base IRPP = 250 000 - 9 000 - 15% = 205 150. IRPP = (130 000 × 10%) + (75 150 × 15%) = 13 000 + 11 272 = 24 272 XOF',
    keywords: ['bénin', 'irpp', 'cnss', 'barème salaire', 'retenue source']
  },

  // ─────────────────────────────────────────────────────────────────────
  // NIGER (NE) — Zone UEMOA
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'fisc-ne-is-001',
    category: 'fiscalite_ne',
    title: 'IS Niger — Taux et calcul',
    content: `Taux IS : 30% sur le bénéfice fiscal net.
IMF : 1% CA HT, minimum 200 000 XOF.
TVA Niger : 19% (le taux le plus élevé de l'UEMOA).
Report déficitaire : 3 ans.
Acomptes : 2 acomptes (avril et juillet).
Échéance déclaration : 30 avril N+1.
Taxe sur les revenus des capitaux mobiliers (TRCM) : 10% sur dividendes.
Retenue à la source sur loyers (personnes physiques) : 10%.
Contribution à la taxe d'apprentissage : 2% masse salariale.
Référence : CGI-NE Loi 2017-06/AN.`,
    legal_references: ['CGI-NE Loi 2017-06', 'CGI-NE Art. 1-85'],
    examples_fcfa: 'TVA Niger 19% : Vente HT 1 000 000 → TVA = 190 000 → TTC = 1 190 000 (attention : taux différent des voisins à 18%)',
    keywords: ['niger', 'is', 'tva 19%', 'niamey', 'impôt sociétés', 'trcm']
  },

  // ─────────────────────────────────────────────────────────────────────
  // CONGO BRAZZAVILLE (CG) — Zone CEMAC
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'fisc-cg-is-001',
    category: 'fiscalite_cg',
    title: 'IS Congo Brazzaville — Taux et calcul',
    content: `Taux IS : 28% sur le bénéfice fiscal net.
Minimum de perception : 1% CA HT, minimum 500 000 XAF.
TVA : 18.9% (18% + 5% TSS = Taxe Spéciale de Solidarité de 5% sur TVA).
Report déficitaire : 3 ans.
Acomptes : mensuel (1/12 de l'IS N-1).
Échéance déclaration : 30 mars N+1.
Taxe sur les revenus des valeurs mobilières (TRVM) : 20% sur dividendes.
Secteur pétrolier : fiscalité spécifique (partage production, redevances).
Redevances forestières : régime particulier.
Référence : CGI-CG Code Général des Impôts Congo.`,
    legal_references: ['CGI-CG Art. 1-120', 'Loi finances Congo 2025'],
    examples_fcfa: 'Bénéfice 100M XAF → IS = 100M × 28% = 28M XAF. TVA vente 1M HT → TVA = 189 000 XAF (18.9%)',
    keywords: ['congo', 'brazzaville', 'is', '28%', 'tss', 'cemac', 'petrole']
  },

  // ─────────────────────────────────────────────────────────────────────
  // TCHAD (TD) — Zone CEMAC
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'fisc-td-is-001',
    category: 'fiscalite_td',
    title: 'IS Tchad — Taux et calcul',
    content: `Taux IS : 35% (taux le plus élevé de la zone CEMAC).
Minimum forfaitaire : 1.5% CA HT, minimum 500 000 XAF.
TVA : 18%.
Report déficitaire : 3 ans.
Acomptes : 2 (juin et septembre).
Échéance déclaration : 31 mars N+1.
Impôt sur les revenus des valeurs mobilières : 20% dividendes.
Retenue à la source prestataires étrangers : 25%.
Instabilité fiscale : taux et règles peuvent changer fréquemment.
Secteur pétrolier de Doba : régime fiscal conventionnel dérogatoire.
Référence : CGI-TD Code Général des Impôts Tchad.`,
    legal_references: ['CGI-TD Art. 1-100'],
    keywords: ['tchad', 'ndjamena', 'is', '35%', 'cemac', 'pétrole doba']
  },

  // ─────────────────────────────────────────────────────────────────────
  // CENTRAFRIQUE (CF) — Zone CEMAC
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'fisc-cf-is-001',
    category: 'fiscalite_cf',
    title: 'IS Centrafrique — Taux et calcul',
    content: `Taux IS : 30% sur le bénéfice fiscal net.
IMF : 1% CA HT, minimum applicable.
TVA : 19% (le plus élevé après Niger 19%).
Report déficitaire : 5 ans.
Contexte : instabilité politique → vérifier les taux en vigueur.
Secteur minier (diamant, or) : fiscalité spécifique, code minier.
Droits d'accise sur boissons alcoolisées et tabac.
Référence : CGI-CF Code Général des Impôts RCA.`,
    legal_references: ['CGI-CF Art. 1-85'],
    keywords: ['centrafrique', 'bangui', 'is', 'tva 19%', 'minier', 'cemac']
  },

  // ─────────────────────────────────────────────────────────────────────
  // GUINÉE ÉQUATORIALE (GQ) — Zone CEMAC
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'fisc-gq-is-001',
    category: 'fiscalite_gq',
    title: 'IS Guinée Équatoriale — Taux et calcul',
    content: `Taux IS : 35% sur le bénéfice fiscal net.
TVA : 15% (le plus bas de la zone CEMAC/UEMOA).
Impôt sur les sociétés pétrolières : régime fiscal pétrolier dérogatoire
(partage production, ring fencing, amortissement accéléré).
Imposition à la source sur loyers : 15%.
Dividendes : exonérés pour les filiales (régime mère-fille).
Langue officielle : espagnol (seul pays hispanophone de l'OHADA).
Référence : CGI-GQ Ley del Impuesto sobre Sociedades.
Note : Consulter les textes en espagnol — les traductions sont officieuses.`,
    legal_references: ['CGI-GQ Ley 4/2004'],
    examples_fcfa: 'TVA GQ 15% : Vente HT 1 000 000 XAF → TVA = 150 000 → TTC = 1 150 000 (différence vs Cameroun 19.25%)',
    keywords: ['guinée équatoriale', 'malabo', 'is', '35%', 'tva 15%', 'espagnol', 'pétrole']
  },

  // ─────────────────────────────────────────────────────────────────────
  // GUINÉE CONAKRY (GN) — Hors FCFA (Franc Guinéen GNF)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'fisc-gn-is-001',
    category: 'fiscalite_gn',
    title: 'IS Guinée Conakry — Taux et calcul',
    content: `Devise : Franc Guinéen (GNF) — 1 EUR ≈ 9 500 GNF (2025).
Taux IS : 35% sur le bénéfice fiscal net.
IMF : 3% du CA HT (le taux d'IMF le plus élevé de l'espace OHADA).
Minimum absolu IMF : 5 000 000 GNF.
Secteur minier (bauxite, or, diamant) : très important, régime fiscal spécifique.
Retenue à la source sur dividendes : 10%.
Retenue sur loyers : 15%.
Retenue sur prestations services étrangers : 25%.
TVA : 18%.
Report déficitaire : 3 ans.
Référence : CGI-GN Code Général des Impôts Guinée.`,
    legal_references: ['CGI-GN Loi L/94/006'],
    keywords: ['guinée', 'conakry', 'is', '35%', 'imf 3%', 'gnf', 'bauxite', 'minier']
  },

  // ─────────────────────────────────────────────────────────────────────
  // COMORES (KM) — Zone Franc comorien (KMF)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'fisc-km-is-001',
    category: 'fiscalite_km',
    title: 'IS Comores — Taux et calcul',
    content: `Devise : Franc Comorien (KMF) — parité fixe avec EUR (1 EUR = 491.96 KMF).
Taux IS : 35% sur le bénéfice fiscal net.
TVA : 10% (le taux de TVA le plus bas de l'OHADA).
IMF : variable selon catégorie.
État : trois îles autonomes (Grande Comore, Anjouan, Mohéli).
Fiscalité nationale + fiscalité insulaire → double niveau d'imposition possible.
Retenue à la source sur dividendes : 15%.
Report déficitaire : 3 ans.
Secteur tourism : exonérations partielles.
Référence : CGI-KM Code Général des Impôts Union des Comores.`,
    legal_references: ['CGI-KM'],
    examples_fcfa: 'TVA Comores 10% : Prestation 500 000 KMF HT → TVA = 50 000 → TTC = 550 000 KMF',
    keywords: ['comores', 'moroni', 'is', '35%', 'tva 10%', 'kmf', 'islands']
  },

  // ─────────────────────────────────────────────────────────────────────
  // RD CONGO (CD) — Zone Franc Congolais (CDF)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'fisc-cd-is-001',
    category: 'fiscalite_cd',
    title: 'IS RD Congo — Taux et calcul',
    content: `Devise : Franc Congolais (CDF) — 1 USD ≈ 2 800 CDF (2025).
Taux IS : 30% sur le bénéfice fiscal net.
IMF : 1% CA HT.
TVA : 16%.
SYSCOHADA adopté officiellement depuis 2014 (arrêté ministériel n°09/CAB/MIN/FINANCES/2014).
Plan comptable SYSCOHADA révisé en vigueur.
Impôts professionnels sur bénéfices (IPB) : régime particulier aux secteurs minier et pétrolier.
Impôt mobilier sur dividendes : 20%.
Retenue à la source sur salaires : taux progressif en CDF.
Report déficitaire : 3 ans (droit commun) / 5 ans (secteur minier).
Secteur minier (cuivre, cobalt, or, coltan) : très important.
Référence : Code Général des Contributions RDC.`,
    legal_references: ['CGC RDC Décret 10/001', 'Code Minier RDC'],
    examples_fcfa: 'IS RDC : Bénéfice 1 000 000 CDF → IS = 300 000 CDF (30%)',
    keywords: ['rdc', 'congo kinshasa', 'is', '30%', 'cdf', 'minier', 'cobalt']
  },

  // ─────────────────────────────────────────────────────────────────────
  // GUINÉE-BISSAU (GW) — Zone UEMOA
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'fisc-gw-is-001',
    category: 'fiscalite_gw',
    title: 'IS Guinée-Bissau — Taux et calcul',
    content: `Taux IS : 25% (même taux que CI, parmi les plus compétitifs OHADA).
TVA : 15% (harmonisation UEMOA en cours vers 18%).
IMF : variable, économie peu formalisée.
Report déficitaire : 5 ans.
Langue officielle : Portugais (seul pays lusophone de l'OHADA).
Économie dominée par la cajou (noix de cajou) : exonérations spécifiques.
Instabilité politique → vérifier l'applicabilité des textes.
Référence : CGI-GW Code Général des Impôts Guinée-Bissau.
Note : Consulter les textes en portugais.`,
    legal_references: ['CGI-GW (en portugais)'],
    keywords: ['guinée-bissau', 'bissau', 'is', '25%', 'portugais', 'cajou', 'uemoa']
  },

  // ─────────────────────────────────────────────────────────────────────
  // TABLEAU COMPARATIF IS — 17 PAYS (chunk de synthèse)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'fisc-ohada-is-comparatif',
    category: 'fiscalite_comparatif',
    title: 'Tableau comparatif IS — 17 pays OHADA',
    content: `RÉCAPITULATIF IS PAR PAYS (2025) :
Côte d'Ivoire (CI) : 25% | IMF 0.5% | Report 5 ans | Déclara. 30 avril
Sénégal (SN) : 30% (25% PME) | IMF 0.5% | Report 3 ans | 30 avril
Cameroun (CM) : 33% (30%+10% CAC) | Min. 2.2% CA | Report 4 ans | 15 mars
Gabon (GA) : 30% | IMF 1% | Report 5 ans | 30 avril
Burkina Faso (BF) : 27.5% | IMF 0.5% | Report 5 ans | 30 avril
Mali (ML) : 30% | IMF 1% | Report 3 ans | 31 mars
Togo (TG) : 27% + 1% CD | IMF 1% | Report 5 ans | 30 avril
Bénin (BJ) : 30% (25% PME) | IMF 1% | Report 3 ans | 31 mars
Niger (NE) : 30% | IMF 1% | Report 3 ans | 30 avril
Congo (CG) : 28% | Min. 1% | Report 3 ans | 30 mars
Tchad (TD) : 35% | Min. 1.5% | Report 3 ans | 31 mars
Centrafrique (CF) : 30% | IMF 1% | Report 5 ans | 31 mars
Guinée Éq. (GQ) : 35% | — | Report 5 ans | variable
Guinée (GN) : 35% | IMF 3% | Report 3 ans | 31 mars
Guinée-Bissau (GW) : 25% | IMF var. | Report 5 ans | variable
Comores (KM) : 35% | IMF var. | Report 3 ans | variable
RD Congo (CD) : 30% | IMF 1% | Report 3 ans | 31 mars

TAUX TVA PAR PAYS :
CI 18% | SN 18% | CM 19.25% | GA 18% | BF 18% | ML 18% | TG 18%
BJ 18% | NE 19% | CG 18.9% | TD 18% | CF 19% | GQ 15% | GN 18%
GW 15% | KM 10% | CD 16%`,
    legal_references: ['Codes fiscaux respectifs 2025'],
    keywords: ['comparatif', 'is', 'tva', 'ohada', '17 pays', 'taux', 'imf', 'tableau']
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// LACUNE 2 — CONSOLIDATION GROUPE IG / IP / MEE
// ═══════════════════════════════════════════════════════════════════════════

export const CONSOLIDATION_CHUNKS: SyscohadaKnowledgeChunk[] = [
  {
    id: 'consol-seuils-001',
    category: 'consolidation',
    title: 'Consolidation SYSCOHADA — Seuils et méthodes',
    content: `TROIS MÉTHODES DE CONSOLIDATION SYSCOHADA (AUDCIF révisé Art. 74-111) :

1. INTÉGRATION GLOBALE (IG) — Contrôle exclusif
Critère : détention > 50% des droits de vote OU contrôle de fait.
Mécanisme : 100% des actifs, passifs, produits et charges de la filiale
sont intégrés dans les comptes consolidés.
Élimination : titres de participation (côté mère) vs capitaux propres (côté filiale).
Intérêts minoritaires (IM) : part des tiers dans les capitaux propres et résultat.
Écart d'acquisition (goodwill) = Prix d'acquisition - Quote-part juste valeur actif net.

2. INTÉGRATION PROPORTIONNELLE (IP) — Contrôle conjoint
Critère : contrôle partagé à parts égales (50/50 ou pacte d'actionnaires).
Mécanisme : intégration de la quote-part des actifs, passifs, produits et charges.
Pas d'intérêts minoritaires.
Usage : co-entreprises (joint ventures) SYSCOHADA.

3. MISE EN ÉQUIVALENCE (MEE) — Influence notable
Critère : détention entre 20% et 50% des droits de vote.
Mécanisme : les titres sont remplacés par la quote-part des capitaux propres.
Compte de substitution : Titres mis en équivalence = Coût historique ± Q-P résultats.
Pas d'intégration ligne à ligne.
Référence : AUDCIF Art. 74-111.`,
    legal_references: ['AUDCIF Art. 74', 'AUDCIF Art. 86 (IG)', 'AUDCIF Art. 99 (IP)', 'AUDCIF Art. 108 (MEE)'],
    examples_fcfa: 'Groupe ALPHA détient 60% de BETA : → IG (contrôle exclusif). Détient 30% de GAMMA : → MEE. Détient 50/50 de DELTA avec partenaire : → IP',
    keywords: ['consolidation', 'intégration globale', 'intégration proportionnelle', 'mise en équivalence', 'IG', 'IP', 'MEE', 'groupe', 'filiale']
  },
  {
    id: 'consol-ig-ecritures-001',
    category: 'consolidation',
    title: 'Intégration Globale (IG) — Écritures de consolidation',
    content: `ÉTAPE 1 — ÉLIMINATION DES TITRES DE PARTICIPATION

Chez la société mère :
  Au bilan : Titres de participation ALPHA (compte 261) = 500M XOF
  (représente la valeur d'acquisition des titres BETA)

Juste valeur actif net de BETA = 700M XOF
Quote-part mère (60%) = 420M XOF
Écart d'acquisition (goodwill) = 500M - 420M = 80M XOF

Écriture de consolidation (bilan consolidé) :
  D: Capitaux propres BETA (100%)    700 000 000
  D: Écart d'acquisition              80 000 000
  C: Titres de participation BETA    500 000 000
  C: Intérêts minoritaires (40%)     280 000 000

ÉTAPE 2 — ÉLIMINATION OPÉRATIONS INTRAGROUPE

Ventes mère → filiale (livraisons de 200M XOF) :
  D: Ventes MÈRE                     200 000 000
  C: Achats FILIALE                  200 000 000

Marge en stock non réalisée (si stock final chez FILIALE contient
marchandises achetées à MÈRE avec marge 20%) :
  Stock filiale = 50M XOF incluant marge 20% = 10M de profit non réalisé
  D: Variation de stocks                10 000 000
  C: Stock                              10 000 000

Dividendes versés par FILIALE à MÈRE (30M XOF) :
  D: Dividendes reçus MÈRE             30 000 000
  C: Dividendes versés FILIALE         30 000 000

ÉTAPE 3 — INTÉRÊTS MINORITAIRES (IM)

Résultat net FILIALE = 80M XOF
Part minoritaires (40%) = 32M XOF
  D: Résultat consolidé                32 000 000
  C: Résultat minoritaires             32 000 000

Référence : AUDCIF Art. 86-98.`,
    legal_references: ['AUDCIF Art. 86', 'AUDCIF Art. 88 (goodwill)', 'AUDCIF Art. 95 (IM)'],
    examples_fcfa: 'Achat BETA pour 500M XOF, capitaux propres BETA = 700M, détention 60% → goodwill = 500M - 60% × 700M = 80M XOF',
    keywords: ['intégration globale', 'écritures', 'goodwill', 'écart acquisition', 'intérêts minoritaires', 'intragroupe', 'élimination']
  },
  {
    id: 'consol-mee-ecritures-001',
    category: 'consolidation',
    title: 'Mise en Équivalence (MEE) — Écritures',
    content: `MISE EN ÉQUIVALENCE — MÉCANISME COMPLET

Situation : Société ALPHA détient 30% de GAMMA.
Prix d'acquisition des titres : 300M XOF.
Capitaux propres GAMMA à la date d'acquisition : 900M XOF.
Quote-part ALPHA (30%) = 270M XOF.
Écart d'acquisition MEE = 300M - 270M = 30M XOF.

BILAN — Substitution des titres :
  D: Titres mis en équivalence (GAMMA)   300 000 000
  C: Titres de participation (GAMMA)     300 000 000

RÉSULTAT N+1 — Quote-part résultat GAMMA = 120M XOF :
  Quote-part ALPHA = 30% × 120M = 36M XOF
  D: Titres mis en équivalence (GAMMA)    36 000 000
  C: Quote-part résultat MEE              36 000 000

DIVIDENDE reçu de GAMMA = 24M XOF (30% × 80M versés) :
  D: Dividendes reçus                     24 000 000
  C: Titres mis en équivalence (GAMMA)    24 000 000

Valeur titres MEE fin N+1 = 300M + 36M - 24M = 312M XOF.

PRÉSENTATION AU BILAN CONSOLIDÉ :
  Actif immobilisé > Immobilisations financières >
    Titres mis en équivalence : 312M XOF
  Résultat consolidé inclut : Quote-part MEE 36M XOF.
Référence : AUDCIF Art. 108-111.`,
    legal_references: ['AUDCIF Art. 108', 'AUDCIF Art. 110 (variation MEE)'],
    examples_fcfa: 'ALPHA détient 30% de GAMMA. Achat : 300M. CP GAMMA : 900M. → Écart acq. MEE = 30M. Si GAMMA gagne 120M → Quote-part ALPHA = 36M/an',
    keywords: ['mise en équivalence', 'MEE', 'titres', 'quote-part', 'résultat', 'bilan consolidé']
  },
  {
    id: 'consol-outil-tool-001',
    category: 'consolidation',
    title: 'Consolidation — Algorithme et vérifications',
    content: `OUTIL D'AIDE À LA CONSOLIDATION PROPH3T

Pour consolider un groupe, PROPH3T a besoin des données suivantes :
1. Pourcentage de détention de chaque entité
2. Comptes individuels de chaque entité (bilan + CdR)
3. Prix d'acquisition des titres
4. Opérations intragroupe (ventes, prêts, dividendes)
5. Valeurs justes à la date d'acquisition

CONTRÔLES À EFFECTUER APRÈS CONSOLIDATION :
C-CONSOL-01 : Total actif consolidé < Σ actifs individuels (effet élimination)
C-CONSOL-02 : Pas de double comptage des opérations intragroupe
C-CONSOL-03 : Intérêts minoritaires ≥ 0 (pas de IM négatifs sans justification)
C-CONSOL-04 : Résultat consolidé = Résultat mère + Q-P résultats filiales - Marges intra
C-CONSOL-05 : Goodwill amorti si AUDCIF version antérieure OU soumis au test de dépréciation
C-CONSOL-06 : Dividendes intragroupe entièrement éliminés

POUR DEMANDER LA CONSOLIDATION À PROPH3T :
→ "Consolide le groupe : MÈRE détient 70% FILIALE A et 30% FILIALE B"
→ Fournir les bilans et CdR des entités
→ Indiquer le prix d'acquisition des titres et les opérations intragroupe`,
    legal_references: ['AUDCIF Art. 74-111', 'SYSCOHADA Règlement 01-01'],
    keywords: ['consolidation', 'contrôles', 'vérification', 'outil', 'algorithme', 'groupe']
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// LACUNE 3 — CRÉDIT-BAIL CÔTÉ BAILLEUR
// ═══════════════════════════════════════════════════════════════════════════

export const CREDIT_BAIL_BAILLEUR_CHUNKS: SyscohadaKnowledgeChunk[] = [
  {
    id: 'cb-bailleur-compta-001',
    category: 'ecritures_types',
    title: 'Crédit-bail — Comptabilisation chez le BAILLEUR (société de leasing)',
    content: `CRÉDIT-BAIL CÔTÉ BAILLEUR (SYSCOHADA révisé Art. 59-62)

Le bailleur est une société de crédit-bail (banque, société de leasing).
Il achète le bien ET le donne en crédit-bail au preneur.

PHASE 1 — ACQUISITION DU BIEN PAR LE BAILLEUR
(Le bailleur achète le matériel pour le donner en leasing)

  D: 245 - Matériel de transport (ou 24x selon catégorie)   10 000 000
  D: 44551 - TVA déductible                                  1 800 000
  C: 481 - Fournisseurs d'immobilisations                   11 800 000

PHASE 2 — MISE EN LEASING (contrat signé, remise au preneur)
Aucune écriture de sortie du bilan chez le bailleur.
Le bien RESTE à l'actif du bailleur (il est propriétaire juridique).
Reclassement comptable conseillé :
  D: 272 - Créances de crédit-bail                          10 000 000
  C: 245 - Matériel de transport                            10 000 000

PHASE 3 — PERCEPTION DES LOYERS MENSUELS
Loyer mensuel = 350 000 XOF (dont : amortissement financier + intérêts)
Décomposition selon tableau d'amortissement financier :
  Intérêts du mois = 83 333 XOF
  Amortissement capital = 266 667 XOF

  D: 521 - Banque                                              350 000
  C: 272 - Créances de crédit-bail (amort. capital)           266 667
  C: 772 - Revenus des créances (intérêts)                     83 333

PHASE 4 — OPTION D'ACHAT EXERCÉE PAR LE PRENEUR
Prix résiduel = 1 000 000 XOF

  D: 521 - Banque                                           1 000 000
  C: 272 - Créances de crédit-bail (solde restant)         1 000 000

PHASE 5 — OPTION NON EXERCÉE (bien restitué)
Le bailleur récupère le bien. VNC résiduelle = valeur comptable restante.
  D: 245 - Matériel de transport (valeur résiduelle)        1 000 000
  C: 272 - Créances de crédit-bail                          1 000 000
  → Le bailleur peut le revendre ou le relouer.

TRAITEMENT FISCAL BAILLEUR :
Les loyers perçus = produits financiers imposables (classe 77).
La créance 272 = actif financier, pas une immobilisation physique.
TVA sur loyers : applicable au taux normal (18% ou taux pays).
Référence : SYSCOHADA Art. 59-62, AUSCGIE Art. 110.`,
    legal_references: ['SYSCOHADA révisé Art. 59', 'SYSCOHADA Art. 62', 'AUSCGIE Art. 110'],
    examples_fcfa: 'Bailleur achète camion 10M XOF → Loyer mensuel 350K → Intérêts 83K + Capital 267K. Sur 36 mois → VR = 1M. Recette totale = 36 × 350K + 1M = 13.6M XOF',
    keywords: ['crédit-bail', 'leasing', 'bailleur', 'société leasing', 'compte 272', 'créances leasing']
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// LACUNE 4A — PRORATA TVA (SECTEURS MIXTES)
// ═══════════════════════════════════════════════════════════════════════════

export const PRORATA_TVA_CHUNKS: SyscohadaKnowledgeChunk[] = [
  {
    id: 'tva-prorata-001',
    category: 'ecritures_types',
    title: 'Prorata TVA — Secteurs mixtes (imposable + exonéré)',
    content: `PRORATA DE DÉDUCTION TVA (Art. 226 et suivants CGI)

Applicable aux entreprises ayant à la fois :
- Des activités soumises à TVA (droit à déduction)
- Des activités exonérées de TVA (pas de déduction)

CALCUL DU PRORATA :
Prorata (%) = CA soumis TVA × 100 / CA total (soumis + exonéré)

Exemple : Banque avec activités de crédit (exonéré) et location coffres (taxable)
CA soumis TVA = 200M XOF
CA total (soumis + exonéré) = 800M XOF
Prorata = 200M / 800M = 25%

TVA déductible = TVA sur achats × Prorata
Achat ordinateur 1M HT → TVA = 180 000 XOF
TVA déductible = 180 000 × 25% = 45 000 XOF
TVA non déductible (charge) = 135 000 XOF

ÉCRITURES :
  D: 2453 - Matériel de bureau (1M + 135K non déductible)  1 135 000
  D: 44551 - TVA déductible (45K seulement)                   45 000
  C: 401 - Fournisseur                                      1 180 000

RÉGULARISATION ANNUELLE DU PRORATA :
En début d'exercice : prorata provisoire = prorata N-1.
En fin d'exercice : calcul du prorata définitif.
Si prorata définitif > provisoire : TVA supplémentaire à récupérer.
Si prorata définitif < provisoire : TVA à reverser.

Référence : CGI-CI Art. 250-255 (pour CI, règles similaires dans autres pays UEMOA).`,
    legal_references: ['CGI-CI Art. 250', 'Directive TVA UEMOA Art. 18'],
    examples_fcfa: 'CA taxable 200M / CA total 800M = prorata 25%. TVA achats 1M → TVA déductible = 250K, non déductible = 750K à immobiliser en charges',
    keywords: ['prorata', 'TVA', 'secteur mixte', 'déduction partielle', 'exonéré', 'banque', 'assurance']
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// LACUNE 4B — PRIX DE TRANSFERT OHADA
// ═══════════════════════════════════════════════════════════════════════════

export const PRIX_TRANSFERT_CHUNKS: SyscohadaKnowledgeChunk[] = [
  {
    id: 'px-transfert-001',
    category: 'fiscalite_comparatif',
    title: 'Prix de transfert — Règles OHADA et documentation',
    content: `PRIX DE TRANSFERT DANS L'ESPACE OHADA

Définition : Prix pratiqués dans les transactions entre entités d'un même groupe.
Principe : Arm's length (pleine concurrence) — les prix intragroupe doivent
être conformes à ceux pratiqués entre parties indépendantes.

PAYS OHADA AYANT RÉGLEMENTÉ LES PRIX DE TRANSFERT :
- Côte d'Ivoire : Art. 36 bis CGI-CI — documentation obligatoire si CA > 1 Md XOF
- Sénégal : Art. 12 CGI-SN — règles de pleine concurrence
- Cameroun : Art. 19 CGI-CM — documentation et rapport annuel
- Gabon : Art. 15 CGI-GA
- Burkina Faso : Loi 058-2017 — dispositions sur prix de transfert
La plupart des autres pays OHADA appliquent le principe sans documentation formelle.

MÉTHODES DE PRIX DE TRANSFERT (OCDE, applicables en OHADA) :
1. Prix comparable sur le marché libre (CUP) — méthode préférentielle
2. Prix de revente diminué (RPM)
3. Coût majoré (CPM)
4. Méthode transactionnelle de la marge nette (TNMM)
5. Méthode du partage des bénéfices

DOCUMENTATION REQUISE (en CI, CM, SN) :
- Description du groupe et des liens de contrôle
- Description des transactions contrôlées (nature, montants, parties)
- Analyse économique justifiant les prix
- Comparables utilisés et bases de données consultées

REQUALIFICATION EN CAS D'ANOMALIE :
Si les prix ne respectent pas la pleine concurrence :
→ Réintégration des bénéfices transférés dans la base imposable
→ Pénalités (25% à 100% du montant réintégré selon pays)
→ Double imposition possible (sans convention fiscale)

Référence : OCDE Principes directeurs PT 2022, Art. 36 bis CGI-CI.`,
    legal_references: ['CGI-CI Art. 36 bis', 'OCDE Guidelines 2022', 'CGI-CM Art. 19'],
    keywords: ['prix de transfert', 'intragroupe', 'arm length', 'documentation', 'filiale', 'groupe', 'OCDE']
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// LACUNE 4C — NORMES ISA / COSO / IIA POUR PROPH3T AUDIT
// ═══════════════════════════════════════════════════════════════════════════

export const NORMES_AUDIT_CHUNKS: SyscohadaKnowledgeChunk[] = [
  {
    id: 'audit-isa-001',
    category: 'normes_isa',
    title: 'Normes ISA — Référentiel d\'audit international',
    content: `NORMES ISA (International Standards on Auditing) — IFAC

Principales normes applicables en zone OHADA :

ISA 200 — Objectifs généraux : L'auditeur obtient une assurance raisonnable
que les états financiers sont exempts d'anomalies significatives.

ISA 315 — Identification et évaluation des risques : Connaissance de l'entité,
contrôle interne, évaluation des risques d'anomalies significatives.
→ Risque inhérent × Risque de contrôle = Risque d'anomalie
→ Risque de détection = f(objectif d'assurance, risques évalués)

ISA 320 — Caractère significatif (Matérialité) :
- Seuil de signification global = 1-5% résultat avant impôt OU 0.5-1% CA
  OU 1-2% capitaux propres (selon le secteur)
- Seuil de signification d'exécution = 50-75% du seuil global
- Erreur clairement insignifiante = 5-10% du seuil global

ISA 330 — Réponses aux risques évalués :
- Tests de procédures : évaluer l'efficacité des contrôles
- Procédures de validation (substantives) : vérification directe des soldes

ISA 500 — Éléments probants :
Suffisance (quantité) + Caractère probant (qualité)
Types : inspection, observation, demande d'information, confirmation,
recalcul, réexécution, procédures analytiques.

ISA 700 — Formation de l'opinion :
- Opinion non modifiée (rapport "propre")
- Opinion avec réserve (anomalie significative mais non généralisée)
- Opinion défavorable (anomalie significative et généralisée)
- Impossibilité d'exprimer une opinion (limitation étendue)

ISA 240 — Fraudes : responsabilité de l'auditeur dans la détection.
ISA 570 — Continuité d'exploitation : Going concern.
Référence : IFAC Handbook, normes ISA 2023.`,
    legal_references: ['ISA 200', 'ISA 315', 'ISA 320', 'ISA 700', 'IFAC 2023'],
    keywords: ['ISA', 'normes audit', 'IFAC', 'matérialité', 'signification', 'risque audit', 'opinion']
  },
  {
    id: 'audit-coso-001',
    category: 'normes_isa',
    title: 'COSO — Cadre de contrôle interne',
    content: `COSO 2013 — COMPOSANTES DU CONTRÔLE INTERNE

Le référentiel COSO (Committee of Sponsoring Organizations) définit 5 composantes
et 17 principes du contrôle interne :

COMPOSANTE 1 — ENVIRONNEMENT DE CONTRÔLE (5 principes)
- Engagement envers l'intégrité et l'éthique
- Exercice de la responsabilité de surveillance par le Conseil
- Établissement de la structure, autorités et responsabilités
- Démonstration de l'engagement envers la compétence
- Application de la responsabilité

COMPOSANTE 2 — ÉVALUATION DES RISQUES (4 principes)
- Définition des objectifs
- Identification et analyse des risques
- Évaluation du risque de fraude
- Identification et analyse des changements significatifs

COMPOSANTE 3 — ACTIVITÉS DE CONTRÔLE (3 principes)
- Sélection et développement des activités de contrôle
- Contrôles généraux informatiques
- Déploiement via procédures et politiques

COMPOSANTE 4 — INFORMATION ET COMMUNICATION (3 principes)
- Utilisation d'informations pertinentes et de qualité
- Communication interne
- Communication externe

COMPOSANTE 5 — PILOTAGE (2 principes)
- Évaluations continues ou ponctuelles
- Évaluation et communication des défaillances

APPLICATION EN AUDIT OHADA :
→ L'auditeur évalue le contrôle interne selon COSO
→ Si contrôle fort → tests de procédures suffisants
→ Si contrôle faible → procédures substantives étendues
Référence : COSO Internal Control Integrated Framework 2013.`,
    legal_references: ['COSO 2013', 'ISA 315 (référence COSO)'],
    keywords: ['COSO', 'contrôle interne', 'audit', '5 composantes', '17 principes', 'risque', 'gouvernance']
  },
  {
    id: 'audit-rapport-5c-001',
    category: 'normes_isa',
    title: 'Rapport d\'audit — Format 5C (Condition, Cause, Critère, Conséquence, Correction)',
    content: `FORMAT DE RAPPORT D'AUDIT EN 5C (norme IIA)

Utilisé pour communiquer les observations d'audit de façon structurée :

C1 — CONDITION (What is?)
Fait constaté, situation actuelle.
Exemple : "Les factures fournisseurs ne sont pas rapprochées des bons de livraison
avant paiement dans 40% des cas examinés."

C2 — CRITÈRE (What should be?)
La norme, le standard attendu.
Exemple : "La procédure interne P-ACHAT-003 exige un triple rapprochement
(commande/livraison/facture) avant tout règlement fournisseur."

C3 — CAUSE (Why did it happen?)
Raison de l'écart entre condition et critère.
Exemple : "Le personnel du service achats n'a pas été formé à la nouvelle
procédure depuis la réorganisation de mars 2025."

C4 — CONSÉQUENCE (So what?)
Impact réel ou potentiel.
Exemple : "Risque de paiement en double ou de fraude fournisseur. 3 cas
de doubles paiements détectés pour un total de 4.5M XOF sur la période."

C5 — CORRECTION / RECOMMANDATION (What should be done?)
Action corrective proposée avec responsable et délai.
Exemple : "Former le personnel achats à la procédure P-ACHAT-003 avant
le 30/06/2026 (responsable : DAF). Mettre en place un contrôle automatique
de détection des doublons dans le système ERP."

Référence : IIA International Standards for the Professional Practice of Internal Auditing.`,
    legal_references: ['IIA Standards 2017', 'CRIPP IIA 2023'],
    keywords: ['rapport audit', '5C', 'condition', 'critère', 'cause', 'conséquence', 'recommandation', 'IIA']
  },
  {
    id: 'audit-8cycles-001',
    category: 'normes_isa',
    title: 'Audit par cycles — Les 8 cycles SYSCOHADA',
    content: `LES 8 CYCLES D'AUDIT EN ZONE OHADA

Cycle 1 — VENTES / CLIENTS
Objectifs d'audit : exhaustivité (toutes les ventes comptabilisées ?),
réalité (les clients existent et doivent ?), évaluation (créances valorisées ?).
Procédures clés : confirmation directe clients, analyse aging, revue provisions.
Red flags : hausse CA fin d'exercice, clients fictifs, lettrages tardifs.

Cycle 2 — ACHATS / FOURNISSEURS
Objectifs : séparation des exercices, droits et obligations, évaluation.
Procédures : confirmation fournisseurs, revue cut-off, test FNP (factures non parvenues).
Red flags : fournisseurs fictifs, paiements en cash > 500 000 XOF, doublons.

Cycle 3 — STOCKS
Objectifs : existence physique, évaluation (CMUP ou FIFO), exhaustivité.
Procédures : observation inventaire physique, comptages surprises, valorisation.
Red flags : rotation anormale, provisions insuffisantes, écarts inventory.

Cycle 4 — IMMOBILISATIONS
Objectifs : existence, propriété, évaluation (coût amorti), amortissements corrects.
Procédures : inspection physique, vérification titres propriété, recalcul amortissements.
Red flags : charges/immos confondues, taux amortissements anormaux, cessions non comptabilisées.

Cycle 5 — TRÉSORERIE
Objectifs : existence, droits, évaluation (cours clôture pour devises).
Procédures : confirmation bancaire, rapprochement bancaire, contrôle caisse.
Red flags : soldes créditeurs inexpliqués, chèques non débités > 6 mois.

Cycle 6 — CAPITAUX PROPRES
Objectifs : exactitude, affectation résultats selon décisions AG.
Procédures : lecture PV AG, vérification capital social, traçabilité dividendes.
Red flags : distributions sans AG, capital > immatriculation RCCM.

Cycle 7 — PERSONNEL / PAIE
Objectifs : exhaustivité (tous salariés payés une fois), réalité (pas de fantômes).
Procédures : rapprochement paie/RH, confirmation fiches de paie, contrôle charges sociales.
Red flags : employés fictifs, taux CNPS incorrects, salaires en cash sans justification.

Cycle 8 — IMPÔTS ET TAXES
Objectifs : exhaustivité des obligations, exactitude des calculs.
Procédures : rapprochement avis imposition, recalcul IS/TVA, vérification acomptes.
Red flags : provisions insuffisantes, pénalités non comptabilisées, litiges fiscaux non divulgués.

Référence : Normes CNCC (France), adaptées à l'environnement SYSCOHADA/OHADA.`,
    legal_references: ['ISA 500', 'ISA 330', 'Normes CNCC adaptées OHADA'],
    keywords: ['cycles audit', 'ventes clients', 'achats fournisseurs', 'stocks', 'immobilisations', 'trésorerie', 'paie', 'impôts', '8 cycles']
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// LACUNE 4D — TAFIRE MÉTHODE DIRECTE
// ═══════════════════════════════════════════════════════════════════════════

export const TAFIRE_DIRECT_CHUNKS: SyscohadaKnowledgeChunk[] = [
  {
    id: 'tafire-direct-001',
    category: 'etats_financiers',
    title: 'TAFIRE — Méthode directe SYSCOHADA',
    content: `TAFIRE (Tableau des Flux de Trésorerie) — MÉTHODE DIRECTE
SYSCOHADA révisé — État financier n°5 obligatoire (Système Normal)

La méthode directe présente les flux BRUTS d'encaissements et décaissements.
Elle est plus transparente que la méthode indirecte mais plus complexe à établir.

PARTIE 1 — FLUX DE TRÉSORERIE DES ACTIVITÉS OPÉRATIONNELLES
+ Encaissements reçus des clients (dont TVA)
  = Ventes facturées + TVA collectée - Variation créances clients
- Décaissements versés aux fournisseurs (dont TVA)
  = Achats facturés + TVA déductible - Variation dettes fournisseurs
- Décaissements versés au personnel
  = Salaires bruts payés - Variation dettes sociales
- Impôts et taxes décaissés (hors IS)
  = Impôts payés (TVA nette décaissée + patente + autres)
- IS payé (acomptes + solde)
+/- Autres flux opérationnels
= FLUX NET OPÉRATIONNEL (A)

PARTIE 2 — FLUX DE TRÉSORERIE DES ACTIVITÉS D'INVESTISSEMENT
- Acquisitions d'immobilisations corporelles et incorporelles (TTC)
+ Produits de cession d'immobilisations (TTC)
- Acquisitions de titres de participation
+ Cessions de titres de participation
+/- Prêts accordés/remboursés
= FLUX NET D'INVESTISSEMENT (B)

PARTIE 3 — FLUX DE TRÉSORERIE DES ACTIVITÉS DE FINANCEMENT
+ Augmentations de capital (numéraire)
+ Emprunts souscrits (décaissements reçus)
- Remboursements d'emprunts
- Dividendes versés aux actionnaires
= FLUX NET DE FINANCEMENT (C)

VARIATION NETTE DE TRÉSORERIE = A + B + C
+ Trésorerie et équivalents en début d'exercice
= TRÉSORERIE ET ÉQUIVALENTS EN FIN D'EXERCICE

VÉRIFICATION : Trésorerie fin = Solde comptes 52x + 57x - 564x (CBS)
Si trésorerie TAFIRE ≠ trésorerie bilan → erreur dans le TAFIRE

DIFFÉRENCE MÉTHODE DIRECTE vs INDIRECTE :
Méthode indirecte : part du résultat net, ajuste les éléments non-cash.
Méthode directe : part des flux bruts, plus transparente, recommandée IFRS.
SYSCOHADA accepte les deux méthodes.
Référence : SYSCOHADA révisé — Acte Uniforme Art. 29-34.`,
    legal_references: ['AUDCIF Art. 29', 'AUDCIF Art. 34 (TAFIRE)'],
    examples_fcfa: 'Encaissements clients 2 500M XOF - Décaissements fournisseurs 1 800M - Personnel 400M - Impôts 150M = Flux opérationnel 150M XOF',
    keywords: ['TAFIRE', 'flux trésorerie', 'méthode directe', 'encaissements', 'décaissements', 'tableau financement']
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT CONSOLIDÉ — TOUS LES CHUNKS COMPLÉMENTAIRES
// ═══════════════════════════════════════════════════════════════════════════

export const ALL_COMPLEMENT_CHUNKS: SyscohadaKnowledgeChunk[] = [
  ...FISCALITE_17_PAYS_CHUNKS,
  ...CONSOLIDATION_CHUNKS,
  ...CREDIT_BAIL_BAILLEUR_CHUNKS,
  ...PRORATA_TVA_CHUNKS,
  ...PRIX_TRANSFERT_CHUNKS,
  ...NORMES_AUDIT_CHUNKS,
  ...TAFIRE_DIRECT_CHUNKS,
]
