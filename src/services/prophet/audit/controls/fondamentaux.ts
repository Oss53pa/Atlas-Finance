// @ts-nocheck
/**
 * Contrôles fondamentaux — C01 à C15
 * D=C, Actif=Passif, résultat cohérent, comptes vides, sens normal des soldes
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

export const fondamentauxControls: AuditControl[] = [
  {
    ref: 'C01', niveau: 0, categorie: 'fondamentaux',
    libelle: 'Équilibre global Débit = Crédit',
    severite: 'BLOQUANT', reference: 'AUDCIF Art. 17',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const totalD = balance.reduce((s, r) => s + (r.totalDebit || 0), 0);
      const totalC = balance.reduce((s, r) => s + (r.totalCredit || 0), 0);
      const ecart = Math.abs(totalD - totalC);
      if (ecart < 1) return ok('C01', 'Équilibre D=C', `Total D=${totalD}, C=${totalC}. Équilibré.`, 'AUDCIF Art. 17');
      return err('C01', 'Équilibre D=C', 'BLOQUANT', `DÉSÉQUILIBRE: D=${totalD}, C=${totalC}, écart=${ecart}`, 'AUDCIF Art. 17', { totalD, totalC, ecart });
    },
  },
  {
    ref: 'C02', niveau: 0, categorie: 'fondamentaux',
    libelle: 'Équilibre Actif = Passif (bilan)',
    severite: 'BLOQUANT', reference: 'AUDCIF Art. 29-30',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      let actif = 0, passif = 0;
      for (const r of balance) {
        const code = r.accountCode || '';
        const solde = (r.totalDebit || 0) - (r.totalCredit || 0);
        if (code.startsWith('2') || code.startsWith('3') || code.startsWith('5')) {
          actif += solde; // classes actif: solde débiteur
        } else if (code.startsWith('1') || code.startsWith('4')) {
          // classe 1 = passif (solde créditeur = négatif en D-C), classe 4 = tiers (mixte)
          if (code.startsWith('1')) passif += -solde;
          else if (code.startsWith('40') || code.startsWith('42') || code.startsWith('43') || code.startsWith('44')) passif += -solde;
          else actif += solde; // comptes 41, 46, 47 = actif circulant
        }
      }
      const ecart = Math.abs(actif - passif);
      if (ecart < 100) return ok('C02', 'Actif=Passif', `Actif=${Math.round(actif)}, Passif=${Math.round(passif)}`, 'AUDCIF Art. 29-30');
      return err('C02', 'Actif=Passif', 'BLOQUANT', `Actif=${Math.round(actif)} ≠ Passif=${Math.round(passif)}, écart=${Math.round(ecart)}`, 'AUDCIF Art. 29-30', { actif: Math.round(actif), passif: Math.round(passif) });
    },
  },
  {
    ref: 'C03', niveau: 0, categorie: 'fondamentaux',
    libelle: 'Résultat bilan = Résultat compte de résultat',
    severite: 'BLOQUANT', reference: 'AUDCIF Art. 31',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      // Résultat CR = produits (7) - charges (6)
      let produits = 0, charges = 0;
      for (const r of balance) {
        const code = r.accountCode || '';
        const solde = (r.totalCredit || 0) - (r.totalDebit || 0); // produits = solde créditeur
        if (code.startsWith('7')) produits += solde;
        if (code.startsWith('6')) charges += (r.totalDebit || 0) - (r.totalCredit || 0);
      }
      const resultatCR = produits - charges;
      // Résultat bilan = compte 13x
      let resultatBilan = 0;
      for (const r of balance) {
        if ((r.accountCode || '').startsWith('13')) {
          resultatBilan += (r.totalCredit || 0) - (r.totalDebit || 0);
        }
      }
      const ecart = Math.abs(resultatCR - resultatBilan);
      if (ecart < 1) return ok('C03', 'Résultat cohérent', `Résultat CR=${Math.round(resultatCR)}, Bilan=${Math.round(resultatBilan)}`, 'AUDCIF Art. 31');
      // If no 13x entries, this might be before closing
      if (resultatBilan === 0) return alerte('C03', 'Résultat cohérent', 'INFO', `Compte 13 vide — résultat non encore affecté. Résultat CR=${Math.round(resultatCR)}`, 'AUDCIF Art. 31');
      return err('C03', 'Résultat cohérent', 'BLOQUANT', `Résultat CR=${Math.round(resultatCR)} ≠ Bilan=${Math.round(resultatBilan)}`, 'AUDCIF Art. 31');
    },
  },
  {
    ref: 'C04', niveau: 1, categorie: 'fondamentaux',
    libelle: 'Aucune écriture déséquilibrée',
    severite: 'BLOQUANT', reference: 'AUDCIF Art. 17',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const desequilibrees: string[] = [];
      for (const e of entries) {
        if (!e.lines) continue;
        const d = e.lines.reduce((s, l) => s + (l.debit || 0), 0);
        const c = e.lines.reduce((s, l) => s + (l.credit || 0), 0);
        if (Math.abs(d - c) >= 1) desequilibrees.push(e.id || e.reference || 'unknown');
      }
      if (desequilibrees.length === 0) return ok('C04', 'Écritures équilibrées', `${entries.length} écritures vérifiées, toutes équilibrées.`, 'AUDCIF Art. 17');
      return err('C04', 'Écritures équilibrées', 'BLOQUANT', `${desequilibrees.length} écriture(s) déséquilibrée(s)`, 'AUDCIF Art. 17', { ids: desequilibrees.slice(0, 20) });
    },
  },
  {
    ref: 'C05', niveau: 1, categorie: 'fondamentaux',
    libelle: 'Pas de compte avec solde nul inutile',
    severite: 'INFO', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const comptesVides = balance.filter(r =>
        (r.totalDebit || 0) === 0 && (r.totalCredit || 0) === 0
      );
      if (comptesVides.length === 0) return ok('C05', 'Comptes vides', 'Aucun compte à solde nul.', 'SYSCOHADA révisé');
      return alerte('C05', 'Comptes vides', 'INFO', `${comptesVides.length} compte(s) sans mouvement`, 'SYSCOHADA révisé', { comptes: comptesVides.slice(0, 10).map(c => c.accountCode) });
    },
  },
  {
    ref: 'C06', niveau: 1, categorie: 'fondamentaux',
    libelle: 'Sens normal des soldes — Classe 1 (créditeur)',
    severite: 'MAJEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const anomalies: string[] = [];
      for (const r of balance) {
        const code = r.accountCode || '';
        if (!code.startsWith('1')) continue;
        const solde = (r.totalDebit || 0) - (r.totalCredit || 0);
        // Classe 1 doit être créditeur (solde < 0 en D-C), sauf 129 (RAN débiteur)
        if (solde > 100 && !code.startsWith('129')) {
          anomalies.push(`${code}: solde débiteur ${Math.round(solde)}`);
        }
      }
      if (anomalies.length === 0) return ok('C06', 'Sens classe 1', 'Tous les comptes classe 1 ont un sens normal.', 'SYSCOHADA révisé');
      return alerte('C06', 'Sens classe 1', 'MAJEUR', `${anomalies.length} compte(s) classe 1 avec solde débiteur anormal`, 'SYSCOHADA révisé', { anomalies: anomalies.slice(0, 10) });
    },
  },
  {
    ref: 'C07', niveau: 1, categorie: 'fondamentaux',
    libelle: 'Sens normal des soldes — Classe 2 (débiteur)',
    severite: 'MAJEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const anomalies: string[] = [];
      for (const r of balance) {
        const code = r.accountCode || '';
        if (!code.startsWith('2')) continue;
        if (code.startsWith('28') || code.startsWith('29')) continue; // amort/dépréc = créditeurs
        const solde = (r.totalDebit || 0) - (r.totalCredit || 0);
        if (solde < -100) anomalies.push(`${code}: solde créditeur ${Math.round(solde)}`);
      }
      if (anomalies.length === 0) return ok('C07', 'Sens classe 2', 'Comptes immobilisations OK.', 'SYSCOHADA révisé');
      return alerte('C07', 'Sens classe 2', 'MAJEUR', `${anomalies.length} immobilisation(s) avec solde créditeur`, 'SYSCOHADA révisé', { anomalies: anomalies.slice(0, 10) });
    },
  },
  {
    ref: 'C08', niveau: 1, categorie: 'fondamentaux',
    libelle: 'Sens normal — Comptes amortissement (28) créditeurs',
    severite: 'MAJEUR', reference: 'AUDCIF Art. 28-30',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const anomalies: string[] = [];
      for (const r of balance) {
        const code = r.accountCode || '';
        if (!code.startsWith('28')) continue;
        const solde = (r.totalDebit || 0) - (r.totalCredit || 0);
        if (solde > 100) anomalies.push(`${code}: solde débiteur ${Math.round(solde)}`);
      }
      if (anomalies.length === 0) return ok('C08', 'Amortissements sens', 'Comptes 28x correctement créditeurs.', 'AUDCIF Art. 28-30');
      return err('C08', 'Amortissements sens', 'MAJEUR', `${anomalies.length} compte(s) d'amortissement avec solde débiteur`, 'AUDCIF Art. 28-30', { anomalies });
    },
  },
  {
    ref: 'C09', niveau: 1, categorie: 'fondamentaux',
    libelle: 'Sens normal — Classe 4 (tiers)',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const anomalies: string[] = [];
      for (const r of balance) {
        const code = r.accountCode || '';
        const solde = (r.totalDebit || 0) - (r.totalCredit || 0);
        // 401/408 fournisseurs = créditeurs normalement
        if (code.startsWith('401') && solde > 100) anomalies.push(`${code} Fournisseur débiteur: ${Math.round(solde)}`);
        // 411 clients = débiteurs normalement
        if (code.startsWith('411') && solde < -100) anomalies.push(`${code} Client créditeur: ${Math.round(solde)}`);
      }
      if (anomalies.length === 0) return ok('C09', 'Sens tiers', 'Comptes de tiers OK.', 'SYSCOHADA révisé');
      return alerte('C09', 'Sens tiers', 'MINEUR', `${anomalies.length} compte(s) tiers à sens anormal (reclassement nécessaire)`, 'SYSCOHADA révisé', { anomalies: anomalies.slice(0, 10) });
    },
  },
  {
    ref: 'C10', niveau: 1, categorie: 'fondamentaux',
    libelle: 'Sens normal — Classe 5 (trésorerie débiteur)',
    severite: 'MINEUR', reference: 'AUDCIF Art. 45-47',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const anomalies: string[] = [];
      for (const r of balance) {
        const code = r.accountCode || '';
        if (!code.startsWith('5') || code.startsWith('56')) continue; // 56 = trésorerie passif
        const solde = (r.totalDebit || 0) - (r.totalCredit || 0);
        if (solde < -1000) anomalies.push(`${code}: solde créditeur ${Math.round(solde)}`);
      }
      if (anomalies.length === 0) return ok('C10', 'Sens trésorerie', 'Comptes trésorerie actif OK.', 'AUDCIF Art. 45-47');
      return alerte('C10', 'Sens trésorerie', 'MINEUR', `${anomalies.length} compte(s) trésorerie avec solde créditeur (découvert ?)`, 'AUDCIF Art. 45-47', { anomalies });
    },
  },
  {
    ref: 'C11', niveau: 1, categorie: 'fondamentaux',
    libelle: 'Sens normal — Charges (classe 6 débiteur)',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const anomalies: string[] = [];
      for (const r of balance) {
        const code = r.accountCode || '';
        if (!code.startsWith('6')) continue;
        const solde = (r.totalDebit || 0) - (r.totalCredit || 0);
        if (solde < -1000) anomalies.push(`${code}: solde créditeur ${Math.round(solde)}`);
      }
      if (anomalies.length === 0) return ok('C11', 'Sens charges', 'Comptes de charges OK.', 'SYSCOHADA révisé');
      return alerte('C11', 'Sens charges', 'MINEUR', `${anomalies.length} charge(s) avec solde créditeur (avoirs ?)`, 'SYSCOHADA révisé', { anomalies: anomalies.slice(0, 10) });
    },
  },
  {
    ref: 'C12', niveau: 1, categorie: 'fondamentaux',
    libelle: 'Sens normal — Produits (classe 7 créditeur)',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const anomalies: string[] = [];
      for (const r of balance) {
        const code = r.accountCode || '';
        if (!code.startsWith('7')) continue;
        const solde = (r.totalDebit || 0) - (r.totalCredit || 0);
        if (solde > 1000) anomalies.push(`${code}: solde débiteur ${Math.round(solde)}`);
      }
      if (anomalies.length === 0) return ok('C12', 'Sens produits', 'Comptes de produits OK.', 'SYSCOHADA révisé');
      return alerte('C12', 'Sens produits', 'MINEUR', `${anomalies.length} produit(s) avec solde débiteur (avoirs ?)`, 'SYSCOHADA révisé', { anomalies: anomalies.slice(0, 10) });
    },
  },
  {
    ref: 'C13', niveau: 2, categorie: 'fondamentaux',
    libelle: 'Existence de comptes obligatoires (capital, banque, résultat)',
    severite: 'MAJEUR', reference: 'AUDCIF Art. 17',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const codes = new Set(balance.map(r => (r.accountCode || '').slice(0, 3)));
      const obligatoires = ['101', '521', '661', '701'];
      const manquants = obligatoires.filter(c => !codes.has(c) && !balance.some(r => (r.accountCode || '').startsWith(c)));
      if (manquants.length === 0) return ok('C13', 'Comptes obligatoires', 'Comptes clés présents.', 'AUDCIF Art. 17');
      return alerte('C13', 'Comptes obligatoires', 'MAJEUR', `Compte(s) obligatoire(s) absent(s): ${manquants.join(', ')}`, 'AUDCIF Art. 17', { manquants });
    },
  },
  {
    ref: 'C14', niveau: 2, categorie: 'fondamentaux',
    libelle: 'Aucune écriture avec montant négatif',
    severite: 'MAJEUR', reference: 'AUDCIF Art. 17',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      let negatifs = 0;
      for (const e of entries) {
        if (!e.lines) continue;
        for (const l of e.lines) {
          if ((l.debit || 0) < 0 || (l.credit || 0) < 0) negatifs++;
        }
      }
      if (negatifs === 0) return ok('C14', 'Montants positifs', 'Aucun montant négatif détecté.', 'AUDCIF Art. 17');
      return err('C14', 'Montants positifs', 'MAJEUR', `${negatifs} ligne(s) avec montant(s) négatif(s) — interdit en comptabilité en partie double`, 'AUDCIF Art. 17');
    },
  },
  {
    ref: 'C15', niveau: 2, categorie: 'fondamentaux',
    libelle: 'Aucune écriture sans date',
    severite: 'MAJEUR', reference: 'AUDCIF Art. 16',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const sansDate = entries.filter(e => !e.date);
      if (sansDate.length === 0) return ok('C15', 'Dates complètes', 'Toutes les écritures sont datées.', 'AUDCIF Art. 16');
      return err('C15', 'Dates complètes', 'MAJEUR', `${sansDate.length} écriture(s) sans date`, 'AUDCIF Art. 16');
    },
  },
];
