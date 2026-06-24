import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MaterialIcon from '../common/MaterialIcon';

interface AddActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat?: () => void;
}

const AddActionMenu: React.FC<AddActionMenuProps> = ({ isOpen, onClose, onOpenChat }) => {
  const navigate = useNavigate();

  const handleAction = (action: () => void) => {
    onClose();
    setTimeout(action, 100); // slight delay to allow menu animation to start closing
  };

  const addTx = (type: string) => {
    navigate(`/?action=add-tx&type=${type}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000]"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[2010] pointer-events-none flex lg:left-64 items-end lg:items-center justify-center pb-24 lg:pb-0 px-4">
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
              className="pointer-events-auto w-full lg:w-96 bg-surface-container-lowest rounded-3xl p-6 shadow-2xl border border-border-light flex flex-col gap-4"
            >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Tambah Transaksi Baru</h3>
              <button onClick={onClose} className="p-2 -mr-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors border-none bg-transparent cursor-pointer">
                <MaterialIcon name="close" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleAction(() => addTx('pengeluaran'))}
                className="flex flex-col items-center justify-center gap-3 p-4 bg-surface-container-low hover:bg-error-container hover:text-on-error-container rounded-2xl transition-colors border border-outline-variant cursor-pointer group"
              >
                <div className="w-12 h-12 bg-error text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MaterialIcon name="arrow_upward" />
                </div>
                <span className="font-label-md text-label-md">Pengeluaran</span>
              </button>

              <button 
                onClick={() => handleAction(() => addTx('pendapatan'))}
                className="flex flex-col items-center justify-center gap-3 p-4 bg-surface-container-low hover:bg-tertiary-container hover:text-on-tertiary-container rounded-2xl transition-colors border border-outline-variant cursor-pointer group"
              >
                <div className="w-12 h-12 bg-tertiary text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MaterialIcon name="arrow_downward" />
                </div>
                <span className="font-label-md text-label-md">Pendapatan</span>
              </button>

              <button 
                onClick={() => handleAction(() => addTx('transfer'))}
                className="flex flex-col items-center justify-center gap-3 p-4 bg-surface-container-low hover:bg-secondary-container hover:text-on-secondary-container rounded-2xl transition-colors border border-outline-variant cursor-pointer group col-span-2"
              >
                <div className="w-12 h-12 bg-secondary text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MaterialIcon name="sync_alt" />
                </div>
                <span className="font-label-md text-label-md">Transfer Antar Dompet</span>
              </button>
            </div>

            <div className="h-px bg-border-light my-2"></div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleAction(() => navigate('/scan'))}
                className="flex flex-col items-center justify-center gap-3 p-4 bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary rounded-2xl transition-colors border border-primary/20 cursor-pointer group"
              >
                <MaterialIcon name="document_scanner" className="text-3xl group-hover:scale-110 transition-transform" />
                <span className="font-label-sm text-label-sm font-bold text-center">Scan Struk AI</span>
              </button>

              <button 
                onClick={() => handleAction(() => navigate('/bulk-input'))}
                className="flex flex-col items-center justify-center gap-3 p-4 bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary rounded-2xl transition-colors border border-primary/20 cursor-pointer group"
              >
                <MaterialIcon name="text_snippet" className="text-3xl group-hover:scale-110 transition-transform" />
                <span className="font-label-sm text-label-sm font-bold text-center">Bulk Text AI</span>
              </button>
            </div>

            {onOpenChat && (
              <button 
                onClick={() => handleAction(onOpenChat)}
                className="flex items-center justify-center gap-3 p-4 bg-surface-container-low text-primary hover:bg-surface-container rounded-2xl transition-colors border border-outline-variant cursor-pointer group w-full"
              >
                <MaterialIcon name="smart_toy" className="text-2xl group-hover:scale-110 transition-transform" />
                <span className="font-label-md text-label-md font-bold">MoneyBot AI Assistant</span>
              </button>
            )}
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddActionMenu;
