import { DossierRecouvrement, Creance, PlanRemboursement, Action } from '../types/recovery.types';

// Mock data - à remplacer par de vrais appels API
export const recoveryService = {
  // Dossiers
  getDossiers: async (): Promise<DossierRecouvrement[]> => {
    // Simuler un appel API
    return Promise.resolve([]);
  },

  getDossierById: async (id: string): Promise<DossierRecouvrement> => {
    return Promise.resolve({} as DossierRecouvrement);
  },

  createDossier: async (data: Partial<DossierRecouvrement>): Promise<DossierRecouvrement> => {
    return Promise.resolve({} as DossierRecouvrement);
  },

  updateDossier: async (id: string, data: Partial<DossierRecouvrement>): Promise<DossierRecouvrement> => {
    return Promise.resolve({} as DossierRecouvrement);
  },

  deleteDossier: async (id: string): Promise<void> => {
    return Promise.resolve();
  },

  transferDossier: async (id: string, destinataire: string, motif: string): Promise<void> => {
    return Promise.resolve();
  },

  // Créances
  getCreances: async (): Promise<Creance[]> => {
    return Promise.resolve([]);
  },

  getCreanceById: async (id: string): Promise<Creance> => {
    return Promise.resolve({} as Creance);
  },

  // Actions
  addAction: async (dossierId: string, action: Partial<Action>): Promise<Action> => {
    return Promise.resolve({} as Action);
  },

  getActions: async (dossierId: string): Promise<Action[]> => {
    return Promise.resolve([]);
  },

  // Plans de remboursement
  getPlansRemboursement: async (): Promise<PlanRemboursement[]> => {
    return Promise.resolve([]);
  },

  createPlanRemboursement: async (data: Partial<PlanRemboursement>): Promise<PlanRemboursement> => {
    return Promise.resolve({} as PlanRemboursement);
  },

  // Communications
  sendEmail: async (dossierId: string, template: string, recipients: string[]): Promise<void> => {
    return Promise.resolve();
  },

  sendSMS: async (dossierId: string, template: string, recipients: string[]): Promise<void> => {
    return Promise.resolve();
  },

  // Statistiques
  getStats: async () => {
    return Promise.resolve({
      totalCreances: 0,
      montantTotal: 0,
      tauxRecouvrement: 0,
      dossiersActifs: 0,
      nouveauxDossiers: 0,
      dossiersResolus: 0,
    });
  },
};