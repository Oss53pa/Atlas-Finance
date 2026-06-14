import { describe, it, expect } from 'vitest';
import { computeCapexMetrics, npv, irr } from '../utils/capexMetrics';

describe('capexMetrics — évaluation déterministe CAR', () => {
  // Investissement 1000, 4 flux de 400, WACC 10 %.
  const base = { investment: 1000, flows: [400, 400, 400, 400], rate: 0.1 };

  it('NPV correcte (~267,95)', () => {
    expect(npv(0.1, 1000, [400, 400, 400, 400])).toBeCloseTo(267.95, 1);
  });

  it('IRR ~21,86 %', () => {
    const r = irr(1000, [400, 400, 400, 400]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.2186, 3);
  });

  it('métriques cohérentes', () => {
    const m = computeCapexMetrics(base);
    expect(m.npv).toBe(268);
    expect(m.paybackSimpleMonths).toBe(30);   // 2,5 ans
    expect(m.pi).toBeCloseTo(1.268, 2);
    expect(m.roi).toBeCloseTo(0.6, 2);          // (1600-1000)/1000
    expect(m.paybackActualiseMonths!).toBeGreaterThan(30); // actualisé plus long
  });

  it('valeur résiduelle ajoutée à la dernière année', () => {
    const m = computeCapexMetrics({ investment: 1000, flows: [400, 400, 400, 400], rate: 0.1, residual: 200 });
    expect(m.roi).toBeCloseTo(0.8, 2);          // (1600+200-1000)/1000
  });

  it('projet non rentable → NPV négative, payback null', () => {
    const m = computeCapexMetrics({ investment: 1000, flows: [100, 100], rate: 0.1 });
    expect(m.npv).toBeLessThan(0);
    expect(m.paybackSimpleMonths).toBeNull();
  });
});
