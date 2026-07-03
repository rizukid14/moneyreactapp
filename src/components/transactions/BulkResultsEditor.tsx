import React, { useState } from 'react';
import MaterialIcon from '../common/MaterialIcon';
import { motion } from 'framer-motion';
import type { ParsedTransaction } from '../../hooks/useBulkParseAI';
import type { Category, Asset } from '../../contexts/MoneyContext';
import CategorySelectModal from '../modals/CategorySelectModal';
import AssetSelectModal from '../modals/AssetSelectModal';
import CalculatorModal from '../modals/CalculatorModal';
import { getLocalDate } from '../../lib/utils';
import CurrencyInput from '../common/CurrencyInput';
import { useToast } from '../common/Toast';

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
  const { showToast } = useToast();

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
      categoryId: '',
      subCategoryId: '',
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
    if (!item.categoryId) return '-- Pilih Kategori --';
    const cat = categories.find(c => c.id === item.categoryId);
    if (!cat) return '-- Pilih Kategori --';
    const sub = cat.subcategories?.find(s => s.id === item.subCategoryId);
    return sub ? `${cat.name} > ${sub.name}` : cat.name;
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
            <MaterialIcon name="check_circle" className="text-success text-2xl" />
            <span style={{ fontWeight: 800 }}>{results.length} Data Terbaca</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setResults(prev => prev.map(r => ({ ...r, selected: true })))}
              style={{ padding: '6px 12px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
            >
              Pilih Semua
            </button>
            <button
              onClick={() => setResults(prev => prev.map(r => ({ ...r, selected: false })))}
              style={{ padding: '6px 12px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
            >
              Batal
            </button>
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
              <MaterialIcon name="account_balance_wallet" className="text-primary text-xl" />
              <span style={{
                fontSize: '15px',
                fontWeight: batchAssetId ? 700 : 500,
                color: batchAssetId ? 'var(--text-main)' : 'var(--text-muted)'
              }}>
                {getAssetLabel(batchAssetId)}
              </span>
            </div>
            <MaterialIcon name="chevron_right" className="text-on-surface-variant text-lg" />
          </button>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
            {isMutation
              ? '* Semua transaksi akan menggunakan rekening ini secara otomatis.'
              : '* Akan digunakan sebagai rekening default untuk semua baris.'}
          </p>
        </div>
      </div>

      {/* Bento Grid Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '16px',
      }}>
        {results.map((item) => (
          <div key={item.id} className="card glass hover-lift" style={{
            padding: '16px',
            border: `2px solid ${item.selected ? 'var(--primary)' : 'var(--border-color)'}`,
            opacity: item.selected ? 1 : 0.6,
            transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: item.selected ? 'scale(1)' : 'scale(0.98)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>

            {/* Header: Checkbox and Delete */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={(e) => updateResult(item.id, 'selected', e.target.checked)}
                  data-testid={`bulk-row-check-${item.id}`}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', margin: 0 }}
                />
                <span style={{ fontSize: '12px', fontWeight: 800, color: item.selected ? 'var(--primary)' : 'var(--text-muted)' }}>PILIH</span>
              </label>

              <button onClick={() => deleteResult(item.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', opacity: 0.7 }} className="hover:opacity-100 transition-opacity">
                <MaterialIcon name="delete" className="text-[18px]" />
              </button>
            </div>

            {/* Segmented Control Type */}
            <div style={{ display: 'flex', background: 'var(--bg-main)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border-color)', position: 'relative' }}>
              {(['pengeluaran', 'pendapatan', 'transfer'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => updateResult(item.id, 'type', t)}
                  style={{
                    flex: 1, padding: '8px 4px', border: 'none', borderRadius: '8px',
                    fontSize: '11px', fontWeight: 800, cursor: 'pointer', background: 'transparent',
                    color: item.type === t ? (t === 'pengeluaran' ? 'var(--danger)' : t === 'pendapatan' ? 'var(--success)' : 'var(--primary)') : 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.5px', position: 'relative',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {item.type === t && (
                    <motion.div
                      layoutId={`bulkActiveType-${item.id}`}
                      style={{
                        position: 'absolute', inset: 0, background: 'var(--bg-card)',
                        borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', zIndex: 1,
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

            {/* Bento Block: Amount & Date */}
            <div style={{ background: 'var(--bg-main)', borderRadius: '16px', padding: '16px', border: (!item.amount || item.amount <= 0) ? '2px solid var(--danger)' : '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Nominal</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: item.type === 'pengeluaran' ? 'var(--danger)' : 'var(--success)' }}>{currencySymbol}</span>
                <CurrencyInput
                  value={item.amount}
                  onChange={(val) => updateResult(item.id, 'amount', Number(val))}
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: 0, fontSize: '24px', fontWeight: 800, color: item.type === 'pengeluaran' ? 'var(--danger)' : 'var(--success)', margin: 0, outline: 'none', width: '100%' }}
                />
                <button onClick={() => openModal('calculator', item.id)} style={{ padding: '8px', background: 'var(--primary-glow)', color: 'var(--primary)', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <MaterialIcon name="calculate" className="text-[20px]" />
                </button>
              </div>
              <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MaterialIcon name="calendar_today" className="text-[14px] text-muted" />
                <input
                  type="date"
                  value={item.date}
                  onChange={(e) => updateResult(item.id, 'date', e.target.value)}
                  style={{ width: '100%', fontSize: '13px', fontWeight: 700, padding: 0, border: !item.date ? '2px solid var(--danger)' : 'none', borderRadius: !item.date ? '4px' : '0', background: 'transparent', margin: 0, color: 'var(--text-main)', outline: 'none' }}
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <input
                type="text"
                value={item.note}
                onChange={(e) => updateResult(item.id, 'note', e.target.value)}
                placeholder="Tulis Catatan..."
                data-testid={`bulk-row-note-${item.id}`}
                style={{ width: '100%', fontSize: '13px', fontWeight: 600, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', margin: 0 }}
              />
            </div>

            {/* Grid for Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {item.type !== 'transfer' ? (
                <>
                  {!isMutation && (
                    <button onClick={() => openModal('asset', item.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 12px', background: 'var(--bg-main)', border: (!item.asset && !batchAssetId) ? '2px solid var(--danger)' : '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Rekening</span>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: item.asset ? 'var(--text-main)' : 'var(--text-muted)', width: '100%', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getAssetLabel(item.asset)}
                      </span>
                    </button>
                  )}
                  <button onClick={() => openModal('category', item.id)} style={{ gridColumn: isMutation ? '1 / -1' : 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 12px', background: 'var(--bg-main)', border: (!item.categoryId) ? '2px solid var(--danger)' : '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Kategori</span>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: item.category ? 'var(--text-main)' : 'var(--text-muted)', width: '100%', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getCategoryLabel(item)}
                    </span>
                  </button>
                </>
              ) : (
                <>
                  {isMutation ? (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px' }}>
                      <button onClick={() => openModal(item.fromAsset && item.fromAsset !== batchAssetId ? 'fromAsset' : 'toAsset', item.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 12px', background: 'var(--bg-main)', border: (!item.fromAsset || !item.toAsset) ? '2px solid var(--danger)' : '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Lawan Transaksi</span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)', width: '100%', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getAssetLabel(item.fromAsset && item.fromAsset !== batchAssetId ? item.fromAsset : item.toAsset, 'Pilih Rekening')}
                        </span>
                      </button>
                      <button 
                        onClick={() => {
                          const currentFrom = item.fromAsset;
                          const currentTo = item.toAsset;
                          updateResult(item.id, 'fromAsset', currentTo);
                          updateResult(item.id, 'toAsset', currentFrom);
                        }}
                        style={{ 
                          padding: '10px', 
                          background: 'var(--bg-main)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '12px', 
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '80px'
                        }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Arah</span>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: item.fromAsset === batchAssetId ? 'var(--danger)' : 'var(--primary)' }}>
                          {item.fromAsset === batchAssetId ? 'Keluar' : 'Masuk'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => openModal('fromAsset', item.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 12px', background: 'var(--bg-main)', border: !item.fromAsset ? '2px solid var(--danger)' : '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Dari Rekening</span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: item.fromAsset ? 'var(--text-main)' : 'var(--text-muted)', width: '100%', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getAssetLabel(item.fromAsset)}
                        </span>
                      </button>
                      <button onClick={() => openModal('toAsset', item.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 12px', background: 'var(--bg-main)', border: !item.toAsset ? '2px solid var(--danger)' : '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Ke Rekening</span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: item.toAsset ? 'var(--text-main)' : 'var(--text-muted)', width: '100%', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getAssetLabel(item.toAsset)}
                        </span>
                      </button>
                    </>
                  )}
                </>
              )}

              {/* Admin Fee (spans full width if present or added) */}
              {isMutation && (
                <div style={{ gridColumn: '1 / -1', background: item.adminFee ? 'hsla(35, 90%, 55%, 0.08)' : 'var(--bg-main)', border: `1px solid ${item.adminFee ? 'hsla(35, 90%, 55%, 0.3)' : 'var(--border-color)'}`, borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Biaya Admin</span>
                    <CurrencyInput
                      placeholder="0"
                      value={item.adminFee || ''}
                      onChange={val => updateResult(item.id, 'adminFee', val ? Number(val) : 0)}
                      style={{ width: '100px', fontSize: '13px', fontWeight: 800, textAlign: 'right', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', margin: 0 }}
                    />
                  </div>
                  {item.adminFee ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => updateResult(item.id, 'adminFeeTarget', 'sender')}
                        style={{ flex: 1, padding: '6px', borderRadius: '8px', fontSize: '10px', fontWeight: 800, border: `1.5px solid ${item.adminFeeTarget !== 'receiver' ? 'var(--secondary)' : 'var(--border-color)'}`, background: item.adminFeeTarget !== 'receiver' ? 'var(--bg-expense)' : 'var(--bg-card)', color: item.adminFeeTarget !== 'receiver' ? 'var(--secondary)' : 'var(--text-muted)', cursor: 'pointer' }}
                      >PENGIRIM</button>
                      <button
                        type="button"
                        onClick={() => updateResult(item.id, 'adminFeeTarget', 'receiver')}
                        style={{ flex: 1, padding: '6px', borderRadius: '8px', fontSize: '10px', fontWeight: 800, border: `1.5px solid ${item.adminFeeTarget === 'receiver' ? 'var(--secondary)' : 'var(--border-color)'}`, background: item.adminFeeTarget === 'receiver' ? 'var(--bg-expense)' : 'var(--bg-card)', color: item.adminFeeTarget === 'receiver' ? 'var(--secondary)' : 'var(--text-muted)', cursor: 'pointer' }}
                      >PENERIMA</button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-end items-center gap-3 sm:gap-4 mt-6 border-t border-outline-variant pt-6">
        <button
          onClick={addNewRow}
          className="flex items-center justify-center gap-1 sm:gap-2 px-4 sm:px-8 py-3 sm:py-4 bg-transparent border-2 border-dashed border-outline-variant rounded-xl text-primary font-bold text-sm sm:text-base hover:bg-surface-container transition-colors w-full sm:w-auto min-w-0 sm:min-w-[200px] leading-tight text-center"
        >
          <MaterialIcon name="add" className="text-base sm:text-lg" /> Tambah Baris Manual
        </button>

        <button
          className="btn btn-primary flex items-center justify-center w-full sm:w-auto px-4 sm:px-10 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base min-w-0 sm:min-w-[240px] leading-tight text-center"
          onClick={() => {
            const selected = results.filter(r => r.selected);
            if (selected.length === 0) {
              showToast('Pilih minimal satu transaksi terlebih dahulu', 'warning');
              return;
            }
            if (isMutation && !batchAssetId) {
              showToast('Pilih rekening asal terlebih dahulu', 'warning');
              return;
            }
            const invalid = selected.filter(r => !r.amount || (r.type !== 'transfer' && !r.categoryId));
            if (invalid.length > 0) {
              showToast(`${invalid.length} transaksi belum memiliki nominal atau kategori lengkap`, 'warning');
              return;
            }
            onSave(batchAssetId);
          }}
          data-testid="bulk-save-btn"
          style={{ boxShadow: '0 6px 20px var(--primary-glow)' }}
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
          initialCategoryId={activeItem.categoryId}
          initialSubCategoryId={activeItem.subCategoryId || ''}
          onSelect={(catId, subId) => {
            if (modalState.itemId) {
              updateResult(modalState.itemId, 'categoryId', catId);
              updateResult(modalState.itemId, 'subCategoryId', subId);
            }
          }}
        />
      )}

    </div>
  );
};

export default BulkResultsEditor;
