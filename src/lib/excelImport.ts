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
    ['Tanggal', 'Format YYYY-MM-DD atau YYYY-MM-DD HH:mm', 'Ya', '2025-04-20 14:30'],
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

/** Parse date string or Date object with optional time into { date: YYYY-MM-DD, time?: HH:mm } */
export function parseDateAndOptionalTime(rawDate: unknown): { date: string; time?: string } | null {
  if (!rawDate && rawDate !== 0) return null;

  if (rawDate instanceof Date) {
    if (isNaN(rawDate.getTime())) return null;
    const yyyy = rawDate.getFullYear();
    const mm = String(rawDate.getMonth() + 1).padStart(2, '0');
    const dd = String(rawDate.getDate()).padStart(2, '0');
    const date = `${yyyy}-${mm}-${dd}`;
    const hh = String(rawDate.getHours()).padStart(2, '0');
    const min = String(rawDate.getMinutes()).padStart(2, '0');
    const time = (rawDate.getHours() !== 0 || rawDate.getMinutes() !== 0) ? `${hh}:${min}` : undefined;
    return { date, time };
  }

  const s = String(rawDate).trim();
  if (!s) return null;

  // 1. Matches YYYY-MM-DD or YYYY/MM/DD with optional time e.g. "2026-09-02 15:30:00", "2026-09-02 15:30", "2026-09-02"
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const yyyy = isoMatch[1];
    const mm = isoMatch[2].padStart(2, '0');
    const dd = isoMatch[3].padStart(2, '0');
    const time = (isoMatch[4] !== undefined && isoMatch[5] !== undefined)
      ? `${isoMatch[4].padStart(2, '0')}:${isoMatch[5]}`
      : undefined;
    return { date: `${yyyy}-${mm}-${dd}`, time };
  }

  // 2. Matches DD-MM-YYYY or DD/MM/YYYY with optional time e.g. "02/09/2026 15:30", "02-09-2026"
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    const time = (dmyMatch[4] !== undefined && dmyMatch[5] !== undefined)
      ? `${dmyMatch[4].padStart(2, '0')}:${dmyMatch[5]}`
      : undefined;
    return { date: `${yyyy}-${mm}-${dd}`, time };
  }

  // 3. Excel serial number (including fractional parts representing time)
  if (/^\d+(\.\d+)?$/.test(s)) {
    const num = Number(s);
    if (!isNaN(num) && num > 0) {
      const d = XLSX.SSF.parse_date_code(num);
      if (d) {
        const date = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
        const time = (d.H !== undefined && d.M !== undefined && (d.H !== 0 || d.M !== 0))
          ? `${String(d.H).padStart(2, '0')}:${String(d.M).padStart(2, '0')}`
          : undefined;
        return { date, time };
      }
    }
  }

  return null;
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

  // Use the transaction sheet, skipping summary and info sheets
  const validSheets = wb.SheetNames.filter(n => !['Panduan', 'Ringkasan', 'Aset'].includes(n));
  const sheetName = validSheets.find(n => n === 'Semua Transaksi' || n === 'Transaksi') || validSheets[0] || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (raw.length < 2) {
    return { rows: [], result: { imported: 0, skipped: 0, errors: ['File kosong atau tidak ada data di sheet transaksi.'] } };
  }

  // Find header row
  const header = (raw[0] as unknown[]).map(h => String(h).trim());
  const colIdx = (names: string | string[]) => {
    const list = Array.isArray(names) ? names : [names];
    for (const name of list) {
      const idx = header.findIndex(h => h.toLowerCase() === name.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  };

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
    amtCol = colIdx(['Mutasi', 'Jumlah']);
  } else if (mapping === 'mandiri') {
    iCol = colIdx('Tanggal');
    noteCol = colIdx('Keterangan');
    amtCol = colIdx('Nominal');
  } else {
    // Default Mapping (supports app exported format & template format)
    iCol     = colIdx(['Tanggal', 'Date', 'Waktu']);
    typeCol  = colIdx(['Tipe', 'Type', 'Jenis', 'Jenis Transaksi']);
    catCol   = colIdx(['Kategori', 'Category']);
    subCol   = colIdx(['Sub-Kategori', 'Sub Kategori', 'Subcategory', 'Sub-Category']);
    amtCol   = colIdx(['Nominal', 'Jumlah', 'Amount', 'Mutasi', 'Total']);
    noteCol  = colIdx(['Catatan', 'Keterangan', 'Note', 'Description', 'Deskripsi']);
    assetCol = colIdx(['Aset Sumber', 'Aset/Dompet', 'Aset', 'Dompet', 'Rekening', 'Dari Aset', 'Account']);
    fromCol  = colIdx(['Dari Aset', 'Aset Sumber', 'Dari Rekening', 'Sumber']);
    toCol    = colIdx(['Ke Aset', 'Aset Tujuan', 'Ke Rekening', 'Tujuan']);
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

  // Asset finder helper
  const findAsset = (name: string) => {
    if (!name || name === '-' || name.toLowerCase() === 'none') return undefined;
    return assets.find(a => !a.isDeleted && a.name.toLowerCase() === name.toLowerCase()) ||
           assets.find(a => a.name.toLowerCase() === name.toLowerCase());
  };

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    const rowNum = i + 1;

    const rawDate = row[iCol];
    let type = typeCol !== -1 ? String(row[typeCol] || '').trim().toLowerCase() : '';
    const rawCatName = catCol !== -1 ? String(row[catCol] || '').trim() : '';
    const rawSubName = subCol !== -1 ? String(row[subCol] || '').trim() : '';
    const amtRaw = row[amtCol];
    const note = noteCol !== -1 ? String(row[noteCol] || '').trim() : '';
    const rawAssetName = assetCol !== -1 ? String(row[assetCol] || '').trim() : '';
    const rawFromName = fromCol !== -1 ? String(row[fromCol] || '').trim() : (assetCol !== -1 ? String(row[assetCol] || '').trim() : '');
    const rawToName = toCol !== -1 ? String(row[toCol] || '').trim() : '';

    // Skip empty rows
    if (!rawDate && !amtRaw && !note) { skipped++; continue; }

    // Normalize type
    if (type === 'pemasukan' || type === 'income' || type === 'masuk') {
      type = 'pendapatan';
    } else if (type === 'pengeluaran' || type === 'expense' || type === 'keluar') {
      type = 'pengeluaran';
    } else if (type === 'transfer' || type === 'tf') {
      type = 'transfer';
    }

    // Parse date & optional time
    const parsedDate = parseDateAndOptionalTime(rawDate);
    if (!parsedDate) {
      errors.push(`Baris ${rowNum}: Format tanggal "${String(rawDate || '')}" tidak valid. Gunakan YYYY-MM-DD atau YYYY-MM-DD HH:mm.`);
      skipped++; continue;
    }
    const { date: dateStr, time: timeStr } = parsedDate;

    // Parse amount and derive type for banks if type is missing
    let amountStr = String(amtRaw || '').trim();
    
    if (!type) {
      if (amountStr.includes('-') || amountStr.toUpperCase().includes('DB')) {
        type = 'pengeluaran';
      } else if (note.toUpperCase().includes('DB')) {
        type = 'pengeluaran';
      } else {
        type = 'pendapatan';
        if (mapping === 'bca' || mapping === 'mandiri') type = 'pengeluaran';
      }
    }
    
    const amount = Number(amountStr.replace(/[^0-9.]/g, ''));
    if (!amount || amount <= 0) {
      errors.push(`Baris ${rowNum}: Nominal "${amtRaw}" tidak valid.`);
      skipped++; continue;
    }

    // Validate type fallback
    if (!['pengeluaran', 'pendapatan', 'transfer'].includes(type)) {
      type = 'pengeluaran';
    }

    // Parse and resolve Category & Sub-category
    let parsedMainCat = rawCatName;
    let parsedSubCat = rawSubName;

    // Auto-split combined format e.g. "Makanan - Makan Diluar" or "Makanan > Makan Diluar"
    if (parsedMainCat && !parsedSubCat && (parsedMainCat.includes(' - ') || parsedMainCat.includes(' > ') || parsedMainCat.includes(' / '))) {
      const parts = parsedMainCat.split(/ - | > | \/ /);
      if (parts.length >= 2) {
        parsedMainCat = parts[0].trim();
        parsedSubCat = parts.slice(1).join(' - ').trim();
      }
    }

    if (parsedMainCat === '-' || parsedMainCat.toLowerCase() === 'none') parsedMainCat = '';
    if (parsedSubCat === '-' || parsedSubCat.toLowerCase() === 'none') parsedSubCat = '';

    const cat = categories.find(c => c.type === type && c.name.toLowerCase() === parsedMainCat.toLowerCase() && !c.isDeleted) ||
                categories.find(c => c.name.toLowerCase() === parsedMainCat.toLowerCase() && !c.isDeleted) ||
                categories.find(c => c.type === type && c.name.toLowerCase() === parsedMainCat.toLowerCase()) ||
                categories.find(c => c.name.toLowerCase() === parsedMainCat.toLowerCase());

    const subCat = (parsedSubCat && cat?.subcategories?.find(s => s.name.toLowerCase() === parsedSubCat.toLowerCase())) || undefined;

    // Build transaction (Draft format)
    if (type === 'transfer') {
      const fromAsset = findAsset(rawFromName);
      const toAsset   = findAsset(rawToName);
      rows.push({ 
        type: 'transfer', 
        amount, 
        categoryId: undefined,
        date: dateStr, 
        time: timeStr,
        note, 
        fromAssetId: fromAsset?.id || '', 
        toAssetId: toAsset?.id || '' 
      });
    } else {
      const asset = findAsset(rawAssetName);
      rows.push({
        type: type as any,
        amount,
        categoryId: cat ? cat.id : '',
        subCategoryId: subCat ? subCat.id : undefined,
        date: dateStr,
        time: timeStr,
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
