import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CheckCircle, AlertCircle, Loader2, X, Scissors, Trash2, Plus, Users } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import { useReceiptOCR, type OCRResult, type LineItem } from '../hooks/useReceiptOCR';
import { useBulkParseAI, type ParsedTransaction } from '../hooks/useBulkParseAI';
import BulkResultsEditor from '../components/transactions/BulkResultsEditor';
import { useToast } from '../components/common/Toast';
import SplitBillModal from '../components/modals/SplitBillModal';

type Stage = 'upload' | 'crop' | 'scanning' | 'results';

interface CropRect { x: number; y: number; w: number; h: number; }

const CONFIDENCE_BADGE = {
  high: { label: 'Akurasi Tinggi', color: 'var(--success)' },
  medium: { label: 'Akurasi Sedang', color: 'var(--secondary)' },
  low: { label: 'Akurasi Rendah', color: 'var(--danger)' },
};

const ReceiptScanner: React.FC = () => {
  const { addTransaction, addDebt, assets, categories, currencySymbol } = useMoney();
  const { scanReceipt, isInitializing, progress: strukProgress, error: strukError, setError: setStrukError } = useReceiptOCR();
  const { parseData: parseMutasi, isParsing: isMutasiParsing, error: mutasiError, setError: setMutasiError } = useBulkParseAI();
  const { showToast } = useToast();

  // Stage management
  const [stage, setStage] = useState<Stage>('upload');
  const [scanMode, setScanMode] = useState<'struk' | 'mutasi'>('struk');
  const error = scanMode === 'struk' ? strukError : mutasiError;
  const setError = scanMode === 'struk' ? setStrukError : setMutasiError;
  const progress = scanMode === 'struk' ? strukProgress : (isMutasiParsing ? 50 : 0);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [mutasiResults, setMutasiResults] = useState<ParsedTransaction[]>([]);

  // Cropping state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const cropRectRef = useRef<CropRect | null>(null); // always up-to-date for runScan
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Transaction customization
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedType, setSelectedType] = useState<'pengeluaran' | 'pendapatan'>('pengeluaran');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(new Date().toTimeString().split(' ')[0].slice(0, 5));
  const [editableAmount, setEditableAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'name' | 'amount' | null>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setImageFile(null);
    setResult(null);
    setError(null);
    setStage('upload');
    setCropRect(null);
    setLineItems([]);
    setMutasiResults([]);
    setEditableAmount('');
    setSelectedCategory('');
    setSelectedSubCategory('');
    setMerchantName('');
    setSelectedTime(new Date().toTimeString().split(' ')[0].slice(0, 5));
  }, [previewUrl, setError]);

  // ── Draw canvas when entering crop stage ────────────────────────────────────
  useEffect(() => {
    if (stage !== 'crop' || !previewUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      imgRef.current = img;
      // Set canvas internal resolution to image resolution
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      setCropRect(null);
    };
    img.src = previewUrl;
  }, [stage, previewUrl]);

  // ── Redraw canvas + crop overlay ───────────────────────────────────────────
  const redrawCanvas = useCallback((rect: CropRect | null) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);

    if (rect && rect.w > 5 && rect.h > 5) {
      // Dim outside
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Reveal crop area
      ctx.clearRect(rect.x, rect.y, rect.w, rect.h);
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, rect.x, rect.y, rect.w, rect.h);
      // Dashed border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = Math.max(4, canvas.width * 0.006);
      ctx.setLineDash([16, 8]);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.setLineDash([]);
      // Corner handles
      const hs = Math.max(20, canvas.width * 0.03);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = Math.max(6, canvas.width * 0.009);
      const corners = [
        [rect.x, rect.y], [rect.x + rect.w, rect.y],
        [rect.x, rect.y + rect.h], [rect.x + rect.w, rect.y + rect.h]
      ];
      corners.forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, hs / 2, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
  }, []);

  // ── Unified pointer → canvas coordinate helper ─────────────────────────────
  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.max(0, Math.min(canvas.width, (clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(canvas.height, (clientY - rect.top) * scaleY)),
    };
  }, []);

  // ── Pointer events (works for mouse AND touch) ─────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    canvasRef.current?.setPointerCapture(e.pointerId);
    const pos = getCanvasPos(e.clientX, e.clientY);
    dragStartRef.current = pos;
    setIsDragging(true);
    setCropRect(null);
    cropRectRef.current = null;
    redrawCanvas(null);
  }, [getCanvasPos, redrawCanvas]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    const rect: CropRect = {
      x: Math.min(dragStartRef.current.x, pos.x),
      y: Math.min(dragStartRef.current.y, pos.y),
      w: Math.abs(pos.x - dragStartRef.current.x),
      h: Math.abs(pos.y - dragStartRef.current.y),
    };
    cropRectRef.current = rect; // update ref immediately
    setCropRect(rect);          // update state for UI
    redrawCanvas(rect);
  }, [isDragging, getCanvasPos, redrawCanvas]);

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ── Run scan ───────────────────────────────────────────────────────────────
  const runScan = useCallback(async () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    setStage('scanning');

    let blob: Blob | File | null = null;
    const activeCrop = cropRectRef.current;

    if (activeCrop && activeCrop.w > 50 && activeCrop.h > 50) {
      const cropped = document.createElement('canvas');
      cropped.width = activeCrop.w;
      cropped.height = activeCrop.h;
      const ctx = cropped.getContext('2d')!;
      ctx.drawImage(img, activeCrop.x, activeCrop.y, activeCrop.w, activeCrop.h, 0, 0, activeCrop.w, activeCrop.h);
      blob = await new Promise<Blob>(resolve => cropped.toBlob(b => resolve(b!), 'image/jpeg', 0.95));
    } else {
      blob = imageFile;
    }

    if (!blob) { setError('Gambar tidak valid'); setStage('crop'); return; }

    const activeAssets = assets.filter(a => !a.isDeleted);

    if (scanMode === 'mutasi') {
      const parsed = await parseMutasi({ imageBlob: blob as Blob, categories, assets: activeAssets });
      if (parsed && parsed.length > 0) {
        const augmented = parsed.map(tx => {
          const mapAsset = (assetName: string | undefined, defaultId = '') => {
            if (!assetName) return defaultId;
            const matched = activeAssets.find(a => a.name.toLowerCase().includes(assetName.toLowerCase()) || assetName.toLowerCase().includes(a.name.toLowerCase()));
            return matched?.id || defaultId;
          };

          const defaultAssetId = activeAssets[0]?.id || '';
          const matchedAssetId = mapAsset(tx.asset, defaultAssetId);
          const matchedFromAssetId = mapAsset(tx.fromAsset, defaultAssetId);
          const matchedToAssetId = mapAsset(tx.toAsset, activeAssets[1]?.id || defaultAssetId);

          let matchedCategory = '';
          let matchedSubCategory = '';
          if (tx.category && tx.type !== 'transfer') {
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
            fromAsset: matchedFromAssetId,
            toAsset: matchedToAssetId,
            category: matchedCategory || (tx.type === 'transfer' ? '' : tx.type === 'pengeluaran' ? 'Lainnya' : 'Lain-lain'),
            subCategory: matchedSubCategory || ''
          };
        });

        setMutasiResults(augmented);
        setStage('results');
      } else {
        setError('Tidak ada transaksi yang berhasil dikenali.');
        setStage('crop');
      }
      return;
    }

    const ocrResult = await scanReceipt(blob as Blob, categories, activeAssets);

    if (ocrResult) {
      if (ocrResult.amount === 0) {
        if (ocrResult.rawText.trim().length === 0) {
          setError('AI tidak berhasil membaca teks apapun. Pastikan foto cukup terang.');
        } else {
          setError('Teks terbaca, tapi tidak menemukan nominal Total.');
        }
      }

      setResult(ocrResult);

      // 1. Asset/Payment Method Matching
      if (ocrResult.suggestedAsset) {
        const matchedAsset = activeAssets.find(a =>
          a.name.toLowerCase() === ocrResult.suggestedAsset?.toLowerCase()
        );
        if (matchedAsset) {
          setSelectedAssetId(matchedAsset.id);
        } else {
          setSelectedAssetId(activeAssets[0]?.id || '');
        }
      } else {
        setSelectedAssetId(activeAssets[0]?.id || '');
      }

      setSelectedType('pengeluaran');
      setSelectedDate(ocrResult.date);
      setSelectedTime(ocrResult.time || new Date().toTimeString().split(' ')[0].slice(0, 5));
      setEditableAmount(ocrResult.amount > 0 ? ocrResult.amount.toString() : '');
      setMerchantName(ocrResult.merchantName || 'Scan Otomatis');
      setLineItems(ocrResult.lineItems);

      // 2. Category Matching
      if (ocrResult.suggestedCategory) {
        const matchedCat = categories.find(c =>
          c.name.toLowerCase() === ocrResult.suggestedCategory.toLowerCase() &&
          c.type === 'pengeluaran'
        );
        if (matchedCat) {
          setSelectedCategory(matchedCat.name);
          if (ocrResult.suggestedSubCategory && matchedCat.subcategories) {
            const matchedSub = matchedCat.subcategories.find(s =>
              s.name.toLowerCase() === ocrResult.suggestedSubCategory!.toLowerCase()
            );
            if (matchedSub) setSelectedSubCategory(matchedSub.name);
          }
        }
      }
      setStage('results');
    } else {
      setStage('crop');
    }
  }, [imageFile, scanReceipt, assets, categories, setError, selectedAssetId, selectedCategory, selectedDate, selectedTime, merchantName, editableAmount, selectedType]);

  // ── Handle file select ─────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url); setImageFile(file); setCropRect(null); setStage('crop');
    e.target.value = '';
  };

  const handleSaveMain = () => {
    if (!result) return;
    // editableAmount state is always raw digits — parse directly
    const finalAmount = parseInt(editableAmount) || 0;
    if (finalAmount <= 0) { showToast('Isi nominal terlebih dahulu', 'warning'); return; }
    if (!selectedAssetId) { showToast('Pilih rekening terlebih dahulu', 'warning'); return; }

    try {
      // Build note and description with line items if they exist
      const selectedItems = lineItems.filter(i => i.selected);
      const finalNote = merchantName || 'Scan Otomatis';
      let finalDescription = '';
      if (selectedItems.length > 0) {
        finalDescription = selectedItems.map(i => i.name).join(', ');
      }

      addTransaction({
        type: selectedType,
        amount: finalAmount,
        category: selectedCategory || 'Belanja (OCR)',
        subCategory: selectedSubCategory || undefined,
        date: selectedDate,
        time: selectedTime,
        note: finalNote,
        description: finalDescription || undefined,
        assetId: selectedAssetId,
      });
      showToast('Transaksi berhasil disimpan!', 'success');
      reset();
    } catch (e) {
      showToast('Gagal menyimpan transaksi. Silakan coba lagi.', 'error');
      console.error(e);
    }
  };

  const handleSaveLineItems = () => {
    if (!selectedAssetId) { showToast('Pilih rekening terlebih dahulu', 'warning'); return; }
    const toSave = lineItems.filter(i => i.selected && i.amount !== 0);
    if (toSave.length === 0) { showToast('Pilih minimal 1 item dengan nominal selain 0', 'warning'); return; }

    try {
      toSave.forEach(item => {
        addTransaction({
          type: selectedType,
          amount: item.amount,
          category: selectedCategory || 'Belanja (OCR)',
          subCategory: selectedSubCategory || undefined,
          date: selectedDate,
          time: selectedTime,
          note: item.name,
          assetId: selectedAssetId,
        });
      });
      showToast(`${toSave.length} transaksi berhasil disimpan!`, 'success');
      reset();
    } catch (e) {
      showToast('Gagal menyimpan transaksi. Silakan coba lagi.', 'error');
      console.error(e);
    }
  };

  const handleSplitSave = (splits: any[]) => {
    if (!selectedAssetId) { showToast('Pilih rekening terlebih dahulu', 'warning'); return; }
    
    try {
      const userSplit = splits.find(s => s.id === 'me');
      
      // 1. Save user's portion as a transaction
      if (userSplit && userSplit.amount > 0) {
        addTransaction({
          type: 'pengeluaran',
          amount: userSplit.amount,
          category: selectedCategory || 'Belanja (OCR)',
          subCategory: selectedSubCategory || undefined,
          date: selectedDate,
          time: selectedTime,
          note: merchantName || 'Split Bill',
          assetId: selectedAssetId,
        });
      }

      // 2. Save others' portions as Piutang (Debts)
      const others = splits.filter(s => s.id !== 'me' && s.amount > 0);
      others.forEach(person => {
        addDebt({
          type: 'piutang',
          contact: person.contactName,
          description: `Split Bill: ${merchantName || 'Struk'}`,
          totalAmount: person.amount,
          isPaid: false,
          createdAt: new Date().toISOString(),
          paymentAssetId: selectedAssetId, // The asset used to "lend" (pay for them)
          isInstallment: false,
          paidInstallments: 0
        }, 'none', selectedCategory || 'Lainnya');
      });

      showToast(`Split bill berhasil disimpan! (${others.length} piutang dibuat)`, 'success');
      setIsSplitModalOpen(false);
      reset();
    } catch (e) {
      showToast('Gagal menyimpan split bill.', 'error');
      console.error(e);
    }
  };

  const toggleItem = (idx: number) => {
    setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item));
  };

  const editItem = (idx: number, field: 'name' | 'amount', value: string) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'amount') {
        const isNegative = value.startsWith('-');
        const num = parseInt(value.replace(/\D/g, '')) || 0;
        return { ...item, amount: isNegative ? -num : num };
      }
      return { ...item, name: value };
    }));
  };

  const deleteItem = (idx: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    setLineItems(prev => [{ name: 'Item Baru', amount: 0, selected: true }, ...prev]);
    setEditingItemIdx(0); 
    setEditingField('name');
  };

  const selCat = categories.find(c => c.name === selectedCategory && c.type === selectedType);

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="title" style={{ margin: 0 }}>Scan Struk</h1>
      </div>
      <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />

      {stage === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '20px' }}>

          <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border-color)', marginBottom: '16px', width: '100%', maxWidth: '300px' }}>
            <button onClick={() => setScanMode('struk')} style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: 'none', background: scanMode === 'struk' ? 'var(--primary)' : 'transparent', color: scanMode === 'struk' ? 'white' : 'var(--text-muted)', fontWeight: 600, fontSize: '12px', transition: 'all 0.2s' }}>Struk (1 Tx)</button>
            <button onClick={() => setScanMode('mutasi')} style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: 'none', background: scanMode === 'mutasi' ? 'var(--primary)' : 'transparent', color: scanMode === 'mutasi' ? 'white' : 'var(--text-muted)', fontWeight: 600, fontSize: '12px', transition: 'all 0.2s' }}>Mutasi (Banyak Tx)</button>
          </div>

          <button onClick={() => fileInputRef.current?.click()} className="glass" style={{
            width: '100%', padding: '60px 24px', borderRadius: '28px',
            border: '3px dashed var(--primary)', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            color: 'var(--primary)', background: 'var(--bg-income)',
            transition: 'all 0.3s'
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: 'var(--primary-gradient)',
              display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white',
              marginBottom: 20, boxShadow: '0 8px 16px var(--primary-glow)'
            }}>
              <Camera size={40} />
            </div>
            <div style={{ fontWeight: 800, fontSize: '22px' }}>Ambil Foto Struk</div>
            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
              💡 Tips: Pastikan foto struk terlihat jelas dan terang
            </div>
          </button>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', maxWidth: '300px', lineHeight: 1.5 }}>
            {scanMode === 'struk' ? 'AI akan membaca total belanja & mendeteksi kategori.' : 'AI akan memecah mutasi bank menjadi banyak transaksi secara otomatis.'}
          </p>
          {error && (
            <div className="card" style={{ backgroundColor: 'hsla(350,85%,60%,0.1)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle color="var(--danger)" size={20} />
              <span style={{ fontSize: '14px', color: 'var(--danger)', fontWeight: 600 }}>{error}</span>
              <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none' }}><X size={18} /></button>
            </div>
          )}
        </div>
      )}

      {stage === 'crop' && (
        <div style={{ width: '100%' }}>
          <div className="card glass" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={runScan}>
                <Scissors size={16} /> {cropRect && cropRect.w > 50 ? 'Crop & Scan' : 'Scan Gambar Penuh'}
              </button>
              <button className="btn" style={{ flex: 1 }} onClick={reset}>Batal</button>
            </div>
          </div>
          <div style={{ borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--border-color)', touchAction: 'none' }}>
            <canvas ref={canvasRef} style={{ width: '100%', display: 'block' }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />
          </div>
        </div>
      )}

      {stage === 'scanning' && (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <Loader2 size={60} className="spin" color="var(--primary)" />
          <h3 className="subtitle">{isInitializing ? 'Memuat Mesin AI...' : `Menganalisa... ${progress}%`}</h3>
        </div>
      )}

      {stage === 'results' && scanMode === 'struk' && result && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={24} color="var(--success)" />
                <span style={{ fontWeight: 700 }}>Struk Dibaca</span>
              </div>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', color: 'white', backgroundColor: CONFIDENCE_BADGE[result.confidence].color }}>
                {CONFIDENCE_BADGE[result.confidence].label}
              </span>
            </div>

            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>{currencySymbol}</span>
                <input type="text" inputMode="numeric" value={editableAmount ? parseInt(editableAmount).toLocaleString('id-ID') : ''} onChange={e => setEditableAmount(e.target.value.replace(/\D/g, ''))} style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)', flex: 1 }} />
              </div>

              <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setSelectedSubCategory(''); }} style={{ marginBottom: '10px' }}>
                <option value="">-- Pilih Kategori --</option>
                {categories.filter(c => c.type === selectedType).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>

              {selCat?.subcategories && selCat.subcategories.length > 0 && (
                <select value={selectedSubCategory} onChange={e => setSelectedSubCategory(e.target.value)} style={{ marginBottom: '10px' }}>
                  <option value="">-- Sub Kategori --</option>
                  {selCat.subcategories.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
                </select>
              )}

              <select value={selectedAssetId} onChange={e => setSelectedAssetId(e.target.value)} style={{ marginBottom: '12px' }}>
                <option value="">-- Pilih Rekening --</option>
                {assets.filter(a => !a.isDeleted).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Catatan / Nama Merchant"
                  value={merchantName}
                  onChange={e => setMerchantName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                />
              </div>

              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button className="btn" style={{ flex: 1 }} onClick={reset}>Batal</button>
              <button className="btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => setIsSplitModalOpen(true)}>
                <Users size={16} /> Split Bill
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveMain}>Simpan Total</button>
            </div>
          </div>

          <div className="card glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>🧾 Rincian Item ({lineItems.length})</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setLineItems(p => p.map(i => ({ ...i, selected: true })))} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Pilih Semua</button>
                <button onClick={() => setLineItems(p => p.map(i => ({ ...i, selected: false })))} style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Reset</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
              {lineItems.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}>Tidak ada item rincian terdeteksi.</p>
              ) : lineItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px',
                    background: item.selected ? 'var(--bg-income)' : 'var(--bg-main)',
                    borderRadius: '10px',
                    border: `1px solid ${item.selected ? 'var(--primary)40' : 'var(--border-color)'}`,
                    transition: 'background 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleItem(idx)}
                    style={{ width: '16px', height: '16px', flexShrink: 0, accentColor: 'var(--primary)', cursor: 'pointer', marginBottom: 0 }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingItemIdx === idx && editingField === 'name' ? (
                      <input
                        autoFocus
                        value={item.name}
                        onChange={e => editItem(idx, 'name', e.target.value)}
                        onBlur={() => { setEditingItemIdx(null); setEditingField(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') { setEditingItemIdx(null); setEditingField(null); } }}
                        style={{ width: '100%', fontSize: '13px', padding: '2px 6px', borderRadius: '6px', marginBottom: 0 }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                        <span
                          onClick={() => { setEditingItemIdx(idx); setEditingField('name'); }}
                          title={item.name}
                          style={{
                            fontSize: '13px', fontWeight: 500, cursor: 'text',
                            display: 'block', whiteSpace: 'nowrap',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                          }}
                        >
                          {item.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ flexShrink: 0, minWidth: '80px', textAlign: 'right' }}>
                    {editingItemIdx === idx && editingField === 'amount' ? (
                      <input
                        autoFocus
                        type="text"
                        inputMode="numeric"
                        value={item.amount === 0 ? '' : item.amount.toLocaleString('id-ID')}
                        onChange={e => editItem(idx, 'amount', e.target.value)}
                        onBlur={() => { setEditingItemIdx(null); setEditingField(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') { setEditingItemIdx(null); setEditingField(null); } }}
                        style={{ width: '80px', fontSize: '12px', fontWeight: 700, textAlign: 'right', padding: '2px 4px', borderRadius: '6px', marginBottom: 0 }}
                      />
                    ) : (
                      <span
                        onClick={() => { setEditingItemIdx(idx); setEditingField('amount'); }}
                        style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger)', cursor: 'text' }}
                        title="Tap untuk edit nominal"
                      >
                        {currencySymbol}{item.amount.toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => deleteItem(idx)}
                    style={{ flexShrink: 0, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7, padding: '2px', lineHeight: 1 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Tax, Service, Discount Breakdown */}
            {(result.taxAmount! > 0 || result.serviceAmount! > 0 || result.discountAmount! > 0) && (
              <div style={{
                marginTop: '12px', padding: '10px 12px', background: 'var(--bg-main)',
                borderRadius: '10px', border: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px'
              }}>
                {result.taxAmount! > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Pajak (PPN/PB1)</span>
                    <span style={{ fontWeight: 600 }}>{currencySymbol}{result.taxAmount?.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {result.serviceAmount! > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Service Charge</span>
                    <span style={{ fontWeight: 600 }}>{currencySymbol}{result.serviceAmount?.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {result.discountAmount! > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Diskon</span>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>-{currencySymbol}{result.discountAmount?.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.7, marginTop: '2px', fontStyle: 'italic' }}>
                  * Nilai di atas sudah didistribusikan secara proporsional ke harga item di bawah.
                </div>
              </div>
            )}

            <div style={{ marginTop: '10px', padding: '8px 10px', background: 'var(--bg-main)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
              <span className="text-muted">{lineItems.filter(i => i.selected).length} item dipilih</span>
              <span style={{ color: 'var(--danger)' }}>
                {currencySymbol}{lineItems.filter(i => i.selected).reduce((s, i) => s + i.amount, 0).toLocaleString('id-ID')}
              </span>
            </div>


            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                onClick={addItem}
                style={{ flex: 1, padding: '9px', background: 'none', border: '1.5px dashed var(--border-color)', borderRadius: '10px', cursor: 'pointer', color: 'var(--primary)', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <Plus size={14} /> Tambah
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveLineItems}>
                Simpan Item Terpilih
              </button>
            </div>
          </div>
        </div>
      )}

      {result && scanMode === 'struk' && (
        <div style={{ marginTop: '24px' }}>
          <details className="card" style={{ padding: '12px 16px' }}>
            <summary style={{ fontSize: '12px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}>🔍 Diagnostik & Teks Mentah</summary>
            {result.debugLogs && (
              <div style={{ padding: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '10px', marginBottom: '12px', maxHeight: '100px', overflowY: 'auto' }}>
                {result.debugLogs.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '11px', color: 'var(--text-muted)' }}>{result.rawText || "(Kosong)"}</div>
          </details>
        </div>
      )}

      {stage === 'results' && scanMode === 'mutasi' && (
        <BulkResultsEditor
          results={mutasiResults}
          setResults={setMutasiResults}
          categories={categories}
          assets={assets}
          currencySymbol={currencySymbol}
          onSave={() => {
            const toSave = mutasiResults.filter(r => r.selected);
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
                const newTx = addTransaction({
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
                    relatedId: newTx.id,
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
            reset();
          }}
        />
      )}

      <SplitBillModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        totalAmount={parseInt(editableAmount) || 0}
        merchantName={merchantName}
        date={selectedDate}
        lineItems={lineItems}
        onSave={handleSplitSave}
      />
    </div>
  );
};

export default ReceiptScanner;
