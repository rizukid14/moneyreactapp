import { describe, it, expect } from 'vitest';
import {
  calculateDebtBalance,
  isDebtPrincipalTx,
  isDebtPaymentTx,
} from '../src/lib/debtCalculations';
import type { Debt, Transaction } from '../src/contexts/MoneyContext';

describe('src/lib/debtCalculations', () => {
  const dummyDebt: Debt = {
    id: 'debt-1',
    type: 'hutang',
    amount: 1_000_000,
    totalAmount: 1_000_000,
    contact: 'Budi',
    dueDate: '2026-11-01',
    isPaid: false,
    date: '2026-10-01',
  };

  it('correctly calculates initial balance with single principal transaction', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-p1',
        assetId: 'asset-1',
        amount: 1_000_000,
        type: 'hutang_masuk',
        categoryId: 'sys-cat-debt-receive',
        date: '2026-10-01',
        note: 'Penerimaan dana pinjaman dari Budi',
        relatedId: 'debt-1',
        debtRole: 'principal',
      },
    ];

    const result = calculateDebtBalance(dummyDebt, txs);
    expect(result.totalPrincipal).toBe(1_000_000);
    expect(result.totalPaid).toBe(0);
    expect(result.remaining).toBe(1_000_000);
    expect(result.isPaid).toBe(false);
    expect(result.progressPercent).toBe(0);
  });

  it('correctly calculates balance after partial payment', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-p1',
        assetId: 'asset-1',
        amount: 1_000_000,
        type: 'hutang_masuk',
        categoryId: 'sys-cat-debt-receive',
        date: '2026-10-01',
        relatedId: 'debt-1',
        debtRole: 'principal',
      },
      {
        id: 'tx-pay1',
        assetId: 'asset-1',
        amount: 400_000,
        type: 'hutang_keluar',
        categoryId: 'sys-cat-debt-repay',
        date: '2026-10-05',
        relatedId: 'debt-1',
        debtRole: 'payment',
      },
    ];

    const result = calculateDebtBalance(dummyDebt, txs);
    expect(result.totalPrincipal).toBe(1_000_000);
    expect(result.totalPaid).toBe(400_000);
    expect(result.remaining).toBe(600_000);
    expect(result.isPaid).toBe(false);
    expect(result.progressPercent).toBe(40);
    expect(result.paidInstallmentCount).toBe(1);
  });

  it('marks debt as paid when payments match or exceed principal', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-p1',
        assetId: 'asset-1',
        amount: 1_000_000,
        type: 'hutang_masuk',
        categoryId: 'sys-cat-debt-receive',
        date: '2026-10-01',
        relatedId: 'debt-1',
        debtRole: 'principal',
      },
      {
        id: 'tx-pay1',
        assetId: 'asset-1',
        amount: 1_000_000,
        type: 'hutang_keluar',
        categoryId: 'sys-cat-debt-repay',
        date: '2026-10-10',
        relatedId: 'debt-1',
        debtRole: 'payment',
      },
    ];

    const result = calculateDebtBalance(dummyDebt, txs);
    expect(result.remaining).toBe(0);
    expect(result.isPaid).toBe(true);
    expect(result.progressPercent).toBe(100);
  });

  it('handles role distinction cleanly', () => {
    const principalTx: Transaction = {
      id: '1',
      assetId: 'a1',
      amount: 100,
      type: 'piutang_keluar',
      categoryId: 'c1',
      date: '2026-10-01',
      debtRole: 'principal',
    };
    const paymentTx: Transaction = {
      id: '2',
      assetId: 'a1',
      amount: 50,
      type: 'piutang_masuk',
      categoryId: 'c2',
      date: '2026-10-02',
      debtRole: 'payment',
    };

    expect(isDebtPrincipalTx(principalTx)).toBe(true);
    expect(isDebtPaymentTx(principalTx)).toBe(false);

    expect(isDebtPrincipalTx(paymentTx)).toBe(false);
    expect(isDebtPaymentTx(paymentTx)).toBe(true);
  });
});
