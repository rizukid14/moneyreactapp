import React, { useState, useEffect, useMemo, useRef } from 'react';

import { type Category, useMoney } from '../../contexts/MoneyContext';
import { useToast } from '../common/Toast';
import CategoryModal from './CategoryModal';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import MaterialIcon from '../common/MaterialIcon';

interface CategorySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  type: 'pengeluaran' | 'pendapatan';
  initialCategoryId?: string;
  initialSubCategoryId?: string;
  onSelect: (categoryId: string, subCategoryId: string) => void;
}

const CategorySelectModal: React.FC<CategorySelectModalProps> = ({
  isOpen, onClose, categories, type, initialCategoryId, initialSubCategoryId, onSelect
}) => {
  const { addCategory, updateCategory, addSubCategory } = useMoney();
  const { showToast } = useToast();
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const subInputRef = useRef<HTMLInputElement>(null);

  // Filter and sort main categories alphabetically
  const sortedCategories = useMemo(() => {
    const activeIds = new Set(
      categories.filter(c => c.type === type && !c.isDeleted).map(c => c.id)
    );

    let result = [...categories].filter(c =>
      c.type === type &&
      (!c.isDeleted || (c.id === initialCategoryId && !activeIds.has(c.id)))
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.subcategories?.some(s => !s.isDeleted && s.name.toLowerCase().includes(query))
      );
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, type, searchQuery, initialCategoryId]);

  useEffect(() => {
    if (!isOpen) return;

    if (!sortedCategories.some(c => c.id === activeCategoryId)) {
      if (initialCategoryId && sortedCategories.some(c => c.id === initialCategoryId)) {
        setActiveCategoryId(initialCategoryId);
      } else if (sortedCategories.length > 0) {
        setActiveCategoryId(sortedCategories[0].id);
      }
    }
  }, [isOpen, initialCategoryId, sortedCategories, activeCategoryId]);

  const activeCategoryObj = useMemo(() => {
    return sortedCategories.find(c => c.id === activeCategoryId);
  }, [activeCategoryId, sortedCategories]);

  // Sort subcategories alphabetically
  const sortedSubcategories = useMemo(() => {
    if (!activeCategoryObj || !activeCategoryObj.subcategories) return [];

    const activeSubIds = new Set(
      activeCategoryObj.subcategories.filter(s => !s.isDeleted).map(s => s.id)
    );

    let result = [...activeCategoryObj.subcategories].filter(s =>
      !s.isDeleted || (s.id === initialSubCategoryId && !activeSubIds.has(s.id))
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const isMainCategoryMatch = activeCategoryObj.name.toLowerCase().includes(query);

      // If search query matches main category name, display all subcategories under it.
      // Otherwise, filter subcategories by name match.
      if (!isMainCategoryMatch) {
        result = result.filter(s => s.name.toLowerCase().includes(query));
      }
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [activeCategoryObj, searchQuery, initialSubCategoryId]);

  const handleCategoryClick = (catId: string) => {
    setActiveCategoryId(catId);
    setIsAddingSub(false);
    setNewSubName('');
  };

  const handleSubCategoryClick = (subId: string) => {
    onSelect(activeCategoryId, subId);
    onClose();
  };

  const handleConfirmMainCategoryOnly = () => {
    onSelect(activeCategoryId, '');
    onClose();
  };

  const handleQuickAddSubCategory = () => {
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
    showToast(`Sub-kategori "${trimmed}" berhasil ditambahkan ke "${activeCategoryObj?.name || 'Kategori'}"!`, 'success');
    setNewSubName('');
    setIsAddingSub(false);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Pilih Kategori"
        headerActions={
          <button
            onClick={() => setIsAddModalOpen(true)}
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', overflow: 'hidden' }}>

          {/* Search Bar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
            <Input
              type="text"
              placeholder="Cari kategori atau sub-kategori..."
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
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

            {/* Left Panel: Main Categories */}
            <div style={{
              flex: 1,
              borderRight: '1px solid var(--border-color)',
              overflowY: 'auto',
              background: 'var(--bg-main)',
              padding: '12px 0'
            }}>
              {sortedCategories.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>📁</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Belum ada kategori.
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setIsAddModalOpen(true)}
                    style={{ fontSize: '12px', padding: '8px 16px', height: 'auto', margin: '0 auto' }}
                  >
                    Tambah Kategori
                  </Button>
                </div>
              ) : (
                sortedCategories.map(cat => {
                  const isActive = cat.id === activeCategoryId;
                  const hasSub = cat.subcategories && cat.subcategories.filter(s => !s.isDeleted).length > 0;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      style={{
                        width: '100%', padding: '14px 16px', background: isActive ? 'var(--bg-card)' : 'transparent',
                        border: 'none', borderLeft: `4px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', transition: 'background 0.2s', textAlign: 'left',
                        boxShadow: isActive ? '0 2px 10px rgba(0,0,0,0.02)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <div style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }}>
                          {isActive ? <MaterialIcon name="folder_open" className="text-[18px]" /> : <MaterialIcon name="folder" className="text-[18px]" />}
                        </div>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          minWidth: 0
                        }}>
                          {cat.name}
                        </span>
                      </div>
                      {hasSub && (
                        <MaterialIcon name="chevron_right" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Right Panel: Sub Categories */}
            <div style={{
              flex: 1.2,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-card-solid)',
              overflow: 'hidden'
            }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
                {activeCategoryObj && (!activeCategoryObj.subcategories || activeCategoryObj.subcategories.filter(s => !s.isDeleted).length === 0) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--bg-income)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <MaterialIcon name="check" className="text-[24px]" />
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: 4 }}>"{activeCategoryObj.name}"</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 20 }}>Kategori ini belum memiliki sub-kategori.</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '240px' }}>
                      <Button
                        variant="primary"
                        onClick={handleConfirmMainCategoryOnly}
                        fullWidth
                      >
                        Pilih Kategori Ini
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddingSub(true);
                          setTimeout(() => subInputRef.current?.focus(), 50);
                        }}
                        fullWidth
                      >
                        + Tambah Sub-Kategori
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Custom Confirm Selection Main Category if it has subcategories but user wants main */}
                    {activeCategoryObj?.subcategories && activeCategoryObj.subcategories.filter(s => !s.isDeleted).length > 0 && (
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', flexShrink: 0, background: 'var(--bg-main)' }}>
                        <Button variant="outline" fullWidth onClick={handleConfirmMainCategoryOnly} style={{ padding: '10px', fontSize: '13px', fontWeight: 700 }}>
                          Pilih Kategori Utama: {activeCategoryObj.name}
                        </Button>
                      </div>
                    )}

                    <button
                      onClick={() => handleSubCategoryClick('')}
                      style={{
                        width: '100%', padding: '14px 20px', background: 'transparent',
                        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-color)',
                      }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: !initialSubCategoryId ? 700 : 500, color: !initialSubCategoryId ? 'var(--primary)' : 'var(--text-main)', fontStyle: 'italic' }}>
                        Tanpa Sub-Kategori
                      </span>
                      {!initialSubCategoryId && <MaterialIcon name="check" className="text-[16px]" />}
                    </button>

                    {sortedSubcategories.map(sub => {
                      const isSubActive = sub.id === initialSubCategoryId;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSubCategoryClick(sub.id)}
                          style={{
                            width: '100%', padding: '14px 20px', background: 'transparent',
                            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-color)',
                          }}
                        >
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: isSubActive ? 700 : 500, 
                            color: isSubActive ? 'var(--primary)' : 'var(--text-main)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1,
                            marginRight: '8px'
                          }}>
                            {sub.name}
                          </span>
                          {isSubActive && <span style={{ flexShrink: 0 }}><MaterialIcon name="check" className="text-[16px]" /></span>}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Quick Add Subcategory Bottom Bar */}
              {activeCategoryObj && (
                <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-main)', flexShrink: 0 }}>
                  {isAddingSub ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        ref={subInputRef}
                        type="text"
                        placeholder={`Sub-kategori untuk "${activeCategoryObj.name}"...`}
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickAddSubCategory();
                          }
                          if (e.key === 'Escape') {
                            setIsAddingSub(false);
                            setNewSubName('');
                          }
                        }}
                        style={{
                          flex: 1,
                          height: '36px',
                          boxSizing: 'border-box',
                          padding: '0 12px',
                          margin: 0,
                          marginBottom: 0,
                          borderRadius: '8px',
                          border: '1.5px solid var(--primary)',
                          background: 'var(--bg-card)',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          outline: 'none',
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleQuickAddSubCategory}
                        style={{
                          height: '36px',
                          padding: '0 14px',
                          borderRadius: '8px',
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxSizing: 'border-box',
                        }}
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSub(false);
                          setNewSubName('');
                        }}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxSizing: 'border-box',
                          padding: 0,
                        }}
                        title="Batal"
                      >
                        <MaterialIcon name="close" className="text-[18px]" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsAddingSub(true);
                        setTimeout(() => subInputRef.current?.focus(), 50);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1.5px dashed var(--border-color)',
                        background: 'transparent',
                        color: 'var(--primary)',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <MaterialIcon name="add" className="text-[16px]" />
                      + Tambah Sub-Kategori ke "{activeCategoryObj.name}"
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </Modal>
      {addCategory && (
        <CategoryModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          type={type}
          zIndex={4000}
          addCategory={addCategory}
          updateCategory={updateCategory}
          addSubCategory={addSubCategory}
          existingCategories={categories}
        />
      )}
    </>
  );
};

export default CategorySelectModal;
