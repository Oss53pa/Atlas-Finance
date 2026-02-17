/**
 * Core Module Service - Re-exports core with schemas
 */
import { z } from 'zod';
export { coreService } from '../core.service';

export const createExerciceSchema = z.object({
  code: z.string().min(1, 'Code requis'),
  libelle: z.string().min(1, 'Libellé requis'),
  date_debut: z.string().min(1, 'Date début requise'),
  date_fin: z.string().min(1, 'Date fin requise'),
  societe_id: z.string().min(1, 'Société requise'),
  statut: z.enum(['ouvert', 'en_cloture', 'cloture']).default('ouvert'),
});

export const createSocieteSchema = z.object({
  code: z.string().min(1, 'Code requis'),
  raison_sociale: z.string().min(1, 'Raison sociale requise'),
  forme_juridique: z.string().optional(),
  capital: z.number().optional(),
  devise: z.string().default('XOF'),
  pays: z.string().default('CI'),
});
