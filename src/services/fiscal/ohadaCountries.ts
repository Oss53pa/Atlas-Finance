/**
 * Registre des pays OHADA — zones UEMOA & CEMAC (Vague D).
 *
 * La déclaration fiscale (DSF/liasse) couvre les 14 pays des deux unions
 * monétaires ; Liass'Pilot produit les annexes, Atlas F&A lui fournit la
 * balance générale de clôture. Ce registre donne à chaque pays sa zone, sa
 * devise et son code ISO — et résout le champ libre `societes.pays` (ex.
 * « Cote d'Ivoire ») vers un code canonique.
 */

export type OhadaZone = 'UEMOA' | 'CEMAC';

export interface OhadaCountry {
  /** Code ISO 3166-1 alpha-2. */
  code: string;
  nameFr: string;
  zone: OhadaZone;
  /** Devise ISO 4217 : XOF (UEMOA) ou XAF (CEMAC). */
  currency: 'XOF' | 'XAF';
}

export const OHADA_COUNTRIES: OhadaCountry[] = [
  // ── UEMOA — franc CFA BCEAO (XOF) ─────────────────────────────────────────
  { code: 'BJ', nameFr: 'Bénin', zone: 'UEMOA', currency: 'XOF' },
  { code: 'BF', nameFr: 'Burkina Faso', zone: 'UEMOA', currency: 'XOF' },
  { code: 'CI', nameFr: "Côte d'Ivoire", zone: 'UEMOA', currency: 'XOF' },
  { code: 'GW', nameFr: 'Guinée-Bissau', zone: 'UEMOA', currency: 'XOF' },
  { code: 'ML', nameFr: 'Mali', zone: 'UEMOA', currency: 'XOF' },
  { code: 'NE', nameFr: 'Niger', zone: 'UEMOA', currency: 'XOF' },
  { code: 'SN', nameFr: 'Sénégal', zone: 'UEMOA', currency: 'XOF' },
  { code: 'TG', nameFr: 'Togo', zone: 'UEMOA', currency: 'XOF' },
  // ── CEMAC — franc CFA BEAC (XAF) ──────────────────────────────────────────
  { code: 'CM', nameFr: 'Cameroun', zone: 'CEMAC', currency: 'XAF' },
  { code: 'CF', nameFr: 'Centrafrique', zone: 'CEMAC', currency: 'XAF' },
  { code: 'CG', nameFr: 'Congo', zone: 'CEMAC', currency: 'XAF' },
  { code: 'GA', nameFr: 'Gabon', zone: 'CEMAC', currency: 'XAF' },
  { code: 'GQ', nameFr: 'Guinée équatoriale', zone: 'CEMAC', currency: 'XAF' },
  { code: 'TD', nameFr: 'Tchad', zone: 'CEMAC', currency: 'XAF' },
];

const BY_CODE = new Map(OHADA_COUNTRIES.map(c => [c.code, c]));

/** Normalise une chaîne : minuscules, sans accents, sans ponctuation. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Aliases de texte libre → code ISO. Couvre les graphies fréquentes du champ
// `societes.pays` (avec/sans accents, variantes).
const NAME_ALIASES: Record<string, string> = {};
for (const c of OHADA_COUNTRIES) {
  NAME_ALIASES[norm(c.nameFr)] = c.code;
  NAME_ALIASES[norm(c.code)] = c.code;
}
Object.assign(NAME_ALIASES, {
  'cote divoire': 'CI',
  'cote d ivoire': 'CI',
  'ivory coast': 'CI',
  'rci': 'CI',
  'guinee bissau': 'GW',
  'guineebissau': 'GW',
  'guinee equatoriale': 'GQ',
  'republique du congo': 'CG',
  'congo brazzaville': 'CG',
  'republique centrafricaine': 'CF',
  'centrafrique': 'CF',
  'benin': 'BJ',
  'burkina': 'BF',
  'burkina faso': 'BF',
  'cameroun': 'CM',
  'cameroon': 'CM',
  'senegal': 'SN',
  'gabon': 'GA',
  'tchad': 'TD',
  'chad': 'TD',
  'mali': 'ML',
  'niger': 'NE',
  'togo': 'TG',
});

/**
 * Résout un pays (code ISO ou nom libre) vers son enregistrement OHADA.
 * Retourne `undefined` hors zone UEMOA/CEMAC.
 */
export function resolveOhadaCountry(input: string | null | undefined): OhadaCountry | undefined {
  if (!input) return undefined;
  const raw = input.trim().toUpperCase();
  if (BY_CODE.has(raw)) return BY_CODE.get(raw);
  const code = NAME_ALIASES[norm(input)];
  return code ? BY_CODE.get(code) : undefined;
}

export function getOhadaCountry(code: string): OhadaCountry | undefined {
  return BY_CODE.get(code.toUpperCase());
}

/** Devise attendue pour un pays (défaut XOF si hors zone). */
export function currencyForCountry(input: string | null | undefined): 'XOF' | 'XAF' {
  return resolveOhadaCountry(input)?.currency ?? 'XOF';
}

export function countriesByZone(zone: OhadaZone): OhadaCountry[] {
  return OHADA_COUNTRIES.filter(c => c.zone === zone);
}
