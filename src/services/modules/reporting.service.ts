/**
 * Reporting Module Service - Re-exports reporting with schemas
 */
import { z } from 'zod';
export { reportsService as reportingService } from '../reports.service';

export const generateRapportSchema = z.object({
  type_rapport: z.enum(['bilan', 'compte_resultat', 'balance', 'grand_livre', 'journal', 'annexe']),
  exercice_id: z.string().min(1, 'Exercice requis'),
  format: z.enum(['pdf', 'excel', 'csv']).default('pdf'),
  date_debut: z.string().optional(),
  date_fin: z.string().optional(),
  options: z.object({
    inclure_details: z.boolean().default(true),
    inclure_comparatif: z.boolean().default(false),
  }).optional(),
});

export const createPlanificationSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  type_rapport: z.string().min(1, 'Type requis'),
  frequence: z.enum(['quotidien', 'hebdomadaire', 'mensuel', 'trimestriel', 'annuel']),
  destinataires: z.array(z.string()).min(1, 'Au moins un destinataire'),
  heure_execution: z.string().optional(),
  actif: z.boolean().default(true),
});
