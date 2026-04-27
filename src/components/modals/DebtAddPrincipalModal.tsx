import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney, type Debt, type Asset } from '../../contexts/MoneyContext';

interface DebtAddPrincipalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, assetId: string, date: string, time: string, note: string) => void;
  debt: Debt;
  assets: Asset[];
  currencySymbol: string;
}

const DebtAddPrincipalModal: React.FC<DebtAddPrincipalModalProps> = ({ 
  isOpen, onClose, onConfirm, debt, assets, currencySymbol 
}) => {
  const { defaultAssetId: globalDefaultAssetId } = useMoney();
  const isHutang = debt.type === 'hutang';
  const activeAssets = assets.filter(a => !a.isDeleted);
  
  const debtDefaultAssetId = isHutang ? debt.paymentAssetId : debt.receiveAssetId;
  const [amount, setAmount] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState(debtDefaultAssetId || globalDefaultAssetId || (activeAssets[0]?.id || ''));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(' ')[0].slice(0, 5));
  const [note, setNote] = useState('');
  const [lastOpen, setLastOpen] = useState(false);

  React.useEffect(() => {
    if (isOpen && !lastOpen) {
      setAmount('');
      setSelectedAssetId(debtDefaultAssetId || globalDefaultAssetId || (activeAssets[0]?.id || ''));
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().split(' ')[0].slice(0, 5));
      setNote('');
    }
    setLastOpen(isOpen);
  }, [isOpen, lastOpen, debt, debtDefaultAssetId, globalDefaultAssetId, activeAssets]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setAmount(val);
  };

  const handleConfirm = () => {
    const numAmount = Number(amount);
    if (numAmount <= 0) return;
    
    const finalNote = note || `Tambah ${isHutang ? 'Hutang' : 'Piutang'} Baru`;
    onConfirm(numAmount, selectedAssetId, date, time, finalNote);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="modal-overlay" 
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
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
              <h2 className="subtitle" style={{ margin: 0 }}>
                Tambah Nominal {isHutang ? 'Hutang' : 'Piutang'}
              </h2>
              <button className="close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                Kontak: <strong>{debt.contact}</strong>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Fitur ini akan menambah total nominal pada catatan ini dan mencatatnya sebagai transaksi baru.
              </div>
            </div>

            <div className="card shadow-soft" style={{ padding: 16, marginBottom: 20, border: 'none', background: 'var(--bg-main)' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  Tambahan Nominal:
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>{currencySymbol}</span>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={amount ? Number(amount).toLocaleString('id-ID') : ''}
                    onChange={handleAmountChange}
                    placeholder="0"
                    style={{ width: '100%', paddingLeft: 40, fontWeight: 800, fontSize: 18, marginBottom: 0 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  {isHutang ? '🏦 Uang Masuk ke:' : '🏦 Uang Keluar dari:'}
                </label>
                <select 
                  value={selectedAssetId} 
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  style={{ width: '100%', marginBottom: 0 }}
                >
                  <option value="">-- Tidak Ada / Tunai --</option>
                  {activeAssets.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                    Tanggal:
                  </label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', marginBottom: 0 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                    Jam:
                  </label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ width: '100%', marginBottom: 0 }} />
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  Catatan Tambahan:
                </label>
                <input type="text" placeholder="Catatan tambahan hutang" value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%', marginBottom: 0 }} />
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="btn"
              style={{
                width: '100%',
                fontWeight: 700,
                background: isHutang ? 'var(--danger)' : 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: `0 4px 15px ${isHutang ? 'var(--secondary-glow)' : 'var(--primary-glow)'}`
              }}
            >
              <Plus size={18} />
              Tambahkan Nominal
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DebtAddPrincipalModal;
