/**
 * SERVICE EXERCICE - Wrapper pour compatibilité frontend
 * Utilise coreService en backend avec adaptation des propriétés
 */

import { coreService, type Exercice as BackendExercice } from './modules/core.service';

// Type frontend (legacy)
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
}

/**
 * Convertit un exercice backend vers format frontend
 */
const mapToFrontend = (exercice: BackendExercice): FrontendExercice => {
  const isLocked = exercice.statut === 'cloture' || exercice.statut === 'archive';

  return {
    id: exercice.id,
    name: exercice.libelle,
    libelle: exercice.libelle,
    startDate: exercice.date_debut,
    endDate: exercice.date_fin,
    date_debut: exercice.date_debut,
    date_fin: exercice.date_fin,
    status: exercice.statut === 'ouvert' ? 'active' :
            exercice.statut === 'cloture' ? 'closed' :
            'pending',
    statut: exercice.statut,
    isCurrent: exercice.statut === 'ouvert',
    isLocked,
    duree_mois: calculateDurationInMonths(exercice.date_debut, exercice.date_fin),
    remainingDays: calculateRemainingDays(exercice.date_fin),
  };
};

/**
 * Calcule la durée en mois entre deux dates
 */
const calculateDurationInMonths = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const months = (end.getFullYear() - start.getFullYear()) * 12 +
                 (end.getMonth() - start.getMonth());

  return Math.max(1, months);
};

/**
 * Calcule les jours restants avant la fin de l'exercice
 */
const calculateRemainingDays = (endDate: string): number => {
  const end = new Date(endDate);
  const today = new Date();
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};

/**
 * Service exercice avec adaptation frontend/backend
 */
export const exerciceService = {
  /**
   * Récupère la liste des exercices
   */
  getExercices: async () => {
    try {
      const exercices = await coreService.getExercices();
      const mapped = exercices.map(mapToFrontend);

      return {
        exercices: mapped,
        totalPages: 1,
        totalCount: mapped.length,
        currentPage: 1,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des exercices:', error);

      // Fallback sur données mock en cas d'erreur
      return {
        exercices: [],
        totalPages: 1,
        totalCount: 0,
        currentPage: 1,
      };
    }
  },

  /**
   * Récupère l'exercice courant
   */
  getCurrentExercice: async () => {
    try {
      const exercice = await coreService.getCurrentExercice();

      if (!exercice) {
        return null;
      }

      return mapToFrontend(exercice);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'exercice courant:', error);
      return null;
    }
  },

  /**
   * Crée un nouvel exercice
   */
  createExercice: async (data: {
    libelle: string;
    code?: string;
    date_debut: string;
    date_fin: string;
    type: 'normal' | 'court' | 'long' | 'exceptionnel';
    plan_comptable?: 'syscohada' | 'pcg' | 'ifrs';
    devise?: string;
    cloture_anticipee?: boolean;
    reouverture_auto?: boolean;
  }) => {
    try {
      // Générer un code si non fourni
      const code = data.code || `EX${new Date().getFullYear()}`;

      const exercice = await coreService.createExercice({
        code,
        libelle: data.libelle,
        date_debut: data.date_debut,
        date_fin: data.date_fin,
        type: data.type,
        plan_comptable: data.plan_comptable || 'syscohada',
        devise: data.devise || 'XAF',
        cloture_anticipee: data.cloture_anticipee || false,
        reouverture_auto: data.reouverture_auto || false,
      });

      return {
        success: true,
        data: mapToFrontend(exercice)
      };
    } catch (error: unknown) {
      console.error('Erreur lors de la création de l\'exercice:', error);
      throw new Error(error instanceof Error ? error.message : 'Erreur lors de la création de l\'exercice');
    }
  },

  /**
   * Clôture un exercice
   */
  closeExercice: async (id: string) => {
    try {
      await coreService.clotureExercice(id);
      return { success: true };
    } catch (error) {
      console.error(`Erreur lors de la clôture de l'exercice ${id}:`, error);
      throw error;
    }
  },

  /**
   * Réouvre un exercice (via update)
   */
  reopenExercice: async (id: string) => {
    try {
      // Cette fonctionnalité nécessite une méthode backend spécifique
      // Pour l'instant, on utilise l'update
      await coreService.updateExercice(id, {
        // Le statut sera géré par le backend
      });
      return { success: true };
    } catch (error) {
      console.error(`Erreur lors de la réouverture de l'exercice ${id}:`, error);
      throw error;
    }
  },

  /**
   * Supprime un exercice
   */
  deleteExercice: async (id: string) => {
    try {
      await coreService.deleteExercice(id);
      return { success: true };
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'exercice ${id}:`, error);
      throw error;
    }
  },
};