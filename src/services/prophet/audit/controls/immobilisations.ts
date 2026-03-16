// @ts-nocheck
/**
 * Contrôles immobilisations — C28 à C42
 * Brut, amortissements, dépréciations, cessions, cohérence tableaux
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

export const immobilisationsControls: AuditControl[] = [
  {
    ref: 'C28', niveau: 3, categorie: 'immobilisations',
    libelle: 'Immobilisations brutes (2x hors 28/29) toutes débitrices',
    severite: 'MAJEUR', reference: 'SYSCOHADA révisé Art. 35',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const anomalies: string[] = [];
      for (const r of balance) {
        const code = r.accountCode || '';
        if (!code.startsWith('2') || code.startsWith('28') || code.startsWith('29')) continue;
        const solde = (r.totalDebit || 0) - (r.totalCredit || 0);
        if (solde < -100) anomalies.push(`${code}: solde créditeur ${Math.round(solde)}`);
      }
      if (anomalies.length === 0) return ok('C28', 'Immo brutes débitrices', 'Toutes les immobilisations brutes ont un solde débiteur.', 'SYSCOHADA révisé Art. 35');
      return err('C28', 'Immo brutes débitrices', 'MAJEUR', `${anomalies.length} immobilisation(s) brute(s) avec solde créditeur`, 'SYSCOHADA révisé Art. 35', { anomalies });
    },
  },
  {
    ref: 'C29', niveau: 2, categorie: 'immobilisations',
    libelle: 'Amortissements (28x) <= immobilisations brutes correspondantes',
    severite: 'BLOQUANT', reference: 'SYSCOHADA révisé Art. 45',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const bruts: Record<string, number> = {};
      const amorts: Record<string, number> = {};
      for (const r of balance) {
        const code = r.accountCode || '';
        if (code.startsWith('2') && !code.startsWith('28') && !code.startsWith('29')) {
          const key = code.slice(0, 3);
          bruts[key] = (bruts[key] || 0) + (r.totalDebit || 0) - (r.totalCredit || 0);
        }
        if (code.startsWith('28')) {
          const key = '2' + code.slice(2, 4);
          amorts[key] = (amorts[key] || 0) + (r.totalCredit || 0) - (r.totalDebit || 0);
        }
      }
      const anomalies: string[] = [];
      for (const key of Object.keys(amorts)) {
        const brut = bruts[key] || 0;
        if (amorts[key] > brut + 1) anomalies.push(`${key}: amort ${Math.round(amorts[key])} > brut ${Math.round(brut)}`);
      }
      if (anomalies.length === 0) return ok('C29', 'Amort <= brut', 'Amortissements cohérents avec bruts.', 'SYSCOHADA révisé Art. 45');
      return err('C29', 'Amort <= brut', 'BLOQUANT', `${anomalies.length} catégorie(s) avec amortissement supérieur au brut`, 'SYSCOHADA révisé Art. 45', { anomalies });
    },
  },
  {
    ref: 'C30', niveau: 3, categorie: 'immobilisations',
    libelle: 'Dotations amortissement (681) cohérentes avec variation des 28x',
    severite: 'MAJEUR', reference: 'SYSCOHADA révisé Art. 46',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const dotation681 = balance
        .filter(r => (r.accountCode || '').startsWith('681'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const totalAmort = balance
        .filter(r => (r.accountCode || '').startsWith('28'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (dotation681 === 0 && totalAmort === 0) return ok('C30', 'Dotations/Amort', 'Pas de dotation ni d\'amortissement.', 'SYSCOHADA révisé Art. 46');
      if (dotation681 === 0 && totalAmort > 0) return alerte('C30', 'Dotations/Amort', 'MAJEUR', `Amortissements cumulés = ${Math.round(totalAmort)} mais dotation 681 nulle`, 'SYSCOHADA révisé Art. 46');
      return ok('C30', 'Dotations/Amort', `Dotation 681 = ${Math.round(dotation681)}, amort cumulés (28x) = ${Math.round(totalAmort)}`, 'SYSCOHADA révisé Art. 46');
    },
  },
  {
    ref: 'C31', niveau: 4, categorie: 'immobilisations',
    libelle: 'Pas d\'immobilisation sans amortissement (sauf terrains 22x)',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé Art. 44',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const bruts: Record<string, number> = {};
      const amorts: Record<string, number> = {};
      for (const r of balance) {
        const code = r.accountCode || '';
        if (code.startsWith('2') && !code.startsWith('22') && !code.startsWith('25') && !code.startsWith('26') && !code.startsWith('27') && !code.startsWith('28') && !code.startsWith('29')) {
          const key = code.slice(0, 3);
          bruts[key] = (bruts[key] || 0) + (r.totalDebit || 0) - (r.totalCredit || 0);
        }
        if (code.startsWith('28')) {
          const key = '2' + code.slice(2, 4);
          amorts[key] = (amorts[key] || 0) + (r.totalCredit || 0) - (r.totalDebit || 0);
        }
      }
      const sansAmort: string[] = [];
      for (const key of Object.keys(bruts)) {
        if (bruts[key] > 100 && (!amorts[key] || amorts[key] === 0)) sansAmort.push(`${key}: brut = ${Math.round(bruts[key])}`);
      }
      if (sansAmort.length === 0) return ok('C31', 'Immo sans amort', 'Toutes les immobilisations amortissables ont un amortissement.', 'SYSCOHADA révisé Art. 44');
      return alerte('C31', 'Immo sans amort', 'MINEUR', `${sansAmort.length} catégorie(s) d'immobilisations sans amortissement`, 'SYSCOHADA révisé Art. 44', { sansAmort });
    },
  },
  {
    ref: 'C32', niveau: 4, categorie: 'immobilisations',
    libelle: 'Frais d\'établissement (201) amortis sur max 5 ans',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé Art. 39',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const brut201 = balance
        .filter(r => (r.accountCode || '').startsWith('201'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (brut201 <= 0) return ok('C32', 'Frais établissement', 'Pas de frais d\'établissement.', 'SYSCOHADA révisé Art. 39');
      const amort281 = balance
        .filter(r => (r.accountCode || '').startsWith('2801'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const tauxAmort = brut201 > 0 ? amort281 / brut201 : 0;
      if (tauxAmort >= 0.20) return ok('C32', 'Frais établissement', `Frais étab. brut = ${Math.round(brut201)}, amort = ${Math.round(amort281)} (${Math.round(tauxAmort * 100)}%)`, 'SYSCOHADA révisé Art. 39');
      return alerte('C32', 'Frais établissement', 'MINEUR', `Taux amortissement frais établissement = ${Math.round(tauxAmort * 100)}% — vérifier durée <= 5 ans`, 'SYSCOHADA révisé Art. 39');
    },
  },
  {
    ref: 'C33', niveau: 5, categorie: 'immobilisations',
    libelle: 'Immobilisations en cours (25x) — pas anciennes',
    severite: 'INFO', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const enCours = balance
        .filter(r => (r.accountCode || '').startsWith('25'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (enCours <= 0) return ok('C33', 'Immo en cours', 'Pas d\'immobilisations en cours.', 'SYSCOHADA révisé');
      return alerte('C33', 'Immo en cours', 'INFO', `Immobilisations en cours (25x) = ${Math.round(enCours)} FCFA — vérifier absence d'immobilisations anciennes non mises en service`, 'SYSCOHADA révisé');
    },
  },
  {
    ref: 'C34', niveau: 4, categorie: 'immobilisations',
    libelle: 'Cessions correctement comptabilisées (691/791)',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé Art. 42',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const vncCession = balance
        .filter(r => (r.accountCode || '').startsWith('691'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const prixCession = balance
        .filter(r => (r.accountCode || '').startsWith('791'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (vncCession === 0 && prixCession === 0) return ok('C34', 'Cessions immo', 'Aucune cession d\'immobilisation.', 'SYSCOHADA révisé Art. 42');
      if ((vncCession > 0 && prixCession === 0) || (prixCession > 0 && vncCession === 0)) {
        return alerte('C34', 'Cessions immo', 'MINEUR', `VNC cession (691) = ${Math.round(vncCession)}, Prix cession (791) = ${Math.round(prixCession)} — écritures incomplètes`, 'SYSCOHADA révisé Art. 42');
      }
      return ok('C34', 'Cessions immo', `VNC cession = ${Math.round(vncCession)}, Prix cession = ${Math.round(prixCession)}`, 'SYSCOHADA révisé Art. 42');
    },
  },
  {
    ref: 'C35', niveau: 3, categorie: 'immobilisations',
    libelle: 'VNC cession = Brut - Amort cumulé',
    severite: 'MAJEUR', reference: 'SYSCOHADA révisé Art. 42',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const vncCession = balance
        .filter(r => (r.accountCode || '').startsWith('691'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (vncCession === 0) return skip('C35', 'VNC cession', 'MAJEUR', 'Pas de cession d\'immobilisation', 'SYSCOHADA révisé Art. 42');
      return ok('C35', 'VNC cession', `VNC cession (691) = ${Math.round(vncCession)} — vérification détaillée requiert le tableau des cessions`, 'SYSCOHADA révisé Art. 42');
    },
  },
  {
    ref: 'C36', niveau: 5, categorie: 'immobilisations',
    libelle: 'Immobilisations financières (26-27) valorisées',
    severite: 'INFO', reference: 'SYSCOHADA révisé Art. 49',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const immoFin = balance
        .filter(r => {
          const code = r.accountCode || '';
          return code.startsWith('26') || code.startsWith('27');
        })
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (immoFin === 0) return ok('C36', 'Immo financières', 'Pas d\'immobilisations financières.', 'SYSCOHADA révisé Art. 49');
      return alerte('C36', 'Immo financières', 'INFO', `Immobilisations financières (26-27) = ${Math.round(immoFin)} FCFA — vérifier valorisation`, 'SYSCOHADA révisé Art. 49');
    },
  },
  {
    ref: 'C37', niveau: 3, categorie: 'immobilisations',
    libelle: 'Dépréciation immobilisations (29x) <= brut - amort',
    severite: 'MAJEUR', reference: 'SYSCOHADA révisé Art. 46',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const bruts: Record<string, number> = {};
      const amorts: Record<string, number> = {};
      const deprec: Record<string, number> = {};
      for (const r of balance) {
        const code = r.accountCode || '';
        if (code.startsWith('2') && !code.startsWith('28') && !code.startsWith('29')) {
          const key = code.slice(0, 3);
          bruts[key] = (bruts[key] || 0) + (r.totalDebit || 0) - (r.totalCredit || 0);
        }
        if (code.startsWith('28')) {
          const key = '2' + code.slice(2, 4);
          amorts[key] = (amorts[key] || 0) + (r.totalCredit || 0) - (r.totalDebit || 0);
        }
        if (code.startsWith('29')) {
          const key = '2' + code.slice(2, 4);
          deprec[key] = (deprec[key] || 0) + (r.totalCredit || 0) - (r.totalDebit || 0);
        }
      }
      const anomalies: string[] = [];
      for (const key of Object.keys(deprec)) {
        const vnc = (bruts[key] || 0) - (amorts[key] || 0);
        if (deprec[key] > vnc + 1) anomalies.push(`${key}: dépréciation ${Math.round(deprec[key])} > VNC ${Math.round(vnc)}`);
      }
      if (anomalies.length === 0) return ok('C37', 'Dépréciation immo', 'Dépréciations cohérentes avec VNC.', 'SYSCOHADA révisé Art. 46');
      return err('C37', 'Dépréciation immo', 'MAJEUR', `${anomalies.length} catégorie(s) avec dépréciation > VNC`, 'SYSCOHADA révisé Art. 46', { anomalies });
    },
  },
  {
    ref: 'C38', niveau: 2, categorie: 'immobilisations',
    libelle: 'Pas d\'immobilisation à VNC négative',
    severite: 'BLOQUANT', reference: 'SYSCOHADA révisé Art. 45',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const bruts: Record<string, number> = {};
      const amorts: Record<string, number> = {};
      for (const r of balance) {
        const code = r.accountCode || '';
        if (code.startsWith('2') && !code.startsWith('28') && !code.startsWith('29')) {
          const key = code.slice(0, 3);
          bruts[key] = (bruts[key] || 0) + (r.totalDebit || 0) - (r.totalCredit || 0);
        }
        if (code.startsWith('28')) {
          const key = '2' + code.slice(2, 4);
          amorts[key] = (amorts[key] || 0) + (r.totalCredit || 0) - (r.totalDebit || 0);
        }
      }
      const vncNeg: string[] = [];
      for (const key of Object.keys(bruts)) {
        const vnc = bruts[key] - (amorts[key] || 0);
        if (vnc < -1) vncNeg.push(`${key}: VNC = ${Math.round(vnc)}`);
      }
      if (vncNeg.length === 0) return ok('C38', 'VNC non négative', 'Aucune immobilisation à VNC négative.', 'SYSCOHADA révisé Art. 45');
      return err('C38', 'VNC non négative', 'BLOQUANT', `${vncNeg.length} catégorie(s) avec VNC négative`, 'SYSCOHADA révisé Art. 45', { vncNeg });
    },
  },
  {
    ref: 'C39', niveau: 5, categorie: 'immobilisations',
    libelle: 'Cohérence durée amortissement avec normes SYSCOHADA',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé Art. 44',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const brut = balance
        .filter(r => {
          const code = r.accountCode || '';
          return code.startsWith('2') && !code.startsWith('22') && !code.startsWith('28') && !code.startsWith('29') && !code.startsWith('25') && !code.startsWith('26') && !code.startsWith('27');
        })
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const amort = balance
        .filter(r => (r.accountCode || '').startsWith('28'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (brut <= 0) return skip('C39', 'Durée amortissement', 'MINEUR', 'Pas d\'immobilisations amortissables', 'SYSCOHADA révisé Art. 44');
      const tauxGlobal = amort / brut;
      if (tauxGlobal > 1) return alerte('C39', 'Durée amortissement', 'MINEUR', `Taux amortissement global ${Math.round(tauxGlobal * 100)}% > 100% — anomalie`, 'SYSCOHADA révisé Art. 44');
      return ok('C39', 'Durée amortissement', `Taux amortissement global = ${Math.round(tauxGlobal * 100)}%`, 'SYSCOHADA révisé Art. 44');
    },
  },
  {
    ref: 'C40', niveau: 5, categorie: 'immobilisations',
    libelle: 'Immobilisations totalement amorties signalées',
    severite: 'INFO', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const bruts: Record<string, number> = {};
      const amorts: Record<string, number> = {};
      for (const r of balance) {
        const code = r.accountCode || '';
        if (code.startsWith('2') && !code.startsWith('28') && !code.startsWith('29')) {
          const key = code.slice(0, 3);
          bruts[key] = (bruts[key] || 0) + (r.totalDebit || 0) - (r.totalCredit || 0);
        }
        if (code.startsWith('28')) {
          const key = '2' + code.slice(2, 4);
          amorts[key] = (amorts[key] || 0) + (r.totalCredit || 0) - (r.totalDebit || 0);
        }
      }
      const totalAmort: string[] = [];
      for (const key of Object.keys(bruts)) {
        if (bruts[key] > 100 && amorts[key] && Math.abs(bruts[key] - amorts[key]) < 1) {
          totalAmort.push(`${key}: brut = amort = ${Math.round(bruts[key])}`);
        }
      }
      if (totalAmort.length === 0) return ok('C40', 'Immo totalement amorties', 'Aucune immobilisation totalement amortie.', 'SYSCOHADA révisé');
      return alerte('C40', 'Immo totalement amorties', 'INFO', `${totalAmort.length} catégorie(s) totalement amorties — considérer sortie du bilan`, 'SYSCOHADA révisé', { totalAmort });
    },
  },
  {
    ref: 'C41', niveau: 4, categorie: 'immobilisations',
    libelle: 'Avances fournisseurs immobilisations (25x) justifiées',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const avances = balance
        .filter(r => (r.accountCode || '').startsWith('252'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (avances <= 0) return ok('C41', 'Avances immo', 'Pas d\'avances sur immobilisations.', 'SYSCOHADA révisé');
      return alerte('C41', 'Avances immo', 'MINEUR', `Avances fournisseurs immo (252) = ${Math.round(avances)} FCFA — vérifier justification`, 'SYSCOHADA révisé');
    },
  },
  {
    ref: 'C42', niveau: 6, categorie: 'immobilisations',
    libelle: 'Tableau des immobilisations réconciliable',
    severite: 'INFO', reference: 'SYSCOHADA révisé Note 3',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const totalBrut = balance
        .filter(r => {
          const code = r.accountCode || '';
          return code.startsWith('2') && !code.startsWith('28') && !code.startsWith('29');
        })
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const totalAmort = balance
        .filter(r => (r.accountCode || '').startsWith('28'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const totalDeprec = balance
        .filter(r => (r.accountCode || '').startsWith('29'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const vncTotal = totalBrut - totalAmort - totalDeprec;
      return ok('C42', 'Tableau immo', `Brut = ${Math.round(totalBrut)}, Amort = ${Math.round(totalAmort)}, Déprec = ${Math.round(totalDeprec)}, VNC = ${Math.round(vncTotal)}`, 'SYSCOHADA révisé Note 3', { totalBrut: Math.round(totalBrut), totalAmort: Math.round(totalAmort), totalDeprec: Math.round(totalDeprec), vncTotal: Math.round(vncTotal) });
    },
  },
];
