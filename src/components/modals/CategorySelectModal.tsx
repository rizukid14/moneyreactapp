import React, { useState, useEffect, useMemo } from 'react';

import { type Category, useMoney } from '../../contexts/MoneyContext';
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
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    if (isOpen) {
      if (initialCategoryId && sortedCategories.some(c => c.id === initialCategoryId)) {
        setActiveCategoryId(initialCategoryId);
      } else if (sortedCategories.length > 0) {
        setActiveCategoryId(sortedCategories[0].id);
      }
    }
  }, [isOpen, initialCategoryId, sortedCategories]);

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
      result = result.filter(s => s.name.toLowerCase().includes(query));
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [activeCategoryObj, searchQuery, initialSubCategoryId]);

  const handleCategoryClick = (catId: string) => {
    setActiveCategoryId(catId);
  };

  const handleSubCategoryClick = (subId: string) => {
    onSelect(activeCategoryId, subId);
    onClose();
  };

  const handleConfirmMainCategoryOnly = () => {
    onSelect(activeCategoryId, '');
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Pilih Kategori">
        <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', overflow: 'hidden' }}>
          {/* Header Action: Add Category (Title and Close are handled by Modal) */}
          <div style={{ position: 'absolute', top: '16px', right: '56px', zIndex: 10 }}>
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                background: 'var(--primary-gradient)', color: 'white', border: 'none',
                borderRadius: '10px', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 10px var(--primary-glow)'
              }}
              title="Tambah Kategori Baru"
            >
              <MaterialIcon name="add" className="text-[18px]" />
            </button>
          </div>

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
                      const hasSub = cat.subcategories && cat.subcategories.length > 0;

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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}>
                              {isActive ? <MaterialIcon name="folder_open" className="text-[18px]" /> : <MaterialIcon name="folder" className="text-[18px]" />}
                            </div>
                            <span style={{
                              fontSize: '14px',
                              fontWeight: isActive ? 700 : 500,
                              color: isActive ? 'var(--text-main)' : 'var(--text-muted)'
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
                  overflowY: 'auto',
                  background: 'var(--bg-card-solid)',
                  padding: '12px 0'
                }}>
                  {activeCategoryObj && (!activeCategoryObj.subcategories || activeCategoryObj.subcategories.length === 0) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--bg-income)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <MaterialIcon name="check" className="text-[24px]" />
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: 4 }}>"{activeCategoryObj.name}"</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 20 }}>Kategori ini tidak memiliki sub-kategori.</div>
                      <Button
                        variant="primary"
                        onClick={handleConfirmMainCategoryOnly}
                        fullWidth
                      >
                        Pilih Kategori Ini
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Custom Confirm Selection Main Category if it has subcategories but user wants main */}
                      {activeCategoryObj?.subcategories && activeCategoryObj.subcategories.length > 0 && (
                        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', flexShrink: 0, background: 'var(--bg-main)' }}>
                          <Button variant="outline" fullWidth onClick={handleConfirmMainCategoryOnly} style={{ padding: '12px', fontSize: '13px', fontWeight: 700 }}>
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
                            <span style={{ fontSize: '14px', fontWeight: isSubActive ? 700 : 500, color: isSubActive ? 'var(--primary)' : 'var(--text-main)' }}>
                              {sub.name}
                            </span>
                            {isSubActive && <MaterialIcon name="check" className="text-[16px]" />}
                          </button>
                        );
                      })}
                    </>
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
