/**
 * Alias Tiers Service — CRUD pour la gestion des alias tiers (Dexie IndexedDB).
 * Gère la création, l'incrémentation et le rattachement d'alias aux comptes comptables.
 */
import { db, logAudit } from '../../lib/db';
import type { DBAliasTiers, DBAliasPrefixConfig } from '../../lib/db';
import { ALIAS_PREFIX_MAPPINGS } from '../../data/alias-tiers-config';

class AliasTiersService {
  /**
   * Initialise la table aliasPrefixConfig depuis les données statiques.
   * Ne fait rien si la table contient déjà des données.
   */
  async seedPrefixConfig(): Promise<number> {
    const existing = await db.aliasPrefixConfig.count();
    if (existing > 0) return 0;

    let count = 0;
    for (const mapping of ALIAS_PREFIX_MAPPINGS) {
      await db.aliasPrefixConfig.add({
        id: crypto.randomUUID(),
        sousCompteCode: mapping.sousCompteCode,
        prefix: mapping.prefix,
        typeLabel: mapping.typeLabel,
      });
      count++;
    }
    return count;
  }

  /**
   * Calcule le prochain alias disponible pour un préfixe donné.
   * Ex: CLL001, CLL002, ..., CLL999
   */
  async getNextAlias(prefix: string): Promise<string> {
    const existing = await db.aliasTiers
      .where('prefix')
      .equals(prefix)
      .toArray();

    if (existing.length === 0) {
      return `${prefix}001`;
    }

    // Extraire les numéros séquentiels
    const numbers = existing
      .map(a => {
        const numPart = a.alias.slice(prefix.length);
        const n = parseInt(numPart, 10);
        return isNaN(n) ? 0 : n;
      })
      .filter(n => n > 0);

    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    const next = maxNum + 1;
    return `${prefix}${next.toString().padStart(3, '0')}`;
  }

  /**
   * Crée un nouvel alias tiers.
   */
  async createAlias(params: {
    alias: string;
    prefix: string;
    label: string;
    comptesComptables: string[];
  }): Promise<DBAliasTiers> {
    const id = crypto.randomUUID();
    const record: DBAliasTiers = {
      id,
      alias: params.alias,
      prefix: params.prefix,
      label: params.label,
      comptesComptables: params.comptesComptables,
      createdAt: new Date().toISOString(),
    };

    await db.aliasTiers.add(record);

    await logAudit(
      'ALIAS_CREATE',
      'aliasTiers',
      id,
      `Création alias ${params.alias} — ${params.label} (comptes: ${params.comptesComptables.join(', ')})`
    );

    return record;
  }

  /**
   * Rattache un code comptable à un alias existant.
   */
  async attachAccountToAlias(aliasId: string, accountCode: string): Promise<DBAliasTiers> {
    const alias = await db.aliasTiers.get(aliasId);
    if (!alias) throw new Error(`Alias ${aliasId} introuvable`);

    if (alias.comptesComptables.includes(accountCode)) {
      return alias; // Déjà rattaché
    }

    const updatedComptes = [...alias.comptesComptables, accountCode];
    await db.aliasTiers.update(aliasId, { comptesComptables: updatedComptes });

    await logAudit(
      'ALIAS_ATTACH',
      'aliasTiers',
      aliasId,
      `Rattachement compte ${accountCode} à l'alias ${alias.alias}`
    );

    return { ...alias, comptesComptables: updatedComptes };
  }

  /**
   * Liste les alias par préfixe (pour le dropdown "rattacher existant").
   */
  async getAliasesByPrefix(prefix: string): Promise<DBAliasTiers[]> {
    return db.aliasTiers
      .where('prefix')
      .equals(prefix)
      .toArray();
  }

  /**
   * Recherche d'alias par nom ou code alias.
   */
  async searchAliases(query: string): Promise<DBAliasTiers[]> {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const all = await db.aliasTiers.toArray();
    return all.filter(a =>
      a.alias.toLowerCase().includes(q) ||
      a.label.toLowerCase().includes(q)
    );
  }

  /**
   * Récupère tous les alias.
   */
  async getAllAliases(): Promise<DBAliasTiers[]> {
    return db.aliasTiers.toArray();
  }
}

export const aliasTiersService = new AliasTiersService();
