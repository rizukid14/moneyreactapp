import { useState, useCallback } from 'react';
import { getLocalDate } from '../lib/utils';

export interface ParsedTransaction {
  id: string; // temporary id for frontend listing
  type: 'pengeluaran' | 'pendapatan';
  amount: number;
  date: string;
  note: string;
  category: string;
  asset: string;
  subCategory?: string;
  selected: boolean;
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

export const useBulkParseAI = () => {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseData = useCallback(async ({
    text,
    imageBlob,
    categories,
    assets
  }: {
    text?: string;
    imageBlob?: Blob;
    categories?: any[];
    assets?: any[];
  }): Promise<ParsedTransaction[] | null> => {
    setIsParsing(true);
    setError(null);

    try {
      let imageBase64;
      if (imageBlob) {
        const resized = await resizeImage(imageBlob);
        imageBase64 = await blobToBase64(resized);
      }

      const response = await fetch('/api/bulk-parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text || '',
          image: imageBase64,
          categories: categories?.map(c => ({ name: c.name, subcategories: c.subcategories?.map((s: any) => ({ name: s.name })) })),
          assets: assets?.map(a => ({ name: a.name })),
          currentDate: getLocalDate()
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Gagal menghubungi server AI.');
      }

      const result = await response.json();

      if (!result.transactions || !Array.isArray(result.transactions)) {
        throw new Error('Format balasan dari AI tidak valid.');
      }

      // Map raw result to frontend model, guaranteeing 'selected' property
      const mappedTransactions: ParsedTransaction[] = result.transactions.map((item: any, index: number) => ({
        id: `bulk-${Date.now()}-${index}`,
        type: item.type === 'pendapatan' ? 'pendapatan' : 'pengeluaran',
        amount: item.amount || 0,
        date: item.date || getLocalDate(),
        note: item.note || '',
        category: item.category || '',
        subCategory: item.subCategory || '',
        asset: item.asset || '',
        selected: true
      }));

      return mappedTransactions;

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat analisa teks.');
      return null;
    } finally {
      setIsParsing(false);
    }
  }, []);

  return {
    parseData,
    isParsing,
    error,
    setError
  };
};
