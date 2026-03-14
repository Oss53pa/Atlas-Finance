/**
 * Service de réouverture de période comptable avec double validation (AF-025)
 *
 * Gère le workflow complet : demande, validation/rejet, réouverture en cascade
 * des périodes postérieures clôturées.
 */

import type { DataAdapter } from '@atlas/data';
import { logAudit } from '../../lib/db';

export interface DemandeReouverture {
  id: string;
  periodeId: string;
  motif: string;
  demandeurId: string;
  validateurId?: string;
  statut: 'en_attente' | 'validee' | 'rejetee';
  createdAt: string;
  updatedAt?: string;
}

/**
 * Crée une demande de réouverture pour une période clôturée.
 * Le motif doit comporter au moins 50 caractères.
 */
export async function demanderReouverture(
  adapter: DataAdapter,
  periodeId: string,
  motif: string,
  demandeurId: string
): Promise<string> {
  if (motif.length < 50) {
    throw new Error(
      'Le motif de réouverture doit comporter au moins 50 caractères'
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const key = `reouverture_${periodeId}_${Date.now()}`;

  const demande: DemandeReouverture = {
    id,
    periodeId,
    motif,
    demandeurId,
    statut: 'en_attente',
    createdAt: now,
  };

  await adapter.create('settings', {
    key,
    value: JSON.stringify(demande),
    updatedAt: now,
  });

  await logAudit(
    'DEMANDE_REOUVERTURE_PERIODE',
    'fiscal_period',
    periodeId,
    JSON.stringify({ demandeId: id, demandeurId, motif })
  );

  return id;
}

/**
 * Valide une demande de réouverture et rouvre la période (+ cascade).
 * Le validateur ne peut pas être le même que le demandeur.
 */
export async function validerReouverture(
  adapter: DataAdapter,
  demandeKey: string,
  validateurId: string
): Promise<void> {
  const setting = await adapter.getById('settings', demandeKey);
  if (!setting) {
    throw new Error('Demande de réouverture introuvable');
  }

  const demande: DemandeReouverture = JSON.parse(
    (setting as any).value
  );

  if (validateurId === demande.demandeurId) {
    throw new Error(
      'Le validateur ne peut pas être le même que le demandeur'
    );
  }

  // Retrieve the target period to get its startDate
  const targetPeriod = await adapter.getById(
    'fiscalPeriods',
    demande.periodeId
  );
  if (!targetPeriod) {
    throw new Error('Période comptable introuvable');
  }

  // Find posterior closed periods and reopen them in cascade
  const allPeriods = await adapter.getAll('fiscalPeriods');
  const posteriorClosed = (allPeriods as any[])
    .filter(
      (p) =>
        p.status === 'closed' &&
        p.id !== demande.periodeId &&
        p.startDate > (targetPeriod as any).startDate
    )
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const cascadeIds: string[] = [];

  for (const period of posteriorClosed) {
    await adapter.update('fiscalPeriods', period.id, {
      status: 'open',
      reopenedAt: new Date().toISOString(),
      reopenedBy: validateurId,
    });
    cascadeIds.push(period.id);

    await logAudit(
      'REOUVERTURE_PERIODE',
      'fiscal_period',
      period.id,
      JSON.stringify({
        cascade: true,
        originePeriodeId: demande.periodeId,
        validateurId,
      })
    );
  }

  // Reopen the target period
  await adapter.update('fiscalPeriods', demande.periodeId, {
    status: 'open',
    reopenedAt: new Date().toISOString(),
    reopenedBy: validateurId,
  });

  // Update the demand
  const now = new Date().toISOString();
  demande.statut = 'validee';
  demande.validateurId = validateurId;
  demande.updatedAt = now;

  await adapter.update('settings', demandeKey, {
    value: JSON.stringify(demande),
    updatedAt: now,
  });

  await logAudit(
    'REOUVERTURE_PERIODE',
    'fiscal_period',
    demande.periodeId,
    JSON.stringify({
      demandeId: demande.id,
      validateurId,
      cascade: cascadeIds.length > 0,
      cascadeIds,
    })
  );
}

/**
 * Rejette une demande de réouverture.
 * Le validateur ne peut pas être le même que le demandeur.
 */
export async function rejeterReouverture(
  adapter: DataAdapter,
  demandeKey: string,
  validateurId: string,
  motifRejet: string
): Promise<void> {
  const setting = await adapter.getById('settings', demandeKey);
  if (!setting) {
    throw new Error('Demande de réouverture introuvable');
  }

  const demande: DemandeReouverture = JSON.parse(
    (setting as any).value
  );

  if (validateurId === demande.demandeurId) {
    throw new Error(
      'Le validateur ne peut pas être le même que le demandeur'
    );
  }

  const now = new Date().toISOString();
  demande.statut = 'rejetee';
  demande.validateurId = validateurId;
  demande.updatedAt = now;

  await adapter.update('settings', demandeKey, {
    value: JSON.stringify(demande),
    updatedAt: now,
  });

  await logAudit(
    'REJET_REOUVERTURE_PERIODE',
    'fiscal_period',
    demande.periodeId,
    JSON.stringify({
      demandeId: demande.id,
      validateurId,
      motifRejet,
    })
  );
}

/**
 * Récupère toutes les demandes de réouverture stockées en settings.
 */
export async function getDemandesReouverture(
  adapter: DataAdapter
): Promise<DemandeReouverture[]> {
  const allSettings = await adapter.getAll('settings');

  return (allSettings as any[])
    .filter((s) => s.key && s.key.startsWith('reouverture_'))
    .map((s) => JSON.parse(s.value) as DemandeReouverture);
}
