import { useState, useCallback } from 'react';
import { getLocalDate } from '../lib/utils';

export interface LineItem {
  name: string;
  amount: number;
  selected: boolean;
}

export interface OCRResult {
  merchantName?: string;
  amount: number;
  date: string;
  rawText: string;
  suggestedCategory: string;
  suggestedSubCategory?: string;
  suggestedAsset?: string; // New field for context matching
  lineItems: LineItem[];
  confidence: 'high' | 'medium' | 'low';
  debugLogs?: string[];
}

const resizeImage = (blob: Blob, maxWidth: number = 768): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxWidth) {
          width *= maxWidth / height;
          height = maxWidth;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.6);
    };
  });
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const useReceiptOCR = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Scans a receipt image using Cloud AI.
   * @param imageBlob The receipt photo.
   * @param categories Optional list of user's categories for matching.
   * @param assets Optional list of user's assets (payment methods) for matching.
   */
  const scanReceipt = useCallback(async (
    imageBlob: Blob, 
    categories?: any[], 
    assets?: any[]
  ): Promise<OCRResult | null> => {
    const logs: string[] = [];
    const addLog = (m: string) => { 
      logs.push(`[${new Date().toLocaleTimeString()}] ${m}`); 
      console.log(m); 
    };
    
    setIsScanning(true); 
    setError(null); 
    setProgress(0);
    addLog("Menghubungkan ke Cloud AI...");

    try {
      setProgress(20);
      const resizedBlob = await resizeImage(imageBlob);
      const base64 = await blobToBase64(resizedBlob);
      addLog(`Gambar dioptimalkan (max 1024px) & dikonversi.`);
      
      setProgress(40);
      addLog("Mengirim data ke AI Server (OpenAI)...");
      
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          image: base64,
          categories: categories?.map(c => ({ name: c.name, subcategories: c.subcategories?.map((s:any) => s.name) })),
          assets: assets?.map(a => ({ name: a.name })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Gagal menghubungi server AI.');
      }

      setProgress(80);
      const result = await response.json();
      addLog("Data berhasil diterima dari Cloud AI.");

      setProgress(100);
      
      // Items come from AI with their base prices
      const validItems = (result.lineItems || []).filter((item: any) => {
        const amt = typeof item.amount === 'number' ? item.amount : 0;
        return amt > 0 && item.name;
      });

      const itemsSubtotal = validItems.reduce((sum: number, i: any) => sum + i.amount, 0);
      const grandTotal = typeof result.amount === 'number' ? result.amount : 0;
      
      let mappedLineItems: LineItem[];

      // Calculate the specific gap confirmed as tax/service minus discount
      const taxAndFees = typeof result.totalTaxAndFees === 'number' ? result.totalTaxAndFees : 0;
      const discount = typeof result.totalDiscount === 'number' ? result.totalDiscount : 0;
      const explicitTaxGap = Math.max(0, taxAndFees - discount); // Ensure gap to distribute isn't negative
      


      if (explicitTaxGap > 0 && itemsSubtotal > 0) {
        // Distribute ONLY the explicit tax/fee gap proportionally
        let distributed = 0;
        mappedLineItems = validItems.map((item: any, idx: number) => {
          const isLast = idx === validItems.length - 1;
          const share = isLast
            ? explicitTaxGap - distributed
            : Math.round((item.amount / itemsSubtotal) * explicitTaxGap);
          distributed += share;
          return {
            name: item.name,
            amount: Math.max(0, Math.round(item.amount + share)), // Ensure no negative amounts
            selected: true,
          };
        });
      } else {
        mappedLineItems = validItems.map((item: any) => ({
          name: item.name,
          amount: Math.round(item.amount),
          selected: true,
        }));
      }

      // Check if there's still a gap between the mapped items and the grand total
      // This indicates missing/unread items by the OCR
      const finalItemsSum = mappedLineItems.reduce((sum, i) => sum + i.amount, 0);
      if (grandTotal > finalItemsSum + 100) { // +100 for rounding safety
        const missingAmount = grandTotal - finalItemsSum;
        mappedLineItems.push({
          name: "Item Tidak Terbaca (Scan Kurang Jelas)",
          amount: missingAmount,
          selected: true,
        });
      }

      return {
        merchantName: result.merchantName || "",
        amount: result.amount || 0,
        date: result.date || getLocalDate(),
        rawText: result.rawText || "Parsed via Cloud AI",
        suggestedCategory: result.suggestedCategory || "",
        suggestedSubCategory: result.suggestedSubCategory || "",
        suggestedAsset: result.suggestedAsset || "",
        lineItems: mappedLineItems,
        confidence: result.confidence || 'medium',
        debugLogs: logs
      };

    } catch (err: any) {
      addLog(`Error: ${err.message}`);
      setError(err.message || 'Terjadi kesalahan saat pemindaian cloud.');
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  return { 
    scanReceipt, 
    isScanning, 
    isInitializing: false, // Legacy for UI compatibility
    progress, 
    error, 
    setError 
  };
};
