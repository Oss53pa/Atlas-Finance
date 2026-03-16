// @ts-nocheck
/**
 * Contrôles trésorerie — C58 à C67
 * Banques, caisse, rapprochement, virements internes
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

export const tresorerieControls: AuditControl[] = [
  {
    ref: 'C58', niveau: 3, categorie: 'tresorerie',
    libelle: 'Soldes bancaires (52x) rapprochés',
    severite: 'MAJEUR', reference: 'ISA 500 — Confirmations externes',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const banques = balance.filter(r => (r.accountCode || '').startsWith('52'));
      if (banques.length === 0) return skip('C58', 'Rapprochement bancaire', 'MAJEUR', 'Aucun compte bancaire (52x)', 'ISA 500 — Confirmations externes');
      const totalBanques = banques.reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      return alerte('C58', 'Rapprochement bancaire', 'MAJEUR', `${banques.length} compte(s) bancaire(s), solde total = ${Math.round(totalBanques)} FCFA — vérifier rapprochement avec relevés`, 'ISA 500 — Confirmations externes', { nbComptes: banques.length, soldeTotal: Math.round(totalBanques) });
    },
  },
  {
    ref: 'C59', niveau: 2, categorie: 'tresorerie',
    libelle: 'Caisse (57x) toujours positive',
    severite: 'BLOQUANT', reference: 'AUDCIF Art. 45',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const caisses = balance.filter(r => (r.accountCode || '').startsWith('57'));
      const anomalies: string[] = [];
      for (const r of caisses) {
        const solde = (r.totalDebit || 0) - (r.totalCredit || 0);
        if (solde < -1) anomalies.push(`${r.accountCode}: solde négatif ${Math.round(solde)}`);
      }
      if (caisses.length === 0) return ok('C59', 'Caisse positive', 'Pas de compte caisse (57x).', 'AUDCIF Art. 45');
      if (anomalies.length === 0) return ok('C59', 'Caisse positive', 'Tous les comptes caisse ont un solde positif.', 'AUDCIF Art. 45');
      return err('C59', 'Caisse positive', 'BLOQUANT', `${anomalies.length} caisse(s) avec solde négatif — physiquement impossible`, 'AUDCIF Art. 45', { anomalies });
    },
  },
  {
    ref: 'C60', niveau: 4, categorie: 'tresorerie',
    libelle: 'Pas de mouvement caisse > 500 000 FCFA',
    severite: 'MINEUR', reference: 'Réglementation anti-blanchiment UEMOA',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const SEUIL = 500000;
      const suspects: { ref: string; montant: number }[] = [];
      for (const e of entries) {
        if (!e.lines) continue;
        for (const l of e.lines) {
          if (!(l.accountCode || '').startsWith('57')) continue;
          const montant = Math.max(l.debit || 0, l.credit || 0);
          if (montant > SEUIL) suspects.push({ ref: e.reference || e.id || 'N/A', montant });
        }
      }
      if (suspects.length === 0) return ok('C60', 'Seuil caisse', `Aucun mouvement caisse > ${SEUIL.toLocaleString()} FCFA`, 'Réglementation anti-blanchiment UEMOA');
      return alerte('C60', 'Seuil caisse', 'MINEUR', `${suspects.length} mouvement(s) caisse > ${SEUIL.toLocaleString()} FCFA`, 'Réglementation anti-blanchiment UEMOA', { suspects: suspects.slice(0, 10) });
    },
  },
  {
    ref: 'C61', niveau: 4, categorie: 'tresorerie',
    libelle: 'Virements internes (58x) soldés',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const virements = balance
        .filter(r => (r.accountCode || '').startsWith('58'))
        .reduce((s, r) => s + Math.abs((r.totalDebit || 0) - (r.totalCredit || 0)), 0);
      if (virements < 1) return ok('C61', 'Virements internes soldés', 'Comptes de virements internes (58x) soldés.', 'SYSCOHADA révisé');
      return alerte('C61', 'Virements internes soldés', 'MINEUR', `Comptes 58x non soldés: solde absolu = ${Math.round(virements)} FCFA`, 'SYSCOHADA révisé');
    },
  },
  {
    ref: 'C62', niveau: 4, categorie: 'tresorerie',
    libelle: 'Chèques impayés (51x) non anciens',
    severite: 'MINEUR', reference: 'Bonne pratique audit',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const effets = balance
        .filter(r => (r.accountCode || '').startsWith('51'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (effets <= 0) return ok('C62', 'Chèques/effets', 'Pas de chèques ou effets en portefeuille (51x).', 'Bonne pratique audit');
      return alerte('C62', 'Chèques/effets', 'MINEUR', `Effets en portefeuille (51x) = ${Math.round(effets)} FCFA — vérifier ancienneté`, 'Bonne pratique audit');
    },
  },
  {
    ref: 'C63', niveau: 5, categorie: 'tresorerie',
    libelle: 'Comptes bancaires (52x) cohérents avec relevés',
    severite: 'INFO', reference: 'ISA 500',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const banques = balance.filter(r => (r.accountCode || '').startsWith('52'));
      if (banques.length === 0) return skip('C63', 'Cohérence relevés', 'INFO', 'Aucun compte bancaire', 'ISA 500');
      const details = banques.map(r => ({
        compte: r.accountCode,
        solde: Math.round((r.totalDebit || 0) - (r.totalCredit || 0)),
      }));
      return alerte('C63', 'Cohérence relevés', 'INFO', `${banques.length} compte(s) bancaire(s) — rapprochement manuel requis`, 'ISA 500', { details });
    },
  },
  {
    ref: 'C64', niveau: 5, categorie: 'tresorerie',
    libelle: 'Trésorerie passive (56x) identifiée',
    severite: 'INFO', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const tresoPassive = balance
        .filter(r => (r.accountCode || '').startsWith('56'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (tresoPassive <= 0) return ok('C64', 'Trésorerie passive', 'Pas de trésorerie passive (56x).', 'SYSCOHADA révisé');
      return alerte('C64', 'Trésorerie passive', 'INFO', `Trésorerie passive (56x) = ${Math.round(tresoPassive)} FCFA — concours bancaires courants`, 'SYSCOHADA révisé');
    },
  },
  {
    ref: 'C65', niveau: 5, categorie: 'tresorerie',
    libelle: 'Pas d\'écritures de caisse le week-end',
    severite: 'MINEUR', reference: 'Contrôle interne',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const weekendCaisse: string[] = [];
      for (const e of entries) {
        if (!e.date || !e.lines) continue;
        const day = new Date(e.date).getDay();
        if (day !== 0 && day !== 6) continue;
        const hasCaisse = e.lines.some(l => (l.accountCode || '').startsWith('57'));
        if (hasCaisse) weekendCaisse.push(`${e.date} - ${e.reference || e.id || 'N/A'}`);
      }
      if (weekendCaisse.length === 0) return ok('C65', 'Caisse week-end', 'Aucune écriture de caisse le week-end.', 'Contrôle interne');
      return alerte('C65', 'Caisse week-end', 'MINEUR', `${weekendCaisse.length} écriture(s) de caisse le week-end`, 'Contrôle interne', { ecritures: weekendCaisse.slice(0, 10) });
    },
  },
  {
    ref: 'C66', niveau: 3, categorie: 'tresorerie',
    libelle: 'Rapprochement effectué (dernier mois)',
    severite: 'MAJEUR', reference: 'ISA 500',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const banqueEntries = entries.filter(e =>
        e.lines?.some(l => (l.accountCode || '').startsWith('52'))
      );
      if (banqueEntries.length === 0) return skip('C66', 'Rapprochement récent', 'MAJEUR', 'Aucune écriture bancaire', 'ISA 500');
      const dates = banqueEntries.map(e => e.date).filter(Boolean).sort();
      const derniere = dates[dates.length - 1];
      return alerte('C66', 'Rapprochement récent', 'MAJEUR', `Dernière écriture bancaire: ${derniere} — vérifier état rapprochement`, 'ISA 500');
    },
  },
  {
    ref: 'C67', niveau: 5, categorie: 'tresorerie',
    libelle: 'Solde trésorerie net calculable',
    severite: 'INFO', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const tresoActive = balance
        .filter(r => {
          const code = r.accountCode || '';
          return code.startsWith('5') && !code.startsWith('56') && !code.startsWith('58') && !code.startsWith('59');
        })
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const tresoPassive = balance
        .filter(r => (r.accountCode || '').startsWith('56'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const tresoNette = tresoActive - tresoPassive;
      return ok('C67', 'Trésorerie nette', `Trésorerie active = ${Math.round(tresoActive)}, passive = ${Math.round(tresoPassive)}, nette = ${Math.round(tresoNette)}`, 'SYSCOHADA révisé', { tresoActive: Math.round(tresoActive), tresoPassive: Math.round(tresoPassive), tresoNette: Math.round(tresoNette) });
    },
  },
];
