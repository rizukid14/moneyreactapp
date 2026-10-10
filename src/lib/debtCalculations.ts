import type { Debt, Transaction, Category, DebtAllocation } from '../contexts/MoneyContext';
import { isPrincipalTx } from './utils';

export interface DebtBalanceCalculation {
  totalPrincipal: number;
  totalPaid: number;
  remaining: number;
  isPaid: boolean;
  progressPercent: number;
  paidInstallmentCount: number;
  principalTxs: Transaction[];
  paymentTxs: Transaction[];
}

export interface PrincipalBalance {
  principalTxId: string;
  label: string;
  principal: number;
  paid: number;
  remaining: number;
  isPaid: boolean;
  date: string;
}

export interface PrincipalBalancesResult {
  perNota: PrincipalBalance[];
  unallocated: number; // Total pembayaran yang belum dialokasikan ke nota spesifik
  totalRemaining: number;
}

export interface ContactOffsetPotential {
  contact: string;
  hutangTotal: number;
  piutangTotal: number;
  offsetAmount: number;
  hutangDebts: Debt[];
  piutangDebts: Debt[];
}

/**
 * Checks whether a transaction represents a debt principal (loan creation or addition) transaction.
 * Uses explicit `debtRole === 'principal'` if available; otherwise falls back safely to legacy string/category matching.
 */
export const isDebtPrincipalTx = (
  tx: Transaction,
  categories?: Category[] | { id: string; name: string }[]
): boolean => {
  if (tx.debtRole === 'principal') return true;
  if (tx.debtRole === 'payment' || tx.debtRole === 'offset') return false;

  // Legacy fallback for transactions created before debtRole existed
  return isPrincipalTx(tx.note || '', tx.categoryId, categories);
};

/**
 * Checks whether a transaction represents a debt payment or offset (installment, full payment, or offset).
 */
export const isDebtPaymentTx = (
  tx: Transaction,
  categories?: Category[] | { id: string; name: string }[]
): boolean => {
  if (tx.debtRole === 'payment' || tx.debtRole === 'offset') return true;
  if (tx.debtRole === 'principal') return false;

  // Legacy fallback: if it's linked to a debt and NOT a principal tx, it's a payment
  if (!tx.relatedId) return false;
  return !isPrincipalTx(tx.note || '', tx.categoryId, categories);
};

/**
 * Pure function to calculate real-time balance, payments, remaining amount, and status for a single debt.
 */
export const calculateDebtBalance = (
  debt: Debt,
  transactions: Transaction[],
  categories?: Category[] | { id: string; name: string }[]
): DebtBalanceCalculation => {
  const allTxs = transactions.filter(t => t.relatedId === debt.id && !t.isDeleted);
  
  const principalTxs = allTxs.filter(t => isDebtPrincipalTx(t, categories));
  const paymentTxs = allTxs.filter(t => isDebtPaymentTx(t, categories));

  const totalPrincipal = Math.max(0, Number(debt.totalAmount || 0));
  const totalPaid = paymentTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const remaining = Math.max(0, totalPrincipal - totalPaid);

  // If debt is explicitly marked as isPaid, or if principal > 0 and remaining is 0
  const isPaid = Boolean(debt.isPaid || (totalPrincipal > 0 && remaining <= 0));
  
  const progressPercent = totalPrincipal > 0
    ? Math.min(100, Math.max(0, Math.round((totalPaid / totalPrincipal) * 100)))
    : (isPaid ? 100 : 0);

  const paidInstallmentCount = debt.isInstallment
    ? Math.max(debt.paidInstallments || 0, paymentTxs.length)
    : paymentTxs.length;

  return {
    totalPrincipal,
    totalPaid,
    remaining,
    isPaid,
    progressPercent,
    paidInstallmentCount,
    principalTxs,
    paymentTxs,
  };
};

/**
 * Calculates per-principal-transaction (per-nota) balance with explicit allocations.
 * Payments with debtAllocations are allocated to specific notes; payments without are marked unallocated.
 */
export const calculatePrincipalBalances = (
  debt: Debt,
  transactions: Transaction[],
  categories?: Category[] | { id: string; name: string }[]
): PrincipalBalancesResult => {
  const allTxs = transactions.filter(t => t.relatedId === debt.id && !t.isDeleted);
  const principalTxs = allTxs.filter(t => isDebtPrincipalTx(t, categories));
  const paymentTxs = allTxs.filter(t => isDebtPaymentTx(t, categories));

  // Initialize per-principal balance tracker
  const balanceMap = new Map<string, PrincipalBalance>();
  principalTxs.forEach(tx => {
    const label = tx.note || debt.description || (debt.type === 'hutang' ? 'Hutang' : 'Piutang');
    balanceMap.set(tx.id, {
      principalTxId: tx.id,
      label,
      principal: Number(tx.amount) || 0,
      paid: 0,
      remaining: Number(tx.amount) || 0,
      isPaid: false,
      date: tx.date,
    });
  });

  // Process payments: allocate based on debtAllocations or mark as unallocated
  let unallocated = 0;
  paymentTxs.forEach(paymentTx => {
    const amount = Number(paymentTx.amount) || 0;
    if (paymentTx.debtAllocations && paymentTx.debtAllocations.length > 0) {
      // Explicit allocation: distribute to specific principals
      paymentTx.debtAllocations.forEach((alloc: DebtAllocation) => {
        const balance = balanceMap.get(alloc.principalTxId);
        if (balance) {
          const allocAmount = Math.min(alloc.amount, balance.remaining);
          balance.paid += allocAmount;
          balance.remaining = Math.max(0, balance.remaining - allocAmount);
          balance.isPaid = balance.remaining <= 0;
        }
      });
    } else {
      // No allocation: mark as unallocated
      unallocated += amount;
    }
  });

  const perNota = Array.from(balanceMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const totalRemaining = perNota.reduce((sum, n) => sum + n.remaining, 0);

  return { perNota, unallocated, totalRemaining };
};

/**
 * Calculates net offset potentials between active Hutang and Piutang for each contact.
 * Excludes debts that are already paid or marked with `excludeAutoOffset`.
 */
export const calculateContactOffsetPotentials = (
  debts: Debt[],
  transactions: Transaction[],
  categories?: Category[] | { id: string; name: string }[]
): ContactOffsetPotential[] => {
  const contactMap: Record<
    string,
    {
      hTotal: number;
      pTotal: number;
      hDebts: Debt[];
      pDebts: Debt[];
    }
  > = {};

  debts.forEach(d => {
    if (d.isPaid || d.isDeleted || d.excludeAutoOffset) return;
    const calc = calculateDebtBalance(d, transactions, categories);
    if (calc.remaining <= 0) return;

    const normalizedContact = (d.contact || '').trim();
    if (!normalizedContact) return;

    const key = normalizedContact.toLowerCase();
    if (!contactMap[key]) {
      contactMap[key] = {
        hTotal: 0,
        pTotal: 0,
        hDebts: [],
        pDebts: [],
      };
    }

    if (d.type === 'hutang') {
      contactMap[key].hTotal += calc.remaining;
      contactMap[key].hDebts.push(d);
    } else {
      contactMap[key].pTotal += calc.remaining;
      contactMap[key].pDebts.push(d);
    }
  });

  return Object.entries(contactMap)
    .filter(([_, data]) => data.hTotal > 0 && data.pTotal > 0)
    .map(([_, data]) => ({
      contact: data.hDebts[0]?.contact || data.pDebts[0]?.contact || '',
      hutangTotal: data.hTotal,
      piutangTotal: data.pTotal,
      offsetAmount: Math.min(data.hTotal, data.pTotal),
      hutangDebts: data.hDebts,
      piutangDebts: data.pDebts,
    }));
};
