import React, { useState } from 'react';
import { CheckCircle, Trash2, Plus, Folder, Wallet, Calculator, ChevronRight } from 'lucide-react';
import type { ParsedTransaction } from '../../hooks/useBulkParseAI';
import type { Category, Asset } from '../../contexts/MoneyContext';
import CategorySelectModal from '../modals/CategorySelectModal';
import AssetSelectModal from '../modals/AssetSelectModal';
import CalculatorModal from '../modals/CalculatorModal';
import { getLocalDate } from '../../lib/utils';

interface BulkResultsEditorProps {
  results: ParsedTransaction[];
  setResults: React.Dispatch<React.SetStateAction<ParsedTransaction[]>>;
  categories: Category[];
  assets: Asset[];
  currencySymbol: string;
  onSave: () => void;
}

interface ModalState {
  type: 'calculator' | 'category' | 'asset' | null;
  itemId: string | null;
}

const BulkResultsEditor: React.FC<BulkResultsEditorProps> = ({
  results, setResults, categories, assets, currencySymbol, onSave
}) => {
  const [modalState, setModalState] = useState<ModalState>({ type: null, itemId: null });

  const updateResult = (id: string, field: keyof ParsedTransaction, value: any) => {
    setResults(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const deleteResult = (id: string) => {
    setResults(prev => prev.filter(item => item.id !== id));
  };

  const addNewRow = () => {
    const newRow: ParsedTransaction = {
      id: `manual-${Date.now()}`,
      type: 'pengeluaran',
      amount: 0,
      date: getLocalDate(),
      note: '',
      category: '',
      subCategory: '',
      asset: '',
      selected: true
    };
    setResults(prev => [...prev, newRow]);
  };

  const activeAssets = assets.filter(a => !a.isDeleted);

  const activeItem = results.find(r => r.id === modalState.itemId);

  const openModal = (type: ModalState['type'], itemId: string) => {
    setModalState({ type, itemId });
  };
  const closeModal = () => setModalState({ type: null, itemId: null });

  const getCategoryLabel = (item: ParsedTransaction) => {
    if (!item.category) return '-- Pilih Kategori --';
    return item.subCategory ? `${item.category} > ${item.subCategory}` : item.category;
  };

  const getAssetLabel = (item: ParsedTransaction) => {
    const found = activeAssets.find(a => a.id === item.asset);
    return found ? found.name : '-- Pilih Rekening --';
  };

  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', background: 'var(--bg-main)',
    border: '1px solid var(--border-color)', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    cursor: 'pointer', textAlign: 'left', gap: '6px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <div className="card glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={24} color="var(--success)" />
          <span style={{ fontWeight: 700 }}>{results.length} Data Terbaca</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '80px' }}>
        {results.map((item) => (
          <div key={item.id} className="card" style={{
            padding: '12px',
            border: `2px solid ${item.selected ? 'var(--primary)' : 'transparent'}`,
            opacity: item.selected ? 1 : 0.6,
            transition: 'all 0.2s'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={(e) => updateResult(item.id, 'selected', e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={item.note}
                  onChange={(e) => updateResult(item.id, 'note', e.target.value)}
                  placeholder="Catatan"
                  style={{ flex: 1, fontSize: '14px', fontWeight: 600, padding: '4px 8px', border: '1px solid transparent', borderBottom: '1px solid var(--border-color)', background: 'transparent' }}
                />
              </div>
              <button onClick={() => deleteResult(item.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                <Trash2 size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {/* Amount */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nominal ({currencySymbol})</label>
                <button style={btnStyle} onClick={() => openModal('calculator', item.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calculator size={14} color="var(--primary)" />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: item.type === 'pengeluaran' ? 'var(--danger)' : 'var(--success)' }}>
                      {item.amount > 0 ? item.amount.toLocaleString('id-ID') : '0'}
                    </span>
                  </div>
                </button>
              </div>

              {/* Date */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tanggal</label>
                <input
                  type="date"
                  value={item.date}
                  onChange={(e) => updateResult(item.id, 'date', e.target.value)}
                  style={{ width: '100%', fontSize: '13px', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: 0 }}
                />
              </div>

              {/* Category - spans full width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Kategori</label>
                <button style={btnStyle} onClick={() => openModal('category', item.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Folder size={14} color="var(--primary)" />
                    <span style={{ fontSize: '13px', fontWeight: item.category ? 600 : 400, color: item.category ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {getCategoryLabel(item)}
                    </span>
                  </div>
                  <ChevronRight size={14} color="var(--text-muted)" />
                </button>
              </div>

              {/* Asset - spans full width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rekening/Dompet</label>
                <button style={btnStyle} onClick={() => openModal('asset', item.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wallet size={14} color="var(--primary)" />
                    <span style={{ fontSize: '13px', fontWeight: item.asset ? 600 : 400, color: item.asset ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {getAssetLabel(item)}
                    </span>
                  </div>
                  <ChevronRight size={14} color="var(--text-muted)" />
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addNewRow}
          style={{
            width: '100%', padding: '12px', background: 'none',
            border: '2px dashed var(--border-color)', borderRadius: '16px',
            color: 'var(--primary)', fontWeight: 700, fontSize: '13px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            cursor: 'pointer', marginTop: '8px'
          }}
        >
          <Plus size={16} /> Tambah Baris Manual
        </button>

        <button
          className="btn btn-primary"
          onClick={onSave}
          disabled={!results.some(r => r.selected) || results.filter(r => r.selected).some(r => !r.amount || !r.category || !r.asset)}
          style={{ width: '100%', marginTop: '16px', boxShadow: '0 4px 15px var(--primary-glow)' }}
        >
          Simpan Transaksi Terpilih
        </button>
      </div>

      {/* Modals */}
      <CalculatorModal
        isOpen={modalState.type === 'calculator'}
        onClose={closeModal}
        initialValue={activeItem?.amount}
        onConfirm={(val) => {
          if (modalState.itemId) updateResult(modalState.itemId, 'amount', val);
          closeModal();
        }}
      />

      {activeItem && (
        <CategorySelectModal
          isOpen={modalState.type === 'category'}
          onClose={closeModal}
          categories={categories}
          type={activeItem.type as 'pengeluaran' | 'pendapatan'}
          initialCategory={activeItem.category}
          initialSubCategory={activeItem.subCategory || ''}
          onSelect={(cat, sub) => {
            if (modalState.itemId) {
              updateResult(modalState.itemId, 'category', cat);
              updateResult(modalState.itemId, 'subCategory', sub);
            }
          }}
        />
      )}

      <AssetSelectModal
        isOpen={modalState.type === 'asset'}
        onClose={closeModal}
        assets={activeAssets}
        selectedAssetId={activeItem?.asset}
        onSelect={(id) => {
          if (modalState.itemId) updateResult(modalState.itemId, 'asset', id);
        }}
      />
    </div>
  );
};

export default BulkResultsEditor;
