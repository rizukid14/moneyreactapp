import React, { useMemo } from 'react';
import { useMoney } from '../../contexts/MoneyContext';
import { Modal } from '../ui/Modal';
import MaterialIcon from '../common/MaterialIcon';
import { formatCurrency } from '../../lib/utils';
import { isPrincipalTx } from '../../lib/utils';
import { isFirebaseConfigured } from '../../lib/firebase';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const {
    assets, transactions, currencySymbol, isPrivateMode,
    budgets, categories, startOfMonthDay,
    debts, subscriptions, pendingSyncCount,
  } = useMoney();

  const fmt = (v: number) => isPrivateMode ? '••••' : formatCurrency(v, currencySymbol);

  const notifications = useMemo(() => {
    const notifs: {
      id: string;
      title: string;
      message: string;
      icon: string;
      color: 'primary' | 'error' | 'success' | 'warning' | 'info';
      time: string;
      priority: number; // lower = higher priority
      dateObj: Date;
    }[] = [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // ── 1. Overbudget Notifications ──────────────────────────────────────
    const periodStart = new Date(currentYear, currentMonth - (startOfMonthDay > 1 ? 1 : 0), startOfMonthDay);
    const periodEnd = new Date(currentYear, currentMonth + (startOfMonthDay > 1 ? 0 : 1), startOfMonthDay);

    const spendingMap: Record<string, number> = { total: 0 };
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d >= periodStart && d < periodEnd && tx.type === 'pengeluaran') {
        spendingMap.total += tx.amount;
        const cat = categories.find(c => c.id === tx.categoryId && c.type === 'pengeluaran' && !c.isDeleted) ||
                    categories.find(c => c.id === tx.categoryId && c.type === 'pengeluaran');
        if (cat) spendingMap[cat.id] = (spendingMap[cat.id] || 0) + tx.amount;
      }
    });

    const currentMonthBudgets = budgets.filter(b => b.month === currentMonth && b.year === currentYear);

    // Global budget overbudget
    const globalBudget = currentMonthBudgets.find(b => b.categoryId === null);
    if (globalBudget && spendingMap.total > globalBudget.limit) {
      const over = spendingMap.total - globalBudget.limit;
      notifs.push({
        id: 'overbudget-global',
        title: 'Anggaran Bulanan Terlampaui',
        message: `Total pengeluaranmu telah melebihi anggaran bulanan sebesar ${fmt(over)}. Segera kurangi pengeluaran agar tidak membengkak.`,
        icon: 'warning',
        color: 'error',
        time: 'Bulan ini',
        priority: 1,
        dateObj: now,
      });
    }

    // Category budget overbudget
    const categoryBudgets = currentMonthBudgets.filter(b => b.categoryId !== null);
    const overbudgetCategories: string[] = [];
    categoryBudgets.forEach(b => {
      const spent = spendingMap[b.categoryId!] || 0;
      if (spent > b.limit) {
        const cat = categories.find(c => c.id === b.categoryId);
        if (cat) overbudgetCategories.push(cat.name);
      }
    });

    if (overbudgetCategories.length > 0) {
      notifs.push({
        id: 'overbudget-categories',
        title: `${overbudgetCategories.length} Kategori Melebihi Anggaran`,
        message: `Kategori ${overbudgetCategories.slice(0, 3).join(', ')}${overbudgetCategories.length > 3 ? ` dan ${overbudgetCategories.length - 3} lainnya` : ''} sudah melewati batas anggaran.`,
        icon: 'account_balance_wallet',
        color: 'error',
        time: 'Bulan ini',
        priority: 2,
        dateObj: now,
      });
    }

    // Near budget warning (75-100%)
    const warningCategories: string[] = [];
    categoryBudgets.forEach(b => {
      const spent = spendingMap[b.categoryId!] || 0;
      const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
      if (pct >= 75 && pct <= 100) {
        const cat = categories.find(c => c.id === b.categoryId);
        if (cat) warningCategories.push(cat.name);
      }
    });

    if (warningCategories.length > 0) {
      notifs.push({
        id: 'budget-warning',
        title: 'Anggaran Hampir Habis',
        message: `Kategori ${warningCategories.slice(0, 3).join(', ')}${warningCategories.length > 3 ? ` dan ${warningCategories.length - 3} lainnya` : ''} sudah memakai lebih dari 75% anggaran.`,
        icon: 'trending_up',
        color: 'warning',
        time: 'Bulan ini',
        priority: 3,
        dateObj: now,
      });
    }

    // ── 2. Subscription Billing Notifications ────────────────────────────
    const activeSubs = subscriptions.filter(s => s.isActive);
    activeSubs.forEach(sub => {
      if (!sub.nextBillingDate) return;
      const billingDate = new Date(sub.nextBillingDate);
      const diffDays = Math.ceil((billingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // Overdue / expired
        notifs.push({
          id: `sub-overdue-${sub.id}`,
          title: `Langganan ${sub.name} Jatuh Tempo`,
          message: `Tagihan ${fmt(sub.amount)} untuk ${sub.name} sudah lewat ${Math.abs(diffDays)} hari sejak ${billingDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}. Pastikan pembayaran sudah dilakukan.`,
          icon: 'credit_card_off',
          color: 'error',
          time: `${Math.abs(diffDays)} hari lalu`,
          priority: 1,
          dateObj: billingDate,
        });
      } else if (diffDays <= 3) {
        // Due very soon (within 3 days)
        notifs.push({
          id: `sub-soon-${sub.id}`,
          title: `${sub.name} Akan Ditagih`,
          message: `Langganan ${sub.name} sebesar ${fmt(sub.amount)} akan ditagih ${diffDays === 0 ? 'hari ini' : diffDays === 1 ? 'besok' : `dalam ${diffDays} hari`}.`,
          icon: 'credit_card',
          color: 'warning',
          time: diffDays === 0 ? 'Hari ini' : diffDays === 1 ? 'Besok' : `${diffDays} hari lagi`,
          priority: 2,
          dateObj: billingDate,
        });
      } else if (diffDays <= 7) {
        // Due within a week
        notifs.push({
          id: `sub-upcoming-${sub.id}`,
          title: `Tagihan ${sub.name} Mendekat`,
          message: `Tagihan ${fmt(sub.amount)} untuk ${sub.name} jatuh tempo dalam ${diffDays} hari (${billingDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}).`,
          icon: 'schedule',
          color: 'info',
          time: `${diffDays} hari lagi`,
          priority: 4,
          dateObj: billingDate,
        });
      }
    });

    // ── 3. Debt Overdue & Due Soon Notifications ─────────────────────────
    const activeDebts = debts.filter(d => !d.isPaid);

    activeDebts.forEach(d => {
      if (!d.dueDate) return;
      const dueDate = new Date(d.dueDate);
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isHutang = d.type === 'hutang';
      const label = isHutang ? 'Hutang' : 'Piutang';

      // Calculate remaining
      const history = transactions.filter(t => t.relatedId === d.id);
      const paidAmt = history.reduce((sum, tx) => {
        return isPrincipalTx(tx.note, tx.categoryId, categories) ? sum : sum + Number(tx.amount || 0);
      }, 0);
      const remaining = Math.max(0, Number(d.totalAmount || 0) - paidAmt);

      if (diffDays < 0 && remaining > 0) {
        notifs.push({
          id: `debt-overdue-${d.id}`,
          title: `${label} ke ${d.contact} Jatuh Tempo`,
          message: `${label} sebesar ${fmt(remaining)} sudah lewat ${Math.abs(diffDays)} hari dari tanggal jatuh tempo. ${isHutang ? 'Segera lakukan pembayaran.' : 'Segera ingatkan kontak terkait.'}`,
          icon: isHutang ? 'trending_down' : 'trending_up',
          color: 'error',
          time: `Telat ${Math.abs(diffDays)} hari`,
          priority: 1,
          dateObj: dueDate,
        });
      } else if (diffDays >= 0 && diffDays <= 7 && remaining > 0) {
        notifs.push({
          id: `debt-due-soon-${d.id}`,
          title: `${label} ${d.contact} Segera Jatuh Tempo`,
          message: `${label} sebesar ${fmt(remaining)} akan jatuh tempo ${diffDays === 0 ? 'hari ini' : `dalam ${diffDays} hari`} (${dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}).`,
          icon: isHutang ? 'trending_down' : 'trending_up',
          color: 'warning',
          time: diffDays === 0 ? 'Hari ini' : `${diffDays} hari lagi`,
          priority: 2,
          dateObj: dueDate,
        });
      }
    });

    // ── 4. Debt Offset Potential Notifications ───────────────────────────
    const contactMap: Record<string, { h: number; p: number }> = {};
    activeDebts.forEach(d => {
      const history = transactions.filter(t => t.relatedId === d.id);
      const paidAmt = history.reduce((sum, tx) => {
        return isPrincipalTx(tx.note, tx.categoryId, categories) ? sum : sum + Number(tx.amount || 0);
      }, 0);
      const remaining = Math.max(0, Number(d.totalAmount || 0) - paidAmt);
      if (remaining <= 0) return;

      if (!contactMap[d.contact]) contactMap[d.contact] = { h: 0, p: 0 };
      if (d.type === 'hutang') contactMap[d.contact].h += remaining;
      else contactMap[d.contact].p += remaining;
    });

    const offsetContacts = Object.entries(contactMap)
      .filter(([_, vals]) => vals.h > 0 && vals.p > 0);

    if (offsetContacts.length > 0) {
      const totalOffset = offsetContacts.reduce((sum, [_, v]) => sum + Math.min(v.h, v.p), 0);
      notifs.push({
        id: 'debt-offset',
        title: 'Potong Silang Tersedia',
        message: `Ada ${offsetContacts.length} kontak (${offsetContacts.map(([name]) => name).join(', ')}) yang memiliki hutang & piutang aktif. Potensi offset ${fmt(totalOffset)}.`,
        icon: 'sync_alt',
        color: 'success',
        time: 'Sekarang',
        priority: 5,
        dateObj: now,
      });
    }

    // ── 5. Cloud Sync Pending Notifications ──────────────────────────────
    if (isFirebaseConfigured && pendingSyncCount > 0) {
      notifs.push({
        id: 'cloud-sync',
        title: 'Data Belum Dicadangkan',
        message: `${pendingSyncCount} perubahan data tersimpan lokal dan belum disinkronkan ke cloud. Buka Pengaturan untuk melakukan sinkronisasi.`,
        icon: 'cloud_upload',
        color: 'info',
        time: 'Sekarang',
        priority: 6,
        dateObj: now,
      });
    }

    // ── 6. Large Expense Detected ────────────────────────────────────────
    const recentLargeExpense = transactions.find(tx => tx.type === 'pengeluaran' && tx.amount >= 500000);
    if (recentLargeExpense) {
      const categoryName = categories.find(c => c.id === recentLargeExpense.categoryId)?.name || recentLargeExpense.categoryId;
      notifs.push({
        id: 'large-expense',
        title: 'Pengeluaran Besar Terdeteksi',
        message: `Kamu mencatat pengeluaran sebesar ${fmt(recentLargeExpense.amount)} untuk kategori ${categoryName}. Jangan lupa tetap berhemat!`,
        icon: 'warning',
        color: 'error',
        time: 'Hari ini',
        priority: 7,
        dateObj: new Date(recentLargeExpense.date),
      });
    }

    // ── 7. Cash Reminder ─────────────────────────────────────────────────
    const cashAssets = assets.filter(a => a.type === 'Cash' && !a.isDeleted);
    if (cashAssets.length > 0) {
      notifs.push({
        id: 'cash-reminder',
        title: 'Catat Pengeluaran Tunai',
        message: 'Sudahkah kamu mencatat semua pengeluaran tunaimu hari ini? Pastikan saldo dompetmu cocok dengan catatan.',
        icon: 'account_balance_wallet',
        color: 'success',
        time: 'Pengingat',
        priority: 8,
        dateObj: now,
      });
    }

    // ── 8. AI Insight (static) ───────────────────────────────────────────
    if (transactions.length >= 10) {
      notifs.push({
        id: 'ai-insight',
        title: 'Insight AI Tersedia',
        message: 'AI telah menganalisis pengeluaran mingguanmu. Lihat insight terbarumu di halaman Home.',
        icon: 'auto_awesome',
        color: 'primary',
        time: 'Baru saja',
        priority: 9,
        dateObj: now,
      });
    }

    // Sort by chronological time (newest/upcoming first)
    notifs.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

    return notifs.slice(0, 15);
  }, [transactions, currencySymbol, assets, isPrivateMode, budgets, categories, startOfMonthDay, debts, subscriptions, pendingSyncCount]);

  const colorMap: Record<string, { bg: string; text: string }> = {
    primary: { bg: 'bg-primary-container', text: 'text-primary-color' },
    error: { bg: 'bg-error-container/30', text: 'text-error' },
    success: { bg: 'bg-success/10', text: 'text-success' },
    warning: { bg: 'bg-warning/10', text: 'text-warning' },
    info: { bg: 'bg-primary/10', text: 'text-primary' },
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Notifikasi" maxWidth="450px">
      <div className="flex flex-col gap-3 pb-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">
            <MaterialIcon name="notifications_off" className="text-5xl opacity-30 mb-3" />
            <p className="font-label-md text-label-md">Belum ada notifikasi baru.</p>
          </div>
        ) : (
          notifications.map(n => {
            const colors = colorMap[n.color] || colorMap.primary;
            return (
              <div key={n.id} className="bg-surface-container p-4 rounded-2xl border border-outline-variant/30 flex gap-4 items-start cursor-pointer hover:bg-surface-container-high transition-colors group">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform ${colors.bg} ${colors.text}`}>
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
            );
          })
        )}
      </div>
    </Modal>
  );
};

export default NotificationModal;
