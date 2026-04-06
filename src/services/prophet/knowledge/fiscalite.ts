
/**
 * Knowledge Base — Fiscalité des 17 pays OHADA
 * IS, TVA, IRPP, retenues à la source, calendrier fiscal
 */
import type { SyscohadaKnowledgeChunk } from '../../proph3t/types/knowledge';

export const fiscaliteKnowledge: SyscohadaKnowledgeChunk[] = [
  // ── IS par pays ────────────────────────────────────────────────
  {
    id: 'fisc_is_ci',
    category: 'fiscalite_ci',
    title: "Impôt sur les Sociétés — Côte d'Ivoire",
    content: `Taux IS : 25% (loi de finances 2023, anciennement 25%)
Minimum forfaitaire d'imposition (IMF) : 1% du CA HT (minimum 3 000 000 FCFA)
IS dû = Max(IS calculé, IMF)
Base imposable = Résultat comptable + Réintégrations - Déductions - Déficits reportables
Déficits : reportables sur 5 ans
Acomptes : 3 acomptes trimestriels (20 avril, 20 juillet, 20 octobre) = 1/3 de l'IS N-1
Déclaration : 20 avril N+1 (ou 20 du 4ème mois après clôture)
Paiement solde : à la déclaration
Centimes additionnels : Contribution au Budget de l'État (CBE) = 10% de l'IS`,
    legal_references: ['CGI-CI Art. 1-36', 'LF 2023 Art. 5'],
    keywords: ['IS', 'impôt sociétés', 'Côte d\'Ivoire', 'CI', 'IMF', 'acomptes'],
  },
  {
    id: 'fisc_is_sn',
    category: 'fiscalite_sn',
    title: 'Impôt sur les Sociétés — Sénégal',
    content: `Taux IS : 30%
Minimum fiscal (CMFC) : 0,5% du CA (minimum 500 000 FCFA, maximum 5 000 000)
Déficits : reportables sur 3 ans
Acomptes : 4 acomptes (15 février, 15 mai, 15 août, 15 novembre) = 1/4 de l'IS N-1
Déclaration : 30 avril N+1
Exonérations : zones économiques spéciales, code des investissements
CFCE (Contribution Forfaitaire à la Charge de l'Employeur) : 3% de la masse salariale`,
    legal_references: ['CGI-SN Art. 1-33', 'LF 2023'],
    keywords: ['IS', 'Sénégal', 'SN', 'CMFC', 'acomptes', '30%'],
  },
  {
    id: 'fisc_is_cm',
    category: 'fiscalite_cm',
    title: 'Impôt sur les Sociétés — Cameroun',
    content: `Taux IS : 33% (30% + 10% CAC centimes additionnels communaux)
Effectif : 30% IS + 10% de CAC sur l'IS = 33%
Minimum de perception : 2,2% du CA (1% IS minimum + 10% CAC dessus)
Précompte IS : 2,2% sur achats auprès de contribuables non-inscrits
Déficits : reportables sur 4 ans
Acomptes mensuels : 1/12 de l'IS N-1 (au 15 de chaque mois)
Déclaration : 15 mars N+1`,
    legal_references: ['CGI-CM Art. 1-20, 149', 'LF 2024'],
    keywords: ['IS', 'Cameroun', 'CM', 'CAC', '33%', 'précompte', 'acomptes mensuels'],
  },
  {
    id: 'fisc_is_ga',
    category: 'fiscalite_ga',
    title: 'Impôt sur les Sociétés — Gabon',
    content: `Taux IS : 30%
Contribution spéciale de solidarité : 1% du bénéfice imposable (CSS)
Minimum fiscal : 1% du CA (minimum 1 000 000 XAF)
Déficits : reportables sur 5 ans
Acomptes : trimestriels
Déclaration : 30 avril N+1
Zones économiques spéciales : exonération temporaire possible`,
    legal_references: ['CGI-GA Art. 1-25'],
    keywords: ['IS', 'Gabon', 'GA', '30%', 'CSS'],
  },
  {
    id: 'fisc_is_autres',
    category: 'fiscalite_ohada',
    title: 'Taux IS dans les autres pays OHADA',
    content: `Taux d'IS par pays (2024) :
- Burkina Faso (BF) : 27,5% (+ contrib. solidarité)
- Mali (ML) : 30%
- Niger (NE) : 30%
- Togo (TG) : 27%
- Bénin (BJ) : 30%
- Guinée (GN) : 25%
- Tchad (TD) : 35%
- Centrafrique (CF) : 30%
- Congo-Brazzaville (CG) : 28%
- RD Congo (CD) : 30%
- Guinée Équatoriale (GQ) : 35%
- Comores (KM) : 35%
- Guinée-Bissau (GW) : 25%

Note : ces taux peuvent varier. Vérifier la dernière loi de finances du pays concerné.
Tous les pays OHADA appliquent un minimum d'imposition (entre 0,5% et 2% du CA).`,
    legal_references: ['CGI de chaque pays', 'LF annuelles'],
    keywords: ['IS', 'taux', 'pays OHADA', 'Burkina', 'Mali', 'Niger', 'Togo', 'Bénin'],
  },

  // ── TVA par pays ───────────────────────────────────────────────
  {
    id: 'fisc_tva_ci',
    category: 'fiscalite_ci',
    title: "TVA — Côte d'Ivoire",
    content: `Taux normal : 18%
Taux réduit : 9% (produits de première nécessité, matériel agricole)
Exonérations : exportations (taux 0%), produits alimentaires de base, médicaments essentiels
Régime réel normal : CA > 200 000 000 FCFA
Régime réel simplifié : 50 000 000 < CA ≤ 200 000 000
Taxe sur les entreprises de réseau (AIRSI) : 5% sur services numériques
Déclaration : mensuelle au 15 du mois suivant
Remboursement crédit TVA : possible sous conditions (exportateurs, investissements)`,
    legal_references: ['CGI-CI Art. 351-400'],
    keywords: ['TVA', 'Côte d\'Ivoire', '18%', '9%', 'exonérations', 'déclaration'],
  },
  {
    id: 'fisc_tva_sn',
    category: 'fiscalite_sn',
    title: 'TVA — Sénégal',
    content: `Taux normal : 18%
Taux réduit : 10% (hébergement touristique)
Exonérations : exportations, produits alimentaires de base, matériel médical
Seuil d'assujettissement : CA > 50 000 000 FCFA
Déclaration : mensuelle au 15 du mois suivant
Particularité : retenue TVA de 50% par les entreprises publiques sur paiements aux fournisseurs`,
    legal_references: ['CGI-SN Art. 430-480'],
    keywords: ['TVA', 'Sénégal', '18%', '10%', 'retenue'],
  },
  {
    id: 'fisc_tva_cm',
    category: 'fiscalite_cm',
    title: 'TVA — Cameroun',
    content: `Taux normal : 19,25% (TVA 17,5% + CAC 10% de la TVA = 1,75%)
Taux réduit : 0% (exportations)
Exonérations : produits alimentaires non transformés, matériel agricole, médicaments
Précompte TVA : 1/3 de la TVA facturée retenue par les grandes entreprises
Déclaration : mensuelle au 15 du mois suivant
Particularité camerounaise : les centimes additionnels communaux (CAC) = 10% de la TVA`,
    legal_references: ['CGI-CM Art. 125-150'],
    keywords: ['TVA', 'Cameroun', '19,25%', 'CAC', 'précompte', '17,5%'],
  },
  {
    id: 'fisc_tva_ga',
    category: 'fiscalite_ga',
    title: 'TVA — Gabon',
    content: `Taux normal : 18%
Taux réduit : 10% (produits de première nécessité)
Taux spécial : 5% (certains produits pétroliers)
Exonérations : exportations, produits alimentaires de base
Seuil : CA > 60 000 000 XAF
Déclaration : mensuelle au 20 du mois suivant`,
    legal_references: ['CGI-GA Art. 200-250'],
    keywords: ['TVA', 'Gabon', '18%', '10%'],
  },
  {
    id: 'fisc_tva_autres',
    category: 'fiscalite_ohada',
    title: 'Taux de TVA dans les pays OHADA',
    content: `Taux standard de TVA par pays :
- Côte d'Ivoire : 18% (réduit 9%)
- Sénégal : 18% (réduit 10%)
- Cameroun : 19,25% (17,5% + CAC)
- Gabon : 18% (réduit 10%)
- Burkina Faso : 18%
- Mali : 18%
- Niger : 19%
- Togo : 18%
- Bénin : 18%
- Guinée : 18%
- Tchad : 18%
- Centrafrique : 19%
- Congo-Brazzaville : 18,9% (18% + taxe additionnelle)
- RD Congo : 16%
- Guinée Équatoriale : 15%
- Comores : 10%
- Guinée-Bissau : 15%

Tous les pays exonèrent les exportations (taux 0%).`,
    legal_references: ['CGI de chaque pays'],
    keywords: ['TVA', 'taux', 'pays OHADA', 'comparaison'],
  },

  // ── IRPP ──────────────────────────────────────────────────────
  {
    id: 'fisc_irpp_ci',
    category: 'fiscalite_ci',
    title: "IRPP — Côte d'Ivoire (Impôt Général sur le Revenu)",
    content: `L'IGR (IRPP) en CI est calculé par tranches progressives après abattement :
Abattement forfaitaire : 20% du revenu brut (plafond 2 500 000)
Barème 2024 :
- 0 à 300 000 : 0%
- 300 001 à 547 000 : 10%  (anciennement 15%)
- 547 001 à 979 000 : 15%  (anciennement 20%)
- 979 001 à 1 519 000 : 20%
- 1 519 001 à 2 644 000 : 25%
- 2 644 001 à 4 669 000 : 35%
- 4 669 001 à 10 106 000 : 45%
- Au-delà de 10 106 000 : 60%

Quotient familial : 1 part (célibataire), 2 parts (marié), +0,5 par enfant (max 5 parts)
CAC : 10% additionnel sur l'IRPP`,
    legal_references: ['CGI-CI Art. 100-160'],
    keywords: ['IRPP', 'IGR', 'Côte d\'Ivoire', 'barème', 'tranches', 'quotient familial'],
  },
  {
    id: 'fisc_irpp_sn',
    category: 'fiscalite_sn',
    title: 'IRPP — Sénégal',
    content: `Barème progressif de l'IRPP au Sénégal :
- 0 à 630 000 : 0%
- 630 001 à 1 500 000 : 20%
- 1 500 001 à 4 000 000 : 30%
- 4 000 001 à 8 000 000 : 35%
- 8 000 001 à 13 500 000 : 37%
- Au-delà de 13 500 000 : 40%

Abattement forfaitaire : 30% du revenu brut (plafond 900 000)
Parts : 1 (célibataire), 1,5 (marié sans enfant), +0,5 par enfant
Maximum : 5 parts`,
    legal_references: ['CGI-SN Art. 50-80'],
    keywords: ['IRPP', 'Sénégal', 'barème', 'tranches'],
  },
  {
    id: 'fisc_irpp_cm',
    category: 'fiscalite_cm',
    title: 'IRPP — Cameroun',
    content: `Barème progressif de l'IRPP au Cameroun :
- 0 à 2 000 000 : 10%
- 2 000 001 à 3 000 000 : 15%
- 3 000 001 à 5 000 000 : 25%
- Au-delà de 5 000 000 : 35%

+ CAC (Centimes Additionnels Communaux) : 10% de l'IRPP
Abattement forfaitaire : 30% du revenu brut
Quotient familial : idem CI (1 à 5 parts)
Retenue mensuelle employeur obligatoire`,
    legal_references: ['CGI-CM Art. 65-80'],
    keywords: ['IRPP', 'Cameroun', 'barème', 'CAC', 'retenue'],
  },

  // ── Retenues à la source ──────────────────────────────────────
  {
    id: 'fisc_retenue_source',
    category: 'fiscalite_ohada',
    title: 'Retenues à la source en zone OHADA',
    content: `Les retenues à la source sont des prélèvements fiscaux effectués par le payeur au profit de l'État.

Types courants :
1. Retenue sur honoraires versés aux professions libérales : 7,5% à 15% selon pays
2. Retenue sur loyers : 5% à 15%
3. Retenue sur dividendes : 10% à 15%
4. Retenue sur intérêts : 10% à 15%
5. Retenue sur prestations versées à des non-résidents : 20% à 25%
6. Retenue sur marchés publics : 2% à 5%

Taux par pays (honoraires) :
- CI : 7,5% (résidents), 20% (non-résidents)
- SN : 5% (résidents)
- CM : 5,5% (résidents), 15% (non-résidents)
- GA : 10%

Le payeur est responsable du reversement dans les 15 jours du mois suivant.
Écriture : D 6xx (charge) → C 447 (État, retenues) pour le montant retenu`,
    legal_references: ['CGI-CI Art. 92', 'CGI-SN Art. 195', 'CGI-CM Art. 92'],
    keywords: ['retenue source', 'honoraires', 'dividendes', 'non-résident', 'prélèvement'],
  },

  // ── Déficits fiscaux ──────────────────────────────────────────
  {
    id: 'fisc_deficits',
    category: 'fiscalite_ohada',
    title: 'Report des déficits fiscaux en zone OHADA',
    content: `Le report des déficits fiscaux varie selon les pays :
- Côte d'Ivoire : 5 ans de report en avant, pas de report en arrière
- Sénégal : 3 ans
- Cameroun : 4 ans
- Gabon : 5 ans
- Mali : 5 ans
- Burkina Faso : 5 ans
- Togo : 5 ans

Règles communes :
- Le déficit s'impute en priorité sur les bénéfices des exercices les plus anciens
- Seuls les déficits d'exploitation sont reportables (pas les pertes HAO dans certains pays)
- L'IMF/minimum fiscal reste dû même en cas de déficit reportable
- En cas de changement d'activité ou de contrôle, le droit au report peut être perdu`,
    legal_references: ['CGI-CI Art. 4', 'CGI-SN Art. 8', 'CGI-CM Art. 6'],
    keywords: ['déficit', 'report', 'perte', 'imputation', 'carry forward'],
  },

  // ── Patente et taxes locales ──────────────────────────────────
  {
    id: 'fisc_patente',
    category: 'fiscalite_ohada',
    title: 'Patente et contributions locales',
    content: `La patente (ou contribution des patentes) est un impôt local dû par toute personne exerçant une activité commerciale, industrielle ou professionnelle.

Côte d'Ivoire :
- Droit sur le CA : 0,5% du CA N-1 (minimum 300 000 FCFA)
- Droit sur la valeur locative : 18,5% de la valeur locative des locaux professionnels
- Échéance : 30 juin

Sénégal :
- Patente (CFCE) : 3% de la masse salariale + contribution foncière
- Minimum : 100 000 FCFA

Cameroun :
- Patente : proportionnelle au CA
- Licence : forfaitaire selon l'activité

Ces taxes sont comptabilisées au compte 64 (Impôts et taxes).`,
    legal_references: ['CGI-CI Art. 267-300', 'CGI-SN Art. 360'],
    keywords: ['patente', 'taxes locales', 'contribution', 'foncière', 'CFCE'],
  },

  // ── Conventions fiscales ──────────────────────────────────────
  {
    id: 'fisc_conventions',
    category: 'fiscalite_ohada',
    title: 'Conventions fiscales en zone OHADA',
    content: `La directive UEMOA et la convention CEMAC harmonisent la fiscalité :

UEMOA (zone XOF) :
- Convention multilatérale visant à éviter la double imposition (1966)
- Directive TVA harmonisée (taux plancher 15%, taux plafond 18%)
- Directive IS : convergence vers 25-30%

CEMAC (zone XAF) :
- Convention multilatérale CEMAC contre la double imposition
- Directive TVA harmonisée

Bilatérales :
- La CI a des conventions avec la France, le Maroc, le Canada, etc.
- Le Sénégal avec la France, la Belgique, etc.

Prix de transfert : les règles OCDE sont de plus en plus adoptées (obligation documentaire).`,
    legal_references: ['Directive UEMOA n°02/98', 'Convention CEMAC'],
    keywords: ['convention fiscale', 'double imposition', 'UEMOA', 'CEMAC', 'prix transfert'],
  },

  // ── Zones franches ────────────────────────────────────────────
  {
    id: 'fisc_zones_franches',
    category: 'fiscalite_ohada',
    title: "Codes des investissements et zones franches",
    content: `Chaque pays OHADA dispose d'un Code des Investissements offrant des avantages fiscaux :

Côte d'Ivoire — Code des Investissements 2018 :
- Zone A (Abidjan) : 5 ans d'exonération IS
- Zone B (intérieur) : 8 ans d'exonération IS
- Zone C (zones défavorisées) : 15 ans d'exonération IS
- Exonération TVA sur équipements pendant la phase d'investissement

Sénégal — Code des Investissements 2012 :
- Agrément PME : 5 ans exonération IS
- Zone économique spéciale de Diamniadio : 15 ans exonération IS

Cameroun — Loi sur les incitations à l'investissement 2013 :
- Phase d'installation : exonération IS et droits de douane (5-10 ans)
- Phase d'exploitation : réduction IS de 50% (5 ans)

Les avantages sont conditionnés au respect d'engagements (emploi, investissement minimum).`,
    legal_references: ['Ordonnance 2018-646 (CI)', 'Loi 2012-32 (SN)', 'Loi 2013-004 (CM)'],
    keywords: ['code investissements', 'zone franche', 'exonération', 'avantages fiscaux'],
  },

  // Droits d'enregistrement
  {
    id: 'fisc_enregistrement',
    category: 'fiscalite_ohada',
    title: "Droits d'enregistrement et timbres",
    content: `Les droits d'enregistrement s'appliquent aux actes juridiques :

Création de société :
- CI : 0,6% du capital (minimum 18 000 FCFA)
- SN : 1% du capital
- CM : 1% du capital

Cession de parts sociales :
- CI : 5% du prix de cession
- SN : 3% du prix de cession

Mutation immobilière :
- CI : 4% à 7% selon la valeur
- SN : 5%

Baux commerciaux :
- Droit proportionnel sur le montant total des loyers

Ces droits sont comptabilisés au 646 (Droits d'enregistrement) ou activés si liés à une immobilisation.`,
    legal_references: ['CGI-CI Art. 700-800', 'CGI-SN Art. 500-600'],
    keywords: ['enregistrement', 'timbre', 'cession', 'mutation', 'parts sociales'],
  },
];
