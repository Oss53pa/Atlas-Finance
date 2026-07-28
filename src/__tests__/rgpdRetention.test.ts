/**
 * Paramètres · Lot B·4 — rétention RGPD (CDC §13).
 */
import { describe, it, expect } from 'vitest';
import { isRetentionExpired } from '../services/param/rgpdService';

describe('isRetentionExpired', () => {
  it('non échu avant la fin de la période', () => {
    expect(isRetentionExpired('2020-01-01', 60, '2024-06-01')).toBe(false);
  });
  it('échu après la période (dernière activité + mois ≤ asOf)', () => {
    expect(isRetentionExpired('2020-01-01', 60, '2025-06-01')).toBe(true);
  });
  it('échu à la date exacte (borne incluse)', () => {
    expect(isRetentionExpired('2020-01-01', 60, '2025-01-01')).toBe(true);
  });
  it('rétention 0 mois → échu dès la date d’activité', () => {
    expect(isRetentionExpired('2026-05-10', 0, '2026-05-10')).toBe(true);
    expect(isRetentionExpired('2026-05-10', 0, '2026-05-09')).toBe(false);
  });
  it('gère le franchissement d’année', () => {
    expect(isRetentionExpired('2025-11-01', 3, '2026-02-01')).toBe(true);
    expect(isRetentionExpired('2025-11-01', 3, '2026-01-15')).toBe(false);
  });
});
