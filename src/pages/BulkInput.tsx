import React, { useState } from 'react';
import { AlertCircle, Loader2, X, Sparkles, ChevronLeft } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import { useBulkParseAI, type ParsedTransaction } from '../hooks/useBulkParseAI';
import BulkResultsEditor from '../components/transactions/BulkResultsEditor';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common/Toast';

const BulkInput: React.FC = () => {
  const navigate = useNavigate();
  const { addTransaction, assets, categories, currencySymbol } = useMoney();
  const { parseData, isParsing, error, setError } = useBulkParseAI();
  const { showToast } = useToast();

  const [stage, setStage] = useState<'input' | 'results'>('input');
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<ParsedTransaction[]>([]);

  const handleParse = async () => {
    if (!inputText.trim()) {
      showToast('Masukkan teks transaksi terlebih dahulu.', 'warning');
      return;
    }
    const activeAssets = assets.filter(a => !a.isDeleted);
    const parsed = await parseData({ text: inputText, categories, assets: activeAssets });
    if (parsed && parsed.length > 0) {
      const augmented = parsed.map(tx => {
        const mapAsset = (assetName: string | undefined, defaultId = '') => {
          if (!assetName) return defaultId;
          const lowerName = assetName.toLowerCase();
          const exactMatch = activeAssets.find(a => a.name.toLowerCase() === lowerName);
          const partialMatch = activeAssets.find(a =>
            a.name.toLowerCase().includes(lowerName) || lowerName.includes(a.name.toLowerCase())
          );
          return (exactMatch || partialMatch)?.id || defaultId;
        };

        const defaultAssetId = activeAssets[0]?.id || '';
        const matchedAssetId = mapAsset(tx.asset, defaultAssetId);
        const matchedFromAssetId = mapAsset(tx.fromAsset, defaultAssetId);
        const matchedToAssetId = mapAsset(tx.toAsset, activeAssets[1]?.id || defaultAssetId);

        let matchedCategory = '';
        let matchedSubCategory = '';
        if (tx.category && tx.type !== 'transfer') {
          const matchedCat = categories.find(c =>
            c.type === tx.type &&
            (c.name.toLowerCase() === tx.category.toLowerCase() ||
             c.name.toLowerCase().includes(tx.category.toLowerCase()) ||
             tx.category.toLowerCase().includes(c.name.toLowerCase()))
          );
          if (matchedCat) {
            matchedCategory = matchedCat.name;
            if (tx.subCategory && matchedCat.subcategories) {
              const matchedSub = matchedCat.subcategories.find((s: any) =>
                s.name.toLowerCase() === tx.subCategory!.toLowerCase() ||
                s.name.toLowerCase().includes(tx.subCategory!.toLowerCase()) ||
                tx.subCategory!.toLowerCase().includes(s.name.toLowerCase())
              );
              if (matchedSub) matchedSubCategory = matchedSub.name;
            }
          }
        }

        return {
          ...tx,
          asset: matchedAssetId,
          fromAsset: matchedFromAssetId,
          toAsset: matchedToAssetId,
          category: matchedCategory || (tx.type === 'transfer' ? '' : tx.type === 'pengeluaran' ? 'Lainnya' : 'Lain-lain'),
          subCategory: matchedSubCategory || ''
        };
      });

      setResults(augmented);
      setStage('results');
    } else if (parsed && parsed.length === 0) {
      showToast('Tidak ada transaksi yang berhasil dikenali.', 'warning');
    }
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
            if (toSave.some(r => r.type !== 'transfer' && (!r.amount || !r.category || !r.asset))) {
              showToast('Pastikan semua transaksi reguler memiliki Nominal, Kategori, dan Rekening!', 'warning');
              return;
            }
            if (toSave.some(r => r.type === 'transfer' && (!r.amount || !r.fromAsset || !r.toAsset))) {
              showToast('Pastikan semua transaksi transfer memiliki Nominal, Dari Rekening, dan Ke Rekening!', 'warning');
              return;
            }

            toSave.forEach(tx => {
              if (tx.type === 'transfer') {
                addTransaction({
                  type: 'transfer',
                  amount: tx.amount,
                  date: tx.date,
                  note: tx.note || 'Transfer',
                  category: 'Transfer',
                  fromAssetId: tx.fromAsset,
                  toAssetId: tx.toAsset
                });

                if (tx.adminFee && tx.adminFee > 0) {
                  const feeAssetId = tx.adminFeeTarget === 'receiver' ? tx.toAsset : tx.fromAsset;
                  const feeAssetName = assets.find(a => a.id === feeAssetId)?.name || '';
                  addTransaction({
                    type: 'pengeluaran',
                    amount: tx.adminFee,
                    category: 'Biaya Admin',
                    date: tx.date,
                    note: `Biaya admin transfer${feeAssetName ? ` (${feeAssetName})` : ''}`,
                    assetId: feeAssetId,
                  });
                }
              } else {
                addTransaction({
                  type: tx.type,
                  amount: tx.amount,
                  date: tx.date,
                  note: tx.note,
                  category: tx.category,
                  subCategory: tx.subCategory || undefined,
                  assetId: tx.asset
                });
              }
            });

            showToast(`${toSave.length} transaksi berhasil disimpan!`, 'success');
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
