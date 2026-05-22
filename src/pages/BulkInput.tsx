import React, { useState } from 'react';
import { AlertCircle, Loader2, X, Sparkles, ChevronLeft, Mic, Square } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import { useBulkParseAI, type ParsedTransaction } from '../hooks/useBulkParseAI';
import BulkResultsEditor from '../components/transactions/BulkResultsEditor';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common/Toast';
import OverspendReallocationModal from '../components/modals/OverspendReallocationModal';

const BulkInput: React.FC = () => {
  const navigate = useNavigate();
  const { addTransaction, assets, categories, currencySymbol, validateTransactionBudget, zbbMode } = useMoney();
  const { parseData, isParsing, error, setError } = useBulkParseAI();
  const { showToast } = useToast();

  const [stage, setStage] = useState<'input' | 'results'>('input');
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<ParsedTransaction[]>([]);
  
  const [reallocationModal, setReallocationModal] = useState<{ isOpen: boolean; deficitCategory: string | null; deficitAmount: number; month: number; year: number }>({ isOpen: false, deficitCategory: null, deficitAmount: 0, month: 0, year: 0 });
  const [pendingAction, setPendingAction] = useState<boolean>(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<any>(null);
  const speechBaseRef = React.useRef('');
  const finalTranscriptRef = React.useRef('');



  const handleSpeechToText = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      showToast('Speech-to-text tidak didukung di browser ini.', 'warning');
      return;
    }

    const recognition = new SR();
    recognition.lang = 'id-ID';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognitionRef.current = recognition;
    speechBaseRef.current = inputText.trim();
    finalTranscriptRef.current = '';
    setIsListening(true);

    recognition.onresult = (event: any) => {
      let newFinalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) newFinalText += t;
        else interimText += t;
      }
      if (newFinalText) finalTranscriptRef.current += newFinalText;
      const combined = `${speechBaseRef.current}\n${finalTranscriptRef.current} ${interimText}`.trim();
      setInputText(combined);
    };
    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
      showToast('Gagal menangkap suara.', 'warning');
    };
    recognition.onend = () => {
      const combined = `${speechBaseRef.current}\n${finalTranscriptRef.current}`.trim();
      if (combined) setInputText(combined);
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.start();
  };

  const performSave = () => {
    const toSave = results.filter(r => r.selected);
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
  };

  const handleReallocationSuccess = () => {
    setReallocationModal({ isOpen: false, deficitCategory: null, deficitAmount: 0, month: 0, year: 0 });
    if (pendingAction) {
      performSave();
    }
    setPendingAction(false);
  };

  const handleParse = React.useCallback(async (textToParse?: string) => {
    const text = typeof textToParse === 'string' ? textToParse : inputText;
    if (!text.trim()) {
      showToast('Masukkan teks transaksi terlebih dahulu.', 'warning');
      return;
    }
    const activeAssets = assets.filter(a => !a.isDeleted);
    const parsed = await parseData({ text, categories, assets: activeAssets });
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
            !c.isDeleted &&
            (c.name.toLowerCase() === tx.category.toLowerCase() ||
             c.name.toLowerCase().includes(tx.category.toLowerCase()) ||
             tx.category.toLowerCase().includes(c.name.toLowerCase()))
          );
          if (matchedCat) {
            matchedCategory = matchedCat.name;
            if (tx.subCategory && matchedCat.subcategories) {
              const matchedSub = matchedCat.subcategories.find((s: any) =>
                !s.isDeleted &&
                (s.name.toLowerCase() === tx.subCategory!.toLowerCase() ||
                 s.name.toLowerCase().includes(tx.subCategory!.toLowerCase()) ||
                 tx.subCategory!.toLowerCase().includes(s.name.toLowerCase()))
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
  }, [inputText, assets, categories, parseData, showToast]);

  // Check for shared text/url from PWA Share Target
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('shared') === 'true') {
      const loadSharedText = async () => {
        try {
          if (!window.caches) return;
          const cache = await window.caches.open('shared-data');
          const metaRes = await cache.match('/shared-metadata.json');
          if (metaRes) {
            const meta = await metaRes.json();
            
            // Combine title, text, and URL
            const parts = [];
            if (meta.title) parts.push(meta.title);
            if (meta.text) parts.push(meta.text);
            if (meta.url) parts.push(meta.url);
            const combinedText = parts.join('\n').trim();

            if (combinedText) {
              setInputText(combinedText);
              showToast('Menerima catatan transaksi shared...', 'info');
              // Parse the received text immediately
              await handleParse(combinedText);
            }
            
            // Clean up cache
            await cache.delete('/shared-metadata.json');
            await cache.delete('/shared-file.bin');
          }
        } catch (err) {
          console.error('Error loading shared text:', err);
          showToast('Gagal memuat teks transaksi yang dibagikan', 'error');
        } finally {
          // Clear query params without page reload
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      };
      loadSharedText();
    }
  }, [showToast, assets, categories, handleParse]);

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
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={handleSpeechToText}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: isListening ? 'var(--bg-neutral)' : 'var(--bg-income)',
                  color: isListening ? 'var(--text-muted)' : 'var(--primary)',
                  border: '1px solid var(--border-color)', borderRadius: '10px',
                  padding: '8px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '12px'
                }}
              >
                {isListening ? <Square size={14} /> : <Mic size={14} />}
                {isListening ? 'Mendengar...' : 'Voice Input'}
              </button>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => handleParse()}
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
          isMutation={false}
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

            if (zbbMode === 'strict') {
              const expenses = toSave.filter(r => r.type === 'pengeluaran');
              const grouped = expenses.reduce((acc, tx) => {
                const key = `${tx.category}_${tx.date}`;
                acc[key] = (acc[key] || 0) + tx.amount;
                return acc;
              }, {} as Record<string, number>);

              for (const key of Object.keys(grouped)) {
                const [cat, dt] = key.split('_');
                const validation = validateTransactionBudget({
                  type: 'pengeluaran',
                  amount: grouped[key],
                  category: cat,
                  date: dt
                });
                if (!validation.isValid) {
                  setPendingAction(true);
                  setReallocationModal({
                    isOpen: true,
                    deficitCategory: validation.deficitCategory,
                    deficitAmount: validation.deficitAmount,
                    month: new Date(dt).getMonth(),
                    year: new Date(dt).getFullYear()
                  });
                  return;
                }
              }
            }

            performSave();
          }}
        />
      )}

      <OverspendReallocationModal
        isOpen={reallocationModal.isOpen}
        onClose={() => setReallocationModal(prev => ({ ...prev, isOpen: false }))}
        onSuccess={handleReallocationSuccess}
        deficitCategoryId={reallocationModal.deficitCategory}
        deficitAmount={reallocationModal.deficitAmount}
        month={reallocationModal.month}
        year={reallocationModal.year}
      />
    </div>
  );
};

export default BulkInput;
