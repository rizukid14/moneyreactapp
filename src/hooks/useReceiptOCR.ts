import { useState, useCallback } from 'react';
import '@paddlejs/paddlejs-backend-webgl';
import * as ocr from '@paddlejs-models/ocr';

const TOTAL_KEYWORDS = ['total', 'jumlah', 'bayar', 'amount', 'harga', 'subtotal', 'grand total', 'tagihan'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const RESIZE_MAX_DIM = 1024;

const resizeImage = async (img: HTMLImageElement): Promise<HTMLCanvasElement | HTMLImageElement> => {
  if (img.width <= RESIZE_MAX_DIM && img.height <= RESIZE_MAX_DIM) return img;

  const canvas = document.createElement('canvas');
  let width = img.width;
  let height = img.height;

  if (width > height) {
    if (width > RESIZE_MAX_DIM) {
      height *= RESIZE_MAX_DIM / width;
      width = RESIZE_MAX_DIM;
    }
  } else {
    if (height > RESIZE_MAX_DIM) {
      width *= RESIZE_MAX_DIM / height;
      height = RESIZE_MAX_DIM;
    }
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return img;

  // Draw white background (especially for PNGs with transparency)
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  ctx.drawImage(img, 0, 0, width, height);

  // Apply subtle contrast/brightness boost to help OCR
  // This is a browser-supported CSS filter on canvas context
  try {
    const originalFilter = ctx.filter;
    ctx.filter = 'contrast(1.2) brightness(1.05) grayscale(0.2)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = originalFilter || 'none';
  } catch (e) {
    console.warn("Canvas filter not supported", e);
  }

  return canvas;
};

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
const cleanInt = (s: string) => {
  // Extract only digits from the string
  const digits = s.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

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

const PRICE_ONLY_REGEX = /^(?:rp\.?\s*)?(\d[\d.,]{2,})$/i;
const PRICE_INLINE_REGEX = /^(.+?)\s+(?:rp\.?\s*)?(\d[\d.,]{2,})\s*$/i;
const AMOUNT_MIN = 100;
const AMOUNT_MAX = 5_000_000;

const parseLineItems = (text: string): LineItem[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);
  const items: LineItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (TOTAL_KEYWORDS.some(kw => line.toLowerCase().includes(kw))) continue;

    // ── Format 1: "Item Name    12.000" on same line ──────────────────────────
    const inlineMatch = line.match(PRICE_INLINE_REGEX);
    if (inlineMatch) {
      const name = inlineMatch[1].replace(/x\d+/i, '').trim();
      const amount = cleanInt(inlineMatch[2]);
      if (amount >= AMOUNT_MIN && amount <= AMOUNT_MAX && name.length >= 2) {
        items.push({ name, amount, selected: true });
        continue;
      }
    }

    // ── Format 2: PaddleOCR produces name on line N, price on line N+1 ───────
    // Line looks like a name (not a price) + next line looks like a price
    if (!line.match(PRICE_ONLY_REGEX)) {
      const nextLine = lines[i + 1] || '';
      const nextIsPrice = nextLine.match(PRICE_ONLY_REGEX);
      if (nextIsPrice) {
        const name = line.replace(/x\d+/i, '').trim();
        const amount = cleanInt(nextIsPrice[1]);
        if (amount >= AMOUNT_MIN && amount <= AMOUNT_MAX && name.length >= 2) {
          items.push({ name, amount, selected: true });
          i++; // skip the price line so we don't process it again
          continue;
        }
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
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Look for more specific total keywords to avoid false positives
    if (TOTAL_KEYWORDS.some(k => line.includes(k))) {
      let numbers = line.match(/\d+[\d.,]*/g);
      
      // If no numbers on keyword line, check 2 lines below (sometimes it's a gap)
      if (!numbers) {
        for (let j = 1; j <= 2; j++) {
           if (i + j < lines.length) {
             const lookahead = lines[i + j];
             // If we hit another keyword, stop
             if (TOTAL_KEYWORDS.some(k => lookahead.includes(k))) break;
             numbers = lookahead.match(/\d+[\d.,]*/g);
             if (numbers) break;
           }
        }
      }

      if (numbers) {
        const candidates = numbers.map(cleanInt).filter(n => n >= 100);
        if (candidates.length > 0) {
          // If we found a candidate with keyword, it's high confidence
          // We prefer the largest number found near the keyword
          detectedAmount = Math.max(detectedAmount, ...candidates);
          highConfidence = true;
        }
      }
    }
  }

  // Fallback: find the largest number in the receipt if no keyword success
  if (detectedAmount === 0) {
    const allNumbers = text.match(/\d+[\d.,]*/g);
    if (allNumbers) {
      // Be more conservative in fallback: largest number between 1k and 10M
      const candidates = allNumbers.map(cleanInt).filter(n => n >= 1000 && n <= 10_000_000);
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
      if (!(window as any).__PADDLE_OCR_INITIALIZED__) {
        setIsInitializing(true);
        try {
          await ocr.init();
          (window as any).__PADDLE_OCR_INITIALIZED__ = true;
        } catch (initErr) {
          console.error("OCR Init failed", initErr);
          throw new Error("Gagal memuat mesin AI pemindai. Pastikan browser Anda mendukung WebGL.");
        } finally {
          setIsInitializing(false);
        }
      }
      
      setProgress(30);

      const imgUrl = URL.createObjectURL(imageBlob);
      const originalImg = new Image();
      originalImg.src = imgUrl;
      await new Promise((resolve, reject) => {
        originalImg.onload = resolve;
        originalImg.onerror = reject;
      });
      
      // Optimization: Resize image to prevent GPU context loss
      setProgress(50);
      const optimizedImg = await resizeImage(originalImg);
      
      const ocrResult = await ocr.recognize(optimizedImg);
      console.log("OCR Raw Result:", ocrResult); // Helpful for debugging exact model output
      URL.revokeObjectURL(imgUrl);
      
      setProgress(100);

      let text = '';
      if (typeof ocrResult === 'string') {
        text = ocrResult;
      } else if (Array.isArray(ocrResult)) {
        // format used by paddlejs-models: array of objects with .text property
        text = ocrResult
          .map((res: any) => {
            if (typeof res === 'string') return res;
            if (res && res.text) return String(res.text);
            return '';
          })
          .filter(Boolean)
          .join('\n');
      } else if (ocrResult && typeof ocrResult === 'object') {
        // format used by some other models/backends where { text: [...] }
        const r = ocrResult as any;
        if (Array.isArray(r.text)) {
          text = r.text.join('\n');
        } else {
          text = String(r.text || r.data || '');
        }
      }

      // Final fallback to ensure it is ALWAYS a string
      text = String(text || '');

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
