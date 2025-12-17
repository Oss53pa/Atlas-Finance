/**
 * Tiers Module Service - Re-exports third party with schemas
 */
import { z } from 'zod';
export { thirdPartyService as tiersService } from '../third-party.service';

export const createPartenaireSchema = z.object({
  code: z.string().min(1, 'Code requis'),
  nom: z.string().min(1, 'Nom requis'),
  type: z.enum(['client', 'fournisseur', 'mixte']),
  email: z.string().email('Email invalide').optional(),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().default('CI'),
  compte_comptable: z.string().optional(),
  conditions_paiement: z.number().default(30),
});

export const createTransfertContentieuxSchema = z.object({
  tiers_id: z.string().min(1, 'Tiers requis'),
  factures: z.array(z.string()).min(1, 'Au moins une facture'),
  motif: z.string().min(1, 'Motif requis'),
  date_transfert: z.string().optional(),
  responsable_contentieux: z.string().optional(),
});
