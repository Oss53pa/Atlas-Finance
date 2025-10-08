/**
 * SERVICE REPORTING - Rapports personnalisés & Planification
 * Endpoints: /api/v1/rapports, /api/v1/reporting
 */

import { z } from 'zod';
import { apiClient } from '../../lib/api-client';

// ==================== TYPES & INTERFACES ====================

export interface Rapport {
  id: string;
  nom: string;
  type: 'balance' | 'grand_livre' | 'journal' | 'bilan' | 'resultat' | 'tresorerie' | 'personnalise';
  description?: string;
  parametres: Record<string, any>;
  created_at: string;
}

export interface Planification {
  id: string;
  rapport_id: string;
  frequence: 'quotidienne' | 'hebdomadaire' | 'mensuelle' | 'trimestrielle' | 'annuelle';
  heure_execution: string;
  fuseau_horaire: string;
  destinataires: string[];
  format: 'pdf' | 'excel' | 'csv';
  actif: boolean;
  created_at: string;
}

// ==================== VALIDATION SCHEMAS ====================

export const createPlanificationSchema = z.object({
  rapport_id: z.string().uuid('ID de rapport invalide'),

  frequence: z.enum(['quotidienne', 'hebdomadaire', 'mensuelle', 'trimestrielle', 'annuelle'], {
    errorMap: () => ({ message: 'Fréquence invalide' })
  }),

  heure_execution: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format d\'heure invalide (HH:MM)'),

  fuseau_horaire: z.string()
    .min(3, 'Le fuseau horaire est obligatoire')
    .default('Africa/Douala'),

  destinataires: z.array(z.string().email('Email invalide'))
    .min(1, 'Au moins un destinataire est requis')
    .max(10, 'Maximum 10 destinataires'),

  format: z.enum(['pdf', 'excel', 'csv'], {
    errorMap: () => ({ message: 'Format invalide' })
  }).default('pdf'),

  pieces_jointes: z.boolean().default(true),
  notification_echec: z.boolean().default(true),
  actif: z.boolean().default(true),
});

export type CreatePlanificationInput = z.infer<typeof createPlanificationSchema>;

export const generateRapportSchema = z.object({
  type: z.enum(['balance', 'grand_livre', 'journal', 'bilan', 'resultat', 'tresorerie', 'personnalise']),

  periode_debut: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),

  periode_fin: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),

  format: z.enum(['pdf', 'excel', 'csv']).default('pdf'),

  options: z.object({
    inclure_details: z.boolean().default(false),
    comparatif_n1: z.boolean().default(false),
    grouper_par: z.string().optional(),
    filtres: z.record(z.any()).optional(),
  }).optional(),
})
.refine((data) => {
  const debut = new Date(data.periode_debut);
  const fin = new Date(data.periode_fin);
  return fin >= debut;
}, {
  message: 'La période de fin doit être postérieure ou égale à la période de début',
  path: ['periode_fin'],
});

export type GenerateRapportInput = z.infer<typeof generateRapportSchema>;

// ==================== SERVICE CLASS ====================

class ReportingService {
  private readonly BASE_URL = '/api/v1';

  // ==================== RAPPORTS ====================

  async getRapports(params?: {
    search?: string;
    type?: string;
  }): Promise<Rapport[]> {
    try {
      const response = await apiClient.get<{ results: Rapport[] }>(
        `${this.BASE_URL}/rapports/`,
        params
      );
      return response.results;
    } catch (error) {
      console.error('Erreur lors de la récupération des rapports:', error);
      throw error;
    }
  }

  async generateRapport(data: GenerateRapportInput): Promise<{ file_url: string; file_name: string }> {
    try {
      const validatedData = generateRapportSchema.parse(data);
      const response = await apiClient.post(
        `${this.BASE_URL}/rapports/generate/`,
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

  async downloadRapport(rapportId: string, format: 'pdf' | 'excel' | 'csv' = 'pdf'): Promise<void> {
    try {
      await apiClient.downloadFile(
        `${this.BASE_URL}/rapports/${rapportId}/download/`,
        `rapport_${rapportId}.${format}`,
        { format }
      );
    } catch (error) {
      console.error(`Erreur lors du téléchargement du rapport ${rapportId}:`, error);
      throw error;
    }
  }

  // ==================== PLANIFICATIONS ====================

  async getPlanifications(rapportId?: string): Promise<Planification[]> {
    try {
      const response = await apiClient.get<{ results: Planification[] }>(
        `${this.BASE_URL}/reporting/planifications/`,
        rapportId ? { rapport_id: rapportId } : undefined
      );
      return response.results;
    } catch (error) {
      console.error('Erreur lors de la récupération des planifications:', error);
      throw error;
    }
  }

  async createPlanification(data: CreatePlanificationInput): Promise<Planification> {
    try {
      const validatedData = createPlanificationSchema.parse(data);
      const response = await apiClient.post<Planification>(
        `${this.BASE_URL}/reporting/planifications/`,
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

  async updatePlanification(id: string, data: Partial<CreatePlanificationInput>): Promise<Planification> {
    try {
      const response = await apiClient.patch<Planification>(
        `${this.BASE_URL}/reporting/planifications/${id}/`,
        data
      );
      return response;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la planification ${id}:`, error);
      throw error;
    }
  }

  async deletePlanification(id: string): Promise<void> {
    try {
      await apiClient.delete(`${this.BASE_URL}/reporting/planifications/${id}/`);
    } catch (error) {
      console.error(`Erreur lors de la suppression de la planification ${id}:`, error);
      throw error;
    }
  }

  async togglePlanification(id: string, actif: boolean): Promise<Planification> {
    try {
      const response = await apiClient.patch<Planification>(
        `${this.BASE_URL}/reporting/planifications/${id}/`,
        { actif }
      );
      return response;
    } catch (error) {
      console.error(`Erreur lors du changement d'état de la planification ${id}:`, error);
      throw error;
    }
  }
}

export const reportingService = new ReportingService();
export { ReportingService };