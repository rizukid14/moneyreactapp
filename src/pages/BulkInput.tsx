import React, { useState } from 'react';
import { AlertCircle, Loader2, X, Sparkles, ChevronLeft } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import { useBulkParseAI, type ParsedTransaction } from '../hooks/useBulkParseAI';
import BulkResultsEditor from '../components/transactions/BulkResultsEditor';
import { useNavigate } from 'react-router-dom';

const BulkInput: React.FC = () => {
  const navigate = useNavigate();
  const { addTransaction, assets, categories, currencySymbol } = useMoney();
  const { parseData, isParsing, error, setError } = useBulkParseAI();

  const [stage, setStage] = useState<'input' | 'results'>('input');
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<ParsedTransaction[]>([]);

  const handleParse = async () => {
    if (!inputText.trim()) {
      alert('Masukkan teks transaksi terlebih dahulu.');
      return;
    }
    const activeAssets = assets.filter(a => !a.isDeleted);
    const parsed = await parseData({ text: inputText, categories, assets: activeAssets });
    if (parsed && parsed.length > 0) {
      const augmented = parsed.map(tx => {
        let matchedAssetId = activeAssets[0]?.id || '';
        if (tx.asset) {
          const matched = activeAssets.find(a => a.name.toLowerCase().includes(tx.asset.toLowerCase()) || tx.asset.toLowerCase().includes(a.name.toLowerCase()));
          if (matched) matchedAssetId = matched.id;
        }

        let matchedCategory = '';
        let matchedSubCategory = '';
        if (tx.category) {
          const matchedCat = categories.find(c => c.name.toLowerCase() === tx.category.toLowerCase() && c.type === tx.type);
          if (matchedCat) {
            matchedCategory = matchedCat.name;
            if (tx.subCategory && matchedCat.subcategories) {
              const matchedSub = matchedCat.subcategories.find(s => s.name.toLowerCase() === tx.subCategory!.toLowerCase());
              if (matchedSub) matchedSubCategory = matchedSub.name;
            }
          }
        }

        return {
          ...tx,
          asset: matchedAssetId,
          category: matchedCategory || (tx.type === 'pengeluaran' ? 'Lainnya' : 'Lain-lain'),
          subCategory: matchedSubCategory || ''
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
        <BulkResultsEditor 
          results={results}
          setResults={setResults}
          categories={categories}
          assets={assets}
          currencySymbol={currencySymbol}
          onSave={() => {
            const toSave = results.filter(r => r.selected);
            if (toSave.some(r => !r.amount || !r.category || !r.asset)) {
              alert("Pastikan semua transaksi yang dicentang memiliki Nominal, Kategori, dan Rekening!");
              return;
            }

            toSave.forEach(tx => {
              addTransaction({
                type: tx.type,
                amount: tx.amount,
                date: tx.date,
                note: tx.note,
                category: tx.category,
                subCategory: tx.subCategory || undefined,
                assetId: tx.asset
              });
            });

            alert(`${toSave.length} transaksi berhasil disimpan!`);
            setStage('input');
            setInputText('');
            setResults([]);
          }}
        />
      )}
    </div>
  );
};

export default BulkInput;
