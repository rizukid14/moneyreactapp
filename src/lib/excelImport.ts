/**
 * excelImport.ts
 * Utilities for exporting a sample Excel template and parsing uploaded Excel files into transactions.
 */
import * as XLSX from 'xlsx';
import type { Transaction, Category, Asset } from '../contexts/MoneyContext';
import type { ExcelColumnMapping } from '../components/modals/ExcelMappingModal';

// ── Column definition (what the user sees in the Excel file) ──
export const EXCEL_COLUMNS = [
  'Tanggal',          // YYYY-MM-DD  e.g. 2025-04-20
  'Tipe',             // pengeluaran | pendapatan | transfer
  'Kategori',         // e.g. Makanan
  'Sub-Kategori',     // optional
  'Nominal',          // numeric e.g. 150000
  'Catatan',          // optional free text
  'Aset/Dompet',      // e.g. Dompet Tunai
  'Dari Aset',        // only for transfer
  'Ke Aset',          // only for transfer
];

const SAMPLE_ROWS = [
  ['2025-04-20', 'pengeluaran', 'Makanan', 'Makan Diluar', 50000,  'Makan siang',    'Dompet Tunai', '', ''],
  ['2025-04-20', 'pendapatan',  'Gaji',    '',             5000000, 'Gaji April',     'Dompet Tunai', '', ''],
  ['2025-04-21', 'pengeluaran', 'Transportasi', 'Bensin',  80000,  'Isi bensin motor','Dompet Tunai', '', ''],
  ['2025-04-22', 'transfer',    '',         '',             200000, 'Transfer ke tabungan', '', 'Dompet Tunai', 'Tabungan BCA'],
];

/** Download a sample .xlsx template with proper column headers and example rows */
export function downloadSampleExcel() {
  const wb = XLSX.utils.book_new();

  // Main sheet
  const data = [EXCEL_COLUMNS, ...SAMPLE_ROWS];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, // Tanggal
    { wch: 14 }, // Tipe
    { wch: 18 }, // Kategori
    { wch: 18 }, // Sub-Kategori
    { wch: 14 }, // Nominal
    { wch: 22 }, // Catatan
    { wch: 18 }, // Aset/Dompet
    { wch: 18 }, // Dari Aset
    { wch: 18 }, // Ke Aset
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');

  // Info sheet
  const info = XLSX.utils.aoa_to_sheet([
    ['=== PANDUAN IMPORT EXCEL ==='],
    [''],
    ['Kolom', 'Keterangan', 'Wajib?', 'Contoh'],
    ['Tanggal', 'Format YYYY-MM-DD', 'Ya', '2025-04-20'],
    ['Tipe', 'pengeluaran / pendapatan / transfer', 'Ya', 'pengeluaran'],
    ['Kategori', 'Nama kategori yang sudah ada di app', 'Ya*', 'Makanan'],
    ['Sub-Kategori', 'Nama sub-kategori (opsional)', 'Tidak', 'Makan Diluar'],
    ['Nominal', 'Angka tanpa titik/koma', 'Ya', '50000'],
    ['Catatan', 'Keterangan bebas', 'Tidak', 'Makan siang bersama'],
    ['Aset/Dompet', 'Untuk tipe pengeluaran/pendapatan', 'Ya*', 'Dompet Tunai'],
    ['Dari Aset', 'Hanya untuk tipe transfer', 'Ya*', 'Dompet Tunai'],
    ['Ke Aset', 'Hanya untuk tipe transfer', 'Ya*', 'Tabungan BCA'],
    [''],
    ['* Wajib sesuai kondisinya'],
    [''],
    ['CATATAN:'],
    ['- Jangan ubah nama kolom header (baris pertama)'],
    ['- Aset dan Kategori harus sudah terdaftar di aplikasi'],
    ['- Untuk transfer: isi "Dari Aset" dan "Ke Aset", kosongkan "Aset/Dompet" dan "Kategori"'],
  ]);
  info['!cols'] = [{ wch: 18 }, { wch: 42 }, { wch: 10 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, info, 'Panduan');

  XLSX.writeFile(wb, 'template-import-moneyapp.xlsx');
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/** Ekstrak baris pertama (Header) dari file Excel */
export async function extractExcelHeaders(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames.find(n => n !== 'Panduan') || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (raw.length < 1) return [];
  return (raw[0] as unknown[]).map(h => String(h).trim()).filter(h => h);
}

/** Parse an uploaded .xlsx / .xls / .csv file and return an array of transaction-like objects (Draft) */
export async function parseExcelFile(
  file: File,
  categories: Category[],
  assets: Asset[],
  mapping?: ExcelColumnMapping | 'bca' | 'mandiri'
): Promise<{ rows: Omit<Transaction, 'id'>[]; result: ImportResult }> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  // Use the first sheet that is not named "Panduan"
  const sheetName = wb.SheetNames.find(n => n !== 'Panduan') || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (raw.length < 2) {
    return { rows: [], result: { imported: 0, skipped: 0, errors: ['File kosong atau tidak ada data di sheet pertama.'] } };
  }

  // Find header row
  const header = (raw[0] as unknown[]).map(h => String(h).trim());
  const colIdx = (name: string) => header.findIndex(h => h === name);

  let iCol = -1, typeCol = -1, catCol = -1, subCol = -1, amtCol = -1, noteCol = -1, assetCol = -1, fromCol = -1, toCol = -1;

  if (typeof mapping === 'object' && mapping !== null) {
    iCol = colIdx(mapping.dateCol);
    typeCol = colIdx(mapping.typeCol);
    catCol = mapping.categoryCol ? colIdx(mapping.categoryCol) : -1;
    amtCol = colIdx(mapping.amountCol);
    noteCol = mapping.noteCol ? colIdx(mapping.noteCol) : -1;
    assetCol = mapping.assetCol ? colIdx(mapping.assetCol) : -1;
  } else if (mapping === 'bca') {
    // Standard BCA CSV mapping (Tanggal, Keterangan, Cabang, Jumlah, Saldo) - simplified
    iCol = colIdx('Tanggal');
    noteCol = colIdx('Keterangan');
    amtCol = colIdx('Mutasi'); // Sometimes named Mutasi or Jumlah
    if (amtCol === -1) amtCol = colIdx('Jumlah');
  } else if (mapping === 'mandiri') {
    iCol = colIdx('Tanggal');
    noteCol = colIdx('Keterangan');
    amtCol = colIdx('Nominal');
  } else {
    // Default Mapping
    iCol   = colIdx('Tanggal');
    typeCol = colIdx('Tipe');
    catCol  = colIdx('Kategori');
    subCol  = colIdx('Sub-Kategori');
    amtCol  = colIdx('Nominal');
    noteCol = colIdx('Catatan');
    assetCol = colIdx('Aset/Dompet');
    fromCol  = colIdx('Dari Aset');
    toCol    = colIdx('Ke Aset');
  }

  if (iCol === -1 || amtCol === -1) {
    return {
      rows: [],
      result: {
        imported: 0, skipped: 0,
        errors: ['Header kolom tidak cocok dengan mapping. Pastikan memilih kolom Tanggal dan Nominal.'],
      },
    };
  }

  const rows: Omit<Transaction, 'id'>[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    const rowNum = i + 1;

    const rawDate = row[iCol];
    let type = typeCol !== -1 ? String(row[typeCol] || '').trim().toLowerCase() : '';
    const catName = catCol !== -1 ? String(row[catCol] || '').trim() : '';
    const subName = subCol !== -1 ? String(row[subCol] || '').trim() : '';
    const amtRaw = row[amtCol];
    const note = noteCol !== -1 ? String(row[noteCol] || '').trim() : '';
    const assetName = assetCol !== -1 ? String(row[assetCol] || '').trim() : '';
    const fromName = fromCol !== -1 ? String(row[fromCol] || '').trim() : '';
    const toName = toCol !== -1 ? String(row[toCol] || '').trim() : '';

    // Skip empty rows
    if (!rawDate && !amtRaw && !note) { skipped++; continue; }

    // Validate type
    if (!['pengeluaran', 'pendapatan', 'transfer'].includes(type)) {
      errors.push(`Baris ${rowNum}: Tipe "${type}" tidak valid (harus pengeluaran/pendapatan/transfer)`);
      skipped++; continue;
    }

    // Parse date
    let dateStr = '';
    if (rawDate instanceof Date) {
      dateStr = rawDate.toISOString().split('T')[0];
    } else {
      const s = String(rawDate).trim();
      // Accept YYYY-MM-DD or serial number
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        dateStr = s;
      } else if (/^\d+$/.test(s)) {
        // Excel serial
        const d = XLSX.SSF.parse_date_code(Number(s));
        dateStr = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
      } else {
        errors.push(`Baris ${rowNum}: Format tanggal "${s}" tidak valid. Gunakan YYYY-MM-DD.`);
        skipped++; continue;
      }
    }

    // Parse amount and derive type for banks if type is missing
    let amountStr = String(amtRaw || '').trim();
    
    // Some banks use "CR" or "DB" in the amount or note, or negative numbers
    if (!type) {
      if (amountStr.includes('-') || amountStr.toUpperCase().includes('DB')) {
        type = 'pengeluaran';
      } else if (note.toUpperCase().includes('DB')) {
        type = 'pengeluaran';
      } else {
        type = 'pendapatan'; // default bank statements usually positive = in, negative = out. If no minus, assume in, unless it's a dedicated Mutasi column that doesn't use minus, we might need manual fixing in Draft.
        // Actually, let's just default to pengeluaran if it's BCA/Mandiri and no sign, because most people import expenses.
        if (mapping === 'bca' || mapping === 'mandiri') type = 'pengeluaran';
      }
    }
    
    const amount = Number(amountStr.replace(/[^0-9.]/g, ''));
    if (!amount || amount <= 0) {
      errors.push(`Baris ${rowNum}: Nominal "${amtRaw}" tidak valid.`);
      skipped++; continue;
    }

    // Validate type
    if (!['pengeluaran', 'pendapatan', 'transfer'].includes(type)) {
      type = 'pengeluaran'; // Fallback for draft
    }

    // Build transaction (Draft format: we don't strictly fail, we just pass what we know, and the BulkEditor will highlight missing things)
    if (type === 'transfer') {
      const fromAsset = assets.find(a => !a.isDeleted && a.name.toLowerCase() === fromName.toLowerCase());
      const toAsset   = assets.find(a => !a.isDeleted && a.name.toLowerCase() === toName.toLowerCase());
      rows.push({ 
        type: 'transfer', 
        amount, 
        categoryId: 'Transfer', 
        date: dateStr, 
        note, 
        fromAssetId: fromAsset?.id || '', 
        toAssetId: toAsset?.id || '' 
      });
    } else {
      const cat = categories.find(c => c.type === type && c.name.toLowerCase() === catName.toLowerCase() && !c.isDeleted) ||
                  categories.find(c => c.type === type && c.name.toLowerCase() === catName.toLowerCase());
      
      const asset = assets.find(a => !a.isDeleted && a.name.toLowerCase() === assetName.toLowerCase());
      const subCat = subName && cat?.subcategories?.find(s => s.name.toLowerCase() === subName.toLowerCase());
      
      rows.push({
        type: type as any,
        amount,
        categoryId: cat ? cat.name : (type === 'pengeluaran' ? 'Lain-lain' : 'Pemasukan Lainnya'),
        subCategoryId: subCat ? subCat.name : undefined,
        date: dateStr,
        note,
        assetId: asset?.id || '',
      });
    }
  }

  return {
    rows,
    result: { imported: rows.length, skipped, errors },
  };
}
