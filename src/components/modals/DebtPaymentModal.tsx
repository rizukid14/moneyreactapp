import React, { useState } from 'react';
import { Check, ArrowRightLeft, Wallet } from 'lucide-react';
import AssetSelectModal from './AssetSelectModal';
import { getLocalDate, getLocalTime, formatCurrency } from '../../lib/utils';
import { useMoney, type Debt, type Asset } from '../../contexts/MoneyContext';
import CurrencyInput from '../common/CurrencyInput';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bayar ${isHutang ? 'Hutang' : 'Piutang'}`}
    >
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

            <Card variant="glass" style={{ padding: 16, marginBottom: 20 }}>
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
                  <Button
                    variant={isFullSettle ? 'primary' : 'outline'}
                    onClick={() => { setAmount(remaining.toString()); setIsFullSettle(true); }}
                    style={{ flex: 1, padding: '8px', fontSize: 11, fontWeight: 700, borderRadius: 8, height: 'auto' }}
                  >
                    Pelunasan Penuh
                  </Button>
                  {debt.isInstallment && debt.installmentAmount ? (
                    <Button
                      variant={(!isFullSettle && Number(amount) === debt.installmentAmount) ? 'primary' : 'outline'}
                      onClick={() => {
                        setAmount(debt.installmentAmount!.toString());
                        setIsFullSettle(debt.installmentAmount! >= remaining);
                      }}
                      style={{ flex: 1, padding: '8px', fontSize: 11, fontWeight: 700, borderRadius: 8, height: 'auto' }}
                    >
                      Bayar 1 Cicilan
                    </Button>
                  ) : (
                    <Button
                      variant={(!isFullSettle && Number(amount) === Math.floor(remaining / 2)) ? 'primary' : 'outline'}
                      onClick={() => {
                        const half = Math.floor(remaining / 2);
                        setAmount(half.toString());
                        setIsFullSettle(false);
                      }}
                      style={{ flex: 1, padding: '8px', fontSize: 11, fontWeight: 700, borderRadius: 8, height: 'auto' }}
                    >
                      Bayar Setengah
                    </Button>
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
                      <div style={{ fontWeight: 800, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeAssets.find(a => a.id === selectedAssetId)?.name || 'Pilih Rekening'}</div>
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
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ marginBottom: 0 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                    Jam:
                  </label>
                  <Input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ marginBottom: 0 }} />
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  Catatan:
                </label>
                <Input type="text" placeholder="Catatan bayar" value={note} onChange={e => setNote(e.target.value)} style={{ marginBottom: 0 }} />
              </div>
            </Card>

              <AssetSelectModal
                isOpen={isAssetSelectOpen}
                onClose={() => setIsAssetSelectOpen(false)}
                assets={activeAssets}
                selectedAssetId={selectedAssetId}
                onSelect={(id) => { setSelectedAssetId(id); setIsAssetSelectOpen(false); }}
              />

              <Button
                variant={isHutang ? 'danger' : 'primary'}
                onClick={handleConfirm}
                fullWidth
                style={{
                  fontWeight: 700, padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                {isFullSettle ? <Check size={18} /> : <ArrowRightLeft size={18} />}
                {isFullSettle ? 'Konfirmasi Pelunasan' : 'Konfirmasi Pembayaran Cicilan'}
              </Button>
    </Modal>
  );
};

export default DebtPaymentModal;
