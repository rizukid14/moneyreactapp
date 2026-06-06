import React, { useMemo } from 'react';
import { useMoney } from '../../contexts/MoneyContext';
import { Modal } from '../ui/Modal';
import MaterialIcon from '../common/MaterialIcon';
import { formatCurrency } from '../../lib/utils';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const { assets, transactions, currencySymbol, isPrivateMode } = useMoney();

  const notifications = useMemo(() => {
    const notifs = [];

    notifs.push({
      id: 'n1',
      title: 'Insight AI Tersedia',
      message: 'AI telah menganalisis pengeluaran mingguanmu. Lihat insight terbarumu di halaman Home.',
      icon: 'auto_awesome',
      color: 'primary',
      time: 'Baru saja'
    });

    const recentLargeExpense = transactions.find(tx => tx.type === 'pengeluaran' && tx.amount >= 500000);
    if (recentLargeExpense) {
      notifs.push({
        id: 'n2',
        title: 'Pengeluaran Besar Terdeteksi',
        message: `Kamu mencatat pengeluaran sebesar ${isPrivateMode ? '••••' : formatCurrency(recentLargeExpense.amount, currencySymbol)} untuk kategori ${recentLargeExpense.category}. Jangan lupa tetap berhemat!`,
        icon: 'warning',
        color: 'error',
        time: 'Hari ini'
      });
    }

    const cashAssets = assets.filter(a => a.type === 'Cash');
    if (cashAssets.length > 0) {
      notifs.push({
        id: 'n3',
        title: 'Catat Pengeluaran Tunai',
        message: 'Sudahkah kamu mencatat semua pengeluaran tunaimu hari ini? Pastikan saldo dompetmu cocok dengan catatan.',
        icon: 'account_balance_wallet',
        color: 'success',
        time: 'Kemarin'
      });
    }

    notifs.push({
      id: 'n4',
      title: 'Selamat Datang di MoneyApp',
      message: 'Aplikasi pencatatan keuangan dengan desain Nordic Bento. Mulai pantau arus kasmu!',
      icon: 'celebration',
      color: 'primary',
      time: '2 hari lalu'
    });

    return notifs.slice(0, 10);
  }, [transactions, currencySymbol, assets, isPrivateMode]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Notifikasi" maxWidth="450px">
      <div className="flex flex-col gap-3 pb-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">
            <MaterialIcon name="notifications_off" className="text-5xl opacity-30 mb-3" />
            <p className="font-label-md text-label-md">Belum ada notifikasi baru.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className="bg-surface-container p-4 rounded-2xl border border-outline-variant/30 flex gap-4 items-start cursor-pointer hover:bg-surface-container-high transition-colors group">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform
                ${n.color === 'primary' ? 'bg-primary-container text-primary-color' : 
                  n.color === 'error' ? 'bg-error-container/30 text-error' : 
                  n.color === 'success' ? 'bg-[#10b981]/10 text-[#10b981]' : 
                  'bg-surface-container-highest text-on-surface-variant'}`}
              >
                <MaterialIcon name={n.icon} className="text-lg" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-sm text-on-surface line-clamp-1">{n.title}</h4>
                  <span className="text-[10px] font-bold text-on-surface-variant whitespace-nowrap ml-2 bg-surface-container-highest px-2 py-0.5 rounded-full">{n.time}</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2 mt-1">{n.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};

export default NotificationModal;
