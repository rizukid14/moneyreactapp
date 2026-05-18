import React, { useState, useEffect } from 'react';
import { X, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocalDate } from '../../lib/utils';
import type { Asset, AssetType, Transaction } from '../../contexts/MoneyContext';
import { useToast } from '../common/Toast';
import ConfirmDialog from '../common/ConfirmDialog';
import CurrencyInput from '../common/CurrencyInput';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  updateAsset?: (id: string, asset: Partial<Asset>) => void;
  editingAsset?: Asset | null;
  currentBalance?: number;
  addTransaction?: (tx: Omit<Transaction, 'id'>) => void;
  onDelete?: (id: string) => void;
  currencySymbol: string;
  existingAssets: Asset[];
}

const AssetModal: React.FC<AssetModalProps> = ({ 
  isOpen, onClose, addAsset, updateAsset, editingAsset, 
  currentBalance, addTransaction, onDelete, currencySymbol, existingAssets 
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('Cash');
  const [initialBalance, setInitialBalance] = useState('');
  const [adjustedBalance, setAdjustedBalance] = useState('');
  const [isHidden, setIsHidden] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (editingAsset) {
      setName(editingAsset.name);
      setType(editingAsset.type);
      setInitialBalance(editingAsset.initialBalance.toLocaleString('id-ID'));
      setAdjustedBalance(currentBalance !== undefined ? currentBalance.toLocaleString('id-ID') : '');
      setIsHidden(editingAsset.isHidden || false);
    } else {
      setName('');
      setType('Cash');
      setInitialBalance('');
      setAdjustedBalance('');
      setIsHidden(false);
    }
  }, [editingAsset, isOpen, currentBalance]);



  const parseNumber = (val: string) => {
    if (!val || val === '-') return 0;
    const isNegative = val.startsWith('-');
    const num = Number(val.replace(/[^\d]/g, ''));
    return isNegative ? -num : num;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Validation: Check if name already exists (case-insensitive)
    const isDuplicate = existingAssets.some(a => 
      a.name.toLowerCase() === name.trim().toLowerCase() && 
      (!editingAsset || a.id !== editingAsset.id)
    );

    if (isDuplicate) {
      showToast('Nama rekening sudah ada!', 'warning');
      return;
    }

    const assetData = {
      name: name.trim(),
      type,
      initialBalance: parseNumber(initialBalance),
      isHidden,
    };

    if (editingAsset && updateAsset) {
      updateAsset(editingAsset.id, assetData);
      
      if (currentBalance !== undefined && addTransaction && adjustedBalance !== '') {
        const newTargetBalance = parseNumber(adjustedBalance);
        const difference = newTargetBalance - currentBalance;
        if (difference !== 0) {
          addTransaction({
            type: difference > 0 ? 'pendapatan' : 'pengeluaran',
            amount: Math.abs(difference),
            category: 'Koreksi Saldo',
            date: getLocalDate(),
            note: 'Penyesuaian saldo manual',
            assetId: editingAsset.id
          });
        }
      }
    } else {
      addAsset(assetData);
    }
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="modal-overlay" 
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            style={{ zIndex: 4000 }}
          >
            <motion.div 
              className="modal-content" 
              onClick={e => e.stopPropagation()}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 600, mass: 0.5 }}
            >
              <div className="modal-header">
                <h2 className="subtitle" style={{ margin: 0 }}>{editingAsset ? 'Edit Aset' : 'Tambah Aset Baru'}</h2>
                <button className="close-btn" onClick={onClose}><X size={24} /></button>
              </div>
              
              <form onSubmit={handleSave}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block', marginLeft: '4px' }}>Identitas Aset</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Nama Aset (mis: Rekening Mandiri)" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    style={{ marginBottom: '12px' }}
                  />
                  
                  <select value={type} onChange={e => setType(e.target.value as AssetType)} style={{ marginBottom: 0 }}>
                    <option value="Cash">Tunai / Dompet</option>
                    <option value="Bank Account">Rekening Bank</option>
                    <option value="eWallet">E-Wallet (Gopay, OVO)</option>
                    <option value="Savings">Tabungan</option>
                    <option value="Investment">Investasi (Saham, Reksadana)</option>
                    <option value="Credit Card">Kartu Kredit</option>
                    <option value="Loan">Pinjaman / Hutang</option>
                  </select>
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block', marginLeft: '4px' }}>Keuangan</label>
                  <CurrencyInput 
                    placeholder={`Saldo Awal (${currencySymbol})`} 
                    value={initialBalance} 
                    onChange={setInitialBalance} 
                    style={{ marginBottom: '12px' }}
                  />

                  {editingAsset && currentBalance !== undefined && (
                    <div style={{ padding: '16px', background: 'var(--bg-income)', borderRadius: '16px', border: '1.5px solid var(--primary-glow)' }}>
                      <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', display: 'block', marginBottom: '8px' }}>Penyesuaian Saldo Berjalan</label>
                      <CurrencyInput 
                        placeholder="Saldo saat ini" 
                        value={adjustedBalance} 
                        onChange={setAdjustedBalance} 
                        style={{ marginBottom: '8px', fontWeight: 800, color: 'var(--primary)', border: '2px solid var(--primary)', fontSize: '16px' }}
                      />
                      <div style={{ fontSize: '11px', color: 'var(--primary)', opacity: 0.8, lineHeight: 1.4 }}>
                        Sistem akan membuat transaksi <strong>Koreksi Saldo</strong> otomatis untuk selisih dari <strong>{currencySymbol}{currentBalance.toLocaleString('id-ID')}</strong>.
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ 
                  margin: '16px 0 24px', padding: '16px', borderRadius: '16px', 
                  background: isHidden ? 'var(--bg-neutral)' : 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  transition: 'all 0.2s'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', margin: 0 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', marginBottom: '2px' }}>Sembunyikan dari Total</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Saldo tidak akan dihitung di Net Worth.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={isHidden}
                      onChange={(e) => setIsHidden(e.target.checked)}
                      style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', margin: 0 }}
                    />
                  </label>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  {editingAsset && onDelete && (
                    <button 
                      type="button" 
                      onClick={() => setIsConfirmOpen(true)}
                      title="Hapus Aset"
                      style={{ 
                        width: '56px', height: '56px', borderRadius: '16px', background: 'hsla(0, 80%, 60%, 0.1)', border: '1px solid hsla(0, 80%, 60%, 0.2)', 
                        color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'hsla(0, 80%, 60%, 0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'hsla(0, 80%, 60%, 0.1)'}
                    >
                      <Trash2 size={24} />
                    </button>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ 
                    flex: 1, height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 8px 24px var(--primary-glow)', margin: 0
                  }}>
                    <CheckCircle2 size={22} />
                    {editingAsset ? 'Simpan' : 'Simpan Aset'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          if (editingAsset && onDelete) {
            onDelete(editingAsset.id);
            onClose();
          }
        }}
        title="Hapus Aset"
        message={`Apakah Anda yakin ingin menghapus aset "${name}"? Sisa saldo akan tetap tercatat di histori, namun rekening tidak akan muncul lagi.`}
      />
    </>
  );
};

export default AssetModal;
