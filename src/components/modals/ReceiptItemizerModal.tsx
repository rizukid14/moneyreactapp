import React, { useState, useEffect } from 'react';
import type { Category, ItemizedDetail } from '../../contexts/MoneyContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import MaterialIcon from '../common/MaterialIcon';
import CurrencyInput from '../common/CurrencyInput';
import CategorySelectModal from './CategorySelectModal';
import { formatCurrencyAmount } from '../../lib/currency';
import { generateId } from '../../lib/utils';

interface ReceiptItemizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems: { name: string; amount: number; categoryId?: string; subCategoryId?: string }[];
  categories: Category[];
  merchantName?: string;
  receiptDate?: string;
  assetId?: string;
  onSaveAsSplit: (items: ItemizedDetail[], totalAmount: number) => void;
  onSaveAsMultiple: (items: ItemizedDetail[]) => void;
}

export const ReceiptItemizerModal: React.FC<ReceiptItemizerModalProps> = ({
  isOpen,
  onClose,
  initialItems = [],
  categories,
  merchantName = 'Struk Belanja',
  onSaveAsSplit,
  onSaveAsMultiple,
}) => {
  const expenseCategories = categories.filter(c => c.type === 'pengeluaran' && !c.isDeleted);

  const [items, setItems] = useState<ItemizedDetail[]>(() =>
    initialItems.map(i => ({
      id: generateId(),
      name: i.name,
      amount: i.amount,
      categoryId: i.categoryId || expenseCategories[0]?.id,
      subCategoryId: i.subCategoryId,
    }))
  );

  const [activePickerItemId, setActivePickerItemId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialItems && initialItems.length > 0) {
        setItems(initialItems.map(i => ({
          id: generateId(),
          name: i.name,
          amount: i.amount,
          categoryId: i.categoryId || expenseCategories[0]?.id,
          subCategoryId: i.subCategoryId,
        })));
      } else {
        setItems([]);
      }
    }
  }, [isOpen, initialItems]);

  const handleUpdateItem = (id: string, field: keyof ItemizedDetail, val: any) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: val } : item)));
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: generateId(),
        name: 'Item Baru',
        amount: 10000,
        categoryId: expenseCategories[0]?.id,
      },
    ]);
  };

  const getCategoryDisplayLabel = (catId?: string, subId?: string) => {
    if (!catId) return 'Pilih Kategori';
    const cat = categories.find(c => c.id === catId);
    if (!cat) return 'Pilih Kategori';
    if (subId && cat.subcategories) {
      const sub = cat.subcategories.find(s => s.id === subId && !s.isDeleted);
      if (sub) return `${cat.name} > ${sub.name}`;
    }
    return cat.name;
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`🧾 Split Struk Auto-Itemizer (${merchantName})`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs">
            <span className="font-medium text-on-surface">Total Struk Terkalkulasi:</span>
            <span className="font-extrabold text-primary text-sm">{formatCurrencyAmount(totalAmount, 'IDR')}</span>
          </div>

          {/* Itemized Table */}
          <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
            {items.map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-surface border border-outline-variant/40 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => handleUpdateItem(item.id, 'name', e.target.value)}
                    className="flex-1 font-semibold bg-transparent border-b border-outline-variant/50 focus:border-primary outline-none py-1 text-on-surface"
                    placeholder="Nama barang/item"
                  />
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-error/70 hover:text-error p-1"
                  >
                    <MaterialIcon name="delete" className="text-base" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-outline uppercase block mb-1">Harga</label>
                    <CurrencyInput
                      value={item.amount.toLocaleString('id-ID')}
                      onChange={val => handleUpdateItem(item.id, 'amount', Number(val.replace(/[^\d]/g, '')) || 0)}
                      placeholder="Harga item"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-outline uppercase block mb-1">Kategori & Subkategori</label>
                    <button
                      type="button"
                      onClick={() => setActivePickerItemId(item.id)}
                      className="w-full p-2 rounded-lg border border-outline-variant/50 bg-card-solid text-on-surface text-xs outline-none text-left flex items-center justify-between hover:border-primary transition-all cursor-pointer min-h-[34px]"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <MaterialIcon name="folder" className="text-primary text-[14px] shrink-0" />
                        <span className="truncate font-semibold text-xs">
                          {getCategoryDisplayLabel(item.categoryId, item.subCategoryId)}
                        </span>
                      </div>
                      <MaterialIcon name="expand_more" className="text-outline text-[14px] shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddItem}
            className="w-full py-2 rounded-xl border border-dashed border-outline-variant hover:border-primary text-outline hover:text-primary font-semibold text-xs flex items-center justify-center gap-1 transition-all"
          >
            <MaterialIcon name="add" className="text-base" /> Tambah Baris Item
          </button>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-outline-variant/30">
            <Button
              variant="secondary"
              onClick={() => {
                onSaveAsMultiple(items);
                onClose();
              }}
              style={{ borderRadius: '12px', fontSize: '12px' }}
            >
              Simpan {items.length} Transaksi Terpisah
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onSaveAsSplit(items, totalAmount);
                onClose();
              }}
              style={{ borderRadius: '12px', fontSize: '12px' }}
            >
              Simpan 1 Transaksi Itemized (Total {formatCurrencyAmount(totalAmount, 'IDR')})
            </Button>
          </div>
        </div>
      </Modal>

      {activePickerItemId && (
        <CategorySelectModal
          isOpen={!!activePickerItemId}
          onClose={() => setActivePickerItemId(null)}
          categories={categories}
          type="pengeluaran"
          initialCategoryId={items.find(i => i.id === activePickerItemId)?.categoryId}
          initialSubCategoryId={items.find(i => i.id === activePickerItemId)?.subCategoryId}
          onSelect={(catId, subId) => {
            if (activePickerItemId) {
              setItems(prev => prev.map(item => item.id === activePickerItemId ? { ...item, categoryId: catId, subCategoryId: subId } : item));
            }
          }}
        />
      )}
    </>
  );
};

