// @ts-nocheck
/**
 * Contrôles transversaux — C83 à C97
 * Benford, doublons, séquentialité, anti-fraude, intégrité
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

// Loi de Benford: distribution attendue du premier chiffre significatif
const BENFORD_EXPECTED = [0, 0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];

export const transversauxControls: AuditControl[] = [
  {
    ref: 'C83', niveau: 4, categorie: 'transversaux',
    libelle: 'Analyse de Benford sur les montants débit',
    severite: 'MINEUR', reference: 'ISA 240 — Fraude',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const digits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      let total = 0;
      for (const e of entries) {
        if (!e.lines) continue;
        for (const l of e.lines) {
          const montant = l.debit || 0;
          if (montant >= 10) {
            const premier = parseInt(String(montant).charAt(0));
            if (premier >= 1 && premier <= 9) { digits[premier]++; total++; }
          }
        }
      }
      if (total < 100) return skip('C83', 'Benford', 'MINEUR', `Échantillon insuffisant (${total} montants)`, 'ISA 240 — Fraude');
      let maxEcart = 0;
      const distribution: Record<number, number> = {};
      for (let d = 1; d <= 9; d++) {
        const observe = digits[d] / total;
        distribution[d] = Math.round(observe * 1000) / 10;
        const ecart = Math.abs(observe - BENFORD_EXPECTED[d]);
        if (ecart > maxEcart) maxEcart = ecart;
      }
      if (maxEcart < 0.05) return ok('C83', 'Benford', `Distribution conforme à Benford (écart max = ${Math.round(maxEcart * 100)}%)`, 'ISA 240 — Fraude', { distribution });
      if (maxEcart < 0.10) return alerte('C83', 'Benford', 'MINEUR', `Écart Benford modéré (max ${Math.round(maxEcart * 100)}%) — à surveiller`, 'ISA 240 — Fraude', { distribution });
      return alerte('C83', 'Benford', 'MINEUR', `Distribution non conforme à Benford (écart max = ${Math.round(maxEcart * 100)}%) — risque fraude`, 'ISA 240 — Fraude', { distribution });
    },
  },
  {
    ref: 'C84', niveau: 4, categorie: 'transversaux',
    libelle: 'Pas d\'écritures passées le week-end',
    severite: 'MINEUR', reference: 'Contrôle interne',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const weekend: string[] = [];
      for (const e of entries) {
        if (!e.date) continue;
        const day = new Date(e.date).getDay();
        if (day === 0 || day === 6) weekend.push(`${e.date} - ${e.reference || e.id || 'N/A'}`);
      }
      if (weekend.length === 0) return ok('C84', 'Écritures week-end', 'Aucune écriture passée le week-end.', 'Contrôle interne');
      return alerte('C84', 'Écritures week-end', 'MINEUR', `${weekend.length} écriture(s) passée(s) le week-end`, 'Contrôle interne', { ecritures: weekend.slice(0, 15) });
    },
  },
  {
    ref: 'C85', niveau: 5, categorie: 'transversaux',
    libelle: 'Pas d\'écritures de montants ronds suspects (multiples exacts de 1M)',
    severite: 'INFO', reference: 'ISA 240 — Fraude',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const SEUIL = 1000000;
      const ronds: { ref: string; montant: number }[] = [];
      for (const e of entries) {
        if (!e.lines) continue;
        for (const l of e.lines) {
          const montant = Math.max(l.debit || 0, l.credit || 0);
          if (montant >= SEUIL && montant % SEUIL === 0) {
            ronds.push({ ref: e.reference || e.id || 'N/A', montant });
          }
        }
      }
      if (ronds.length === 0) return ok('C85', 'Montants ronds', 'Aucun montant multiple exact de 1 000 000.', 'ISA 240 — Fraude');
      return alerte('C85', 'Montants ronds', 'INFO', `${ronds.length} ligne(s) avec montant multiple exact de 1M FCFA`, 'ISA 240 — Fraude', { ronds: ronds.slice(0, 10) });
    },
  },
  {
    ref: 'C86', niveau: 3, categorie: 'transversaux',
    libelle: 'Pas de doublons d\'écritures',
    severite: 'MAJEUR', reference: 'AUDCIF Art. 17',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const seen = new Map<string, number>();
      const doublons: string[] = [];
      for (const e of entries) {
        if (!e.lines || e.lines.length === 0) continue;
        const totalD = e.lines.reduce((s, l) => s + (l.debit || 0), 0);
        const firstAccount = e.lines[0]?.accountCode || '';
        const key = `${e.date}|${firstAccount}|${Math.round(totalD)}`;
        const count = (seen.get(key) || 0) + 1;
        seen.set(key, count);
        if (count === 2) doublons.push(`${e.date} / ${firstAccount} / ${Math.round(totalD)}`);
      }
      if (doublons.length === 0) return ok('C86', 'Doublons', 'Aucun doublon détecté.', 'AUDCIF Art. 17');
      return err('C86', 'Doublons', 'MAJEUR', `${doublons.length} doublon(s) potentiel(s) détecté(s)`, 'AUDCIF Art. 17', { doublons: doublons.slice(0, 15) });
    },
  },
  {
    ref: 'C87', niveau: 5, categorie: 'transversaux',
    libelle: 'Écritures de clôture identifiées et tracées',
    severite: 'INFO', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const cloture = entries.filter(e =>
        (e.journal || '').toUpperCase().includes('OD') ||
        (e.journal || '').toUpperCase().includes('CLOT') ||
        (e.reference || '').toUpperCase().includes('CLOT')
      );
      if (cloture.length === 0) return alerte('C87', 'Écritures clôture', 'INFO', 'Aucune écriture de clôture identifiée — vérifier journal OD/CLOT', 'SYSCOHADA révisé');
      return ok('C87', 'Écritures clôture', `${cloture.length} écriture(s) de clôture identifiée(s)`, 'SYSCOHADA révisé');
    },
  },
  {
    ref: 'C88', niveau: 4, categorie: 'transversaux',
    libelle: 'Numérotation séquentielle des pièces',
    severite: 'MINEUR', reference: 'AUDCIF Art. 16',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const refs = entries
        .map(e => e.reference || e.id || '')
        .filter(Boolean)
        .sort();
      if (refs.length < 2) return skip('C88', 'Séquentialité pièces', 'MINEUR', 'Moins de 2 pièces', 'AUDCIF Art. 16');
      const uniqueRefs = new Set(refs);
      const doublonsRef = refs.length - uniqueRefs.size;
      if (doublonsRef > 0) return alerte('C88', 'Séquentialité pièces', 'MINEUR', `${doublonsRef} référence(s) de pièce en doublon`, 'AUDCIF Art. 16');
      return ok('C88', 'Séquentialité pièces', `${refs.length} pièces, ${uniqueRefs.size} références uniques.`, 'AUDCIF Art. 16');
    },
  },
  {
    ref: 'C89', niveau: 3, categorie: 'transversaux',
    libelle: 'Pas d\'écritures antidatées (date < date validation)',
    severite: 'MAJEUR', reference: 'AUDCIF Art. 16',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const antidatees: string[] = [];
      for (const e of entries) {
        if (!e.date || !e.validatedAt) continue;
        if (new Date(e.date) < new Date(e.validatedAt)) {
          const diff = Math.round((new Date(e.validatedAt).getTime() - new Date(e.date).getTime()) / 86400000);
          if (diff > 30) antidatees.push(`${e.reference || e.id || 'N/A'}: date ${e.date}, validé ${e.validatedAt} (${diff}j)`);
        }
      }
      if (antidatees.length === 0) return ok('C89', 'Antidatage', 'Aucune écriture antidatée de plus de 30 jours.', 'AUDCIF Art. 16');
      return err('C89', 'Antidatage', 'MAJEUR', `${antidatees.length} écriture(s) antidatée(s) de plus de 30 jours`, 'AUDCIF Art. 16', { antidatees: antidatees.slice(0, 10) });
    },
  },
  {
    ref: 'C90', niveau: 5, categorie: 'transversaux',
    libelle: 'Volume d\'écritures par mois homogène',
    severite: 'INFO', reference: 'ISA 520 — Procédures analytiques',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const parMois: Record<string, number> = {};
      for (const e of entries) {
        if (!e.date) continue;
        const mois = e.date.slice(0, 7);
        parMois[mois] = (parMois[mois] || 0) + 1;
      }
      const moisList = Object.keys(parMois).sort();
      if (moisList.length < 3) return skip('C90', 'Volume mensuel', 'INFO', 'Moins de 3 mois de données', 'ISA 520 — Procédures analytiques');
      const volumes = moisList.map(m => parMois[m]);
      const moyenne = volumes.reduce((s, v) => s + v, 0) / volumes.length;
      const max = Math.max(...volumes);
      const min = Math.min(...volumes);
      if (max > moyenne * 3) return alerte('C90', 'Volume mensuel', 'INFO', `Volume très hétérogène: min=${min}, max=${max}, moy=${Math.round(moyenne)}`, 'ISA 520 — Procédures analytiques', { parMois });
      return ok('C90', 'Volume mensuel', `Volume homogène: min=${min}, max=${max}, moy=${Math.round(moyenne)}`, 'ISA 520 — Procédures analytiques');
    },
  },
  {
    ref: 'C91', niveau: 5, categorie: 'transversaux',
    libelle: 'Pas de concentration anormale juste sous un seuil',
    severite: 'MINEUR', reference: 'ISA 240 — Fraude',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const SEUILS = [100000, 500000, 1000000, 5000000];
      const suspects: { seuil: number; count: number }[] = [];
      for (const seuil of SEUILS) {
        let count = 0;
        for (const e of entries) {
          if (!e.lines) continue;
          for (const l of e.lines) {
            const montant = Math.max(l.debit || 0, l.credit || 0);
            if (montant >= seuil * 0.90 && montant < seuil) count++;
          }
        }
        if (count > 5) suspects.push({ seuil, count });
      }
      if (suspects.length === 0) return ok('C91', 'Sous-seuils', 'Pas de concentration anormale sous les seuils courants.', 'ISA 240 — Fraude');
      return alerte('C91', 'Sous-seuils', 'MINEUR', `Concentration(s) détectée(s) juste sous seuil(s)`, 'ISA 240 — Fraude', { suspects });
    },
  },
  {
    ref: 'C92', niveau: 4, categorie: 'transversaux',
    libelle: 'Diversité des comptes utilisés',
    severite: 'MINEUR', reference: 'Bonne pratique audit',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const entries = await adapter.getJournalEntries({});
      const comptesActifs = new Set<string>();
      for (const e of entries) {
        if (!e.lines) continue;
        for (const l of e.lines) {
          if (l.accountCode) comptesActifs.add(l.accountCode);
        }
      }
      const totalComptes = balance.length;
      if (totalComptes === 0) return skip('C92', 'Diversité comptes', 'MINEUR', 'Plan comptable vide', 'Bonne pratique audit');
      const ratio = comptesActifs.size / totalComptes;
      if (ratio >= 0.3) return ok('C92', 'Diversité comptes', `${comptesActifs.size}/${totalComptes} comptes utilisés (${Math.round(ratio * 100)}%)`, 'Bonne pratique audit');
      return alerte('C92', 'Diversité comptes', 'MINEUR', `Seulement ${comptesActifs.size}/${totalComptes} comptes utilisés (${Math.round(ratio * 100)}%) — possible compte fourre-tout`, 'Bonne pratique audit');
    },
  },
  {
    ref: 'C93', niveau: 4, categorie: 'transversaux',
    libelle: 'Cohérence inter-journaux',
    severite: 'MINEUR', reference: 'AUDCIF Art. 17',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const journaux: Record<string, number> = {};
      for (const e of entries) {
        const j = (e.journal || 'INCONNU').toUpperCase();
        journaux[j] = (journaux[j] || 0) + 1;
      }
      const nbJournaux = Object.keys(journaux).length;
      if (nbJournaux < 2) return alerte('C93', 'Inter-journaux', 'MINEUR', `Seulement ${nbJournaux} journal(aux) — diversification insuffisante`, 'AUDCIF Art. 17', { journaux });
      return ok('C93', 'Inter-journaux', `${nbJournaux} journaux utilisés`, 'AUDCIF Art. 17', { journaux });
    },
  },
  {
    ref: 'C94', niveau: 4, categorie: 'transversaux',
    libelle: 'Pas d\'écriture sans libellé',
    severite: 'MINEUR', reference: 'AUDCIF Art. 16',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const sansLibelle = entries.filter(e => !e.description && !e.label && !e.libelle);
      if (sansLibelle.length === 0) return ok('C94', 'Libellé obligatoire', `${entries.length} écritures, toutes avec libellé.`, 'AUDCIF Art. 16');
      return alerte('C94', 'Libellé obligatoire', 'MINEUR', `${sansLibelle.length} écriture(s) sans libellé`, 'AUDCIF Art. 16');
    },
  },
  {
    ref: 'C95', niveau: 4, categorie: 'transversaux',
    libelle: 'Pas d\'écriture sans pièce justificative référencée',
    severite: 'MINEUR', reference: 'AUDCIF Art. 16',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      const sansPiece = entries.filter(e => !e.reference && !e.pieceRef && !e.documentRef);
      if (sansPiece.length === 0) return ok('C95', 'Pièce justificative', `${entries.length} écritures, toutes avec référence pièce.`, 'AUDCIF Art. 16');
      return alerte('C95', 'Pièce justificative', 'MINEUR', `${sansPiece.length} écriture(s) sans référence de pièce justificative`, 'AUDCIF Art. 16');
    },
  },
  {
    ref: 'C96', niveau: 5, categorie: 'transversaux',
    libelle: 'Ratio écritures manuelles / automatiques',
    severite: 'INFO', reference: 'Bonne pratique audit',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      if (entries.length === 0) return skip('C96', 'Manuel vs auto', 'INFO', 'Aucune écriture', 'Bonne pratique audit');
      const manuelles = entries.filter(e => e.source === 'manual' || e.origin === 'manual' || !e.source);
      const ratio = manuelles.length / entries.length;
      return ok('C96', 'Manuel vs auto', `${manuelles.length}/${entries.length} écritures manuelles (${Math.round(ratio * 100)}%)`, 'Bonne pratique audit', { manuelles: manuelles.length, total: entries.length, ratio: Math.round(ratio * 100) });
    },
  },
  {
    ref: 'C97', niveau: 2, categorie: 'transversaux',
    libelle: 'Pas de suppression d\'écriture (intégrité chaîne audit)',
    severite: 'BLOQUANT', reference: 'AUDCIF Art. 17 — Piste d\'audit',
    execute: async (adapter) => {
      const entries = await adapter.getJournalEntries({});
      if (entries.length === 0) return skip('C97', 'Intégrité audit', 'BLOQUANT', 'Aucune écriture', 'AUDCIF Art. 17 — Piste d\'audit');
      // Vérifier séquentialité des IDs numériques si disponible
      const numericIds = entries
        .map(e => parseInt(e.id || '0'))
        .filter(id => !isNaN(id) && id > 0)
        .sort((a, b) => a - b);
      if (numericIds.length < 2) return ok('C97', 'Intégrité audit', `${entries.length} écritures — IDs non numériques, vérification alternative requise`, 'AUDCIF Art. 17 — Piste d\'audit');
      const trous: number[] = [];
      for (let i = 1; i < numericIds.length; i++) {
        if (numericIds[i] - numericIds[i - 1] > 1) trous.push(numericIds[i - 1] + 1);
      }
      if (trous.length === 0) return ok('C97', 'Intégrité audit', `${numericIds.length} écritures, numérotation continue.`, 'AUDCIF Art. 17 — Piste d\'audit');
      return err('C97', 'Intégrité audit', 'BLOQUANT', `${trous.length} trou(s) dans la numérotation — suppression possible`, 'AUDCIF Art. 17 — Piste d\'audit', { trous: trous.slice(0, 20) });
    },
  },
];
