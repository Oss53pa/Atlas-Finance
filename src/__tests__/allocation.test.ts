import { describe, it, expect } from 'vitest';
import { largestRemainderAllocate } from '../utils/allocation';

describe('largestRemainderAllocate — invariant Σ parts == total', () => {
  it('répartit sans perte de centime (cas classique)', () => {
    const r = largestRemainderAllocate(100, [1, 1, 1]); // 100/3
    expect(r.reduce((s, v) => s + v, 0)).toBe(100);
    expect(r).toEqual([34, 33, 33]); // plus fort reste au 1er
  });

  it('respecte les poids', () => {
    const r = largestRemainderAllocate(1000, [70, 20, 10]);
    expect(r.reduce((s, v) => s + v, 0)).toBe(1000);
    expect(r).toEqual([700, 200, 100]);
  });

  it('gère les montants négatifs (produits)', () => {
    const r = largestRemainderAllocate(-100, [1, 1, 1]);
    expect(r.reduce((s, v) => s + v, 0)).toBe(-100);
  });

  it('tout au 1er si poids nuls (résidu jamais perdu)', () => {
    const r = largestRemainderAllocate(500, [0, 0, 0]);
    expect(r).toEqual([500, 0, 0]);
  });

  it('reste exact sur de grands montants et poids irréguliers', () => {
    const total = 816889007; // classe 6 réelle (centimes)
    const weights = [123, 456, 789, 12, 3000];
    const r = largestRemainderAllocate(total, weights);
    expect(r.reduce((s, v) => s + v, 0)).toBe(total);
    expect(r.every(v => Number.isInteger(v))).toBe(true);
  });

  it('une seule destination reçoit tout', () => {
    expect(largestRemainderAllocate(777, [5])).toEqual([777]);
  });
});
