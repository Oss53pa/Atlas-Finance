export interface AuxiliaryCodeMapping {
  id: string;              // uuid
  compteCollectif: string; // e.g. '411'
  prefixeCommercial: string; // e.g. 'CL'
  description: string;    // e.g. 'Clients locaux'
  longueurSequence: number; // 3 = '001', 4 = '0001'
}

export const DEFAULT_MAPPINGS: AuxiliaryCodeMapping[] = [
  { id: '1', compteCollectif: '411', prefixeCommercial: 'CL', description: 'Clients locaux', longueurSequence: 3 },
  { id: '2', compteCollectif: '401', prefixeCommercial: 'FL', description: 'Fournisseurs locaux', longueurSequence: 3 },
  { id: '3', compteCollectif: '404', prefixeCommercial: 'FE', description: 'Fournisseurs étrangers', longueurSequence: 3 },
  { id: '4', compteCollectif: '421', prefixeCommercial: 'PE', description: 'Personnel', longueurSequence: 3 },
];

const SETTINGS_KEY = 'auxiliary_code_mappings';

/**
 * Load auxiliary code mappings from adapter settings.
 * Falls back to DEFAULT_MAPPINGS if no config has been saved yet.
 */
export async function loadMappings(adapter: any): Promise<AuxiliaryCodeMapping[]> {
  try {
    const record = await adapter.getById<{ key: string; value: string; updatedAt: string }>(
      'settings',
      SETTINGS_KEY
    );
    if (record?.value) {
      const parsed = JSON.parse(record.value) as AuxiliaryCodeMapping[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore read errors, fall back to defaults
  }
  return DEFAULT_MAPPINGS;
}

/**
 * Persist auxiliary code mappings to adapter settings.
 */
export async function saveMappings(adapter: any, mappings: AuxiliaryCodeMapping[]): Promise<void> {
  const now = new Date().toISOString();
  const serialized = JSON.stringify(mappings);

  const existing = await adapter.getById<{ key: string; value: string; updatedAt: string }>(
    'settings',
    SETTINGS_KEY
  );

  if (existing) {
    await adapter.update<{ key: string; value: string; updatedAt: string }>(
      'settings',
      SETTINGS_KEY,
      { value: serialized, updatedAt: now }
    );
  } else {
    await adapter.create<{ key: string; value: string; updatedAt: string }>(
      'settings',
      { key: SETTINGS_KEY, value: serialized, updatedAt: now } as any
    );
  }
}

/**
 * Generate the next available auxiliary code and its derived commercial code
 * for a given compte collectif (e.g. '411').
 *
 * The sequence number is based on existing thirdParties whose accountCode
 * starts with the compteCollectif prefix.
 *
 * Returns { compteAuxiliaire: '411043', codeCommercial: 'CL043' }
 */
export async function generateNextCode(
  adapter: any,
  compteCollectif: string,
  mappings: AuxiliaryCodeMapping[]
): Promise<{ compteAuxiliaire: string; codeCommercial: string }> {
  // Find the mapping for this compte collectif
  const mapping = mappings.find(m => m.compteCollectif === compteCollectif);
  const longueur = mapping?.longueurSequence ?? 3;
  const prefixe = mapping?.prefixeCommercial ?? compteCollectif;

  // Load all third parties and find the max sequence used so far
  let maxSeq = 0;
  try {
    const allThirdParties = await adapter.getAll('thirdParties');
    for (const tp of allThirdParties as any[]) {
      const accountCode: string = tp.accountCode ?? '';
      if (accountCode.startsWith(compteCollectif)) {
        // Extract the numeric suffix after the compteCollectif prefix
        const suffix = accountCode.slice(compteCollectif.length);
        const num = parseInt(suffix, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  } catch {
    // ignore read errors
  }

  const nextSeq = maxSeq + 1;
  const paddedSeq = String(nextSeq).padStart(longueur, '0');

  return {
    compteAuxiliaire: `${compteCollectif}${paddedSeq}`,
    codeCommercial: `${prefixe}${paddedSeq}`,
  };
}

/**
 * Derive the commercial code from a full auxiliary account code.
 * e.g. '411043' with mapping 411→CL returns 'CL043'
 */
export function auxiliaryToCommercial(
  compteAuxiliaire: string,
  mappings: AuxiliaryCodeMapping[]
): string {
  for (const m of mappings) {
    if (compteAuxiliaire.startsWith(m.compteCollectif)) {
      const suffix = compteAuxiliaire.slice(m.compteCollectif.length);
      return `${m.prefixeCommercial}${suffix}`;
    }
  }
  return compteAuxiliaire;
}

/**
 * Find the compte collectif corresponding to a commercial code prefix.
 * e.g. 'CL043' → '411'
 */
export function commercialToCollectif(
  codeCommercial: string,
  mappings: AuxiliaryCodeMapping[]
): string | null {
  for (const m of mappings) {
    if (codeCommercial.startsWith(m.prefixeCommercial)) {
      return m.compteCollectif;
    }
  }
  return null;
}
