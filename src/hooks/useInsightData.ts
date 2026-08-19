import { useMemo, useState, useCallback } from 'react';
import { useMoney } from '../contexts/MoneyContext';
import { usePremium } from '../contexts/PremiumContext';
import { formatCurrency, getLocalDate, getLocalTime } from '../lib/utils';
import { auth } from '../lib/firebase';

export interface TopCategoryInsight {
  id: string;
  name: string;
  amount: number;
  percentage: number;
}

export interface ActiveAssetInsight {
  id: string;
  name: string;
  type: string;
  txCount: number;
  balance: number;
}

export interface BudgetRecommendation {
  type: 'over_budget' | 'near_budget' | 'missing_budget';
  categoryName: string;
  categoryId?: string;
  currentSpent: number;
  budgetLimit?: number;
  suggestedLimit?: number;
  message: string;
}

export interface InsightData {
  daysToEOM: number;
  eomDateStr: string;
  startDateStr: string;
  endDateStr: string;
  monthYearLabel: string;
  
  // Cashflow
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  
  // Top items
  topExpenses: TopCategoryInsight[];
  topIncomes: TopCategoryInsight[];
  topAssets: ActiveAssetInsight[];
  
  // Health Score
  score: number;
  statusText: string;
  statusColor: string;
  statusBg: string;
  findings: string[];
  summarySentence: string;
  
  // Budget recommendations
  budgetRecommendations: BudgetRecommendation[];
}

export function useInsightData() {
  const { 
    transactions, categories, assets, budgets, startOfMonthDay, currencySymbol, 
    getAssetBalance, contacts, recurringTransactions, subscriptions, budgetMode, 
    monthlyIncome, zbbMode, goals 
  } = useMoney();
  const { premium, checkQuota } = usePremium();
  const isPremium = premium.isPremium;

  const [aiReviewText, setAiReviewText] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Category map for quick lookup
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // Compute Days to EOM & Financial Month Dates
  const financialDates = useMemo(() => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1; // 1-indexed
    const year = today.getFullYear();

    const startDay = startOfMonthDay || 1;
    let startYear = year;
    let startMonth = month;
    let endYear = year;
    let endMonth = month;
    let endDay = startDay - 1;

    if (startDay === 1) {
      const lastDayOfCalMonth = new Date(year, month, 0).getDate();
      endDay = lastDayOfCalMonth;
      startYear = year;
      startMonth = month;
    } else {
      if (day >= startDay) {
        endMonth = month + 1;
        if (endMonth > 12) {
          endMonth = 1;
          endYear = year + 1;
        }
      } else {
        startMonth = month - 1;
        if (startMonth < 1) {
          startMonth = 12;
          startYear = year - 1;
        }
      }
    }

    const eomDate = new Date(endYear, endMonth - 1, endDay);
    const todayDate = new Date(year, month - 1, day);
    const diffTime = eomDate.getTime() - todayDate.getTime();
    const daysToEOM = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const formatStr = (y: number, m: number, d: number) => 
      `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return {
      daysToEOM,
      eomDateStr: `${endDay} ${monthNames[endMonth - 1]} ${endYear}`,
      startDateStr: formatStr(startYear, startMonth, startDay),
      endDateStr: formatStr(endYear, endMonth, endDay),
      monthYearLabel: `${monthNames[startMonth - 1]} ${startYear}`
    };
  }, [startOfMonthDay]);

  // Main Insight Data Computations
  const insight = useMemo((): InsightData => {
    const { startDateStr, endDateStr, daysToEOM, eomDateStr, monthYearLabel } = financialDates;

    // Filter transactions in financial month
    const monthTxs = transactions.filter(t => !t.isDeleted && t.date >= startDateStr && t.date <= endDateStr);

    // 1. Arus Kas
    const totalIncome = monthTxs
      .filter(t => t.type === 'pendapatan')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = monthTxs
      .filter(t => t.type === 'pengeluaran')
      .reduce((sum, t) => sum + t.amount, 0);

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

    // 2. Top Kategori Pengeluaran (Top 5)
    const expenseCatSums: Record<string, number> = {};
    monthTxs
      .filter(t => t.type === 'pengeluaran')
      .forEach(t => {
        const catId = t.categoryId || 'uncategorized';
        expenseCatSums[catId] = (expenseCatSums[catId] || 0) + t.amount;
      });

    const sortedExpenseCats = Object.entries(expenseCatSums)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topExpenses: TopCategoryInsight[] = sortedExpenseCats.map(([catId, amt]) => {
      const catObj = categoryMap.get(catId);
      return {
        id: catId,
        name: catObj ? catObj.name : 'Lainnya / Tanpa Kategori',
        amount: amt,
        percentage: totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0
      };
    });

    // 3. Top Kategori Pendapatan (Top 3)
    const incomeCatSums: Record<string, number> = {};
    monthTxs
      .filter(t => t.type === 'pendapatan')
      .forEach(t => {
        const catId = t.categoryId || 'uncategorized';
        incomeCatSums[catId] = (incomeCatSums[catId] || 0) + t.amount;
      });

    const topIncomes: TopCategoryInsight[] = Object.entries(incomeCatSums)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([catId, amt]) => {
        const catObj = categoryMap.get(catId);
        return {
          id: catId,
          name: catObj ? catObj.name : 'Pemasukan Lainnya',
          amount: amt,
          percentage: totalIncome > 0 ? Math.round((amt / totalIncome) * 100) : 0
        };
      });

    // 4. Aset Paling Aktif (Top 3 by Tx Count)
    const assetTxCounts: Record<string, number> = {};
    monthTxs.forEach(t => {
      if (t.assetId) assetTxCounts[t.assetId] = (assetTxCounts[t.assetId] || 0) + 1;
      if (t.fromAssetId) assetTxCounts[t.fromAssetId] = (assetTxCounts[t.fromAssetId] || 0) + 1;
      if (t.toAssetId) assetTxCounts[t.toAssetId] = (assetTxCounts[t.toAssetId] || 0) + 1;
    });

    const topAssets: ActiveAssetInsight[] = Object.entries(assetTxCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([assetId, count]) => {
        const assetObj = assets.find(a => a.id === assetId);
        return {
          id: assetId,
          name: assetObj ? assetObj.name : 'Aset',
          type: assetObj ? assetObj.type : 'Cash',
          txCount: count,
          balance: getAssetBalance(assetId)
        };
      });

    // 5. Health Score & Findings
    const findings: string[] = [];
    let score = 100;

    const startMonthObj = new Date(startDateStr);
    const vM = startMonthObj.getMonth();
    const vY = startMonthObj.getFullYear();

    const activeBudgets = budgets.filter(b => b.month === vM && b.year === vY && b.categoryId !== null);
    let overBudgetCount = 0;
    let warningBudgetCount = 0;

    activeBudgets.forEach(b => {
      const catObj = b.categoryId ? categoryMap.get(b.categoryId) : undefined;
      if (catObj) {
        const catSpent = monthTxs
          .filter(t => t.type === 'pengeluaran' && t.categoryId === b.categoryId)
          .reduce((sum, t) => sum + t.amount, 0);

        if (b.limit > 0) {
          const ratio = catSpent / b.limit;
          if (ratio >= 1.0) {
            findings.push(`Anggaran ${catObj.name} melebihi limit (+${Math.round((ratio - 1) * 100)}%).`);
            overBudgetCount++;
          } else if (ratio >= 0.8) {
            findings.push(`Anggaran ${catObj.name} hampir habis (${Math.round(ratio * 100)}%).`);
            warningBudgetCount++;
          }
        }
      }
    });

    score -= (overBudgetCount * 15) + (warningBudgetCount * 5);

    if (totalIncome > 0 && totalExpense > totalIncome) {
      findings.push(`Defisit arus kas sebesar ${formatCurrency(totalExpense - totalIncome, currencySymbol)}.`);
      score -= 20;
    } else if (totalIncome > 0 && savingsRate >= 20) {
      findings.push(`Berhasil menabung ${savingsRate}% dari total pemasukan.`);
      score += 10;
    }

    const liquidBalance = assets
      .filter(a => !a.isDeleted && ['Cash', 'Bank Account', 'eWallet'].includes(a.type))
      .reduce((sum, a) => sum + getAssetBalance(a.id), 0);

    if (totalExpense > 0 && liquidBalance > 0) {
      const runway = liquidBalance / totalExpense;
      if (runway >= 3) {
        findings.push(`Bantalan dana darurat aman (~${runway.toFixed(1)} bulan).`);
      } else {
        findings.push(`Bantalan dana darurat perlu diperkuat (~${runway.toFixed(1)} bulan).`);
        score -= 15;
      }
    }

    if (findings.length === 0) {
      if (monthTxs.length === 0) {
        findings.push("Belum ada transaksi bulan ini.");
      } else {
        findings.push("Arus kas sehat dan terkendali.");
      }
    }

    score = Math.max(0, Math.min(100, score));
    let statusText = "Sehat";
    let statusColor = "text-emerald-400";
    let statusBg = "bg-emerald-500/20";
    if (score < 50) {
      statusText = "Kritis";
      statusColor = "text-rose-400";
      statusBg = "bg-rose-500/20";
    } else if (score < 80) {
      statusText = "Waspada";
      statusColor = "text-amber-400";
      statusBg = "bg-amber-500/20";
    }

    let summarySentence = "";
    if (totalIncome > 0 && totalExpense > totalIncome) {
      summarySentence = `Pengeluaran bulan ini melebihi pemasukan sebesar ${formatCurrency(totalExpense - totalIncome, currencySymbol)}. Evaluasi kembali pos pengeluaran sekunder.`;
    } else if (overBudgetCount > 0) {
      summarySentence = `Terdapat ${overBudgetCount} kategori yang melebihi batas anggaran. Batasi pengeluaran di pos tersebut untuk menjaga kestabilan.`;
    } else if (savingsRate >= 20) {
      summarySentence = `Kinerja keuangan sangat baik! Kamu berhasil menyisihkan ${savingsRate}% pemasukan bulan ini.`;
    } else {
      summarySentence = "Kondisi keuangan bulan ini terpantau stabil. Tetap pertahankan kebiasaan mencatat transaksi dengan disiplin.";
    }

    // 6. Budget Recommendations
    const budgetRecommendations: BudgetRecommendation[] = [];

    // Over budget recommendations
    activeBudgets.forEach(b => {
      if (!b.categoryId) return;
      const catObj = categoryMap.get(b.categoryId);
      if (!catObj) return;
      const spent = monthTxs
        .filter(t => t.type === 'pengeluaran' && t.categoryId === b.categoryId)
        .reduce((sum, t) => sum + t.amount, 0);

      if (b.limit > 0 && spent > b.limit) {
        const suggested = Math.ceil((spent * 1.1) / 50000) * 50000;
        budgetRecommendations.push({
          type: 'over_budget',
          categoryName: catObj.name,
          categoryId: b.categoryId,
          currentSpent: spent,
          budgetLimit: b.limit,
          suggestedLimit: suggested,
          message: `Anggaran ${catObj.name} terlewati (${formatCurrency(spent, currencySymbol)} / limit ${formatCurrency(b.limit, currencySymbol)}). Pertimbangkan naikkan limit ke ${formatCurrency(suggested, currencySymbol)} bulan depan.`
        });
      }
    });

    // Unbudgeted top expense recommendations
    topExpenses.forEach(exp => {
      const hasBudget = activeBudgets.some(b => b.categoryId === exp.id);
      if (!hasBudget && exp.amount > 0 && exp.id !== 'uncategorized') {
        const suggested = Math.ceil((exp.amount * 1.05) / 50000) * 50000;
        budgetRecommendations.push({
          type: 'missing_budget',
          categoryName: exp.name,
          categoryId: exp.id,
          currentSpent: exp.amount,
          suggestedLimit: suggested,
          message: `Kategori "${exp.name}" menyerap ${exp.percentage}% pengeluaran bulan ini (${formatCurrency(exp.amount, currencySymbol)}) namun belum memiliki budget. Disarankan buat budget ${formatCurrency(suggested, currencySymbol)}.`
        });
      }
    });

    return {
      daysToEOM,
      eomDateStr,
      startDateStr,
      endDateStr,
      monthYearLabel,
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      topExpenses,
      topIncomes,
      topAssets,
      score,
      statusText,
      statusColor,
      statusBg,
      findings: findings.slice(0, 4),
      summarySentence,
      budgetRecommendations: budgetRecommendations.slice(0, 3)
    };
  }, [financialDates, transactions, categories, assets, budgets, getAssetBalance, currencySymbol, categoryMap]);

  // Fetch AI Review from API (only for Pro users)
  const fetchAIReview = useCallback(async () => {
    if (!isPremium) return;
    if (aiReviewText || isAiLoading) return;

    const { allowed } = checkQuota('chat');
    if (!allowed) {
      setAiError('Quota AI habis');
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Berikan rangkuman evaluasi akhir bulan finansial (${insight.startDateStr} sampai ${insight.endDateStr}) dalam 3 poin singkat, padat, dan motivatif.`
          }],
          categories: categories.filter(c => !c.isDeleted),
          assets: assets
            .filter(a => !a.isDeleted && !['Credit Card', 'Loan'].includes(a.type))
            .map(a => ({ ...a, balance: getAssetBalance(a.id) })),
          transactions: [...transactions]
            .filter(t => !t.isDeleted && ['pengeluaran', 'pendapatan', 'transfer'].includes(t.type))
            .filter(t => t.date >= insight.startDateStr && t.date <= insight.endDateStr)
            .map(t => ({ type: t.type, amount: t.amount, categoryId: t.categoryId, note: t.note, date: t.date })),
          contacts: contacts.map(c => ({ name: c.name })),
          recurringTransactions: recurringTransactions.filter(rt => rt.isActive).map(rt => ({
            type: rt.type, amount: rt.amount, categoryId: rt.categoryId, frequency: rt.frequency
          })),
          subscriptions: subscriptions.filter(s => s.isActive).map(s => ({
            name: s.name, amount: s.amount, billingCycle: s.billingCycle
          })),
          budgetMode, monthlyIncome, zbbMode, startOfMonthDay: startOfMonthDay || 1,
          currentDate: getLocalDate(), currentTime: getLocalTime(), budgets, goals
        })
      });

      if (!response.ok) {
        throw new Error('Gagal mengambil analisis AI');
      }

      const data = await response.json();
      setAiReviewText(data.content || 'Evaluasi AI berhasil dimuat.');
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Gagal memuat evaluasi AI');
    } finally {
      setIsAiLoading(false);
    }
  }, [
    isPremium, aiReviewText, isAiLoading, checkQuota, insight, categories, assets, 
    transactions, contacts, recurringTransactions, subscriptions, budgetMode, 
    monthlyIncome, zbbMode, startOfMonthDay, budgets, goals, getAssetBalance
  ]);

  return {
    ...insight,
    isPremium,
    aiReviewText,
    isAiLoading,
    aiError,
    fetchAIReview
  };
}
