import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  ShoppingBag,
  Calendar,
  Share2,
  ExternalLink,
  Wallet,
  Info,
  CheckCircle2,
  PlusCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { dbGetSharedSplit, type SharedSplit } from '../lib/db';
import { useMoney } from '../contexts/MoneyContext';
import { useToast } from '../components/common/Toast';

const SharedSplitBill: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { addDebt } = useMoney();
  const { showToast } = useToast();
  const [split, setSplit] = useState<SharedSplit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'simple' | 'detailed'>('simple');

  useEffect(() => {
    const fetchSplit = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const data = await dbGetSharedSplit(id);
        if (data) {
          setSplit(data);
          if (data.settlementMode) setMode(data.settlementMode as any);
        } else {
          setError('Link split bill tidak ditemukan atau sudah dihapus.');
        }
      } catch (err) {
        setError('Gagal memuat data split bill.');
      } finally {
        setLoading(false);
      }
    };

    fetchSplit();
  }, [id]);

  const activeTransactions = useMemo(() => {
    if (!split) return [];
    if (split.type !== 'trip') return split.splits;

    // If it's a trip, check if current mode matches saved mode
    const savedMode = split.settlementMode || 'simple';
    if (mode === savedMode) return split.splits;
    return split.secondarySplits || [];
  }, [split, mode]);

  const handleSaveToDebts = (item: any) => {
    if (!split) return;

    // For Trip Settlement
    if (split.type === 'trip') {
      const isPayer = window.confirm(`Apakah Anda adalah ${item.from}? (Jika YA, ini akan dicatat sebagai HUTANG Anda ke ${item.to}. Jika TIDAK, kami asumsikan Anda adalah ${item.to} dan ini dicatat sebagai PIUTANG Anda dari ${item.from})`);

      addDebt({
        type: isPayer ? 'hutang' : 'piutang',
        contact: isPayer ? item.to : item.from,
        description: `Settle Trip: ${split.merchantName}`,
        totalAmount: item.amount,
        isPaid: false,
        createdAt: new Date().toISOString(),
        isInstallment: false,
        paidInstallments: 0
      }, 'none');
    } else {
      // For Normal Split
      addDebt({
        type: item.isPayer ? 'piutang' : 'hutang',
        contact: item.contactName,
        description: `Split Bill: ${split.merchantName}`,
        totalAmount: item.amount,
        isPaid: false,
        createdAt: new Date().toISOString(),
        isInstallment: false,
        paidInstallments: 0
      }, 'none');
    }

    showToast('Berhasil dicatat ke daftar Hutang/Piutang!', 'success');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{ width: '48px', height: '48px', border: '3px solid var(--primary-glow)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}
        />
        <p style={{ marginTop: '16px', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Memuat Tagihan...</p>
      </div>
    );
  }

  if (error || !split) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ maxWidth: '400px', width: '100%', background: 'var(--bg-card)', padding: '40px', borderRadius: '32px', border: '1px solid var(--border-color)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
        >
          <div style={{ width: '80px', height: '80px', background: 'var(--danger-glow)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', transform: 'rotate(12deg)' }}>
            <AlertCircle size={40} color="var(--danger)" style={{ transform: 'rotate(-12deg)' }} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Link Terputus!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>
            {error || 'Data tagihan ini tidak dapat ditemukan.'}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="btn btn-primary"
            style={{ width: '100%', padding: '16px', borderRadius: '16px' }}
          >
            Buka MoneyApp
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      overflowY: 'auto',
      background: 'var(--bg-main)',
      position: 'relative',
      overflowX: 'hidden',
      paddingBottom: '80px',
      fontFamily: 'var(--font-family)',
      scrollBehavior: 'smooth'
    }}>
      {/* Background decoration */}
      <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '60%', height: '50%', background: 'var(--primary-glow)', filter: 'blur(100px)', borderRadius: '50%', pointerEvents: 'none', opacity: 0.5 }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '-10%', width: '60%', height: '50%', background: 'var(--secondary-glow)', filter: 'blur(100px)', borderRadius: '50%', pointerEvents: 'none', opacity: 0.5 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
        {/* Navbar */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px var(--primary-glow)' }}>
              <Wallet size={20} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>MoneyApp</span>
          </div>
          <button
            onClick={handleCopyLink}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 700,
              border: '1px solid var(--border-color)', background: copied ? 'var(--success)' : 'var(--bg-card)',
              color: copied ? 'white' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {copied ? <><CheckCircle2 size={14} /> Tersalin</> : <><Share2 size={14} /> Bagikan</>}
          </button>
        </header>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '40px' }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'var(--primary-glow)', borderRadius: '100px', fontSize: '10px', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', border: '1px solid hsla(var(--p-h), 80%, 54%, 0.1)' }}>
            <ShoppingBag size={12} />
            Shared Split Bill
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-1px', lineHeight: 1.1 }}>
            {split.merchantName}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>
            <Calendar size={14} />
            {split.date}
          </div>
        </motion.div>

        {/* Main Amount Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          style={{ background: 'var(--primary-gradient)', padding: '32px', borderRadius: '36px', color: 'white', marginBottom: '32px', boxShadow: '0 25px 50px -12px var(--primary-glow)', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', background: 'white', opacity: 0.1, borderRadius: '50%', filter: 'blur(30px)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.8, marginBottom: '8px' }}>
              {(split as any).type === 'trip' ? 'Total Biaya Perjalanan' : 'Total Tagihan'}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, opacity: 0.9 }}>{split.currencySymbol}</span>
              <span style={{ fontSize: '52px', fontWeight: 900, letterSpacing: '-2px' }}>
                {split.totalAmount.toLocaleString('id-ID')}
              </span>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex' }}>
                {(split.type === 'trip' ? (split.members || []) : split.splits).map((s: any, i: number) => (
                  <div
                    key={i}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--primary)', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, marginLeft: i === 0 ? 0 : '-12px' }}
                  >
                    {(s.name || s.contactName || 'U').charAt(0)}
                  </div>
                ))}
              </div>
              <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.15)', borderRadius: '100px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                {(split.type === 'trip' ? (split.members || []) : split.splits).length} Orang
              </div>
            </div>
          </div>
        </motion.div>

        {/* Breakdown List / Settlement */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px 16px 8px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              {split.type === 'trip' ? 'Rencana Penyelesaian' : 'Rincian Pembagian'}
            </h3>
            <Info size={14} color="var(--text-muted)" />
          </div>

          {/* Mode Toggle (Only for Trip) */}
          {split.type === 'trip' && (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--bg-card)',
              padding: '4px', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--border-color)'
            }}>
              <button
                onClick={() => setMode('simple')}
                style={{
                  padding: '10px', borderRadius: '12px', border: 'none', fontSize: '13px', fontWeight: 700,
                  background: mode === 'simple' ? 'var(--primary-glow)' : 'transparent',
                  color: mode === 'simple' ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Simple
              </button>
              <button
                onClick={() => setMode('detailed')}
                style={{
                  padding: '10px', borderRadius: '12px', border: 'none', fontSize: '13px', fontWeight: 700,
                  background: mode === 'detailed' ? 'var(--primary-glow)' : 'transparent',
                  color: mode === 'detailed' ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Detailed
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gap: '12px' }}>
            {activeTransactions.map((item: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.05 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '24px',
                  background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}
              >
                {split.type === 'trip' ? (
                  // Settlement View (From -> To)
                  <>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '14px' }}>
                        <span>{item.from}</span>
                        <ArrowUpRight size={14} color="var(--text-muted)" />
                        <span>{item.to}</span>
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '2px' }}>Penyelesaian Saldo</div>
                    </div>
                  </>
                ) : (
                  // Normal Split View
                  <>
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px', fontWeight: 800, background: item.isPayer ? 'var(--success)' : 'var(--bg-main)',
                      color: item.isPayer ? 'white' : 'var(--primary)'
                    }}>
                      {item.contactName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)', marginBottom: '2px' }}>{item.contactName}</div>
                      <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', color: item.isPayer ? 'var(--success)' : 'var(--text-muted)' }}>
                        {item.isPayer ? 'Payer / Sudah Bayar' : <><ArrowDownLeft size={10} color="var(--danger)" /> Belum Bayar</>}
                      </div>
                    </div>
                  </>
                )}

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px' }}>{split.currencySymbol}</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: item.isPayer ? 'var(--success)' : 'var(--text-main)', letterSpacing: '-0.5px' }}>
                      {(Number(item.amount) || 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSaveToDebts(item)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '10px', background: 'var(--primary-glow)',
                      border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    title="Catat di Hutang/Piutang"
                  >
                    <PlusCircle size={20} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Trip History (Only for Trip) */}
        {(split as any).type === 'trip' && (split as any).tripExpenses && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px 16px 8px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Riwayat Pengeluaran</h3>
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {(split as any).tripExpenses.map((exp: any, idx: number) => (
                <div key={idx} style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{exp.description}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Dibayar oleh {exp.payer} • {exp.date}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '14px' }}>
                    {split.currencySymbol}{exp.amount.toLocaleString('id-ID')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '32px', borderRadius: '40px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: '-40px', left: '-40px', width: '100px', height: '100px', background: 'var(--primary-glow)', filter: 'blur(30px)', borderRadius: '50%' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ width: '60px', height: '60px', background: 'var(--primary-glow)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <Wallet size={32} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Atur Keuangan Bareng?</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
              Gunakan MoneyApp untuk catat pengeluaran, bagi tagihan otomatis, dan pantau budget dengan mudah.
            </p>

            <button
              onClick={() => window.location.href = '/'}
              style={{
                width: '100%', padding: '16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '16px',
                fontSize: '14px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 8px 16px var(--primary-glow)'
              }}
            >
              Coba MoneyApp Gratis
              <ExternalLink size={18} />
            </button>
          </div>
        </motion.div>

        <footer style={{ marginTop: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4em', opacity: 0.4 }}>
            MoneyApp • {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default SharedSplitBill;

