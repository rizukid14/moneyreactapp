import React, { useState } from 'react';
import { X, Check, ArrowRightLeft, Wallet, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocalDate, getLocalTime } from '../../lib/utils';
import { useMoney, type Debt, type Asset } from '../../contexts/MoneyContext';
import AssetSelectModal from './AssetSelectModal';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, assetId: string, date: string, time: string, note: string, isFullSettle: boolean) => void;
  debt: Debt;
  assets: Asset[];
  paidAmountFromTxs: number;
  currencySymbol: string;
}

const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  isOpen, onClose, onConfirm, debt, assets, paidAmountFromTxs, currencySymbol
}) => {
  const { defaultAssetId: globalDefaultAssetId } = useMoney();
  const isHutang = debt.type === 'hutang';
  const activeAssets = assets.filter(a => !a.isDeleted);

  const remaining = Math.max(0, debt.totalAmount - paidAmountFromTxs);

  const debtDefaultAssetId = isHutang ? debt.paymentAssetId : debt.receiveAssetId;
  const [amount, setAmount] = useState(remaining.toString());
  const [selectedAssetId, setSelectedAssetId] = useState(debtDefaultAssetId || globalDefaultAssetId || (activeAssets[0]?.id || ''));
  const [date, setDate] = useState(getLocalDate());
  const [time, setTime] = useState(getLocalTime());
  const [note, setNote] = useState('');
  const [isFullSettle, setIsFullSettle] = useState(true);
  const [lastOpen, setLastOpen] = useState(false);
  const [assetModalOpen, setAssetModalOpen] = useState(false);

  React.useEffect(() => {
    if (isOpen && !lastOpen) {
      const defaultAmount = (debt.isInstallment && debt.installmentAmount && debt.installmentAmount < remaining)
        ? debt.installmentAmount
        : remaining;
        
      setAmount(defaultAmount.toString());
      setSelectedAssetId(debtDefaultAssetId || globalDefaultAssetId || (activeAssets[0]?.id || ''));
      setIsFullSettle(defaultAmount >= remaining);
      setDate(getLocalDate());
      setTime(getLocalTime());
      setNote('');
    }
    setLastOpen(isOpen);
  }, [isOpen, lastOpen, debt, remaining, debtDefaultAssetId, globalDefaultAssetId, activeAssets]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setAmount(val);
    const numVal = Number(val);
    if (numVal >= remaining) {
      setIsFullSettle(true);
    } else {
      setIsFullSettle(false);
    }
  };

  const handleConfirm = () => {
    const numAmount = Number(amount);
    if (numAmount <= 0) return;

    const finalNote = note || (isFullSettle ? `Pelunasan ${isHutang ? 'Hutang' : 'Piutang'}` : `Cicilan ${isHutang ? 'Hutang' : 'Piutang'}`);
    onConfirm(numAmount, selectedAssetId, date, time, finalNote, isFullSettle);
  };

  const formatCurrency = (n: number) => `${currencySymbol}${n.toLocaleString('id-ID')}`;

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
                Bayar {isHutang ? 'Hutang' : 'Piutang'}
              </h2>
              <button className="close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                Sisa Tagihan:
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
                {formatCurrency(remaining)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Kontak: <strong>{debt.contact}</strong>
              </div>
            </div>

            <div className="card shadow-soft" style={{ padding: 16, marginBottom: 20, border: 'none', background: 'var(--bg-main)' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  Jumlah Pembayaran:
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>{currencySymbol}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={Number(amount).toLocaleString('id-ID')}
                    onChange={handleAmountChange}
                    style={{ width: '100%', paddingLeft: 40, fontWeight: 800, fontSize: 18, marginBottom: 0 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => { setAmount(remaining.toString()); setIsFullSettle(true); }}
                    style={{
                      flex: 1, padding: '8px', fontSize: 11, fontWeight: 700, borderRadius: 8, border: 'none',
                      background: isFullSettle ? 'var(--primary-glow)' : 'var(--bg-neutral)',
                      color: isFullSettle ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    Pelunasan Penuh
                  </button>
                  {debt.isInstallment && debt.installmentAmount ? (
                    <button
                      onClick={() => {
                        setAmount(debt.installmentAmount!.toString());
                        setIsFullSettle(debt.installmentAmount! >= remaining);
                      }}
                      style={{
                        flex: 1, padding: '8px', fontSize: 11, fontWeight: 700, borderRadius: 8, border: 'none',
                        background: (!isFullSettle && Number(amount) === debt.installmentAmount) ? 'var(--primary-glow)' : 'var(--bg-neutral)',
                        color: (!isFullSettle && Number(amount) === debt.installmentAmount) ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      Bayar 1 Cicilan
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const half = Math.floor(remaining / 2);
                        setAmount(half.toString());
                        setIsFullSettle(false);
                      }}
                      style={{
                        flex: 1, padding: '8px', fontSize: 11, fontWeight: 700, borderRadius: 8, border: 'none',
                        background: (!isFullSettle && Number(amount) === Math.floor(remaining / 2)) ? 'var(--primary-glow)' : 'var(--bg-neutral)',
                        color: (!isFullSettle && Number(amount) === Math.floor(remaining / 2)) ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      Bayar Setengah
                    </button>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  {isHutang ? '🏦 Bayar dari:' : '🏦 Terima ke:'}
                </label>
                <button
                  type="button"
                  onClick={() => setAssetModalOpen(true)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'var(--bg-card-solid)',
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: 0,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-main)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-solid)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Wallet size={16} color="var(--primary)" />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: selectedAssetId ? 600 : 400,
                        color: selectedAssetId ? 'var(--text-main)' : 'var(--text-muted)',
                      }}
                    >
                      {selectedAssetId ? activeAssets.find(a => a.id === selectedAssetId)?.name : '-- Pilih Rekening --'}
                    </span>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </button>
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
                  Catatan:
                </label>
                <input type="text" placeholder="Catatan bayar" value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%', marginBottom: 0 }} />
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
              {isFullSettle ? <Check size={18} /> : <ArrowRightLeft size={18} />}
              {isFullSettle ? 'Konfirmasi Pelunasan' : 'Konfirmasi Pembayaran Cicilan'}
            </button>

            <AssetSelectModal
              isOpen={assetModalOpen}
              onClose={() => setAssetModalOpen(false)}
              assets={activeAssets}
              selectedAssetId={selectedAssetId}
              onSelect={(id) => setSelectedAssetId(id)}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DebtPaymentModal;
