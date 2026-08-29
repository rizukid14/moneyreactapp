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

/**
 * Extracts top frequent & recent user merchant-to-category mappings from past transactions.
 * Dynamically generated from the user's personal IndexedDB records.
 */
export function extractUserHistoricalMappings(
  transactions: any[],
  categories: Category[],
  limit = 35
): { note: string; category: string; subCategory?: string }[] {
  if (!transactions || transactions.length === 0 || !categories) return [];

  const catMap = new Map<string, Category>();
  categories.forEach(c => catMap.set(c.id, c));

  const noteFreq = new Map<string, {
    rawNote: string;
    catId: string;
    subId?: string;
    count: number;
    lastDate: string;
  }>();

  // Process transactions from newest to oldest
  for (const tx of transactions) {
    if (tx.isDeleted || !tx.note || !tx.categoryId) continue;
    const cleaned = cleanMerchantNote(tx.note);
    if (!cleaned || cleaned.length < 2) continue;

    const key = cleaned.toLowerCase();
    const existing = noteFreq.get(key);
    if (existing) {
      existing.count += 1;
      if (tx.date && tx.date > existing.lastDate) {
        existing.lastDate = tx.date;
        existing.catId = tx.categoryId;
        existing.subId = tx.subCategoryId;
        existing.rawNote = cleaned;
      }
    } else {
      noteFreq.set(key, {
        rawNote: cleaned,
        catId: tx.categoryId,
        subId: tx.subCategoryId,
        count: 1,
        lastDate: tx.date || ''
      });
    }
  }

  // Sort by frequency and recency
  const sorted = Array.from(noteFreq.values())
    .sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate))
    .slice(0, limit);

  const results: { note: string; category: string; subCategory?: string }[] = [];

  for (const item of sorted) {
    const cat = catMap.get(item.catId);
    if (!cat) continue;

    let subName: string | undefined = undefined;
    if (item.subId && cat.subcategories) {
      const sub = cat.subcategories.find(s => s.id === item.subId);
      if (sub) subName = sub.name;
    }

    results.push({
      note: item.rawNote,
      category: cat.name,
      ...(subName ? { subCategory: subName } : {})
    });
  }

  return results;
}

/**
 * 100% Dynamic Category Matcher:
 * 1. Matches against the user's personal past transactions (Personal RAG / Memory).
 * 2. Matches against AI suggestions mapped to user's active categories.
 * 3. Matches if the transaction note directly mentions any category or subcategory created by the user.
 * 
 * NO static hardcoded keyword dictionaries. Everything is derived dynamically from user data.
 */
export function findBestCategoryMatch(
  suggestedCategory: string | undefined,
  suggestedSubCategory: string | undefined,
  note: string | undefined,
  categories: Category[],
  type: 'pengeluaran' | 'pendapatan' = 'pengeluaran',
  userTransactions?: any[]
): CategorySubMatch {
  const availableCats = categories.filter(c => c.type === type && !c.isDeleted);
  if (availableCats.length === 0) {
    return { categoryId: '', subCategoryId: '' };
  }

  const noteCleaned = cleanMerchantNote(note || '').toLowerCase();

  // 1. PERSONAL HISTORY MATCH (Highest Priority - 100% user-driven)
  if (noteCleaned && userTransactions && userTransactions.length > 0) {
    // 1a. Exact match on cleaned merchant note
    const exactHistory = userTransactions.find(
      t => !t.isDeleted && cleanMerchantNote(t.note || '').toLowerCase() === noteCleaned && t.categoryId
    );
    if (exactHistory) {
      const cat = availableCats.find(c => c.id === exactHistory.categoryId);
      if (cat) {
        let matchedSubId = '';
        if (exactHistory.subCategoryId && cat.subcategories) {
          const sub = cat.subcategories.find(s => !s.isDeleted && s.id === exactHistory.subCategoryId);
          if (sub) matchedSubId = sub.id;
        }
        return { categoryId: cat.id, subCategoryId: matchedSubId };
      }
    }

    // 1b. Fuzzy/Substring match on past transactions (e.g. "Kopi Kenangan" matches "Kopi Kenangan Mall X")
    const substringHistory = userTransactions.find(t => {
      if (t.isDeleted || !t.note || !t.categoryId) return false;
      const pastCleaned = cleanMerchantNote(t.note).toLowerCase();
      if (pastCleaned.length < 3) return false;
      return noteCleaned.includes(pastCleaned) || pastCleaned.includes(noteCleaned);
    });
    if (substringHistory) {
      const cat = availableCats.find(c => c.id === substringHistory.categoryId);
      if (cat) {
        let matchedSubId = '';
        if (substringHistory.subCategoryId && cat.subcategories) {
          const sub = cat.subcategories.find(s => !s.isDeleted && s.id === substringHistory.subCategoryId);
          if (sub) matchedSubId = sub.id;
        }
        return { categoryId: cat.id, subCategoryId: matchedSubId };
      }
    }
  }

  const suggCatLower = (suggestedCategory || '').trim().toLowerCase();
  const suggSubLower = (suggestedSubCategory || '').trim().toLowerCase();

  // 2. AI MATCH: Exact match on user's category name
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

  // 3. AI MATCH: Match suggestedSubCategory or suggestedCategory against all Subcategories of the user
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

  // 4. AI MATCH: Partial match on Category name
  if (suggCatLower) {
    const partialCat = availableCats.find(
      c => c.name.toLowerCase().includes(suggCatLower) || suggCatLower.includes(c.name.toLowerCase())
    );
    if (partialCat) {
      return { categoryId: partialCat.id, subCategoryId: '' };
    }
  }

  // 5. DIRECT NOTE MATCH: Check if note directly mentions any category or subcategory created by user
  if (noteCleaned) {
    // 5a. Match subcategories in note
    for (const cat of availableCats) {
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          if (!sub.isDeleted && sub.name.length >= 3 && noteCleaned.includes(sub.name.toLowerCase())) {
            return { categoryId: cat.id, subCategoryId: sub.id };
          }
        }
      }
    }

    // 5b. Match main categories in note
    for (const cat of availableCats) {
      if (cat.name.length >= 3 && noteCleaned.includes(cat.name.toLowerCase())) {
        return { categoryId: cat.id, subCategoryId: '' };
      }
    }
  }

  // 6. Default fallback to the user's first available category of matching type
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
