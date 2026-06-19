import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMoney } from '../contexts/MoneyContext';
import type { Transaction } from '../contexts/MoneyContext';

export type HabitPreset = {
  id: string;
  type: 'pengeluaran' | 'pendapatan' | 'transfer';
  label: string;
  amount: number;
  categoryId?: string;
  subCategoryId?: string;
  assetId?: string;
  fromAssetId?: string;
  toAssetId?: string;
  note?: string;
  isManual?: boolean;
};

// Generate a deterministic key for comparing generated presets with pinned presets
export const presetKey = (preset: HabitPreset) => JSON.stringify({
  type: preset.type,
  label: preset.label,
  amount: preset.amount,
  categoryId: preset.categoryId || '',
  subCategoryId: preset.subCategoryId || '',
  assetId: preset.assetId || '',
  fromAssetId: preset.fromAssetId || '',
  toAssetId: preset.toAssetId || '',
  note: (preset.note || '').trim().toLowerCase()
});

export const useTransactionPresets = () => {
  const { transactions, assets, categories } = useMoney();

  // Load pinned and custom presets from localStorage
  const [pinnedPresets, setPinnedPresets] = useState<HabitPreset[]>(() => {
    try {
      const raw = localStorage.getItem('tx_pinned_presets_v2');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  });

  // Backward compatibility with old format
  useEffect(() => {
    if (pinnedPresets.length === 0) {
      const oldRaw = localStorage.getItem('tx_pinned_presets');
      if (oldRaw) {
        try {
          // Old format was Record<'pengeluaran' | 'pendapatan' | 'transfer', string[]> of presetKeys
          // We can't fully reconstruct manual presets from just keys, but this is mainly for pinning
          // Since we changed the format to save the full object, we'll just let the new format take over
        } catch {}
      }
    }
    
    // Sync state across different instances of this hook (e.g. Transactions vs Modals)
    const handleSync = () => {
      try {
        const raw = localStorage.getItem('tx_pinned_presets_v2');
        if (raw) {
          setPinnedPresets(JSON.parse(raw));
        }
      } catch {}
    };
    
    window.addEventListener('tx_presets_changed', handleSync);
    return () => window.removeEventListener('tx_presets_changed', handleSync);
  }, [pinnedPresets.length]);

  const savePinnedPresets = (presets: HabitPreset[]) => {
    setPinnedPresets(presets);
    localStorage.setItem('tx_pinned_presets_v2', JSON.stringify(presets));
    window.dispatchEvent(new Event('tx_presets_changed'));
  };

  // Generate suggested habit presets from recent transactions
  const habitPresets = useMemo<HabitPreset[]>(() => {
    const txs = transactions.filter(t => t.amount > 0);
    if (txs.length === 0) return [];

    const map = new Map<string, { count: number; last: Transaction }>();

    txs.forEach(t => {
      let key = '';
      if (t.type === 'transfer') {
        key = `transfer|${t.fromAssetId || ''}|${t.toAssetId || ''}|${(t.note || '').trim().toLowerCase()}`;
      } else if (t.type === 'pengeluaran' || t.type === 'pendapatan') {
        key = `${t.type}|${t.categoryId || ''}|${t.subCategoryId || ''}|${t.assetId || ''}|${(t.note || '').trim().toLowerCase()}`;
      } else {
        return; // Ignore debts/receivables for now
      }

      const prev = map.get(key);
      if (!prev) map.set(key, { count: 1, last: t });
      else {
        const newer = (new Date(t.date).getTime() > new Date(prev.last.date).getTime()) ? t : prev.last;
        map.set(key, { count: prev.count + 1, last: newer });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => (b.count - a.count) || (new Date(b.last.date).getTime() - new Date(a.last.date).getTime()))
      .slice(0, 15) // Get top 15 frequent transactions
      .map((item, idx) => {
        const t = item.last;
        if (t.type === 'transfer') {
          const fromName = assets.find(a => a.id === t.fromAssetId)?.name || 'Dari';
          const toName = assets.find(a => a.id === t.toAssetId)?.name || 'Ke';
          return {
            id: `auto-tf-${idx}-${t.id}`,
            type: 'transfer',
            label: `${fromName} -> ${toName}`,
            amount: t.amount,
            fromAssetId: t.fromAssetId,
            toAssetId: t.toAssetId,
            note: t.note,
            isManual: false
          } as HabitPreset;
        }

        return {
          id: `auto-tx-${idx}-${t.id}`,
          type: t.type as 'pengeluaran' | 'pendapatan',
          label: (() => {
            const cat = categories.find(c => c.id === t.categoryId);
            const catName = cat?.name || t.categoryId || 'Unknown';
            const subName = t.subCategoryId ? (cat?.subcategories?.find(s => s.id === t.subCategoryId)?.name || t.subCategoryId) : '';
            return subName ? `${catName} > ${subName}` : catName;
          })(),
          amount: t.amount,
          categoryId: t.categoryId,
          subCategoryId: t.subCategoryId,
          assetId: t.assetId,
          note: t.note,
          isManual: false
        } as HabitPreset;
      });
  }, [transactions, assets]);

  const togglePin = useCallback((preset: HabitPreset) => {
    // If it has no ID (like from old format) or we need to match by content:
    const k = presetKey(preset);
    const existingIdx = pinnedPresets.findIndex(p => p.id === preset.id || presetKey(p) === k);

    if (existingIdx >= 0) {
      // Unpin
      const next = [...pinnedPresets];
      next.splice(existingIdx, 1);
      savePinnedPresets(next);
    } else {
      // Pin
      // Give it a stable ID if it doesn't have one
      const toAdd = { ...preset, id: preset.id || `pinned-${Date.now()}` };
      savePinnedPresets([toAdd, ...pinnedPresets]);
    }
  }, [pinnedPresets]);

  const addManualPreset = useCallback((preset: Omit<HabitPreset, 'id' | 'isManual'>) => {
    const newPreset: HabitPreset = {
      ...preset,
      id: `manual-${Date.now()}`,
      isManual: true
    };
    savePinnedPresets([newPreset, ...pinnedPresets]);
  }, [pinnedPresets]);

  const removePreset = useCallback((id: string) => {
    const next = pinnedPresets.filter(p => p.id !== id);
    savePinnedPresets(next);
  }, [pinnedPresets]);
  
  const updatePreset = useCallback((id: string, updated: Partial<HabitPreset>) => {
    const next = pinnedPresets.map(p => p.id === id ? { ...p, ...updated } : p);
    savePinnedPresets(next);
  }, [pinnedPresets]);

  const isPinned = useCallback((preset: HabitPreset) => {
    const k = presetKey(preset);
    return pinnedPresets.some(p => p.id === preset.id || presetKey(p) === k);
  }, [pinnedPresets]);

  return {
    habitPresets,
    pinnedPresets,
    togglePin,
    addManualPreset,
    removePreset,
    updatePreset,
    isPinned
  };
};
