/**
 * SERVICE ANALYTICS - Axes analytiques & Centres de coûts
 * Endpoints: /api/v1/axes-analytiques, /api/v1/centres-analytiques
 */

import { z } from 'zod';
import { apiClient } from '../../lib/api-client';

// ==================== TYPES & INTERFACES ====================

export interface AxeAnalytique {
  id: string;
  code: string;
  libelle: string;
  type: 'centre_cout' | 'centre_profit' | 'projet' | 'produit' | 'region' | 'activite';
  description?: string;
  hierarchique: boolean;
  obligatoire_classes?: string[];
  actif: boolean;
  created_at: string;
}

export interface CentreAnalytique {
  id: string;
  code: string;
  libelle: string;
  axe_id: string;
  type: 'operationnel' | 'support' | 'structure' | 'projet';
  responsable?: string;
  budget_annuel?: number;
  suivi_budget: boolean;
  parent_id?: string;
  actif: boolean;
  created_at: string;
}

// ==================== VALIDATION SCHEMAS ====================

export const createAxeSchema = z.object({
  code: z.string()
    .min(2, 'Le code doit contenir au moins 2 caractères')
    .max(10, 'Le code ne peut pas dépasser 10 caractères'),

  libelle: z.string()
    .min(3, 'Le libellé doit contenir au moins 3 caractères')
    .max(100, 'Le libellé ne peut pas dépasser 100 caractères'),

  type: z.enum(['centre_cout', 'centre_profit', 'projet', 'produit', 'region', 'activite']),

  description: z.string().optional(),
  hierarchique: z.boolean().default(false),
  obligatoire_classes: z.array(z.string()).optional(),
  actif: z.boolean().default(true),
});

export type CreateAxeInput = z.infer<typeof createAxeSchema>;

export const createCentreSchema = z.object({
  code: z.string()
    .min(2, 'Le code doit contenir au moins 2 caractères')
    .max(20, 'Le code ne peut pas dépasser 20 caractères'),

  libelle: z.string()
    .min(3, 'Le libellé doit contenir au moins 3 caractères')
    .max(100, 'Le libellé ne peut pas dépasser 100 caractères'),

  axe_id: z.string().uuid('ID d\'axe invalide'),

  type: z.enum(['operationnel', 'support', 'structure', 'projet']),

  responsable: z.string().optional(),
  budget_annuel: z.number().min(0, 'Le budget doit être positif').optional(),
  suivi_budget: z.boolean().default(false),
  parent_id: z.string().uuid().optional().nullable(),
  actif: z.boolean().default(true),
});

export type CreateCentreInput = z.infer<typeof createCentreSchema>;

// ==================== SERVICE CLASS ====================

class AnalyticsService {
  private readonly BASE_URL = '/api/v1';

  // ==================== AXES ANALYTIQUES ====================

  async getAxes(params?: {
    search?: string;
    type?: string;
    actif?: boolean;
  }): Promise<AxeAnalytique[]> {
    try {
      const response = await apiClient.get<{ results: AxeAnalytique[] }>(
        `${this.BASE_URL}/axes-analytiques/`,
        params
      );
      return response.results;
    } catch (error) {
      console.error('Erreur lors de la récupération des axes analytiques:', error);
      throw error;
    }
  }

  async createAxe(data: CreateAxeInput): Promise<AxeAnalytique> {
    try {
      const validatedData = createAxeSchema.parse(data);
      const response = await apiClient.post<AxeAnalytique>(
        `${this.BASE_URL}/axes-analytiques/`,
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

  async updateAxe(id: string, data: Partial<CreateAxeInput>): Promise<AxeAnalytique> {
    try {
      const response = await apiClient.patch<AxeAnalytique>(
        `${this.BASE_URL}/axes-analytiques/${id}/`,
        data
      );
      return response;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'axe ${id}:`, error);
      throw error;
    }
  }

  async deleteAxe(id: string): Promise<void> {
    try {
      await apiClient.delete(`${this.BASE_URL}/axes-analytiques/${id}/`);
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'axe ${id}:`, error);
      throw error;
    }
  }

  // ==================== CENTRES ANALYTIQUES ====================

  async getCentres(params?: {
    search?: string;
    axe_id?: string;
    type?: string;
    actif?: boolean;
  }): Promise<CentreAnalytique[]> {
    try {
      const response = await apiClient.get<{ results: CentreAnalytique[] }>(
        `${this.BASE_URL}/centres-analytiques/`,
        params
      );
      return response.results;
    } catch (error) {
      console.error('Erreur lors de la récupération des centres analytiques:', error);
      throw error;
    }
  }

  async createCentre(data: CreateCentreInput): Promise<CentreAnalytique> {
    try {
      const validatedData = createCentreSchema.parse(data);
      const response = await apiClient.post<CentreAnalytique>(
        `${this.BASE_URL}/centres-analytiques/`,
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

  async updateCentre(id: string, data: Partial<CreateCentreInput>): Promise<CentreAnalytique> {
    try {
      const response = await apiClient.patch<CentreAnalytique>(
        `${this.BASE_URL}/centres-analytiques/${id}/`,
        data
      );
      return response;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du centre ${id}:`, error);
      throw error;
    }
  }

  async deleteCentre(id: string): Promise<void> {
    try {
      await apiClient.delete(`${this.BASE_URL}/centres-analytiques/${id}/`);
    } catch (error) {
      console.error(`Erreur lors de la suppression du centre ${id}:`, error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();
export { AnalyticsService };