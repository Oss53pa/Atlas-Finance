/**
 * Assets Module Service - Re-exports assets with schemas
 */
import { z } from 'zod';
export { assetsService } from '../assets.service';

export const createImmobilisationSchema = z.object({
  code: z.string().min(1, 'Code requis'),
  designation: z.string().min(1, 'Désignation requise'),
  date_acquisition: z.string().min(1, 'Date acquisition requise'),
  valeur_acquisition: z.number().positive('Valeur doit être positive'),
  duree_amortissement: z.number().int().positive('Durée doit être positive'),
  type_amortissement: z.enum(['lineaire', 'degressif']).default('lineaire'),
  categorie: z.string().optional(),
  localisation: z.string().optional(),
});

export const createAmortissementSchema = z.object({
  immobilisation_id: z.string().min(1, 'Immobilisation requise'),
  exercice: z.string().min(1, 'Exercice requis'),
  montant: z.number().positive('Montant doit être positif'),
  date_comptabilisation: z.string().optional(),
});
