/**
 * Closures Module Service - Re-exports closures with schemas
 */
import { z } from 'zod';
export { clotureComptableService as closuresService } from '../cloture-comptable.service';

export const executeControleSchema = z.object({
  type_controle: z.string().min(1, 'Type de contrôle requis'),
  exercice_id: z.string().min(1, 'Exercice requis'),
  seuil_tolerance: z.number().default(0.01),
});

export const createProvisionSchema = z.object({
  type: z.enum(['client_douteux', 'risque', 'charge']),
  tiers_id: z.string().optional(),
  montant: z.number().positive('Montant doit être positif'),
  motif: z.string().min(1, 'Motif requis'),
  date_provision: z.string().optional(),
});

export const uploadDocumentSchema = z.object({
  type_document: z.enum(['bilan', 'compte_resultat', 'annexe', 'autre']),
  fichier: z.any(),
  exercice_id: z.string().min(1, 'Exercice requis'),
  description: z.string().optional(),
});

export const createValidationSchema = z.object({
  exercice_id: z.string().min(1, 'Exercice requis'),
  etape: z.string().min(1, 'Étape requise'),
  commentaire: z.string().optional(),
  valideur_id: z.string().optional(),
});
