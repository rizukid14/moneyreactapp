import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronRight, Folder, FolderOpen, Check, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Category, useMoney } from '../../contexts/MoneyContext';
import CategoryModal from './CategoryModal';

interface CategorySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  type: 'pengeluaran' | 'pendapatan';
  initialCategory?: string;
  initialSubCategory?: string;
  onSelect: (category: string, subCategory: string) => void;
}

const CategorySelectModal: React.FC<CategorySelectModalProps> = ({
  isOpen, onClose, categories, type, initialCategory, initialSubCategory, onSelect
}) => {
  const { addCategory, updateCategory, addSubCategory } = useMoney();
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filter and sort main categories alphabetically
  const sortedCategories = useMemo(() => {
    return [...categories]
      .filter(c => c.type === type)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, type]);

  useEffect(() => {
    if (isOpen) {
      if (initialCategory && sortedCategories.some(c => c.name === initialCategory)) {
        setActiveCategory(initialCategory);
      } else if (sortedCategories.length > 0) {
        setActiveCategory(sortedCategories[0].name);
      }
    }
  }, [isOpen, initialCategory, sortedCategories]);

  const activeCategoryObj = useMemo(() => {
    return sortedCategories.find(c => c.name === activeCategory);
  }, [activeCategory, sortedCategories]);

  // Sort subcategories alphabetically
  const sortedSubcategories = useMemo(() => {
    if (!activeCategoryObj || !activeCategoryObj.subcategories) return [];
    return [...activeCategoryObj.subcategories].sort((a, b) => a.name.localeCompare(b.name));
  }, [activeCategoryObj]);

  const handleCategoryClick = (catName: string) => {
    setActiveCategory(catName);
  };

  const handleSubCategoryClick = (subName: string) => {
    onSelect(activeCategory, subName);
    onClose();
  };

  const handleConfirmMainCategoryOnly = () => {
    onSelect(activeCategory, '');
    onClose();
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
            transition={{ duration: 0.15 }}
            style={{ zIndex: 3000 }} // Ensure it's above TransactionModal (2000 normally for overlay but TransactionModal is below)
          >
            <motion.div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400, mass: 0.5 }}
              style={{ padding: 0, height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              {/* Header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0
              }}>
                <h2 className="subtitle" style={{ margin: 0, fontSize: '16px' }}>Pilih Kategori</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                    <Plus size={18} />
                  </button>
                  <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>
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
                      <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn btn-primary"
                        style={{ fontSize: '12px', padding: '8px 16px', height: 'auto', margin: '0 auto' }}
                      >
                        Tambah Kategori
                      </button>
                    </div>
                  ) : (
                    sortedCategories.map(cat => {
                      const isActive = cat.name === activeCategory;
                      const hasSub = cat.subcategories && cat.subcategories.length > 0;

                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleCategoryClick(cat.name)}
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
                              {isActive ? <FolderOpen size={18} /> : <Folder size={18} />}
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
                            <ChevronRight size={16} color={isActive ? 'var(--primary)' : 'var(--border-color)'} />
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
                        <Check size={24} />
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: 4 }}>"{activeCategoryObj.name}"</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 20 }}>Kategori ini tidak memiliki sub-kategori.</div>
                      <button
                        onClick={handleConfirmMainCategoryOnly}
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                      >
                        Pilih Kategori Ini
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSubCategoryClick('')}
                        style={{
                          width: '100%', padding: '14px 20px', background: 'transparent',
                          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-color)',
                        }}
                      >
                        <span style={{ fontSize: '14px', fontWeight: !initialSubCategory ? 700 : 500, color: !initialSubCategory ? 'var(--primary)' : 'var(--text-main)', fontStyle: 'italic' }}>
                          Tanpa Sub-Kategori
                        </span>
                        {!initialSubCategory && <Check size={16} color="var(--primary)" />}
                      </button>

                      {sortedSubcategories.map(sub => {
                        const isSubActive = sub.name === initialSubCategory;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => handleSubCategoryClick(sub.name)}
                            style={{
                              width: '100%', padding: '14px 20px', background: 'transparent',
                              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-color)',
                            }}
                          >
                            <span style={{ fontSize: '14px', fontWeight: isSubActive ? 700 : 500, color: isSubActive ? 'var(--primary)' : 'var(--text-main)' }}>
                              {sub.name}
                            </span>
                            {isSubActive && <Check size={16} color="var(--primary)" />}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
