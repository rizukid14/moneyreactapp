import React, { useState, useEffect } from 'react';
import { X, Save, Plus } from 'lucide-react';
import { useToast } from '../common/Toast';
import type { Category, SubCategory } from '../../contexts/MoneyContext';
import { generateId } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'pengeluaran' | 'pendapatan';
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory?: (id: string, name: string) => void;
  addSubCategory?: (categoryId: string, name: string) => void;
  editingCategory?: Category | null;
  existingCategories: Category[];
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen, onClose, type, addCategory, updateCategory, addSubCategory, editingCategory, existingCategories
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [newSubName, setNewSubName] = useState('');

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setSubcategories(editingCategory.subcategories || []);
    } else {
      setName('');
      setSubcategories([]);
    }
  }, [editingCategory, isOpen]);

  const handleAddSub = () => {
    if (!newSubName.trim()) return;
    setSubcategories([...subcategories, { id: generateId(), name: newSubName.trim() }]);
    setNewSubName('');
  };

  const handleRemoveSub = (id: string) => {
    setSubcategories(subcategories.filter(s => s.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Validation: Check if name already exists (case-insensitive, within the same type)
    const duplicate = existingCategories.find(c => 
      c.type === type &&
      c.name.toLowerCase() === name.trim().toLowerCase() && 
      (!editingCategory || c.id !== editingCategory.id)
    );
    
    if (duplicate) {
      if (!editingCategory && addSubCategory && subcategories.length > 0) {
        // Instead of error, let's add these subcategories to the existing category
        let addedCount = 0;
        subcategories.forEach(sub => {
          const exists = duplicate.subcategories?.some(s => s.name.toLowerCase() === sub.name.toLowerCase());
          if (!exists) {
            addSubCategory(duplicate.id, sub.name);
            addedCount++;
          }
        });
        
        if (addedCount > 0) {
          showToast(`${addedCount} sub-kategori ditambahkan ke "${duplicate.name}"`, 'success');
          onClose();
          return;
        }
      }
      showToast('Nama kategori sudah ada!', 'warning');
      return;
    }

    if (editingCategory && updateCategory) {
      // In this app, updateCategory only updates the name. 
      // Subcategories are handled separately in MoneyContext but we can simplify here if needed.
      // However, to keep it consistent with MoneyContext, we might need more tools.
      // For now, let's just implement the "Add" part well.
      updateCategory(editingCategory.id, name.trim());
    } else {
      addCategory({
        name: name.trim(),
        type,
        subcategories
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCategory ? 'Edit Kategori' : `Tambah Kategori ${type === 'pengeluaran' ? 'Pengeluaran' : 'Pendapatan'}`}
    >
      <form onSubmit={handleSave} style={{ padding: '0 4px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>Nama Kategori</label>
          <Input 
            type="text" 
            required 
            placeholder="Misal: Makanan, Transportasi..." 
            value={name} 
            onChange={e => setName(e.target.value)} 
            autoFocus
          />
        </div>

              {!editingCategory && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>Sub-Kategori (Opsional)</label>
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    marginBottom: '12px',
                    padding: '6px',
                    background: 'rgba(0,0,0,0.05)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <input 
                      type="text" 
                      placeholder="Tambah sub-kategori..." 
                      value={newSubName} 
                      onChange={e => setNewSubName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSub(); } }}
                      style={{ 
                        flex: 1, 
                        marginBottom: 0,
                        padding: '10px 14px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        fontSize: '14px'
                      }}
                    />
                    <button 
                      type="button" 
                      onClick={handleAddSub}
                      className="btn btn-primary"
                      style={{ 
                        width: '48px', 
                        height: '48px', 
                        padding: 0, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        borderRadius: '10px',
                        margin: 0
                      }}
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {subcategories.map(sub => (
                      <div key={sub.id} style={{ 
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', 
                        background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '20px', fontSize: '12px' 
                      }}>
                        <span>{sub.name}</span>
                        <button type="button" onClick={() => handleRemoveSub(sub.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

        <Button variant="primary" type="submit" fullWidth style={{ height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 800 }}>
          <Save size={20} />
          {editingCategory ? 'Simpan Perubahan' : 'Simpan Kategori'}
        </Button>
      </form>
    </Modal>
  );
};

export default CategoryModal;
