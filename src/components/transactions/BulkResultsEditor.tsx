import React, { useState } from 'react';
import { CheckCircle, Trash2, Plus, Folder, Wallet, Calculator, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ParsedTransaction } from '../../hooks/useBulkParseAI';
import type { Category, Asset } from '../../contexts/MoneyContext';
import CategorySelectModal from '../modals/CategorySelectModal';
import AssetSelectModal from '../modals/AssetSelectModal';
import CalculatorModal from '../modals/CalculatorModal';
import { getLocalDate } from '../../lib/utils';
import CurrencyInput from '../common/CurrencyInput';

interface BulkResultsEditorProps {
  results: ParsedTransaction[];
  setResults: React.Dispatch<React.SetStateAction<ParsedTransaction[]>>;
  categories: Category[];
  assets: Asset[];
  currencySymbol: string;
  onSave: (batchAssetId: string) => void;
  initialAssetId?: string;
  isMutation?: boolean;
}

interface ModalState {
  type: 'calculator' | 'category' | 'asset' | 'fromAsset' | 'toAsset' | null;
  itemId: string | null;
}

const BulkResultsEditor: React.FC<BulkResultsEditorProps> = ({
  results, setResults, categories, assets, currencySymbol, onSave, initialAssetId, isMutation = true
}) => {
  const [modalState, setModalState] = useState<ModalState>({ type: null, itemId: null });
  const [batchAssetId, setBatchAssetId] = useState(initialAssetId || '');
  const [isGlobalAssetModalOpen, setIsGlobalAssetModalOpen] = useState(false);

  // Sync with initialAssetId if it changes
  React.useEffect(() => {
    if (initialAssetId && !batchAssetId) {
      setBatchAssetId(initialAssetId);
    }
  }, [initialAssetId]);

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
      fromAsset: '',
      toAsset: '',
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

  const getAssetLabel = (assetId?: string, fallback = '-- Pilih Rekening --') => {
    if (!assetId) return fallback;
    const found = activeAssets.find(a => a.id === assetId);
    return found ? found.name : fallback;
  };

  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', background: 'var(--bg-main)',
    border: '1px solid var(--border-color)', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    cursor: 'pointer', textAlign: 'left', gap: '6px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={24} color="var(--success)" />
            <span style={{ fontWeight: 700 }}>{results.length} Data Terbaca</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
            {isMutation ? 'Rekening Sumber Mutasi' : 'Rekening Utama (Otomatis)'}
          </label>
          <button 
            style={{ ...btnStyle, padding: '12px' }} 
            onClick={() => setIsGlobalAssetModalOpen(true)}
            data-testid="bulk-global-asset-btn"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Wallet size={20} color="var(--primary)" />
              <span style={{ 
                fontSize: '15px', 
                fontWeight: batchAssetId ? 700 : 500,
                color: batchAssetId ? 'var(--text-main)' : 'var(--text-muted)'
              }}>
                {getAssetLabel(batchAssetId)}
              </span>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </button>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
            {isMutation 
              ? '* Semua transaksi akan menggunakan rekening ini secara otomatis.' 
              : '* Akan digunakan sebagai rekening default untuk semua baris.'}
          </p>
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
                  data-testid={`bulk-row-check-${item.id}`}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={item.note}
                  onChange={(e) => updateResult(item.id, 'note', e.target.value)}
                  placeholder="Catatan"
                  data-testid={`bulk-row-note-${item.id}`}
                  style={{ flex: 1, fontSize: '14px', fontWeight: 600, padding: '4px 8px', border: '1px solid transparent', borderBottom: '1px solid var(--border-color)', background: 'transparent' }}
                />
              </div>
              
              <div style={{ display: 'flex', background: 'var(--bg-main)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color)', position: 'relative' }}>
                {(['pengeluaran', 'pendapatan', 'transfer'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => updateResult(item.id, 'type', t)}
                    style={{
                      flex: 1,
                      padding: '4px 10px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: 'transparent',
                      color: item.type === t ? (t === 'pengeluaran' ? 'var(--danger)' : t === 'pendapatan' ? 'var(--success)' : 'var(--primary)') : 'var(--text-muted)',
                      textTransform: 'capitalize',
                      position: 'relative',
                      transition: 'color 0.2s ease',
                    }}
                  >
                    {item.type === t && (
                      <motion.div
                        layoutId={`bulkActiveType-${item.id}`}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'var(--bg-card)',
                          borderRadius: '6px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          zIndex: 1,
                        }}
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      />
                    )}
                    <span style={{ position: 'relative', zIndex: 2 }}>
                      {t === 'pengeluaran' ? 'Keluar' : t === 'pendapatan' ? 'Masuk' : 'TF'}
                    </span>
                  </button>
                ))}
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

              {item.type !== 'transfer' ? (
                <>
                  {/* Asset Selection (only for non-mutation) */}
                  {!isMutation && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rekening</label>
                      <button style={btnStyle} onClick={() => openModal('asset', item.id)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Wallet size={14} color="var(--primary)" />
                          <span style={{ fontSize: '13px', fontWeight: item.asset ? 600 : 400, color: item.asset ? 'var(--text-main)' : 'var(--text-muted)' }}>
                            {getAssetLabel(item.asset)}
                          </span>
                        </div>
                        <ChevronRight size={14} color="var(--text-muted)" />
                      </button>
                    </div>
                  )}

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
                </>
              ) : (
                <>
                  {/* Transfer Asset Selection */}
                  {isMutation ? (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lawan Transaksi (Rekening Lain)</label>
                      <button style={btnStyle} onClick={() => openModal(item.fromAsset && item.fromAsset !== batchAssetId ? 'fromAsset' : 'toAsset', item.id)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Wallet size={14} color="var(--primary)" />
                          <span style={{ fontSize: '13px', fontWeight: (item.fromAsset && item.fromAsset !== batchAssetId) || (item.toAsset && item.toAsset !== batchAssetId) ? 600 : 400, color: (item.fromAsset && item.fromAsset !== batchAssetId) || (item.toAsset && item.toAsset !== batchAssetId) ? 'var(--text-main)' : 'var(--text-muted)' }}>
                            {getAssetLabel(item.fromAsset && item.fromAsset !== batchAssetId ? item.fromAsset : item.toAsset, '-- Pilih Rekening Lawan --')}
                          </span>
                        </div>
                        <ChevronRight size={14} color="var(--text-muted)" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Dari</label>
                        <button style={btnStyle} onClick={() => openModal('fromAsset', item.id)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Wallet size={14} color="var(--primary)" />
                            <span style={{ fontSize: '13px', fontWeight: item.fromAsset ? 600 : 400, color: item.fromAsset ? 'var(--text-main)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {getAssetLabel(item.fromAsset)}
                            </span>
                          </div>
                        </button>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ke</label>
                        <button style={btnStyle} onClick={() => openModal('toAsset', item.id)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Wallet size={14} color="var(--primary)" />
                            <span style={{ fontSize: '13px', fontWeight: item.toAsset ? 600 : 400, color: item.toAsset ? 'var(--text-main)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {getAssetLabel(item.toAsset)}
                            </span>
                          </div>
                        </button>
                      </div>
                    </>
                  )}

                  {/* Admin Fee - spans full width */}
                  <div style={{ gridColumn: '1 / -1', padding: '10px 12px', borderRadius: '10px', background: item.adminFee ? 'hsla(35, 90%, 55%, 0.08)' : 'var(--bg-main)', border: `1px solid ${item.adminFee ? 'hsla(35, 90%, 55%, 0.3)' : 'var(--border-color)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: item.adminFee ? '8px' : 0 }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', flex: 1 }}>Biaya Admin</span>
                      <CurrencyInput
                        placeholder="0"
                        value={item.adminFee || ''}
                        onChange={val => {
                          updateResult(item.id, 'adminFee', val ? Number(val) : 0);
                        }}
                        style={{ width: '90px', fontSize: '12px', fontWeight: 700, textAlign: 'right', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', marginBottom: 0 }}
                      />
                    </div>
                    {item.adminFee ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => updateResult(item.id, 'adminFeeTarget', 'sender')}
                          style={{ flex: 1, padding: '4px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, border: `1.5px solid ${item.adminFeeTarget !== 'receiver' ? 'var(--secondary)' : 'var(--border-color)'}`, background: item.adminFeeTarget !== 'receiver' ? 'var(--bg-expense)' : 'var(--bg-card)', color: item.adminFeeTarget !== 'receiver' ? 'var(--secondary)' : 'var(--text-muted)', cursor: 'pointer' }}
                        >Pengirim</button>
                        <button
                          type="button"
                          onClick={() => updateResult(item.id, 'adminFeeTarget', 'receiver')}
                          style={{ flex: 1, padding: '4px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, border: `1.5px solid ${item.adminFeeTarget === 'receiver' ? 'var(--secondary)' : 'var(--border-color)'}`, background: item.adminFeeTarget === 'receiver' ? 'var(--bg-expense)' : 'var(--bg-card)', color: item.adminFeeTarget === 'receiver' ? 'var(--secondary)' : 'var(--text-muted)', cursor: 'pointer' }}
                        >Penerima</button>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
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
          onClick={() => onSave(batchAssetId)}
          disabled={!results.some(r => r.selected) || (isMutation && !batchAssetId) || results.filter(r => r.selected).some(r => !r.amount || (r.type !== 'transfer' && !r.category))}
          data-testid="bulk-save-btn"
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

      <AssetSelectModal
        isOpen={modalState.type === 'asset' || modalState.type === 'fromAsset' || modalState.type === 'toAsset' || isGlobalAssetModalOpen}
        onClose={() => { closeModal(); setIsGlobalAssetModalOpen(false); }}
        assets={activeAssets}
        selectedAssetId={
          isGlobalAssetModalOpen ? batchAssetId :
          modalState.type === 'asset' ? activeItem?.asset :
          modalState.type === 'fromAsset' ? activeItem?.fromAsset :
          activeItem?.toAsset
        }
        onSelect={(assetId) => {
          if (isGlobalAssetModalOpen) {
            setBatchAssetId(assetId);
            setIsGlobalAssetModalOpen(false);
            // If in bulk mode, update all selected items' assets
            if (!isMutation) {
              setResults(prev => prev.map(item => {
                if (!item.selected) return item;
                if (item.type === 'transfer') {
                  return { ...item, fromAsset: assetId };
                }
                return { ...item, asset: assetId };
              }));
            }
          } else if (modalState.itemId && modalState.type) {
            updateResult(modalState.itemId, modalState.type as keyof ParsedTransaction, assetId);
            closeModal();
          }
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

    </div>
  );
};

export default BulkResultsEditor;
