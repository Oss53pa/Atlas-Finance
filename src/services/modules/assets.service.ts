/**
 * Assets Module Service - Re-exports assets with schemas
 */
import { z } from 'zod';
export { assetsService } from '../assets.service';

export const createImmobilisationSchema = z.object({
  code: z.string().min(1, 'Code requis'),
  designation: z.string().min(1, 'Désignation requise'),
  date_acquisition: z.string().min(1, 'Date acquisition requise'),
  // Le formulaire envoie montant_acquisition — on accepte les deux noms
  montant_acquisition: z.number().positive('Valeur doit être positive').optional(),
  valeur_acquisition: z.number().positive('Valeur doit être positive').optional(),
  duree_amortissement: z.number().int().positive('Durée doit être positive'),
  methode_amortissement: z.enum(['lineaire', 'degressive', 'unites_oeuvre', 'exceptionnelle']).default('lineaire'),
  type_amortissement: z.enum(['lineaire', 'degressif']).optional(),
  categorie: z.string().optional(),
  localisation: z.string().optional(),
  fournisseur: z.string().optional(),
  statut: z.string().optional(),
  numero_serie: z.string().optional(),
  description: z.string().optional(),
}).refine(
  (d) => (d.montant_acquisition ?? 0) > 0 || (d.valeur_acquisition ?? 0) > 0,
  { message: 'Valeur d\'acquisition requise', path: ['montant_acquisition'] }
);

export const createAmortissementSchema = z.object({
  immobilisation_id: z.string().min(1, 'Immobilisation requise'),
  exercice: z.string().min(1, 'Exercice requis'),
  montant: z.number().positive('Montant doit être positif'),
  date_comptabilisation: z.string().optional(),
});
