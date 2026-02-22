/**
 * SERVICE EXERCICE - Mode local (Dexie/IndexedDB)
 * Fournit les données d'exercices comptables localement
 */

import { db } from '../lib/db';

interface FrontendExercice {
  id: string;
  name: string;
  libelle: string;
  startDate: string;
  endDate: string;
  date_debut: string;
  date_fin: string;
  status: string;
  statut: string;
  isCurrent: boolean;
  isLocked: boolean;
  duree_mois?: number;
  remainingDays?: number;
  stats?: {
    total_ecritures: number;
    montant_total: number;
    resultat_net: number;
  };
  plan_comptable?: string;
  devise?: string;
}

const calculateDurationInMonths = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = (end.getFullYear() - start.getFullYear()) * 12 +
                 (end.getMonth() - start.getMonth());
  return Math.max(1, months);
};

const calculateRemainingDays = (endDate: string): number => {
  const end = new Date(endDate);
  const today = new Date();
  const diffTime = end.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

export const exerciceService = {
  getExercices: async (): Promise<FrontendExercice[]> => {
    try {
      const fiscalYears = await db.fiscalYears.toArray();
      return fiscalYears.map(fy => ({
        id: fy.id,
        name: fy.name,
        libelle: fy.name,
        startDate: fy.startDate,
        endDate: fy.endDate,
        date_debut: fy.startDate,
        date_fin: fy.endDate,
        status: fy.isClosed ? 'closed' : 'active',
        statut: fy.isClosed ? 'cloture' : 'ouvert',
        isCurrent: !fy.isClosed,
        isLocked: fy.isClosed,
        duree_mois: calculateDurationInMonths(fy.startDate, fy.endDate),
        remainingDays: calculateRemainingDays(fy.endDate),
        plan_comptable: 'syscohada',
        devise: 'XAF',
        stats: { total_ecritures: 0, montant_total: 0, resultat_net: 0 },
      }));
    } catch {
      return [];
    }
  },

  getCurrentExercice: async (): Promise<FrontendExercice | null> => {
    try {
      const fiscalYears = await db.fiscalYears.toArray();
      const current = fiscalYears.find(fy => !fy.isClosed);
      if (!current) return null;
      return {
        id: current.id,
        name: current.name,
        libelle: current.name,
        startDate: current.startDate,
        endDate: current.endDate,
        date_debut: current.startDate,
        date_fin: current.endDate,
        status: 'active',
        statut: 'ouvert',
        isCurrent: true,
        isLocked: false,
        duree_mois: calculateDurationInMonths(current.startDate, current.endDate),
        remainingDays: calculateRemainingDays(current.endDate),
        plan_comptable: 'syscohada',
        devise: 'XAF',
        stats: { total_ecritures: 0, montant_total: 0, resultat_net: 0 },
      };
    } catch {
      return null;
    }
  },

  createExercice: async (data: {
    libelle: string;
    date_debut: string;
    date_fin: string;
    type: string;
    plan_comptable?: string;
    devise?: string;
  }) => {
    const id = crypto.randomUUID();
    await db.fiscalYears.add({
      id,
      code: `EX${new Date(data.date_debut).getFullYear()}`,
      name: data.libelle,
      startDate: data.date_debut,
      endDate: data.date_fin,
      isClosed: false,
      createdAt: new Date().toISOString(),
    });
    return { success: true, data: { id, libelle: data.libelle } };
  },

  closeExercice: async (id: string) => {
    await db.fiscalYears.update(id, { isClosed: true });
    return { success: true };
  },

  reopenExercice: async (id: string) => {
    await db.fiscalYears.update(id, { isClosed: false });
    return { success: true };
  },

  deleteExercice: async (id: string) => {
    await db.fiscalYears.delete(id);
    return { success: true };
  },
};
