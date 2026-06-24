import { useState, useCallback } from 'react';
import { getLocalDate } from '../lib/utils';
import { resizeImage, blobToBase64 } from '../lib/imageUtils';

export interface ParsedTransaction {
  id: string; // temporary id for frontend listing
  type: 'pengeluaran' | 'pendapatan' | 'transfer';
  amount: number;
  date: string;
  note: string;
  categoryId: string;
  category?: string;
  asset: string;
  subCategoryId?: string;
  subCategory?: string;
  selected: boolean;
  fromAsset?: string;
  toAsset?: string;
  adminFee?: number;
  adminFeeTarget?: 'sender' | 'receiver';
}



export const useBulkParseAI = () => {
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const parseData = useCallback(async ({
    text,
    imageBlob,
    categories,
    assets,
    defaultAssetId
  }: {
    text?: string;
    imageBlob?: Blob;
    categories?: any[];
    assets?: any[];
    defaultAssetId?: string
  }): Promise<ParsedTransaction[] | null> => {
    setIsParsing(true);
    setError(null);
    setProgress(0);

    try {
      let imageBase64;
      if (imageBlob) {
        setProgress(20);
        const resized = await resizeImage(imageBlob);
        imageBase64 = await blobToBase64(resized);
      }

      setProgress(40);
      
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 80) return prev + 5;
          return prev;
        });
      }, 500);

      let response;
      try {
        response = await fetch('/api/bulk-parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text || '',
            image: imageBase64,
            categories: categories
              ?.filter(c => !c.isDeleted)
              .map(c => ({ 
                name: c.name, 
                subcategories: c.subcategories
                  ?.filter((s: any) => !s.isDeleted)
                  .map((s: any) => ({ name: s.name })) 
              })),
            assets: assets?.map(a => ({ name: a.name, id: a.id })),
            defaultAssetId,
            currentDate: getLocalDate()
          }),
        });
      } finally {
        clearInterval(progressInterval);
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Gagal menghubungi server AI.');
      }

      setProgress(90);
      const result = await response.json();

      if (!result.transactions || !Array.isArray(result.transactions)) {
        throw new Error('Format balasan dari AI tidak valid.');
      }

      // Map raw result to frontend model, guaranteeing 'selected' property
      const mappedTransactions: ParsedTransaction[] = result.transactions.map((item: any, index: number) => {
        let type: 'pengeluaran' | 'pendapatan' | 'transfer' = 'pengeluaran';
        if (item.type === 'pendapatan') type = 'pendapatan';
        if (item.type === 'transfer') type = 'transfer';

        return {
          id: `bulk-${Date.now()}-${index}`,
          type,
          amount: item.amount || 0,
          date: item.date || getLocalDate(),
          note: item.note || '',
          categoryId: item.category || '',
          subCategory: item.subCategory || '',
          asset: item.asset || '',
          fromAsset: item.fromAsset || '',
          toAsset: item.toAsset || '',
          adminFee: item.adminFee || 0,
          adminFeeTarget: item.adminFeeTarget === 'receiver' ? 'receiver' : 'sender',
          selected: true
        };
      });

      setProgress(100);
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
    progress,
    error,
    setError
  };
};
