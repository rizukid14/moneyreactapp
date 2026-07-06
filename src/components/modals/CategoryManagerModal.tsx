import React, { useState, useMemo } from 'react';
import { useMoney } from '../../contexts/MoneyContext';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import MaterialIcon from '../common/MaterialIcon';
import { useToast } from '../common/Toast';
import ConfirmDialog from '../common/ConfirmDialog';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ isOpen, onClose }) => {
  const { categories, addCategory, updateCategory, deleteCategory, addSubCategory, updateSubCategory, deleteSubCategory } = useMoney();
  const { showToast } = useToast();

  const [catTab, setCatTab] = useState<'pengeluaran' | 'pendapatan'>('pengeluaran');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  
  const [newCatName, setNewCatName] = useState('');
  const [newSubCatName, setNewSubCatName] = useState('');

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingSubCatId, setEditingSubCatId] = useState<string | null>(null);
  const [editingSubCatName, setEditingSubCatName] = useState('');

  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedCategories = useMemo(() => {
    return categories
      .filter(c => c.type === catTab && !c.isDeleted)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, catTab]);

  const activeCategoryObj = useMemo(() => {
    return sortedCategories.find(c => c.id === activeCategoryId);
  }, [activeCategoryId, sortedCategories]);

  // Auto-select first category if none selected when tab changes or opens
  React.useEffect(() => {
    if (isOpen && (!activeCategoryId || !sortedCategories.some(c => c.id === activeCategoryId))) {
      if (sortedCategories.length > 0) {
        setActiveCategoryId(sortedCategories[0].id);
      } else {
        setActiveCategoryId(null);
      }
    }
  }, [isOpen, catTab, sortedCategories, activeCategoryId]);

  const handleAddCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    if (!newCatName.trim()) return;
    setIsSubmitting(true);
    
    const isDuplicate = categories.some(c => c.type === catTab && c.name.toLowerCase() === newCatName.trim().toLowerCase());
    if (isDuplicate) { showToast('Nama kategori sudah ada!', 'warning'); setIsSubmitting(false); return; }
    addCategory({ name: newCatName.trim(), type: catTab });
    setNewCatName('');
    setTimeout(() => setIsSubmitting(false), 1000);
  };

  const handleUpdateCat = (id: string, name: string) => {
    if (isSubmitting) return;
    if (!name.trim()) return;
    setIsSubmitting(true);
    
    const isDuplicate = categories.some(c => c.type === catTab && c.name.toLowerCase() === name.trim().toLowerCase() && c.id !== id);
    if (isDuplicate) { showToast('Nama kategori sudah ada!', 'warning'); setIsSubmitting(false); return; }
    updateCategory(id, name.trim());
    setEditingCatId(null);
    setTimeout(() => setIsSubmitting(false), 1000);
  };

  const handleAddSubCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    if (!newSubCatName.trim() || !activeCategoryId) return;
    setIsSubmitting(true);
    
    const cat = categories.find(c => c.id === activeCategoryId);
    if (!cat) { setIsSubmitting(false); return; }
    const isDuplicate = cat.subcategories?.some(s => s.name.toLowerCase() === newSubCatName.trim().toLowerCase());
    if (isDuplicate) { showToast('Nama sub-kategori sudah ada!', 'warning'); setIsSubmitting(false); return; }
    addSubCategory(activeCategoryId, newSubCatName.trim());
    setNewSubCatName('');
    setTimeout(() => setIsSubmitting(false), 1000);
  };

  const handleUpdateSubCat = (catId: string, subId: string, name: string) => {
    if (isSubmitting) return;
    if (!name.trim()) return;
    setIsSubmitting(true);
    
    const cat = categories.find(c => c.id === catId);
    if (!cat) { setIsSubmitting(false); return; }
    const isDuplicate = cat.subcategories?.some(s => s.name.toLowerCase() === name.trim().toLowerCase() && s.id !== subId);
    if (isDuplicate) { showToast('Nama sub-kategori sudah ada!', 'warning'); setIsSubmitting(false); return; }
    updateSubCategory(catId, subId, name.trim());
    setEditingSubCatId(null);
    setTimeout(() => setIsSubmitting(false), 1000);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm });
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Manajemen Kategori" maxWidth="800px">
        <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', width: '100vw', maxWidth: '100%', overflow: 'hidden' }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setCatTab('pengeluaran')}
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
              onClick={() => setCatTab('pendapatan')}
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

          {/* Split View Content */}
          <div className="flex flex-row flex-1 overflow-hidden min-w-0">

            {/* Left Panel: Main Categories */}
            <div className="flex-1 min-w-0 border-r border-border-light flex flex-col bg-bg-main" style={{ overscrollBehavior: 'contain' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', minWidth: 0 }}>
                {sortedCategories.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Belum ada kategori.
                  </div>
                ) : (
                  sortedCategories.map(cat => {
                    const isActive = cat.id === activeCategoryId;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => setActiveCategoryId(cat.id)}
                        style={{
                          padding: '12px 16px', background: isActive ? 'var(--bg-card)' : 'transparent',
                          borderLeft: `4px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          cursor: 'pointer', transition: 'background 0.2s',
                          boxShadow: isActive ? '0 2px 10px rgba(0,0,0,0.02)' : 'none',
                          minWidth: 0
                        }}
                      >
                        {editingCatId === cat.id ? (
                          <div className="flex flex-col 2xl:flex-row gap-2 flex-1 min-w-0 items-stretch 2xl:items-center">
                            <Input
                              value={editingCatName}
                              onChange={e => setEditingCatName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleUpdateCat(cat.id, editingCatName);
                                else if (e.key === 'Escape') setEditingCatId(null);
                              }}
                              onClick={e => e.stopPropagation()}
                              autoFocus
                              fullWidth
                              style={{ margin: 0 }}
                            />
                            <div className="flex gap-1 shrink-0 justify-end" onClick={e => e.stopPropagation()}>
                              <button disabled={isSubmitting} onClick={() => handleUpdateCat(cat.id, editingCatName)} className="flex-1 2xl:flex-none flex justify-center items-center" style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '10px' }}>
                                <MaterialIcon name="check" className="text-[18px]" />
                              </button>
                              <button onClick={() => setEditingCatId(null)} className="flex-1 2xl:flex-none flex justify-center items-center" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '6px', cursor: 'pointer', padding: '10px' }}>
                                <MaterialIcon name="close" className="text-[18px]" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span style={{ fontSize: '14px', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--text-main)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }} title={cat.name}>
                              {cat.name}
                            </span>
                            {!cat.id.startsWith('sys-cat-') && (
                              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                <button onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                  <MaterialIcon name="edit" className="text-[14px]" />
                                </button>
                                <button onClick={() => showConfirm('Hapus Kategori', `Hapus "${cat.name}"?`, () => deleteCategory(cat.id))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                                  <MaterialIcon name="delete" className="text-[14px]" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
                
                {/* Form moved inside the scrollable area */}
                <form onSubmit={handleAddCat} style={{ padding: '12px', marginTop: '8px' }}>
                  <div className="flex flex-col 2xl:flex-row gap-2 items-stretch 2xl:items-start">
                    <Input
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      placeholder="Kategori baru..."
                      fullWidth
                      required
                    />
                    <Button disabled={isSubmitting} type="submit" variant="primary" className="h-12 w-full 2xl:w-auto px-4 m-0 shrink-0 flex justify-center items-center">
                      <MaterialIcon name="add" className="text-[20px]" />
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Panel: Sub Categories */}
            <div className="flex-[1.2] min-w-0 flex flex-col bg-bg-card-solid" style={{ overscrollBehavior: 'contain' }}>
              {!activeCategoryObj ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                  Pilih kategori utama di sebelah kiri.
                </div>
              ) : (
                <>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)', minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeCategoryObj.name}
                    </div>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', minWidth: 0 }}>
                    {(!activeCategoryObj.subcategories || activeCategoryObj.subcategories.filter(s => !s.isDeleted).length === 0) ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        Tidak ada sub-kategori.
                      </div>
                    ) : (
                      activeCategoryObj.subcategories.filter(s => !s.isDeleted).sort((a,b) => a.name.localeCompare(b.name)).map(sub => (
                        <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed var(--border-color)', minWidth: 0 }}>
                          {editingSubCatId === sub.id ? (
                            <div className="flex flex-col 2xl:flex-row gap-2 flex-1 min-w-0 items-stretch 2xl:items-center">
                              <Input
                                value={editingSubCatName}
                                onChange={e => setEditingSubCatName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleUpdateSubCat(activeCategoryObj.id, sub.id, editingSubCatName);
                                  else if (e.key === 'Escape') setEditingSubCatId(null);
                                }}
                                onClick={e => e.stopPropagation()}
                                autoFocus
                                fullWidth
                                style={{ margin: 0 }}
                              />
                              <div className="flex gap-1 shrink-0 justify-end" onClick={e => e.stopPropagation()}>
                                <button disabled={isSubmitting} onClick={() => handleUpdateSubCat(activeCategoryObj.id, sub.id, editingSubCatName)} className="flex-1 2xl:flex-none flex justify-center items-center" style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '10px' }}>
                                  <MaterialIcon name="check" className="text-[18px]" />
                                </button>
                                <button onClick={() => setEditingSubCatId(null)} className="flex-1 2xl:flex-none flex justify-center items-center" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '6px', cursor: 'pointer', padding: '10px' }}>
                                  <MaterialIcon name="close" className="text-[18px]" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0 }}></div>
                                <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sub.name}>{sub.name}</span>
                              </div>
                              {!activeCategoryObj.id.startsWith('sys-cat-') && (
                                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                  <button onClick={() => { setEditingSubCatId(sub.id); setEditingSubCatName(sub.name); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                    <MaterialIcon name="edit" className="text-[14px]" />
                                  </button>
                                  <button onClick={() => showConfirm('Hapus Sub-kategori', `Hapus "${sub.name}"?`, () => deleteSubCategory(activeCategoryObj.id, sub.id))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                                    <MaterialIcon name="delete" className="text-[14px]" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))
                    )}
                    
                    {/* Form moved inside the scrollable area */}
                    {!activeCategoryObj.id.startsWith('sys-cat-') && (
                      <form onSubmit={handleAddSubCat} style={{ padding: '12px', marginTop: '8px' }}>
                        <div className="flex flex-col 2xl:flex-row gap-2 items-stretch 2xl:items-start">
                          <Input
                            value={newSubCatName}
                            onChange={e => setNewSubCatName(e.target.value)}
                            placeholder="Sub-kategori..."
                            fullWidth
                            required
                          />
                          <Button disabled={isSubmitting} type="submit" variant="primary" className="h-12 w-full 2xl:w-auto px-4 m-0 shrink-0 flex justify-center items-center">
                            <MaterialIcon name="add" className="text-[20px]" />
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </Modal>

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
