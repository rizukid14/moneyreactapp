import { useState, useCallback } from 'react';
import * as ocr from '@paddlejs-models/ocr';

const CLEAN_NUM_REGEX = /[.,]/g;
const TOTAL_KEYWORDS = ['total', 'jumlah', 'bayar', 'amount', 'harga', 'subtotal', 'grand total', 'tagihan'];

export interface LineItem {
  name: string;
  amount: number;
  selected: boolean;
}

export interface OCRResult {
  amount: number;
  date: string;
  rawText: string;
  suggestedCategory: string;
  lineItems: LineItem[];
  confidence: 'high' | 'medium' | 'low';
}

// ─── Auto-Categorization Dictionary ─────────────────────────────────────────
const CATEGORY_MAP: Record<string, string[]> = {
  'Makanan': [
    'starbucks', 'kfc', 'mcdonalds', 'mcdonald', 'resto', 'restoran',
    'warung', 'cafe', 'kopi', 'gofood', 'grabfood', 'burger', 'pizza',
    'ayam', 'bakso', 'mie', 'nasi', 'soto', 'seafood', 'sushi', 'kuliner',
    'chatime', 'boba', 'milkshake', 'dunkin', 'bread', 'cake', 'bakery',
  ],
  'Transportasi': [
    'spbu', 'parkir', 'tol', 'gojek', 'grab', 'bensin', 'shell',
    'pertamina', 'vivo', 'solar', 'stasiun', 'commuter', 'busway',
    'taksi', 'taxi', 'ojek', 'damri',
  ],
  'Belanja': [
    'indomaret', 'alfamart', 'superindo', 'hypermart', 'tokopedia',
    'shopee', 'lazada', 'carrefour', 'lottemart', 'giant', 'hero',
    'toko', 'market', 'minimarket', 'swalayan',
  ],
  'Tagihan': [
    'pln', 'telkom', 'indihome', 'listrik', 'air', 'pdam', 'token',
    'wifi', 'internet', 'tv kabel', 'bpjs',
  ],
  'Kesehatan': [
    'apotik', 'apotek', 'kimia farma', 'klinik', 'rumah sakit', 'rs ',
    'dokter', 'obat', 'vitamin', 'suplemen',
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const cleanInt = (s: string) => parseInt(s.replace(CLEAN_NUM_REGEX, ''), 10);

const detectCategory = (text: string): string => {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return '';
};

const detectDate = (text: string): string => {
  // Try various date formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  const patterns = [
    /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,
    /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,
    /(\d{2})\s+(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)\s+(\d{4})/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      // Try to construct a valid date
      try {
        const raw = m[0];
        const parts = raw.split(/[\/\-\s]+/);
        if (parts.length === 3) {
          // Detect YYYY-MM-DD vs DD-MM-YYYY
          const a = parseInt(parts[0]);
          const b = parseInt(parts[1]);
          const c = parseInt(parts[2]);
          if (a > 31) return `${a}-${String(b).padStart(2,'0')}-${String(c).padStart(2,'0')}`;
          if (c > 31) return `${c}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`;
        }
      } catch { /* ignore */ }
    }
  }
  return new Date().toISOString().split('T')[0];
};

const parseLineItems = (text: string): LineItem[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
  const items: LineItem[] = [];
  const pricePattern = /^(.+?)\s+(?:rp\.?\s*)?(\d[\d.,]{2,})\s*$/i;

  for (const line of lines) {
    if (TOTAL_KEYWORDS.some(kw => line.toLowerCase().includes(kw))) continue;
    const match = line.match(pricePattern);
    if (match) {
      const name = match[1].replace(/x\d+/i, '').trim();
      const amount = cleanInt(match[2]);
      if (amount >= 100 && amount <= 5_000_000 && name.length >= 2) {
        items.push({ name, amount, selected: true });
      }
    }
  }

  return items;
};

const parseReceiptText = (text: string) => {
  const lines = text.split('\n').map(l => l.trim().toLowerCase());
  let detectedAmount = 0;
  let highConfidence = false;

  // Try keyword-based detection first (high confidence)
  for (const line of lines) {
    if (TOTAL_KEYWORDS.some(k => line.includes(k))) {
      const numbers = line.match(/\d+[\d.,]*/g);
      if (numbers) {
        const candidates = numbers.map(cleanInt).filter(n => n > 100);
        if (candidates.length > 0) {
          detectedAmount = Math.max(detectedAmount, ...candidates);
          highConfidence = true;
        }
      }
    }
  }

  // Fallback: find the largest number in the receipt
  if (detectedAmount === 0) {
    const allNumbers = text.match(/\b\d+[\d.,]*\b/g);
    if (allNumbers) {
      const candidates = allNumbers.map(cleanInt).filter(n => n > 500 && n < 10_000_000);
      if (candidates.length > 0) {
        detectedAmount = Math.max(...candidates);
      }
    }
  }

  const lineItems = parseLineItems(text);
  const suggestedCategory = detectCategory(text);
  const confidence: 'high' | 'medium' | 'low' = highConfidence ? 'high' : lineItems.length > 0 ? 'medium' : 'low';

  return {
    amount: detectedAmount,
    date: detectDate(text),
    lineItems,
    suggestedCategory,
    confidence,
  };
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
let paddleOcrInitialized = false;

export const useReceiptOCR = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const scanReceipt = useCallback(async (imageBlob: Blob): Promise<OCRResult | null> => {
    setIsScanning(true);
    setError(null);
    setProgress(0);

    try {
      if (!paddleOcrInitialized) {
        setIsInitializing(true);
        try {
          await ocr.init();
          paddleOcrInitialized = true;
        } catch (initErr) {
          console.error("OCR Init failed", initErr);
          throw new Error("Gagal memuat mesin AI pemindai. Pastikan browser Anda mendukung WebGL.");
        } finally {
          setIsInitializing(false);
        }
      }
      
      setProgress(50); // Engine is ready, scanning image...

      const imgUrl = URL.createObjectURL(imageBlob);
      const img = new Image();
      img.src = imgUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      const ocrResult = await ocr.recognize(img);
      URL.revokeObjectURL(imgUrl);
      
      setProgress(100);

      let text = '';
      if (Array.isArray(ocrResult)) {
        // format used by paddlejs-models
        text = ocrResult.map((res: any) => res.text || '').join('\n');
      } else if (ocrResult && typeof ocrResult === 'object') {
        text = (ocrResult as any).text || '';
      }

      const parsed = parseReceiptText(text);
      
      return {
        ...parsed,
        rawText: text,
      };
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses gambar.');
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  return { scanReceipt, isScanning, isInitializing, progress, error, setError };
};
