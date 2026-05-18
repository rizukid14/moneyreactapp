import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Trash2, Wallet, ArrowUpRight, ArrowDownLeft, Share2, Link2Off, Copy, ExternalLink, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney, type Asset, type Category } from '../../contexts/MoneyContext';
import { dbSaveSharedSplit, dbDeleteSharedSplit } from '../../lib/db';
import ContactSelectModal from './ContactSelectModal';
import { type LineItem } from '../../hooks/useReceiptOCR';
import AssetSelectModal from './AssetSelectModal';
import CategorySelectModal from './CategorySelectModal';
import CurrencyInput from '../common/CurrencyInput';

interface SplitPerson {
  id: string;
  contactName: string;
  amount: number;
  isPayer: boolean;
}

interface SplitBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  merchantName: string;
  date: string;
  lineItems?: LineItem[];
  assets: Asset[];
  categories: Category[];
  initialAssetId?: string;
  initialCategory?: string;
  initialSubCategory?: string;
  onSave: (splits: SplitPerson[], data: { assetId: string, category: string, subCategory: string }) => void;
  sourceId?: string;
}

const SplitBillModal: React.FC<SplitBillModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  merchantName,
  date,
  lineItems,
  assets,
  categories,
  initialAssetId,
  initialCategory,
  initialSubCategory,
  onSave,
  sourceId,
}) => {
  const { contacts, currencySymbol } = useMoney();
  const [splits, setSplits] = useState<SplitPerson[]>([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom' | 'items'>('equal');
  const [itemAssignments, setItemAssignments] = useState<Record<number, string[]>>({});

  const [selectedAssetId, setSelectedAssetId] = useState(initialAssetId || '');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || '');
  const [selectedSubCategory, setSelectedSubCategory] = useState(initialSubCategory || '');
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [localLineItems, setLocalLineItems] = useState<LineItem[]>([]);
  const [activeSharedId, setActiveSharedId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSplits([{ id: 'me', contactName: 'Saya', amount: totalAmount, isPayer: true }]);
      setSplitMethod(lineItems && lineItems.length > 0 ? 'items' : 'equal');
      setLocalLineItems(lineItems || []);
      setItemAssignments({});
      setSelectedAssetId(initialAssetId || '');
      setSelectedCategory(initialCategory || '');
      setSelectedSubCategory(initialSubCategory || '');
      setActiveSharedId(null);
      setIsSharing(false);
      setShowCopySuccess(false);
    }
  }, [isOpen, totalAmount, lineItems, initialAssetId, initialCategory, initialSubCategory]);

  const addPeople = (names: string[]) => {
    const existingNames = splits.map(s => s.contactName);
    const newNames = names.filter(n => !existingNames.includes(n));
    
    const newPeople = newNames.map(name => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      contactName: name,
      amount: 0,
      isPayer: false,
    }));

    const nextSplits = [...splits, ...newPeople];
    setSplits(nextSplits);

    if (splitMethod === 'equal') {
      calculateEqualSplit(nextSplits);
    } else if (splitMethod === 'items') {
      calculateItemSplit(nextSplits, itemAssignments, localLineItems);
    }
  };

  const removePerson = (id: string) => {
    const newSplits = splits.filter(s => s.id !== id);
    setSplits(newSplits);

    if (splitMethod === 'equal') {
      calculateEqualSplit(newSplits);
    } else if (splitMethod === 'items') {
      calculateItemSplit(newSplits, itemAssignments, localLineItems);
    }
  };

  const calculateEqualSplit = (currentSplits: SplitPerson[]) => {
    if (currentSplits.length === 0) return;

    const amountPerPerson = Math.floor(totalAmount / currentSplits.length);
    const remainder = totalAmount - (amountPerPerson * currentSplits.length);

    const updated = currentSplits.map((split, index) => ({
      ...split,
      amount: index === 0 ? amountPerPerson + remainder : amountPerPerson,
    }));

    setSplits(updated);
  };

  const calculateItemSplit = (currentSplits: SplitPerson[], assignments: Record<number, string[]>, items: LineItem[] = localLineItems) => {
    if (currentSplits.length === 0) return;

    const personAmounts: Record<string, number> = {};
    currentSplits.forEach(p => { personAmounts[p.id] = 0; });

    items.forEach((item, idx) => {
      const assignedIds = assignments[idx] || [];
      if (assignedIds.length > 0) {
        const share = Math.floor(item.amount / assignedIds.length);
        const remainder = item.amount - (share * assignedIds.length);
        assignedIds.forEach((id, i) => {
          if (personAmounts[id] !== undefined) {
            personAmounts[id] += i === 0 ? share + remainder : share;
          }
        });
      } else {
        // Unassigned items go to the first person (usually 'Saya')
        const firstId = currentSplits[0].id;
        personAmounts[firstId] += item.amount;
      }
    });

    // Account for any difference between items sum and totalAmount (taxes, tips, or unread items)
    const itemsSum = items.reduce((sum, item) => sum + item.amount, 0);
    const gap = totalAmount - itemsSum;
    if (gap !== 0) {
      const firstId = currentSplits[0].id;
      if (personAmounts[firstId] !== undefined) {
        personAmounts[firstId] += gap;
      }
    }

    const updated = currentSplits.map(split => ({
      ...split,
      amount: personAmounts[split.id] || 0,
    }));

    setSplits(updated);
  };

  const toggleItemAssignment = (itemIdx: number, personId: string) => {
    setItemAssignments(prev => {
      const current = prev[itemIdx] || [];
      const next = current.includes(personId)
        ? current.filter(id => id !== personId)
        : [...current, personId];

      const newAssignments = { ...prev, [itemIdx]: next };
      calculateItemSplit(splits, newAssignments, localLineItems);
      return newAssignments;
    });
  };

  const addLocalItem = () => {
    const newItem: LineItem = { name: 'Item Baru', amount: 0, selected: true };
    const nextItems = [...localLineItems, newItem];
    setLocalLineItems(nextItems);
    calculateItemSplit(splits, itemAssignments, nextItems);
  };

  const updateLocalItem = (idx: number, updates: Partial<LineItem>) => {
    const nextItems = localLineItems.map((item, i) => i === idx ? { ...item, ...updates } : item);
    setLocalLineItems(nextItems);
    calculateItemSplit(splits, itemAssignments, nextItems);
  };

  const removeLocalItem = (idx: number) => {
    const nextItems = localLineItems.filter((_, i) => i !== idx);
    setLocalLineItems(nextItems);
    
    // Cleanup assignments
    const nextAssignments: Record<number, string[]> = {};
    Object.entries(itemAssignments).forEach(([key, val]) => {
      const k = parseInt(key);
      if (k < idx) nextAssignments[k] = val;
      if (k > idx) nextAssignments[k-1] = val;
    });
    setItemAssignments(nextAssignments);
    calculateItemSplit(splits, nextAssignments, nextItems);
  };

  const updateAmount = (id: string, amount: number) => {
    setSplits(splits.map(s => s.id === id ? { ...s, amount } : s));
  };

  const togglePayer = (id: string) => {
    setSplits(splits.map(s => s.id === id ? { ...s, isPayer: !s.isPayer } : s));
  };

  const handleSplitMethodChange = (method: 'equal' | 'custom' | 'items') => {
    setSplitMethod(method);
    if (method === 'equal') {
      calculateEqualSplit(splits);
    } else if (method === 'items') {
      calculateItemSplit(splits, itemAssignments, localLineItems);
    }
  };

  const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
  const difference = totalAmount - totalSplit;

  const handleSave = async () => {
    if (splits.length === 0) {
      alert('Tambahkan minimal 1 orang untuk split bill');
      return;
    }

    if (Math.abs(difference) > 0) {
      alert(`Total split (${currencySymbol}${totalSplit.toLocaleString('id-ID')}) tidak sama dengan total tagihan (${currencySymbol}${totalAmount.toLocaleString('id-ID')})`);
      return;
    }

    if (!selectedAssetId) {
      alert('Pilih rekening terlebih dahulu');
      return;
    }

    // Auto-generate shared link in the background to ensure it's accessible later
    try {
      if (!activeSharedId) {
        await dbSaveSharedSplit({
          type: 'split',
          sourceId: sourceId || `${merchantName}-${date}-${totalAmount}`,
          merchantName,
          date,
          totalAmount,
          currencySymbol,
          splits,
          lineItems: localLineItems
        });
      }
    } catch (err) {
      console.error('Failed to auto-save shared split:', err);
    }

    onSave(splits, {
      assetId: selectedAssetId,
      category: selectedCategory,
      subCategory: selectedSubCategory
    });
    onClose();
  };

  const handleShare = async () => {
    if (splits.length === 0) return;
    setIsSharing(true);
    try {
      const sharedId = await dbSaveSharedSplit({
        type: 'split',
        sourceId: sourceId || `${merchantName}-${date}-${totalAmount}`,
        merchantName,
        date,
        totalAmount,
        currencySymbol,
        splits,
        lineItems: localLineItems
      });
      setActiveSharedId(sharedId);
      
      const shareUrl = `${window.location.origin}/shared-split/${sharedId}`;
      
      if (navigator.share) {
        await navigator.share({
          title: `Split Bill: ${merchantName}`,
          text: `Detail split bill untuk ${merchantName} (${currencySymbol}${totalAmount.toLocaleString('id-ID')})`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to share:', err);
      alert('Gagal membagikan split bill. Pastikan Anda sudah login dan sinkronisasi aktif.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevoke = async () => {
    if (!activeSharedId) return;
    if (confirm('Apakah Anda yakin ingin menghapus link sharing ini? Orang lain tidak akan bisa melihat rincian lagi.')) {
      try {
        await dbDeleteSharedSplit(activeSharedId);
        setActiveSharedId(null);
        alert('Link sharing berhasil dihapus.');
      } catch (err) {
        console.error('Failed to revoke:', err);
        alert('Gagal menghapus link sharing.');
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="modal-overlay"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <motion.div
              className="modal-content"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 600, mass: 0.5 }}
            >
              <div className="modal-header">
                <h2 className="subtitle" style={{ margin: 0 }}>
                  Split Bill
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {activeSharedId ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        className="close-btn"
                        onClick={() => {
                          const url = `${window.location.origin}/shared-split/${activeSharedId}`;
                          navigator.clipboard.writeText(url);
                          setShowCopySuccess(true);
                          setTimeout(() => setShowCopySuccess(false), 2000);
                        }}
                        title="Salin Link"
                        style={{ color: showCopySuccess ? 'var(--success)' : 'var(--primary)' }}
                      >
                        {showCopySuccess ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                      <button
                        className="close-btn"
                        onClick={() => window.open(`/shared-split/${activeSharedId}`, '_blank')}
                        title="Buka Link"
                      >
                        <ExternalLink size={18} />
                      </button>
                      <button
                        className="close-btn"
                        onClick={handleRevoke}
                        title="Hapus Link Sharing"
                        style={{ color: 'var(--danger)' }}
                      >
                        <Link2Off size={18} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="close-btn"
                      onClick={handleShare}
                      disabled={isSharing || splits.length === 0}
                      title="Bagikan Split Bill"
                      style={{ color: 'var(--primary)', opacity: isSharing ? 0.5 : 1 }}
                    >
                      <Share2 size={18} className={isSharing ? 'animate-pulse' : ''} />
                    </button>
                  )}
                  <button className="close-btn" onClick={onClose}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-income)',
                  border: '1.5px solid var(--primary)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {merchantName} • {date}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wallet size={20} color="var(--primary)" />
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>
                    {currencySymbol}{totalAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Asset & Category Pickers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>REKENING</label>
                  <button
                    onClick={() => setIsAssetModalOpen(true)}
                    style={{
                      width: '100%', padding: '10px 8px', background: 'var(--bg-main)', border: '1.5px solid var(--border-color)',
                      borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: selectedAssetId ? 'var(--text-main)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedAssetId ? assets.find(a => a.id === selectedAssetId)?.name : 'Pilih...'}
                    </span>
                  </button>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>KATEGORI</label>
                  <button
                    onClick={() => setIsCategoryModalOpen(true)}
                    style={{
                      width: '100%', padding: '10px 8px', background: 'var(--bg-main)', border: '1.5px solid var(--border-color)',
                      borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: selectedCategory ? 'var(--text-main)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedCategory ? (selectedSubCategory ? `${selectedCategory} > ${selectedSubCategory}` : selectedCategory) : 'Pilih...'}
                    </span>
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  background: 'var(--bg-main)',
                  borderRadius: 12,
                  padding: 4,
                  marginBottom: 16,
                  border: '1px solid var(--border-color)',
                }}
              >
                <button
                  onClick={() => handleSplitMethodChange('equal')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'transparent',
                    color: splitMethod === 'equal' ? 'white' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {splitMethod === 'equal' && (
                    <motion.div
                      layoutId="activeSplitMethod"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'var(--primary)',
                        borderRadius: 8,
                        zIndex: 1,
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span style={{ position: 'relative', zIndex: 2 }}>Bagi Rata</span>
                </button>
                <button
                  onClick={() => handleSplitMethodChange('items')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'transparent',
                    color: splitMethod === 'items' ? 'white' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {splitMethod === 'items' && (
                    <motion.div
                      layoutId="activeSplitMethod"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'var(--primary)',
                        borderRadius: 8,
                        zIndex: 1,
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span style={{ position: 'relative', zIndex: 2 }}>Per Item</span>
                </button>
                <button
                  onClick={() => handleSplitMethodChange('custom')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'transparent',
                    color: splitMethod === 'custom' ? 'white' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {splitMethod === 'custom' && (
                    <motion.div
                      layoutId="activeSplitMethod"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'var(--primary)',
                        borderRadius: 8,
                        zIndex: 1,
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span style={{ position: 'relative', zIndex: 2 }}>Custom</span>
                </button>
              </div>

              <div
                style={{
                  maxHeight: splitMethod === 'items' ? 200 : 300,
                  overflowY: 'auto',
                  marginBottom: 16,
                  paddingRight: 8,
                  marginRight: -8,
                }}
                className="custom-scrollbar"
              >
                {splits.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: 'var(--text-muted)',
                      background: 'var(--bg-main)',
                      borderRadius: 12,
                      border: '1.5px dashed var(--border-color)',
                    }}
                  >
                    <Users size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <div style={{ fontSize: 14, marginBottom: 8 }}>
                      Belum ada orang ditambahkan
                    </div>
                    <div style={{ fontSize: 12 }}>
                      Klik tombol "Tambah Orang" di bawah
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {splits.map((split) => (
                      <div
                        key={split.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          background: split.isPayer ? 'var(--bg-income)' : 'var(--bg-main)',
                          border: `1.5px solid ${split.isPayer ? 'hsla(var(--p-h), 85%, 58%, 0.3)' : 'var(--border-color)'}`,
                          borderRadius: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: split.isPayer
                              ? 'hsla(var(--p-h), 85%, 58%, 0.15)'
                              : 'hsla(var(--n-h), 15%, 85%, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontWeight: 700,
                            fontSize: 13,
                            color: split.isPayer ? 'var(--primary)' : 'var(--text-main)'
                          }}
                        >
                          {split.contactName.charAt(0).toUpperCase()}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 13,
                              color: 'var(--text-main)',
                              marginBottom: 2,
                            }}
                          >
                            {split.contactName}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: split.isPayer ? 'var(--primary)' : 'var(--text-muted)',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {split.isPayer ? (
                              <>
                                <ArrowUpRight size={12} />
                                <span>Pemberi Dana (Piutang)</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownLeft size={12} style={{ color: 'var(--danger)' }} />
                                <span style={{ color: 'var(--text-muted)' }}>Penerima Dana (Hutang)</span>
                              </>
                            )}
                          </div>
                        </div>

                        <CurrencyInput
                          value={split.amount === 0 ? '' : split.amount}
                          onChange={(raw) => updateAmount(split.id, parseInt(raw) || 0)}
                          disabled={splitMethod !== 'custom'}
                          style={{
                            width: 90,
                            padding: '6px 8px',
                            borderRadius: 8,
                            border: '1.5px solid var(--border-color)',
                            textAlign: 'right',
                            fontWeight: 700,
                            fontSize: 12,
                            marginBottom: 0,
                            background: splitMethod !== 'custom' ? 'var(--bg-main)' : 'var(--bg-card-solid)',
                            color: 'var(--text-main)',
                          }}
                          placeholder="0"
                        />

                        <button
                          onClick={() => togglePayer(split.id)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: 'none',
                            background: split.isPayer ? 'hsla(var(--p-h), 85%, 58%, 0.15)' : 'hsla(var(--n-h), 10%, 50%, 0.1)',
                            color: split.isPayer ? 'var(--primary)' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.2s',
                          }}
                          title="Ubah peran pembayar/penerima"
                        >
                          {split.isPayer ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                        </button>

                        <button
                          onClick={() => removePerson(split.id)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: 'none',
                            border: 'none',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-expense)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {splitMethod === 'items' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Rincian Item</span>
                    <button 
                      onClick={addLocalItem}
                      style={{ 
                        padding: '4px 10px', borderRadius: '8px', background: 'var(--primary-glow)', 
                        border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: 800, cursor: 'pointer' 
                      }}
                    >
                      <Plus size={14} style={{ marginRight: 4, display: 'inline' }} /> Tambah Item
                    </button>
                  </div>
                  <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }} className="custom-scrollbar">
                    {localLineItems.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-main)', borderRadius: 12, color: 'var(--text-muted)', fontSize: 12 }}>
                        Belum ada item. Klik "Tambah Item" untuk memulai.
                      </div>
                    ) : (
                      localLineItems.map((item, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '12px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                            <input 
                              type="text" 
                              value={item.name}
                              onChange={(e) => updateLocalItem(idx, { name: e.target.value })}
                              placeholder="Nama Item..."
                              style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13, fontWeight: 700, marginBottom: 0 }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{currencySymbol}</span>
                              <CurrencyInput 
                                value={item.amount === 0 ? '' : item.amount}
                                onChange={(raw) => updateLocalItem(idx, { amount: parseInt(raw) || 0 })}
                                placeholder="0"
                                style={{ width: 80, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13, fontWeight: 800, textAlign: 'right', marginBottom: 0 }}
                              />
                            </div>
                            <button 
                              onClick={() => removeLocalItem(idx)}
                              style={{ padding: '6px', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {splits.map(person => {
                              const isAssigned = (itemAssignments[idx] || []).includes(person.id);
                              return (
                                <button
                                  key={person.id}
                                  onClick={() => toggleItemAssignment(idx, person.id)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 14,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    border: isAssigned ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)',
                                    background: isAssigned ? 'var(--primary-glow)' : 'var(--bg-main)',
                                    color: isAssigned ? 'var(--primary)' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  {person.contactName}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {splits.length > 0 && (
                <div
                  style={{
                    background: 'var(--bg-main)',
                    borderRadius: 12,
                    padding: '10px 12px',
                    marginBottom: 16,
                    border: `1.5px solid ${Math.abs(difference) === 0 ? 'var(--success)' : 'var(--danger)'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Total Split:</span>
                    <span style={{ fontWeight: 700 }}>
                      {currencySymbol}{totalSplit.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Total Tagihan:</span>
                    <span style={{ fontWeight: 700 }}>
                      {currencySymbol}{totalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      fontWeight: 700,
                      paddingTop: 8,
                      borderTop: '1px solid var(--border-color)',
                    }}
                  >
                    <span>Selisih:</span>
                    <span
                      style={{
                        color: Math.abs(difference) === 0 ? 'var(--success)' : 'var(--danger)',
                      }}
                    >
                      {difference === 0 ? '✓ Pas' : `${currencySymbol}${Math.abs(difference).toLocaleString('id-ID')}`}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setContactModalOpen(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'none',
                  border: '1.5px dashed var(--border-color)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  color: 'var(--primary)',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 16,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-income)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)';
                  (e.currentTarget as HTMLElement).style.background = 'none';
                }}
              >
                <Plus size={16} />
                Tambah Orang
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                {activeSharedId ? (
                  <button
                    className="btn btn-secondary"
                    onClick={() => window.open(`${window.location.origin}/shared-split/${activeSharedId}`, '_blank')}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <ExternalLink size={16} /> Buka Link
                  </button>
                ) : (
                  <button
                    className="btn"
                    onClick={onClose}
                    style={{ flex: 1 }}
                  >
                    Batal
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  style={{ flex: 2 }}
                  disabled={splits.length === 0 || Math.abs(difference) !== 0}
                >
                  Simpan Split Bill
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ContactSelectModal 
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        contacts={contacts}
        selectedContactNames={splits.map(s => s.contactName)}
        onSelectMultiple={addPeople}
        isMultiple={true}
      />

      <AssetSelectModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        assets={assets}
        selectedAssetId={selectedAssetId}
        onSelect={setSelectedAssetId}
      />

      <CategorySelectModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        type="pengeluaran"
        initialCategory={selectedCategory}
        initialSubCategory={selectedSubCategory}
        onSelect={(cat, sub) => {
          setSelectedCategory(cat);
          setSelectedSubCategory(sub || '');
        }}
      />
    </>
  );
};

export default SplitBillModal;
