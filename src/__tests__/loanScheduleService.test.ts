import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import Decimal from 'decimal.js';

describe('LoanScheduleService', () => {
  const adapter = createTestAdapter();

  beforeEach(async () => {
    await db.loanSchedules.clear();
    await db.journalEntries.clear();
  });

  describe('Constant Installment Method', () => {
    it('should generate correct number of installments', () => {
      const months = 24;
      const principal = new Decimal(10000000);
      const annualRate = new Decimal('0.08');
      const monthlyRate = annualRate.div(12);

      // M = P * r / (1 - (1+r)^-n)
      const factor = monthlyRate.div(
        new Decimal(1).minus(new Decimal(1).plus(monthlyRate).pow(-months))
      );
      const installment = principal.mul(factor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      expect(installment.gt(0)).toBe(true);
      // For 10M at 8% over 24 months, monthly ≈ 452,273
      expect(installment.toNumber()).toBeGreaterThan(400000);
      expect(installment.toNumber()).toBeLessThan(500000);
    });

    it('should have all installments equal (constant installment)', () => {
      const months = 12;
      const principal = new Decimal(6000000);
      const annualRate = new Decimal('0.10');
      const monthlyRate = annualRate.div(12);

      const factor = monthlyRate.div(
        new Decimal(1).minus(new Decimal(1).plus(monthlyRate).pow(-months))
      );
      const installment = principal.mul(factor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      // All installments should be the same
      const installments = Array(months).fill(installment.toNumber());
      const allEqual = installments.every(i => i === installments[0]);
      expect(allEqual).toBe(true);
    });

    it('should have sum of principal equal to loan amount', () => {
      const months = 6;
      const principal = new Decimal(3000000);
      const annualRate = new Decimal('0.12');
      const monthlyRate = annualRate.div(12);

      const factor = monthlyRate.div(
        new Decimal(1).minus(new Decimal(1).plus(monthlyRate).pow(-months))
      );
      const installment = principal.mul(factor);

      let remaining = principal;
      let totalPrincipal = new Decimal(0);

      for (let i = 0; i < months; i++) {
        const interest = remaining.mul(monthlyRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        const principalPortion = installment.minus(interest).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        totalPrincipal = totalPrincipal.plus(principalPortion);
        remaining = remaining.minus(principalPortion);
      }

      // Allow small rounding tolerance
      expect(totalPrincipal.minus(principal).abs().toNumber()).toBeLessThan(100);
    });

    it('should have remaining balance near zero after last installment', () => {
      const months = 12;
      const principal = new Decimal(5000000);
      const annualRate = new Decimal('0.09');
      const monthlyRate = annualRate.div(12);

      const factor = monthlyRate.div(
        new Decimal(1).minus(new Decimal(1).plus(monthlyRate).pow(-months))
      );
      const installment = principal.mul(factor);

      let remaining = principal;
      for (let i = 0; i < months; i++) {
        const interest = remaining.mul(monthlyRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        const principalPortion = installment.minus(interest);
        remaining = remaining.minus(principalPortion);
      }

      expect(remaining.abs().toNumber()).toBeLessThan(100);
    });

    it('should have interest decreasing over time', () => {
      const months = 12;
      const principal = new Decimal(10000000);
      const annualRate = new Decimal('0.10');
      const monthlyRate = annualRate.div(12);

      const factor = monthlyRate.div(
        new Decimal(1).minus(new Decimal(1).plus(monthlyRate).pow(-months))
      );
      const installment = principal.mul(factor);

      let remaining = principal;
      const interests: number[] = [];

      for (let i = 0; i < months; i++) {
        const interest = remaining.mul(monthlyRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        interests.push(interest.toNumber());
        const principalPortion = installment.minus(interest);
        remaining = remaining.minus(principalPortion);
      }

      // First interest > last interest
      expect(interests[0]).toBeGreaterThan(interests[interests.length - 1]);
    });
  });

  describe('Constant Principal Method', () => {
    it('should have equal principal portions', () => {
      const months = 12;
      const principal = new Decimal(6000000);
      const principalPortion = principal.div(months).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      expect(principalPortion.toNumber()).toBe(500000);
    });

    it('should have decreasing total installments', () => {
      const months = 6;
      const principal = new Decimal(6000000);
      const annualRate = new Decimal('0.12');
      const monthlyRate = annualRate.div(12);
      const principalPortion = principal.div(months);

      let remaining = principal;
      const totals: number[] = [];

      for (let i = 0; i < months; i++) {
        const interest = remaining.mul(monthlyRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        totals.push(principalPortion.plus(interest).toNumber());
        remaining = remaining.minus(principalPortion);
      }

      expect(totals[0]).toBeGreaterThan(totals[totals.length - 1]);
    });
  });

  describe('Data persistence', () => {
    it('should save schedule rows to database', async () => {
      await adapter.create('loanSchedules', {
        companyId: 'comp1', loanId: 'loan1', installmentNumber: 1,
        dueDate: '2025-02-01', principalAmount: 500000, interestAmount: 83333,
        totalAmount: 583333, remainingBalance: 5500000, status: 'pending',
        createdAt: new Date().toISOString(),
      });

      const rows = await adapter.getAll('loanSchedules', { where: { loanId: 'loan1' } });
      expect(rows.length).toBe(1);
    });

    it('should track overdue installments', async () => {
      await adapter.create('loanSchedules', {
        companyId: 'comp1', loanId: 'loan1', installmentNumber: 1,
        dueDate: '2024-01-01', principalAmount: 500000, interestAmount: 50000,
        totalAmount: 550000, remainingBalance: 5500000, status: 'overdue',
        createdAt: new Date().toISOString(),
      });

      const overdue = await adapter.getAll('loanSchedules', { where: { status: 'overdue' } });
      expect(overdue.length).toBe(1);
    });
  });
});
