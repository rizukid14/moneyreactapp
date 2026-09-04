import * as XLSX from 'xlsx';
import type { Transaction, Asset, Category } from '../contexts/MoneyContext';
import { MONTH_NAMES } from './constants';
import { getLocalDate } from './utils';

export interface AssetWithBalance extends Asset {
  balance: number;
}

export interface ExportDataParams {
  transactions: Transaction[];
  assets: AssetWithBalance[];
  categories: Category[];
  currentMonthIncome: number;
  currentMonthExpense: number;
  netSavings: number;
  viewDate: Date;
}

export const exportMonthDataToExcel = ({
  transactions,
  assets,
  categories,
  currentMonthIncome,
  currentMonthExpense,
  netSavings,
  viewDate
}: ExportDataParams) => {
  const wb = XLSX.utils.book_new();

  const monthName = MONTH_NAMES[viewDate.getMonth()];
  const year = viewDate.getFullYear();

  // Helper for Category Name
  const getCategoryName = (id: string, type: string, subId?: string) => {
    if (type === 'transfer') return 'Transfer';
    const cat = categories.find(c => c.id === id) || categories.find(c => c.name === id);
    if (!cat) return 'Lainnya';
    let name = cat.name;
    if (subId) {
      const sub = cat.subcategories?.find(s => s.id === subId) || cat.subcategories?.find(s => s.name === subId);
      if (sub) name += ` - ${sub.name}`;
    }
    return name;
  };

  // Helper for Asset Name
  const getAssetName = (id: string) => {
    const a = assets.find(a => a.id === id);
    return a ? a.name : '-';
  };

  // 1. Sheet "Ringkasan"
  const summaryData = [
    ['Ringkasan Keuangan', `${monthName} ${year}`],
    [],
    ['Total Pemasukan', currentMonthIncome],
    ['Total Pengeluaran', currentMonthExpense],
    ['Net/Selisih', netSavings],
    [],
    ['Kategori', 'Tipe', 'Total']
  ];

  // Calculate totals per category
  const categoryTotals: Record<string, { name: string; type: string; total: number }> = {};
  transactions.forEach(tx => {
    if (tx.type === 'transfer') return;
    const catName = getCategoryName(tx.categoryId || '', tx.type);
    const key = `${tx.type}-${catName}`;
    if (!categoryTotals[key]) {
      categoryTotals[key] = { name: catName, type: tx.type === 'pengeluaran' ? 'Pengeluaran' : 'Pemasukan', total: 0 };
    }
    categoryTotals[key].total += Number(tx.amount);
  });

  const sortedCategories = Object.values(categoryTotals).sort((a, b) => b.total - a.total);
  sortedCategories.forEach(cat => {
    summaryData.push([cat.name, cat.type, cat.total]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Format widths
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');


  // 2. Sheet "Transaksi"
  const txHeaders = ['Tanggal', 'Tipe', 'Kategori', 'Aset Sumber', 'Aset Tujuan', 'Catatan', 'Nominal'];
  const txData = transactions
    .sort((a, b) => {
      if (a.date !== b.date) return a.date > b.date ? 1 : -1;
      return (a.time || '') > (b.time || '') ? 1 : -1;
    })
    .map(tx => [
      `${tx.date} ${tx.time || ''}`.trim(),
      tx.type === 'pengeluaran' ? 'Pengeluaran' : tx.type === 'pendapatan' ? 'Pemasukan' : 'Transfer',
      getCategoryName(tx.categoryId || '', tx.type, tx.subCategoryId),
      tx.assetId ? getAssetName(tx.assetId) : (tx.fromAssetId ? getAssetName(tx.fromAssetId) : '-'),
      tx.toAssetId ? getAssetName(tx.toAssetId) : '-',
      tx.note || '',
      Number(tx.amount)
    ]);

  const wsTx = XLSX.utils.aoa_to_sheet([txHeaders, ...txData]);
  wsTx['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsTx, 'Transaksi');


  // 3. Sheet "Aset"
  const assetHeaders = ['Nama Aset', 'Tipe Aset', 'Saldo'];
  const assetData = assets
    .filter(a => !a.isDeleted)
    .sort((a, b) => b.balance - a.balance)
    .map(a => [
      a.name,
      a.type,
      a.balance
    ]);

  const wsAssets = XLSX.utils.aoa_to_sheet([assetHeaders, ...assetData]);
  wsAssets['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsAssets, 'Aset');

  // Trigger download
  XLSX.writeFile(wb, `Laporan_Keuangan_${monthName}_${year}.xlsx`);
};

export interface ExportAllParams {
  transactions: Transaction[];
  assets: AssetWithBalance[];
  categories: Category[];
}

export const exportAllDataToExcel = ({
  transactions,
  assets,
  categories,
}: ExportAllParams) => {
  const wb = XLSX.utils.book_new();

  // Helper for Category Name
  const getCategoryName = (id: string, type: string, subId?: string) => {
    if (type === 'transfer') return 'Transfer';
    const cat = categories.find(c => c.id === id) || categories.find(c => c.name === id);
    if (!cat) return 'Lainnya';
    let name = cat.name;
    if (subId) {
      const sub = cat.subcategories?.find(s => s.id === subId) || cat.subcategories?.find(s => s.name === subId);
      if (sub) name += ` - ${sub.name}`;
    }
    return name;
  };

  // Helper for Asset Name
  const getAssetName = (id: string) => {
    const a = assets.find(a => a.id === id);
    return a ? a.name : '-';
  };

  // 1. Sheet "Transaksi"
  const txHeaders = ['Tanggal', 'Tipe', 'Kategori', 'Aset Sumber', 'Aset Tujuan', 'Catatan', 'Nominal'];
  const txData = transactions
    .sort((a, b) => {
      if (a.date !== b.date) return a.date > b.date ? 1 : -1;
      return (a.time || '') > (b.time || '') ? 1 : -1;
    })
    .map(tx => [
      `${tx.date} ${tx.time || ''}`.trim(),
      tx.type === 'pengeluaran' ? 'Pengeluaran' : tx.type === 'pendapatan' ? 'Pemasukan' : 'Transfer',
      getCategoryName(tx.categoryId || '', tx.type, tx.subCategoryId),
      tx.assetId ? getAssetName(tx.assetId) : (tx.fromAssetId ? getAssetName(tx.fromAssetId) : '-'),
      tx.toAssetId ? getAssetName(tx.toAssetId) : '-',
      tx.note || '',
      Number(tx.amount)
    ]);

  const wsTx = XLSX.utils.aoa_to_sheet([txHeaders, ...txData]);
  wsTx['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsTx, 'Semua Transaksi');

  // 2. Sheet "Aset"
  const assetHeaders = ['Nama Aset', 'Tipe Aset', 'Saldo'];
  const assetData = assets
    .filter(a => !a.isDeleted)
    .sort((a, b) => b.balance - a.balance)
    .map(a => [
      a.name,
      a.type,
      a.balance
    ]);

  const wsAssets = XLSX.utils.aoa_to_sheet([assetHeaders, ...assetData]);
  wsAssets['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsAssets, 'Aset');

  // Trigger download
  const dateStr = getLocalDate();
  XLSX.writeFile(wb, `Backup_Data_Keuangan_${dateStr}.xlsx`);
};
