import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CheckCircle, AlertCircle, Loader2, X, Crop, Scissors, Info, Pencil, Trash2, Plus } from 'lucide-react';
import { useMoney } from '../contexts/MoneyContext';
import { useReceiptOCR, type OCRResult, type LineItem } from '../hooks/useReceiptOCR';

type Stage = 'upload' | 'crop' | 'scanning' | 'results';

interface CropRect { x: number; y: number; w: number; h: number; }

const CONFIDENCE_BADGE = {
  high:   { label: 'Akurasi Tinggi',   color: 'var(--success)'  },
  medium: { label: 'Akurasi Sedang',   color: 'var(--secondary)' },
  low:    { label: 'Akurasi Rendah',   color: 'var(--danger)'   },
};

const ReceiptScanner: React.FC = () => {
  const { addTransaction, assets, categories } = useMoney();
  const { scanReceipt, isInitializing, progress, error, setError } = useReceiptOCR();

  // Stage management
  const [stage, setStage] = useState<Stage>('upload');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);

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
  const [editableAmount, setEditableAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'name' | 'amount' | null>(null);

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
    setEditableAmount('');
    setSelectedCategory('');
    setSelectedSubCategory('');
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
      x: Math.max(0, Math.min(canvas.width,  (clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(canvas.height, (clientY - rect.top)  * scaleY)),
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

    // Read from ref (never stale, unlike React state in closure)
    const activeCrop = cropRectRef.current;

    // If there's a valid crop region - extract just that slice
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

    const ocrResult = await scanReceipt(blob as Blob);

    if (ocrResult) {
      if (ocrResult.amount === 0) {
        setError('Tidak dapat menemukan nominal uang. Coba crop area angka lebih dekat.');
      }
      setResult(ocrResult);
      setSelectedAssetId(assets[0]?.id || '');
      setSelectedType('pengeluaran');
      setSelectedDate(ocrResult.date);
      setEditableAmount(ocrResult.amount > 0 ? ocrResult.amount.toString() : '');
      setLineItems(ocrResult.lineItems);

      // Auto-fill category if suggested
      if (ocrResult.suggestedCategory) {
        const match = categories.find(c =>
          c.name.toLowerCase().includes(ocrResult.suggestedCategory.toLowerCase()) &&
          c.type === 'pengeluaran'
        );
        if (match) setSelectedCategory(match.name);
      }

      setStage('results');
    } else {
      setStage('crop');
    }
  }, [cropRect, imageFile, scanReceipt, assets, categories, setError]);

  // ── Handle file select ─────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setImageFile(file);
    setCropRect(null);
    setStage('crop');
    // Reset input so same file can be picked again
    e.target.value = '';
  };

  // ── Save main transaction ──────────────────────────────────────────────────
  const handleSaveMain = () => {
    if (!result) return;
    const finalAmount = parseInt(editableAmount.replace(/\D/g, '')) || 0;
    if (finalAmount <= 0) { alert('Nominal harus lebih dari 0'); return; }
    if (!selectedAssetId) { alert('Pilih rekening terlebih dahulu'); return; }

    addTransaction({
      type: selectedType,
      amount: finalAmount,
      category: selectedCategory || 'Belanja (OCR)',
      subCategory: selectedSubCategory || undefined,
      date: selectedDate,
      note: 'Scan Otomatis',
      assetId: selectedAssetId,
    });
    alert('Transaksi utama berhasil disimpan!');
    reset();
  };

  // ── Batch save checked line items ─────────────────────────────────────────
  const handleSaveLineItems = () => {
    if (!selectedAssetId) { alert('Pilih rekening terlebih dahulu'); return; }
    const toSave = lineItems.filter(i => i.selected);
    if (toSave.length === 0) { alert('Pilih minimal 1 item untuk disimpan'); return; }

    toSave.forEach(item => {
      addTransaction({
        type: 'pengeluaran',
        amount: item.amount,
        category: selectedCategory || 'Belanja (OCR)',
        subCategory: selectedSubCategory || undefined,
        date: selectedDate,
        note: item.name,
        assetId: selectedAssetId,
      });
    });
    alert(`${toSave.length} item berhasil disimpan!`);
    reset();
  };

  const toggleItem = (idx: number) => {
    setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item));
  };

  const editItem = (idx: number, field: 'name' | 'amount', value: string) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'amount') {
        const num = parseInt(value.replace(/\D/g, '')) || 0;
        return { ...item, amount: num };
      }
      return { ...item, name: value };
    }));
  };

  const deleteItem = (idx: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    const newIdx = lineItems.length;
    setLineItems(prev => [...prev, { name: 'Item Baru', amount: 0, selected: true }]);
    setEditingItemIdx(newIdx);
    setEditingField('name');
  };

  const selCat = categories.find(c => c.name === selectedCategory && c.type === selectedType);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <h1 className="title">Scan Struk</h1>
      <p className="text-muted" style={{ marginBottom: '24px' }}>
        Gunakan AI untuk membaca nominal belanja dari kamera Anda.
      </p>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* ── UPLOAD stage ─────────────────────────────────────────────────── */}
      {stage === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
          {error && (
            <div className="card" style={{ backgroundColor: 'hsla(350,85%,60%,0.1)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle color="var(--danger)" size={20} />
              <span style={{ fontSize: '14px', color: 'var(--danger)', fontWeight: 600 }}>{error}</span>
              <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18}/></button>
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="glass"
            style={{ width: '100%', padding: '50px 24px', borderRadius: '24px', border: '4px dashed var(--primary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--primary)' }}
          >
            <Camera size={64} style={{ marginBottom: 16 }} />
            <div style={{ fontWeight: 800, fontSize: '20px' }}>Ambil Foto Struk</div>
            <div className="text-muted" style={{ fontSize: '13px', marginTop: '8px' }}>Mendukung Lampiran Gambar</div>
          </button>

          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', textAlign: 'left' }}>
              <Info size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p className="text-muted" style={{ fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                Setelah upload, kamu bisa <strong>crop</strong> area struk agar AI lebih akurat. Sistem akan otomatis memdeteksi nominal, tanggal, kategori, dan rincian item.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── CROP stage ───────────────────────────────────────────────────── */}
      {stage === 'crop' && (
        <div style={{ width: '100%' }}>
          <div className="card glass" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Crop size={20} color="var(--primary)" />
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Crop Area Struk (Opsional)</span>
            </div>
            <p className="text-muted" style={{ fontSize: '12px', lineHeight: 1.6, marginBottom: '12px' }}>
              Seret mouse di atas gambar untuk memilih area yang ingin di-scan. Jika tidak di-crop, seluruh gambar akan diproses.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={runScan}
              >
                <Scissors size={16} />
                {cropRect && cropRect.w > 50 ? 'Crop & Scan' : 'Scan Gambar Penuh'}
              </button>
              <button
                className="btn"
                style={{ flex: 1, background: 'var(--border-color)', color: 'var(--text-main)' }}
                onClick={reset}
              >
                Batal
              </button>
            </div>
          </div>

          <div style={{ borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--border-color)', cursor: 'crosshair', touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', display: 'block' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
          </div>
        </div>
      )}

      {/* ── SCANNING stage ───────────────────────────────────────────────── */}
      {stage === 'scanning' && (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative', marginBottom: '20px', border: 'none' }}>
            {previewUrl && <img src={previewUrl} alt="Preview" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', opacity: 0.4 }} />}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <Loader2 size={60} className="spin" color="var(--primary)" />
              <div style={{ fontWeight: 800, fontSize: '24px', color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.5)', marginTop: '12px' }}>{progress}%</div>
            </div>
          </div>
          <h3 className="subtitle">{isInitializing ? 'Memuat Mesin AI...' : 'Menganalisa Struk...'}</h3>
          <p className="text-muted" style={{ fontSize: '12px' }}>
            {isInitializing ? 'Pengunduhan model AI (15MB) pertama kali mungkin butuh waktu sedikit lebih lama.' : 'Struk diproses secara lokal dan aman'}
          </p>
        </div>
      )}

      {/* ── RESULTS stage ────────────────────────────────────────────────── */}
      {stage === 'results' && result && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Header card */}
          <div className="card glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={24} color="var(--success)" />
                <span style={{ fontWeight: 700, fontSize: '16px' }}>Struk Berhasil Dibaca</span>
              </div>
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
                color: 'white', backgroundColor: CONFIDENCE_BADGE[result.confidence].color
              }}>
                {CONFIDENCE_BADGE[result.confidence].label}
              </span>
            </div>

            {/* Preview thumbnail */}
            {previewUrl && (
              <img src={previewUrl} alt="Struk" style={{ width: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '10px', marginBottom: '16px', background: 'var(--bg-main)' }} />
            )}

            {/* Auto-category badge */}
            {result.suggestedCategory && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'var(--bg-income)', borderRadius: '20px', marginBottom: '12px', fontSize: '12px', color: 'var(--primary)', fontWeight: 700 }}>
                ✨ Kategori terdeteksi: {result.suggestedCategory}
              </div>
            )}

            {/* Type toggle */}
            <div className="flex-gap" style={{ marginBottom: '14px' }}>
              <button onClick={() => setSelectedType('pengeluaran')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: selectedType === 'pengeluaran' ? 'var(--bg-expense)' : 'transparent', color: selectedType === 'pengeluaran' ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Pengeluaran</button>
              <button onClick={() => setSelectedType('pendapatan')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: selectedType === 'pendapatan' ? 'var(--bg-income)' : 'transparent', color: selectedType === 'pendapatan' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Pendapatan</button>
            </div>

            <div style={{ textAlign: 'left' }}>
              <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Nominal Total</div>
              <input type="text" value={editableAmount} onChange={e => setEditableAmount(e.target.value.replace(/\D/g, ''))} style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)', textAlign: 'center', marginBottom: '12px' }} />

              <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Kategori</div>
              <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setSelectedSubCategory(''); }} style={{ marginBottom: '10px' }}>
                <option value="" disabled>-- Pilih Kategori --</option>
                {categories.filter(c => c.type === selectedType).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>

              {selCat && selCat.subcategories && selCat.subcategories.length > 0 && (
                <select value={selectedSubCategory} onChange={e => setSelectedSubCategory(e.target.value)} style={{ marginBottom: '10px' }}>
                  <option value="" disabled>-- Pilih Sub-Kategori --</option>
                  {selCat.subcategories.map(sub => (
                    <option key={sub.id} value={sub.name}>{sub.name}</option>
                  ))}
                </select>
              )}

              <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Rekening</div>
              <select value={selectedAssetId} onChange={e => setSelectedAssetId(e.target.value)} style={{ marginBottom: '12px' }}>
                <option value="" disabled>-- Pilih Rekening --</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Tanggal</div>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button className="btn" style={{ flex: 1, background: 'var(--border-color)', color: 'var(--text-main)' }} onClick={reset}>Batal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveMain}>Simpan Total</button>
            </div>
          </div>

          {/* ── Line Items checklist (editable) ──────────────────────────── */}
          <div className="card glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>🧾 Rincian Item ({lineItems.length})</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => setLineItems(p => p.map(i => ({ ...i, selected: true })))} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Pilih Semua</button>
                <button onClick={() => setLineItems(p => p.map(i => ({ ...i, selected: false })))} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Reset</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
              {lineItems.map((item, idx) => (
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
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleItem(idx)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', flexShrink: 0, cursor: 'pointer' }}
                  />

                  {/* Item Name (editable) */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingItemIdx === idx && editingField === 'name' ? (
                      <input
                        autoFocus
                        type="text"
                        value={item.name}
                        onChange={e => editItem(idx, 'name', e.target.value)}
                        onBlur={() => { setEditingItemIdx(null); setEditingField(null); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); setEditingField('amount'); } }}
                        style={{ width: '100%', fontSize: '13px', fontWeight: 600, padding: '2px 6px', borderRadius: '6px', border: '1px solid var(--primary)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                      />
                    ) : (
                      <span
                        onClick={() => { setEditingItemIdx(idx); setEditingField('name'); }}
                        style={{ fontSize: '13px', fontWeight: 500, cursor: 'text', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        title="Tap untuk edit nama"
                      >
                        {item.name}
                      </span>
                    )}
                  </div>

                  {/* Amount (editable) */}
                  <div style={{ flexShrink: 0 }}>
                    {editingItemIdx === idx && editingField === 'amount' ? (
                      <input
                        autoFocus
                        type="text"
                        inputMode="numeric"
                        value={item.amount === 0 ? '' : item.amount.toString()}
                        onChange={e => editItem(idx, 'amount', e.target.value)}
                        onBlur={() => { setEditingItemIdx(null); setEditingField(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') { setEditingItemIdx(null); setEditingField(null); } }}
                        style={{ width: '90px', fontSize: '13px', fontWeight: 700, textAlign: 'right', padding: '2px 6px', borderRadius: '6px', border: '1px solid var(--danger)', background: 'var(--bg-main)', color: 'var(--danger)' }}
                      />
                    ) : (
                      <span
                        onClick={() => { setEditingItemIdx(idx); setEditingField('amount'); }}
                        style={{ fontWeight: 700, fontSize: '13px', color: 'var(--danger)', cursor: 'text', display: 'block', textAlign: 'right' }}
                        title="Tap untuk edit nominal"
                      >
                        Rp{item.amount.toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>

                  {/* Edit icon shortcut */}
                  <button
                    onClick={() => { setEditingItemIdx(idx); setEditingField('name'); }}
                    title="Edit item"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', flexShrink: 0, lineHeight: 1 }}
                  >
                    <Pencil size={13} />
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => deleteItem(idx)}
                    title="Hapus item"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '2px', flexShrink: 0, lineHeight: 1, opacity: 0.7 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new item button */}
            <button
              onClick={addItem}
              style={{
                width: '100%', marginTop: '10px', padding: '8px 12px',
                background: 'none', border: '1.5px dashed var(--border-color)',
                borderRadius: '10px', cursor: 'pointer', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                fontSize: '12px', fontWeight: 700,
              }}
            >
              <Plus size={14} /> Tambah Item Manual
            </button>

            <div style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--bg-main)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
              <span className="text-muted">{lineItems.filter(i => i.selected).length} item dipilih</span>
              <span style={{ color: 'var(--danger)' }}>
                Rp{lineItems.filter(i => i.selected).reduce((s, i) => s + i.amount, 0).toLocaleString('id-ID')}
              </span>
            </div>

            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleSaveLineItems}>
              Simpan Item Terpilih sebagai Transaksi Terpisah
            </button>
          </div>

          {/* Raw text collapsible */}
          <details className="card" style={{ padding: '12px 16px' }}>
            <summary style={{ fontSize: '12px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}>Lihat Teks AI Mentah</summary>
            <div className="glass" style={{ padding: '12px', borderRadius: '10px', marginTop: '8px', maxHeight: '120px', overflowY: 'auto', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {result.rawText}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default ReceiptScanner;
