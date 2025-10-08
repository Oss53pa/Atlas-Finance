/**
 * SERVICE CORE - Exercices & Configuration de base
 * Endpoints: /api/v1/exercices, /api/v1/societes
 */

import { z } from 'zod';
import { apiClient } from '../../lib/api-client';

// ==================== TYPES & INTERFACES ====================

export interface Exercice {
  id: string;
  code: string;
  libelle: string;
  date_debut: string;
  date_fin: string;
  type: 'normal' | 'court' | 'long' | 'exceptionnel';
  plan_comptable: 'syscohada' | 'pcg' | 'ifrs';
  devise: string;
  statut: 'ouvert' | 'cloture' | 'archive';
  cloture_anticipee: boolean;
  created_at: string;
}

// ==================== VALIDATION SCHEMAS ====================

export const createExerciceSchema = z.object({
  code: z.string()
    .min(4, 'Le code doit contenir au moins 4 caractères (ex: 2024)')
    .max(20, 'Le code ne peut pas dépasser 20 caractères'),

  libelle: z.string()
    .min(3, 'Le libellé doit contenir au moins 3 caractères')
    .max(100, 'Le libellé ne peut pas dépasser 100 caractères'),

  date_debut: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),

  date_fin: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),

  type: z.enum(['normal', 'court', 'long', 'exceptionnel'], {
    errorMap: () => ({ message: 'Type d\'exercice invalide' })
  }),

  plan_comptable: z.enum(['syscohada', 'pcg', 'ifrs'], {
    errorMap: () => ({ message: 'Plan comptable invalide' })
  }).default('syscohada'),

  devise: z.string()
    .length(3, 'Le code devise doit contenir 3 caractères (ex: XAF)')
    .default('XAF'),

  cloture_anticipee: z.boolean().default(false),
  reouverture_auto: z.boolean().default(false),
})
.refine((data) => {
  const debut = new Date(data.date_debut);
  const fin = new Date(data.date_fin);
  return fin > debut;
}, {
  message: 'La date de fin doit être postérieure à la date de début',
  path: ['date_fin'],
});

export type CreateExerciceInput = z.infer<typeof createExerciceSchema>;

// ==================== SERVICE CLASS ====================

class CoreService {
  private readonly BASE_URL = '/api/v1';

  // ==================== EXERCICES ====================

  async getExercices(params?: {
    search?: string;
    statut?: string;
    plan_comptable?: string;
  }): Promise<Exercice[]> {
    try {
      const response = await apiClient.get<{ results: Exercice[] }>(
        `${this.BASE_URL}/exercices/`,
        params
      );
      return response.results;
    } catch (error) {
      console.error('Erreur lors de la récupération des exercices:', error);
      throw error;
    }
  }

  async getExercice(id: string): Promise<Exercice> {
    try {
      const response = await apiClient.get<Exercice>(
        `${this.BASE_URL}/exercices/${id}/`
      );
      return response;
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'exercice ${id}:`, error);
      throw error;
    }
  }

  async createExercice(data: CreateExerciceInput): Promise<Exercice> {
    try {
      const validatedData = createExerciceSchema.parse(data);
      const response = await apiClient.post<Exercice>(
        `${this.BASE_URL}/exercices/`,
        validatedData
      );
      return response;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message);
      }
      throw error;
    }
  }

  async updateExercice(id: string, data: Partial<CreateExerciceInput>): Promise<Exercice> {
    try {
      const response = await apiClient.patch<Exercice>(
        `${this.BASE_URL}/exercices/${id}/`,
        data
      );
      return response;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'exercice ${id}:`, error);
      throw error;
    }
  }

  async deleteExercice(id: string): Promise<void> {
    try {
      await apiClient.delete(`${this.BASE_URL}/exercices/${id}/`);
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'exercice ${id}:`, error);
      throw error;
    }
  }

  async clotureExercice(id: string): Promise<Exercice> {
    try {
      const response = await apiClient.post<Exercice>(
        `${this.BASE_URL}/exercices/${id}/cloture/`
      );
      return response;
    } catch (error) {
      console.error(`Erreur lors de la clôture de l'exercice ${id}:`, error);
      throw error;
    }
  }

  async getCurrentExercice(): Promise<Exercice | null> {
    try {
      const exercices = await this.getExercices({ statut: 'ouvert' });
      return exercices.length > 0 ? exercices[0] : null;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'exercice courant:', error);
      return null;
    }
  }
}

export const coreService = new CoreService();
export { CoreService };