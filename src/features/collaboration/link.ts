/**
 * Liens vers l'Espace Collaboratif (bidirectionnalité CDC §4.1 / §8).
 * Helpers d'URL pour ouvrir un espace existant ou lancer l'assistant de création
 * pré-rempli depuis un écran métier (Objet → Espace). Pas de dépendance : le
 * routeur lit ces query params dans CollaborationWorkspace.
 */
import type { AnchorType } from './types';

export function openSpaceUrl(id: string): string {
  return `/collaboration?space=${encodeURIComponent(id)}`;
}

export interface NewSpaceContext {
  anchorType: AnchorType;
  anchorLabel: string;
  accountCode?: string;
  partnerId?: string;
  entryId?: string;
  period?: string;
  initialGap?: number;
  title?: string;
  problem?: string;
  objective?: string;
}

export function newSpaceUrl(ctx: NewSpaceContext): string {
  const p = new URLSearchParams();
  p.set('new', '1');
  p.set('atype', ctx.anchorType);
  p.set('label', ctx.anchorLabel);
  if (ctx.accountCode) p.set('account', ctx.accountCode);
  if (ctx.partnerId) p.set('partner', ctx.partnerId);
  if (ctx.entryId) p.set('entry', ctx.entryId);
  if (ctx.period) p.set('period', ctx.period);
  if (ctx.initialGap != null) p.set('gap', String(ctx.initialGap));
  if (ctx.title) p.set('title', ctx.title);
  if (ctx.problem) p.set('problem', ctx.problem);
  if (ctx.objective) p.set('objective', ctx.objective);
  return `/collaboration?${p.toString()}`;
}

export interface ParsedNewSpace {
  anchorType: AnchorType; anchorLabel: string; accountCode?: string; partnerId?: string;
  entryId?: string; period?: string; initialGap?: number; title?: string; problem?: string; objective?: string;
}
export function parseNewSpaceParams(sp: URLSearchParams): ParsedNewSpace | null {
  if (sp.get('new') !== '1') return null;
  const gap = sp.get('gap');
  return {
    anchorType: (sp.get('atype') as AnchorType) || 'reconciliation',
    anchorLabel: sp.get('label') || '',
    accountCode: sp.get('account') || undefined,
    partnerId: sp.get('partner') || undefined,
    entryId: sp.get('entry') || undefined,
    period: sp.get('period') || undefined,
    initialGap: gap ? Number(gap) : undefined,
    title: sp.get('title') || undefined,
    problem: sp.get('problem') || undefined,
    objective: sp.get('objective') || undefined,
  };
}
