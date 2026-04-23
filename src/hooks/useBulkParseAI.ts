import { useState, useCallback } from 'react';

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

export const useBulkParseAI = () => {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseText = useCallback(async (
    text: string, 
    categories?: any[], 
    assets?: any[]
  ): Promise<ParsedTransaction[] | null> => {
    setIsParsing(true); 
    setError(null); 

    try {
      const response = await fetch('/api/bulk-parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text,
          categories: categories?.map(c => ({ name: c.name })),
          assets: assets?.map(a => ({ name: a.name })),
          currentDate: new Date().toISOString().split('T')[0]
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
        date: item.date || new Date().toISOString().split('T')[0],
        note: item.note || '',
        category: item.category || '',
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
    parseText, 
    isParsing, 
    error, 
    setError 
  };
};
