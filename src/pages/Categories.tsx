import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMoney } from '../contexts/MoneyContext';
import { PageWrapper } from '../components/ui/PageWrapper';
import { PageHeader } from '../components/ui/PageHeader';
import MaterialIcon from '../components/common/MaterialIcon';
import { useToast } from '../components/common/Toast';

const Categories: React.FC = () => {
  const navigate = useNavigate();
  const { categories, addCategory, updateCategory, deleteCategory, addSubCategory, updateSubCategory, deleteSubCategory } = useMoney();
  const { showToast } = useToast();

  // Category State
  const [catTab, setCatTab] = useState<'pengeluaran' | 'pendapatan'>('pengeluaran');
  const [newCatName, setNewCatName] = useState('');
  
  // Edit State
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingSubCatId, setEditingSubCatId] = useState<string | null>(null);
  const [editingSubCatName, setEditingSubCatName] = useState('');

  const handleAddCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const isDuplicate = categories.some(c =>
      c.type === catTab &&
      c.name.toLowerCase() === newCatName.trim().toLowerCase()
    );

    if (isDuplicate) {
      showToast('Nama kategori sudah ada!', 'warning');
      return;
    }

    addCategory({ name: newCatName.trim(), type: catTab });
    setNewCatName('');
  };

  const handleUpdateCat = (id: string, name: string) => {
    if (!name.trim()) return;

    const isDuplicate = categories.some(c =>
      c.type === catTab &&
      c.name.toLowerCase() === name.trim().toLowerCase() &&
      c.id !== id
    );

    if (isDuplicate) {
      showToast('Nama kategori sudah ada!', 'warning');
      return;
    }

    updateCategory(id, name.trim());
    setEditingCatId(null);
  };

  const handleAddSubCat = (catId: string, name: string) => {
    if (!name.trim()) return;
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;

    const isDuplicate = cat.subcategories?.some(s =>
      s.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (isDuplicate) {
      showToast('Nama sub-kategori sudah ada!', 'warning');
      return;
    }

    addSubCategory(catId, name.trim());
  };

  const handleUpdateSubCat = (catId: string, subId: string, name: string) => {
    if (!name.trim()) return;
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;

    const isDuplicate = cat.subcategories?.some(s =>
      s.name.toLowerCase() === name.trim().toLowerCase() &&
      s.id !== subId
    );

    if (isDuplicate) {
      showToast('Nama sub-kategori sudah ada!', 'warning');
      return;
    }

    updateSubCategory(catId, subId, name.trim());
    setEditingSubCatId(null);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Manajemen Kategori"
        action={
          <button onClick={() => navigate('/settings')} className="text-primary hover:bg-primary/10 p-2 rounded-full flex items-center justify-center transition-colors">
            <MaterialIcon name="close" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto space-y-6 pb-24">
        {/* Tabs */}
        <div className="flex bg-surface-container-low rounded-lg p-1 border border-outline-variant mt-4">
          <button
            type="button"
            onClick={() => setCatTab('pengeluaran')}
            className={`flex-1 px-3 py-2.5 rounded-md border-none font-bold text-sm cursor-pointer transition-all ${catTab === 'pengeluaran' ? 'bg-bg-card text-error shadow-sm' : 'bg-transparent text-on-surface-variant hover:text-on-surface'}`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => setCatTab('pendapatan')}
            className={`flex-1 px-3 py-2.5 rounded-md border-none font-bold text-sm cursor-pointer transition-all ${catTab === 'pendapatan' ? 'bg-bg-card text-primary shadow-sm' : 'bg-transparent text-on-surface-variant hover:text-on-surface'}`}
          >
            Pendapatan
          </button>
        </div>

        {/* Categories List */}
        <div className="space-y-4">
          {categories.filter(c => !c.isDeleted && c.type === catTab).map(c => (
            <div key={c.id} className="border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between bg-surface-container-low p-4">
                <div className="flex items-center gap-3">
                  <MaterialIcon name={c.type === 'pengeluaran' ? 'restaurant' : 'payments'} className="text-primary text-xl" />
                  {editingCatId === c.id ? (
                    <input
                      type="text"
                      value={editingCatName}
                      onChange={e => setEditingCatName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleUpdateCat(c.id, editingCatName);
                        else if (e.key === 'Escape') setEditingCatId(null);
                      }}
                      className="px-2 py-1 text-sm border border-primary rounded bg-bg-card text-on-surface font-bold focus:outline-none"
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="font-label-md font-bold text-on-surface">{c.name}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {editingCatId === c.id ? (
                    <button onClick={() => handleUpdateCat(c.id, editingCatName)} className="p-1.5 bg-primary/10 text-primary rounded border-none cursor-pointer">
                      <MaterialIcon name="check" className="text-sm" />
                    </button>
                  ) : (
                    <button onClick={() => { setEditingCatId(c.id); setEditingCatName(c.name); }} className="p-1.5 text-on-surface-variant hover:text-primary bg-transparent rounded border-none cursor-pointer">
                      <MaterialIcon name="edit" className="text-sm" />
                    </button>
                  )}
                  <button onClick={() => showConfirm('Hapus Kategori', `Yakin ingin menghapus kategori "${c.name}"?`, () => deleteCategory(c.id))} className="p-1.5 bg-transparent text-error hover:bg-error/10 rounded border-none cursor-pointer">
                    <MaterialIcon name="delete" className="text-sm" />
                  </button>
                </div>
              </div>

              <div className="p-4 bg-bg-card space-y-3">
                {c.subcategories?.filter(s => !s.isDeleted).map(sub => (
                  <div key={sub.id} className="flex justify-between items-center px-2 py-1 hover:bg-surface-container-low rounded-lg transition-colors group">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-outline-variant"></div>
                      {editingSubCatId === sub.id ? (
                        <input
                          type="text"
                          value={editingSubCatName}
                          onChange={e => setEditingSubCatName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleUpdateSubCat(c.id, sub.id, editingSubCatName);
                            else if (e.key === 'Escape') setEditingSubCatId(null);
                          }}
                          className="px-2 py-0.5 text-xs border border-primary rounded bg-bg-card text-on-surface font-bold focus:outline-none"
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-sm font-semibold text-on-surface-variant group-hover:text-on-surface transition-colors">{sub.name}</span>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      {editingSubCatId === sub.id ? (
                        <button onClick={() => handleUpdateSubCat(c.id, sub.id, editingSubCatName)} className="p-1 text-primary hover:bg-primary/10 rounded border-none cursor-pointer">
                          <MaterialIcon name="check" className="text-xs" />
                        </button>
                      ) : (
                        <button onClick={() => { setEditingSubCatId(sub.id); setEditingSubCatName(sub.name); }} className="p-1 text-on-surface-variant hover:text-primary rounded border-none cursor-pointer">
                          <MaterialIcon name="edit" className="text-xs" />
                        </button>
                      )}
                      <button onClick={() => showConfirm('Hapus Sub-kategori', `Yakin ingin menghapus sub-kategori "${sub.name}"?`, () => deleteSubCategory(c.id, sub.id))} className="p-1 text-on-surface-variant hover:text-error rounded border-none cursor-pointer">
                        <MaterialIcon name="delete" className="text-xs" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="pt-2 mt-2 border-t border-outline-variant border-dashed">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Subkategori baru..."
                      className="flex-1 px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          handleAddSubCat(c.id, e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={e => {
                        const input = e.currentTarget.previousSibling as HTMLInputElement;
                        if (input && input.value) {
                          handleAddSubCat(c.id, input.value);
                          input.value = '';
                        }
                      }}
                      className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      Tambah
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleAddCat} className="flex gap-2 p-1.5 bg-surface-container-low rounded-xl border border-outline-variant mt-6">
          <input
            type="text"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            placeholder="Buat kategori baru..."
            className="flex-1 px-4 py-3 bg-bg-card border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary focus:outline-none"
            required
          />
          <button type="submit" className="px-6 bg-primary text-white rounded-lg flex items-center justify-center border-none cursor-pointer hover:opacity-90 transition-opacity">
            <MaterialIcon name="add" className="text-xl" />
          </button>
        </form>
      </div>
    </PageWrapper>
  );
};

export default Categories;
