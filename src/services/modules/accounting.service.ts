/**
 * SERVICE ACCOUNTING - Gestion Comptabilité
 * Endpoints: /api/v1/journaux, /api/v1/ecritures
 */

import { z } from 'zod';
import { apiClient } from '../../lib/api-client';

// ==================== TYPES & INTERFACES ====================

export interface Journal {
  id: string;
  code: string;
  libelle: string;
  type: 'general' | 'achats' | 'ventes' | 'banque' | 'caisse' | 'operations_diverses' | 'a_nouveaux';
  description?: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  journal_code: string;
  numero: string;
  date: string;
  libelle: string;
  montant_debit: number;
  montant_credit: string;
  statut: 'brouillon' | 'valide' | 'cloture';
  piece_jointe?: string;
  created_at: string;
}

export interface JournalDetails extends Journal {
  total_ecritures: number;
  total_debit: number;
  total_credit: number;
  derniere_ecriture?: string;
  is_equilibre: boolean;
}

// ==================== VALIDATION SCHEMAS ====================

/**
 * Schéma de validation pour création de journal
 */
export const createJournalSchema = z.object({
  code: z.string()
    .min(2, 'Le code doit contenir au moins 2 caractères')
    .max(10, 'Le code ne peut pas dépasser 10 caractères')
    .regex(/^[A-Z0-9]+$/, 'Le code ne peut contenir que des lettres majuscules et chiffres'),

  libelle: z.string()
    .min(3, 'Le libellé doit contenir au moins 3 caractères')
    .max(100, 'Le libellé ne peut pas dépasser 100 caractères'),

  type: z.enum(['general', 'achats', 'ventes', 'banque', 'caisse', 'operations_diverses', 'a_nouveaux'], {
    errorMap: () => ({ message: 'Type de journal invalide' })
  }),

  description: z.string().optional(),
  actif: z.boolean().default(true),
});

export type CreateJournalInput = z.infer<typeof createJournalSchema>;

/**
 * Schéma de validation pour mise à jour de journal
 */
export const updateJournalSchema = createJournalSchema.partial();

export type UpdateJournalInput = z.infer<typeof updateJournalSchema>;

// ==================== SERVICE CLASS ====================

class AccountingService {
  private readonly BASE_URL = '/api/v1';

  // ==================== JOURNALS ====================

  /**
   * Récupérer tous les journaux
   */
  async getJournals(params?: {
    search?: string;
    type?: string;
    actif?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<Journal[]> {
    try {
      const response = await apiClient.get<{ results: Journal[] }>(
        `${this.BASE_URL}/journaux/`,
        params
      );
      return response.results;
    } catch (error) {
      console.error('Erreur lors de la récupération des journaux:', error);
      throw error;
    }
  }

  /**
   * Récupérer un journal par ID avec détails
   */
  async getJournalDetails(id: string): Promise<JournalDetails> {
    try {
      const response = await apiClient.get<JournalDetails>(
        `${this.BASE_URL}/journaux/${id}/`
      );
      return response;
    } catch (error) {
      console.error(`Erreur lors de la récupération du journal ${id}:`, error);
      throw error;
    }
  }

  /**
   * Créer un nouveau journal avec validation
   */
  async createJournal(data: CreateJournalInput): Promise<Journal> {
    try {
      // Validation côté client
      const validatedData = createJournalSchema.parse(data);

      const response = await apiClient.post<Journal>(
        `${this.BASE_URL}/journaux/`,
        validatedData
      );

      return response;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        throw new Error(firstError.message);
      }
      console.error('Erreur lors de la création du journal:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un journal
   */
  async updateJournal(id: string, data: UpdateJournalInput): Promise<Journal> {
    try {
      const validatedData = updateJournalSchema.parse(data);

      const response = await apiClient.patch<Journal>(
        `${this.BASE_URL}/journaux/${id}/`,
        validatedData
      );

      return response;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        throw new Error(firstError.message);
      }
      console.error(`Erreur lors de la mise à jour du journal ${id}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer un journal
   */
  async deleteJournal(id: string): Promise<void> {
    try {
      await apiClient.delete(`${this.BASE_URL}/journaux/${id}/`);
    } catch (error) {
      console.error(`Erreur lors de la suppression du journal ${id}:`, error);
      throw error;
    }
  }

  // ==================== JOURNAL ENTRIES ====================

  /**
   * Récupérer les écritures d'un journal
   */
  async getJournalEntries(journalCode: string, params?: {
    date_debut?: string;
    date_fin?: string;
    statut?: string;
    page?: number;
    page_size?: number;
  }): Promise<JournalEntry[]> {
    try {
      const response = await apiClient.get<{ results: JournalEntry[] }>(
        `${this.BASE_URL}/ecritures/`,
        {
          journal_code: journalCode,
          ...params,
        }
      );
      return response.results;
    } catch (error) {
      console.error(`Erreur lors de la récupération des écritures du journal ${journalCode}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer statistiques d'un journal
   */
  async getJournalStatistics(journalCode: string): Promise<{
    total_ecritures: number;
    total_debit: number;
    total_credit: number;
    ecritures_brouillon: number;
    ecritures_validees: number;
  }> {
    try {
      const response = await apiClient.get(
        `${this.BASE_URL}/journaux/${journalCode}/statistics/`
      );
      return response;
    } catch (error) {
      console.error(`Erreur lors de la récupération des statistiques du journal ${journalCode}:`, error);
      throw error;
    }
  }
}

// Export instance singleton
export const accountingService = new AccountingService();

// Export classe pour tests
export { AccountingService };