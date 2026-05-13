import React, { useState, useEffect } from 'react';
import { X, Calculator, Folder, Wallet, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney, type Debt, type Asset, type Category } from '../../contexts/MoneyContext';
import CalculatorModal from './CalculatorModal';
import CategorySelectModal from './CategorySelectModal';
import AssetSelectModal from './AssetSelectModal';
import ContactSelectModal from './ContactSelectModal';
import { User } from 'lucide-react';

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
  const [totalAmount, setTotalAmount]             = useState('');
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
      setTotalAmount(editingDebt.totalAmount.toLocaleString('id-ID'));
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
      setTotalAmount('');
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

  // Auto-calculate installment amount
  useEffect(() => {
    if (isInstallment && totalAmount && totalInstallments) {
      if (editingDebt) {
        const origTotal = editingDebt.totalAmount.toLocaleString('id-ID');
        const origMonths = String(editingDebt.totalInstallments || '');
        if (totalAmount === origTotal && totalInstallments === origMonths) {
          return; // Skip auto-calculate on initial load if values haven't changed
        }
      }

      const total = parseNum(totalAmount);
      const months = Number(totalInstallments);
      if (total > 0 && months > 0) {
        const calculated = Math.round(total / months);
        setInstallmentAmount(calculated.toLocaleString('id-ID'));
      }
    }
  }, [totalAmount, totalInstallments, isInstallment, editingDebt]);

  const formatNum = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const raw = e.target.value.replace(/\D/g, '');
    setter(raw ? Number(raw).toLocaleString('id-ID') : '');
  };
  const parseNum = (s: string) => Number(s.replace(/\./g, ''));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      {
        type,
        contact:      contact.trim(),
        description:  description.trim(),
        totalAmount:  parseNum(totalAmount),
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
                {editingDebt ? 'Edit Catatan' : 'Tambah Hutang / Piutang'}
              </h2>
              <button className="close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
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

              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                {type === 'hutang' ? 'Hutang ke siapa / institusi' : 'Siapa yang berhutang ke kamu'}
              </label>
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                style={{
                  width: '100%', padding: '12px 14px',
                  background: 'var(--bg-card-solid)',
                  border: '2px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 16, cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={16} color={typeColor} />
                  <span style={{
                    fontSize: 13,
                    fontWeight: contact ? 600 : 400,
                    color: contact ? 'var(--text-main)' : 'var(--text-muted)'
                  }}>
                    {contact || '-- Pilih Kontak --'}
                  </span>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </button>

              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Keterangan</label>
              <input type="text" placeholder="Untuk apa / keterangan" value={description} onChange={e => setDescription(e.target.value)} />

              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Total Jumlah ({currencySymbol})</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: 16 }}>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="0"
                  value={totalAmount}
                  onChange={e => formatNum(e, setTotalAmount)}
                  style={{ flex: 1, marginBottom: 0 }}
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
                  <Calculator size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Tanggal Pinjam</label>
                  <input type="date" required value={createdAt} onChange={e => setCreatedAt(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Jatuh Tempo (opsional)</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>

              {type === 'hutang' && !editingDebt && (
                <div style={{ background: 'hsla(350,80%,58%,0.08)', borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: '1px solid hsla(350,80%,58%,0.18)' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--danger)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Metode Pencatatan
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                <div style={{ background: 'hsla(350,80%,58%,0.08)', borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: '1px solid hsla(350,80%,58%,0.18)' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--danger)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Rekening / Akun Hutang
                  </div>

                  {hutangMode === 'credit' && !editingDebt && (
                    <>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>🏷️ Kategori Pengeluaran</label>
                      <button type="button" onClick={() => setCatModalOpen(true)} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-card-solid)', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Folder size={16} color={typeColor} />
                          <span style={{ fontSize: 13, fontWeight: creditCatName ? 600 : 400, color: creditCatName ? 'var(--text-main)' : 'var(--text-muted)' }}>
                            {creditCatName ? (creditSubCatName ? `${creditCatName} > ${creditSubCatName}` : creditCatName) : '-- Pilih Kategori --'}
                          </span>
                        </div>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </button>
                    </>
                  )}

                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>💳 {hutangMode === 'credit' ? 'Bayar pakai (Kartu Kredit / Paylater)' : 'Tempat hutangnya (misal: ShopeePay Later)'}</label>
                  <button type="button" onClick={() => setAssetModalTarget('liability')} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-card-solid)', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hutangMode === 'cash' ? 10 : 16, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Wallet size={16} color={typeColor} /><span style={{ fontSize: 13, fontWeight: liabilityAssetId ? 600 : 400, color: liabilityAssetId ? 'var(--text-main)' : 'var(--text-muted)' }}>{liabilityAssetId ? getAssetName(liabilityAssetId) : '-- Tidak ada / Tunai --'}</span></div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </button>

                  {hutangMode === 'cash' && !editingDebt && (
                    <>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>🏦 Uang masuk ke rekening mana</label>
                      <button type="button" onClick={() => setAssetModalTarget('payment')} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-card-solid)', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Wallet size={16} color={typeColor} /><span style={{ fontSize: 13, fontWeight: paymentAssetId ? 600 : 400, color: paymentAssetId ? 'var(--text-main)' : 'var(--text-muted)' }}>{paymentAssetId ? getAssetName(paymentAssetId) : '-- Tidak ada --'}</span></div>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </button>
                    </>
                  )}

                  {editingDebt && (
                    <>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 10, display: 'block' }}>🏦 Bayar dari rekening (misal: BCA)</label>
                      <button type="button" onClick={() => setAssetModalTarget('payment')} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-card-solid)', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Wallet size={16} color={typeColor} /><span style={{ fontSize: 13, fontWeight: paymentAssetId ? 600 : 400, color: paymentAssetId ? 'var(--text-main)' : 'var(--text-muted)' }}>{paymentAssetId ? getAssetName(paymentAssetId) : '-- Tidak ada --'}</span></div>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {type === 'piutang' && (
                <div style={{ background: 'var(--success-glow)', borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: '1px solid hsla(145,65%,43%,0.18)' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--success)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Pengaturan Rekening
                  </div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>💰 Pinjamkan dari rekening (Dana keluar)</label>
                  <button type="button" onClick={() => setAssetModalTarget('payment')} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-card-solid)', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Wallet size={16} color={typeColor} /><span style={{ fontSize: 13, fontWeight: paymentAssetId ? 600 : 400, color: paymentAssetId ? 'var(--text-main)' : 'var(--text-muted)' }}>{paymentAssetId ? getAssetName(paymentAssetId) : '-- Tidak ada (Hanya catatan) --'}</span></div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </button>

                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>🏦 Terima cicilan ke rekening mana (Dana masuk)</label>
                  <button type="button" onClick={() => setAssetModalTarget('receive')} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-card-solid)', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Wallet size={16} color={typeColor} /><span style={{ fontSize: 13, fontWeight: receiveAssetId ? 600 : 400, color: receiveAssetId ? 'var(--text-main)' : 'var(--text-muted)' }}>{receiveAssetId ? getAssetName(receiveAssetId) : '-- Tidak ada --'}</span></div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </button>
                </div>
              )}

              <div
                onClick={() => setIsInstallment(p => !p)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 14px', borderRadius: 12, marginBottom: 8, cursor: 'pointer',
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
                <div style={{ background: 'var(--success-glow)', borderRadius: 12, padding: 14, marginBottom: 8, border: '1px solid hsla(145,65%,43%,0.18)' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Nominal Per Cicilan ({currencySymbol}) - <span style={{ color: typeColor, fontStyle: 'italic' }}>Otomatis Terisi</span></label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input type="text" inputMode="numeric" required={isInstallment} placeholder="0" value={installmentAmount} onChange={e => formatNum(e, setInstallmentAmount)} style={{ flex: 1, marginBottom: 0 }} />
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
                      <Calculator size={20} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Total Cicilan (bulan)</label>
                      <input type="number" min="1" max="360" placeholder="Misal: 36" value={totalInstallments} onChange={e => setTotalInstallments(e.target.value)} style={{ marginBottom: 0 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Tgl Jatuh Tempo</label>
                      <input type="number" min="1" max="31" placeholder="25" value={installmentDay} onChange={e => setInstallmentDay(e.target.value)} style={{ marginBottom: 0 }} />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn"
                style={{
                  width: '100%', marginTop: 14, fontWeight: 700,
                  background: typeColor, color: 'white', border: 'none', borderRadius: 12, padding: '13px',
                }}
              >
                {editingDebt ? 'Simpan Perubahan' : 'Simpan'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <CalculatorModal
      isOpen={calcOpen !== null}
      onClose={() => setCalcOpen(null)}
      initialValue={calcOpen === 'total' ? totalAmount : installmentAmount}
      onConfirm={(val) => {
        const formatted = val.toLocaleString('id-ID');
        if (calcOpen === 'total') setTotalAmount(formatted);
        else setInstallmentAmount(formatted);
      }}
    />

    <CategorySelectModal
      isOpen={catModalOpen}
      onClose={() => setCatModalOpen(false)}
      categories={categories}
      type="pengeluaran"
      initialCategory={creditCatName}
      initialSubCategory={creditSubCatName}
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
