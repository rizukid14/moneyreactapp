import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MaterialIcon from '../common/MaterialIcon';

export interface ExcelColumnMapping {
  dateCol: string;
  typeCol: string;
  categoryCol: string;
  amountCol: string;
  noteCol: string;
  assetCol: string;
}

interface ExcelMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  onConfirm: (mapping: ExcelColumnMapping) => void;
}

const ExcelMappingModal: React.FC<ExcelMappingModalProps> = ({ isOpen, onClose, headers, onConfirm }) => {
  const [mapping, setMapping] = useState<ExcelColumnMapping>({
    dateCol: '',
    typeCol: '',
    categoryCol: '',
    amountCol: '',
    noteCol: '',
    assetCol: '',
  });

  if (!isOpen) return null;

  const fields = [
    { key: 'dateCol' as keyof ExcelColumnMapping, label: 'Tanggal', required: true },
    { key: 'typeCol' as keyof ExcelColumnMapping, label: 'Tipe (Pengeluaran/Pemasukan)', required: true },
    { key: 'categoryCol' as keyof ExcelColumnMapping, label: 'Kategori', required: false },
    { key: 'amountCol' as keyof ExcelColumnMapping, label: 'Nominal', required: true },
    { key: 'noteCol' as keyof ExcelColumnMapping, label: 'Catatan / Deskripsi', required: false },
    { key: 'assetCol' as keyof ExcelColumnMapping, label: 'Aset / Rekening', required: false },
  ];

  const handleConfirm = () => {
    // Validate required fields
    if (!mapping.dateCol || !mapping.typeCol || !mapping.amountCol) {
      alert("Harap isi semua field wajib (Tanggal, Tipe, Nominal)!");
      return;
    }
    onConfirm(mapping);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-surface-container-low w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-5 border-b border-border-light flex justify-between items-center bg-surface-container-lowest">
            <h2 className="font-headline-sm font-bold text-on-surface">Pemetaan Kolom Excel</h2>
            <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant">
              <MaterialIcon name="close" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Kami menemukan <span className="font-bold">{headers.length} kolom</span> di baris pertama file Anda. 
              Silakan pasangkan kolom tersebut dengan field yang dibutuhkan oleh aplikasi.
            </p>

            <div className="space-y-4">
              {fields.map(f => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface flex items-center gap-1">
                    {f.label} {f.required && <span className="text-error">*</span>}
                  </label>
                  <select
                    className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-lowest font-body-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    value={mapping[f.key]}
                    onChange={e => setMapping({ ...mapping, [f.key]: e.target.value })}
                  >
                    <option value="">-- Pilih Kolom --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            
            <div className="bg-warning-container text-on-warning-container p-4 rounded-xl text-xs leading-relaxed mt-6">
              <MaterialIcon name="info" className="text-sm align-middle mr-1" />
              Bila file Anda tidak memiliki kolom <strong>Tipe, Kategori, atau Aset</strong>, Anda tidak perlu memetakannya di sini. Aplikasi akan mengatur nilai bawaan (Default) ke "Pengeluaran" / "Lain-lain" yang bisa Anda perbaiki nanti di layar Draft.
            </div>
          </div>

          <div className="p-5 border-t border-border-light bg-surface-container-lowest flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-full font-label-md font-bold text-on-surface-variant hover:bg-surface-container transition-colors">Batal</button>
            <button 
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-full font-label-md font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity"
            >
              Lanjutkan ke Draft
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ExcelMappingModal;
