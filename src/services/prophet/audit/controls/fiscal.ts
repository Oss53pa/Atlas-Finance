// @ts-nocheck
/**
 * Contrôles fiscaux — C98 à C108
 * TVA, IS, charges non déductibles, retenues, liasse fiscale
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

export const fiscalControls: AuditControl[] = [
  {
    ref: 'C98', niveau: 3, categorie: 'fiscal',
    libelle: 'TVA déclarée cohérente avec CA comptable',
    severite: 'MAJEUR', reference: 'CGI UEMOA Art. 350',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const ca = balance
        .filter(r => (r.accountCode || '').startsWith('70'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const tvaCollectee = balance
        .filter(r => (r.accountCode || '').startsWith('4431'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const tvaDeductible = balance
        .filter(r => (r.accountCode || '').startsWith('445'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (ca <= 0) return skip('C98', 'TVA vs CA', 'MAJEUR', 'CA nul', 'CGI UEMOA Art. 350');
      const tauxImplicite = tvaCollectee / ca;
      if (tauxImplicite >= 0.15 && tauxImplicite <= 0.22) return ok('C98', 'TVA vs CA', `Taux TVA implicite = ${Math.round(tauxImplicite * 100)}% (cohérent avec taux standard 18%)`, 'CGI UEMOA Art. 350', { ca: Math.round(ca), tvaCollectee: Math.round(tvaCollectee), tvaDeductible: Math.round(tvaDeductible) });
      if (tvaCollectee === 0) return alerte('C98', 'TVA vs CA', 'MAJEUR', `CA = ${Math.round(ca)} mais aucune TVA collectée — exonération ou omission ?`, 'CGI UEMOA Art. 350');
      return alerte('C98', 'TVA vs CA', 'MAJEUR', `Taux TVA implicite = ${Math.round(tauxImplicite * 100)}% (attendu ~18%) — écart significatif`, 'CGI UEMOA Art. 350', { ca: Math.round(ca), tvaCollectee: Math.round(tvaCollectee) });
    },
  },
  {
    ref: 'C99', niveau: 3, categorie: 'fiscal',
    libelle: 'IS provisionné si résultat > 0',
    severite: 'MAJEUR', reference: 'CGI UEMOA Art. 100',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const produits = balance
        .filter(r => (r.accountCode || '').startsWith('7'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const charges = balance
        .filter(r => (r.accountCode || '').startsWith('6'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const resultat = produits - charges;
      if (resultat <= 0) return ok('C99', 'IS provisionné', `Résultat déficitaire (${Math.round(resultat)}) — pas d'IS.`, 'CGI UEMOA Art. 100');
      const is695 = balance
        .filter(r => (r.accountCode || '').startsWith('695'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const detteIS = balance
        .filter(r => (r.accountCode || '').startsWith('441'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (is695 > 0 || detteIS > 0) return ok('C99', 'IS provisionné', `Résultat = ${Math.round(resultat)}, IS (695) = ${Math.round(is695)}, dette IS (441) = ${Math.round(detteIS)}`, 'CGI UEMOA Art. 100');
      return err('C99', 'IS provisionné', 'MAJEUR', `Résultat bénéficiaire (${Math.round(resultat)}) mais IS non provisionné (695 et 441 nuls)`, 'CGI UEMOA Art. 100');
    },
  },
  {
    ref: 'C100', niveau: 4, categorie: 'fiscal',
    libelle: 'Charges non déductibles identifiées (amendes 654, dons excessifs)',
    severite: 'MINEUR', reference: 'CGI UEMOA Art. 110',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const amendes = balance
        .filter(r => (r.accountCode || '').startsWith('654'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const dons = balance
        .filter(r => (r.accountCode || '').startsWith('658'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const nonDeductibles = amendes + dons;
      if (nonDeductibles <= 0) return ok('C100', 'Charges non déductibles', 'Aucune charge non déductible identifiée (654, 658).', 'CGI UEMOA Art. 110');
      return alerte('C100', 'Charges non déductibles', 'MINEUR', `Charges non déductibles: amendes (654) = ${Math.round(amendes)}, dons (658) = ${Math.round(dons)} — à réintégrer fiscalement`, 'CGI UEMOA Art. 110', { amendes: Math.round(amendes), dons: Math.round(dons) });
    },
  },
  {
    ref: 'C101', niveau: 5, categorie: 'fiscal',
    libelle: 'Minimum d\'imposition calculable',
    severite: 'INFO', reference: 'CGI UEMOA Art. 102',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const ca = balance
        .filter(r => (r.accountCode || '').startsWith('70'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (ca <= 0) return skip('C101', 'Minimum imposition', 'INFO', 'CA nul', 'CGI UEMOA Art. 102');
      // Minimum d'imposition = 1% du CA (varie selon pays UEMOA)
      const minimumIS = ca * 0.01;
      const is695 = balance
        .filter(r => (r.accountCode || '').startsWith('695'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (is695 >= minimumIS) return ok('C101', 'Minimum imposition', `IS (${Math.round(is695)}) >= minimum 1% CA (${Math.round(minimumIS)})`, 'CGI UEMOA Art. 102');
      return alerte('C101', 'Minimum imposition', 'INFO', `IS (${Math.round(is695)}) < minimum théorique 1% CA (${Math.round(minimumIS)}) — vérifier règle locale`, 'CGI UEMOA Art. 102', { is695: Math.round(is695), minimumIS: Math.round(minimumIS), ca: Math.round(ca) });
    },
  },
  {
    ref: 'C102', niveau: 5, categorie: 'fiscal',
    libelle: 'Acomptes IS comptabilisés (4495)',
    severite: 'INFO', reference: 'CGI UEMOA',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const acomptes = balance
        .filter(r => (r.accountCode || '').startsWith('4495'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const is695 = balance
        .filter(r => (r.accountCode || '').startsWith('695'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (is695 <= 0) return ok('C102', 'Acomptes IS', 'Pas d\'IS comptabilisé — pas d\'acomptes attendus.', 'CGI UEMOA');
      if (acomptes > 0) return ok('C102', 'Acomptes IS', `Acomptes IS (4495) = ${Math.round(acomptes)}, IS total = ${Math.round(is695)}`, 'CGI UEMOA');
      return alerte('C102', 'Acomptes IS', 'INFO', `IS = ${Math.round(is695)} mais aucun acompte (4495) — vérifier si versements effectués`, 'CGI UEMOA');
    },
  },
  {
    ref: 'C103', niveau: 3, categorie: 'fiscal',
    libelle: 'Cohérence TVA collectée (4431) vs TVA déclarée',
    severite: 'MAJEUR', reference: 'CGI UEMOA Art. 350',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const tvaCollectee = balance
        .filter(r => (r.accountCode || '').startsWith('4431'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const tvaDue = balance
        .filter(r => (r.accountCode || '').startsWith('4441'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const tvaDeductible = balance
        .filter(r => (r.accountCode || '').startsWith('4452'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (tvaCollectee === 0) return skip('C103', 'TVA collectée vs due', 'MAJEUR', 'Pas de TVA collectée', 'CGI UEMOA Art. 350');
      const tvaNetteTheorique = tvaCollectee - tvaDeductible;
      if (tvaDue === 0 && tvaNetteTheorique > 0) return alerte('C103', 'TVA collectée vs due', 'MAJEUR', `TVA nette théorique = ${Math.round(tvaNetteTheorique)} mais TVA due (4441) nulle`, 'CGI UEMOA Art. 350');
      return ok('C103', 'TVA collectée vs due', `TVA collectée = ${Math.round(tvaCollectee)}, déductible = ${Math.round(tvaDeductible)}, due = ${Math.round(tvaDue)}`, 'CGI UEMOA Art. 350', { tvaCollectee: Math.round(tvaCollectee), tvaDeductible: Math.round(tvaDeductible), tvaDue: Math.round(tvaDue) });
    },
  },
  {
    ref: 'C104', niveau: 4, categorie: 'fiscal',
    libelle: 'TVA déductible (4452) justifiée par factures',
    severite: 'MINEUR', reference: 'CGI UEMOA Art. 355',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const tvaDeductible = balance
        .filter(r => (r.accountCode || '').startsWith('4452'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const achats = balance
        .filter(r => (r.accountCode || '').startsWith('60'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (tvaDeductible <= 0) return ok('C104', 'TVA déductible justifiée', 'Pas de TVA déductible.', 'CGI UEMOA Art. 355');
      if (achats <= 0) return alerte('C104', 'TVA déductible justifiée', 'MINEUR', `TVA déductible = ${Math.round(tvaDeductible)} mais achats nuls — déduction injustifiée ?`, 'CGI UEMOA Art. 355');
      const ratio = tvaDeductible / achats;
      if (ratio <= 0.25) return ok('C104', 'TVA déductible justifiée', `TVA déductible / achats = ${Math.round(ratio * 100)}% (cohérent)`, 'CGI UEMOA Art. 355');
      return alerte('C104', 'TVA déductible justifiée', 'MINEUR', `TVA déductible / achats = ${Math.round(ratio * 100)}% — taux anormalement élevé`, 'CGI UEMOA Art. 355');
    },
  },
  {
    ref: 'C105', niveau: 4, categorie: 'fiscal',
    libelle: 'Retenues à la source (447x) reversées',
    severite: 'MINEUR', reference: 'CGI UEMOA',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const retenues = balance
        .filter(r => (r.accountCode || '').startsWith('447'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (retenues <= 0) return ok('C105', 'Retenues source', 'Pas de retenues à la source (447x).', 'CGI UEMOA');
      // Les retenues doivent être reversées, donc le solde en fin d'exercice devrait être faible
      const totalCredit = balance
        .filter(r => (r.accountCode || '').startsWith('447'))
        .reduce((s, r) => s + (r.totalCredit || 0), 0);
      if (totalCredit > 0 && retenues / totalCredit < 0.20) return ok('C105', 'Retenues source', `Retenues (447x): solde = ${Math.round(retenues)} — majorité reversée`, 'CGI UEMOA');
      return alerte('C105', 'Retenues source', 'MINEUR', `Retenues à la source (447x) = ${Math.round(retenues)} — vérifier reversement`, 'CGI UEMOA');
    },
  },
  {
    ref: 'C106', niveau: 5, categorie: 'fiscal',
    libelle: 'DISA/DAS cohérente avec masse salariale',
    severite: 'INFO', reference: 'CGI UEMOA',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const masseSalariale = balance
        .filter(r => (r.accountCode || '').startsWith('661'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const chargesPersonnel = balance
        .filter(r => (r.accountCode || '').startsWith('66'))
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (chargesPersonnel <= 0) return ok('C106', 'DISA/DAS', 'Pas de charges de personnel.', 'CGI UEMOA');
      return alerte('C106', 'DISA/DAS', 'INFO', `Masse salariale (661) = ${Math.round(masseSalariale)}, total personnel (66x) = ${Math.round(chargesPersonnel)} — vérifier cohérence avec DISA/DAS`, 'CGI UEMOA', { masseSalariale: Math.round(masseSalariale), chargesPersonnel: Math.round(chargesPersonnel) });
    },
  },
  {
    ref: 'C107', niveau: 5, categorie: 'fiscal',
    libelle: 'Contribution patente/CFCE comptabilisée',
    severite: 'INFO', reference: 'CGI UEMOA',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const patente = balance
        .filter(r => {
          const code = r.accountCode || '';
          return code.startsWith('646') || code.startsWith('645');
        })
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const ca = balance
        .filter(r => (r.accountCode || '').startsWith('70'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      if (ca <= 0) return skip('C107', 'Patente/CFCE', 'INFO', 'CA nul', 'CGI UEMOA');
      if (patente > 0) return ok('C107', 'Patente/CFCE', `Patente/CFCE (645-646) = ${Math.round(patente)} FCFA`, 'CGI UEMOA');
      return alerte('C107', 'Patente/CFCE', 'INFO', `CA = ${Math.round(ca)} mais aucune patente/CFCE comptabilisée (645-646)`, 'CGI UEMOA');
    },
  },
  {
    ref: 'C108', niveau: 3, categorie: 'fiscal',
    libelle: 'Liasse fiscale réconciliable avec comptabilité',
    severite: 'MAJEUR', reference: 'CGI UEMOA Art. 200',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      // Vérifier que les grands agrégats sont calculables
      const totalActif = balance
        .filter(r => {
          const code = r.accountCode || '';
          return code.startsWith('2') || code.startsWith('3') || code.startsWith('5');
        })
        .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      const totalPassif = balance
        .filter(r => {
          const code = r.accountCode || '';
          return code.startsWith('1') || code.startsWith('40') || code.startsWith('42') || code.startsWith('43') || code.startsWith('44');
        })
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const ca = balance
        .filter(r => (r.accountCode || '').startsWith('70'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
      const resultat = balance
        .filter(r => (r.accountCode || '').startsWith('7'))
        .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0) -
        balance
          .filter(r => (r.accountCode || '').startsWith('6'))
          .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
      if (totalActif === 0 && totalPassif === 0) return skip('C108', 'Liasse fiscale', 'MAJEUR', 'Balance vide', 'CGI UEMOA Art. 200');
      const ecartBilan = Math.abs(totalActif - totalPassif);
      if (ecartBilan > totalActif * 0.05 && totalActif > 0) return err('C108', 'Liasse fiscale', 'MAJEUR', `Écart bilan trop important pour liasse: actif=${Math.round(totalActif)}, passif=${Math.round(totalPassif)}`, 'CGI UEMOA Art. 200');
      return ok('C108', 'Liasse fiscale', `Agrégats liasse: Actif=${Math.round(totalActif)}, Passif=${Math.round(totalPassif)}, CA=${Math.round(ca)}, Résultat=${Math.round(resultat)}`, 'CGI UEMOA Art. 200', { totalActif: Math.round(totalActif), totalPassif: Math.round(totalPassif), ca: Math.round(ca), resultat: Math.round(resultat) });
    },
  },
];
