import { useState, useCallback } from 'react';

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
          categories: categories?.map(c => ({ name: c.name })),
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
      
      // Ensure line items have the 'selected' property
      const mappedLineItems = (result.lineItems || []).map((item: any) => ({
        ...item,
        selected: true
      }));

      return {
        amount: result.amount || 0,
        date: result.date || new Date().toISOString().split('T')[0],
        rawText: result.rawText || "Parsed via Cloud AI",
        suggestedCategory: result.suggestedCategory || "",
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
