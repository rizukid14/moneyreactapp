import React, { useState, useMemo, useRef, useEffect } from 'react';
import { type Category, useMoney } from '../../contexts/MoneyContext';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import MaterialIcon from '../common/MaterialIcon';
import { useToast } from '../common/Toast';
import ConfirmDialog from '../common/ConfirmDialog';
import CategoryModal from './CategoryModal';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ isOpen, onClose }) => {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory
  } = useMoney();
  const { showToast } = useToast();

  const [catTab, setCatTab] = useState<'pengeluaran' | 'pendapatan'>('pengeluaran');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategoryForModal, setEditingCategoryForModal] = useState<Category | null>(null);

  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const subInputRef = useRef<HTMLInputElement>(null);

  const [editingSubCatId, setEditingSubCatId] = useState<string | null>(null);
  const [editingSubCatName, setEditingSubCatName] = useState('');

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Filter and sort main categories
  const sortedCategories = useMemo(() => {
    let result = categories.filter(c => c.type === catTab && !c.isDeleted);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.subcategories?.some(s => !s.isDeleted && s.name.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, catTab, searchQuery]);

  // Auto-select active category
  useEffect(() => {
    if (!isOpen) return;

    if (!sortedCategories.some(c => c.id === activeCategoryId)) {
      if (sortedCategories.length > 0) {
        setActiveCategoryId(sortedCategories[0].id);
      } else {
        setActiveCategoryId('');
      }
    }
  }, [isOpen, catTab, sortedCategories, activeCategoryId]);

  const activeCategoryObj = useMemo(() => {
    return sortedCategories.find(c => c.id === activeCategoryId);
  }, [activeCategoryId, sortedCategories]);

  // Filter and sort subcategories
  const sortedSubcategories = useMemo(() => {
    if (!activeCategoryObj || !activeCategoryObj.subcategories) return [];

    let result = activeCategoryObj.subcategories.filter(s => !s.isDeleted);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const isMainMatch = activeCategoryObj.name.toLowerCase().includes(q);
      if (!isMainMatch) {
        result = result.filter(s => s.name.toLowerCase().includes(q));
      }
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [activeCategoryObj, searchQuery]);

  const handleCategoryClick = (catId: string) => {
    setActiveCategoryId(catId);
    setIsAddingSub(false);
    setNewSubName('');
    setEditingSubCatId(null);
  };

  const handleQuickAddSubCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newSubName.trim();
    if (!trimmed || !activeCategoryId) return;

    const exists = activeCategoryObj?.subcategories?.some(
      s => !s.isDeleted && s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      showToast(`Sub-kategori "${trimmed}" sudah ada!`, 'warning');
      return;
    }

    addSubCategory(activeCategoryId, trimmed);
    showToast(`Sub-kategori "${trimmed}" berhasil ditambahkan!`, 'success');
    setNewSubName('');
    setIsAddingSub(false);
  };

  const handleUpdateSubCategory = (catId: string, subId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const cat = categories.find(c => c.id === catId);
    if (!cat) return;

    const exists = cat.subcategories?.some(
      s => !s.isDeleted && s.name.toLowerCase() === trimmed.toLowerCase() && s.id !== subId
    );
    if (exists) {
      showToast(`Sub-kategori "${trimmed}" sudah ada!`, 'warning');
      return;
    }

    updateSubCategory(catId, subId, trimmed);
    setEditingSubCatId(null);
    showToast(`Sub-kategori "${trimmed}" berhasil diubah!`, 'success');
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm });
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manajemen Kategori"
        maxWidth="800px"
        headerActions={
          <button
            onClick={() => {
              setEditingCategoryForModal(null);
              setIsAddModalOpen(true);
            }}
            style={{
              background: 'var(--primary-gradient)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px var(--primary-glow)',
            }}
            title="Tambah Kategori Baru"
          >
            <MaterialIcon name="add" className="text-[18px]" />
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', width: '100vw', maxWidth: '100%', overflow: 'hidden' }}>

          {/* Type Tabs */}
          <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => {
                setCatTab('pengeluaran');
                setSearchQuery('');
              }}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '13px',
                background: catTab === 'pengeluaran' ? 'var(--bg-card)' : 'transparent',
                color: catTab === 'pengeluaran' ? 'var(--danger)' : 'var(--text-muted)',
                boxShadow: catTab === 'pengeluaran' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => {
                setCatTab('pendapatan');
                setSearchQuery('');
              }}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '13px',
                background: catTab === 'pendapatan' ? 'var(--bg-card)' : 'transparent',
                color: catTab === 'pendapatan' ? 'var(--success)' : 'var(--text-muted)',
                boxShadow: catTab === 'pendapatan' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Pendapatan
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', flexShrink: 0, background: 'var(--bg-main)' }}>
            <Input
              type="text"
              placeholder={`Cari kategori ${catTab} atau sub-kategori...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<MaterialIcon name="search" className="text-[16px]" />}
              rightElement={searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                >
                  <MaterialIcon name="close" className="text-[14px]" />
                </button>
              ) : undefined}
              style={{ marginBottom: 0 }}
            />
          </div>

          {/* Split View Content */}
          <div className="flex flex-row flex-1 overflow-hidden min-w-0">

            {/* Left Panel: Main Categories */}
            <div
              className="flex-1 min-w-0 border-r border-border-light flex flex-col bg-bg-main"
              style={{ overscrollBehavior: 'contain' }}
            >
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', minWidth: 0 }}>
                {sortedCategories.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>📁</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      {searchQuery ? 'Tidak ada kategori yang cocok.' : `Belum ada kategori ${catTab}.`}
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => {
                        setEditingCategoryForModal(null);
                        setIsAddModalOpen(true);
                      }}
                      style={{ fontSize: '12px', padding: '8px 16px', height: 'auto', margin: '0 auto' }}
                    >
                      Tambah Kategori
                    </Button>
                  </div>
                ) : (
                  sortedCategories.map(cat => {
                    const isActive = cat.id === activeCategoryId;
                    const isSystem = cat.id.startsWith('sys-cat-');
                    const subCount = cat.subcategories?.filter(s => !s.isDeleted).length || 0;

                    return (
                      <div
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.id)}
                        className="group"
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          background: isActive ? 'var(--bg-card)' : 'transparent',
                          borderLeft: `4px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          boxShadow: isActive ? '0 2px 10px rgba(0,0,0,0.02)' : 'none',
                          minWidth: 0,
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                          <div style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }}>
                            {isActive ? <MaterialIcon name="folder_open" className="text-[18px]" /> : <MaterialIcon name="folder" className="text-[18px]" />}
                          </div>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: isActive ? 700 : 500,
                              color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              minWidth: 0
                            }}
                            title={cat.name}
                          >
                            {cat.name}
                          </span>
                          {subCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-bold shrink-0">
                              {subCount}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          {!isSystem && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingCategoryForModal(cat);
                                  setIsAddModalOpen(true);
                                }}
                                className="opacity-70 hover:opacity-100 hover:text-primary transition-opacity p-1 cursor-pointer bg-transparent border-none text-on-surface-variant"
                                title="Edit Kategori"
                              >
                                <MaterialIcon name="edit" className="text-[14px]" />
                              </button>
                              <button
                                onClick={() => showConfirm('Hapus Kategori', `Apakah Anda yakin ingin menghapus kategori "${cat.name}"?`, () => deleteCategory(cat.id))}
                                className="opacity-70 hover:opacity-100 hover:text-error transition-opacity p-1 cursor-pointer bg-transparent border-none text-on-surface-variant"
                                title="Hapus Kategori"
                              >
                                <MaterialIcon name="delete" className="text-[14px]" />
                              </button>
                            </>
                          )}
                          <MaterialIcon name="chevron_right" className="text-base text-on-surface-variant" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Add Main Category at bottom of list */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    setEditingCategoryForModal(null);
                    setIsAddModalOpen(true);
                  }}
                  style={{ padding: '10px', fontSize: '13px', fontWeight: 700 }}
                >
                  <MaterialIcon name="add" className="text-base mr-1" />
                  Tambah Kategori {catTab === 'pengeluaran' ? 'Pengeluaran' : 'Pendapatan'}
                </Button>
              </div>
            </div>

            {/* Right Panel: Sub Categories */}
            <div
              className="flex-[1.2] min-w-0 flex flex-col bg-bg-card-solid"
              style={{ overscrollBehavior: 'contain' }}
            >
              {!activeCategoryObj ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                  Pilih kategori di sebelah kiri untuk melihat sub-kategori.
                </div>
              ) : (
                <>
                  {/* Category Header */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)', minWidth: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeCategoryObj.name}
                    </div>
                    <span className="text-[11px] text-on-surface-variant font-semibold">
                      {sortedSubcategories.length} Sub-kategori
                    </span>
                  </div>

                  {/* Subcategories List */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', minWidth: 0 }}>
                    {sortedSubcategories.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--primary-container)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                          <MaterialIcon name="category" className="text-[24px]" />
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: 4 }}>"{activeCategoryObj.name}"</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 20 }}>
                          Kategori ini belum memiliki sub-kategori.
                        </div>
                        {!activeCategoryObj.id.startsWith('sys-cat-') && !isAddingSub && (
                          <Button
                            variant="primary"
                            onClick={() => {
                              setIsAddingSub(true);
                              setTimeout(() => subInputRef.current?.focus(), 50);
                            }}
                            style={{ maxWidth: '220px' }}
                          >
                            + Tambah Sub-Kategori
                          </Button>
                        )}
                      </div>
                    ) : (
                      sortedSubcategories.map(sub => (
                        <div
                          key={sub.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 0',
                            borderBottom: '1px dashed var(--border-color)',
                            minWidth: 0
                          }}
                        >
                          {editingSubCatId === sub.id ? (
                            <div className="flex gap-2 flex-1 min-w-0 items-center">
                              <Input
                                value={editingSubCatName}
                                onChange={e => setEditingSubCatName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleUpdateSubCategory(activeCategoryObj.id, sub.id, editingSubCatName);
                                  else if (e.key === 'Escape') setEditingSubCatId(null);
                                }}
                                autoFocus
                                fullWidth
                                style={{ margin: 0 }}
                              />
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => handleUpdateSubCategory(activeCategoryObj.id, sub.id, editingSubCatName)}
                                  className="w-9 h-9 rounded-lg bg-primary text-white border-none cursor-pointer flex items-center justify-center hover:opacity-90 transition-opacity"
                                >
                                  <MaterialIcon name="check" className="text-base" />
                                </button>
                                <button
                                  onClick={() => setEditingSubCatId(null)}
                                  className="w-9 h-9 rounded-lg border border-border-light bg-transparent text-on-surface-variant cursor-pointer flex items-center justify-center hover:bg-surface-container transition-colors"
                                >
                                  <MaterialIcon name="close" className="text-base" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }}></div>
                                <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sub.name}>
                                  {sub.name}
                                </span>
                              </div>
                              {!activeCategoryObj.id.startsWith('sys-cat-') && (
                                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                  <button
                                    onClick={() => {
                                      setEditingSubCatId(sub.id);
                                      setEditingSubCatName(sub.name);
                                    }}
                                    className="p-1 text-on-surface-variant hover:text-primary border-none bg-transparent cursor-pointer transition-colors"
                                    title="Edit Sub-kategori"
                                  >
                                    <MaterialIcon name="edit" className="text-[14px]" />
                                  </button>
                                  <button
                                    onClick={() => showConfirm('Hapus Sub-kategori', `Hapus sub-kategori "${sub.name}"?`, () => deleteSubCategory(activeCategoryObj.id, sub.id))}
                                    className="p-1 text-on-surface-variant hover:text-error border-none bg-transparent cursor-pointer transition-colors"
                                    title="Hapus Sub-kategori"
                                  >
                                    <MaterialIcon name="delete" className="text-[14px]" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))
                    )}

                    {/* Inline Add Sub Category Input / Form */}
                    {!activeCategoryObj.id.startsWith('sys-cat-') && (
                      <div style={{ marginTop: '12px', paddingBottom: '12px' }}>
                        {isAddingSub ? (
                          <form onSubmit={handleQuickAddSubCategory} className="flex gap-2 items-center">
                            <Input
                              ref={subInputRef}
                              type="text"
                              value={newSubName}
                              onChange={e => setNewSubName(e.target.value)}
                              placeholder="Nama sub-kategori baru..."
                              fullWidth
                              style={{ margin: 0 }}
                            />
                            <Button type="submit" variant="primary" style={{ padding: '0 16px', height: '44px', flexShrink: 0 }}>
                              Tambah
                            </Button>
                            <Button type="button" variant="outline" onClick={() => { setIsAddingSub(false); setNewSubName(''); }} style={{ padding: '0 12px', height: '44px', flexShrink: 0 }}>
                              Batal
                            </Button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingSub(true);
                              setTimeout(() => subInputRef.current?.focus(), 50);
                            }}
                            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-outline-variant bg-transparent hover:bg-surface-container text-primary font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <MaterialIcon name="add" className="text-base" />
                            Tambah Sub-Kategori
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </Modal>

      {/* Full Category Add/Edit Modal */}
      <CategoryModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCategoryForModal(null);
        }}
        type={catTab}
        addCategory={addCategory}
        updateCategory={updateCategory}
        addSubCategory={addSubCategory}
        editingCategory={editingCategoryForModal}
        existingCategories={categories}
      />

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          confirmConfig.onConfirm();
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }}
        title={confirmConfig.title}
        message={confirmConfig.message}
      />
    </>
  );
};

export default CategoryManagerModal;
