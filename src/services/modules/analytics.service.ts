/**
 * Analytics Module Service - Re-exports analytics with schemas
 */
import { z } from 'zod';
export { analyticsService } from '../analytics.service';

export const createAxeSchema = z.object({
  code: z.string().min(1, 'Code requis'),
  libelle: z.string().min(1, 'Libellé requis'),
  type_axe: z.enum(['ACTIVITE', 'CENTRE_COUT', 'CENTRE_PROFIT', 'PROJET', 'PRODUIT', 'CLIENT', 'GEOGRAPHIE', 'RESPONSABLE', 'AUTRE']),
  description: z.string().optional(),
  obligatoire: z.boolean().default(false),
  hierarchique: z.boolean().default(false),
});

export const createCentreSchema = z.object({
  code: z.string().min(1, 'Code requis'),
  libelle: z.string().min(1, 'Libellé requis'),
  axe: z.string().min(1, 'Axe requis'),
  parent: z.string().optional(),
  budget_annuel: z.number().optional(),
});
