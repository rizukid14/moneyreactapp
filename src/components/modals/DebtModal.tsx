import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Debt, Asset, Category } from '../../contexts/MoneyContext';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (debt: Omit<Debt, 'id'>, initialMode?: 'none' | 'cash' | 'credit', categoryName?: string) => void;
  editingDebt: Debt | null;
  assets: Asset[];
  categories: Category[]; // expense categories for credit mode
}

const DebtModal: React.FC<DebtModalProps> = ({ isOpen, onClose, onSave, editingDebt, assets, categories }) => {
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
  const [creditCategoryId, setCreditCategoryId]   = useState('');

  const activeAssets = assets.filter(a => !a.isDeleted);

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
      setPaymentAssetId(editingDebt.paymentAssetId || activeAssets[0]?.id || '');
      setReceiveAssetId(editingDebt.receiveAssetId || activeAssets[0]?.id || '');
      setHutangMode('none'); // don't re-trigger tx on edit
      setCreditCategoryId(categories[0]?.id || '');
    } else {
      setType('hutang');
      setContact('');
      setDescription('');
      setTotalAmount('');
      setDueDate('');
      setIsInstallment(false);
      setInstallmentAmount('');
      setInstallmentDay('25');
      setTotalInstallments('');
      setLiabilityAssetId('');
      setPaymentAssetId(activeAssets[0]?.id || '');
      setReceiveAssetId(activeAssets[0]?.id || '');
      setHutangMode('none');
      setCreditCategoryId(categories[0]?.id || '');
    }
  }, [isOpen, editingDebt]);

  // Auto-calculate installment amount
  useEffect(() => {
    if (isInstallment && totalAmount && totalInstallments && !editingDebt) {
      const total = parseNum(totalAmount);
      const months = Number(totalInstallments);
      if (total > 0 && months > 0) {
        const calculated = Math.round(total / months);
        setInstallmentAmount(calculated.toLocaleString('id-ID'));
      }
    }
  }, [totalAmount, totalInstallments, isInstallment, editingDebt]);

  if (!isOpen) return null;

  const formatNum = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const raw = e.target.value.replace(/\D/g, '');
    setter(raw ? Number(raw).toLocaleString('id-ID') : '');
  };
  const parseNum = (s: string) => Number(s.replace(/\./g, ''));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const categoryName = categories.find(c => c.id === creditCategoryId)?.name;
    onSave(
      {
        type,
        contact:      contact.trim(),
        description:  description.trim(),
        totalAmount:  parseNum(totalAmount),
        dueDate:      dueDate || undefined,
        isPaid:       editingDebt?.isPaid || false,
        createdAt:    editingDebt?.createdAt || new Date().toISOString(),
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
      type === 'hutang' && hutangMode === 'credit' ? categoryName : undefined,
    );
    onClose();
  };

  const typeColor = type === 'hutang' ? 'var(--danger)' : 'var(--primary)';

  // ── Mode options for Hutang ─────────────────────────────────────────────
  const modeOptions: { key: 'none' | 'cash' | 'credit'; emoji: string; title: string; desc: string }[] = [
    { key: 'none',   emoji: '📝', title: 'Hanya Catatan',    desc: 'Tidak buat transaksi (hutang lama / sudah tercatat)' },
    { key: 'cash',   emoji: '💵', title: 'Pinjaman Tunai',   desc: 'Uang masuk ke rekening → buat pendapatan otomatis' },
    { key: 'credit', emoji: '💳', title: 'Kredit / Paylater', desc: 'Belanja pakai kredit → buat pengeluaran otomatis' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="subtitle" style={{ margin: 0 }}>
            {editingDebt ? 'Edit Catatan' : 'Tambah Hutang / Piutang'}
          </h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSave}>
          {/* Type toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['hutang', 'piutang'] as const).map(t => (
              <button
                key={t} type="button"
                onClick={() => setType(t)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  border: type === t ? `2px solid ${t === 'hutang' ? 'var(--danger)' : 'var(--primary)'}` : '1px solid var(--border-color)',
                  background: type === t ? (t === 'hutang' ? 'var(--bg-expense)' : 'var(--bg-income)') : 'var(--bg-card)',
                  color: type === t ? (t === 'hutang' ? 'var(--danger)' : 'var(--primary)') : 'var(--text-muted)',
                }}
              >
                {t === 'hutang' ? '🔴 Saya Berhutang' : '🟢 Piutang Saya'}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
            {type === 'hutang' ? 'Hutang ke siapa / institusi' : 'Siapa yang berhutang ke kamu'}
          </label>
          <input type="text" required placeholder="Nama kontak / Bank / dll." value={contact} onChange={e => setContact(e.target.value)} />

          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Keterangan</label>
          <input type="text" placeholder="Untuk apa / keterangan" value={description} onChange={e => setDescription(e.target.value)} />

          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Total Jumlah (Rp)</label>
          <input type="text" inputMode="numeric" required placeholder="0" value={totalAmount} onChange={e => formatNum(e, setTotalAmount)} />

          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Jatuh Tempo (opsional)</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />

          {/* ── Hutang: mode selector ── */}
          {type === 'hutang' && !editingDebt && (
            <div style={{ background: 'var(--bg-main)', borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
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

          {/* ── Hutang: Asset fields depending on mode ── */}
          {type === 'hutang' && (
            <div style={{ background: 'var(--bg-main)', borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--danger)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Rekening / Akun Hutang
              </div>

              {/* Credit mode: pick expense category */}
              {hutangMode === 'credit' && !editingDebt && (
                <>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                    🏷️ Kategori Pengeluaran
                  </label>
                  <select value={creditCategoryId} onChange={e => setCreditCategoryId(e.target.value)} style={{ marginBottom: 10 }}>
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </>
              )}

              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                💳 {hutangMode === 'credit' ? 'Bayar pakai (Kartu Kredit / Paylater)' : 'Tempat hutangnya (misal: ShopeePay Later)'}
              </label>
              <select value={liabilityAssetId} onChange={e => setLiabilityAssetId(e.target.value)} style={{ marginBottom: hutangMode === 'cash' ? 10 : 0 }}>
                <option value="">-- Tidak ada / Tunai --</option>
                {activeAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              {/* Cash mode: where the cash arrived */}
              {hutangMode === 'cash' && !editingDebt && (
                <>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                    🏦 Uang masuk ke rekening mana
                  </label>
                  <select value={paymentAssetId} onChange={e => setPaymentAssetId(e.target.value)} style={{ marginBottom: 0 }}>
                    <option value="">-- Tidak ada --</option>
                    {activeAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </>
              )}

              {/* Editing: always show payment asset */}
              {editingDebt && (
                <>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 10, display: 'block' }}>
                    🏦 Bayar dari rekening (misal: BCA)
                  </label>
                  <select value={paymentAssetId} onChange={e => setPaymentAssetId(e.target.value)} style={{ marginBottom: 0 }}>
                    <option value="">-- Tidak ada --</option>
                    {activeAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </>
              )}
            </div>
          )}

          {/* ── Piutang: asset fields ── */}
          {type === 'piutang' && (
            <div style={{ background: 'var(--bg-main)', borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Pengaturan Rekening
              </div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                💰 Pinjamkan dari rekening (Dana keluar)
              </label>
              <select value={paymentAssetId} onChange={e => setPaymentAssetId(e.target.value)} style={{ marginBottom: 10 }}>
                <option value="">-- Tidak ada (Hanya catatan) --</option>
                {activeAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                🏦 Terima cicilan ke rekening mana (Dana masuk)
              </label>
              <select value={receiveAssetId} onChange={e => setReceiveAssetId(e.target.value)} style={{ marginBottom: 0 }}>
                <option value="">-- Tidak ada --</option>
                {activeAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          {/* Installment toggle */}
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
              background: isInstallment ? 'var(--primary)' : 'var(--border-color)',
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
            <div style={{ background: 'var(--bg-main)', borderRadius: 12, padding: 14, marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Nominal Per Cicilan (Rp) - <span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>Otomatis Terisi</span></label>
              <input type="text" inputMode="numeric" required={isInstallment} placeholder="0" value={installmentAmount} onChange={e => formatNum(e, setInstallmentAmount)} />

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
      </div>
    </div>
  );
};

export default DebtModal;
