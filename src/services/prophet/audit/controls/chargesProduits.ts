// @ts-nocheck
/**
 * Contrôles charges et produits — C68 à C82
 * Charges, produits, cohérence, ratios, IS
 */
import type { DataAdapter } from '@atlas/data';
import type { AuditControl, ControlResult } from '../auditControlsRegistry';

function ok(ref: string, libelle: string, message: string, reference: string, details?: unknown): ControlResult {
  return { ref, libelle, severite: 'BLOQUANT', statut: 'OK', message, reference, details };
}
function err(ref: string, libelle: string, severite: 'BLOQUANT' | 'MAJEUR' | 'MINEUR' | 'INFO', message: string, reference: string, details?: unknown): ControlResult {
  return { ref, libelle, severite, statut: 'ERREUR', message, reference, details };
}
function alerte(ref: string, libelle: string, severite: 'BLOQUANT' | 'MAJEUR' | 'MINEUR' | 'INFO', message: string, reference: string, details?: unknown): ControlResult {
  return { ref, libelle, severite, statut: 'ALERTE', message, reference, details };
}
function skip(ref: string, libelle: string, severite: 'BLOQUANT' | 'MAJEUR' | 'MINEUR' | 'INFO', message: string, reference: string): ControlResult {
  return { ref, libelle, severite, statut: 'SKIP', message, reference };
}

export const chargesProduitsControls: AuditControl[] = [
  {
    ref: 'C68', niveau: 3, categorie: 'charges_produits',
    libelle: 'Charges (6x) globalement débitrices',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const totalCharges = balance
        .filter(r => (r.accountCode || '').startsWith('6'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (totalCharges >= 0) return ok('C68', 'Charges débitrices', `Total charges (classe 6) = ${Math.round(totalCharges)} (débiteur)`, 'SYSCOHADA révisé');
      return alerte('C68', 'Charges débitrices', 'MINEUR', `Total charges (classe 6) créditeur: ${Math.round(totalCharges)} — anomalie`, 'SYSCOHADA révisé');
    },
  },
  {
    ref: 'C69', niveau: 3, categorie: 'charges_produits',
    libelle: 'Produits (7x) globalement créditeurs',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const totalProduits = balance
        .filter(r => (r.accountCode || '').startsWith('7'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (totalProduits >= 0) return ok('C69', 'Produits créditeurs', `Total produits (classe 7) = ${Math.round(totalProduits)} (créditeur)`, 'SYSCOHADA révisé');
      return alerte('C69', 'Produits créditeurs', 'MINEUR', `Total produits (classe 7) débiteur: ${Math.round(totalProduits)} — anomalie`, 'SYSCOHADA révisé');
    },
  },
  {
    ref: 'C70', niveau: 3, categorie: 'charges_produits',
    libelle: 'Pas de compte 6 avec solde > 50% du total charges',
    severite: 'MAJEUR', reference: 'ISA 520 — Procédures analytiques',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const charges = balance.filter(r => (r.accountCode || '').startsWith('6'));
      const totalCharges = charges.reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (totalCharges <= 0) return skip('C70', 'Concentration charges', 'MAJEUR', 'Total charges nul', 'ISA 520 — Procédures analytiques');
      const concentres = charges.filter(r => {
        const solde = (r.totalDebit || 0) - (r.totalCredit || 0);
        return solde > totalCharges * 0.5;
      });
      if (concentres.length === 0) return ok('C70', 'Concentration charges', `Aucun compte de charge ne dépasse 50% du total (${Math.round(totalCharges)})`, 'ISA 520 — Procédures analytiques');
      return err('C70', 'Concentration charges', 'MAJEUR', `${concentres.length} compte(s) > 50% des charges — concentration anormale`, 'ISA 520 — Procédures analytiques', { comptes: concentres.map(r => ({ code: r.accountCode, solde: Math.round((r.totalDebit || 0) - (r.totalCredit || 0)) })) });
    },
  },
  {
    ref: 'C71', niveau: 3, categorie: 'charges_produits',
    libelle: 'Charges personnel (66x) cohérentes avec cotisations (43x)',
    severite: 'MAJEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const chargesPersonnel = balance
        .filter(r => (r.accountCode || '').startsWith('66'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const cotisations = balance
        .filter(r => (r.accountCode || '').startsWith('43'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (chargesPersonnel <= 0) return ok('C71', 'Personnel vs cotisations', 'Pas de charges de personnel.', 'SYSCOHADA révisé');
      if (cotisations > 0) {
        const ratio = cotisations / chargesPersonnel;
        if (ratio >= 0.10 && ratio <= 0.60) return ok('C71', 'Personnel vs cotisations', `Ratio cotisations/charges personnel = ${Math.round(ratio * 100)}% (cohérent)`, 'SYSCOHADA révisé');
        return alerte('C71', 'Personnel vs cotisations', 'MAJEUR', `Ratio cotisations/charges personnel = ${Math.round(ratio * 100)}% — hors fourchette 10-60%`, 'SYSCOHADA révisé', { chargesPersonnel: Math.round(chargesPersonnel), cotisations: Math.round(cotisations) });
      }
      return err('C71', 'Personnel vs cotisations', 'MAJEUR', `Charges personnel = ${Math.round(chargesPersonnel)} mais cotisations sociales (43x) nulles`, 'SYSCOHADA révisé');
    },
  },
  {
    ref: 'C72', niveau: 3, categorie: 'charges_produits',
    libelle: 'Dotations amortissement (681) non nulles si immobilisations existent',
    severite: 'MAJEUR', reference: 'SYSCOHADA révisé Art. 44',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const immosBrutes = balance
        .filter(r => {
          const code = r.accountCode || '';
          return code.startsWith('2') && !code.startsWith('22') && !code.startsWith('25') && !code.startsWith('26') && !code.startsWith('27') && !code.startsWith('28') && !code.startsWith('29');
        })
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const dotation681 = balance
        .filter(r => (r.accountCode || '').startsWith('681'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (immosBrutes <= 0) return ok('C72', 'Dotation amortissement', 'Pas d\'immobilisations amortissables.', 'SYSCOHADA révisé Art. 44');
      if (dotation681 > 0) return ok('C72', 'Dotation amortissement', `Immo brutes = ${Math.round(immosBrutes)}, dotation 681 = ${Math.round(dotation681)}`, 'SYSCOHADA révisé Art. 44');
      return err('C72', 'Dotation amortissement', 'MAJEUR', `Immobilisations = ${Math.round(immosBrutes)} mais dotation amortissement (681) nulle`, 'SYSCOHADA révisé Art. 44');
    },
  },
  {
    ref: 'C73', niveau: 4, categorie: 'charges_produits',
    libelle: 'Achats (60x) cohérents avec fournisseurs (401)',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const achats = balance
        .filter(r => (r.accountCode || '').startsWith('60'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const fournisseurs = balance
        .filter(r => (r.accountCode || '').startsWith('401'))
        .reduce((s, r) => s + (r.totalCredit || 0), 0);
      if (achats <= 0) return ok('C73', 'Achats vs fournisseurs', 'Pas d\'achats.', 'SYSCOHADA révisé');
      if (fournisseurs > 0) return ok('C73', 'Achats vs fournisseurs', `Achats (60x) = ${Math.round(achats)}, mouvements fournisseurs crédit = ${Math.round(fournisseurs)}`, 'SYSCOHADA révisé');
      return alerte('C73', 'Achats vs fournisseurs', 'MINEUR', `Achats = ${Math.round(achats)} mais aucun mouvement fournisseur (401)`, 'SYSCOHADA révisé');
    },
  },
  {
    ref: 'C74', niveau: 4, categorie: 'charges_produits',
    libelle: 'Ventes (70x) cohérentes avec clients (411)',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const ventes = balance
        .filter(r => (r.accountCode || '').startsWith('70'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const clients = balance
        .filter(r => (r.accountCode || '').startsWith('411'))
        .reduce((s, r) => s + (r.totalDebit || 0), 0);
      if (ventes <= 0) return ok('C74', 'Ventes vs clients', 'Pas de ventes.', 'SYSCOHADA révisé');
      if (clients > 0) return ok('C74', 'Ventes vs clients', `Ventes (70x) = ${Math.round(ventes)}, mouvements clients débit = ${Math.round(clients)}`, 'SYSCOHADA révisé');
      return alerte('C74', 'Ventes vs clients', 'MINEUR', `Ventes = ${Math.round(ventes)} mais aucun mouvement client (411)`, 'SYSCOHADA révisé');
    },
  },
  {
    ref: 'C75', niveau: 4, categorie: 'charges_produits',
    libelle: 'Charges financières (67x) cohérentes avec emprunts (16x)',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const chargesFin = balance
        .filter(r => (r.accountCode || '').startsWith('67'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const emprunts = balance
        .filter(r => (r.accountCode || '').startsWith('16'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (chargesFin <= 0 && emprunts <= 0) return ok('C75', 'Charges fin vs emprunts', 'Pas de charges financières ni d\'emprunts.', 'SYSCOHADA révisé');
      if (chargesFin > 0 && emprunts <= 0) return alerte('C75', 'Charges fin vs emprunts', 'MINEUR', `Charges financières (67x) = ${Math.round(chargesFin)} sans emprunts (16x)`, 'SYSCOHADA révisé');
      if (emprunts > 0 && chargesFin <= 0) return alerte('C75', 'Charges fin vs emprunts', 'MINEUR', `Emprunts (16x) = ${Math.round(emprunts)} sans charges financières (67x)`, 'SYSCOHADA révisé');
      return ok('C75', 'Charges fin vs emprunts', `Charges financières = ${Math.round(chargesFin)}, emprunts = ${Math.round(emprunts)}`, 'SYSCOHADA révisé');
    },
  },
  {
    ref: 'C76', niveau: 4, categorie: 'charges_produits',
    libelle: 'Charges HAO (69x) / Produits HAO (79x) pas > 10% du résultat',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const chargesHAO = balance
        .filter(r => (r.accountCode || '').startsWith('69'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const produitsHAO = balance
        .filter(r => (r.accountCode || '').startsWith('79'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const totalCharges = balance
        .filter(r => (r.accountCode || '').startsWith('6'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const totalProduits = balance
        .filter(r => (r.accountCode || '').startsWith('7'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const resultat = totalProduits - totalCharges;
      if (Math.abs(resultat) < 1) return skip('C76', 'HAO vs résultat', 'MINEUR', 'Résultat nul', 'SYSCOHADA révisé');
      const impactHAO = Math.abs(produitsHAO - chargesHAO);
      const ratio = impactHAO / Math.abs(resultat);
      if (ratio <= 0.10) return ok('C76', 'HAO vs résultat', `Impact HAO = ${Math.round(impactHAO)}, résultat = ${Math.round(resultat)} (${Math.round(ratio * 100)}%)`, 'SYSCOHADA révisé');
      return alerte('C76', 'HAO vs résultat', 'MINEUR', `Impact HAO (${Math.round(impactHAO)}) représente ${Math.round(ratio * 100)}% du résultat — éléments non récurrents significatifs`, 'SYSCOHADA révisé');
    },
  },
  {
    ref: 'C77', niveau: 4, categorie: 'charges_produits',
    libelle: 'Variation de stocks (603x) cohérente',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé Art. 52',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const variationStocks = balance
        .filter(r => (r.accountCode || '').startsWith('603'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const stocks = balance
        .filter(r => (r.accountCode || '').startsWith('3'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (variationStocks === 0 && stocks === 0) return ok('C77', 'Variation stocks', 'Pas de stocks ni de variation.', 'SYSCOHADA révisé Art. 52');
      if (stocks > 0 && variationStocks === 0) return alerte('C77', 'Variation stocks', 'MINEUR', `Stocks (3x) = ${Math.round(stocks)} mais variation (603) nulle`, 'SYSCOHADA révisé Art. 52');
      return ok('C77', 'Variation stocks', `Stocks = ${Math.round(stocks)}, variation 603 = ${Math.round(variationStocks)}`, 'SYSCOHADA révisé Art. 52');
    },
  },
  {
    ref: 'C78', niveau: 5, categorie: 'charges_produits',
    libelle: 'Subventions d\'exploitation (71x) justifiées',
    severite: 'INFO', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const subventions = balance
        .filter(r => (r.accountCode || '').startsWith('71'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (subventions <= 0) return ok('C78', 'Subventions exploitation', 'Pas de subventions d\'exploitation.', 'SYSCOHADA révisé');
      return alerte('C78', 'Subventions exploitation', 'INFO', `Subventions d'exploitation (71x) = ${Math.round(subventions)} FCFA — vérifier justificatifs`, 'SYSCOHADA révisé');
    },
  },
  {
    ref: 'C79', niveau: 4, categorie: 'charges_produits',
    libelle: 'Reprises provisions (78x) <= dotations cumulées',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé Art. 48',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const reprises = balance
        .filter(r => (r.accountCode || '').startsWith('78'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const dotations = balance
        .filter(r => (r.accountCode || '').startsWith('68'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (reprises <= 0) return ok('C79', 'Reprises provisions', 'Pas de reprises de provisions.', 'SYSCOHADA révisé Art. 48');
      if (reprises <= dotations) return ok('C79', 'Reprises provisions', `Reprises (78x) = ${Math.round(reprises)} <= dotations (68x) = ${Math.round(dotations)}`, 'SYSCOHADA révisé Art. 48');
      return alerte('C79', 'Reprises provisions', 'MINEUR', `Reprises (${Math.round(reprises)}) > dotations exercice (${Math.round(dotations)}) — vérifier dotations N-1`, 'SYSCOHADA révisé Art. 48');
    },
  },
  {
    ref: 'C80', niveau: 3, categorie: 'charges_produits',
    libelle: 'IS (695) comptabilisé si bénéfice',
    severite: 'MAJEUR', reference: 'CGI UEMOA',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const totalProduits = balance
        .filter(r => (r.accountCode || '').startsWith('7'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const totalCharges = balance
        .filter(r => (r.accountCode || '').startsWith('6'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const resultat = totalProduits - totalCharges;
      if (resultat <= 0) return ok('C80', 'IS comptabilisé', `Résultat déficitaire (${Math.round(resultat)}) — pas d'IS obligatoire.`, 'CGI UEMOA');
      const is695 = balance
        .filter(r => (r.accountCode || '').startsWith('695'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (is695 > 0) return ok('C80', 'IS comptabilisé', `Résultat = ${Math.round(resultat)}, IS (695) = ${Math.round(is695)}`, 'CGI UEMOA');
      return err('C80', 'IS comptabilisé', 'MAJEUR', `Résultat bénéficiaire (${Math.round(resultat)}) mais IS (695) non comptabilisé`, 'CGI UEMOA');
    },
  },
  {
    ref: 'C81', niveau: 5, categorie: 'charges_produits',
    libelle: 'Charges exceptionnelles détaillées',
    severite: 'INFO', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const chargesExcep = balance.filter(r => (r.accountCode || '').startsWith('69'));
      if (chargesExcep.length === 0) return ok('C81', 'Charges exceptionnelles', 'Aucune charge HAO (69x).', 'SYSCOHADA révisé');
      const total = chargesExcep.reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      return alerte('C81', 'Charges exceptionnelles', 'INFO', `${chargesExcep.length} compte(s) HAO (69x) pour un total de ${Math.round(total)} FCFA — vérifier détail`, 'SYSCOHADA révisé', { comptes: chargesExcep.map(r => r.accountCode) });
    },
  },
  {
    ref: 'C82', niveau: 5, categorie: 'charges_produits',
    libelle: 'Ratio charges personnel / CA dans les normes',
    severite: 'INFO', reference: 'ISA 520 — Procédures analytiques',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const ca = balance
        .filter(r => (r.accountCode || '').startsWith('70'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const chargesPersonnel = balance
        .filter(r => (r.accountCode || '').startsWith('66'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (ca <= 0) return skip('C82', 'Ratio personnel/CA', 'INFO', 'CA nul', 'ISA 520 — Procédures analytiques');
      const ratio = chargesPersonnel / ca;
      if (ratio <= 0.50) return ok('C82', 'Ratio personnel/CA', `Charges personnel / CA = ${Math.round(ratio * 100)}%`, 'ISA 520 — Procédures analytiques');
      return alerte('C82', 'Ratio personnel/CA', 'INFO', `Charges personnel / CA = ${Math.round(ratio * 100)}% (> 50%) — ratio élevé`, 'ISA 520 — Procédures analytiques', { chargesPersonnel: Math.round(chargesPersonnel), ca: Math.round(ca) });
    },
  },
];
