/**
 * Garde-fous de câblage du Report Builder.
 *
 * Ces tests verrouillent les trois régressions qui faisaient passer le report
 * builder pour déconnecté des données réelles :
 *   1. période par défaut cadrée sur le mois calendaire au lieu de l'exercice ;
 *   2. modèles de la galerie sans structure (document vierge) ;
 *   3. sources de blocs non résolues par blockDataService.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { atlasCatalog } from '../data/atlasCatalog';
import { masterTemplateList, masterTemplates, getMasterTemplateBlocks } from '../data/masterTemplates';
import { createBlockFromCatalog } from '../data/createBlockFromCatalog';
import {
  currentYearPeriod,
  pickDefaultFiscalYear,
  resolveDefaultPeriod,
  type FiscalYearOption,
} from '../services/reportPeriodService';

const ROOT = join(__dirname, '..');

/** Sources résolues par blockDataService, lues depuis ses `case '…'`. */
function handledSources(): Set<string> {
  const src = readFileSync(join(ROOT, 'services/blockDataService.ts'), 'utf8');
  return new Set(Array.from(src.matchAll(/case '([^']+)'/g), m => m[1]));
}

/** Sources référencées par un modèle maître (helpers positionnels inclus). */
function templateSources(): Set<string> {
  const src = readFileSync(join(ROOT, 'data/masterTemplates.ts'), 'utf8');
  const body = src.slice(src.indexOf('function bilanSyscohada'));
  return new Set([
    ...Array.from(body.matchAll(/\b(?:table|chart)\('([^']+)'/g), m => m[1]),
    ...Array.from(body.matchAll(/source: '([^']+)'/g), m => m[1]),
  ]);
}

function galleryMap(): Record<string, string | undefined> {
  const src = readFileSync(join(ROOT, 'components/TemplateGalleryPage.tsx'), 'utf8');
  const block = /MASTER_TEMPLATE_MAP[^=]*=\s*\{([\s\S]*?)\n\};/.exec(src)![1];
  const out: Record<string, string | undefined> = {};
  for (const m of block.matchAll(/'([^']+)':\s*(?:'([^']+)'|undefined)/g)) out[m[1]] = m[2];
  return out;
}

function makeAdapter(tables: Record<string, unknown[]>) {
  return {
    getAll: vi.fn(async (table: string) => tables[table] ?? []),
  } as never;
}

describe('sources de données', () => {
  it('toutes les sources du catalogue Atlas sont résolues', () => {
    const handled = handledSources();
    // Les items `dashboard` ne sont pas résolus directement : ils se
    // matérialisent en grille de KPIs, dont les sources sont vérifiées plus bas.
    const missing = atlasCatalog
      .filter(item => item.blockType !== 'dashboard')
      .filter(item => !handled.has(item.source))
      .map(item => `${item.id} → ${item.source}`);
    expect(missing).toEqual([]);
  });

  it('chaque tableau de bord produit une grille de KPIs tous résolus', () => {
    const handled = handledSources();
    const missing: string[] = [];
    for (const item of atlasCatalog.filter(i => i.blockType === 'dashboard')) {
      const block = createBlockFromCatalog(item) as { type: string; kpis?: { source: string }[] };
      expect(block.type).toBe('kpi-grid');
      expect(block.kpis?.length ?? 0).toBeGreaterThan(0);
      for (const kpi of block.kpis ?? []) {
        if (!handled.has(kpi.source)) missing.push(`${item.id} → ${kpi.source}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('toutes les sources des modèles maîtres sont résolues', () => {
    const handled = handledSources();
    const missing = [...templateSources()].filter(s => !handled.has(s));
    expect(missing).toEqual([]);
  });

  it('une table du catalogue laisse son schéma à la source', () => {
    const item = atlasCatalog.find(i => i.blockType === 'table')!;
    const block = createBlockFromCatalog(item) as { columns: unknown[]; source?: string };
    // Un schéma Libellé/Débit/Crédit/Solde codé en dur était plaqué sur toutes
    // les tables (aging, ratios, immobilisations…) → en-têtes sans rapport.
    expect(block.columns).toEqual([]);
    expect(block.source).toBe(item.source);
  });
});

describe('galerie de modèles', () => {
  it('chaque modèle annoncé pointe vers une structure existante', () => {
    const ids = new Set(Object.keys(masterTemplates));
    const broken = Object.entries(galleryMap())
      .filter(([id, target]) => id !== 'tpl-vierge' && (!target || !ids.has(target)))
      .map(([id, target]) => `${id} → ${target ?? '(aucun)'}`);
    expect(broken).toEqual([]);
  });

  it('chaque modèle maître produit des blocs', () => {
    for (const id of Object.keys(masterTemplates) as (keyof typeof masterTemplates)[]) {
      expect(getMasterTemplateBlocks(id).length, `modèle ${id}`).toBeGreaterThan(0);
    }
  });

  it('le catalogue de modèles et les structures restent alignés', () => {
    expect(masterTemplateList.map(t => t.id).sort()).toEqual(Object.keys(masterTemplates).sort());
  });
});

describe('période par défaut', () => {
  const fy = (over: Partial<FiscalYearOption>): FiscalYearOption => ({
    id: 'fy', name: 'Exercice', startDate: '2025-01-01', endDate: '2025-12-31',
    isActive: false, isClosed: false, ...over,
  });

  it('retient l’exercice actif avant tout autre', () => {
    const picked = pickDefaultFiscalYear([
      fy({ id: 'a', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: true }),
      fy({ id: 'b', isActive: true }),
    ]);
    expect(picked?.id).toBe('b');
  });

  it('ouvre le rapport sur l’exercice actif, pas sur le mois courant', async () => {
    const adapter = makeAdapter({
      fiscalYears: [{ id: '1', name: 'Exercice 2025', startDate: '2025-01-01', endDate: '2025-12-31', isActive: true }],
    });
    await expect(resolveDefaultPeriod(adapter)).resolves.toMatchObject({
      startDate: '2025-01-01', endDate: '2025-12-31', label: 'Exercice 2025',
    });
  });

  it('accepte le format snake_case des adapters SaaS', async () => {
    const adapter = makeAdapter({
      fiscalYears: [{ id: '1', name: 'FY24', start_date: '2024-04-01', end_date: '2025-03-31', is_active: true }],
    });
    await expect(resolveDefaultPeriod(adapter)).resolves.toMatchObject({
      startDate: '2024-04-01', endDate: '2025-03-31',
    });
  });

  it('sans exercice, se cale sur l’année des dernières écritures', async () => {
    const adapter = makeAdapter({
      fiscalYears: [],
      journalEntries: [
        { date: '2023-05-02', status: 'validated' },
        { date: '2024-11-30', status: 'posted' },
        { date: '2030-01-01', status: 'draft' }, // brouillon → ignoré
      ],
    });
    await expect(resolveDefaultPeriod(adapter)).resolves.toMatchObject({
      startDate: '2024-01-01', endDate: '2024-12-31',
    });
  });

  it('sans aucune donnée, retombe sur l’année civile entière', async () => {
    const adapter = makeAdapter({ fiscalYears: [], journalEntries: [] });
    const period = await resolveDefaultPeriod(adapter);
    expect(period).toEqual(currentYearPeriod());
    // Jamais un seul mois : c'est ce cadrage qui vidait tous les blocs.
    expect(period.startDate.slice(5)).toBe('01-01');
    expect(period.endDate.slice(5)).toBe('12-31');
  });

  it('reste silencieux si le stockage échoue', async () => {
    const adapter = { getAll: vi.fn(async () => { throw new Error('offline'); }) } as never;
    await expect(resolveDefaultPeriod(adapter)).resolves.toEqual(currentYearPeriod());
  });
});
