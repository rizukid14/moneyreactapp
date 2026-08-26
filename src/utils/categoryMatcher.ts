export interface CategorySubMatch {
  categoryId: string;
  subCategoryId: string;
}

export interface SubCategory {
  id: string;
  name: string;
  isDeleted?: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'pengeluaran' | 'pendapatan' | 'hutang_keluar' | 'hutang_masuk' | 'piutang_keluar' | 'piutang_masuk' | string;
  subcategories?: SubCategory[];
  isDeleted?: boolean;
}

// Map of common keywords to candidate category/subcategory names
const KEYWORD_MAP: Record<string, string[]> = {
  laundry: ['belanja', 'tagihan', 'kebersihan', 'jasa', 'layanan', 'rumah tangga', 'operasional'],
  cuci: ['belanja', 'tagihan', 'kebersihan', 'jasa', 'layanan', 'rumah tangga'],
  wash: ['belanja', 'tagihan', 'kebersihan', 'jasa'],
  dryclean: ['belanja', 'tagihan', 'kebersihan', 'jasa'],
  pln: ['tagihan', 'utilitas', 'rumah tangga'],
  listrik: ['tagihan', 'utilitas', 'rumah tangga'],
  pdam: ['tagihan', 'utilitas', 'rumah tangga'],
  air: ['tagihan', 'utilitas', 'rumah tangga'],
  pulsa: ['tagihan', 'komunikasi', 'operasional'],
  internet: ['tagihan', 'komunikasi', 'operasional'],
  wifi: ['tagihan', 'komunikasi', 'operasional'],
  indomaret: ['makanan', 'belanja', 'groceries', 'kebutuhan'],
  alfamart: ['makanan', 'belanja', 'groceries', 'kebutuhan'],
  supermarket: ['makanan', 'belanja', 'groceries', 'kebutuhan'],
  gojek: ['transportasi', 'makanan'],
  grab: ['transportasi', 'makanan'],
  bensin: ['transportasi'],
  pertamina: ['transportasi'],
  parkir: ['transportasi'],
};

/**
 * Robustly matches AI suggested category/subcategory or raw transaction text
 * to the best available user category and subcategory.
 */
export function findBestCategoryMatch(
  suggestedCategory: string | undefined,
  suggestedSubCategory: string | undefined,
  note: string | undefined,
  categories: Category[],
  type: 'pengeluaran' | 'pendapatan' = 'pengeluaran'
): CategorySubMatch {
  const availableCats = categories.filter(c => c.type === type && !c.isDeleted);
  if (availableCats.length === 0) {
    return { categoryId: '', subCategoryId: '' };
  }

  const suggCatLower = (suggestedCategory || '').trim().toLowerCase();
  const suggSubLower = (suggestedSubCategory || '').trim().toLowerCase();
  const noteLower = (note || '').trim().toLowerCase();

  // 1. Exact match on main Category name
  if (suggCatLower) {
    const exactCat = availableCats.find(c => c.name.toLowerCase() === suggCatLower);
    if (exactCat) {
      let matchedSubId = '';
      if (suggSubLower && exactCat.subcategories) {
        const sub = exactCat.subcategories.find(s => !s.isDeleted && s.name.toLowerCase() === suggSubLower);
        if (sub) matchedSubId = sub.id;
      }
      return { categoryId: exactCat.id, subCategoryId: matchedSubId };
    }
  }

  // 2. Match suggestedSubCategory or suggestedCategory against Subcategories in all categories
  const targetSubName = suggSubLower || suggCatLower;
  if (targetSubName) {
    for (const cat of availableCats) {
      if (cat.subcategories && cat.subcategories.length > 0) {
        const matchedSub = cat.subcategories.find(
          s => !s.isDeleted && (
            s.name.toLowerCase() === targetSubName ||
            s.name.toLowerCase().includes(targetSubName) ||
            targetSubName.includes(s.name.toLowerCase())
          )
        );
        if (matchedSub) {
          return { categoryId: cat.id, subCategoryId: matchedSub.id };
        }
      }
    }
  }

  // 3. Partial match on Category name
  if (suggCatLower) {
    const partialCat = availableCats.find(
      c => c.name.toLowerCase().includes(suggCatLower) || suggCatLower.includes(c.name.toLowerCase())
    );
    if (partialCat) {
      return { categoryId: partialCat.id, subCategoryId: '' };
    }
  }

  // 4. Keyword Fallback Matching based on suggestedCategory or transaction note
  const textToTest = `${suggCatLower} ${suggSubLower} ${noteLower}`;
  for (const [kw, candidates] of Object.entries(KEYWORD_MAP)) {
    if (textToTest.includes(kw)) {
      // First check if any category or subcategory has kw directly in its name
      for (const cat of availableCats) {
        if (cat.name.toLowerCase().includes(kw)) {
          return { categoryId: cat.id, subCategoryId: '' };
        }
        if (cat.subcategories) {
          const kwSub = cat.subcategories.find(s => !s.isDeleted && s.name.toLowerCase().includes(kw));
          if (kwSub) {
            return { categoryId: cat.id, subCategoryId: kwSub.id };
          }
        }
      }

      // Check against candidate category names
      for (const candidate of candidates) {
        const candCat = availableCats.find(c => c.name.toLowerCase().includes(candidate));
        if (candCat) {
          // Check if candCat has a subcategory matching any keyword
          let subId = '';
          if (candCat.subcategories) {
            const sub = candCat.subcategories.find(s => !s.isDeleted && (s.name.toLowerCase().includes(kw) || s.name.toLowerCase().includes(candidate)));
            if (sub) subId = sub.id;
          }
          return { categoryId: candCat.id, subCategoryId: subId };
        }
      }
    }
  }

  // 5. Default fallback to first category of matching type if available
  return { categoryId: availableCats[0]?.id || '', subCategoryId: '' };
}

/**
 * Strips out generic bank mutation / payment prefixes and suffixes
 * (e.g. "PEMBAYARAN QRIS KOPI KENANGAN DB" -> "Kopi Kenangan").
 */
export function cleanMerchantNote(rawNote: string): string {
  if (!rawNote) return '';
  let cleaned = rawNote.trim();

  // Strip generic payment prefixes (case-insensitive)
  cleaned = cleaned
    .replace(/^(pembayaran\s+qris\s+(ke|via)?|qris\s+(pembayaran|transfer|payment)?\s+(ke|via)?|transfer\s+qris\s+(ke)?|qris\s*[-/:]?|payment\s+qris\s*[-/:]?|transaksi\s+qris\s*[-/:]?)/i, '')
    .trim();

  // Strip trailing transaction indicators (DB, CR)
  cleaned = cleaned.replace(/\s+(db|cr)$/i, '').trim();

  // If the result is non-empty and not just a leftover generic term, return cleaned
  if (cleaned && !/^(pembayaran\s*qris|qris|transfer)$/i.test(cleaned)) {
    return cleaned;
  }

  return rawNote.trim();
}
