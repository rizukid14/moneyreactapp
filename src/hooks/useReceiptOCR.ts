import { useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';

const CLEAN_NUM_REGEX = /[.,]/g;
const KEYWORDS = ['total', 'jumlah', 'bayar', 'amount', 'harga', 'subtotal'];

export interface OCRResult {
  amount: number;
  date: string;
  rawText: string;
}

const parseReceiptText = (text: string) => {
  const lines = text.split('\n').map(l => l.trim().toLowerCase());
  let detectedAmount = 0;
  
  for (const line of lines) {
    if (KEYWORDS.some(k => line.includes(k))) {
      const numbers = line.match(/\d+[\d.,]*/g);
      if (numbers) {
        const cleanNum = (n: string) => parseInt(n.replace(CLEAN_NUM_REGEX, ''));
        const candidates = numbers.map(cleanNum).filter(n => n > 100);
        if (candidates.length > 0) {
          detectedAmount = Math.max(detectedAmount, ...candidates);
        }
      }
    }
  }

  if (detectedAmount === 0) {
    const allNumbers = text.match(/\b\d+[\d.,]*\b/g);
    if (allNumbers) {
      const cleanNum = (n: string) => parseInt(n.replace(CLEAN_NUM_REGEX, ''));
      const candidates = allNumbers.map(cleanNum).filter(n => n > 500 && n < 10000000);
      if (candidates.length > 0) {
        detectedAmount = Math.max(...candidates);
      }
    }
  }

  return {
    amount: detectedAmount,
    date: new Date().toISOString().split('T')[0]
  };
};

export const useReceiptOCR = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const scanReceipt = useCallback(async (file: File): Promise<OCRResult | null> => {
    setIsScanning(true);
    setError(null);
    setProgress(0);

    try {
      const worker = await createWorker('ind', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });
      
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const parsed = parseReceiptText(text);
      
      return {
        ...parsed,
        rawText: text
      };
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat memproses gambar.");
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  return { scanReceipt, isScanning, progress, error, setError };
};
