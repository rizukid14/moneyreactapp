import React, { useState } from 'react';
import MaterialIcon from '../common/MaterialIcon';
import { Modal } from '../ui/Modal';
import type { HabitPreset } from '../../hooks/useTransactionPresets';
import { useTransactionPresets } from '../../hooks/useTransactionPresets';
import { useMoney } from '../../contexts/MoneyContext';
import CurrencyInput from '../common/CurrencyInput';

interface PresetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PresetManagerModal: React.FC<PresetManagerModalProps> = ({ isOpen, onClose }) => {
  const { pinnedPresets, habitPresets, togglePin, addManualPreset, removePreset, isPinned } = useTransactionPresets();
  const { categories, currencySymbol } = useMoney();
  
  const [activeTab, setActiveTab] = useState<'pinned' | 'suggested' | 'manual'>('pinned');

  // Manual Form State
  const [type, setType] = useState<'pengeluaran' | 'pendapatan' | 'transfer'>('pengeluaran');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  
  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    
    addManualPreset({
      type,
      label: label.trim(),
      amount: Number(amount.replace(/\./g, '')) || 0,
      categoryId: type !== 'transfer' ? categoryId : undefined,
      note: note.trim()
    });
    
    // Reset form and go back to pinned
    setLabel('');
    setAmount('');
    setNote('');
    setActiveTab('pinned');
  };

  const renderPresetItem = (preset: HabitPreset, isSuggested: boolean) => {
    const pinned = isPinned(preset);
    
    return (
      <div key={preset.id} className="flex items-center justify-between p-3 mb-2 bg-surface-container rounded-xl border border-outline-variant">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-label-lg text-on-surface">{preset.label}</span>
            {preset.isManual && (
              <span className="text-[10px] bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full font-bold">Manual</span>
            )}
          </div>
          <div className="text-sm text-on-surface-variant flex items-center gap-3">
            <span className={preset.type === 'pengeluaran' ? 'text-error' : preset.type === 'pendapatan' ? 'text-income' : 'text-primary'}>
              {preset.type === 'pengeluaran' ? '-' : preset.type === 'pendapatan' ? '+' : ''}
              {currencySymbol}{preset.amount.toLocaleString('id-ID')}
            </span>
            <span className="text-xs">{preset.type}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {isSuggested ? (
            <button
              type="button"
              onClick={() => togglePin(preset)}
              className={`p-2 rounded-full transition-colors ${pinned ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}
            >
              <MaterialIcon name={pinned ? 'push_pin' : 'push_pin'} className="text-lg" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => removePreset(preset.id)}
              className="p-2 rounded-full bg-error-container text-on-error-container hover:bg-error hover:text-on-error transition-colors"
            >
              <MaterialIcon name="delete" className="text-lg" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kelola Preset">
      <div className="flex gap-2 mb-4 bg-surface-container-low p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('pinned')}
          className={`flex-1 py-2 text-sm font-label-md rounded-lg transition-all ${activeTab === 'pinned' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}`}
        >
          Tersimpan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('suggested')}
          className={`flex-1 py-2 text-sm font-label-md rounded-lg transition-all ${activeTab === 'suggested' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}`}
        >
          Saran Otomatis
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-2 text-sm font-label-md rounded-lg transition-all ${activeTab === 'manual' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}`}
        >
          + Buat Baru
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
        {activeTab === 'pinned' && (
          <div>
            {pinnedPresets.length === 0 ? (
              <div className="text-center p-6 text-on-surface-variant">
                <MaterialIcon name="push_pin" className="text-4xl mb-2 opacity-50" />
                <p>Belum ada preset yang disimpan.</p>
                <p className="text-sm mt-1">Buka tab "Saran Otomatis" atau "Buat Baru".</p>
              </div>
            ) : (
              pinnedPresets.map(p => renderPresetItem(p, false))
            )}
          </div>
        )}

        {activeTab === 'suggested' && (
          <div>
            <p className="text-xs text-on-surface-variant mb-3 px-1">
              Preset di bawah ini dibuat otomatis berdasarkan transaksi yang paling sering Anda catat.
            </p>
            {habitPresets.length === 0 ? (
              <div className="text-center p-6 text-on-surface-variant">
                <MaterialIcon name="analytics" className="text-4xl mb-2 opacity-50" />
                <p>Belum cukup data transaksi.</p>
              </div>
            ) : (
              habitPresets.map(p => renderPresetItem(p, true))
            )}
          </div>
        )}

        {activeTab === 'manual' && (
          <form onSubmit={handleSaveManual} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tipe Transaksi</label>
              <div className="flex gap-2">
                {['pengeluaran', 'pendapatan', 'transfer'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t as any)}
                    className={`flex-1 py-2 text-sm rounded-lg border ${type === t ? 'border-primary bg-primary-container text-on-primary-container font-bold' : 'border-outline-variant text-on-surface-variant bg-surface-container-low hover:bg-surface-container'}`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Nama Label (Tombol)</label>
              <input
                required
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Contoh: Makan Siang, Bensin..."
                className="w-full p-3 bg-surface-container-low border-2 border-outline-variant rounded-lg text-on-surface focus:border-primary outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Nominal (Opsional)</label>
              <CurrencyInput
                placeholder="0"
                value={amount}
                onChange={setAmount}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '2px solid var(--border-color)', borderRadius: '8px' }}
              />
            </div>

            {type !== 'transfer' && (
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Kategori (Opsional)</label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full p-3 bg-surface-container-low border-2 border-outline-variant rounded-lg text-on-surface outline-none"
                >
                  <option value="">-- Tanpa Kategori --</option>
                  {categories.filter(c => c.type === type && !c.isDeleted).map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Catatan (Opsional)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Catatan transaksi..."
                className="w-full p-3 bg-surface-container-low border-2 border-outline-variant rounded-lg text-on-surface focus:border-primary outline-none transition-colors"
              />
            </div>

            <button type="submit" className="w-full py-3 bg-primary text-on-primary rounded-full font-bold mt-4 hover:bg-primary-dark transition-colors">
              Simpan Preset Manual
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};
