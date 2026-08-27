import React, { useMemo } from 'react';
import { useMoney } from '../../contexts/MoneyContext';
import { Modal } from '../ui/Modal';
import MaterialIcon from '../common/MaterialIcon';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const {
    notifications,
    markNotifAsRead,
    deleteNotif,
    clearAllNotifs,
    pendingSyncCount,
  } = useMoney();

  // Create a combined list of persistent notifications + real-time system notifications (like cloud sync)
  const displayNotifs = useMemo(() => {
    let combined = [...notifications];

    // Real-time: Cloud Sync
    if (pendingSyncCount > 0) {
      combined.unshift({
        id: 'sys-cloud-sync',
        title: 'Data Belum Dicadangkan',
        message: `${pendingSyncCount} perubahan data tersimpan lokal dan belum disinkronkan ke cloud. Buka Pengaturan untuk sinkronisasi.`,
        icon: 'cloud_upload',
        color: 'info',
        createdAt: new Date().toISOString(),
        isRead: false,
      });
    }

    // Sort strictly descending by createdAt (newest notifications first)
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return combined;
  }, [notifications, pendingSyncCount]);

  const unreadCount = displayNotifs.filter(n => !n.isRead).length;

  const handleClose = () => {
    // Tandai semua dibaca ketika ditutup
    displayNotifs.forEach(n => {
      if (!n.isRead && !n.id.startsWith('sys-')) {
        markNotifAsRead(n.id);
      }
    });
    onClose();
  };

  const getRelativeTime = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    
    // Normalize to calendar day comparison
    const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((nowDate.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
      if (diffHours <= 0) return 'Hari ini';
      return `${diffHours} jam lalu`;
    }
    if (diffDays === 1) return 'Kemarin';
    if (diffDays > 1 && diffDays <= 7) return `${diffDays} hari lalu`;
    
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Notifikasi" maxWidth="max-w-md">
      <div className="flex flex-col h-[70vh]">
        {/* Header Actions */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {unreadCount > 0 ? `${unreadCount} Belum dibaca` : 'Semua telah dibaca'}
            </span>
          </div>
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifs}
              className="text-sm font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1 transition-colors"
            >
              <MaterialIcon name="delete_sweep" className="text-lg" />
              Bersihkan
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {displayNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-70 mt-10">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <MaterialIcon name="notifications_off" className="text-4xl text-gray-400" />
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Belum ada notifikasi</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Kamu akan melihat pemberitahuan penting di sini.</p>
              </div>
            </div>
          ) : (
            displayNotifs.map((notif) => {
              const colors = {
                primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
                error: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
                success: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
                warning: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
                info: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
              };

              const borders = {
                primary: 'border-primary-100 dark:border-primary-900/30',
                error: 'border-red-100 dark:border-red-900/30',
                success: 'border-green-100 dark:border-green-900/30',
                warning: 'border-amber-100 dark:border-amber-900/30',
                info: 'border-blue-100 dark:border-blue-900/30',
              };

              return (
                <div 
                  key={notif.id} 
                  className={`relative p-4 rounded-2xl border transition-all duration-200 group ${notif.isRead ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/50 opacity-80' : `bg-white dark:bg-gray-800 shadow-sm ${borders[notif.color as keyof typeof borders]} shadow-${notif.color}-500/5`}`}
                >
                  {!notif.isRead && (
                    <div className={`absolute top-4 left-0 w-1 h-8 rounded-r bg-${notif.color}-500`} />
                  )}
                  
                  <div className="flex gap-4">
                    <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${colors[notif.color as keyof typeof colors]}`}>
                      <MaterialIcon name={notif.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`font-semibold truncate pr-4 ${notif.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 shrink-0 whitespace-nowrap bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded-full">
                          {getRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className={`text-sm leading-relaxed ${notif.isRead ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                        {notif.message}
                      </p>
                    </div>
                  </div>

                  {!notif.id.startsWith('sys-') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotif(notif.id);
                      }}
                      className="absolute bottom-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Hapus notifikasi"
                    >
                      <MaterialIcon name="close" className="text-lg" />
                    </button>
                  )}
                </div>
            );
          })
        )}
      </div>
      </div>
    </Modal>
  );
};

export default NotificationModal;
