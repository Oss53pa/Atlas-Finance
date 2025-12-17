/**
 * Accounting Module Service - Re-exports accounting with schemas
 */
import { z } from 'zod';
export { accountingService } from '../accounting.service';

export const createJournalSchema = z.object({
  code: z.string().min(1, 'Code requis'),
  libelle: z.string().min(1, 'Libellé requis'),
  type: z.enum(['achat', 'vente', 'banque', 'caisse', 'operations_diverses', 'a_nouveau']),
  compte_contrepartie: z.string().optional(),
  actif: z.boolean().default(true),
});

export const createEcritureSchema = z.object({
  journal_id: z.string().min(1, 'Journal requis'),
  date_ecriture: z.string().min(1, 'Date requise'),
  libelle: z.string().min(1, 'Libellé requis'),
  lignes: z.array(z.object({
    compte_id: z.string().min(1, 'Compte requis'),
    debit: z.number().default(0),
    credit: z.number().default(0),
    libelle: z.string().optional(),
  })).min(2, 'Au moins 2 lignes requises'),
  piece_reference: z.string().optional(),
});
