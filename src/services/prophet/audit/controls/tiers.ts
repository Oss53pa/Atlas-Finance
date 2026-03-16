// @ts-nocheck
/**
 * Contrôles tiers — C43 à C57
 * Clients, fournisseurs, TVA, dettes sociales/fiscales, lettrage
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

export const tiersControls: AuditControl[] = [
  {
    ref: 'C43', niveau: 3, categorie: 'tiers',
    libelle: 'Clients (411) solde débiteur normal',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const clients = balance.filter(r => (r.accountCode || '').startsWith('411'));
      const crediteurs = clients.filter(r => (r.totalCredit || 0) - (r.totalDebit || 0) > 100);
      if (crediteurs.length === 0) return ok('C43', 'Clients débiteurs', 'Tous les comptes clients ont un solde débiteur normal.', 'SYSCOHADA révisé');
      return alerte('C43', 'Clients débiteurs', 'MINEUR', `${crediteurs.length} compte(s) client(s) avec solde créditeur — reclassement en 419 nécessaire`, 'SYSCOHADA révisé', { comptes: crediteurs.map(r => r.accountCode).slice(0, 10) });
    },
  },
  {
    ref: 'C44', niveau: 3, categorie: 'tiers',
    libelle: 'Fournisseurs (401) solde créditeur normal',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const fournisseurs = balance.filter(r => (r.accountCode || '').startsWith('401'));
      const debiteurs = fournisseurs.filter(r => (r.totalDebit || 0) - (r.totalCredit || 0) > 100);
      if (debiteurs.length === 0) return ok('C44', 'Fournisseurs créditeurs', 'Tous les comptes fournisseurs ont un solde créditeur normal.', 'SYSCOHADA révisé');
      return alerte('C44', 'Fournisseurs créditeurs', 'MINEUR', `${debiteurs.length} compte(s) fournisseur(s) avec solde débiteur — reclassement en 409 nécessaire`, 'SYSCOHADA révisé', { comptes: debiteurs.map(r => r.accountCode).slice(0, 10) });
    },
  },
  {
    ref: 'C45', niveau: 4, categorie: 'tiers',
    libelle: 'Clients créditeurs reclassés en 419',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé Art. 66',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const clientsCrediteurs = balance
        .filter(r => (r.accountCode || '').startsWith('411'))
        .filter(r => (r.totalCredit || 0) - (r.totalDebit || 0) > 100);
      const avancesClients = balance
        .filter(r => (r.accountCode || '').startsWith('419'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (clientsCrediteurs.length === 0) return ok('C45', 'Reclassement clients', 'Pas de clients créditeurs à reclasser.', 'SYSCOHADA révisé Art. 66');
      if (avancesClients > 0) return ok('C45', 'Reclassement clients', `${clientsCrediteurs.length} client(s) créditeur(s), avances reçues (419) = ${Math.round(avancesClients)}`, 'SYSCOHADA révisé Art. 66');
      return alerte('C45', 'Reclassement clients', 'MINEUR', `${clientsCrediteurs.length} client(s) créditeur(s) non reclassés en 419`, 'SYSCOHADA révisé Art. 66');
    },
  },
  {
    ref: 'C46', niveau: 4, categorie: 'tiers',
    libelle: 'Fournisseurs débiteurs reclassés en 409',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé Art. 66',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const fournisseursDebiteurs = balance
        .filter(r => (r.accountCode || '').startsWith('401'))
        .filter(r => (r.totalDebit || 0) - (r.totalCredit || 0) > 100);
      const avancesFourn = balance
        .filter(r => (r.accountCode || '').startsWith('409'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (fournisseursDebiteurs.length === 0) return ok('C46', 'Reclassement fournisseurs', 'Pas de fournisseurs débiteurs à reclasser.', 'SYSCOHADA révisé Art. 66');
      if (avancesFourn > 0) return ok('C46', 'Reclassement fournisseurs', `${fournisseursDebiteurs.length} fournisseur(s) débiteur(s), avances versées (409) = ${Math.round(avancesFourn)}`, 'SYSCOHADA révisé Art. 66');
      return alerte('C46', 'Reclassement fournisseurs', 'MINEUR', `${fournisseursDebiteurs.length} fournisseur(s) débiteur(s) non reclassés en 409`, 'SYSCOHADA révisé Art. 66');
    },
  },
  {
    ref: 'C47', niveau: 3, categorie: 'tiers',
    libelle: 'Provision créances douteuses (491) si ancienneté > 90j',
    severite: 'MAJEUR', reference: 'SYSCOHADA révisé Art. 48',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const clientsDouteux = balance
        .filter(r => (r.accountCode || '').startsWith('416'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const provision491 = balance
        .filter(r => (r.accountCode || '').startsWith('491'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (clientsDouteux <= 0) return ok('C47', 'Provision créances douteuses', 'Pas de créances douteuses (416).', 'SYSCOHADA révisé Art. 48');
      if (provision491 > 0) return ok('C47', 'Provision créances douteuses', `Créances douteuses (416) = ${Math.round(clientsDouteux)}, provision (491) = ${Math.round(provision491)}`, 'SYSCOHADA révisé Art. 48');
      return err('C47', 'Provision créances douteuses', 'MAJEUR', `Créances douteuses (416) = ${Math.round(clientsDouteux)} sans provision (491)`, 'SYSCOHADA révisé Art. 48');
    },
  },
  {
    ref: 'C48', niveau: 4, categorie: 'tiers',
    libelle: 'Taux provision cohérent avec ancienneté',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé Art. 48',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const clientsDouteux = balance
        .filter(r => (r.accountCode || '').startsWith('416'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const provision491 = balance
        .filter(r => (r.accountCode || '').startsWith('491'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (clientsDouteux <= 0) return skip('C48', 'Taux provision', 'MINEUR', 'Pas de créances douteuses', 'SYSCOHADA révisé Art. 48');
      const taux = provision491 / clientsDouteux;
      if (taux >= 0.25 && taux <= 1) return ok('C48', 'Taux provision', `Taux provision = ${Math.round(taux * 100)}% (raisonnable)`, 'SYSCOHADA révisé Art. 48');
      if (taux < 0.25) return alerte('C48', 'Taux provision', 'MINEUR', `Taux provision = ${Math.round(taux * 100)}% — potentiellement insuffisant`, 'SYSCOHADA révisé Art. 48');
      return alerte('C48', 'Taux provision', 'MINEUR', `Taux provision = ${Math.round(taux * 100)}% — supérieur à 100%`, 'SYSCOHADA révisé Art. 48');
    },
  },
  {
    ref: 'C49', niveau: 5, categorie: 'tiers',
    libelle: 'Lettrage clients > 80%',
    severite: 'MINEUR', reference: 'Bonne pratique audit',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const lignesClients = entries.flatMap(e => (e.lines || []).filter(l => (l.accountCode || '').startsWith('411')));
      if (lignesClients.length === 0) return skip('C49', 'Lettrage clients', 'MINEUR', 'Aucune ligne client', 'Bonne pratique audit');
      const lettrees = lignesClients.filter(l => l.lettrage || l.reconciled);
      const taux = lettrees.length / lignesClients.length;
      if (taux >= 0.8) return ok('C49', 'Lettrage clients', `Taux lettrage clients = ${Math.round(taux * 100)}%`, 'Bonne pratique audit');
      return alerte('C49', 'Lettrage clients', 'MINEUR', `Taux lettrage clients = ${Math.round(taux * 100)}% (< 80%)`, 'Bonne pratique audit', { total: lignesClients.length, lettrees: lettrees.length });
    },
  },
  {
    ref: 'C50', niveau: 5, categorie: 'tiers',
    libelle: 'Lettrage fournisseurs > 80%',
    severite: 'MINEUR', reference: 'Bonne pratique audit',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const lignesFourn = entries.flatMap(e => (e.lines || []).filter(l => (l.accountCode || '').startsWith('401')));
      if (lignesFourn.length === 0) return skip('C50', 'Lettrage fournisseurs', 'MINEUR', 'Aucune ligne fournisseur', 'Bonne pratique audit');
      const lettrees = lignesFourn.filter(l => l.lettrage || l.reconciled);
      const taux = lettrees.length / lignesFourn.length;
      if (taux >= 0.8) return ok('C50', 'Lettrage fournisseurs', `Taux lettrage fournisseurs = ${Math.round(taux * 100)}%`, 'Bonne pratique audit');
      return alerte('C50', 'Lettrage fournisseurs', 'MINEUR', `Taux lettrage fournisseurs = ${Math.round(taux * 100)}% (< 80%)`, 'Bonne pratique audit', { total: lignesFourn.length, lettrees: lettrees.length });
    },
  },
  {
    ref: 'C51', niveau: 3, categorie: 'tiers',
    libelle: 'Pas de compte client avec solde > 50% du CA',
    severite: 'MAJEUR', reference: 'ISA 550 — Parties liées',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const ca = balance
        .filter(r => (r.accountCode || '').startsWith('70'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (ca <= 0) return skip('C51', 'Concentration client', 'MAJEUR', 'CA nul', 'ISA 550 — Parties liées');
      const clients = balance.filter(r => (r.accountCode || '').startsWith('411'));
      const concentres = clients.filter(r => {
        const solde = (r.totalDebit || 0) - (r.totalCredit || 0);
        return solde > ca * 0.5;
      });
      if (concentres.length === 0) return ok('C51', 'Concentration client', `Aucun client ne dépasse 50% du CA (${Math.round(ca)})`, 'ISA 550 — Parties liées');
      return err('C51', 'Concentration client', 'MAJEUR', `${concentres.length} client(s) avec solde > 50% du CA — risque de dépendance`, 'ISA 550 — Parties liées', { ca: Math.round(ca), comptes: concentres.map(r => r.accountCode) });
    },
  },
  {
    ref: 'C52', niveau: 3, categorie: 'tiers',
    libelle: 'Cohérence TVA collectée / CA (4431 vs 70x)',
    severite: 'MAJEUR', reference: 'CGI UEMOA',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const ca = balance
        .filter(r => (r.accountCode || '').startsWith('70'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const tvaCollectee = balance
        .filter(r => (r.accountCode || '').startsWith('4431'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (ca <= 0) return skip('C52', 'TVA collectée vs CA', 'MAJEUR', 'CA nul', 'CGI UEMOA');
      const tauxImplicite = tvaCollectee / ca;
      if (tauxImplicite >= 0.10 && tauxImplicite <= 0.25) return ok('C52', 'TVA collectée vs CA', `Taux TVA implicite = ${Math.round(tauxImplicite * 100)}% (cohérent)`, 'CGI UEMOA');
      if (tvaCollectee === 0) return alerte('C52', 'TVA collectée vs CA', 'MAJEUR', `CA = ${Math.round(ca)} mais TVA collectée nulle — exonération ou omission ?`, 'CGI UEMOA');
      return alerte('C52', 'TVA collectée vs CA', 'MAJEUR', `Taux TVA implicite = ${Math.round(tauxImplicite * 100)}% — hors fourchette 10-25%`, 'CGI UEMOA', { ca: Math.round(ca), tva: Math.round(tvaCollectee) });
    },
  },
  {
    ref: 'C53', niveau: 3, categorie: 'tiers',
    libelle: 'Cohérence TVA déductible / Achats (4452 vs 60x)',
    severite: 'MAJEUR', reference: 'CGI UEMOA',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const achats = balance
        .filter(r => (r.accountCode || '').startsWith('60'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const tvaDeductible = balance
        .filter(r => (r.accountCode || '').startsWith('4452'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (achats <= 0) return skip('C53', 'TVA déductible vs achats', 'MAJEUR', 'Achats nuls', 'CGI UEMOA');
      const tauxImplicite = tvaDeductible / achats;
      if (tauxImplicite >= 0.05 && tauxImplicite <= 0.25) return ok('C53', 'TVA déductible vs achats', `Taux TVA déductible implicite = ${Math.round(tauxImplicite * 100)}%`, 'CGI UEMOA');
      if (tvaDeductible === 0) return alerte('C53', 'TVA déductible vs achats', 'MAJEUR', `Achats = ${Math.round(achats)} mais TVA déductible nulle`, 'CGI UEMOA');
      return alerte('C53', 'TVA déductible vs achats', 'MAJEUR', `Taux TVA déductible implicite = ${Math.round(tauxImplicite * 100)}% — hors norme`, 'CGI UEMOA', { achats: Math.round(achats), tva: Math.round(tvaDeductible) });
    },
  },
  {
    ref: 'C54', niveau: 3, categorie: 'tiers',
    libelle: 'Dettes sociales (43x) non nulles si charges personnel',
    severite: 'MAJEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const chargesPersonnel = balance
        .filter(r => (r.accountCode || '').startsWith('66'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const dettesSociales = balance
        .filter(r => (r.accountCode || '').startsWith('43'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (chargesPersonnel <= 0) return ok('C54', 'Dettes sociales', 'Pas de charges de personnel.', 'SYSCOHADA révisé');
      if (dettesSociales > 0) return ok('C54', 'Dettes sociales', `Charges personnel = ${Math.round(chargesPersonnel)}, dettes sociales (43x) = ${Math.round(dettesSociales)}`, 'SYSCOHADA révisé');
      return err('C54', 'Dettes sociales', 'MAJEUR', `Charges personnel = ${Math.round(chargesPersonnel)} mais aucune dette sociale (43x) — omission probable`, 'SYSCOHADA révisé');
    },
  },
  {
    ref: 'C55', niveau: 3, categorie: 'tiers',
    libelle: 'Dettes fiscales (44x) non nulles si CA > 0',
    severite: 'MAJEUR', reference: 'CGI UEMOA',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const ca = balance
        .filter(r => (r.accountCode || '').startsWith('70'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const dettesFiscales = balance
        .filter(r => (r.accountCode || '').startsWith('44'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (ca <= 0) return skip('C55', 'Dettes fiscales', 'MAJEUR', 'CA nul', 'CGI UEMOA');
      if (dettesFiscales > 0) return ok('C55', 'Dettes fiscales', `CA = ${Math.round(ca)}, dettes fiscales (44x) = ${Math.round(dettesFiscales)}`, 'CGI UEMOA');
      return err('C55', 'Dettes fiscales', 'MAJEUR', `CA = ${Math.round(ca)} mais aucune dette fiscale (44x) — TVA, IS non provisionnés ?`, 'CGI UEMOA');
    },
  },
  {
    ref: 'C56', niveau: 4, categorie: 'tiers',
    libelle: 'Personnel créditeur (42x) cohérent avec charges 66x',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const chargesPersonnel = balance
        .filter(r => (r.accountCode || '').startsWith('66'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const dettePersonnel = balance
        .filter(r => (r.accountCode || '').startsWith('42'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (chargesPersonnel <= 0) return ok('C56', 'Personnel vs charges', 'Pas de charges de personnel.', 'SYSCOHADA révisé');
      if (dettePersonnel >= 0) return ok('C56', 'Personnel vs charges', `Charges personnel = ${Math.round(chargesPersonnel)}, dette personnel (42x) = ${Math.round(dettePersonnel)}`, 'SYSCOHADA révisé');
      return alerte('C56', 'Personnel vs charges', 'MINEUR', `Compte personnel (42x) débiteur = ${Math.round(dettePersonnel)} alors que charges 66x = ${Math.round(chargesPersonnel)}`, 'SYSCOHADA révisé');
    },
  },
  {
    ref: 'C57', niveau: 4, categorie: 'tiers',
    libelle: 'Comptes d\'attente (47x) soldés en clôture',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé Art. 67',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const attente = balance
        .filter(r => (r.accountCode || '').startsWith('47'))
        .reduce((s, r) => s + Math.abs((r.totalDebit || 0) - (r.totalCredit || 0)), 0);
      if (attente < 1) return ok('C57', 'Comptes attente', 'Comptes d\'attente (47x) soldés.', 'SYSCOHADA révisé Art. 67');
      return alerte('C57', 'Comptes attente', 'MINEUR', `Comptes d'attente (47x) non soldés: solde absolu = ${Math.round(attente)} FCFA`, 'SYSCOHADA révisé Art. 67');
    },
  },
];
