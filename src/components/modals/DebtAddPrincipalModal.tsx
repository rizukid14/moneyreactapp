import React, { useState } from 'react';
import { Wallet, ChevronRight } from 'lucide-react';
import { getLocalDate, getLocalTime } from '../../lib/utils';
import { useMoney, type Debt, type Asset } from '../../contexts/MoneyContext';
import AssetSelectModal from './AssetSelectModal';
import CurrencyInput from '../common/CurrencyInput';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

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
  const [date, setDate] = useState(getLocalDate());
  const [time, setTime] = useState(getLocalTime());
  const [note, setNote] = useState('');
  const [lastOpen, setLastOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  React.useEffect(() => {
    if (isOpen && !lastOpen) {
      setAmount('');
      setSelectedAssetId(debtDefaultAssetId || globalDefaultAssetId || (activeAssets[0]?.id || ''));
      setDate(getLocalDate());
      setTime(getLocalTime());
      setNote('');
    }
    setLastOpen(isOpen);
  }, [isOpen, lastOpen, debt, debtDefaultAssetId, globalDefaultAssetId, activeAssets]);

  const handleRawAmountChange = (raw: string) => {
    setAmount(raw);
  };

  const handleConfirm = () => {
    const numAmount = Number(amount);
    if (numAmount <= 0) return;

    onConfirm(numAmount, selectedAssetId, date, time, note);
    onClose();
  };

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Tambah Pokok ${isHutang ? 'Hutang' : 'Piutang'}`}
      >
              <div style={{ padding: '0 4px' }}>
                <div style={{ background: 'var(--bg-main)', padding: 16, borderRadius: 16, marginBottom: 20, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Nominal Tambahan:</div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: 0, fontWeight: 800, color: 'var(--text-muted)', fontSize: 18 }}>{currencySymbol}</span>
                    <CurrencyInput
                      value={amount}
                      onChange={handleRawAmountChange}
                      placeholder="0"
                      style={{ width: '100%', paddingLeft: 40, fontWeight: 800, fontSize: 18, marginBottom: 0 }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                    {isHutang ? '🏦 Uang Masuk ke:' : '🏦 Uang Keluar dari:'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAssetModalOpen(true)}
                    className="input-trigger"
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)',
                      borderRadius: '12px', cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Wallet size={18} color="var(--primary)" />
                      <span style={{ fontWeight: 600, color: selectedAsset ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {selectedAsset ? selectedAsset.name : '-- Tidak Ada / Tunai --'}
                      </span>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </button>
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
                    Catatan Tambahan:
                  </label>
                  <Input type="text" placeholder="Catatan tambahan hutang" value={note} onChange={e => setNote(e.target.value)} style={{ marginBottom: 0 }} />
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleConfirm}
                fullWidth
                style={{ marginTop: 24, height: 56, borderRadius: 16, fontWeight: 800 }}
              >
                Tambah Pokok
              </Button>
      </Modal>

      <AssetSelectModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        assets={assets}
        selectedAssetId={selectedAssetId}
        onSelect={setSelectedAssetId}
      />
    </>
  );
};

export default DebtAddPrincipalModal;
