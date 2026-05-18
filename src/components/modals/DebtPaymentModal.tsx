import React, { useState } from 'react';
import { X, Check, ArrowRightLeft, Wallet } from 'lucide-react';
import AssetSelectModal from './AssetSelectModal';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocalDate, getLocalTime, formatCurrency } from '../../lib/utils';
import { useMoney, type Debt, type Asset } from '../../contexts/MoneyContext';
import CurrencyInput from '../common/CurrencyInput';

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
  const { defaultAssetId: globalDefaultAssetId, getAssetBalance } = useMoney();
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
  const [isAssetSelectOpen, setIsAssetSelectOpen] = useState(false);

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

  const handleRawAmountChange = (rawVal: string) => {
    setAmount(rawVal);
    const numVal = Number(rawVal);
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

  const fmt = (n: number) => formatCurrency(n, currencySymbol);

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
                {fmt(remaining)}
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
                  <CurrencyInput
                    value={amount}
                    onChange={handleRawAmountChange}
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
                <div style={{ display: 'grid', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsAssetSelectOpen(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                      borderRadius: '16px',
                      background: 'var(--bg-neutral)',
                      border: `1.5px solid var(--border-color)`,
                      width: '100%', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                      color: 'var(--text-main)'
                    }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: 'var(--bg-card)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Wallet size={18} color={'var(--text-muted)'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assets.find(a => a.id === selectedAssetId)?.name || 'Pilih Rekening'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Saldo: {currencySymbol}{getAssetBalance(selectedAssetId).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)' }}>Ganti</div>
                  </button>
                </div>
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

              <AssetSelectModal
                isOpen={isAssetSelectOpen}
                onClose={() => setIsAssetSelectOpen(false)}
                assets={assets}
                selectedAssetId={selectedAssetId}
                onSelect={(id) => { setSelectedAssetId(id); setIsAssetSelectOpen(false); }}
              />

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


          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DebtPaymentModal;
