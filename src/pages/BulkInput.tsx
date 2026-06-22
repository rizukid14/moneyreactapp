import React, { useState, useRef, useEffect } from 'react';
import { useMoney } from '../contexts/MoneyContext';
import { useBulkParseAI, type ParsedTransaction } from '../hooks/useBulkParseAI';
import BulkResultsEditor from '../components/transactions/BulkResultsEditor';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../components/common/Toast';
import { lazy, Suspense } from 'react';
const OverspendReallocationModal = lazy(() => import('../components/modals/OverspendReallocationModal'));
import { PageWrapper } from '../components/ui/PageWrapper';
import MaterialIcon from '../components/common/MaterialIcon';
import { useSpeechToText } from '../hooks/useSpeechToText';

const BulkInput: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addTransaction, assets, categories, currencySymbol, validateTransactionBudget, zbbMode } = useMoney();
  const { parseData, isParsing, error, setError } = useBulkParseAI();
  const { showToast } = useToast();

  const [stage, setStage] = useState<'input' | 'results'>('input');
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<ParsedTransaction[]>([]);
  
  const [reallocationModal, setReallocationModal] = useState<{ isOpen: boolean; deficitCategory: string | null; deficitAmount: number; month: number; year: number }>({ isOpen: false, deficitCategory: null, deficitAmount: 0, month: 0, year: 0 });
  const [pendingAction, setPendingAction] = useState<boolean>(false);
  const { isListening, toggleListening } = useSpeechToText('\n');



  const handleSpeechToText = () => {
    toggleListening(inputText, setInputText);
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
          categoryId: 'Transfer',
          fromAssetId: tx.fromAsset,
          toAssetId: tx.toAsset
        });

        if (tx.adminFee && tx.adminFee > 0) {
          const feeAssetId = tx.adminFeeTarget === 'receiver' ? tx.toAsset : tx.fromAsset;
          const feeAssetName = assets.find(a => a.id === feeAssetId)?.name || '';
          addTransaction({
            type: 'pengeluaran',
            amount: tx.adminFee,
            categoryId: 'Biaya Admin',
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
          categoryId: tx.categoryId,
          subCategoryId: tx.subCategoryId || undefined,
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

        let matchedCategoryId = '';
        let matchedSubCategoryId = '';
        if (tx.category && tx.type !== 'transfer') {
          const matchedCat = categories.find(c =>
            c.type === tx.type &&
            !c.isDeleted &&
            (c.name.toLowerCase() === tx.category!.toLowerCase() ||
             c.name.toLowerCase().includes(tx.category!.toLowerCase()) ||
             tx.category!.toLowerCase().includes(c.name.toLowerCase()))
          );
          if (matchedCat) {
            matchedCategoryId = matchedCat.id;
            if (tx.subCategory && matchedCat.subcategories) {
              const matchedSub = matchedCat.subcategories.find((s: any) =>
                !s.isDeleted &&
                (s.name.toLowerCase() === tx.subCategory!.toLowerCase() ||
                 s.name.toLowerCase().includes(tx.subCategory!.toLowerCase()) ||
                 tx.subCategory!.toLowerCase().includes(s.name.toLowerCase()))
              );
              if (matchedSub) matchedSubCategoryId = matchedSub.id;
            }
          }
        }

        return {
          ...tx,
          asset: matchedAssetId,
          fromAsset: matchedFromAssetId,
          toAsset: matchedToAssetId,
          categoryId: matchedCategoryId || (tx.type === 'transfer' ? '' : tx.type === 'pengeluaran' ? categories.find(c=>c.name==='Lainnya' && c.type==='pengeluaran')?.id || '' : categories.find(c=>c.name==='Lain-lain' && c.type==='pendapatan')?.id || ''),
          subCategoryId: matchedSubCategoryId || ''
        };
      });

      setResults(augmented);
      setStage('results');
    } else if (parsed && parsed.length === 0) {
      showToast('Tidak ada transaksi yang berhasil dikenali.', 'warning');
    }
  }, [inputText, assets, categories, parseData, showToast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('shared') === 'true') {
      const loadSharedText = async () => {
        try {
          if (!window.caches) return;
          const cache = await window.caches.open('shared-data');
          const metaRes = await cache.match('/shared-metadata.json');
          if (metaRes) {
            const meta = await metaRes.json();
            
            const parts = [];
            if (meta.title) parts.push(meta.title);
            if (meta.text) parts.push(meta.text);
            if (meta.url) parts.push(meta.url);
            const combinedText = parts.join('\n').trim();

            if (combinedText) {
              setInputText(combinedText);
              showToast('Menerima catatan transaksi shared...', 'info');
              await handleParse(combinedText);
            }
            
            await cache.delete('/shared-metadata.json');
            await cache.delete('/shared-file.bin');
          }
        } catch (err) {
          console.error('Error loading shared text:', err);
          showToast('Gagal memuat teks transaksi yang dibagikan', 'error');
        } finally {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      };
      loadSharedText();
    }
  }, [showToast, assets, categories, handleParse]);

  useEffect(() => {
    const prefill = (location.state as any)?.prefillText;
    if (prefill && typeof prefill === 'string' && prefill.trim()) {
      setInputText(prefill);
      window.history.replaceState({}, document.title);
      handleParse(prefill);
    }
  }, []);

  useEffect(() => {
    const excelDraft = (location.state as any)?.excelDraftData;
    if (excelDraft && Array.isArray(excelDraft)) {
      setResults(excelDraft);
      setStage('results');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  return (
    <PageWrapper>
      <div className="flex items-center gap-4 mb-stack-lg">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors">
          <MaterialIcon name="chevron_left" className="text-on-surface" />
        </button>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Input Sekaligus</h1>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'hsla(350,85%,60%,0.1)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <MaterialIcon name="error" className="text-danger text-xl" />
          <span style={{ fontSize: '14px', color: 'var(--danger)', fontWeight: 600, flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none' }}><MaterialIcon name="close" className="text-lg text-danger" /></button>
        </div>
      )}

      {stage === 'input' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-8 flex flex-col gap-stack-md">
            <div className="bg-white rounded-xl p-6 border border-border-light shadow-sm flex flex-col h-full">
              <div className="mb-4">
                <label className="font-headline-md text-headline-md block mb-1">Tempel Log Transaksi</label>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Tulis atau paste catatan transaksi di sini. AI akan otomatis memisahkan tanggal, nominal, kategori, dan metode pembayaran.
                </p>
              </div>
              <div className="relative flex-grow min-h-[400px]">
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={"- Makan malam 50rb tadi pake gopay\n- 2 Okt beli bensin 30000 cash\n- Gaji 5jt BCA"}
                  data-testid="bulk-input-textarea"
                  className="w-full h-full p-4 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md resize-none bg-surface-bright"
                />
                <button
                  type="button"
                  onClick={handleSpeechToText}
                  data-testid="bulk-voice-btn"
                  className={`absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full font-label-md text-label-md transition-colors shadow-sm active:scale-95 duration-150 ${
                    isListening 
                      ? 'bg-success text-on-success ring-2 ring-success/60 animate-pulse' 
                      : 'bg-success-container text-on-success-container hover:bg-success-container/80'
                  }`}
                >
                  <MaterialIcon name="mic" className={`text-4xl ${isListening ? 'text-primary' : 'text-on-surface-variant'}`} />
                  {isListening ? 'Mendengarkan...' : 'Voice Input'}
                </button>
              </div>
            </div>

            <button
              onClick={() => handleParse()}
              disabled={isParsing || !inputText.trim()}
              data-testid="bulk-parse-btn"
              className={`w-full py-4 bg-primary text-white rounded-xl font-headline-md text-headline-md flex items-center justify-center gap-3 shadow-lg transition-all ${
                isParsing || !inputText.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 active:scale-[0.98]'
              }`}
            >
              {isParsing ? (
                <>
                  <MaterialIcon name="close" className="text-xl" />
                  Menganalisa...
                </>
              ) : (
                <>
                  <MaterialIcon name="auto_awesome" />
                  Mulai Analisa
                </>
              )}
            </button>
          </div>

          {/* Side Help Panel */}
          <div className="lg:col-span-4 flex flex-col gap-stack-md">
            <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant">
              <div className="flex items-center gap-2 mb-4 text-primary">
                <MaterialIcon name="lightbulb" />
                <h2 className="font-headline-md text-headline-md">Tips Input AI</h2>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-primary-container text-on-primary-container text-xs font-bold">1</span>
                  <p className="font-body-md text-body-md">Sebutkan nominal, nama akun aset, kategori, dan tanggal dalam bahasa sehari-hari.</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-primary-container text-on-primary-container text-xs font-bold">2</span>
                  <p className="font-body-md text-body-md">Gunakan kata kunci seperti "bayar", "beli", "terima", atau "transfer" untuk memandu AI.</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-primary-container text-on-primary-container text-xs font-bold">3</span>
                  <p className="font-body-md text-body-md">Anda bisa memasukkan lebih dari satu transaksi sekaligus dengan baris baru.</p>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-outline-variant">
                <h3 className="font-label-md text-label-md font-bold text-on-surface-variant uppercase mb-4">Contoh Format</h3>
                <div className="bg-white rounded-lg p-3 text-sm font-mono text-on-secondary-container border border-outline-variant/50 mb-3 italic">
                  "Beli kopi 25rb di Starbucks pake Kartu Kredit sore tadi"
                </div>
                <div className="bg-white rounded-lg p-3 text-sm font-mono text-on-secondary-container border border-outline-variant/50 italic">
                  "Transfer 1jt ke Mama dari BCA untuk bulanan"
                </div>
              </div>
            </div>

            {/* Decorative Illustration Card */}
            <div className="relative overflow-hidden bg-primary text-white rounded-xl p-6 aspect-video flex flex-col justify-end">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDffNo_3VQCkGKE8-pbiy12_m0WNimd9p_VhSfGdZjAh11wciBZMEAqF3hRgJc8GuzFrM9ABnlp-0M7rDWa8BwP5ZqoiPSLZDdi3i6tT16I_py6hHhnYai_7JEgZnZn79FjI84khSPO6S6x_cEN5S7PXV5qR0VW8xCpXZUw88rKBXVt9eWxycStckrmkknBGNV5x-A0KjnVxdU-pSptHdN2WxZu_0IPDwphyOf17RdY7TRXsYCg4Wsax6ldxnoVK5xFCazFC1J9SGY" 
                alt="Financial Data Visualization" 
                className="absolute inset-0 w-full h-full object-cover opacity-30" 
              />
              <div className="relative z-10">
                <h4 className="font-headline-md text-headline-md">Presisi Finansial</h4>
                <p className="text-sm opacity-80">AI kami memproses data dengan tingkat akurasi 99.8%.</p>
              </div>
            </div>
          </div>
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
            if (toSave.some(r => r.type !== 'transfer' && (!r.amount || !r.categoryId || !r.asset))) {
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
                const key = `${tx.categoryId}_${tx.date}`;
                acc[key] = (acc[key] || 0) + tx.amount;
                return acc;
              }, {} as Record<string, number>);

              for (const key of Object.keys(grouped)) {
                const [cat, dt] = key.split('_');
                const validation = validateTransactionBudget({
                  type: 'pengeluaran',
                  amount: grouped[key],
                  categoryId: cat,
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

      {reallocationModal.isOpen && (
        <Suspense fallback={null}>
          <OverspendReallocationModal
            isOpen={reallocationModal.isOpen}
            onClose={() => setReallocationModal(prev => ({ ...prev, isOpen: false }))}
            onSuccess={handleReallocationSuccess}
            deficitCategoryId={reallocationModal.deficitCategory}
            deficitAmount={reallocationModal.deficitAmount}
            month={reallocationModal.month}
            year={reallocationModal.year}
          />
        </Suspense>
      )}
    </PageWrapper>
  );
};

export default BulkInput;
