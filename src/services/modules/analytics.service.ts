/**
 * Analytics Module Service - Re-exports analytics with schemas
 */
import { z } from 'zod';
export { analyticsService } from '../analytics.service';

export const createAxeSchema = z.object({
  code: z.string().min(1, 'Code requis'),
  libelle: z.string().min(1, 'Libellé requis'),
  type: z.enum(['centre_cout', 'centre_profit', 'projet', 'produit', 'region', 'activite'], {
    errorMap: () => ({ message: "Type d'axe invalide" }),
  }),
  description: z.string().optional(),
  actif: z.boolean().default(true),
  hierarchique: z.boolean().default(false),
});

export const createCentreSchema = z.object({
  code: z.string().min(1, 'Code requis'),
  libelle: z.string().min(1, 'Libellé requis'),
  axe: z.string().min(1, 'Axe requis'),
  parent: z.string().optional(),
  budget_annuel: z.number().optional(),
});
