/**
 * Couverture du code tiers sur les comptes collectifs (40x fournisseurs / 41x clients).
 *
 * POURQUOI : le sous-registre tiers ne réconcilie pas avec le GL. Une part
 * importante des lignes 401/411 ne porte AUCUN `thirdPartyCode` — elles sont donc
 * invisibles de tout écran « par tiers » (encours client, balance âgée, relances,
 * lettrage, recouvrement). Afficher un encours partiel comme s'il était complet
 * est mensonger : ce helper quantifie la part non affectée pour l'exposer.
 *
 * Périmètre : mêmes écritures que les KPI tiers (tout sauf les brouillons),
 * à-nouveaux inclus (ils font partie de l'encours affiché).
 */
import type { DataAdapter } from '@atlas/data';

export interface FamilyCoverage {
  /** Nombre de lignes du collectif. */
  lignes: number;
  /** Lignes sans code tiers. */
  lignesSansCode: number;
  /** Solde net du collectif (débit − crédit). */
  montantTotal: number;
  /** Part du solde portée par des lignes sans code tiers. */
  montantNonAffecte: number;
  /** % de lignes sans code tiers (0-100, arrondi). */
  pctLignesSansCode: number;
}

export interface ThirdPartyCoverage {
  clients: FamilyCoverage;      // 41x
  fournisseurs: FamilyCoverage; // 40x
}

interface CoverageLine {
  accountCode?: string;
  debit?: number;
  credit?: number;
  thirdPartyCode?: string | null;
}
interface CoverageEntry {
  status?: string;
  lines?: CoverageLine[];
}

const empty = (): FamilyCoverage => ({
  lignes: 0, lignesSansCode: 0, montantTotal: 0, montantNonAffecte: 0, pctLignesSansCode: 0,
});

/**
 * @param preloaded écritures déjà chargées (évite un second getAll si l'appelant
 *                  les a déjà en main).
 */
export async function getThirdPartyCoverage(
  adapter: DataAdapter,
  preloaded?: CoverageEntry[],
): Promise<ThirdPartyCoverage> {
  const entries = preloaded ?? (await adapter.getAll<CoverageEntry>('journalEntries'));
  const clients = empty();
  const fournisseurs = empty();

  for (const e of entries) {
    if (e.status === 'draft') continue;
    for (const l of e.lines || []) {
      const code = String(l.accountCode || '');
      const fam = code.startsWith('41') ? clients : code.startsWith('40') ? fournisseurs : null;
      if (!fam) continue;
      const net = (l.debit || 0) - (l.credit || 0);
      const sansCode = !l.thirdPartyCode || String(l.thirdPartyCode).trim() === '';
      fam.lignes += 1;
      fam.montantTotal += net;
      if (sansCode) {
        fam.lignesSansCode += 1;
        fam.montantNonAffecte += net;
      }
    }
  }

  for (const fam of [clients, fournisseurs]) {
    fam.pctLignesSansCode = fam.lignes > 0
      ? Math.round((fam.lignesSansCode / fam.lignes) * 100)
      : 0;
  }

  return { clients, fournisseurs };
}
