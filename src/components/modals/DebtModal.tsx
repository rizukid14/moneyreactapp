import React, { useState, useEffect } from 'react';

import { useMoney, type Debt, type Asset, type Category } from '../../contexts/MoneyContext';
import CalculatorModal from './CalculatorModal';
import CurrencyInput from '../common/CurrencyInput';
import CategorySelectModal from './CategorySelectModal';
import AssetSelectModal from './AssetSelectModal';
import ContactSelectModal from './ContactSelectModal';

import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import MaterialIcon from '../common/MaterialIcon';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (debt: Omit<Debt, 'id'>, initialMode?: 'none' | 'cash' | 'credit', categoryName?: string, subCategoryName?: string) => void;
  editingDebt: Debt | null;
  assets: Asset[];
  categories: Category[]; // expense categories for credit mode
  currencySymbol: string;
  defaultType?: 'hutang' | 'piutang';
}

const DebtModal: React.FC<DebtModalProps> = ({ isOpen, onClose, onSave, editingDebt, assets, categories, currencySymbol, defaultType }) => {
  const { defaultAssetId, contacts } = useMoney();
  const [type, setType]                           = useState<'hutang' | 'piutang'>('hutang');
  const [contact, setContact]                     = useState('');
  const [description, setDescription]             = useState('');
  const [principalAmount, setPrincipalAmount]     = useState('');
  const [hasInterest, setHasInterest]             = useState(false);
  const [interestType, setInterestType]           = useState<'fixed' | 'percentage'>('fixed');
  const [interestRate, setInterestRate]           = useState('');
  const [interestAmount, setInterestAmount]       = useState('');
  const [dueDate, setDueDate]                     = useState('');
  const [isInstallment, setIsInstallment]         = useState(false);
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentDay, setInstallmentDay]       = useState('25');
  const [totalInstallments, setTotalInstallments] = useState('');
  // Asset fields
  const [liabilityAssetId, setLiabilityAssetId]  = useState('');
  const [paymentAssetId, setPaymentAssetId]       = useState('');
  const [receiveAssetId, setReceiveAssetId]       = useState('');
  // Hutang recording mode (new)
  const [hutangMode, setHutangMode]               = useState<'none' | 'cash' | 'credit'>('none');
  const [createdAt, setCreatedAt]                 = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting]           = useState(false);

  const activeAssets = assets.filter(a => !a.isDeleted);

  // Modal state
  type AssetTarget = 'liability' | 'payment' | 'receive' | null;
  const [calcOpen, setCalcOpen] = useState<'total' | 'installment' | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [assetModalTarget, setAssetModalTarget] = useState<AssetTarget>(null);
  const [creditCatName, setCreditCatName] = useState('');
  const [creditSubCatName, setCreditSubCatName] = useState('');

  const getAssetName = (id: string) => activeAssets.find(a => a.id === id)?.name || '-- Tidak ada --';

  useEffect(() => {
    if (!isOpen) return;
    if (editingDebt) {
      setType(editingDebt.type);
      setContact(editingDebt.contact);
      setDescription(editingDebt.description);
      setPrincipalAmount((editingDebt.principalAmount || editingDebt.totalAmount).toLocaleString('id-ID'));
      setHasInterest(!!editingDebt.interestAmount);
      setInterestType(editingDebt.interestType || 'fixed');
      setInterestRate(editingDebt.interestRate ? String(editingDebt.interestRate) : '');
      setInterestAmount(editingDebt.interestAmount ? editingDebt.interestAmount.toLocaleString('id-ID') : '');
      setDueDate(editingDebt.dueDate || '');
      setIsInstallment(editingDebt.isInstallment);
      setInstallmentAmount(editingDebt.installmentAmount?.toLocaleString('id-ID') || '');
      setInstallmentDay(String(editingDebt.installmentDay || 25));
      setTotalInstallments(String(editingDebt.totalInstallments || ''));
      setLiabilityAssetId(editingDebt.liabilityAssetId || '');
      setPaymentAssetId(editingDebt.paymentAssetId || '');
      setReceiveAssetId(editingDebt.receiveAssetId || '');
      setHutangMode('none');
      setCreditCatName('');
      setCreditSubCatName('');
      setCreatedAt(editingDebt.createdAt.split('T')[0]);
    } else {
      setType(defaultType || 'hutang');
      setContact('');
      setDescription('');
      setPrincipalAmount('');
      setHasInterest(false);
      setInterestType('fixed');
      setInterestRate('');
      setInterestAmount('');
      setDueDate('');
      setIsInstallment(false);
      setInstallmentAmount('');
      setInstallmentDay('25');
      setTotalInstallments('');
      setLiabilityAssetId('');
      setPaymentAssetId(defaultAssetId || activeAssets[0]?.id || '');
      setReceiveAssetId(defaultAssetId || activeAssets[0]?.id || '');
      setHutangMode('none');
      setCreditCatName('');
      setCreditSubCatName('');
      setCreatedAt(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, editingDebt, defaultAssetId]);

  useEffect(() => {
    if (isInstallment && principalAmount && totalInstallments) {
      if (editingDebt) {
        const origTotal = (editingDebt.principalAmount || editingDebt.totalAmount).toLocaleString('id-ID');
        const origMonths = String(editingDebt.totalInstallments || '');
        if (principalAmount === origTotal && totalInstallments === origMonths) {
          return; // Skip auto-calculate on initial load if values haven't changed
        }
      }

      const calcPrincipal = parseNum(principalAmount);
      const calcInterestAmt = hasInterest 
        ? (interestType === 'fixed' ? parseNum(interestAmount) : Math.round(calcPrincipal * (Number(interestRate) / 100))) 
        : 0;
      const finalTotalAmount = calcPrincipal + calcInterestAmt;

      const total = finalTotalAmount;
      const months = Number(totalInstallments);
      if (total > 0 && months > 0) {
        const calculated = Math.round(total / months);
        setInstallmentAmount(calculated.toLocaleString('id-ID'));
      }
    }
  }, [principalAmount, interestAmount, interestRate, interestType, hasInterest, totalInstallments, isInstallment, editingDebt]);


  const parseNum = (s: string) => Number(s.replace(/\./g, ''));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const calcPrincipal = parseNum(principalAmount);
    const calcInterestAmt = hasInterest 
      ? (interestType === 'fixed' ? parseNum(interestAmount) : Math.round(calcPrincipal * (Number(interestRate) / 100))) 
      : 0;
    const finalTotalAmount = calcPrincipal + calcInterestAmt;

    onSave(
      {
        type,
        contact:      contact.trim(),
        description:  description.trim(),
        totalAmount:  finalTotalAmount,
        principalAmount: calcPrincipal,
        interestType: hasInterest ? interestType : undefined,
        interestRate: hasInterest && interestType === 'percentage' ? Number(interestRate) : undefined,
        interestAmount: hasInterest ? calcInterestAmt : undefined,
        dueDate:      dueDate || undefined,
        isPaid:       editingDebt?.isPaid || false,
        date:         createdAt,
        createdAt:    editingDebt ? editingDebt.createdAt : new Date(createdAt).toISOString(),
        isInstallment,
        installmentAmount:  isInstallment ? parseNum(installmentAmount) : undefined,
        installmentDay:     isInstallment ? Number(installmentDay) : undefined,
        totalInstallments:  isInstallment && totalInstallments ? Number(totalInstallments) : undefined,
        paidInstallments:   editingDebt?.paidInstallments || 0,
        liabilityAssetId:   type === 'hutang' ? (liabilityAssetId || undefined) : undefined,
        paymentAssetId:     paymentAssetId || undefined,
        receiveAssetId:     type === 'piutang' ? (receiveAssetId || undefined) : undefined,
      },
      type === 'hutang' ? hutangMode : undefined,
      type === 'hutang' && hutangMode === 'credit' ? creditCatName : undefined,
      type === 'hutang' && hutangMode === 'credit' ? creditSubCatName : undefined,
    );
    
    setTimeout(() => setIsSubmitting(false), 1000);
    onClose();
  };

  const typeColor = type === 'hutang' ? 'var(--danger)' : 'var(--success)';

  const modeOptions: { key: 'none' | 'cash' | 'credit'; emoji: string; title: string; desc: string }[] = [
    { key: 'none',   emoji: '📝', title: 'Hanya Catatan',    desc: 'Tidak buat transaksi (hutang lama / sudah tercatat)' },
    { key: 'cash',   emoji: '💵', title: 'Pinjaman Tunai',   desc: 'Uang masuk ke rekening → buat pendapatan otomatis' },
    { key: 'credit', emoji: '💳', title: 'Kredit / Paylater', desc: 'Belanja pakai kredit → buat pengeluaran otomatis' },
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={editingDebt ? 'Edit Catatan' : 'Tambah Hutang / Piutang'}
        testId="debt-modal"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex gap-2">
            {(['hutang', 'piutang'] as const).map(t => (
              <button
                key={t} type="button"
                onClick={() => setType(t)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  border: type === t ? `2px solid ${t === 'hutang' ? 'var(--danger)' : 'var(--success)'}` : '1px solid var(--border-color)',
                  background: type === t ? (t === 'hutang' ? 'var(--bg-expense)' : 'var(--success-glow)') : 'var(--bg-card)',
                  color: type === t ? (t === 'hutang' ? 'var(--danger)' : 'var(--success)') : 'var(--text-muted)',
                }}
              >
                {t === 'hutang' ? '🔴 Saya Berhutang' : '🟢 Piutang Saya'}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              {type === 'hutang' ? 'Hutang ke siapa / institusi' : 'Siapa yang berhutang ke kamu'}
            </label>
            <button
              data-testid="debt-contact-select"
              type="button"
              onClick={() => setContactModalOpen(true)}
              style={{
                width: '100%', padding: '12px 14px',
                background: 'var(--bg-card-solid)',
                border: '2px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer'
              }}
              data-tour="debt-modal-contact"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MaterialIcon name="person" />
                <span style={{
                  fontSize: 13,
                  fontWeight: contact ? 600 : 400,
                  color: contact ? 'var(--text-main)' : 'var(--text-muted)'
                }}>
                  {contact || '-- Pilih Kontak --'}
                </span>
              </div>
              <MaterialIcon name="chevron_right" className="text-[16px]" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Keterangan</label>
            <Input data-testid="debt-desc-input" type="text" placeholder="Untuk apa / keterangan" value={description} onChange={e => setDescription(e.target.value)} data-tour="debt-modal-description" style={{ marginBottom: 0 }} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pokok Pinjaman ({currencySymbol})</label>
            <div className="flex gap-2">
              <CurrencyInput
                data-testid="debt-amount-input"
                required
                placeholder="0"
                value={principalAmount}
                onChange={setPrincipalAmount}
                style={{ flex: 1, marginBottom: 0 }}
                data-tour="debt-modal-amount"
              />
              <button
                type="button"
                onClick={() => setCalcOpen('total')}
                style={{ 
                  width: 48, height: 48, borderRadius: 12, 
                  background: type === 'hutang' ? 'var(--bg-expense)' : 'var(--success-glow)', 
                  border: `1px solid ${type === 'hutang' ? 'var(--danger-glow)' : 'var(--success-glow)'}`, 
                  color: typeColor, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 
                }}
              >
                <MaterialIcon name="calculate" className="text-[20px]" />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center py-1">
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>Tambahkan Bunga?</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Bunga akan digabung ke total tagihan final</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={hasInterest} onChange={(e) => setHasInterest(e.target.checked)} />
              <span className="slider round"></span>
            </label>
          </div>

          {hasInterest && (
            <div style={{ background: 'var(--bg-main)', padding: 12, borderRadius: 12, border: '1px solid var(--border-color)' }} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInterestType('fixed')}
                  style={{ flex: 1, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 600, border: interestType === 'fixed' ? `1px solid ${typeColor}` : '1px solid var(--border-color)', background: interestType === 'fixed' ? (type === 'hutang' ? 'var(--bg-expense)' : 'var(--success-glow)') : 'var(--bg-card)', color: interestType === 'fixed' ? typeColor : 'var(--text-muted)' }}
                >Nominal Tetap</button>
                <button
                  type="button"
                  onClick={() => setInterestType('percentage')}
                  style={{ flex: 1, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 600, border: interestType === 'percentage' ? `1px solid ${typeColor}` : '1px solid var(--border-color)', background: interestType === 'percentage' ? (type === 'hutang' ? 'var(--bg-expense)' : 'var(--success-glow)') : 'var(--bg-card)', color: interestType === 'percentage' ? typeColor : 'var(--text-muted)' }}
                >Persentase (%)</button>
              </div>

              {interestType === 'fixed' ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nominal Bunga ({currencySymbol})</label>
                  <CurrencyInput required={hasInterest} placeholder="0" value={interestAmount} onChange={setInterestAmount} style={{ marginBottom: 0 }} />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Persentase Bunga (%)</label>
                  <Input type="number" step="0.1" required={hasInterest} placeholder="misal: 5" value={interestRate} onChange={e => setInterestRate(e.target.value)} style={{ marginBottom: 0 }} />
                </div>
              )}
              
              <div style={{ paddingTop: 12, borderTop: '1px dashed var(--border-color)' }} className="flex justify-between items-center">
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Total Tagihan Akhir:</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: typeColor }}>
                  {currencySymbol}{(parseNum(principalAmount) + (interestType === 'fixed' ? parseNum(interestAmount) : Math.round(parseNum(principalAmount) * (Number(interestRate) / 100)))).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tanggal Pinjam</label>
              <Input data-testid="debt-date-input" type="date" required value={createdAt} onChange={e => setCreatedAt(e.target.value)} style={{ marginBottom: 0 }} />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Jatuh Tempo (opsional)</label>
              <Input data-testid="debt-duedate-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ marginBottom: 0 }} />
            </div>
          </div>

          {type === 'hutang' && !editingDebt && (
            <div style={{ background: 'hsla(350,80%,58%,0.08)', borderRadius: 12, padding: '12px 14px', border: '1px solid hsla(350,80%,58%,0.18)' }} className="flex flex-col gap-3">
              <div className="text-xs font-bold text-error uppercase tracking-wider">
                Metode Pencatatan
              </div>
              <div className="flex flex-col gap-2">
                {modeOptions.map(opt => (
                  <div
                    key={opt.key}
                    onClick={() => setHutangMode(opt.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                      borderRadius: 10, cursor: 'pointer',
                      border: hutangMode === opt.key ? '2px solid var(--danger)' : '1.5px solid var(--border-color)',
                      background: hutangMode === opt.key ? 'var(--bg-expense)' : 'var(--bg-card)',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: hutangMode === opt.key ? 'var(--danger)' : 'var(--text-main)' }}>{opt.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{opt.desc}</div>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: 9, flexShrink: 0,
                      border: hutangMode === opt.key ? '5px solid var(--danger)' : '2px solid var(--border-color)',
                      background: 'var(--bg-card)',
                    }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === 'hutang' && (
            <div style={{ background: 'hsla(350,80%,58%,0.08)', borderRadius: 12, padding: '12px 14px', border: '1px solid hsla(350,80%,58%,0.18)' }} className="flex flex-col gap-3">
              <div className="text-xs font-bold text-error uppercase tracking-wider">
                Rekening / Akun Hutang
              </div>

              {hutangMode === 'credit' && !editingDebt && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">🏷️ Kategori Pengeluaran</label>
                  <button type="button" onClick={() => setCatModalOpen(true)} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-card-solid)', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MaterialIcon name="folder" />
                      <span style={{ fontSize: 13, fontWeight: creditCatName ? 600 : 400, color: creditCatName ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {creditCatName ? (creditSubCatName ? `${creditCatName} > ${creditSubCatName}` : creditCatName) : '-- Pilih Kategori --'}
                      </span>
                    </div>
                    <MaterialIcon name="chevron_right" className="text-[16px]" />
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">💳 {hutangMode === 'credit' ? 'Bayar pakai (Kartu Kredit / Paylater)' : 'Tempat hutangnya (misal: ShopeePay Later)'}</label>
                <button type="button" onClick={() => setAssetModalTarget('liability')} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-card-solid)', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MaterialIcon name="account_balance_wallet" /><span style={{ fontSize: 13, fontWeight: liabilityAssetId ? 600 : 400, color: liabilityAssetId ? 'var(--text-main)' : 'var(--text-muted)' }}>{liabilityAssetId ? getAssetName(liabilityAssetId) : '-- Tidak ada / Tunai --'}</span></div>
                  <MaterialIcon name="chevron_right" className="text-[16px]" />
                </button>
              </div>

              {hutangMode === 'cash' && !editingDebt && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">🏦 Uang masuk ke rekening mana</label>
                  <button type="button" onClick={() => setAssetModalTarget('payment')} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-card-solid)', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MaterialIcon name="account_balance_wallet" /><span style={{ fontSize: 13, fontWeight: paymentAssetId ? 600 : 400, color: paymentAssetId ? 'var(--text-main)' : 'var(--text-muted)' }}>{paymentAssetId ? getAssetName(paymentAssetId) : '-- Tidak ada --'}</span></div>
                    <MaterialIcon name="chevron_right" className="text-[16px]" />
                  </button>
                </div>
              )}

              {editingDebt && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">🏦 Bayar dari rekening (misal: BCA)</label>
                  <button type="button" onClick={() => setAssetModalTarget('payment')} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-card-solid)', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MaterialIcon name="account_balance_wallet" /><span style={{ fontSize: 13, fontWeight: paymentAssetId ? 600 : 400, color: paymentAssetId ? 'var(--text-main)' : 'var(--text-muted)' }}>{paymentAssetId ? getAssetName(paymentAssetId) : '-- Tidak ada --'}</span></div>
                    <MaterialIcon name="chevron_right" className="text-[16px]" />
                  </button>
                </div>
              )}
            </div>
          )}

          {type === 'piutang' && (
            <div style={{ background: 'var(--success-glow)', borderRadius: 12, padding: '12px 14px', border: '1px solid hsla(145,65%,43%,0.18)' }} className="flex flex-col gap-3">
              <div className="text-xs font-bold text-success uppercase tracking-wider">
                Pengaturan Rekening
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">💰 Pinjamkan dari rekening (Dana keluar)</label>
                <button type="button" onClick={() => setAssetModalTarget('payment')} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-card-solid)', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MaterialIcon name="account_balance_wallet" /><span style={{ fontSize: 13, fontWeight: paymentAssetId ? 600 : 400, color: paymentAssetId ? 'var(--text-main)' : 'var(--text-muted)' }}>{paymentAssetId ? getAssetName(paymentAssetId) : '-- Tidak ada (Hanya catatan) --'}</span></div>
                  <MaterialIcon name="chevron_right" className="text-[16px]" />
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">🏦 Terima cicilan ke rekening mana (Dana masuk)</label>
                <button type="button" onClick={() => setAssetModalTarget('receive')} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-card-solid)', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MaterialIcon name="account_balance_wallet" /><span style={{ fontSize: 13, fontWeight: receiveAssetId ? 600 : 400, color: receiveAssetId ? 'var(--text-main)' : 'var(--text-muted)' }}>{receiveAssetId ? getAssetName(receiveAssetId) : '-- Tidak ada --'}</span></div>
                  <MaterialIcon name="chevron_right" className="text-[16px]" />
                </button>
              </div>
            </div>
          )}

          <div
            onClick={() => setIsInstallment(p => !p)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
              background: isInstallment ? 'var(--bg-income)' : 'var(--bg-neutral)',
              border: `1.5px solid ${isInstallment ? 'var(--primary)' : 'var(--border-color)'}`,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>Cicilan Bulanan</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Bayar rutin tiap bulan + auto-generate transaksi</div>
            </div>
            <div style={{
              width: 40, height: 22, borderRadius: 11, padding: '0 2px',
              background: isInstallment ? typeColor : 'var(--border-color)',
              display: 'flex', alignItems: 'center', transition: 'background 0.2s',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 9, background: 'white',
                transform: isInstallment ? 'translateX(18px)' : 'none',
                transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>

          {isInstallment && (
            <div style={{ background: 'var(--success-glow)', borderRadius: 12, padding: 14, border: '1px solid hsla(145,65%,43%,0.18)' }} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nominal Per Cicilan ({currencySymbol}) - <span style={{ color: typeColor, fontStyle: 'italic' }}>Otomatis Terisi</span></label>
                <div className="flex gap-2">
                  <CurrencyInput required={isInstallment} placeholder="0" value={installmentAmount} onChange={setInstallmentAmount} style={{ flex: 1, marginBottom: 0 }} />
                  <button 
                    type="button" 
                    onClick={() => setCalcOpen('installment')} 
                    style={{ 
                      width: 48, height: 48, borderRadius: 12, 
                      background: type === 'hutang' ? 'var(--bg-expense)' : 'var(--success-glow)', 
                      border: `1px solid ${type === 'hutang' ? 'var(--danger-glow)' : 'var(--success-glow)'}`, 
                      color: typeColor, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 
                    }}
                  >
                    <MaterialIcon name="calculate" className="text-[20px]" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Cicilan (bulan)</label>
                  <Input type="number" min="1" max="360" placeholder="Misal: 36" value={totalInstallments} onChange={e => setTotalInstallments(e.target.value)} style={{ marginBottom: 0 }} />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tgl Jatuh Tempo</label>
                  <Input type="number" min="1" max="31" placeholder="25" value={installmentDay} onChange={e => setInstallmentDay(e.target.value)} style={{ marginBottom: 0 }} />
                </div>
              </div>
            </div>
          )}

          <Button
            data-testid="debt-submit-btn"
            disabled={isSubmitting}
            type="submit"
            variant={type === 'hutang' ? 'danger' : 'success'}
            fullWidth
            style={{ marginTop: 14, fontWeight: 700, padding: '13px' }}
            data-tour="debt-modal-submit"
          >
            {editingDebt ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </form>
      </Modal>

    <CalculatorModal
      isOpen={calcOpen !== null}
      onClose={() => setCalcOpen(null)}
      initialValue={calcOpen === 'total' ? principalAmount : installmentAmount}
      onConfirm={(val) => {
        const formatted = val.toLocaleString('id-ID');
        if (calcOpen === 'total') setPrincipalAmount(formatted);
        else setInstallmentAmount(formatted);
      }}
    />

    <CategorySelectModal
      isOpen={catModalOpen}
      onClose={() => setCatModalOpen(false)}
      categories={categories}
      type="pengeluaran"
      initialCategoryId={creditCatName}
      initialSubCategoryId={creditSubCatName}
      onSelect={(cat, sub) => { setCreditCatName(cat); setCreditSubCatName(sub); }}
    />

    <AssetSelectModal
      isOpen={assetModalTarget !== null}
      onClose={() => setAssetModalTarget(null)}
      assets={activeAssets}
      selectedAssetId={assetModalTarget === 'liability' ? liabilityAssetId : assetModalTarget === 'receive' ? receiveAssetId : paymentAssetId}
      onSelect={(id) => {
        if (assetModalTarget === 'liability') setLiabilityAssetId(id);
        else if (assetModalTarget === 'receive') setReceiveAssetId(id);
        else setPaymentAssetId(id);
      }}
    />

    <ContactSelectModal
      isOpen={contactModalOpen}
      onClose={() => setContactModalOpen(false)}
      contacts={contacts}
      selectedContactName={contact}
      onSelect={(name) => setContact(name)}
    />
    </>
  );
};

export default DebtModal;
