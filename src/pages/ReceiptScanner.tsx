import React, { useState, useRef, useCallback, useEffect } from 'react';

import { useMoney } from '../contexts/MoneyContext';
import { usePremium } from '../contexts/PremiumContext';
import { useReceiptOCR, type OCRResult, type LineItem } from '../hooks/useReceiptOCR';
import { useBulkParseAI, type ParsedTransaction } from '../hooks/useBulkParseAI';
import BulkResultsEditor from '../components/transactions/BulkResultsEditor';
import { useToast } from '../components/common/Toast';
import { findBestCategoryMatch, extractUserHistoricalMappings } from '../utils/categoryMatcher';
import { validateFileSecure } from '../lib/fileValidation';
import { getLocalDate } from '../lib/utils';
import SplitBillModal from '../components/modals/SplitBillModal';
import { ReceiptItemizerModal } from '../components/modals/ReceiptItemizerModal';
import AssetSelectModal from '../components/modals/AssetSelectModal';
import CategorySelectModal from '../components/modals/CategorySelectModal';
import { lazy, Suspense, useMemo } from 'react';
const OverspendReallocationModal = lazy(() => import('../components/modals/OverspendReallocationModal'));
import { useNavigate } from 'react-router-dom';
import CurrencyInput from '../components/common/CurrencyInput';

import { TabBar } from '../components/ui/TabBar';
import { PageWrapper } from '../components/ui/PageWrapper';
import MaterialIcon from '../components/common/MaterialIcon';
import { PremiumBadge } from '../components/common/PremiumBadge';

type Stage = 'upload' | 'crop' | 'scanning' | 'results';

interface CropRect { x: number; y: number; w: number; h: number; }

const CONFIDENCE_BADGE = {
  high: { label: 'Akurasi Tinggi (98%)', icon: 'verified', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  medium: { label: 'Akurasi Sedang (75%)', icon: 'info', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  low: { label: 'Akurasi Rendah (50%)', icon: 'warning', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const ReceiptScanner: React.FC = () => {
  const navigate = useNavigate();
  const { categories, assets, transactions, addTransaction, addDebt, currencySymbol, defaultAssetId: contextDefaultAssetId, validateTransactionBudget, zbbMode } = useMoney();
  const { scanReceipt, isInitializing, progress: strukProgress, error: strukError, setError: setStrukError } = useReceiptOCR();
  const { parseData: parseMutasi, progress: mutasiProgress, error: mutasiError, setError: setMutasiError } = useBulkParseAI();
  const { checkQuota, updatePremiumDataFromServer, setShowUpgradeModal } = usePremium();
  const { showToast } = useToast();

  const userHistory = useMemo(() => {
    return extractUserHistoricalMappings(transactions, categories);
  }, [transactions, categories]);

  const [reallocationModal, setReallocationModal] = useState<{ isOpen: boolean; deficitCategory: string | null; deficitAmount: number; month: number; year: number }>({ isOpen: false, deficitCategory: null, deficitAmount: 0, month: 0, year: 0 });
  const [pendingAction, setPendingAction] = useState<{ type: 'save_main' | 'save_line_items' | 'save_mutasi' | 'split', data?: any } | null>(null);

  // Stage management
  const [stage, setStage] = useState<Stage>('upload');
  const [scanMode, setScanMode] = useState<'struk' | 'mutasi'>('struk');
  const error = scanMode === 'struk' ? strukError : mutasiError;
  const setError = scanMode === 'struk' ? setStrukError : setMutasiError;
  const progress = scanMode === 'struk' ? strukProgress : mutasiProgress;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [mutasiResults, setMutasiResults] = useState<ParsedTransaction[]>([]);

  // Cropping state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const cropRectRef = useRef<CropRect | null>(null); // always up-to-date for runScan
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Transaction customization
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedType, setSelectedType] = useState<'pengeluaran' | 'pendapatan'>('pengeluaran');
  const [taxAmount, setTaxAmount] = useState(0);
  const [serviceAmount, setServiceAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [selectedTime, setSelectedTime] = useState(new Date().toTimeString().split(' ')[0].slice(0, 5));
  const [editableAmount, setEditableAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'name' | 'amount' | null>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isItemizerOpen, setIsItemizerOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [docTypeMismatch, setDocTypeMismatch] = useState<{
    isOpen: boolean;
    detectedType: 'receipt' | 'bank_statement';
    currentMode: 'struk' | 'mutasi';
    blob: Blob;
    pendingReceipt?: OCRResult;
    pendingMutasi?: ParsedTransaction[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.getElementById('root')?.scrollTo({ top: 0, behavior: 'instant' });
      document.body.scrollTo({ top: 0, behavior: 'instant' });
    }, 50);
  }, []);

  // Check for shared image files from PWA Share Target
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('shared') === 'true') {
      const loadSharedData = async () => {
        try {
          if (!window.caches) return;
          const cache = await window.caches.open('shared-data');
          const metaRes = await cache.match('/shared-metadata.json');
          if (metaRes) {
            const meta = await metaRes.json();
            if (meta.hasFile) {
              const fileRes = await cache.match('/shared-file.bin');
              if (fileRes) {
                const blob = await fileRes.blob();
                const file = new File([blob], meta.title || 'shared-receipt.jpg', { type: blob.type });
                const url = URL.createObjectURL(file);
                
                setPreviewUrl(url);
                setImageFile(file);
                setCropRect(null);
                setStage('crop');
                showToast('Gambar transaksi berhasil diterima!', 'success');
              }
            }
            // Clean up cache
            await cache.delete('/shared-metadata.json');
            await cache.delete('/shared-file.bin');
          }
        } catch (err) {
          console.error('Error loading shared file:', err);
          showToast('Gagal memuat gambar transaksi yang dibagikan', 'error');
        } finally {
          // Clear query params without page reload
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      };
      loadSharedData();
    }
  }, [showToast]);

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (croppedImageUrl) URL.revokeObjectURL(croppedImageUrl);
    setPreviewUrl(null);
    setCroppedImageUrl(null);
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

  // Prevent scrolling only when actually dragging the crop rect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventScroll = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    canvas.addEventListener('touchmove', preventScroll, { passive: false });
    return () => canvas.removeEventListener('touchmove', preventScroll);
  }, [isDragging]);

  // ── Run scan ───────────────────────────────────────────────────────────────
  const runScan = useCallback(async () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const featureName = scanMode === 'mutasi' ? 'bulk' : 'scan';
    const { allowed } = checkQuota(featureName);
    if (!allowed) {
      setShowUpgradeModal(true);
      return;
    }

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
      setCroppedImageUrl(URL.createObjectURL(blob));
    } else {
      blob = imageFile;
      if (blob) setCroppedImageUrl(URL.createObjectURL(blob));
    }

    if (!blob) { setError('Gambar tidak valid'); setStage('crop'); return; }

    const activeAssets = assets.filter(a => !a.isDeleted);

    if (scanMode === 'mutasi') {
      const parsedData = await parseMutasi({ 
        imageBlob: blob as Blob, 
        categories, 
        assets: activeAssets, 
        defaultAssetId: contextDefaultAssetId || undefined,
        userHistory 
      });
      if (parsedData?.quotaUsed !== undefined) {
        await updatePremiumDataFromServer('bulk', parsedData.quotaUsed, parsedData.isPremium);
      }
      if (parsedData) {
        if (parsedData.isValidTransaction === false || parsedData.documentType === 'invalid') {
          showToast(parsedData.validationMessage || 'Gambar yang diunggah tidak dikenali sebagai dokumen transaksi atau mutasi yang valid.', 'error');
          setStage('crop');
          return;
        }

        if (parsedData.documentType === 'receipt') {
          setDocTypeMismatch({
            isOpen: true,
            detectedType: 'receipt',
            currentMode: 'mutasi',
            blob: blob as Blob,
            pendingMutasi: parsedData.transactions
          });
          return;
        }

        if (parsedData.transactions.length > 0) {
          applyMutasiData(parsedData.transactions);
        } else {
          showToast('Tidak ada transaksi yang berhasil dikenali.', 'warning');
          setStage('crop');
        }
      } else {
        if (mutasiError) showToast(mutasiError, 'error');
        setStage('crop');
      }
      return;
    }

    const ocrResult = await scanReceipt(blob as Blob, categories, activeAssets, contextDefaultAssetId || undefined, userHistory);

    if (ocrResult?.quotaUsed !== undefined) {
      await updatePremiumDataFromServer('scan', ocrResult.quotaUsed, ocrResult.isPremium);
    }
    if (ocrResult) {
      if (ocrResult.isValidTransaction === false || ocrResult.documentType === 'invalid') {
        showToast(ocrResult.validationMessage || 'Gambar yang diunggah tidak dikenali sebagai struk belanja atau bukti transaksi yang valid.', 'error');
        setStage('crop');
        return;
      }

      if (ocrResult.documentType === 'bank_statement') {
        setDocTypeMismatch({
          isOpen: true,
          detectedType: 'bank_statement',
          currentMode: 'struk',
          blob: blob as Blob,
          pendingReceipt: ocrResult
        });
        return;
      }

      applyReceiptData(ocrResult);
    } else {
      if (strukError) {
        showToast(strukError, 'error');
      }
      setStage('crop');
    }
  }, [imageFile, scanReceipt, parseMutasi, assets, categories, setError, selectedAssetId, selectedCategory, selectedDate, selectedTime, merchantName, editableAmount, selectedType, strukError, mutasiError, showToast, contextDefaultAssetId, scanMode, userHistory]);

  const applyReceiptData = useCallback((ocrResult: OCRResult) => {
    const activeAssets = assets.filter(a => !a.isDeleted);
    setResult(ocrResult);

    if (ocrResult.amount === 0) {
      if (ocrResult.rawText.trim().length === 0) {
        showToast('AI tidak berhasil membaca teks apapun. Pastikan foto cukup terang.', 'warning');
      } else {
        showToast('Teks terbaca, tapi tidak menemukan nominal Total.', 'warning');
      }
    }

    if (ocrResult.suggestedAsset) {
      const matchedAsset = activeAssets.find(a =>
        a.name.toLowerCase() === ocrResult.suggestedAsset?.toLowerCase()
      );
      setSelectedAssetId(matchedAsset ? matchedAsset.id : (contextDefaultAssetId || activeAssets[0]?.id || ''));
    } else {
      setSelectedAssetId(contextDefaultAssetId || activeAssets[0]?.id || '');
    }

    setSelectedType('pengeluaran');
    setSelectedDate(ocrResult.date);
    setSelectedTime(ocrResult.time || new Date().toTimeString().split(' ')[0].slice(0, 5));
    setEditableAmount(ocrResult.amount > 0 ? ocrResult.amount.toString() : '');
    setMerchantName(ocrResult.merchantName || 'Scan Otomatis');
    setLineItems(ocrResult.lineItems);
    setTaxAmount(ocrResult.taxAmount || 0);
    setServiceAmount(ocrResult.serviceAmount || 0);
    setDiscountAmount(ocrResult.discountAmount || 0);

    const matched = findBestCategoryMatch(
      ocrResult.suggestedCategory,
      ocrResult.suggestedSubCategory,
      ocrResult.merchantName,
      categories,
      'pengeluaran',
      transactions
    );
    if (matched.categoryId) {
      setSelectedCategory(matched.categoryId);
      if (matched.subCategoryId) {
        setSelectedSubCategory(matched.subCategoryId);
      }
    }
    setStage('results');
  }, [assets, categories, contextDefaultAssetId, showToast, transactions]);

  const applyMutasiData = useCallback((mutasiTransactions: ParsedTransaction[]) => {
    const activeAssets = assets.filter(a => !a.isDeleted);
    const augmented = mutasiTransactions.map(tx => {
      const mapAsset = (assetName: string | undefined, defaultId = '') => {
        if (!assetName) return defaultId;
        const matched = activeAssets.find(a => a.name.toLowerCase().includes(assetName.toLowerCase()) || assetName.toLowerCase().includes(a.name.toLowerCase()));
        return matched?.id || defaultId;
      };

      const fallbackAssetId = contextDefaultAssetId || activeAssets[0]?.id || '';
      const matchedAssetId = mapAsset(tx.asset, fallbackAssetId);
      const matchedFromAssetId = mapAsset(tx.fromAsset, fallbackAssetId);
      const matchedToAssetId = mapAsset(tx.toAsset, activeAssets[1]?.id || fallbackAssetId);

      let matchedCategoryId = '';
      let matchedSubCategoryId = '';
      if (tx.type !== 'transfer') {
        const rawCategory = tx.category || tx.categoryId;
        const rawSubCategory = tx.subCategory || tx.subCategoryId;
        const matchResult = findBestCategoryMatch(
          rawCategory,
          rawSubCategory,
          tx.note,
          categories,
          tx.type,
          transactions
        );
        matchedCategoryId = matchResult.categoryId;
        matchedSubCategoryId = matchResult.subCategoryId;
      }

      return {
        ...tx,
        asset: matchedAssetId,
        fromAsset: matchedFromAssetId,
        toAsset: matchedToAssetId,
        categoryId: matchedCategoryId || (tx.type === 'transfer' ? '' : tx.type === 'pengeluaran' ? categories.find(c => c.type === 'pengeluaran' && !c.isDeleted)?.id || '' : categories.find(c => c.type === 'pendapatan' && !c.isDeleted)?.id || ''),
        subCategoryId: matchedSubCategoryId || ''
      };
    });

    setMutasiResults(augmented);
    setStage('results');
  }, [assets, categories, contextDefaultAssetId, transactions]);

  const handleSwitchMode = async () => {
    if (!docTypeMismatch) return;
    const targetMode = docTypeMismatch.detectedType === 'bank_statement' ? 'mutasi' : 'struk';
    setScanMode(targetMode);
    const blob = docTypeMismatch.blob;
    setDocTypeMismatch(null);
    setStage('scanning');

    const activeAssets = assets.filter(a => !a.isDeleted);
    if (targetMode === 'mutasi') {
      const parsedData = await parseMutasi({ imageBlob: blob, categories, assets: activeAssets, defaultAssetId: contextDefaultAssetId || undefined });
      if (parsedData?.quotaUsed !== undefined) {
        await updatePremiumDataFromServer('bulk', parsedData.quotaUsed, parsedData.isPremium);
      }
      if (parsedData && parsedData.transactions && parsedData.transactions.length > 0) {
        applyMutasiData(parsedData.transactions);
      } else {
        showToast('Tidak ada transaksi yang berhasil dikenali.', 'warning');
        setStage('crop');
      }
    } else {
      const ocrResult = await scanReceipt(blob, categories, activeAssets, contextDefaultAssetId || undefined);
      if (ocrResult?.quotaUsed !== undefined) {
        await updatePremiumDataFromServer('scan', ocrResult.quotaUsed, ocrResult.isPremium);
      }
      if (ocrResult) {
        applyReceiptData(ocrResult);
      } else {
        showToast(strukError || 'Gagal memproses struk.', 'error');
        setStage('crop');
      }
    }
  };

  const handleProceedCurrentMode = () => {
    if (!docTypeMismatch) return;
    if (docTypeMismatch.currentMode === 'struk' && docTypeMismatch.pendingReceipt) {
      applyReceiptData(docTypeMismatch.pendingReceipt);
    } else if (docTypeMismatch.currentMode === 'mutasi' && docTypeMismatch.pendingMutasi) {
      applyMutasiData(docTypeMismatch.pendingMutasi);
    }
    setDocTypeMismatch(null);
  };

  const handleDistributeCharges = () => {
    const activeItems = lineItems.filter(i => i.selected);
    const subtotal = activeItems.reduce((sum, item) => sum + item.amount, 0);
    
    if (subtotal === 0) {
      showToast('Pilih minimal satu item dengan nominal untuk distribusi', 'warning');
      return;
    }

    const totalAdjustment = taxAmount + serviceAmount - discountAmount;
    const factor = (subtotal + totalAdjustment) / subtotal;

    const newLineItems = lineItems.map(item => {
      if (!item.selected) return item;
      return {
        ...item,
        amount: Math.round(item.amount * factor)
      };
    });

    setLineItems(newLineItems);
    
    // Clear the adjustment fields as they are now in the items
    setTaxAmount(0);
    setServiceAmount(0);
    setDiscountAmount(0);
    
    // Update grand total
    const newTotal = newLineItems.reduce((sum, i) => sum + (i.selected ? i.amount : 0), 0);
    setEditableAmount(newTotal.toString());
    
    showToast('Biaya berhasil didistribusikan ke item!', 'success');
  };

  // ── Handle file select ─────────────────────────────────────────────────────
  const processFile = async (file: File) => {
    const validation = await validateFileSecure(file, {
      maxSizeMB: 5,
      allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp'],
      allowedMimeTypes: ['image/*'],
      checkMagicBytes: 'image'
    });

    if (!validation.isValid) {
      showToast(validation.error || 'Format gambar tidak valid', 'error');
      return false;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url); setImageFile(file); setCropRect(null); setStage('crop');
    return true;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    e.target.value = '';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsFileDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsFileDragging(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsFileDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleSaveMain = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    if (!result) {
      setIsSubmitting(false);
      return;
    }
    const finalAmount = parseInt(editableAmount) || 0;
    if (finalAmount <= 0) { showToast('Isi nominal terlebih dahulu', 'warning'); setIsSubmitting(false); return; }
    if (!selectedAssetId) { showToast('Pilih rekening terlebih dahulu', 'warning'); setIsSubmitting(false); return; }

    if (zbbMode === 'strict' && selectedType === 'pengeluaran') {
      const validation = validateTransactionBudget({
        type: selectedType,
        amount: finalAmount,
        categoryId: selectedCategory || 'Belanja (OCR)',
        date: selectedDate
      });
      if (!validation.isValid) {
        setPendingAction({ type: 'save_main' });
        setReallocationModal({
          isOpen: true,
          deficitCategory: validation.deficitCategory,
          deficitAmount: validation.deficitAmount,
          month: new Date(selectedDate).getMonth(),
          year: new Date(selectedDate).getFullYear()
        });
        setIsSubmitting(false);
        return;
      }
    }

    performSaveMain();
  };

  const performSaveMain = () => {
    const finalAmount = parseInt(editableAmount) || 0;
    try {
      // Build note and description with line items if they exist
      const selectedItems = lineItems.filter(i => i.selected);
      const finalNote = merchantName || 'Scan Otomatis';
      let finalDescription = '';
      if (selectedItems.length > 0) {
        finalDescription = selectedItems
          .map(i => `${i.name} - ${currencySymbol}${i.amount.toLocaleString('id-ID')}`)
          .join('\n');
      }

      addTransaction({
        type: selectedType,
        amount: finalAmount,
        categoryId: selectedCategory || 'Belanja (OCR)',
        subCategoryId: selectedSubCategory || undefined,
        date: selectedDate,
        time: selectedTime,
        note: finalNote,
        description: finalDescription || undefined,
        assetId: selectedAssetId,
      });
      showToast('Transaksi berhasil disimpan!', 'success');
      setTimeout(() => {
        setIsSubmitting(false);
        reset();
      }, 600);
    } catch (e) {
      showToast('Gagal menyimpan transaksi. Silakan coba lagi.', 'error');
      console.error(e);
      setIsSubmitting(false);
    }
  };



  const handleSplitSave = (splits: any[], data: { assetId: string, categoryId: string, subCategoryId: string }) => {
    const userSplit = splits.find(s => s.id === 'me');
    const payer = splits.find(s => s.isPayer) || splits[0];
    const isMePayer = payer.id === 'me';

    if (isMePayer && zbbMode === 'strict' && userSplit && userSplit.amount > 0) {
      const validation = validateTransactionBudget({
        type: 'pengeluaran',
        amount: userSplit.amount,
        categoryId: data.categoryId || 'Belanja (OCR)',
        date: selectedDate
      });
      if (!validation.isValid) {
        setPendingAction({ type: 'split', data: { splits, data } });
        setReallocationModal({
          isOpen: true,
          deficitCategory: validation.deficitCategory,
          deficitAmount: validation.deficitAmount,
          month: new Date(selectedDate).getMonth(),
          year: new Date(selectedDate).getFullYear()
        });
        return;
      }
    }

    performSplitSave(splits, data);
  };

  const performSplitSave = (splits: any[], data: { assetId: string, categoryId: string, subCategoryId: string }) => {
    try {
      const userSplit = splits.find(s => s.id === 'me');
      const payer = splits.find(s => s.isPayer) || splits[0];
      const isMePayer = payer.id === 'me';

      if (isMePayer) {
        // CASE 1: I PAID -> Record my share as expense + others as receivables
        // 1. My portion as a transaction
        if (userSplit && userSplit.amount > 0) {
          addTransaction({
            type: 'pengeluaran',
            amount: userSplit.amount,
            categoryId: data.categoryId || 'Belanja (OCR)',
            subCategoryId: data.subCategoryId || undefined,
            date: selectedDate,
            time: selectedTime,
            note: merchantName || 'Split Bill',
            assetId: data.assetId,
          });
        }

        // 2. Others' portions as Piutang (Debts)
        const others = splits.filter(s => s.id !== 'me' && s.amount > 0);
        others.forEach(person => {
          addDebt({
            type: 'piutang',
            contact: person.contactName,
            description: `Split Bill: ${merchantName || 'Struk'}`,
            totalAmount: person.amount,
            isPaid: false,
            date: selectedDate,
            createdAt: new Date().toISOString(),
            paymentAssetId: selectedAssetId,
            isInstallment: false,
            paidInstallments: 0
          }, 'none', selectedCategory || 'Lainnya');
        });
        showToast(`Split bill disimpan! (${others.length} piutang dicatat)`, 'success');
      } else {
        // CASE 2: SOMEONE ELSE PAID -> Record my share as a debt to them
        if (userSplit && userSplit.amount > 0) {
          addDebt({
            type: 'hutang',
            contact: payer.contactName,
            description: `Split Bill (${merchantName || 'Struk'})`,
            totalAmount: userSplit.amount,
            isPaid: false,
            date: selectedDate,
            createdAt: new Date().toISOString(),
            liabilityAssetId: '', // No asset affected yet as I haven't paid them back
            isInstallment: false,
            paidInstallments: 0
          }, 'none', selectedCategory || 'Lainnya');
          showToast(`Berhasil mencatat hutang ke ${payer.contactName}`, 'success');
        } else {
          showToast('Tidak ada bagian untuk Anda dalam split ini.', 'info');
        }
      }

      setTimeout(() => {
        setIsSplitModalOpen(false);
        reset();
      }, 600);
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
  const performSaveMutasi = (batchAssetId: string) => {
    const toSave = mutasiResults.filter(r => r.selected);
    toSave.forEach(tx => {
      if (tx.type === 'transfer') {
        let finalFrom = batchAssetId;
        let finalTo = batchAssetId;

        if (tx.fromAsset && tx.fromAsset !== batchAssetId) {
          finalFrom = tx.fromAsset;
          finalTo = batchAssetId;
        } else if (tx.toAsset && tx.toAsset !== batchAssetId) {
          finalFrom = batchAssetId;
          finalTo = tx.toAsset;
        } else {
          finalFrom = batchAssetId;
          finalTo = tx.toAsset || batchAssetId;
        }

        const newTx = addTransaction({
          type: 'transfer',
          amount: tx.amount,
          date: tx.date,
          note: tx.note || 'Transfer',
          categoryId: undefined,
          fromAssetId: finalFrom,
          toAssetId: finalTo
        });
        if (tx.adminFee && tx.adminFee > 0) {
          const feeAssetId = tx.adminFeeTarget === 'receiver' ? finalTo : finalFrom;
          const feeAssetName = assets.find(a => a.id === feeAssetId)?.name || '';
          addTransaction({
            type: 'pengeluaran',
            amount: tx.adminFee,
            categoryId: 'Biaya Admin',
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
          categoryId: tx.categoryId,
          subCategoryId: tx.subCategoryId || undefined,
          assetId: batchAssetId
        });
      }
    });

    showToast(`${toSave.length} transaksi berhasil disimpan!`, 'success');
    setTimeout(() => reset(), 600);
  };

  const handleReallocationSuccess = () => {
    setReallocationModal({ isOpen: false, deficitCategory: null, deficitAmount: 0, month: 0, year: 0 });
    if (pendingAction?.type === 'save_main') {
      performSaveMain();
    } else if (pendingAction?.type === 'split' && pendingAction.data) {
      performSplitSave(pendingAction.data.splits, pendingAction.data.data);
    } else if (pendingAction?.type === 'save_mutasi' && pendingAction.data?.batchAssetId) {
      performSaveMutasi(pendingAction.data.batchAssetId);
    }
    setPendingAction(null);
  };

  return (
    <PageWrapper>
      <div className="flex items-center gap-4 mb-6 pb-5 border-b border-border-light">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white border-none shadow-sm cursor-pointer hover:bg-primary/90 transition-colors shrink-0"
        >
          <MaterialIcon name="chevron_left" className="text-2xl" />
        </button>
        <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold m-0">
          {scanMode === 'struk' ? 'Pindai Struk' : 'Pindai Mutasi'}
        </h2>
        <PremiumBadge feature={scanMode === 'struk' ? 'scan' : 'bulk'} />
      </div>
      <input type="file" accept="image/*" ref={fileInputRef} data-testid="ocr-file-input" style={{ display: 'none' }} onChange={handleFileSelect} />

      {stage === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-8 flex flex-col gap-stack-md">
            <div className="bg-surface-container rounded-xl p-6 border border-border-light shadow-sm flex flex-col h-full">
              <div className="mb-4">
                <label className="font-headline-md text-headline-md block mb-1">Unggah Gambar Transaksi</label>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {scanMode === 'struk' ? 'Pilih atau tarik foto struk belanja Anda.' : 'Pilih atau tarik foto mutasi bank Anda.'} AI akan otomatis mengekstrak informasi di dalamnya.
                </p>
                <div className="w-full max-w-[300px] mt-4">
                  <TabBar
                    activeTabId={scanMode}
                    onChange={(id) => setScanMode(id as 'struk' | 'mutasi')}
                    tabs={[
                      { id: 'struk', label: 'Struk Belanja', 'data-testid': 'scan-mode-struk' },
                      { id: 'mutasi', label: 'Mutasi Bank', 'data-testid': 'scan-mode-mutasi' }
                    ]}
                  />
                </div>
              </div>
              <div className="relative flex-grow min-h-[350px]">
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="camera-button"
                  className={`w-full h-full p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center group ${
                    isFileDragging
                      ? 'border-primary bg-primary/10 ring-4 ring-primary/20 scale-[0.99]'
                      : 'border-outline-variant hover:border-primary bg-surface-bright hover:bg-primary/5'
                  }`}
                >
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg transition-transform ${
                    isFileDragging ? 'bg-primary text-white scale-110' : 'bg-primary-container text-primary group-hover:scale-105'
                  }`}>
                    <MaterialIcon name="photo_camera" className="text-[40px]" />
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-2 text-center">
                    {isFileDragging ? 'Lepaskan Gambar Di Sini' : 'Klik atau Tarik Gambar'}
                  </h3>
                  <p className="text-on-surface-variant font-body-md text-center max-w-[300px]">
                    Format yang didukung: JPG, PNG, WEBP (Max 5MB).
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="card" style={{ backgroundColor: 'hsla(350,85%,60%,0.1)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <MaterialIcon name="error" className="text-danger text-xl" />
                <span style={{ fontSize: '14px', color: 'var(--danger)', fontWeight: 600, flex: 1 }}>{error}</span>
                <button onClick={() => setError(null)} style={{ background: 'none', border: 'none' }}><MaterialIcon name="close" className="text-lg text-danger" /></button>
              </div>
            )}
          </div>

          {/* Side Help Panel */}
          <div className="lg:col-span-4 flex flex-col gap-stack-md">
            <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant">
              <div className="flex items-center gap-2 mb-4 text-primary">
                <MaterialIcon name="lightbulb" />
                <h2 className="font-headline-md text-headline-md">Tips Scan OCR</h2>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-primary-container text-on-primary-container text-xs font-bold">1</span>
                  <p className="font-body-md text-body-md">Pastikan foto diambil di tempat yang <b>terang</b> dan fokusnya tajam.</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-primary-container text-on-primary-container text-xs font-bold">2</span>
                  <p className="font-body-md text-body-md">Hindari pantulan cahaya berlebih atau kertas struk yang terlalu lecek.</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-primary-container text-on-primary-container text-xs font-bold">3</span>
                  <p className="font-body-md text-body-md">Gunakan fitur Crop di langkah selanjutnya agar AI lebih fokus membaca data.</p>
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
                <h4 className="font-headline-md text-headline-md">Pembacaan Otomatis</h4>
                <p className="text-sm opacity-80">AI kami memisahkan item struk dengan akurasi tinggi.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === 'crop' && (
        <div className="w-full max-w-[800px] mx-auto flex flex-col gap-6">
          {error && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 flex items-center justify-between gap-3 text-red-700 dark:text-red-300 text-sm font-semibold animate-shake">
              <div className="flex items-center gap-2">
                <MaterialIcon name="error" className="text-xl shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full border-none bg-transparent cursor-pointer text-red-700 dark:text-red-300">
                <MaterialIcon name="close" className="text-lg" />
              </button>
            </div>
          )}
          <div className="bg-surface-container-low rounded-2xl overflow-hidden border border-outline-variant shadow-sm mb-24">
            <canvas ref={canvasRef} className="w-full block" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />
          </div>
          
          <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] lg:bottom-0 left-0 lg:left-64 right-0 p-4 pb-4 lg:pb-[max(20px,env(safe-area-inset-bottom,20px))] bg-surface-container/90 backdrop-blur-md border-t border-outline-variant z-50">
            <div className="max-w-[500px] mx-auto flex gap-2 sm:gap-3">
              <button onClick={reset} className="flex-1 py-3 px-2 sm:px-4 rounded-xl border border-outline-variant text-on-surface font-label-sm sm:font-label-md font-bold bg-surface-container hover:bg-surface-container transition-colors cursor-pointer text-center leading-tight">
                Batal
              </button>
              <button onClick={runScan} className="flex-[2] py-3 px-2 sm:px-4 rounded-xl border-none bg-primary text-white font-label-sm sm:font-label-md font-bold hover:bg-primary/90 transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-2 shadow-md shadow-primary/30 text-center leading-tight">
                <MaterialIcon name="content_cut" className="text-sm sm:text-base" />
                {cropRect && cropRect.w > 50 ? 'Crop & Scan' : 'Scan Gambar Penuh'}
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === 'scanning' && (
        <div className="flex flex-col items-center justify-center py-20 gap-6 w-full max-w-[800px] mx-auto">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
            <MaterialIcon name="autorenew" className="text-[60px] spin text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-headline-md text-primary m-0 mb-2">
              {isInitializing ? 'Memuat Mesin AI...' : `Menganalisa... ${progress}%`}
            </h3>
            <p className="text-on-surface-variant font-body-md m-0">Mohon tunggu sebentar, AI sedang membaca data Anda.</p>
          </div>
        </div>
      )}

      {stage === 'results' && scanMode === 'struk' && result && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-stack-lg relative">
            {/* Left Column: Receipt Visual Reference */}
            <div className="lg:col-span-4 space-y-stack-md">
              <div className="bg-surface-container rounded-xl border border-border-light shadow-sm overflow-hidden sticky top-24">
                <div className="p-4 border-b border-border-light bg-surface-subtle flex justify-between items-center">
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Preview Struk Asli</span>
                  <span className="text-[10px] bg-primary-container/20 text-primary px-2 py-0.5 rounded-full font-bold">TER-CROP</span>
                </div>
                <div className="p-4 bg-surface-dim/30">
                  <div className="rounded-lg overflow-hidden border border-outline-variant bg-surface-container flex items-center justify-center">
                    <img alt="Receipt preview" className="max-w-full h-auto shadow-inner" src={croppedImageUrl || previewUrl || ''}/>
                  </div>
                </div>
                <div className="p-4 bg-surface-container">
                  <button onClick={() => { reset(); setTimeout(() => fileInputRef.current?.click(), 100); }} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant hover:border-primary hover:text-primary transition-all font-label-md bg-transparent cursor-pointer">
                    <MaterialIcon name="camera_alt" />
                    Pindai Ulang
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: OCR Parsed Data & Itemizer */}
            <div className="lg:col-span-6 space-y-stack-md mb-24">
              <div className="bg-surface-container-lowest rounded-xl border border-border-light shadow-sm p-stack-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-headline-md text-headline-md m-0">Hasil Pemindaian Struk</h2>
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-label-sm border ${CONFIDENCE_BADGE[result.confidence].className}`}>
                    <MaterialIcon name={CONFIDENCE_BADGE[result.confidence].icon} className="text-[14px]" />
                    {CONFIDENCE_BADGE[result.confidence].label}
                  </span>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-full">
                      <label className="font-label-sm text-label-sm text-on-surface-variant mb-2 block uppercase">Nama Merchant / Toko</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline"><MaterialIcon name="store" /></span>
                        <input className="w-full pl-12 pr-4 py-3 rounded-lg border border-border-light focus:ring-2 focus:ring-primary/20 focus:border-primary font-body-md outline-none transition-all" type="text" value={merchantName} onChange={e => setMerchantName(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="font-label-sm text-label-sm text-on-surface-variant mb-2 block uppercase">Tanggal</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline"><MaterialIcon name="calendar_today" className="text-[20px]" /></span>
                        <input className="w-full pl-12 pr-4 py-3 rounded-lg border border-border-light focus:ring-2 focus:ring-primary/20 focus:border-primary font-body-md outline-none transition-all" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="font-label-sm text-label-sm text-on-surface-variant mb-2 block uppercase">Waktu</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline"><MaterialIcon name="schedule" className="text-[20px]" /></span>
                        <input className="w-full pl-12 pr-4 py-3 rounded-lg border border-border-light focus:ring-2 focus:ring-primary/20 focus:border-primary font-body-md outline-none transition-all" type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} />
                      </div>
                    </div>

                    <div className="col-span-full bg-surface-container-low rounded-xl p-4 flex items-center justify-between border border-primary/10">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-surface-container rounded-lg border border-border-light text-primary flex items-center justify-center">
                          <MaterialIcon name="calculate" />
                        </div>
                        <div>
                          <label className="font-label-sm text-label-sm text-on-surface-variant block uppercase m-0">Total Transaksi</label>
                          <div className="font-headline-md text-headline-md text-primary tracking-tight m-0 flex items-center gap-1">
                            <span>{currencySymbol}</span>
                            <CurrencyInput value={editableAmount} onChange={val => setEditableAmount(val)} style={{ fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit', background: 'transparent', border: 'none', padding: 0, outline: 'none', width: '120px' }} />
                          </div>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-surface-container rounded-lg transition-colors text-outline border-none bg-transparent cursor-pointer flex items-center justify-center">
                        <MaterialIcon name="edit" />
                      </button>
                    </div>

                    <div>
                      <label className="font-label-sm text-label-sm text-on-surface-variant mb-2 block uppercase">Sumber Aset</label>
                      <button onClick={() => setIsAssetModalOpen(true)} className="w-full px-4 py-3 rounded-lg border border-border-light hover:border-primary font-body-md bg-surface-container text-left flex items-center justify-between transition-all cursor-pointer">
                        <span className="truncate">{assets.find(a => a.id === selectedAssetId)?.name || 'Pilih Rekening'}</span>
                        <MaterialIcon name="expand_more" className="text-outline text-[18px]" />
                      </button>
                    </div>

                    <div>
                      <label className="font-label-sm text-label-sm text-on-surface-variant mb-2 block uppercase">Kategori</label>
                      <button onClick={() => setIsCatModalOpen(true)} className="w-full px-4 py-3 rounded-lg border border-border-light hover:border-primary font-body-md bg-surface-container text-left flex items-center justify-between transition-all cursor-pointer">
                        <div className="flex items-center gap-2 truncate">
                          <MaterialIcon name="folder" className="text-primary text-[20px]" />
                          <span className="truncate">
                            {selectedCategory ? `${categories.find(c => c.id === selectedCategory)?.name || selectedCategory}${selectedSubCategory ? ` > ${categories.find(c => c.id === selectedCategory)?.subcategories?.find(s => s.id === selectedSubCategory)?.name || selectedSubCategory}` : ''}` : 'Pilih Kategori'}
                          </span>
                        </div>
                        <MaterialIcon name="expand_more" className="text-outline text-[18px]" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border-light">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-label-md text-label-md font-bold uppercase tracking-widest text-on-surface-variant m-0">Rincian Item Belanja</h3>
                      <button onClick={addItem} className="flex items-center gap-1 text-primary font-label-md hover:underline bg-transparent border-none cursor-pointer p-0">
                        <MaterialIcon name="add" className="text-[18px]" />
                        Tambah Item
                      </button>
                    </div>
                    
                    <div className="space-y-3 custom-scrollbar max-h-[400px] overflow-y-auto pr-2">
                      {lineItems.length === 0 ? (
                        <p className="text-center text-on-surface-variant text-sm py-4">Tidak ada item rincian terdeteksi.</p>
                      ) : lineItems.map((item, idx) => (
                        <div key={idx} onClick={() => toggleItem(idx)} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-4 rounded-xl border ${item.selected ? 'border-primary bg-primary/5' : 'border-border-light hover:border-primary-container/40'} transition-colors group cursor-pointer`}>
                          <div className="flex items-start sm:items-center gap-4 w-full sm:flex-1 min-w-0">
                            <input type="checkbox" checked={item.selected} onChange={() => toggleItem(idx)} onClick={e => e.stopPropagation()} className="w-5 h-5 mt-1 sm:mt-0 rounded border-outline-variant accent-primary cursor-pointer shrink-0" />
                            {editingItemIdx === idx && editingField === 'name' ? (
                              <textarea autoFocus value={item.name} onChange={e => editItem(idx, 'name', e.target.value)} onBlur={() => { setEditingItemIdx(null); setEditingField(null); }} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setEditingItemIdx(null); setEditingField(null); } }} className="w-full text-[15px] font-medium border-b border-primary bg-transparent outline-none p-1 resize-none" rows={2} />
                            ) : (
                              <span onClick={(e) => { e.stopPropagation(); setEditingItemIdx(idx); setEditingField('name'); }} className="font-body-md font-medium break-words whitespace-normal leading-snug pt-0.5" title={item.name}>{item.name}</span>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-9 sm:pl-0 shrink-0 mt-1 sm:mt-0">
                            {editingItemIdx === idx && editingField === 'amount' ? (
                              <CurrencyInput autoFocus value={item.amount === 0 ? '' : item.amount} onChange={val => editItem(idx, 'amount', val)} onBlur={() => { setEditingItemIdx(null); setEditingField(null); }} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter') { setEditingItemIdx(null); setEditingField(null); } }} style={{ width: '100px', fontSize: '15px', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid var(--primary)', background: 'transparent', outline: 'none', padding: '4px' }} className="sm:text-right" />
                            ) : (
                              <span onClick={(e) => { e.stopPropagation(); setEditingItemIdx(idx); setEditingField('amount'); }} className="font-body-md text-primary font-bold whitespace-nowrap">
                                {currencySymbol}{item.amount.toLocaleString('id-ID')}
                              </span>
                            )}
                            
                            <div className="flex gap-1">
                              <button onClick={(e) => { e.stopPropagation(); deleteItem(idx); }} className="p-2 hover:bg-error-container/20 rounded-full text-error bg-transparent border-none cursor-pointer flex"><MaterialIcon name="delete" className="text-[18px]" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tax, Service, Discount */}
                    <div className="mt-6 pt-4 border-t border-border-light space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-on-surface-variant font-medium">Pajak (PPN/PB1)</span>
                        <div className="flex items-center gap-2">
                          <span className="text-on-surface-variant">{currencySymbol}</span>
                          <CurrencyInput value={taxAmount || ''} onChange={val => setTaxAmount(parseInt(val) || 0)} style={{ width: '80px', textAlign: 'right', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-light)' }} placeholder="0" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-on-surface-variant font-medium">Service Charge</span>
                        <div className="flex items-center gap-2">
                          <span className="text-on-surface-variant">{currencySymbol}</span>
                          <CurrencyInput value={serviceAmount || ''} onChange={val => setServiceAmount(parseInt(val) || 0)} style={{ width: '80px', textAlign: 'right', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-light)' }} placeholder="0" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-on-surface-variant font-medium">Diskon</span>
                        <div className="flex items-center gap-2">
                          <span className="text-error font-bold">- {currencySymbol}</span>
                          <CurrencyInput value={discountAmount || ''} onChange={val => setDiscountAmount(parseInt(val) || 0)} style={{ width: '80px', textAlign: 'right', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--error-container)', color: 'var(--error)', background: 'var(--error-container)', opacity: 0.8 }} placeholder="0" />
                        </div>
                      </div>
                      <div className="pt-2">
                        <button onClick={handleDistributeCharges} className="w-full py-2.5 rounded-lg border border-primary text-primary font-label-md hover:bg-primary/5 transition-colors bg-transparent cursor-pointer">
                          Hitung Ulang & Distribusi ke Item
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Diagnostik Section inside the right column */}
                  <div className="pt-4 border-t border-border-light">
                    <details className="bg-surface-container-low rounded-xl p-4 cursor-pointer group">
                      <summary className="font-label-sm text-primary font-bold flex items-center gap-2 outline-none">
                        <MaterialIcon name="terminal" className="text-[16px]" />
                        Diagnostik & Teks Mentah
                        <MaterialIcon name="expand_more" className="ml-auto group-open:rotate-180 transition-transform text-[18px]" />
                      </summary>
                      <div className="mt-3 pt-3 border-t border-primary/10">
                        {result.debugLogs && (
                          <div className="p-3 bg-black/5 rounded-lg text-[10px] mb-3 max-h-32 overflow-y-auto font-mono text-on-surface-variant">
                            {result.debugLogs.map((l, i) => <div key={i}>{l}</div>)}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap text-[11px] text-on-surface-variant font-mono p-3 bg-surface-container border border-border-light rounded-lg">
                          {result.rawText || "(Kosong)"}
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Action Footer */}
            <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] lg:bottom-0 left-0 lg:left-64 right-0 bg-surface-container/90 backdrop-blur-md border-t border-outline-variant px-4 lg:px-8 py-4 z-40 shadow-[0_-4px_24px_rgba(0,0,0,0.05)] lg:pb-[calc(24px+env(safe-area-inset-bottom,0px))]">
              <div className="max-w-container-max mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="hidden sm:flex items-center gap-3 text-on-surface-variant">
                  <MaterialIcon name="info" />
                  <span className="font-label-md">Pastikan rincian item sudah sesuai dengan struk asli.</span>
                </div>
                <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                  <button disabled={isSubmitting} onClick={() => setIsItemizerOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-5 py-3 rounded-xl border border-primary/40 text-primary font-label-sm sm:font-label-md hover:bg-primary/10 transition-colors cursor-pointer font-bold leading-tight text-center">
                    <MaterialIcon name="receipt_long" />
                    Split Subkategori
                  </button>
                  <button disabled={isSubmitting} onClick={handleSaveMain} className="flex-1 sm:flex-none px-3 sm:px-5 py-3 rounded-xl border border-primary text-primary font-label-sm sm:font-label-md hover:bg-primary/5 transition-colors bg-transparent cursor-pointer font-bold leading-tight flex items-center justify-center text-center">
                    Simpan Langsung
                  </button>
                  <button disabled={isSubmitting} onClick={() => setIsSplitModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-5 py-3 rounded-xl bg-primary text-on-primary font-label-sm sm:font-label-md hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30 cursor-pointer font-bold border-none leading-tight text-center">
                    <MaterialIcon name="group" />
                    Split Bill
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}



      {stage === 'results' && scanMode === 'mutasi' && (
        <BulkResultsEditor
          results={mutasiResults}
          setResults={setMutasiResults}
          categories={categories}
          assets={assets}
          currencySymbol={currencySymbol}
          initialAssetId={contextDefaultAssetId || undefined}
          isMutation={true}
          onSave={(batchAssetId) => {
            const toSave = mutasiResults.filter(r => r.selected);
            if (toSave.some(r => r.type !== 'transfer' && (!r.amount || !r.categoryId))) {
              showToast('Pastikan semua transaksi reguler memiliki Nominal dan Kategori!', 'warning');
              return;
            }
            if (toSave.some(r => r.type === 'transfer' && (!r.amount || (!r.fromAsset && !r.toAsset)))) {
              showToast('Pastikan semua transaksi transfer memiliki Nominal dan Rekening Lawan!', 'warning');
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
                  setPendingAction({ type: 'save_mutasi', data: { batchAssetId } });
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

            performSaveMutasi(batchAssetId);
          }}
        />
      )}

      <SplitBillModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        totalAmount={
          lineItems.some(i => i.selected)
            ? lineItems.filter(i => i.selected).reduce((s, i) => s + i.amount, 0)
            : (parseInt(editableAmount) || 0)
        }
        merchantName={merchantName}
        date={selectedDate}
        lineItems={lineItems.some(i => i.selected) ? lineItems.filter(i => i.selected) : lineItems}
        assets={assets}
        categories={categories}
        initialAssetId={selectedAssetId}
        initialCategoryId={selectedCategory}
        initialSubCategoryId={selectedSubCategory}
        onSave={handleSplitSave}
      />

      <AssetSelectModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        assets={assets}
        selectedAssetId={selectedAssetId}
        onSelect={setSelectedAssetId}
      />

      <CategorySelectModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        categories={categories}
        type={selectedType}
        initialCategoryId={selectedCategory}
        initialSubCategoryId={selectedSubCategory}
        onSelect={(cat, sub) => {
          setSelectedCategory(cat);
          setSelectedSubCategory(sub);
        }}
      />

      <ReceiptItemizerModal
        isOpen={isItemizerOpen}
        onClose={() => setIsItemizerOpen(false)}
        initialItems={lineItems.map(item => ({
          name: item.name,
          amount: item.amount,
          categoryId: selectedCategory,
          subCategoryId: selectedSubCategory,
        }))}
        categories={categories}
        merchantName={merchantName}
        receiptDate={selectedDate}
        assetId={selectedAssetId}
        onSaveAsSplit={(items, totalAmt) => {
          const firstCatId = items[0]?.categoryId || selectedCategory || categories.find(c => c.type === 'pengeluaran' && !c.isDeleted)?.id || '';
          const firstSubCatId = items[0]?.subCategoryId || selectedSubCategory || undefined;
          addTransaction({
            type: 'pengeluaran',
            amount: totalAmt,
            categoryId: firstCatId,
            subCategoryId: firstSubCatId,
            date: selectedDate,
            time: selectedTime,
            note: merchantName || 'Struk Itemized',
            assetId: selectedAssetId || assets[0]?.id || '',
            itemizedDetails: items,
          });
          showToast(`Berhasil menyimpan 1 transaksi itemized (${items.length} barang)!`, 'success');
          navigate('/');
        }}
        onSaveAsMultiple={(items) => {
          items.forEach(item => {
            const itemCatId = item.categoryId || selectedCategory || categories.find(c => c.type === 'pengeluaran' && !c.isDeleted)?.id || '';
            const itemSubCatId = item.subCategoryId !== undefined ? (item.subCategoryId || undefined) : (selectedSubCategory || undefined);
            addTransaction({
              type: 'pengeluaran',
              amount: item.amount,
              categoryId: itemCatId,
              subCategoryId: itemSubCatId,
              date: selectedDate,
              time: selectedTime,
              note: `${merchantName} - ${item.name}`,
              assetId: selectedAssetId || assets[0]?.id || '',
            });
          });
          showToast(`Berhasil menyimpan ${items.length} transaksi terpisah!`, 'success');
          navigate('/');
        }}
      />

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

      {/* Smart Document Type Mismatch Modal */}
      {docTypeMismatch && docTypeMismatch.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-container text-primary flex items-center justify-center shrink-0">
                <MaterialIcon 
                  name={docTypeMismatch.detectedType === 'bank_statement' ? 'account_balance' : 'receipt_long'} 
                  className="text-2xl" 
                />
              </div>
              <div>
                <h3 className="font-headline-md text-base font-bold text-on-surface">
                  {docTypeMismatch.detectedType === 'bank_statement' 
                    ? 'Terdeteksi Mutasi Bank / Rekening' 
                    : 'Terdeteksi Struk Belanja Tunggal'}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {docTypeMismatch.detectedType === 'bank_statement'
                    ? 'Gambar memiliki format daftar banyak transaksi mutasi'
                    : 'Gambar memiliki format struk belanja perorangan'}
                </p>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant leading-relaxed">
              {docTypeMismatch.detectedType === 'bank_statement'
                ? 'Gambar yang Anda unggah tampak seperti riwayat mutasi rekening atau screenshot m-banking. Apakah Anda ingin beralih ke tab Pindai Mutasi agar semua baris transaksi dapat diproses sekaligus?'
                : 'Gambar yang Anda unggah tampak seperti struk belanja. Apakah Anda ingin beralih ke tab Pindai Struk agar rincian belanja per-item dan pajak dapat diuraikan?'}
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={handleProceedCurrentMode}
                className="flex-1 py-2.5 px-3 rounded-xl border border-outline-variant bg-surface-container-high hover:bg-surface-container text-on-surface text-xs font-bold transition-colors cursor-pointer"
              >
                {docTypeMismatch.currentMode === 'struk' ? 'Tetap Lanjut sebagai Struk' : 'Tetap Lanjut sebagai Mutasi'}
              </button>
              <button
                type="button"
                onClick={handleSwitchMode}
                className="flex-1 py-2.5 px-3 rounded-xl border-none bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-colors cursor-pointer shadow-md shadow-primary/30 flex items-center justify-center gap-1.5"
              >
                <MaterialIcon name="swap_horiz" className="text-base" />
                {docTypeMismatch.detectedType === 'bank_statement' ? 'Beralih ke Pindai Mutasi' : 'Beralih ke Pindai Struk'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

export default ReceiptScanner;
