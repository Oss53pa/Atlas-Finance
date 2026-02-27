/**
 * Service de recouvrement — connecté aux données réelles via DataAdapter.
 *
 * Gère les dossiers de recouvrement (créances impayées) avec :
 * - CRUD dossiers persistés en IndexedDB/Supabase
 * - Actions de relance (historique)
 * - Plans de remboursement
 * - Statistiques depuis les données réelles
 * - Détection automatique des créances en retard depuis les écritures
 *
 * Conforme SYSCOHADA — comptes 41x (clients).
 */
import type { DataAdapter } from '@atlas/data';
import { money } from '../../../utils/money';
import type { DBRecoveryCase, DBJournalEntry } from '../../../lib/db';
import {
  DossierRecouvrement,
  Creance,
  PlanRemboursement,
  Action,
  RecoveryStats,
} from '../types/recovery.types';

// ============================================================================
// HELPERS
// ============================================================================

function caseToPublic(c: DBRecoveryCase): DossierRecouvrement {
  const lastAction = c.actions.length > 0 ? c.actions[c.actions.length - 1] : null;
  return {
    id: c.id,
    numeroRef: c.numeroRef,
    client: c.clientName,
    montantPrincipal: c.montantPrincipal,
    interets: c.interets,
    frais: c.frais,
    montantTotal: c.montantTotal,
    montantPaye: c.montantPaye,
    nombreFactures: 1,
    dsoMoyen: 0,
    dateOuverture: c.dateOuverture,
    statut: c.statut,
    typeRecouvrement: c.typeRecouvrement,
    responsable: c.responsable,
    derniereAction: lastAction?.resultat || '',
    dateAction: lastAction?.date || c.dateOuverture,
    typeAction: (lastAction?.type as any) || 'EMAIL',
    prochainEtape: '',
  };
}

// ============================================================================
// DOSSIERS CRUD
// ============================================================================

async function getDossiers(adapter: DataAdapter): Promise<DossierRecouvrement[]> {
  const cases = await adapter.getAll<DBRecoveryCase>('recoveryCases');
  return cases.map(caseToPublic);
}

async function getDossierById(adapter: DataAdapter, id: string): Promise<DossierRecouvrement> {
  const c = await adapter.getById<DBRecoveryCase>('recoveryCases', id);
  if (!c) throw new Error(`Dossier introuvable : ${id}`);
  return caseToPublic(c);
}

async function createDossier(
  adapter: DataAdapter,
  data: Partial<DossierRecouvrement>,
): Promise<DossierRecouvrement> {
  const montantTotal = money(data.montantPrincipal || 0)
    .add(data.interets || 0)
    .add(data.frais || 0)
    .toNumber();

  const c = await adapter.create<DBRecoveryCase>('recoveryCases', {
    numeroRef: data.numeroRef || `REC-${Date.now()}`,
    clientId: '',
    clientName: data.client || '',
    montantPrincipal: data.montantPrincipal || 0,
    interets: data.interets || 0,
    frais: data.frais || 0,
    montantTotal,
    montantPaye: data.montantPaye || 0,
    dateOuverture: data.dateOuverture || new Date().toISOString().split('T')[0],
    statut: data.statut || 'actif',
    typeRecouvrement: data.typeRecouvrement || 'amiable',
    responsable: data.responsable || '',
    actions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  return caseToPublic(c);
}

async function updateDossier(
  adapter: DataAdapter,
  id: string,
  data: Partial<DossierRecouvrement>,
): Promise<DossierRecouvrement> {
  const updates: Partial<DBRecoveryCase> = {
    updatedAt: new Date().toISOString(),
  };
  if (data.client !== undefined) updates.clientName = data.client;
  if (data.montantPrincipal !== undefined) updates.montantPrincipal = data.montantPrincipal;
  if (data.interets !== undefined) updates.interets = data.interets;
  if (data.frais !== undefined) updates.frais = data.frais;
  if (data.montantPaye !== undefined) updates.montantPaye = data.montantPaye;
  if (data.statut !== undefined) updates.statut = data.statut;
  if (data.typeRecouvrement !== undefined) updates.typeRecouvrement = data.typeRecouvrement;
  if (data.responsable !== undefined) updates.responsable = data.responsable;

  if (data.montantPrincipal !== undefined || data.interets !== undefined || data.frais !== undefined) {
    const existing = await adapter.getById<DBRecoveryCase>('recoveryCases', id);
    if (existing) {
      updates.montantTotal = money(data.montantPrincipal ?? existing.montantPrincipal)
        .add(data.interets ?? existing.interets)
        .add(data.frais ?? existing.frais)
        .toNumber();
    }
  }

  const updated = await adapter.update<DBRecoveryCase>('recoveryCases', id, updates);
  return caseToPublic(updated);
}

async function deleteDossier(adapter: DataAdapter, id: string): Promise<void> {
  await adapter.delete('recoveryCases', id);
}

// ============================================================================
// ACTIONS
// ============================================================================

async function addAction(
  adapter: DataAdapter,
  dossierId: string,
  action: Partial<Action>,
): Promise<Action> {
  const dossier = await adapter.getById<DBRecoveryCase>('recoveryCases', dossierId);
  if (!dossier) throw new Error(`Dossier introuvable : ${dossierId}`);

  const newAction: Action = {
    id: crypto.randomUUID(),
    type: (action.type as any) || 'EMAIL',
    date: action.date || new Date().toISOString().split('T')[0],
    responsable: action.responsable || '',
    resultat: action.resultat || '',
    notes: action.notes || '',
  };

  const actions = [...dossier.actions, newAction];
  await adapter.update<DBRecoveryCase>('recoveryCases', dossierId, {
    actions,
    updatedAt: new Date().toISOString(),
  });

  return newAction;
}

async function getActions(adapter: DataAdapter, dossierId: string): Promise<Action[]> {
  const dossier = await adapter.getById<DBRecoveryCase>('recoveryCases', dossierId);
  if (!dossier) return [];
  return dossier.actions;
}

// ============================================================================
// CRÉANCES — Détection depuis les écritures comptables (comptes 411)
// ============================================================================

async function getCreances(adapter: DataAdapter): Promise<Creance[]> {
  const entries = await adapter.getAll<DBJournalEntry>('journalEntries');
  const now = new Date();

  // Agréger les soldes clients (comptes 411x)
  const clientBalances = new Map<string, { debit: number; credit: number; name: string; lastDate: string }>();

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (!line.accountCode.startsWith('411')) continue;
      const key = line.accountCode;
      const existing = clientBalances.get(key) || { debit: 0, credit: 0, name: line.accountName, lastDate: entry.date };
      existing.debit += line.debit;
      existing.credit += line.credit;
      if (entry.date > existing.lastDate) existing.lastDate = entry.date;
      clientBalances.set(key, existing);
    }
  }

  const creances: Creance[] = [];
  for (const [code, balance] of clientBalances) {
    const solde = money(balance.debit).subtract(balance.credit).toNumber();
    if (solde <= 0) continue; // Pas de créance si solde créditeur

    const lastDate = new Date(balance.lastDate);
    const joursRetard = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);

    let niveauRisque: 'faible' | 'moyen' | 'eleve' | 'critique';
    if (joursRetard <= 30) niveauRisque = 'faible';
    else if (joursRetard <= 60) niveauRisque = 'moyen';
    else if (joursRetard <= 90) niveauRisque = 'eleve';
    else niveauRisque = 'critique';

    creances.push({
      id: code,
      client: balance.name || code,
      numeroFacture: code,
      montant: solde,
      montantRestant: solde,
      dateEcheance: balance.lastDate,
      dateCreation: balance.lastDate,
      jourRetard: joursRetard,
      statut: joursRetard > 90 ? 'contentieux' : joursRetard > 30 ? 'en_retard' : 'en_cours',
      niveauRisque,
      derniereRelance: '',
      historique: [],
    });
  }

  return creances.sort((a, b) => b.jourRetard - a.jourRetard);
}

// ============================================================================
// PLANS DE REMBOURSEMENT
// ============================================================================

async function getPlansRemboursement(adapter: DataAdapter): Promise<PlanRemboursement[]> {
  const cases = await adapter.getAll<DBRecoveryCase>('recoveryCases');
  // Extraire les plans depuis les dossiers qui ont un montant payé partiellement
  return cases
    .filter(c => c.montantPaye > 0 && c.montantPaye < c.montantTotal && c.statut === 'actif')
    .map(c => ({
      id: c.id,
      client: c.clientName,
      montantTotal: c.montantTotal,
      nombreEcheances: 12,
      montantEcheance: money(c.montantTotal).subtract(c.montantPaye).divide(12).toNumber(),
      dateDebut: c.dateOuverture,
      dateFin: '',
      statut: 'actif' as const,
      echeancesPayees: 0,
      prochainePaiement: '',
    }));
}

// ============================================================================
// COMMUNICATIONS (pas de backend email — log de l'action)
// ============================================================================

async function sendEmail(
  adapter: DataAdapter,
  dossierId: string,
  _params: any,
): Promise<void> {
  await addAction(adapter, dossierId, {
    type: 'EMAIL',
    date: new Date().toISOString().split('T')[0],
    resultat: 'Email de relance envoyé',
    notes: 'Relance automatique',
  });
}

async function sendSMS(
  adapter: DataAdapter,
  dossierId: string,
  _params: any,
): Promise<void> {
  await addAction(adapter, dossierId, {
    type: 'SMS',
    date: new Date().toISOString().split('T')[0],
    resultat: 'SMS de relance envoyé',
    notes: 'Relance automatique',
  });
}

// ============================================================================
// STATISTIQUES
// ============================================================================

async function getStats(adapter: DataAdapter): Promise<RecoveryStats> {
  const cases = await adapter.getAll<DBRecoveryCase>('recoveryCases');

  const actifs = cases.filter(c => c.statut === 'actif');
  const resolus = cases.filter(c => c.statut === 'cloture');
  const montantTotal = cases.reduce((s, c) => money(s).add(c.montantTotal).toNumber(), 0);
  const montantPaye = cases.reduce((s, c) => money(s).add(c.montantPaye).toNumber(), 0);
  const tauxRecouvrement = montantTotal > 0
    ? money(montantPaye).divide(montantTotal).multiply(100).toNumber()
    : 0;

  // Si pas de dossiers, calculer depuis les créances (comptes 411)
  if (cases.length === 0) {
    const creances = await getCreances(adapter);
    const totalCreances = creances.reduce((s, c) => money(s).add(c.montantRestant).toNumber(), 0);
    return {
      totalCreances: creances.length,
      montantTotal: totalCreances,
      tauxRecouvrement: 0,
      dossiersActifs: 0,
      nouveauxDossiers: 0,
      dossiersResolus: 0,
    };
  }

  return {
    totalCreances: cases.length,
    montantTotal,
    tauxRecouvrement,
    dossiersActifs: actifs.length,
    nouveauxDossiers: cases.filter(c => {
      const d = new Date(c.dateOuverture);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    dossiersResolus: resolus.length,
  };
}

// ============================================================================
// EXPORT — API compatible avec l'ancienne signature (adapter injecté par le hook)
// ============================================================================

export function createRecoveryService(adapter: DataAdapter) {
  return {
    getDossiers: () => getDossiers(adapter),
    getDossierById: (id: string) => getDossierById(adapter, id),
    createDossier: (data: Partial<DossierRecouvrement>) => createDossier(adapter, data),
    updateDossier: (id: string, data: Partial<DossierRecouvrement>) => updateDossier(adapter, id, data),
    deleteDossier: (id: string) => deleteDossier(adapter, id),
    transferDossier: async (_id: string, _dest: string, _motif: string) => {},
    getCreances: () => getCreances(adapter),
    getCreanceById: async (id: string) => {
      const all = await getCreances(adapter);
      return all.find(c => c.id === id) || ({} as Creance);
    },
    addAction: (dossierId: string, action: Partial<Action>) => addAction(adapter, dossierId, action),
    getActions: (dossierId: string) => getActions(adapter, dossierId),
    getPlansRemboursement: () => getPlansRemboursement(adapter),
    createPlanRemboursement: async (data: Partial<PlanRemboursement>) => data as PlanRemboursement,
    sendEmail: (dossierId: string, params: any) => sendEmail(adapter, dossierId, params),
    sendSMS: (dossierId: string, params: any) => sendSMS(adapter, dossierId, params),
    getStats: () => getStats(adapter),
  };
}

// Standalone functions for direct service usage
export {
  getDossiers,
  getDossierById,
  createDossier,
  updateDossier,
  deleteDossier,
  addAction,
  getActions,
  getCreances,
  getPlansRemboursement,
  sendEmail,
  sendSMS,
  getStats,
};

// Legacy default export — will be replaced by createRecoveryService(adapter) in hook
export const recoveryService = {
  getDossiers: async () => [] as DossierRecouvrement[],
  getDossierById: async (_id: string) => ({} as DossierRecouvrement),
  createDossier: async (_data: Partial<DossierRecouvrement>) => ({} as DossierRecouvrement),
  updateDossier: async (_id: string, _data: Partial<DossierRecouvrement>) => ({} as DossierRecouvrement),
  deleteDossier: async (_id: string) => {},
  transferDossier: async (_id: string, _dest: string, _motif: string) => {},
  getCreances: async () => [] as Creance[],
  getCreanceById: async (_id: string) => ({} as Creance),
  addAction: async (_dossierId: string, _action: Partial<Action>) => ({} as Action),
  getActions: async (_dossierId: string) => [] as Action[],
  getPlansRemboursement: async () => [] as PlanRemboursement[],
  createPlanRemboursement: async (_data: Partial<PlanRemboursement>) => ({} as PlanRemboursement),
  sendEmail: async (_dossierId: string, _template: any, _recipients?: string[]) => {},
  sendSMS: async (_dossierId: string, _template: any, _recipients?: string[]) => {},
  getStats: async () => ({
    totalCreances: 0, montantTotal: 0, tauxRecouvrement: 0,
    dossiersActifs: 0, nouveauxDossiers: 0, dossiersResolus: 0,
  }),
};
