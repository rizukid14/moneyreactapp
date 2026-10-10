import React, { useState, useMemo } from 'react';
import AssetSelectModal from './AssetSelectModal';
import { getLocalDate, getLocalTime, formatCurrency } from '../../lib/utils';
import { useMoney, type Debt, type Asset, type DebtAllocation } from '../../contexts/MoneyContext';
import { calculatePrincipalBalances } from '../../lib/debtCalculations';
import CurrencyInput from '../common/CurrencyInput';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import MaterialIcon from '../common/MaterialIcon';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    amount: number,
    assetId: string,
    date: string,
    time: string,
    note: string,
    isFullSettle: boolean,
    excessSplit?: { excessAmount: number; isHutang: boolean },
    allocations?: DebtAllocation[]
  ) => void;
  debt: Debt;
  assets: Asset[];
  paidAmountFromTxs: number;
  currencySymbol: string;
}

const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  isOpen, onClose, onConfirm, debt, assets, paidAmountFromTxs, currencySymbol
}) => {
  const { defaultAssetId: globalDefaultAssetId, getAssetBalance, transactions, categories } = useMoney();
  const isHutang = debt.type === 'hutang';
  const activeAssets = assets.filter(a => !a.isDeleted);

  const remaining = Math.max(0, debt.totalAmount - paidAmountFromTxs);

  // Hitung sisa per-nota pokok yang belum lunas
  const { perNota } = useMemo(
    () => calculatePrincipalBalances(debt, transactions, categories),
    [debt, transactions, categories]
  );
  const unpaidNotas = useMemo(() => perNota.filter(n => n.remaining > 0), [perNota]);

  const debtDefaultAssetId = isHutang ? debt.paymentAssetId : debt.receiveAssetId;
  const [amount, setAmount] = useState(remaining.toString());
  const [selectedAssetId, setSelectedAssetId] = useState(debtDefaultAssetId || globalDefaultAssetId || (activeAssets[0]?.id || ''));
  const [date, setDate] = useState(getLocalDate());
  const [time, setTime] = useState(getLocalTime());
  const [note, setNote] = useState('');
  const [isFullSettle, setIsFullSettle] = useState(true);
  const [splitExcess, setSplitExcess] = useState(true);
  const [lastOpen, setLastOpen] = useState(false);
  const [isAssetSelectOpen, setIsAssetSelectOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set ID nota yang dicentang untuk dibayar
  const [selectedNotaIds, setSelectedNotaIds] = useState<Set<string>>(new Set());

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
      setSelectedNotaIds(new Set()); // Default tidak membatasi nota spesifik jika ingin bayar bebas
    }
    setLastOpen(isOpen);
  }, [isOpen, lastOpen, debt, remaining, debtDefaultAssetId, globalDefaultAssetId, activeAssets]);

  const handleToggleNota = (principalTxId: string) => {
    setSelectedNotaIds(prev => {
      const next = new Set(prev);
      if (next.has(principalTxId)) {
        next.delete(principalTxId);
      } else {
        next.add(principalTxId);
      }
      
      if (next.size > 0) {
        const selectedNotas = unpaidNotas.filter(n => next.has(n.principalTxId));
        const subtotal = selectedNotas.reduce((sum, n) => sum + n.remaining, 0);
        setAmount(subtotal.toString());
        setIsFullSettle(subtotal >= remaining);
        
        const labels = selectedNotas.map(n => n.label.replace(/^(?:Piutang|Hutang|Penambahan[^:]*|Belanja[^:]*):\s*/i, '').trim()).slice(0, 3).join(', ');
        setNote(`Pelunasan: ${labels}${selectedNotas.length > 3 ? '...' : ''}`);
      } else {
        setAmount(remaining.toString());
        setIsFullSettle(true);
        setNote('');
      }
      return next;
    });
  };

  const handleSelectAllNotas = () => {
    const allIds = new Set(unpaidNotas.map(n => n.principalTxId));
    setSelectedNotaIds(allIds);
    setAmount(remaining.toString());
    setIsFullSettle(true);
    setNote(`Pelunasan Semua Tagihan (${unpaidNotas.length} nota)`);
  };

  const handleClearNotaSelection = () => {
    setSelectedNotaIds(new Set());
    setAmount(remaining.toString());
    setIsFullSettle(true);
    setNote('');
  };

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
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const numAmount = Number(amount);
    if (numAmount <= 0) {
      setIsSubmitting(false);
      return;
    }

    const hasExcess = numAmount > remaining;
    const excessAmount = hasExcess ? numAmount - remaining : 0;

    const finalNote = note || (isFullSettle ? `Pelunasan ${isHutang ? 'Hutang' : 'Piutang'}` : `Cicilan ${isHutang ? 'Hutang' : 'Piutang'}`);
    
    // Hitung alokasi spesifik jika user memilih nota tertentu
    let allocations: DebtAllocation[] | undefined = undefined;
    if (selectedNotaIds.size > 0) {
      allocations = [];
      let budgetForAlloc = (hasExcess && splitExcess) ? remaining : numAmount;
      const targetNotas = unpaidNotas.filter(n => selectedNotaIds.has(n.principalTxId));
      for (const nota of targetNotas) {
        if (budgetForAlloc <= 0) break;
        const allocAmt = Math.min(budgetForAlloc, nota.remaining);
        allocations.push({
          principalTxId: nota.principalTxId,
          amount: allocAmt
        });
        budgetForAlloc -= allocAmt;
      }
    }

    if (hasExcess && splitExcess) {
      // Pecah: lunasi pas sebesar sisa, lalu sisanya masuk kategori pembulatan
      onConfirm(
        remaining,
        selectedAssetId,
        date,
        time,
        finalNote,
        true,
        { excessAmount, isHutang },
        allocations
      );
    } else {
      // Catat utuh sesuai input pengguna
      onConfirm(numAmount, selectedAssetId, date, time, finalNote, numAmount >= remaining, undefined, allocations);
    }
    
    setTimeout(() => setIsSubmitting(false), 1000);
  };

  const fmt = (n: number) => formatCurrency(n, currencySymbol);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bayar ${isHutang ? 'Hutang' : 'Piutang'}`}
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '4px' }}>
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
              {/* Checklist Tagihan Aktif Multi-Select jika ada > 1 nota belum lunas */}
              {unpaidNotas.length > 1 && (
                <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: '1px dashed var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Pilih Tagihan ({unpaidNotas.length} nota):
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={handleSelectAllNotas}
                        style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        Pilih Semua
                      </button>
                      {selectedNotaIds.size > 0 && (
                        <>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>•</span>
                          <button
                            type="button"
                            onClick={handleClearNotaSelection}
                            style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                          >
                            Reset
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '160px', overflowY: 'auto' }}>
                    {unpaidNotas.map(nota => {
                      const isChecked = selectedNotaIds.has(nota.principalTxId);
                      const displayTitle = nota.label.replace(/^(?:Piutang|Hutang|Penambahan[^:]*|Belanja[^:]*):\s*/i, '').trim();
                      return (
                        <label
                          key={nota.principalTxId}
                          onClick={() => handleToggleNota(nota.principalTxId)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: 10,
                            background: isChecked ? 'var(--bg-income)' : 'var(--bg-card-solid)',
                            border: `1.5px solid ${isChecked ? 'var(--primary)' : 'var(--border-color)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by parent label onClick
                              style={{ accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {displayTitle}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                {nota.date}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: isHutang ? 'var(--danger)' : 'var(--primary)' }}>
                              {fmt(nota.remaining)}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {selectedNotaIds.size > 0 && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--primary)', fontWeight: 700, textAlign: 'right' }}>
                      Terpilih: {selectedNotaIds.size} nota ({fmt(unpaidNotas.filter(n => selectedNotaIds.has(n.principalTxId)).reduce((s, n) => s + n.remaining, 0))})
                    </div>
                  )}
                </div>
              )}

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

                {/* Info Kelebihan Pembayaran / Pembulatan */}
                {Number(amount) > remaining && (
                  <div style={{
                    marginTop: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'var(--bg-income)',
                    border: '1px solid var(--primary-glow)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                        💡 Kelebihan bayar: {fmt(Number(amount) - remaining)}
                      </span>
                    </div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 11,
                      color: 'var(--text-main)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={splitExcess}
                        onChange={e => setSplitExcess(e.target.checked)}
                        style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      Pecah {fmt(Number(amount) - remaining)} ke kategori "Pembulatan / Selisih Bayar"
                    </label>
                  </div>
                )}

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
                      <MaterialIcon name="account_balance_wallet" />
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
                disabled={isSubmitting}
                variant={isHutang ? 'danger' : 'primary'}
                onClick={handleConfirm}
                fullWidth
                style={{
                  fontWeight: 700, padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                {isFullSettle ? <MaterialIcon name="check" className="text-[18px]" /> : <MaterialIcon name="swap_horiz" className="text-[18px]" />}
                {isFullSettle ? 'Konfirmasi Pelunasan' : 'Konfirmasi Pembayaran Cicilan'}
              </Button>
      </div>
    </Modal>
  );
};

export default DebtPaymentModal;
