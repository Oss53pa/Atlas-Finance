// @ts-nocheck
/**
 * GenerateurEtatsFinanciers — Bilan + CR + TAFIRE + Notes SYSCOHADA
 * Réf: SYSCOHADA art. 11, 28; AUDCIF art. 32-33
 */
import type { ToolDefinition } from '../ToolRegistry';
import type { DataAdapter } from '@atlas/data';

// ── TYPES ────────────────────────────────────────────────────

interface LigneBalance { compte: string; libelle: string; debit: number; credit: number; solde: number; }

interface PosteEtat { ref: string; libelle: string; comptes: string; montant_brut: number; amortissements: number; montant_net: number; }

interface LigneSIG { ref: string; libelle: string; montant: number; formule: string; }

interface LigneTAFIRE { ref: string; libelle: string; montant: number; }

interface NoteAnnexe { numero: number; titre: string; contenu: string; }

function somme(balance: LigneBalance[], prefixes: string[], sens: 'debit' | 'credit' | 'solde' = 'solde'): number {
  return balance
    .filter(l => prefixes.some(p => l.compte.startsWith(p)))
    .reduce((a, l) => a + (sens === 'debit' ? l.debit : sens === 'credit' ? l.credit : l.solde), 0);
}

function abs(n: number): number { return Math.abs(n); }

// ── BILAN ────────────────────────────────────────────────────

function genererBilan(balance: LigneBalance[]) {
  const actifPostes: PosteEtat[] = [
    { ref: 'AD', libelle: 'Frais d\'établissement', comptes: '201', montant_brut: abs(somme(balance, ['201'])), amortissements: abs(somme(balance, ['2801'])), montant_net: 0 },
    { ref: 'AE', libelle: 'Brevets, licences, logiciels', comptes: '212,213,214', montant_brut: abs(somme(balance, ['212', '213', '214'])), amortissements: abs(somme(balance, ['2812', '2813', '2814'])), montant_net: 0 },
    { ref: 'AF', libelle: 'Fonds commercial (goodwill)', comptes: '215,217', montant_brut: abs(somme(balance, ['215', '217'])), amortissements: abs(somme(balance, ['2815', '2817'])), montant_net: 0 },
    { ref: 'AJ', libelle: 'Terrains', comptes: '22', montant_brut: abs(somme(balance, ['22'])), amortissements: 0, montant_net: 0 },
    { ref: 'AK', libelle: 'Bâtiments', comptes: '23', montant_brut: abs(somme(balance, ['23'])), amortissements: abs(somme(balance, ['283'])), montant_net: 0 },
    { ref: 'AL', libelle: 'Installations et agencements', comptes: '24', montant_brut: abs(somme(balance, ['24'])), amortissements: abs(somme(balance, ['284'])), montant_net: 0 },
    { ref: 'AM', libelle: 'Matériel', comptes: '241,242,243,244,245', montant_brut: abs(somme(balance, ['241', '242', '243', '244', '245'])), amortissements: abs(somme(balance, ['2841', '2842', '2843'])), montant_net: 0 },
    { ref: 'AN', libelle: 'Matériel de transport', comptes: '245', montant_brut: abs(somme(balance, ['245'])), amortissements: abs(somme(balance, ['2845'])), montant_net: 0 },
    { ref: 'AQ', libelle: 'Titres de participation', comptes: '26', montant_brut: abs(somme(balance, ['26'])), amortissements: abs(somme(balance, ['296'])), montant_net: 0 },
    { ref: 'AR', libelle: 'Autres immobilisations financières', comptes: '27', montant_brut: abs(somme(balance, ['27'])), amortissements: 0, montant_net: 0 },
    { ref: 'BA', libelle: 'Marchandises', comptes: '31', montant_brut: abs(somme(balance, ['31'])), amortissements: abs(somme(balance, ['391'])), montant_net: 0 },
    { ref: 'BB', libelle: 'Matières premières', comptes: '32', montant_brut: abs(somme(balance, ['32'])), amortissements: abs(somme(balance, ['392'])), montant_net: 0 },
    { ref: 'BC', libelle: 'Autres stocks', comptes: '33,34,35,36,37,38', montant_brut: abs(somme(balance, ['33', '34', '35', '36', '37', '38'])), amortissements: abs(somme(balance, ['393', '394', '395'])), montant_net: 0 },
    { ref: 'BH', libelle: 'Fournisseurs avances versées', comptes: '409', montant_brut: abs(somme(balance, ['409'])), amortissements: 0, montant_net: 0 },
    { ref: 'BI', libelle: 'Clients', comptes: '41', montant_brut: abs(somme(balance, ['41'])), amortissements: abs(somme(balance, ['491'])), montant_net: 0 },
    { ref: 'BJ', libelle: 'Autres créances', comptes: '42,43,44,45,46,47', montant_brut: abs(somme(balance, ['42', '43', '44', '45', '46', '47'])), amortissements: 0, montant_net: 0 },
    { ref: 'BQ', libelle: 'Valeurs à encaisser', comptes: '51', montant_brut: abs(somme(balance, ['51'])), amortissements: 0, montant_net: 0 },
    { ref: 'BR', libelle: 'Banques', comptes: '52', montant_brut: abs(somme(balance, ['52'])), amortissements: 0, montant_net: 0 },
    { ref: 'BS', libelle: 'Caisse', comptes: '57', montant_brut: abs(somme(balance, ['57'])), amortissements: 0, montant_net: 0 },
  ];
  actifPostes.forEach(p => { p.montant_net = p.montant_brut - p.amortissements; });

  const passifPostes: PosteEtat[] = [
    { ref: 'CA', libelle: 'Capital', comptes: '101', montant_brut: abs(somme(balance, ['101'])), amortissements: 0, montant_net: abs(somme(balance, ['101'])) },
    { ref: 'CB', libelle: 'Primes d\'apport', comptes: '105', montant_brut: abs(somme(balance, ['105'])), amortissements: 0, montant_net: abs(somme(balance, ['105'])) },
    { ref: 'CC', libelle: 'Écart de réévaluation', comptes: '106', montant_brut: abs(somme(balance, ['106'])), amortissements: 0, montant_net: abs(somme(balance, ['106'])) },
    { ref: 'CE', libelle: 'Réserves', comptes: '11', montant_brut: abs(somme(balance, ['11'])), amortissements: 0, montant_net: abs(somme(balance, ['11'])) },
    { ref: 'CF', libelle: 'Report à nouveau', comptes: '12', montant_brut: abs(somme(balance, ['12'])), amortissements: 0, montant_net: abs(somme(balance, ['12'])) },
    { ref: 'CG', libelle: 'Résultat net', comptes: '13', montant_brut: abs(somme(balance, ['13'])), amortissements: 0, montant_net: abs(somme(balance, ['13'])) },
    { ref: 'CH', libelle: 'Subventions d\'investissement', comptes: '14', montant_brut: abs(somme(balance, ['14'])), amortissements: 0, montant_net: abs(somme(balance, ['14'])) },
    { ref: 'DA', libelle: 'Provisions pour risques', comptes: '19', montant_brut: abs(somme(balance, ['19'])), amortissements: 0, montant_net: abs(somme(balance, ['19'])) },
    { ref: 'DB', libelle: 'Emprunts', comptes: '16', montant_brut: abs(somme(balance, ['16'])), amortissements: 0, montant_net: abs(somme(balance, ['16'])) },
    { ref: 'DC', libelle: 'Dettes de crédit-bail', comptes: '17', montant_brut: abs(somme(balance, ['17'])), amortissements: 0, montant_net: abs(somme(balance, ['17'])) },
    { ref: 'DH', libelle: 'Fournisseurs', comptes: '40', montant_brut: abs(somme(balance, ['40'])), amortissements: 0, montant_net: abs(somme(balance, ['40'])) },
    { ref: 'DI', libelle: 'Dettes fiscales et sociales', comptes: '42,43,44', montant_brut: abs(somme(balance, ['42', '43', '44'])), amortissements: 0, montant_net: abs(somme(balance, ['42', '43', '44'])) },
    { ref: 'DJ', libelle: 'Autres dettes', comptes: '45,46,47,48', montant_brut: abs(somme(balance, ['45', '46', '47', '48'])), amortissements: 0, montant_net: abs(somme(balance, ['45', '46', '47', '48'])) },
    { ref: 'DQ', libelle: 'Banques, concours bancaires', comptes: '56', montant_brut: abs(somme(balance, ['56'])), amortissements: 0, montant_net: abs(somme(balance, ['56'])) },
  ];

  const totalActif = actifPostes.reduce((a, p) => a + p.montant_net, 0);
  const totalPassif = passifPostes.reduce((a, p) => a + p.montant_net, 0);

  return { actif: actifPostes.filter(p => p.montant_net !== 0), passif: passifPostes.filter(p => p.montant_net !== 0), total_actif: Math.round(totalActif), total_passif: Math.round(totalPassif), equilibre: Math.abs(totalActif - totalPassif) <= 1, ecart: Math.round(totalActif - totalPassif) };
}

// ── COMPTE DE RÉSULTAT + SIG ─────────────────────────────────

function genererCompteResultat(balance: LigneBalance[]) {
  const ventesMarchandises = abs(somme(balance, ['701'], 'credit'));
  const achatsMarchandises = abs(somme(balance, ['601'], 'debit'));
  const variationStocksMarch = somme(balance, ['6031'], 'solde');
  const margeBrute = ventesMarchandises - achatsMarchandises - variationStocksMarch;

  const production = abs(somme(balance, ['702', '703', '704', '705', '706', '707', '71', '72'], 'credit'));
  const achatsMP = abs(somme(balance, ['602', '604', '605', '608'], 'debit'));
  const variationStocksMP = somme(balance, ['6032', '6033'], 'solde');
  const servicesExterieurs = abs(somme(balance, ['61', '62'], 'debit'));
  const valeurAjoutee = margeBrute + production - achatsMP - variationStocksMP - servicesExterieurs;

  const subventionsExpl = abs(somme(balance, ['71'], 'credit'));
  const impotsTaxes = abs(somme(balance, ['64'], 'debit'));
  const chargesPersonnel = abs(somme(balance, ['66'], 'debit'));
  const ebe = valeurAjoutee + subventionsExpl - impotsTaxes - chargesPersonnel;

  const autresProduits = abs(somme(balance, ['75'], 'credit'));
  const autresCharges = abs(somme(balance, ['65'], 'debit'));
  const dotationsExpl = abs(somme(balance, ['681', '691'], 'debit'));
  const reprisesExpl = abs(somme(balance, ['781', '791'], 'credit'));
  const resultatExploitation = ebe + autresProduits - autresCharges + reprisesExpl - dotationsExpl;

  const prodFinanciers = abs(somme(balance, ['76', '77', '786', '796'], 'credit'));
  const chargesFinancieres = abs(somme(balance, ['67', '686', '696'], 'debit'));
  const resultatFinancier = prodFinanciers - chargesFinancieres;

  const resultatActivitesOrdinaires = resultatExploitation + resultatFinancier;

  const prodHAO = abs(somme(balance, ['82', '84', '86', '88'], 'credit'));
  const chargesHAO = abs(somme(balance, ['81', '83', '85', '87'], 'debit'));
  const resultatHAO = prodHAO - chargesHAO;

  const participationTravailleurs = abs(somme(balance, ['698'], 'debit'));
  const impotSurResultat = abs(somme(balance, ['695', '697'], 'debit'));
  const resultatNet = resultatActivitesOrdinaires + resultatHAO - participationTravailleurs - impotSurResultat;

  const sig: LigneSIG[] = [
    { ref: 'T1', libelle: 'Marge brute sur marchandises', montant: Math.round(margeBrute), formule: 'Ventes marchandises - Achats marchandises ± Variation stocks' },
    { ref: 'T2', libelle: 'Valeur ajoutée', montant: Math.round(valeurAjoutee), formule: 'Marge brute + Production - Consommations intermédiaires' },
    { ref: 'T3', libelle: 'Excédent brut d\'exploitation (EBE)', montant: Math.round(ebe), formule: 'VA + Subventions - Impôts/taxes - Charges personnel' },
    { ref: 'T4', libelle: 'Résultat d\'exploitation', montant: Math.round(resultatExploitation), formule: 'EBE + Autres produits - Autres charges ± DAP/Reprises' },
    { ref: 'T5', libelle: 'Résultat financier', montant: Math.round(resultatFinancier), formule: 'Produits financiers - Charges financières' },
    { ref: 'T6', libelle: 'Résultat des activités ordinaires', montant: Math.round(resultatActivitesOrdinaires), formule: 'RE + RF' },
    { ref: 'T7', libelle: 'Résultat HAO', montant: Math.round(resultatHAO), formule: 'Produits HAO - Charges HAO' },
    { ref: 'T8', libelle: 'Résultat net', montant: Math.round(resultatNet), formule: 'RAO + RHAO - Participation - IS' },
  ];

  return { sig, resultat_net: Math.round(resultatNet), resultat_exploitation: Math.round(resultatExploitation), resultat_financier: Math.round(resultatFinancier), resultat_hao: Math.round(resultatHAO), impot_sur_resultat: Math.round(impotSurResultat) };
}

// ── TAFIRE ───────────────────────────────────────────────────

function genererTAFIRE(balance: LigneBalance[], resultatNet: number) {
  const dotationsAmort = abs(somme(balance, ['681', '691', '686', '696'], 'debit'));
  const reprisesAmort = abs(somme(balance, ['781', '791', '786', '796'], 'credit'));
  const plusValuesCessions = abs(somme(balance, ['82'], 'credit'));
  const moinsValuesCessions = abs(somme(balance, ['81'], 'debit'));
  const caf = resultatNet + dotationsAmort - reprisesAmort - plusValuesCessions + moinsValuesCessions;

  const variationStocks = somme(balance, ['603'], 'solde');
  const variationCreances = somme(balance, ['41'], 'solde') - somme(balance, ['409'], 'solde');
  const variationDettes = somme(balance, ['40'], 'solde');
  const variationBFR = variationStocks + variationCreances - variationDettes;

  const investissements = abs(somme(balance, ['21', '22', '23', '24', '25', '26', '27'], 'debit'));
  const cessions = abs(somme(balance, ['82'], 'credit'));

  const empruntsNouveaux = abs(somme(balance, ['16'], 'credit'));
  const remboursementsEmprunts = abs(somme(balance, ['16'], 'debit'));
  const augmentationCapital = abs(somme(balance, ['101', '105'], 'credit'));
  const dividendes = abs(somme(balance, ['465'], 'debit'));

  const fluxInvestissement = cessions - investissements;
  const fluxFinancement = empruntsNouveaux + augmentationCapital - remboursementsEmprunts - dividendes;
  const variationTresorerie = caf - variationBFR + fluxInvestissement + fluxFinancement;

  const lignes: LigneTAFIRE[] = [
    { ref: 'FA', libelle: 'Capacité d\'Autofinancement (CAF)', montant: Math.round(caf) },
    { ref: 'FB', libelle: 'Variation du BFR', montant: Math.round(variationBFR) },
    { ref: 'FC', libelle: 'Flux net d\'investissement', montant: Math.round(fluxInvestissement) },
    { ref: 'FD', libelle: 'Flux net de financement', montant: Math.round(fluxFinancement) },
    { ref: 'FE', libelle: 'VARIATION DE TRÉSORERIE', montant: Math.round(variationTresorerie) },
  ];

  return { lignes, caf: Math.round(caf), variation_bfr: Math.round(variationBFR), flux_investissement: Math.round(fluxInvestissement), flux_financement: Math.round(fluxFinancement), variation_tresorerie: Math.round(variationTresorerie) };
}

// ── NOTES ────────────────────────────────────────────────────

function genererNotes(systeme: string, exercice: string): NoteAnnexe[] {
  return [
    { numero: 1, titre: 'Référentiel comptable', contenu: `Les comptes annuels sont établis conformément au Système Comptable OHADA (SYSCOHADA révisé 2017), système ${systeme}. Les principes de prudence, de continuité d'exploitation, de permanence des méthodes et d'indépendance des exercices ont été respectés.` },
    { numero: 2, titre: 'Immobilisations', contenu: 'Les immobilisations sont enregistrées à leur coût d\'acquisition ou de production. Les amortissements sont calculés suivant le mode linéaire sur la durée d\'utilité estimée.' },
    { numero: 3, titre: 'Stocks', contenu: 'Les stocks sont évalués au coût moyen pondéré (CUMP). Une dépréciation est constatée lorsque la valeur nette de réalisation est inférieure au coût.' },
    { numero: 4, titre: 'Créances', contenu: 'Les créances sont enregistrées à leur valeur nominale. Une dépréciation est constituée lorsque le recouvrement est incertain.' },
    { numero: 5, titre: 'Exercice comptable', contenu: `Exercice clos le 31/12/${exercice}, d'une durée de 12 mois.` },
  ];
}

// ── TOOL DEFINITION ──────────────────────────────────────────

export const etatsFinanciersTools: Record<string, ToolDefinition> = {
  generer_etats_financiers: {
    schema: {
      type: 'function',
      function: {
        name: 'generer_etats_financiers',
        description: 'Génère les états financiers SYSCOHADA complets : Bilan, Compte de Résultat avec SIG, TAFIRE et Notes annexes. Vérifie l\'équilibre du bilan. Réf: SYSCOHADA art. 11, 28; AUDCIF art. 32-33.',
        parameters: {
          type: 'object',
          properties: {
            exercice: { type: 'string' },
            systeme: { type: 'string', enum: ['normal', 'allege', 'minimal'], default: 'normal' },
            inclure: { type: 'array', items: { type: 'string', enum: ['bilan', 'compte_resultat', 'tafire', 'notes'] } },
            balance: { type: 'array', items: { type: 'object' }, description: 'Balance générale [{compte, libelle, debit, credit, solde}]' },
          },
          required: ['exercice', 'balance'],
        },
      },
    },
    execute: async (args, adapter) => {
      const { exercice, systeme, inclure } = args as any;
      const sys = systeme || 'normal';
      const inc = inclure || ['bilan', 'compte_resultat', 'tafire', 'notes'];
      const result: any = { exercice, systeme: sys };

      // Lire les données réelles via DataAdapter si disponible
      let balance = args.balance as any[];
      if ((!balance || balance.length === 0) && adapter) {
        const rows = await adapter.getTrialBalance({ start: `${exercice}-01-01`, end: `${exercice}-12-31` });
        balance = rows.map((r: any) => ({
          compte: r.accountCode,
          libelle: r.accountName,
          debit: r.totalDebit || 0,
          credit: r.totalCredit || 0,
          solde: (r.totalDebit || 0) - (r.totalCredit || 0),
        }));
      }
      if (!balance || balance.length === 0) {
        return JSON.stringify({ error: 'Aucune donnée de balance disponible. Fournir la balance ou connecter un DataAdapter.' });
      }

      if (inc.includes('bilan')) {
        result.bilan = genererBilan(balance);
      }
      if (inc.includes('compte_resultat')) {
        result.compte_resultat = genererCompteResultat(balance);
      }
      if (inc.includes('tafire') && sys === 'normal') {
        const resNet = result.compte_resultat?.resultat_net ?? genererCompteResultat(balance).resultat_net;
        result.tafire = genererTAFIRE(balance, resNet);
      }
      if (inc.includes('notes')) {
        result.notes_annexes = genererNotes(sys, exercice);
      }

      result.verification = {
        bilan_equilibre: result.bilan?.equilibre ?? true,
        ecart: result.bilan?.ecart ?? 0,
        total_actif: result.bilan?.total_actif ?? 0,
        total_passif: result.bilan?.total_passif ?? 0,
      };

      return JSON.stringify(result, null, 2);
    },
  },
};
