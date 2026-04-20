import React, { useState } from 'react';
import { AlertCircle, Loader2, X, Sparkles, CheckCircle, Trash2, ChevronLeft, Plus } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import { useBulkParseAI, type ParsedTransaction } from '../hooks/useBulkParseAI';
import { useNavigate } from 'react-router-dom';

const BulkInput: React.FC = () => {
  const navigate = useNavigate();
  const { addTransaction, assets, categories } = useMoney();
  const { parseText, isParsing, error, setError } = useBulkParseAI();

  const [stage, setStage] = useState<'input' | 'results'>('input');
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<ParsedTransaction[]>([]);

  const handleParse = async () => {
    if (!inputText.trim()) {
      alert('Masukkan teks transaksi terlebih dahulu.');
      return;
    }
    const parsed = await parseText(inputText, categories, assets);
    if (parsed && parsed.length > 0) {
      // Need to try to match literal strings to actual asset IDs and categories 
      const augmented = parsed.map(tx => {
        let matchedAssetId = assets[0]?.id || '';
        if (tx.asset) {
          const matched = assets.find(a => a.name.toLowerCase().includes(tx.asset.toLowerCase()) || tx.asset.toLowerCase().includes(a.name.toLowerCase()));
          if (matched) matchedAssetId = matched.id;
        }

        let matchedCategory = '';
        if (tx.category) {
          const matched = categories.find(c => c.name.toLowerCase() === tx.category.toLowerCase() && c.type === tx.type);
          if (matched) matchedCategory = matched.name;
        }

        return {
          ...tx,
          asset: matchedAssetId,
          category: matchedCategory || (tx.type === 'pengeluaran' ? 'Lainnya' : 'Lain-lain')
        };
      });

      setResults(augmented);
      setStage('results');
    } else if (parsed && parsed.length === 0) {
      alert('Tidak ada transaksi yang berhasil dikenali.');
    }
  };

  const reset = () => {
    setStage('input');
    setResults([]);
    setError(null);
  };

  const handleSaveSelected = () => {
    const selectedResults = results.filter(r => r.selected);
    const hasZeroAmount = selectedResults.some(r => r.amount <= 0);

    if (selectedResults.length === 0) {
      alert('Pilih minimal 1 transaksi.');
      return;
    }

    if (hasZeroAmount) {
      alert('Ada transaksi dengan nominal 0. Silakan isi nominalnya terlebih dahulu sebelum menyimpan.');
      return;
    }

    try {
      selectedResults.forEach(item => {
        addTransaction({
          type: item.type,
          amount: item.amount,
          category: item.category,
          date: item.date,
          note: item.note || 'Bulk Input',
          assetId: item.asset,
        });
      });
      alert(`${selectedResults.length} transaksi berhasil disimpan!`);
      setInputText('');
      reset();
    } catch (e) {
      alert('Gagal menyimpan transaksi. Silakan coba lagi.');
      console.error(e);
    }
  };

  const updateResult = (id: string, field: keyof ParsedTransaction, value: string | number | boolean) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const deleteResult = (id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));
  };

  const addNewRow = () => {
    const newRow: ParsedTransaction = {
      id: `manual-${Date.now()}`,
      type: 'pengeluaran',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      note: '',
      category: 'Lainnya',
      asset: assets[0]?.id || '',
      selected: true
    };
    setResults(prev => [...prev, newRow]);
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button onClick={() => navigate(-1)} className="btn-icon" style={{ padding: '8px', background: 'var(--bg-card)' }}>
          <ChevronLeft size={20} />
        </button>
        <h1 className="title" style={{ margin: 0 }}>Input Sekaligus</h1>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'hsla(350,85%,60%,0.1)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <AlertCircle color="var(--danger)" size={20} />
          <span style={{ fontSize: '14px', color: 'var(--danger)', fontWeight: 600 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none' }}><X size={18} /></button>
        </div>
      )}

      {stage === 'input' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          <div className="card glass">
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>
              Tempel Log Transaksi
            </label>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              Tulis atau paste catatan transaksi di sini. AI akan otomatis memisahkan tanggal, nominal, kategori, dan metode pembayaran.
            </p>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={"Contoh:\n- Makan malam 50rb tadi pake gopay\n- 2 Okt beli bensin 30000 cash\n- Gaji 5jt BCA"}
              style={{
                width: '100%', minHeight: '200px', padding: '12px', borderRadius: '12px',
                border: '1px solid var(--border-color)', background: 'var(--bg-main)',
                color: 'var(--text-main)', fontSize: '14px', resize: 'vertical'
              }}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleParse}
            disabled={isParsing || !inputText.trim()}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            {isParsing ? (
              <>
                <Loader2 size={18} className="spin" /> Menganalisa...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Mulai Analisa
              </>
            )}
          </button>
        </div>
      )}

      {stage === 'results' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          <div className="card glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={24} color="var(--success)" />
              <span style={{ fontWeight: 700 }}>{results.length} Data Dibaca</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '80px' }}>
            {results.map((item) => (
              <div key={item.id} className="card" style={{
                padding: '12px',
                border: `2px solid ${item.selected ? 'var(--primary)' : 'transparent'}`,
                opacity: item.selected ? 1 : 0.6,
                transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) => updateResult(item.id, 'selected', e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={item.note}
                      onChange={(e) => updateResult(item.id, 'note', e.target.value)}
                      placeholder="Catatan"
                      style={{ flex: 1, fontSize: '14px', fontWeight: 600, padding: '4px 8px', border: '1px solid transparent', borderBottom: '1px solid var(--border-color)', background: 'transparent' }}
                    />
                  </div>
                  <button onClick={() => deleteResult(item.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nominal (Rp)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.amount === 0 ? '' : item.amount.toString()}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                        updateResult(item.id, 'amount', val);
                      }}
                      style={{ width: '100%', fontSize: '14px', fontWeight: 700, padding: '6px', borderRadius: '8px', border: '1px solid var(--border-color)', color: item.type === 'pengeluaran' ? 'var(--danger)' : 'var(--success)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tanggal</label>
                    <input
                      type="date"
                      value={item.date}
                      onChange={(e) => updateResult(item.id, 'date', e.target.value)}
                      style={{ width: '100%', fontSize: '14px', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Kategori ({item.type === 'pengeluaran' ? 'Keluar' : 'Masuk'})</label>
                    <select
                      value={item.category}
                      onChange={(e) => updateResult(item.id, 'category', e.target.value)}
                      style={{ width: '100%', fontSize: '13px', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    >
                      <option value="">-- Pilih --</option>
                      {categories.filter(c => c.type === item.type).map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rekening/Dompet</label>
                    <select
                      value={item.asset}
                      onChange={(e) => updateResult(item.id, 'asset', e.target.value)}
                      style={{ width: '100%', fontSize: '13px', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    >
                      <option value="">-- Rekening --</option>
                      {assets.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addNewRow}
              style={{
                width: '100%', padding: '12px', background: 'none',
                border: '2px dashed var(--border-color)', borderRadius: '16px',
                color: 'var(--primary)', fontWeight: 700, fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: 'pointer', marginTop: '8px'
              }}
            >
              <Plus size={18} /> Tambah Baris Manual
            </button>
          </div>

          {/* Bottom Floating Action Bar */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: 'var(--bg-main)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', zIndex: 100 }}>
            <button className="btn" onClick={reset} style={{ flex: 1 }}>Batal</button>
            <button className="btn btn-primary" onClick={handleSaveSelected} style={{ flex: 2 }}>
              Simpan Terpilih ({results.filter(r => r.selected).length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkInput;
