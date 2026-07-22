/**
 * Clés de service des satellites de la Suite Atlas (L3.1).
 *
 * Réf. docs/integration-suite-atlas/DESIGN.md § L3.1
 *
 * Le secret n'existe EN CLAIR qu'une seule fois : au moment de sa génération,
 * dans le navigateur de l'administrateur. Seule son empreinte SHA-256 est
 * persistée. Personne — pas même un administrateur de la base — ne peut le
 * relire ensuite : on révoque et on en émet un nouveau.
 */

import type { DataAdapter } from '@atlas/data';
import { sha256Hex } from '../../utils/integrity';
import type { SatelliteSystem } from './types';

export interface IntegrationApiKey {
  id: string;
  tenantId?: string;
  sourceSystem: SatelliteSystem;
  label: string;
  keyHash: string;
  active: boolean;
  lastUsedAt?: string | null;
  createdAt?: string;
  revokedAt?: string | null;
}

/** Préfixe lisible : permet de reconnaître une clé Atlas dans un journal. */
const KEY_PREFIX = 'atk_';

/**
 * Génère un secret de 256 bits via l'API Web Crypto.
 *
 * ⚠️ Jamais `Math.random()` : non cryptographique, donc prédictible — une clé
 * qui ouvre l'ingestion du Grand Livre ne se tire pas au pseudo-hasard.
 */
function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${KEY_PREFIX}${b64}`;
}

export async function listApiKeys(adapter: DataAdapter): Promise<IntegrationApiKey[]> {
  const rows = await adapter.getAll<IntegrationApiKey>('integrationApiKeys');
  return (rows ?? []).sort((a, b) =>
    String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')),
  );
}

export interface CreatedKey {
  record: IntegrationApiKey;
  /** Secret en clair — à afficher UNE SEULE FOIS, jamais persisté. */
  secret: string;
}

export async function createApiKey(
  adapter: DataAdapter,
  sourceSystem: SatelliteSystem,
  label: string,
): Promise<CreatedKey> {
  const secret = generateSecret();
  const keyHash = await sha256Hex(secret);

  const record = await adapter.create<IntegrationApiKey>('integrationApiKeys', {
    sourceSystem,
    label: label || `${sourceSystem} — clé de service`,
    keyHash,
    active: true,
  } as any);

  return { record, secret };
}

/**
 * Révocation : on désactive, on ne supprime pas.
 * L'historique doit pouvoir répondre à « quelle clé a émis cet événement ? »
 * même après retrait — `integration_events` référence des faits déjà reçus.
 */
export async function revokeApiKey(adapter: DataAdapter, id: string): Promise<void> {
  await adapter.update('integrationApiKeys', id, {
    active: false,
    revokedAt: new Date().toISOString(),
  } as any);
}
