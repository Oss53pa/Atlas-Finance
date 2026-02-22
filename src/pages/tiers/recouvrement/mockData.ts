/**
 * DEPRECATED - Recouvrement data now comes from Dexie (IndexedDB).
 * This file is no longer imported. Exports are kept empty for compatibility.
 */
import { DossierRecouvrement } from './types';
import {
  DollarSign, FileText, Bell, Calendar, AlertTriangle, BarChart3
} from 'lucide-react';

export const mockCreances: Array<Record<string, unknown>> = [];

export const mockDossiers: DossierRecouvrement[] = [];

export const tabs = [
  { id: 'creances', label: 'Créances', icon: DollarSign },
  { id: 'dossiers', label: 'Dossiers en Recouvrement', icon: FileText },
  { id: 'relances', label: 'Relances', icon: Bell },
  { id: 'repaymentplan', label: 'Plans de Remboursement', icon: Calendar },
  { id: 'contentieux', label: 'Contentieux', icon: AlertTriangle },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 }
];

export const statutOptions = [
  { value: 'tous', label: 'Tous les statuts' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'RESOLU', label: 'Résolu' },
  { value: 'CONTENTIEUX', label: 'Contentieux' },
  { value: 'IRRECUPERABLE', label: 'Irrécupérable' }
];

export const niveauOptions = [
  { value: 'tous', label: 'Tous les niveaux' },
  { value: 'AUCUNE', label: 'Aucune relance' },
  { value: 'RELANCE_1', label: 'Relance 1' },
  { value: 'RELANCE_2', label: 'Relance 2' },
  { value: 'RELANCE_3', label: 'Relance 3' },
  { value: 'MISE_EN_DEMEURE', label: 'Mise en demeure' },
  { value: 'CONTENTIEUX', label: 'Contentieux' }
];

export const analyticsData = {
  statistiques: {
    montantTotalCreances: 0,
    montantRecouvre: 0,
    tauxRecouvrement: 0,
    nombreCreances: 0,
    delaiMoyenRecouvrement: 0,
    creancesEnRetard: 0
  },
  evolutionRecouvrement: [] as Array<{ mois: string; recouvre: number; creances: number }>,
  repartitionNiveaux: [] as Array<{ niveau: string; count: number; montant: number }>,
  anciennete: [] as Array<{ periode: string; nombre: number; montant: number }>
};

export const integrationData = {
  comptabilite: {
    facturesImpayees: [] as Array<{ id: string; client: string; montant: number; dateEcheance: string; jourRetard: number; origine: string }>,
    avoirsNoteCredit: [] as Array<{ id: string; client: string; montant: number; motif: string; statut: string }>,
    reglementsPartiels: [] as Array<{ factureId: string; montant: number; date: string; mode: string; reste: number }>
  },
  crm: {
    donneesClient: [] as Array<Record<string, unknown>>
  },
  commercial: {
    conditionsParticulieres: [] as Array<Record<string, unknown>>,
    litigesCommerciaux: [] as Array<Record<string, unknown>>,
    contratsSpecifiques: [] as Array<Record<string, unknown>>
  },
  achats: {
    litigesFournisseurs: [] as Array<Record<string, unknown>>,
    compensations: [] as Array<Record<string, unknown>>
  }
};

export const statutIntegrations = [] as Array<{ module: string; statut: string; dernierSync: string; nbTransactions: number }>;

export const workflowValidation = {
  matriceApprobation: [] as Array<{ montantMin: number; montantMax: number; approbateur: string; delaiMax: string }>,
  enCoursValidation: [] as Array<Record<string, unknown>>
};

export const notificationsEnCours = [] as Array<Record<string, unknown>>;
