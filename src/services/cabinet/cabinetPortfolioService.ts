/**
 * Portefeuille cabinet — vue multi-dossiers (cross-tenant).
 *
 * L'agrégation cross-tenant est faite côté SERVEUR (Edge Function
 * `cabinet-portfolio`) : l'app est mono-tenant sous RLS, un client ne peut pas
 * lire plusieurs dossiers. La fonction identifie l'utilisateur par son JWT et
 * ne renvoie QUE les sociétés dont il est membre (user_companies).
 */

import type { DataAdapter } from '@atlas/data';

export interface CabinetDossier {
  id: string;
  code?: string;
  nom: string;
  pays?: string;
  role: string;
  exercice: { name: string; startDate: string; endDate: string; isClosed: boolean } | null;
  entries: number;
  lastActivity: string | null;
  produits: number;
  charges: number;
  resultat: number;
}

export interface CabinetPortfolio {
  dossiers: CabinetDossier[];
  generatedAt?: string;
}

/**
 * Charge le portefeuille via l'Edge Function (mode SaaS). En local/hors client,
 * renvoie un portefeuille vide (le cross-tenant n'a pas de sens hors serveur).
 */
export async function getCabinetPortfolio(adapter: DataAdapter): Promise<CabinetPortfolio> {
  const client = (adapter as any).client;
  if (!client?.functions?.invoke) return { dossiers: [] };
  const { data, error } = await client.functions.invoke('cabinet-portfolio', { body: {} });
  if (error) throw new Error(error.message ?? 'Portefeuille indisponible');
  return {
    dossiers: Array.isArray(data?.dossiers) ? data.dossiers : [],
    generatedAt: data?.generatedAt,
  };
}

export interface PortfolioSummary {
  nbDossiers: number;
  resultatCumule: number;
  produitsCumules: number;
  chargesCumulees: number;
  clotures: number;
  ouverts: number;
  /** Dossiers sans activité récente (aucune écriture). */
  inactifs: number;
}

/** Synthèse du portefeuille (pure — testable). */
export function portfolioSummary(dossiers: CabinetDossier[]): PortfolioSummary {
  return {
    nbDossiers: dossiers.length,
    resultatCumule: dossiers.reduce((s, d) => s + (d.resultat || 0), 0),
    produitsCumules: dossiers.reduce((s, d) => s + (d.produits || 0), 0),
    chargesCumulees: dossiers.reduce((s, d) => s + (d.charges || 0), 0),
    clotures: dossiers.filter(d => d.exercice?.isClosed).length,
    ouverts: dossiers.filter(d => d.exercice && !d.exercice.isClosed).length,
    inactifs: dossiers.filter(d => (d.entries || 0) === 0).length,
  };
}

/**
 * Bascule sur un dossier (best-effort) : mémorise le tenant cible et recharge.
 * ⚠️ Le tenantId « certifié » est dérivé de la session serveur au chargement ;
 * pour un utilisateur multi-sociétés, la valeur mémorisée ici sert d'amorçage.
 */
export function openDossier(dossierId: string): void {
  try { localStorage.setItem('atlas-tenant-id', dossierId); } catch { /* stockage indisponible */ }
  if (typeof window !== 'undefined') window.location.assign('/dashboard');
}
