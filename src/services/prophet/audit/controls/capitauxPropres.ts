// @ts-nocheck
/**
 * Contrôles capitaux propres — C16 à C27
 * Capital social, réserves, résultat, provisions, emprunts
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

function soldeCompte(balance: any[], prefix: string): number {
  return balance
    .filter(r => (r.accountCode || '').startsWith(prefix))
    .reduce((s, r) => s + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
}

function soldeDebiteur(balance: any[], prefix: string): number {
  return balance
    .filter(r => (r.accountCode || '').startsWith(prefix))
    .reduce((s, r) => s + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
}

export const capitauxPropresControls: AuditControl[] = [
  {
    ref: 'C16', niveau: 2, categorie: 'capitaux_propres',
    libelle: 'Capital social positif (101 > 0)',
    severite: 'BLOQUANT', reference: 'AUSCGIE Art. 63',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const capital = soldeCompte(balance, '101');
      if (capital > 0) return ok('C16', 'Capital social positif', `Capital social = ${Math.round(capital)} FCFA`, 'AUSCGIE Art. 63');
      if (capital === 0) return err('C16', 'Capital social positif', 'BLOQUANT', 'Capital social nul — compte 101 absent ou vide', 'AUSCGIE Art. 63');
      return err('C16', 'Capital social positif', 'BLOQUANT', `Capital social négatif: ${Math.round(capital)} FCFA`, 'AUSCGIE Art. 63');
    },
  },
  {
    ref: 'C17', niveau: 3, categorie: 'capitaux_propres',
    libelle: 'Réserve légale <= 20% du capital',
    severite: 'MAJEUR', reference: 'AUSCGIE Art. 546',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const capital = soldeCompte(balance, '101');
      const reserveLegale = soldeCompte(balance, '111');
      if (capital <= 0) return skip('C17', 'Réserve légale', 'MAJEUR', 'Capital nul, contrôle impossible', 'AUSCGIE Art. 546');
      const ratio = reserveLegale / capital;
      if (ratio <= 0.20) return ok('C17', 'Réserve légale', `Réserve légale = ${Math.round(ratio * 100)}% du capital (max 20%)`, 'AUSCGIE Art. 546');
      return alerte('C17', 'Réserve légale', 'MAJEUR', `Réserve légale = ${Math.round(ratio * 100)}% du capital, dépasse le plafond légal de 20%`, 'AUSCGIE Art. 546', { reserveLegale: Math.round(reserveLegale), capital: Math.round(capital) });
    },
  },
  {
    ref: 'C18', niveau: 3, categorie: 'capitaux_propres',
    libelle: 'RAN débiteur (129) non supérieur aux capitaux propres',
    severite: 'MAJEUR', reference: 'AUSCGIE Art. 664',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const ranDebiteur = soldeDebiteur(balance, '129');
      if (ranDebiteur <= 0) return ok('C18', 'RAN débiteur', 'Pas de report à nouveau débiteur.', 'AUSCGIE Art. 664');
      const capital = soldeCompte(balance, '101');
      const reserves = soldeCompte(balance, '11');
      const cpHorsRan = capital + reserves;
      if (ranDebiteur > cpHorsRan) return err('C18', 'RAN débiteur', 'MAJEUR', `RAN débiteur (${Math.round(ranDebiteur)}) > capitaux propres hors RAN (${Math.round(cpHorsRan)})`, 'AUSCGIE Art. 664');
      return ok('C18', 'RAN débiteur', `RAN débiteur = ${Math.round(ranDebiteur)}, capitaux propres hors RAN = ${Math.round(cpHorsRan)}`, 'AUSCGIE Art. 664');
    },
  },
  {
    ref: 'C19', niveau: 4, categorie: 'capitaux_propres',
    libelle: 'Provisions réglementées (15x) justifiées',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé Art. 48',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const provisions = soldeCompte(balance, '15');
      if (provisions === 0) return ok('C19', 'Provisions réglementées', 'Aucune provision réglementée.', 'SYSCOHADA révisé Art. 48');
      if (provisions < 0) return alerte('C19', 'Provisions réglementées', 'MINEUR', `Provisions réglementées (15x) avec solde débiteur: ${Math.round(provisions)}`, 'SYSCOHADA révisé Art. 48');
      return ok('C19', 'Provisions réglementées', `Provisions réglementées = ${Math.round(provisions)} FCFA (solde créditeur normal)`, 'SYSCOHADA révisé Art. 48');
    },
  },
  {
    ref: 'C20', niveau: 4, categorie: 'capitaux_propres',
    libelle: 'Subventions d\'investissement (14x) cohérentes avec amortissements',
    severite: 'MINEUR', reference: 'SYSCOHADA révisé Art. 56',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const subventions = soldeCompte(balance, '14');
      if (subventions === 0) return ok('C20', 'Subventions investissement', 'Aucune subvention d\'investissement.', 'SYSCOHADA révisé Art. 56');
      const amortissements = soldeCompte(balance, '28');
      if (amortissements === 0 && subventions > 0) return alerte('C20', 'Subventions investissement', 'MINEUR', `Subvention = ${Math.round(subventions)} mais aucun amortissement — vérifier reprise`, 'SYSCOHADA révisé Art. 56');
      return ok('C20', 'Subventions investissement', `Subventions = ${Math.round(subventions)}, amortissements = ${Math.round(amortissements)}`, 'SYSCOHADA révisé Art. 56');
    },
  },
  {
    ref: 'C21', niveau: 3, categorie: 'capitaux_propres',
    libelle: 'Emprunts (16x) solde créditeur',
    severite: 'MAJEUR', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const emprunts = balance.filter(r => (r.accountCode || '').startsWith('16'));
      const anomalies: string[] = [];
      for (const r of emprunts) {
        const solde = (r.totalDebit || 0) - (r.totalCredit || 0);
        if (solde > 100) anomalies.push(`${r.accountCode}: solde débiteur ${Math.round(solde)}`);
      }
      if (anomalies.length === 0) return ok('C21', 'Emprunts créditeurs', 'Tous les emprunts (16x) ont un solde créditeur normal.', 'SYSCOHADA révisé');
      return alerte('C21', 'Emprunts créditeurs', 'MAJEUR', `${anomalies.length} emprunt(s) avec solde débiteur anormal`, 'SYSCOHADA révisé', { anomalies });
    },
  },
  {
    ref: 'C22', niveau: 5, categorie: 'capitaux_propres',
    libelle: 'Pas de variation anormale du capital',
    severite: 'MINEUR', reference: 'AUSCGIE Art. 568',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const capital = soldeCompte(balance, '101');
      const entries = await adapter.getJournalEntries({});
      const mouvementsCapital = entries.filter(e =>
        e.lines?.some(l => (l.accountCode || '').startsWith('101'))
      );
      if (mouvementsCapital.length === 0) return ok('C22', 'Variation capital', 'Aucun mouvement sur le capital durant l\'exercice.', 'AUSCGIE Art. 568');
      return alerte('C22', 'Variation capital', 'MINEUR', `${mouvementsCapital.length} mouvement(s) affectant le capital — vérifier délibérations AG`, 'AUSCGIE Art. 568', { capital: Math.round(capital) });
    },
  },
  {
    ref: 'C23', niveau: 5, categorie: 'capitaux_propres',
    libelle: 'Dettes crédit-bail (17x) cohérentes avec immobilisations CB',
    severite: 'INFO', reference: 'SYSCOHADA révisé Art. 37',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const detteCB = soldeCompte(balance, '17');
      if (detteCB === 0) return ok('C23', 'Crédit-bail', 'Pas de dette crédit-bail.', 'SYSCOHADA révisé Art. 37');
      return alerte('C23', 'Crédit-bail', 'INFO', `Dettes crédit-bail = ${Math.round(detteCB)} — vérifier cohérence avec immobilisations en CB`, 'SYSCOHADA révisé Art. 37');
    },
  },
  {
    ref: 'C24', niveau: 2, categorie: 'capitaux_propres',
    libelle: 'Résultat net (13x) cohérent avec le CR',
    severite: 'BLOQUANT', reference: 'AUDCIF Art. 31',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      let produits = 0, charges = 0;
      for (const r of balance) {
        const code = r.accountCode || '';
        if (code.startsWith('7')) produits += (r.totalCredit || 0) - (r.totalDebit || 0);
        if (code.startsWith('6')) charges += (r.totalDebit || 0) - (r.totalCredit || 0);
      }
      const resultatCR = produits - charges;
      const resultatBilan = soldeCompte(balance, '13');
      if (resultatBilan === 0) return skip('C24', 'Résultat net cohérent', 'BLOQUANT', 'Compte 13 vide — résultat non encore affecté', 'AUDCIF Art. 31');
      const ecart = Math.abs(resultatCR - resultatBilan);
      if (ecart < 1) return ok('C24', 'Résultat net cohérent', `Résultat CR = ${Math.round(resultatCR)}, Bilan = ${Math.round(resultatBilan)}`, 'AUDCIF Art. 31');
      return err('C24', 'Résultat net cohérent', 'BLOQUANT', `Résultat CR (${Math.round(resultatCR)}) ≠ Bilan (${Math.round(resultatBilan)}), écart = ${Math.round(ecart)}`, 'AUDCIF Art. 31');
    },
  },
  {
    ref: 'C25', niveau: 3, categorie: 'capitaux_propres',
    libelle: 'Provisions risques et charges (19x) pas de solde débiteur',
    severite: 'MAJEUR', reference: 'SYSCOHADA révisé Art. 48',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const provisions = balance.filter(r => (r.accountCode || '').startsWith('19'));
      const anomalies: string[] = [];
      for (const r of provisions) {
        const solde = (r.totalDebit || 0) - (r.totalCredit || 0);
        if (solde > 1) anomalies.push(`${r.accountCode}: solde débiteur ${Math.round(solde)}`);
      }
      if (anomalies.length === 0) return ok('C25', 'Provisions risques', 'Comptes 19x correctement créditeurs.', 'SYSCOHADA révisé Art. 48');
      return err('C25', 'Provisions risques', 'MAJEUR', `${anomalies.length} provision(s) avec solde débiteur`, 'SYSCOHADA révisé Art. 48', { anomalies });
    },
  },
  {
    ref: 'C26', niveau: 3, categorie: 'capitaux_propres',
    libelle: 'Capitaux propres > 50% du capital social',
    severite: 'MAJEUR', reference: 'AUSCGIE Art. 664',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const capital = soldeCompte(balance, '101');
      if (capital <= 0) return skip('C26', 'CP > 50% capital', 'MAJEUR', 'Capital nul, contrôle impossible', 'AUSCGIE Art. 664');
      const reserves = soldeCompte(balance, '11');
      const ran = soldeCompte(balance, '12');
      const resultat = soldeCompte(balance, '13');
      const subventions = soldeCompte(balance, '14');
      const cpTotaux = capital + reserves + ran + resultat + subventions;
      const ratio = cpTotaux / capital;
      if (ratio >= 0.5) return ok('C26', 'CP > 50% capital', `Capitaux propres = ${Math.round(cpTotaux)}, capital = ${Math.round(capital)} (ratio = ${Math.round(ratio * 100)}%)`, 'AUSCGIE Art. 664');
      return err('C26', 'CP > 50% capital', 'MAJEUR', `Capitaux propres (${Math.round(cpTotaux)}) < 50% du capital (${Math.round(capital)}). Alerte AUSCGIE Art. 664 — assemblée générale requise.`, 'AUSCGIE Art. 664', { cpTotaux: Math.round(cpTotaux), capital: Math.round(capital), ratio: Math.round(ratio * 100) });
    },
  },
  {
    ref: 'C27', niveau: 5, categorie: 'capitaux_propres',
    libelle: 'Report à nouveau cohérent avec affectation N-1',
    severite: 'INFO', reference: 'SYSCOHADA révisé',
    execute: async (adapter) => {
      const balance = await adapter.getTrialBalance();
      const ran = soldeCompte(balance, '12');
      const entries = await adapter.getJournalEntries({});
      const mouvementsRAN = entries.filter(e =>
        e.lines?.some(l => (l.accountCode || '').startsWith('12'))
      );
      if (mouvementsRAN.length === 0 && ran !== 0) return alerte('C27', 'RAN vs affectation', 'INFO', `RAN = ${Math.round(ran)} mais aucun mouvement d'affectation détecté sur l'exercice`, 'SYSCOHADA révisé');
      return ok('C27', 'RAN vs affectation', `Report à nouveau = ${Math.round(ran)} FCFA, ${mouvementsRAN.length} mouvement(s) d'affectation`, 'SYSCOHADA révisé');
    },
  },
];
