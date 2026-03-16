// @ts-nocheck
/**
 * Knowledge Base — Paie et cotisations sociales
 * Organismes par pays, taux, barèmes, écritures
 */
import type { SyscohadaKnowledgeChunk } from '../../proph3t/types/knowledge';

export const paieKnowledge: SyscohadaKnowledgeChunk[] = [
  {
    id: 'paie_ci',
    category: 'paie_ci',
    title: "Cotisations sociales — Côte d'Ivoire (CNPS)",
    content: `Organisme : CNPS (Caisse Nationale de Prévoyance Sociale)

Cotisations patronales :
- Prestations familiales (PF) : 5,75% du salaire brut (plafond 70 000/mois)
- Accidents du travail (AT) : 2% à 5% selon le secteur (plafond 70 000)
- Retraite (IPS-CGRAE pour public, CNPS pour privé) : 7,7% (plafond 2 421 600/an)
Total patronal : ~15,45% à 18,45%

Cotisations salariales :
- Retraite : 6,3% (plafond 2 421 600/an)
Total salarié : ~6,3%

Autres charges :
- FDFP (Formation Professionnelle) : 0,6% du brut (entreprises ≥ 10 salariés)
- Taxe d'apprentissage : 0,4%

IRPP (retenue mensuelle) : selon barème progressif (payé par l'employé)
Contribution Nationale (CN) : 1,5% à 10% selon tranche de revenu

Échéances : cotisations CNPS dues le 15 du mois suivant.`,
    legal_references: ['Code du travail CI', 'Décret 2012-884', 'CNPS'],
    keywords: ['paie', 'Côte d\'Ivoire', 'CNPS', 'cotisations', 'retraite', 'FDFP'],
  },
  {
    id: 'paie_sn',
    category: 'paie_sn',
    title: 'Cotisations sociales — Sénégal (CSS/IPRES)',
    content: `Organismes :
- CSS (Caisse de Sécurité Sociale) : prestations familiales et AT
- IPRES (Institution de Prévoyance Retraite du Sénégal) : retraite

Cotisations patronales :
- Prestations familiales (CSS) : 7% (plafond 63 000/mois)
- Accidents du travail (CSS) : 1% à 5% selon risque (plafond 63 000)
- Retraite de base (IPRES) : 8,4% (plafond 360 000/mois)
- Retraite complémentaire (IPRES-RC) : 3,6% (plafond 1 080 000/mois) — cadres
Total patronal : ~16% à 24%

Cotisations salariales :
- Retraite de base (IPRES) : 5,6% (plafond 360 000)
- Retraite complémentaire : 2,4% (cadres)
Total salarié : ~5,6% à 8%

CFCE (Contribution Forfaitaire à la Charge de l'Employeur) : 3% de la masse salariale
Taxe représentative de l'impôt du minimum fiscal : 3%`,
    legal_references: ['Code du travail SN', 'CSS', 'IPRES'],
    keywords: ['paie', 'Sénégal', 'CSS', 'IPRES', 'cotisations', 'CFCE'],
  },
  {
    id: 'paie_cm',
    category: 'paie_cm',
    title: 'Cotisations sociales — Cameroun (CNPS)',
    content: `Organisme : CNPS (Caisse Nationale de Prévoyance Sociale)

Cotisations patronales :
- Allocations familiales : 7% (plafond 750 000/mois)
- Accidents du travail : 1,75% à 5% selon secteur (plafond 750 000)
- Assurance vieillesse : 4,2% (plafond 750 000)
Total patronal : ~12,95% à 16,2%

Cotisations salariales :
- Assurance vieillesse : 2,8% (plafond 750 000)
Total salarié : ~2,8%

Crédit foncier : 1% patronal + 1% salarié
RAV (Redevance Audio-Visuelle) : forfait mensuel

Particularités Cameroun :
- Le CAC (10%) s'applique aussi sur les taxes sur salaires
- IRPP retenu mensuellement selon barème progressif
- Les cotisations CNPS sont dues le 15 du mois suivant`,
    legal_references: ['Code du travail CM', 'CNPS-CM', 'CGI-CM'],
    keywords: ['paie', 'Cameroun', 'CNPS', 'cotisations', 'vieillesse', 'CAC'],
  },
  {
    id: 'paie_ga',
    category: 'paie_ga',
    title: 'Cotisations sociales — Gabon (CNSS)',
    content: `Organisme : CNSS (Caisse Nationale de Sécurité Sociale)

Cotisations patronales :
- Prestations familiales : 8% (pas de plafond)
- Accidents du travail : 3% (pas de plafond)
- Assurance vieillesse : 5% (plafond 1 500 000/mois)
Total patronal : ~16%

Cotisations salariales :
- Assurance vieillesse : 2,5% (plafond 1 500 000)
Total salarié : ~2,5%

CNAMGS (Caisse Nationale d'Assurance Maladie) :
- Patronal : 4,1% du salaire brut
- Salarié : 2,5% du salaire brut

Particularités Gabon :
- Salaire minimum (SMIG) : 150 000 XAF/mois
- Les entreprises pétrolières ont des taux spécifiques`,
    legal_references: ['Code de prévoyance sociale GA', 'CNSS-GA'],
    keywords: ['paie', 'Gabon', 'CNSS', 'CNAMGS', 'cotisations'],
  },
  {
    id: 'paie_autres_pays',
    category: 'paie_ohada',
    title: 'Cotisations sociales — Autres pays OHADA',
    content: `Organismes de sécurité sociale par pays :

Burkina Faso : CNSS — patronal ~16%, salarié ~5,5%
Mali : INPS (Institut National de Prévoyance Sociale) — patronal ~21%, salarié ~3,6%
Niger : CNSS — patronal ~16%, salarié ~5,25%
Togo : CNSS — patronal ~17,5%, salarié ~4%
Bénin : CNSS — patronal ~15,4%, salarié ~3,6%
Guinée : CNSS — patronal ~18%, salarié ~5%
Tchad : CNPS — patronal ~16,5%, salarié ~3,5%
Centrafrique : CNSS — patronal ~19%, salarié ~3%
Congo-Brazzaville : CNSS — patronal ~22%, salarié ~4%
RD Congo : CNSS — patronal ~9%, salarié ~5%
Comores : CNSS — patronal ~13%, salarié ~2%
Guinée-Bissau : INPS — patronal ~19%, salarié ~8%
Guinée Équatoriale : INSESO — patronal ~21,5%, salarié ~4,5%

Note : ces taux sont indicatifs et incluent les principales branches (famille, AT, retraite).
Vérifier les plafonds et taux en vigueur dans chaque pays.`,
    legal_references: ['Codes de sécurité sociale de chaque pays'],
    keywords: ['cotisations', 'sécurité sociale', 'CNSS', 'INPS', 'pays OHADA', 'patronal', 'salarié'],
  },
  {
    id: 'paie_ecriture_comptable',
    category: 'paie_ohada',
    title: 'Comptabilisation complète de la paie SYSCOHADA',
    content: `Comptabilisation de la paie en 4 étapes :

1) Constatation du salaire brut et retenues :
D 661 Rémunérations du personnel permanent .. brut total
  C 421 Personnel, rémunérations dues ........ net à payer
  C 4311 CNPS part salariale ................. cotis. salarié
  C 4471 Impôts sur salaires (IRPP) .......... retenue IRPP
  C 4472 Contribution nationale .............. CN (si CI)

2) Charges patronales :
D 6641 Charges sociales sur rémunérations .... cotis. patronal
D 6642 FDFP / Formation professionnelle ...... 0,6% (si CI)
  C 4311 CNPS part patronale ................. cotis. patronal
  C 4472 FDFP à payer ...................... formation

3) Paiement des salaires nets :
D 421 Personnel, rémunérations dues .......... net à payer
  C 521 Banque (ou 571 Caisse) ............... net à payer

4) Reversement des cotisations et impôts :
D 4311 CNPS .................................. total cotis.
D 4471 IRPP .................................. total retenues
  C 521 Banque ................................ total à reverser

Délai de reversement : 15 du mois suivant (CNPS/CSS/CNSS) et 15 du mois (IRPP).`,
    legal_references: ['AUDCIF Art. 17', 'Code du travail OHADA'],
    keywords: ['comptabilisation', 'paie', 'écriture', 'CNPS', 'IRPP', 'cotisations'],
  },
  {
    id: 'paie_conges_payes',
    category: 'paie_ohada',
    title: 'Congés payés en zone OHADA',
    content: `Les congés payés sont un droit du salarié réglementé par les codes du travail OHADA.

Acquisition :
- Droit commun : 2,5 jours ouvrables par mois de travail effectif = 30 jours/an
- Supplément ancienneté : +1 jour par tranche de 5 ans d'ancienneté
- Majorations possibles : travail de nuit, mères de famille

Indemnité de congé :
- 1/12 de la rémunération totale perçue pendant la période de référence
- Doit être au moins égale au salaire que le salarié aurait perçu s'il avait travaillé

Provision pour congés payés (en clôture) :
Si des congés sont acquis mais non pris au 31/12, il faut les provisionner.
D 6612 Provision pour congés payés ....... montant estimé
  C 4282 Dettes provisionnées congés ...... montant estimé

Le montant = salaire brut × (jours acquis non pris / jours ouvrables mois) + charges patronales

En zone OHADA, la période de référence va du 1er janvier au 31 décembre.`,
    legal_references: ['Code du travail OHADA Art. 25', 'AUDCIF Art. 48'],
    keywords: ['congés payés', 'provision', 'indemnité', 'acquisition', 'droit'],
  },
  {
    id: 'paie_gratification',
    category: 'paie_ohada',
    title: 'Gratification et 13ème mois',
    content: `La gratification (ou prime de fin d'année / 13ème mois) est courante en zone OHADA.

Régime juridique :
- Si prévue par la convention collective ou le contrat → obligatoire
- Si versée de façon régulière → devient un usage (obligatoire après 3 ans)
- Si discrétionnaire → pas de provision

Montant courant :
- 13ème mois : 1/12 de la rémunération annuelle brute
- Gratification conventionnelle : 75% à 100% du salaire mensuel

Provision en clôture (si gratification probable) :
D 6611 Provision pour gratification ......... montant
  C 4286 Autres charges de personnel à payer  montant

Comptabilisation du versement :
D 4286 Charges à payer (ou 661 directement) . montant brut
  C 421 Personnel ........................... net
  C 4311 CNPS salarié ....................... cotis.
  C 447 IRPP ................................ retenue

Les cotisations sociales sont dues sur la gratification (elle fait partie de la masse salariale).`,
    legal_references: ['Convention collective interprofessionnelle', 'Code du travail'],
    keywords: ['gratification', '13ème mois', 'prime', 'provision', 'convention collective'],
  },
  {
    id: 'paie_licenciement',
    category: 'paie_ohada',
    title: 'Indemnités de licenciement OHADA',
    content: `En cas de licenciement (hors faute lourde), le salarié a droit à :

1. Indemnité de licenciement (Art. 35 Code du travail OHADA) :
   - 1 à 5 ans : 25% du salaire mensuel × nombre d'années
   - 6 à 10 ans : 30% × nombre d'années
   - Au-delà de 10 ans : 40% × nombre d'années
   Base : salaire moyen des 12 derniers mois

2. Indemnité compensatrice de préavis :
   - Durée selon ancienneté et catégorie (1 à 4 mois)
   - Montant = salaire brut × durée de préavis

3. Indemnité compensatrice de congés non pris :
   - Jours acquis non pris × salaire journalier

Comptabilisation :
D 6583 Indemnités de licenciement .......... montant total
  C 421 Personnel .......................... net à payer
  C 4311 CNPS .............................. cotis. (si applicable)
  C 447 IRPP ............................... retenue (régime spécial)

Provision (si licenciement prévisible) : D 6911 → C 192 Provision pour licenciement`,
    legal_references: ['Code du travail OHADA Art. 35-37', 'Convention collective'],
    keywords: ['licenciement', 'indemnité', 'préavis', 'congés', 'provision'],
  },
];
