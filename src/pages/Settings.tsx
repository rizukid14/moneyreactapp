import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';
import { useMoney } from '../contexts/MoneyContext';
import { usePremium } from '../contexts/PremiumContext';
import { PremiumGate } from '../components/common/PremiumGate';
import { setupPushNotifications } from '../lib/notifications';
import { validateFileSecure } from '../lib/fileValidation';
import { downloadSampleExcel, parseExcelFile, extractExcelHeaders, type ImportResult } from '../lib/excelImport';
import { exportAllDataToExcel } from '../lib/excelExport';
import ExcelMappingModal from '../components/modals/ExcelMappingModal';
import { BudgetManagement } from '../components/BudgetManagement';
import RewardsStoreModal from '../components/modals/RewardsStoreModal';
import { GoalManagement } from '../components/GoalManagement';
import { FamilyManagement } from '../components/FamilyManagement';
import CategoryManagerModal from '../components/modals/CategoryManagerModal';

import ConfirmDialog from '../components/common/ConfirmDialog';
import { ALL_CARD_DEFS, getGachaTier, calcCardValue } from '../components/AssetSummaryCarousel';

import { useToast } from '../components/common/Toast';
import { changelogData, changelogTypeMeta } from '../data/changelog';
import AssetSelectModal from '../components/modals/AssetSelectModal';
import CategorySelectModal from '../components/modals/CategorySelectModal';
import SharedBillsManagerModal from '../components/modals/SharedBillsManagerModal';
import ContactModal from '../components/modals/ContactModal';
import ContactManagerModal from '../components/modals/ContactManagerModal';
import ReauthenticateModal from '../components/modals/ReauthenticateModal';
import { auth } from '../lib/firebase';
import { verifyBeforeUpdateEmail } from 'firebase/auth';
import { useOnboarding } from '../contexts/OnboardingContext';
import { PageWrapper } from '../components/ui/PageWrapper';
import { PageHeader } from '../components/ui/PageHeader';
import MaterialIcon from '../components/common/MaterialIcon';
import OnboardingTutorial from '../components/OnboardingTutorial';
import CurrencyInput from '../components/common/CurrencyInput';

// ─── CarouselCardSettings ─────────────────────────────────────────────────────
const GACHA_EMOJI: Record<string, string> = {
  'Bronze': '🩶', 'Silver': '🥈', 'Gold': '🥇', 'Emerald': '💚',
  'Sapphire': '💎', 'Ruby': '♦️', 'Amethyst': '🔮', 'Diamond': '💠', 'Sultan 👑': '👑',
};

interface CarouselCardSettingsProps {
  activeCards: string[];
  onChange: (cards: string[]) => void;
}

const CarouselCardSettings: React.FC<CarouselCardSettingsProps> = ({ activeCards, onChange }) => {
  const { assets, getAssetBalance, currencySymbol } = useMoney();
  const balances = React.useMemo(() => {
    const b: Record<string, number> = {};
    assets.filter(a => !a.isDeleted).forEach(a => { b[a.id] = getAssetBalance(a.id); });
    return b;
  }, [assets, getAssetBalance]);

  // Drag state
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const toggleCard = (id: string) => {
    if (activeCards.includes(id)) {
      if (activeCards.length <= 1) return; // always keep at least 1
      onChange(activeCards.filter(c => c !== id));
    } else {
      onChange([...activeCards, id]);
    }
  };

  const handleDragStart = (i: number) => { dragIdx.current = i; };
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setDragOverIdx(i);
  };
  const handleDrop = (i: number) => {
    if (dragIdx.current === null || dragIdx.current === i) { setDragOverIdx(null); return; }
    const next = [...activeCards];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    onChange(next);
    dragIdx.current = null;
    setDragOverIdx(null);
  };
  const handleDragEnd = () => { dragIdx.current = null; setDragOverIdx(null); };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <MaterialIcon name="dashboard" className="text-[18px]" />
        <span style={{ fontWeight: 700, fontSize: 14 }}>Rekap Aset di Halaman Aset</span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
        Pilih kartu yang tampil di carousel atas. Seret <MaterialIcon name="drag_indicator" /> untuk mengurutkan.
      </p>

      {/* Active cards – draggable order list */}
      {activeCards.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Urutan Tampil
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeCards.map((id, i) => {
              const def = ALL_CARD_DEFS.find(d => d.id === id);
              if (!def) return null;
              const val = calcCardValue(id as any, assets, balances);
              const tier = getGachaTier(id === 'liabilities' ? -val : val);
              const isDragOver = dragOverIdx === i;
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={e => handleDragOver(e, i)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 14,
                    background: isDragOver ? 'var(--primary-glow)' : 'var(--bg-main)',
                    border: isDragOver ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)',
                    cursor: 'grab',
                    transition: 'all 0.15s',
                    userSelect: 'none',
                  }}
                >
                  <MaterialIcon name="drag_indicator" />
                  {/* Tier color dot */}
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: tier.gradient, flexShrink: 0,
                    boxShadow: `0 0 6px ${tier.shadowColor}`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>{def.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {GACHA_EMOJI[tier.rank]} {tier.rank} • {currencySymbol}{val.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleCard(id)}
                    title="Hapus dari carousel"
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4, opacity: activeCards.length <= 1 ? 0.3 : 0.7, flexShrink: 0 }}
                    disabled={activeCards.length <= 1}
                  >
                    <MaterialIcon name="close" className="text-[14px]" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All available cards – toggle on/off */}
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        Tambah Kartu
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ALL_CARD_DEFS.filter(d => !activeCards.includes(d.id)).map(def => {
          const val = calcCardValue(def.id as any, assets, balances);
          const tier = getGachaTier(def.negate ? -val : val);
          return (
            <button
              key={def.id}
              onClick={() => toggleCard(def.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 14,
                background: 'var(--bg-card)', border: '1.5px dashed var(--border-color)',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-glow)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
            >
              <MaterialIcon name="add" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>{def.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {GACHA_EMOJI[tier.rank]} {tier.rank} • {def.description}
                </div>
              </div>
            </button>
          );
        })}
        {ALL_CARD_DEFS.every(d => activeCards.includes(d.id)) && (
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '12px 0', fontStyle: 'italic' }}>
            Semua kartu sudah aktif ✓
          </div>
        )}
      </div>
    </div>
  );
};

// ─── StatsViewSettings ────────────────────────────────────────────────────────
export const ALL_STATS_VIEWS = [
  { id: 'all', label: 'Ringkasan Umum', description: 'Analisis semua aset' },
  { id: 'cash_bank', label: 'Kas & Bank', description: 'Analisis tunai & rekening' },
  { id: 'investment', label: 'Investasi & Tabungan', description: 'Analisis aset produktif' },
  { id: 'goals', label: 'Tabungan', description: 'Progres target impian', pro: true },
  { id: 'subs', label: 'Langganan', description: 'Biaya rutin bulanan', pro: true },
  { id: 'health', label: 'Kesehatan Finansial', description: 'Skor kesehatan finansial', pro: true },
  { id: 'forecast', label: 'Proyeksi Kas', description: 'Prediksi saldo 90 hari ke depan', pro: true },
  { id: 'detailed_analysis', label: 'Analisis Detail', description: 'Heatmap & Grafik Kategori', pro: true },
];

interface StatsViewSettingsProps {
  activeViews: string[];
  onChange: (views: string[]) => void;
  defaultView: string;
  onDefaultChange: (id: string) => void;
}

const StatsViewSettings: React.FC<StatsViewSettingsProps> = ({ activeViews, onChange, defaultView, onDefaultChange }) => {
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const toggleView = (id: string) => {
    if (activeViews.includes(id)) {
      if (activeViews.length <= 1) return;
      onChange(activeViews.filter(v => v !== id));
      if (defaultView === id) {
        const remaining = activeViews.filter(v => v !== id);
        onDefaultChange(remaining[0]);
      }
    } else {
      onChange([...activeViews, id]);
    }
  };

  const handleDragStart = (i: number) => { dragIdx.current = i; };
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setDragOverIdx(i);
  };
  const handleDrop = (i: number) => {
    if (dragIdx.current === null || dragIdx.current === i) { setDragOverIdx(null); return; }
    const next = [...activeViews];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    onChange(next);
    dragIdx.current = null;
    setDragOverIdx(null);
  };

  return (
    <div style={{ marginBottom: 20, marginTop: 30, paddingTop: 30, borderTop: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <MaterialIcon name="trending_up" className="text-[18px]" />
        <span style={{ fontWeight: 700, fontSize: 14 }}>Tampilan Statistik</span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
        Atur urutan dan tampilan di halaman Statistik.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {activeViews.map((id, i) => {
          const def = ALL_STATS_VIEWS.find(v => v.id === id);
          if (!def) return null;
          const isDragOver = dragOverIdx === i;
          const isDefault = defaultView === id;

          return (
            <div
              key={id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => setDragOverIdx(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 14, background: isDragOver ? 'var(--primary-glow)' : 'var(--bg-main)',
                border: isDragOver ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)',
                cursor: 'grab', transition: 'all 0.15s'
              }}
            >
              <MaterialIcon name="drag_indicator" className="text-[16px]" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {def.label}
                  {(def as any).pro && (
                    <span className="px-1.5 py-0.5 rounded bg-primary-container text-primary-color text-[9px] font-extrabold uppercase tracking-wider">PRO</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{def.description}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => onDefaultChange(id)}
                  style={{
                    padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                    background: isDefault ? 'var(--primary)' : 'var(--bg-card)',
                    color: isDefault ? 'white' : 'var(--text-muted)',
                    border: '1px solid var(--border-color)', cursor: 'pointer'
                  }}
                >
                  {isDefault ? 'Default' : 'Set Default'}
                </button>
                <button
                  onClick={() => toggleView(id)}
                  disabled={activeViews.length <= 1}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: activeViews.length <= 1 ? 0.3 : 0.7 }}
                >
                  <MaterialIcon name="close" className="text-[14px]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
        Tambah Tampilan
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ALL_STATS_VIEWS.filter(v => !activeViews.includes(v.id)).map(def => (
          <button
            key={def.id}
            onClick={() => toggleView(def.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14,
              background: 'var(--bg-card)', border: '1.5px dashed var(--border-color)', cursor: 'pointer', textAlign: 'left'
            }}
          >
            <MaterialIcon name="add" className="text-[14px]" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {def.label}
                {(def as any).pro && (
                  <span className="px-1.5 py-0.5 rounded bg-primary-container text-primary-color text-[9px] font-extrabold uppercase tracking-wider">PRO</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{def.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'family') {
      setTimeout(() => {
        const el = document.getElementById('family-management');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Highlight effect
          el.style.transition = 'box-shadow 0.5s';
          el.style.boxShadow = '0 0 0 4px var(--primary-container)';
          setTimeout(() => el.style.boxShadow = '', 2000);
        }
      }, 500);
    }
  }, [location]);

  // Auth context for manual sync
  const { showToast } = useToast();
  const { premium, setShowUpgradeModal } = usePremium();
  const { user, updateUser, pin, setAppPin, lockApp, categories, assets, exportData, importData, logOut, defaultAssetId, setDefaultAssetId, startOfMonthDay, setStartOfMonthDay, showDebtInTransactions, setShowDebtInTransactions, currencySymbol, setCurrencySymbol, assetCarouselCards, setAssetCarouselCards, statsCarouselCards, setStatsCarouselCards, defaultStatsView, setDefaultStatsView, chartStyle, setChartStyle, pullFromCloud, contacts, subscriptions, addSubscription, updateSubscription, deleteSubscription, transactions, getAssetBalance, budgetMode, setBudgetMode, zbbMode, setZbbMode, addRecurringTransaction, syncData, pendingSyncCount } = useMoney();
  const { resetAllTutorials } = useOnboarding();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showRewardsStore, setShowRewardsStore] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const isGoogleLinked = auth.currentUser?.providerData.some(p => p.providerId === 'google.com');

  // Deep linking: open modal based on navigation state
  React.useEffect(() => {
    if (location.state && typeof location.state === 'object' && 'activeModal' in location.state) {
      const modal = (location.state as any).activeModal;
      if (modal) {
        setActiveModal(modal);
      }
    }
  }, [location.state]);
  const excelImportRef = useRef<HTMLInputElement>(null);
  const [excelMappingPreset, setExcelMappingPreset] = useState<'default' | 'custom' | 'bca' | 'mandiri'>('default');
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [excelResult, setExcelResult] = useState<ImportResult | null>(null);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [pendingExcelFile, setPendingExcelFile] = useState<File | null>(null);

  const [isSharedBillsOpen, setIsSharedBillsOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullResult, setPullResult] = useState<{ total: number } | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: number; failed: number; error?: string } | null>(null);

  // Global Confirm State for this page
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'danger'
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger', confirmText?: string) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, type, confirmText });
  };

  // Profile Form State
  const [tempName, setTempName] = useState(user.name);
  const [tempEmail, setTempEmail] = useState(user.email);
  const [tempAvatar, setTempAvatar] = useState(user.avatar || '');

  useEffect(() => {
    if (!isEditingProfile && activeModal !== 'profile') {
      setTempName(user.name);
      setTempEmail(user.email);
      setTempAvatar(user.avatar || '');
    }
  }, [user.name, user.email, user.avatar, isEditingProfile, activeModal]);

  // PIN Form State
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Category State
  // Contact State
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  // contactSearchQuery is moved to ContactManagerModal
  const [budgetTab, setBudgetTab] = useState<'budget' | 'goal'>('budget');

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(localStorage.getItem('last_cloud_sync_time'));
  const formatLastSync = (ts: string | null) => {
    if (!ts) return 'Belum pernah';
    const diff = Math.floor((Date.now() - parseInt(ts)) / 60000); // minutes
    if (diff < 1) return 'Baru saja';
    if (diff < 60) return `${diff}m lalu`;
    if (diff < 1440) return `${Math.floor(diff/60)}j lalu`;
    return `${Math.floor(diff/1440)}h lalu`;
  };

  const profileStats = React.useMemo(() => {
    const netWorth = assets.filter(a => !a.isDeleted).reduce((sum, a) => sum + (getAssetBalance?.(a.id) || 0), 0);
    const thisMonthTxs = transactions.filter(t => {
      if (!t.date) return false;
      const txDate = new Date(t.date);
      const now = new Date();
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });
    const txCount = thisMonthTxs.length;

    let tierLabel = 'Pemula Mandiri 🌱';
    let tierColor = 'linear-gradient(135deg, #78716c 0%, #44403c 100%)'; // Dark Stone
    let shadowColor = 'rgba(68, 64, 60, 0.25)';
    if (netWorth >= 100000000) {
      tierLabel = 'Sultan Darat 👑';
      tierColor = 'linear-gradient(135deg, #ca8a04 0%, #854d0e 100%)'; // Rich Gold
      shadowColor = 'rgba(133, 77, 14, 0.35)';
    } else if (netWorth >= 50000000) {
      tierLabel = 'Konglomerat Muda 💎';
      tierColor = 'linear-gradient(135deg, #0284c7 0%, #075985 100%)'; // Sky
      shadowColor = 'rgba(7, 89, 133, 0.35)';
    } else if (netWorth >= 10000000) {
      tierLabel = 'Investor Cerdas 📈';
      tierColor = 'linear-gradient(135deg, #16a34a 0%, #166534 100%)'; // Green
      shadowColor = 'rgba(22, 101, 52, 0.35)';
    } else if (netWorth >= 5000000) {
      tierLabel = 'Penyimpan Bijak 🛡️';
      tierColor = 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)'; // Purple
      shadowColor = 'rgba(91, 33, 182, 0.35)';
    } else if (netWorth >= 1000000) {
      tierLabel = 'Raja Hemat 💰';
      tierColor = 'linear-gradient(135deg, #ea580c 0%, #9a3412 100%)'; // Orange
      shadowColor = 'rgba(154, 52, 18, 0.35)';
    } else if (netWorth < 0) {
      tierLabel = 'Pejuang Finansial ⚡';
      tierColor = 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'; // Red
      shadowColor = 'rgba(153, 27, 27, 0.35)';
    }

    return { netWorth, txCount, tierLabel, tierColor, shadowColor };
  }, [assets, transactions, getAssetBalance]);

  // Subscription State
  const [newSubName, setNewSubName] = useState('');
  const [newSubAmount, setNewSubAmount] = useState('');
  const [newSubCycle, setNewSubCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [newSubDate, setNewSubDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSubCat, setNewSubCat] = useState('');
  const [newSubAsset, setNewSubAsset] = useState(defaultAssetId || '');
  const [editingSub, setEditingSub] = useState<string | null>(null);

  // Modals
  const [isAssetSelectOpen, setIsAssetSelectOpen] = useState(false);
  const [isSubAssetSelectOpen, setIsSubAssetSelectOpen] = useState(false);
  const [isSubCatSelectOpen, setIsSubCatSelectOpen] = useState(false);

  const handleMenuClick = (id: string) => {
    if (id === 'help') {
      window.location.href = 'mailto:rizqydaffa14@gmail.com?subject=Bantuan MoneyApp&body=Halo, saya butuh bantuan terkait...';
      return;
    }
    if (id === 'shared_bills') {
      setIsSharedBillsOpen(true);
      return;
    }
    if (id === 'trips') {
      navigate('/trips');
      return;
    }
    if (id === 'debts') {
      navigate('/debts');
      return;
    }
    if (id === 'reset_tutorial') {
      resetAllTutorials();
      return;
    }
    setActiveModal(id);
    if (id === 'profile') {
      setTempName(user.name);
      setTempEmail(user.email);
      setTempAvatar(user.avatar || '');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await validateFileSecure(file, {
      maxSizeMB: 5,
      allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp'],
      allowedMimeTypes: ['image/*'],
      checkMagicBytes: 'image'
    });

    if (!validation.isValid) {
      showToast(validation.error || 'Format gambar tidak valid', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Compress to low quality JPEG to save storage space
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setTempAvatar(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalEmail = tempEmail;
    if (tempEmail !== user.email && auth.currentUser && !isGoogleLinked) {
      try {
        await verifyBeforeUpdateEmail(auth.currentUser, tempEmail);
        showToast('Tautan verifikasi telah dikirim ke email baru Anda. Silakan klik tautan tersebut untuk mengonfirmasi.', 'success');
        finalEmail = user.email; // Keep old email locally until verified
      } catch (error: any) {
        console.error('Update email error:', error);
        if (error.code === 'auth/requires-recent-login') {
          setShowReauthModal(true);
          return; // Stop here, wait for re-auth
        } else {
          showToast('Gagal mengubah email: ' + error.message, 'error');
          return;
        }
      }
    }

    updateUser({ name: tempName, email: finalEmail, avatar: tempAvatar });
    setActiveModal(null);
    setIsEditingProfile(false);
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 6) {
      setPinError('PIN harus 6 digit');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PIN tidak cocok');
      return;
    }
    await setAppPin(newPin);
    setActiveModal(null);
    setNewPin(''); setConfirmPin(''); setPinError('');
    // alert is fine for success usually, or we can make it a Toast. 
    // For now the user asked for all alerts, but maybe just confirm() is enough.
  };

  const handleDisablePin = () => {
    showConfirm(
      'Matikan PIN',
      'Apakah Anda yakin ingin mematikan keamanan PIN?',
      async () => {
        await setAppPin(null);
        setActiveModal(null);
      },
      'warning',
      'Ya, Matikan'
    );
  };

  const { recurringTransactions, deleteRecurringTransaction, updateRecurringTransaction } = useMoney();

  const renderModalContent = () => {
    switch (activeModal) {
      case 'contacts':
        return (
          <ContactManagerModal
            isOpen={activeModal === 'contacts'}
            onClose={() => setActiveModal(null)}
          />
        );

      case 'subscriptions':
        const totalMonthly = subscriptions
          .filter(s => s.isActive)
          .reduce((sum, s) => sum + (s.billingCycle === 'monthly' ? s.amount : s.amount / 12), 0);

        return (
          <>
            <div className="modal-header">
              <h2 className="subtitle">Kelola Langganan</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    setEditingSub(null);
                    setNewSubName('');
                    setNewSubAmount('');
                    setNewSubDate(new Date().toISOString().split('T')[0]);
                    setNewSubCycle('monthly');
                    setNewSubAsset(defaultAssetId || '');
                    setActiveModal('subscription_form');
                  }}
                  style={{
                    padding: '8px 12px', background: 'var(--bg-income)', color: 'var(--primary)',
                    border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
                  }}
                >
                  <MaterialIcon name="add" className="text-[14px]" /> Tambah
                </button>
                <button className="close-btn" onClick={() => { setActiveModal(null); setEditingSub(null); }}><MaterialIcon name="close" className="text-base" /></button>
              </div>
            </div>

            <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingBottom: 20 }}>
              {/* Summary Card */}
              <div style={{
                margin: '0 20px 20px', padding: '16px',
                background: 'var(--primary)',
                borderRadius: '16px', color: 'white', boxShadow: '0 8px 16px var(--primary-glow)'
              }}>
                <div style={{ fontSize: '12px', opacity: 0.8, fontWeight: 600 }}>Estimasi Pengeluaran Bulanan</div>
                <div style={{ fontSize: '24px', fontWeight: 800, margin: '4px 0' }}>
                  {currencySymbol}{totalMonthly.toLocaleString('id-ID')}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.7 }}>
                  Berdasarkan {subscriptions.length} layanan aktif
                </div>
              </div>

              {/* List */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '0 20px 10px', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>DAFTAR LANGGANAN</div>
                {subscriptions.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    background: editingSub === s.id ? 'var(--bg-main)' : 'transparent',
                    opacity: s.isActive ? 1 : 0.6
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, background: 'var(--bg-card)',
                      color: 'var(--primary)', border: '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800
                    }}>
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MaterialIcon name="credit_card" className="text-[10px]" /> {currencySymbol}{s.amount.toLocaleString('id-ID')} • <MaterialIcon name="calendar_today" className="text-[10px]" /> {s.nextBillingDate} ({s.billingCycle === 'monthly' ? 'Bln' : 'Thn'})
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => updateSubscription(s.id, { isActive: !s.isActive })}
                        className="btn-icon"
                        style={{ color: s.isActive ? 'var(--primary)' : 'var(--text-muted)', padding: 6 }}
                      >
                        <MaterialIcon name="refresh" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingSub(s.id);
                          setNewSubName(s.name);
                          setNewSubAmount(s.amount.toString());
                          setNewSubCycle(s.billingCycle);
                          setNewSubDate(s.nextBillingDate);
                          setNewSubAsset(s.assetId);
                          setActiveModal('subscription_form');
                        }}
                        className="btn-icon"
                        style={{ color: 'var(--primary)', padding: 6 }}
                      >
                        <MaterialIcon name="edit" className="text-[18px]" />
                      </button>
                      <button
                        onClick={() => showConfirm('Hapus Langganan', `Hapus "${s.name}"?`, () => deleteSubscription(s.id))}
                        className="btn-icon"
                        style={{ color: 'var(--danger)', padding: 6 }}
                      >
                        <MaterialIcon name="delete" className="text-[18px]" />
                      </button>
                    </div>
                  </div>
                ))}
                {subscriptions.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
                    <div style={{ fontWeight: 700 }}>Belum ada data langganan</div>
                    <div style={{ fontSize: 12 }}>Catat biaya bulananmu di sini.</div>
                  </div>
                )}
              </div>
            </div>
          </>
        );

      case 'preferences':
        return (
          <>
            <div className="modal-header">
              <h2 className="subtitle">Preferensi Aplikasi</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)}><MaterialIcon name="close" className="text-base" /></button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <MaterialIcon name="account_balance_wallet" className="text-[18px]" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Dompet Utama</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAssetSelectOpen(true)}
                data-tour="pref-default-wallet"
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                  borderRadius: '12px', cursor: 'pointer', textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {(() => {
                    const asset = assets.find(a => a.id === defaultAssetId);
                    if (!asset) return <MaterialIcon name="account_balance_wallet" className="text-[18px]" />;
                    let iconName = 'account_balance_wallet';
                    let colorClass = 'text-[var(--primary)]';
                    switch (asset.type) {
                      case 'Cash': iconName = 'payments'; colorClass = 'text-[var(--secondary)]'; break;
                      case 'Bank Account': iconName = 'account_balance'; colorClass = 'text-[var(--primary)]'; break;
                      case 'Credit Card': iconName = 'credit_card'; colorClass = 'text-[var(--danger)]'; break;
                      case 'eWallet': iconName = 'smartphone'; colorClass = 'text-[var(--success)]'; break;
                      case 'Savings': iconName = 'savings'; colorClass = 'text-[#3b82f6]'; break;
                      case 'Investment': iconName = 'trending_up'; colorClass = 'text-[#10b981]'; break;
                      case 'Loan': iconName = 'handshake'; colorClass = 'text-[var(--danger)]'; break;
                    }
                    return <MaterialIcon name={iconName} className={`text-[18px] ${colorClass}`} />;
                  })()}
                  <span style={{ fontWeight: 600, color: defaultAssetId ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {assets.find(a => a.id === defaultAssetId)?.name || 'Pilih Dompet Utama...'}
                  </span>
                </div>
                <MaterialIcon name="chevron_right" className="text-[18px]" />
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 8 }}>Digunakan sebagai pilihan otomatis saat mencatat transaksi baru.</p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <MaterialIcon name="refresh" className="text-[18px]" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Siklus Finansial</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Atur tanggal awal bulan finansial Anda (misalnya tanggal gajian).
              </p>
              <div style={{ position: 'relative', marginTop: '12px' }}>
                <select
                  data-testid="start-of-month"
                  value={startOfMonthDay}
                  onChange={(e) => setStartOfMonthDay(parseInt(e.target.value))}
                  data-tour="pref-financial-cycle"
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    width: '100%',
                    padding: '14px 16px',
                    paddingRight: '40px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>Tanggal {day}</option>
                  ))}
                </select>
                <div style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: 'var(--text-muted)'
                }}>
                  <div style={{ border: 'solid var(--text-muted)', borderWidth: '0 2px 2px 0', display: 'inline-block', padding: '3px', transform: 'rotate(45deg)' }}></div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <MaterialIcon name="payments" className="text-[18px]" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Tampilkan Transaksi Hutang/Piutang</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Aktifkan ini jika Anda ingin aktivitas meminjam/membayar hutang piutang muncul di menu utama Transaksi.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Tampilkan di Transaksi</span>
                <input
                  type="checkbox"
                  checked={showDebtInTransactions}
                  onChange={(e) => setShowDebtInTransactions(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <MaterialIcon name="account_balance_wallet" className="text-[18px]" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Mata Uang & Simbol</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Ubah simbol mata uang yang ditampilkan (Contoh: Rp, $, RM).
              </p>
              <input
                data-testid="currency-input"
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="Simbol Mata Uang..."
                data-tour="pref-currency"
                style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: 0 }}
              />
            </div>


            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <MaterialIcon name="dark_mode" className="text-[18px]" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Gaya Grafik Transaksi Harian</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Pilih jenis grafik yang digunakan untuk menampilkan aktivitas pengeluaran harian Anda.
              </p>
              <div style={{ display: 'flex', background: 'var(--bg-card-solid)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setChartStyle('area')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: chartStyle === 'area' ? 'var(--bg-neutral)' : 'transparent',
                    color: chartStyle === 'area' ? 'var(--text-main)' : 'var(--text-muted)',
                    fontSize: '14px',
                    fontWeight: chartStyle === 'area' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                >
                  Area Chart (Gradasi & Isian)
                </button>
                <button
                  type="button"
                  onClick={() => setChartStyle('line')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: chartStyle === 'line' ? 'var(--bg-neutral)' : 'transparent',
                    color: chartStyle === 'line' ? 'var(--text-main)' : 'var(--text-muted)',
                    fontSize: '14px',
                    fontWeight: chartStyle === 'line' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                >
                  Line Chart (Garis Glowing)
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <MaterialIcon name="track_changes" className="text-[18px]" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Metode Budgeting</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Pilih antara budget reguler atau Zero-Based (Envelope).
              </p>
              <div
                data-tour="pref-budget-mode"
                data-testid="budget-mode-toggle"
                style={{
                  display: 'flex', background: 'var(--bg-main)', padding: '4px',
                  borderRadius: '12px', border: '1px solid var(--border-color)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setBudgetMode('regular')}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                    background: budgetMode === 'regular' ? 'var(--bg-card)' : 'transparent',
                    color: budgetMode === 'regular' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: budgetMode === 'regular' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Reguler
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetMode('zero-based')}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                    background: budgetMode === 'zero-based' ? 'var(--bg-card)' : 'transparent',
                    color: budgetMode === 'zero-based' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: budgetMode === 'zero-based' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Zero-Based
                </button>
              </div>

              {budgetMode === 'zero-based' && (
                <div style={{ marginTop: 12, padding: '12px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Disiplin ZBB (Strict Mode)</span>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
                      <input
                        type="checkbox"
                        checked={zbbMode === 'strict'}
                        onChange={(e) => setZbbMode(e.target.checked ? 'strict' : 'flexible')}
                        style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
                      />
                      <div style={{
                        width: '40px', height: '24px', backgroundColor: zbbMode === 'strict' ? 'var(--primary)' : 'var(--border-color)',
                        borderRadius: '12px', position: 'relative', transition: '0.3s'
                      }}>
                        <div style={{
                          width: '18px', height: '18px', backgroundColor: 'white', borderRadius: '50%',
                          position: 'absolute', top: '3px', left: zbbMode === 'strict' ? '19px' : '3px',
                          transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                    </label>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    Jika aktif, setiap transaksi <strong>wajib</strong> memiliki sisa anggaran. Jika defisit, Anda akan dipaksa memindahkan dana dari kategori lain.
                  </p>
                </div>
              )}
            </div>

            {/* ─── Rekap Aset Carousel ─────────────────────────────── */}
            <CarouselCardSettings
              activeCards={assetCarouselCards}
              onChange={setAssetCarouselCards}
            />

            {/* ─── Statistik View Selector ─────────────────────────── */}
            <StatsViewSettings
              activeViews={statsCarouselCards}
              onChange={setStatsCarouselCards}
              defaultView={defaultStatsView}
              onDefaultChange={setDefaultStatsView}
            />

            <div className="card shadow-soft" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Note: Pengaturan ini disimpan secara lokal di perangkat ini dan disinkronkan ke cloud jika Anda login.
              </div>
            </div>
          </>
        );

      case 'profile':
        return (
          <form onSubmit={handleUpdateProfile} style={{ padding: '0 4px' }}>
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h2 className="subtitle" style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Profil Saya</h2>
              <button type="button" className="close-btn" onClick={() => setActiveModal(null)}><MaterialIcon name="close" className="text-[18px]" /></button>
            </div>

            {/* Premium Financial Member Pass Card */}
            <div style={{
              background: profileStats.tierColor,
              borderRadius: '20px',
              padding: '20px',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `0 12px 28px ${profileStats.shadowColor}`,
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              border: '1px solid rgba(255, 255, 255, 0.12)'
            }}>
              {/* Card background ambient patterns */}
              <div style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                filter: 'blur(12px)',
                pointerEvents: 'none'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-20px',
                left: '-20px',
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                filter: 'blur(8px)',
                pointerEvents: 'none'
              }} />

              {/* Card Header: Avatar & Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 2 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '26px',
                    fontWeight: 900,
                    overflow: 'hidden',
                    border: '2.5px solid rgba(255, 255, 255, 0.85)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {tempAvatar ? (
                      <img src={tempAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      tempName ? tempName.charAt(0).toUpperCase() : 'U'
                    )}
                  </div>
                  <label style={{
                    position: 'absolute',
                    bottom: '-3px',
                    right: '-4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    color: '#1e293b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
                    transition: 'transform 0.2s ease, background-color 0.2s ease',
                    border: '1px solid rgba(0,0,0,0.05)'
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)'; }}
                    title="Ubah Foto"
                  >
                    <MaterialIcon name="camera_alt" />
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                  </label>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tempName || 'User MoneyApp'}
                    </span>
                    <span style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.22)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '9px',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}>
                      Lokal Terverifikasi ✓
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '4px', fontWeight: 500 }}>
                    {tempEmail || 'belum_diatur@email.com'}
                  </div>
                </div>
              </div>

              {/* Divider Line */}
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.15)', margin: '2px 0' }} />

              {/* Stats & Rank details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', position: 'relative', zIndex: 2 }}>
                <div>
                  <div style={{ fontSize: '9px', opacity: 0.75, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Level Finansial</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '3px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {profileStats.tierLabel}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '9px', opacity: 0.75, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Saldo Aktif</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '3px' }}>
                    {currencySymbol}{profileStats.netWorth.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Monthly Stats Capsule */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.15)',
                padding: '10px 14px',
                borderRadius: '12px',
                marginTop: '2px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, opacity: 0.95 }}>Aktivitas Pencatatan Bulan Ini:</span>
                <span style={{ fontSize: '11px', fontWeight: 800 }}>{profileStats.txCount} Transaksi</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Nama Lengkap</label>
                <input
                  type="text"
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  placeholder="Masukkan nama lengkap..."
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', marginBottom: 0 }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Email</label>
                <input
                  type="email"
                  value={tempEmail}
                  onChange={e => setTempEmail(e.target.value)}
                  placeholder="Masukkan email..."
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', marginBottom: 0 }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 800, fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px var(--primary-glow)' }}>
              Simpan Perubahan
            </button>
          </form>
        );
      case 'security':
        return (
          <>
            <div className="modal-header">
              <h2 className="subtitle">Keamanan</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)}><MaterialIcon name="close" className="text-base" /></button>
            </div>

            {pin ? (
              <div style={{ textAlign: 'center' }}>
                <MaterialIcon name="verified_user" />
                <p style={{ marginBottom: '20px', color: 'var(--text-main)', fontWeight: 600 }}>Keamanan PIN Aktif</p>
                <button type="button" onClick={handleDisablePin} className="btn" style={{ backgroundColor: 'var(--bg-expense)', color: 'var(--danger)', marginBottom: '10px', width: '100%' }}>Nonaktifkan PIN</button>
                <button type="button" onClick={lockApp} className="btn btn-primary" style={{ width: '100%' }}>Kunci Sekarang</button>
              </div>
            ) : (
              <form onSubmit={handleSetPin}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <MaterialIcon name="lock" />
                  <p style={{ color: 'var(--text-muted)' }}>Setel PIN untuk mengamankan data Anda.</p>
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Masukkan PIN Baru (6 digit)"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Konfirmasi PIN"
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                />
                {pinError && <p style={{ color: 'var(--danger-red)', fontSize: '12px', marginBottom: '10px' }}>{pinError}</p>}
                <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>Aktifkan Keamanan</button>
              </form>
            )}
          </>
        );

      case 'backup':
        return (
          <>
            <div className="modal-header">
              <h2 className="subtitle">Backup & Restore</h2>
              <button className="close-btn" onClick={() => { setActiveModal(null); setExcelResult(null); }}><MaterialIcon name="close" className="text-base" /></button>
            </div>

            {/* ── Section 1: JSON Backup ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <MaterialIcon name="backup" className="text-[15px]" />
                <span style={{ fontWeight: 700, fontSize: 13 }}>Backup JSON (Full Data)</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Ekspor semua data (transaksi, aset, kategori, pengaturan) ke file .json untuk restore penuh.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  data-testid="export-data-btn"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onClick={exportData}
                >
                  <MaterialIcon name="download" className="text-[15px]" /> Ekspor Backup (.json)
                </button>
                <button
                  data-testid="import-data-btn"
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--border-color)', color: 'var(--text-main)' }}
                  onClick={() => importInputRef.current?.click()}
                  disabled={isImporting}
                >
                  <MaterialIcon name="upload" className="text-[15px]" /> {isImporting ? 'Mengimpor...' : 'Restore Backup (.json)'}
                </button>
              </div>
            </div>

            {/* ── Section 1.5: Pull from Cloud ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <MaterialIcon name="refresh" className="text-[15px]" />
                <span style={{ fontWeight: 700, fontSize: 13 }}>Tarik Data dari Cloud</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Gunakan ini jika Anda baru menambah transaksi di perangkat lain dan ingin data terbaru muncul di sini.
                Aplikasi biasanya membaca data lokal (lebih cepat &amp; hemat kuota).
              </p>
              {pullResult && (
                <div style={{
                  padding: '10px 12px', borderRadius: 10, marginBottom: 10,
                  background: pullResult.total > 0 ? 'var(--bg-income)' : 'var(--bg-neutral)',
                  border: `1px solid ${pullResult.total > 0 ? 'var(--primary)' : 'var(--border-color)'}`,
                  fontSize: 12, color: pullResult.total > 0 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600
                }}>
                  {pullResult.total > 0
                    ? `✓ ${pullResult.total} dokumen berhasil disinkronkan dari cloud`
                    : 'Tidak ada data baru dari cloud'}
                </div>
              )}
              <button
                className="btn"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary)', fontWeight: 700, width: '100%' }}
                onClick={async () => { setIsPulling(true); setPullResult(null); const r = await pullFromCloud(); setPullResult(r); setIsPulling(false); }}
                disabled={isPulling}
              >
                <MaterialIcon name="refresh" />
                {isPulling ? 'Menarik data...' : 'Tarik Data dari Cloud'}
              </button>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0 20px' }} />

            {/* ── Section 2: Excel Import ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <MaterialIcon name="table_view" className="text-[15px]" />
                <span style={{ fontWeight: 700, fontSize: 13 }}>Import dari Excel</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Tambahkan transaksi dari file Excel (.xlsx/.xls). Download dulu contoh format-nya agar sesuai.
              </p>

              {/* Excel result feedback */}
              {excelResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    padding: '12px 14px', borderRadius: 12, marginBottom: 14,
                    background: excelResult.errors.length > 0 ? 'hsla(350,80%,58%,0.08)' : 'hsla(152,70%,42%,0.08)',
                    border: `1.5px solid ${excelResult.errors.length > 0 ? 'hsla(350,80%,58%,0.25)' : 'hsla(152,70%,42%,0.25)'}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    {excelResult.imported > 0
                      ? <MaterialIcon name="check_circle" className="text-[15px]" />
                      : <MaterialIcon name="error" className="text-[15px]" />}
                    <span style={{ fontWeight: 700, fontSize: 13, color: excelResult.imported > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {excelResult.imported > 0
                        ? `${excelResult.imported} transaksi berhasil diimpor`
                        : 'Import gagal'}
                      {excelResult.skipped > 0 ? `, ${excelResult.skipped} baris dilewati` : ''}
                    </span>
                  </div>
                  {excelResult.errors.slice(0, 5).map((e, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>• {e}</div>
                  ))}
                  {excelResult.errors.length > 5 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>...dan {excelResult.errors.length - 5} error lainnya.</div>
                  )}
                </motion.div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'hsla(152,70%,42%,0.1)', color: 'hsl(152,70%,35%)', border: '1px solid hsla(152,70%,42%,0.25)', fontWeight: 700 }}
                  onClick={() => excelImportRef.current?.click()}
                  disabled={isImportingExcel}
                >
                  <MaterialIcon name="table_view" className="text-[15px]" /> {isImportingExcel ? 'Memproses...' : 'Import Excel (.xlsx / .xls)'}
                </button>
                <button
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--bg-neutral)', color: 'var(--text-muted)', border: '1px dashed var(--border-color)' }}
                  onClick={downloadSampleExcel}
                >
                  <MaterialIcon name="download" className="text-[15px]" /> Download Contoh Format Excel
                </button>
              </div>
            </div>
          </>
        );

      case 'subscription_form':
        const handleSubFormSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          if (!newSubName.trim() || !newSubAmount) return;
          const subData = {
            name: newSubName.trim(),
            amount: parseFloat(newSubAmount),
            billingCycle: newSubCycle,
            nextBillingDate: newSubDate,
            categoryId: newSubCat || 'Lainnya',
            assetId: newSubAsset,
            isActive: true,
          };
          if (editingSub) {
            updateSubscription(editingSub, subData);
          } else {
            const createdSub = addSubscription(subData);
            showConfirm(
              'Transaksi Rutin',
              `Apakah Anda ingin membuat transaksi rutin otomatis untuk langganan ${subData.name}?`,
              () => {
                const rt = addRecurringTransaction({
                  type: 'pengeluaran',
                  amount: subData.amount,
                  categoryId: subData.categoryId,
                  note: `Langganan: ${subData.name}`,
                  frequency: subData.billingCycle === 'monthly' ? 'monthly' : 'yearly',
                  startDate: subData.nextBillingDate,
                  isActive: true,
                  assetId: subData.assetId,
                });
                updateSubscription(createdSub.id, { recurringTransactionId: rt.id });
              },
              'info',
              'Buat Transaksi'
            );
          }
          setActiveModal('subscriptions');
          setEditingSub(null);
          setNewSubName(''); setNewSubAmount(''); setNewSubCat('');
        };

        return (
          <>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="btn-icon" onClick={() => setActiveModal('subscriptions')} style={{ padding: 0 }}>
                  <MaterialIcon name="chevron_left" className="text-[20px]" />
                </button>
                <h2 className="subtitle" style={{ margin: 0 }}>{editingSub ? 'Edit Langganan' : 'Tambah Langganan'}</h2>
              </div>
              <button className="close-btn" onClick={() => { setActiveModal(null); setEditingSub(null); }}><MaterialIcon name="close" className="text-base" /></button>
            </div>

            <div style={{ padding: '20px' }}>
              <form onSubmit={handleSubFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Nama Layanan</label>
                  <input
                    type="text" placeholder="misal: Netflix, Spotify..."
                    value={newSubName} onChange={e => setNewSubName(e.target.value)}
                    style={{ width: '100%', marginBottom: 0 }} required
                  />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Harga</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)', fontWeight: 700 }}>{currencySymbol}</span>
                      <CurrencyInput
                        placeholder="0"
                        value={newSubAmount} onChange={(val) => setNewSubAmount(val)}
                        style={{ width: '100%', paddingLeft: 36, marginBottom: 0 }} required
                      />
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Siklus</label>
                    <div style={{ display: 'flex', background: 'var(--bg-main)', borderRadius: '12px', padding: '3px', border: '1px solid var(--border-color)', height: '45px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setNewSubCycle('monthly')}
                        style={{
                          flex: 1,
                          height: '100%',
                          borderRadius: '9px',
                          border: 'none',
                          background: newSubCycle === 'monthly' ? 'var(--bg-neutral)' : 'transparent',
                          color: newSubCycle === 'monthly' ? 'var(--text-main)' : 'var(--text-muted)',
                          fontSize: '13px',
                          fontWeight: newSubCycle === 'monthly' ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center'
                        }}
                      >
                        Bulanan
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewSubCycle('yearly')}
                        style={{
                          flex: 1,
                          height: '100%',
                          borderRadius: '9px',
                          border: 'none',
                          background: newSubCycle === 'yearly' ? 'var(--bg-neutral)' : 'transparent',
                          color: newSubCycle === 'yearly' ? 'var(--text-main)' : 'var(--text-muted)',
                          fontSize: '13px',
                          fontWeight: newSubCycle === 'yearly' ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center'
                        }}
                      >
                        Tahunan
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Tgl Perpanjang Berikutnya</label>
                    <input
                      type="date" value={newSubDate} onChange={e => setNewSubDate(e.target.value)}
                      style={{ width: '100%', marginBottom: 0 }} required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Kategori</label>
                  <button
                    type="button"
                    onClick={() => setIsSubCatSelectOpen(true)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)',
                      borderRadius: '12px', cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <MaterialIcon name="folder" className="text-[18px]" />
                      <span style={{ fontWeight: 600, color: newSubCat ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {newSubCat || 'Pilih Kategori...'}
                      </span>
                    </div>
                    <MaterialIcon name="chevron_right" className="text-[18px]" />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Bayar Menggunakan</label>
                  <button
                    type="button"
                    onClick={() => setIsSubAssetSelectOpen(true)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)',
                      borderRadius: '12px', cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <MaterialIcon name="account_balance_wallet" className="text-[18px]" />
                      <span style={{ fontWeight: 600, color: newSubAsset ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {assets.find(a => a.id === newSubAsset)?.name || 'Pilih Dompet...'}
                      </span>
                    </div>
                    <MaterialIcon name="chevron_right" className="text-[18px]" />
                  </button>
                </div>

                <div style={{ marginTop: 8 }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '14px', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <MaterialIcon name="save" className="text-[18px]" /> {editingSub ? 'Simpan Perubahan' : 'Tambah Langganan'}
                  </button>
                </div>
              </form>
            </div>
          </>
        );

      case 'recurring':
        return (
          <>
            <div className="modal-header">
              <h2 className="subtitle">Transaksi Rutin</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)}><MaterialIcon name="close" className="text-base" /></button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Daftar transaksi yang akan tercatat otomatis sesuai jadwal.
            </p>

            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recurringTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  Belum ada transaksi rutin. Tambahkan dari menu Transaksi!
                </div>
              ) : (
                recurringTransactions.map(rt => {
                  const freqLabel = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', yearly: 'Tahunan' }[rt.frequency];
                  return (
                    <div key={rt.id} className="card" style={{
                      padding: '12px', background: 'var(--bg-main)',
                      opacity: rt.isActive ? 1 : 0.6,
                      border: rt.isActive ? '1px solid var(--border-color)' : '1px dashed var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                            {rt.note || categories.find(c => c.id === rt.categoryId)?.name || rt.categoryId}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {freqLabel} • Mulai {new Date(rt.startDate).toLocaleDateString('id-ID')}
                            {rt.endDate && ` • Sampai ${new Date(rt.endDate).toLocaleDateString('id-ID')}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => updateRecurringTransaction(rt.id, { isActive: !rt.isActive })}
                            style={{
                              padding: '4px 8px', borderRadius: '6px', border: 'none',
                              backgroundColor: rt.isActive ? 'var(--bg-expense)' : 'var(--bg-income)',
                              color: rt.isActive ? 'var(--danger)' : 'var(--primary)',
                              fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                            }}
                          >
                            {rt.isActive ? 'Matikan' : 'Aktifkan'}
                          </button>
                          <button
                            onClick={() => {
                              showConfirm(
                                'Hapus Jadwal',
                                'Hapus jadwal transaksi rutin ini?',
                                () => deleteRecurringTransaction(rt.id)
                              );
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                          >
                            <MaterialIcon name="delete" className="text-[16px]" />
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{
                          fontSize: '12px', fontWeight: 600,
                          color: rt.type === 'pengeluaran' ? 'var(--danger)' : rt.type === 'pendapatan' ? 'var(--primary)' : 'var(--text-main)'
                        }}>
                          {rt.type === 'pengeluaran' ? '-' : rt.type === 'pendapatan' ? '+' : ''}
                          Rp{rt.amount.toLocaleString('id-ID')}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Terakhir: {rt.lastProcessedDate ? new Date(rt.lastProcessedDate).toLocaleDateString('id-ID') : 'Belum pernah'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        );

      case 'budgets':
        return (
          <>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h2 className="subtitle">Budgeting & Goals</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)}><MaterialIcon name="close" className="text-base" /></button>
            </div>

            <div style={{ display: 'flex', gap: '8px', margin: '16px 0', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px' }}>
              <button
                type="button"
                onClick={() => setBudgetTab('budget')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '13px',
                  background: budgetTab === 'budget' ? 'var(--bg-card)' : 'transparent',
                  color: budgetTab === 'budget' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: budgetTab === 'budget' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Anggaran
              </button>
              <button
                type="button"
                onClick={() => setBudgetTab('goal')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '13px',
                  background: budgetTab === 'goal' ? 'var(--bg-card)' : 'transparent',
                  color: budgetTab === 'goal' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: budgetTab === 'goal' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Tabungan
              </button>
            </div>

            {budgetTab === 'budget' ? <BudgetManagement /> : <GoalManagement />}
          </>
        );

      case 'whats_new':
        return (
          <>
            <div className="modal-header">
              <h2 className="subtitle">Apa yang Baru ✨</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)}><MaterialIcon name="close" className="text-base" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {changelogData.map(v => (
                <div key={v.version}>
                  {/* Version header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-main)' }}>{v.version}</span>
                    {v.badge && (
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                        background: 'var(--primary)', color: 'white', letterSpacing: '0.04em',
                      }}>{v.badge}</span>
                    )}
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{v.date}</span>
                  </div>
                  {/* Entries */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {v.entries.map((e, i) => {
                      const meta = changelogTypeMeta[e.type];
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{
                            flexShrink: 0, fontSize: '9px', fontWeight: 800, marginTop: '3px',
                            padding: '2px 6px', borderRadius: '5px',
                            background: meta.bg, color: meta.color, letterSpacing: '0.05em',
                          }}>{meta.label}</span>
                          <span style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5 }}>{e.text}</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Divider (except last) */}
                  {v !== changelogData[changelogData.length - 1] && (
                    <div style={{ marginTop: '16px', borderBottom: '1px dashed var(--border-color)' }} />
                  )}
                </div>
              ))}
              <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', paddingBottom: '8px' }}>
                Money Tracker v2.0.0 · Made with ❤️
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Pengaturan"
        subtitle="Kelola akun, keamanan, dan preferensi aplikasi Anda."
      />

      <div className="flex flex-col lg:flex-row gap-8 mt-6 items-start w-full">
        {/* Kolom Kiri */}
        <div className="flex-1 flex flex-col gap-8 w-full">

          {/* Profile Card */}
          <section data-tour="settings-profile" className="bg-bg-card p-6 rounded-xl border border-border-light shadow-sm space-y-6">
            {isEditingProfile ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-primary-container text-primary flex items-center justify-center text-xl font-bold border-2 border-outline overflow-hidden">
                      {tempAvatar ? (
                        <img src={tempAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        tempName ? tempName.charAt(0).toUpperCase() : 'U'
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-primary text-white p-1 rounded-full border border-white cursor-pointer hover:scale-105 transition-transform flex items-center justify-center">
                      <MaterialIcon name="camera_alt" className="text-xs" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ubah Foto Profil</h4>
                    <p className="text-[10px] text-on-surface-variant">Klik ikon kamera untuk mengunggah foto baru</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Email</label>
                    <input
                      type="email"
                      value={tempEmail}
                      onChange={e => setTempEmail(e.target.value)}
                      disabled={isGoogleLinked}
                      className="w-full p-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      required
                    />
                    {isGoogleLinked && (
                      <p className="text-[10px] text-on-surface-variant mt-1">Email dikelola oleh Google dan tidak dapat diubah.</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-primary text-white rounded-lg font-bold text-xs border-none cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempName(user.name);
                      setTempEmail(user.email);
                      setTempAvatar(user.avatar || '');
                      setIsEditingProfile(false);
                    }}
                    className="flex-1 py-2 bg-surface-container-high border border-outline-variant text-on-surface rounded-lg font-bold text-xs cursor-pointer hover:bg-surface-container transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full object-cover border-2 border-primary-fixed overflow-hidden flex items-center justify-center font-bold text-3xl bg-primary text-white">
                      {user.avatar ? (
                        <img alt="Avatar" className="w-full h-full object-cover" src={user.avatar} />
                      ) : (
                        user.name ? user.name.charAt(0).toUpperCase() : 'U'
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setTempName(user.name);
                        setTempEmail(user.email);
                        setTempAvatar(user.avatar || '');
                        setIsEditingProfile(true);
                      }}
                      className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full border-2 border-white cursor-pointer hover:scale-105 transition-transform flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  </div>
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-bold">{user.name}</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant truncate max-w-[200px]">{user.email}</p>
                  </div>
                </div>

                {/* Premium Member Pass Card */}
                <div
                  className="p-5 rounded-2xl text-white relative overflow-hidden shadow-md flex flex-col gap-4 border border-white/10"
                  style={{ background: profileStats.tierColor, boxShadow: `0 8px 24px ${profileStats.shadowColor}` }}
                >
                  <div className="absolute top-[-30px] right-[-30px] w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />

                  <div className="flex justify-between items-start z-10">
                    <div>
                      <div className="text-[9px] opacity-75 font-bold uppercase tracking-wider">Level Finansial</div>
                      <div className="text-sm font-black mt-0.5">{profileStats.tierLabel}</div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="text-[9px] opacity-75 font-bold uppercase tracking-wider">Status Akun</div>
                      {premium.isPremium ? (
                        <button onClick={() => setShowUpgradeModal(true)} className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-primary cursor-pointer hover:opacity-90 transition-opacity border-none">PRO (Lihat)</button>
                      ) : (
                        <button onClick={() => setShowUpgradeModal(true)} className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 hover:bg-white/30 text-white border-none cursor-pointer transition-colors">FREE (Upgrade)</button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-black/15 px-3 py-2 rounded-lg text-[10px] font-bold border border-white/5 z-10">
                    <span>Aktivitas Bulan Ini:</span>
                    <span>{profileStats.txCount} Transaksi</span>
                  </div>
                </div>

                {/* Rewards & Streak Card */}
                <div className="flex gap-3">
                  <div className="flex-1 bg-surface-container rounded-xl p-3 border border-border-light flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Streak Login</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">🔥</span>
                      <span className="text-base font-black text-on-surface">{user.loginStreak || 0} Hari</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowRewardsStore(true)}
                    className="flex-1 bg-surface-container hover:bg-surface-container-high rounded-xl p-3 border border-border-light flex flex-col items-center justify-center text-center relative overflow-hidden transition-colors cursor-pointer text-on-surface"
                  >
                    <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Poin Reward</span>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-lg text-yellow-500 material-symbols-outlined">monetization_on</span>
                      <span className="text-base font-black text-on-surface">{user.rewardPoints || 0}</span>
                    </div>
                    <span className="text-[9px] text-primary font-bold flex items-center gap-0.5">
                      Tukar Poin <span className="material-symbols-outlined text-[10px] font-bold">chevron_right</span>
                    </span>
                  </button>
                </div>

                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="w-full py-2.5 rounded-lg border border-primary text-primary font-label-md hover:bg-primary-fixed transition-colors cursor-pointer"
                >
                  Ubah Profil
                </button>
              </>
            )}
          </section>

          {/* Security Card */}
          <section className="bg-bg-card p-6 rounded-xl border border-border-light shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">lock</span>
                <h3 className="font-headline-md text-headline-md text-on-surface">Keamanan</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!pin}
                  onChange={() => {
                    if (pin) handleDisablePin();
                    else setActiveModal('security');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                <span className="ms-3 font-label-md text-on-surface">PIN Lock</span>
              </label>
            </div>

            <button
              onClick={() => setActiveModal('security')}
              className="w-full py-2.5 rounded-lg bg-surface-container-low text-on-surface font-label-md border border-outline-variant hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">password</span>
              {pin ? 'Ubah PIN Keamanan' : 'Setel PIN Baru'}
            </button>
          </section>

          {/* Preferensi Finansial & Mata Uang Card */}
          <section data-tour="settings-preferences" className="bg-bg-card p-6 rounded-xl border border-border-light shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">tune</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">Preferensi Finansial</h3>
            </div>

            <div className="space-y-4">
              {/* Dompet Utama */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Dompet Utama</label>
                <button
                  type="button"
                  data-tour="pref-default-wallet"
                  onClick={() => setIsAssetSelectOpen(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl cursor-pointer hover:bg-surface-container transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <MaterialIcon name="account_balance_wallet" className="text-primary text-base" />
                    <span className="font-bold text-sm text-on-surface">
                      {assets.find(a => a.id === defaultAssetId)?.name || 'Pilih Dompet Utama...'}
                    </span>
                  </div>
                  <MaterialIcon name="chevron_right" className="text-base text-on-surface-variant" />
                </button>
              </div>

              {/* Siklus Finansial */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Awal Siklus Bulanan (Gajian)</label>
                <select
                  data-tour="pref-financial-cycle"
                  value={startOfMonthDay}
                  onChange={(e) => setStartOfMonthDay(parseInt(e.target.value))}
                  className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-low font-bold text-sm text-on-surface focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>Tanggal {day}</option>
                  ))}
                </select>
              </div>

              {/* Simbol Mata Uang */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Simbol Mata Uang</label>
                <input
                  type="text"
                  data-tour="pref-currency"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-low font-bold text-sm text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="Simbol Mata Uang..."
                />
              </div>

            </div>
          </section>

          {/* Tata Letak Dashboard Card */}
          <section className="bg-bg-card p-6 rounded-xl border border-border-light shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">dashboard_customize</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">Tata Letak Dashboard</h3>
            </div>

            <div className="space-y-4">
              {/* Gaya Grafik */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Gaya Grafik Harian</label>
                <div className="flex bg-surface-container-low rounded-xl p-1 border border-outline-variant">
                  <button
                    type="button"
                    onClick={() => setChartStyle('area')}
                    className={`flex-1 py-2 rounded-lg border-none font-bold text-xs cursor-pointer transition-all ${chartStyle === 'area' ? 'bg-bg-card text-on-surface shadow-sm' : 'bg-transparent text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    Area Chart
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartStyle('line')}
                    className={`flex-1 py-2 rounded-lg border-none font-bold text-xs cursor-pointer transition-all ${chartStyle === 'line' ? 'bg-bg-card text-on-surface shadow-sm' : 'bg-transparent text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    Line Chart
                  </button>
                </div>
              </div>

              {/* Tampilkan Hutang */}
              <label className="flex items-center justify-between p-3.5 bg-surface-container-low border border-outline-variant rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-on-surface">Transaksi Hutang/Piutang</span>
                  <span className="text-[10px] text-on-surface-variant mt-0.5">Tampilkan di halaman utama</span>
                </div>
                <input
                  type="checkbox"
                  checked={showDebtInTransactions}
                  onChange={(e) => setShowDebtInTransactions(e.target.checked)}
                  className="w-5 h-5 accent-primary cursor-pointer"
                />
              </label>
            </div>

            <CarouselCardSettings
              activeCards={assetCarouselCards}
              onChange={setAssetCarouselCards}
            />
          </section>

          {/* Excel Import & Cloud Backup Card */}
          <section className="bg-bg-card p-6 rounded-xl border border-border-light shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">cloud_sync</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">Data &amp; Sinkronisasi</h3>
            </div>



            <div
              onClick={() => excelImportRef.current?.click()}
              className="border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-surface-container-lowest hover:bg-surface-container-low transition-colors group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[32px]">upload_file</span>
              </div>
              <div className="text-center">
                <p className="font-body-lg font-bold text-on-surface">Import Data Excel</p>
                <p className="font-body-md text-on-surface-variant mt-0.5">(.xlsx, .xls, .csv)</p>
              </div>
            </div>



            {excelResult && (
              <div className={`p-4 rounded-xl border text-xs leading-relaxed ${excelResult.errors.length > 0 ? 'bg-error-container/10 border-error/20 text-error' : 'bg-primary-container/10 border-primary/20 text-primary'
                }`}>
                <div className="font-bold flex items-center gap-1 mb-1.5">
                  <MaterialIcon name={excelResult.imported > 0 ? 'check_circle' : 'error'} className="text-sm" />
                  {excelResult.imported > 0 ? `${excelResult.imported} transaksi berhasil diimpor` : 'Proses import gagal'}
                </div>
                {excelResult.errors.slice(0, 3).map((e, idx) => (
                  <div key={idx} className="pl-5 text-[10px]">• {e}</div>
                ))}
              </div>
            )}

            <div>
              <label className="block font-bold text-xs text-on-surface-variant mb-2">Konfigurasi Kolom Excel</label>
              <select
                className="w-full p-3 rounded-lg border border-outline-variant bg-surface-container-low font-body-md focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer text-on-surface"
                value={excelMappingPreset}
                onChange={(e) => setExcelMappingPreset(e.target.value as any)}
              >
                <option value="default">Default Template (Tanggal, Tipe, Kategori, Nominal)</option>
                <option value="custom">Custom Mapping (Pilih Kolom Sendiri)</option>
                <option value="bca">Mutasi e-Statement Bank BCA (CSV)</option>
                <option value="mandiri">Mutasi Bank Mandiri (Excel)</option>
              </select>
            </div>

            {/* Cloud sync section */}
            <div className="pt-6 border-t border-border-light space-y-4">
              <PremiumGate mode="hard" showOverlay>
                <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                  <span>Cloud Sync Manual & Ekspor JSON</span>
                  <span className="flex items-center gap-1 normal-case text-[11px] font-semibold text-on-surface-variant">
                    <MaterialIcon name="history" className="text-xs" /> Terakhir: {formatLastSync(lastSyncTime)}
                  </span>
                </div>

                {pullResult && (
                  <div className={`p-3 rounded-xl border text-xs font-semibold ${pullResult.total > 0 ? 'bg-primary-container/15 border-primary text-primary-color' : 'bg-surface-container border-outline-variant text-on-surface-variant'
                    }`}>
                    {pullResult.total > 0 ? `✓ ${pullResult.total} data baru dari cloud` : 'Tidak ada data baru dari cloud'}
                  </div>
                )}

                {pushResult && (
                  <div className={`p-3 rounded-xl border text-xs font-semibold ${pushResult.success > 0 ? 'bg-success-container/15 border-success text-success' : 'bg-error-container/15 border-error text-error'
                    }`}>
                    {pushResult.error ? `Sync Gagal: ${pushResult.error}` : pushResult.success > 0 ? `✓ ${pushResult.success} data berhasil diunggah` : 'Tidak ada data yang perlu diunggah'}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <button
                    onClick={async () => { setIsPushing(true); setPushResult(null); const r = await syncData(); setPushResult(r); setIsPushing(false); if(r.success >= 0){ const now = Date.now().toString(); localStorage.setItem('last_cloud_sync_time', now); setLastSyncTime(now); } }}
                    disabled={isPushing || pendingSyncCount === 0}
                    className="py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                  >
                    <MaterialIcon name="cloud_upload" className={`text-sm ${isPushing ? "animate-spin" : ""}`} />
                    {isPushing ? 'Menyinkron...' : `Push Data (${pendingSyncCount})`}
                  </button>
                  <button
                    onClick={async () => { setIsPulling(true); setPullResult(null); const r = await pullFromCloud(); setPullResult(r); setIsPulling(false); if(r.total >= 0){ const now = Date.now().toString(); localStorage.setItem('last_cloud_sync_time', now); setLastSyncTime(now); } }}
                    disabled={isPulling}
                    className="py-3 bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                  >
                    <MaterialIcon name="cloud_download" className={`text-primary text-sm ${isPulling ? "animate-spin" : ""}`} />
                    {isPulling ? 'Menarik...' : 'Tarik Cloud'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={exportData}
                    className="py-2.5 bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <MaterialIcon name="download" className="text-sm" /> Ekspor JSON
                  </button>
                  <button
                    onClick={() => importInputRef.current?.click()}
                    disabled={isImporting}
                    className="py-2.5 bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <MaterialIcon name="upload" className="text-sm" /> {isImporting ? 'Memproses...' : 'Restore JSON'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <button
                    onClick={() => {
                      if (!premium.isPremium) {
                        setShowUpgradeModal(true);
                        return;
                      }
                      exportAllDataToExcel({ transactions, assets: assets.map(a => ({ ...a, balance: getAssetBalance?.(a.id) || 0 })), categories });
                    }}
                    className="py-2.5 bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    {!premium.isPremium ? (
                      <MaterialIcon name="workspace_premium" className="text-[14px] text-warning" />
                    ) : (
                      <MaterialIcon name="download" className="text-[14px]" />
                    )}
                    Ekspor Excel (.xlsx)
                  </button>
                  <button
                    onClick={downloadSampleExcel}
                    className="py-2.5 bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <MaterialIcon name="download" className="text-sm" /> Unduh Template Excel
                  </button>
                </div>
              </PremiumGate>
            </div>
          </section>
        </div>

        {/* Kolom Kanan */}
        <div className="flex-1 flex flex-col gap-8 w-full">

          <FamilyManagement />

          {/* Budgeting Mode Card */}
          <section data-tour="pref-budget-mode" className="bg-bg-card p-6 rounded-xl border border-border-light shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">track_changes</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">Mode Budgeting</h3>
            </div>

            <div className="flex flex-col gap-2 p-1 bg-surface-container-low rounded-xl border border-outline-variant/60">
              <button
                type="button"
                onClick={() => setBudgetMode('regular')}
                className={`flex items-center justify-between px-4 py-3 rounded-lg font-label-md transition-all border border-transparent cursor-pointer ${budgetMode === 'regular'
                  ? 'bg-bg-card shadow-sm border-outline-variant text-primary font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
              >
                <span>Batas Pengeluaran Bulanan</span>
                {budgetMode === 'regular' && <MaterialIcon name="check_circle" className="text-xl text-primary" />}
              </button>
              <button
                type="button"
                onClick={() => setBudgetMode('zero-based')}
                className={`flex items-center justify-between px-4 py-3 rounded-lg font-label-md transition-all border border-transparent cursor-pointer ${budgetMode === 'zero-based'
                  ? 'bg-bg-card shadow-sm border-outline-variant text-primary font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
              >
                <span>Zero-Based Budgeting (ZBB)</span>
                {budgetMode === 'zero-based' && <MaterialIcon name="check_circle" className="text-xl text-primary" />}
              </button>
            </div>

            {budgetMode === 'zero-based' && (
              <div className="mt-3 p-4 rounded-xl bg-bg-card border border-outline-variant/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-on-surface">Disiplin ZBB (Strict Mode)</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={zbbMode === 'strict'}
                      onChange={(e) => setZbbMode(e.target.checked ? 'strict' : 'flexible')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-[10px] text-on-surface-variant leading-relaxed">
                  Jika aktif, setiap transaksi wajib dialokasikan. Jika kategori defisit, Anda dipaksa memindahkan saldo anggaran dari kategori lain.
                </p>
              </div>
            )}
          </section>

          {/* Sosial & Fitur Berbagi Card */}
          <section className="bg-bg-card p-6 rounded-xl border border-border-light shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">groups</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">Fitur Sosial &amp; Berbagi</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleMenuClick('contacts')}
                className="p-4 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-center space-y-2 cursor-pointer transition-colors"
              >
                <MaterialIcon name="contact_phone" className="text-2xl text-primary" />
                <div className="font-bold text-xs text-on-surface">Daftar Kontak</div>
              </button>
              <button
                onClick={() => setIsSharedBillsOpen(true)}
                className="p-4 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-center space-y-2 cursor-pointer transition-colors"
              >
                <MaterialIcon name="splitscreen" className="text-2xl text-secondary" />
                <div className="font-bold text-xs text-on-surface">Split Bills</div>
              </button>
              <button
                onClick={() => navigate('/trips')}
                className="p-4 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-center space-y-2 cursor-pointer transition-colors"
              >
                <MaterialIcon name="flight_takeoff" className="text-2xl text-tertiary" />
                <div className="font-bold text-xs text-on-surface">Holiday Trip</div>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => navigate('/debts')}
                className="py-3 px-4 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container font-bold text-xs text-on-surface flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <MaterialIcon name="handshake" className="text-sm" />
                Hutang &amp; Piutang
              </button>
              <button
                onClick={() => handleMenuClick('recurring')}
                className="py-3 px-4 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container font-bold text-xs text-on-surface flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <MaterialIcon name="autorenew" className="text-sm" />
                Jadwal Transaksi Rutin
              </button>
              <button
                onClick={() => handleMenuClick('subscriptions')}
                className="py-3 px-4 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container font-bold text-xs text-on-surface flex items-center justify-center gap-2 cursor-pointer transition-colors col-span-1 sm:col-span-2"
              >
                <MaterialIcon name="credit_card" className="text-sm" />
                Kelola Biaya Langganan ({subscriptions.length})
              </button>
              <button
                onClick={() => handleMenuClick('budgets')}
                className="py-3 px-4 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container font-bold text-xs text-on-surface flex items-center justify-center gap-2 cursor-pointer transition-colors col-span-1 sm:col-span-2"
              >
                <MaterialIcon name="track_changes" className="text-sm" />
                Manajemen Anggaran &amp; Target
              </button>
            </div>
          </section>

          {/* Category Management Card */}
          <section className="bg-bg-card p-6 rounded-xl border border-border-light shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-border-light pb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">category</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Manajemen Kategori</h3>
                <p className="text-xs text-on-surface-variant mt-1">Tambah, edit, atau hapus kategori dan subkategori transaksi Anda.</p>
              </div>
            </div>
            <button
              onClick={() => setShowCategoryManager(true)}
              className="w-full py-3 px-4 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors hover:opacity-90 border-none"
            >
              Buka Manajemen Kategori
              <MaterialIcon name="arrow_forward" className="text-sm" />
            </button>
          </section>


          {/* Tampilan Statistik Card */}
          <section className="bg-bg-card p-6 rounded-xl border border-border-light shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">pie_chart</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">Tampilan Statistik</h3>
            </div>

            <StatsViewSettings
              activeViews={statsCarouselCards}
              onChange={setStatsCarouselCards}
              defaultView={defaultStatsView}
              onDefaultChange={setDefaultStatsView}
            />
          </section>

          {/* Sistem & Preferensi Card */}
          <section data-tour="settings-menu" className="bg-bg-card p-6 rounded-xl border border-border-light shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">settings_applications</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">Sistem &amp; Preferensi</h3>
            </div>

            {/* Notif permission */}
            <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-on-surface">Notifikasi Otomatis</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${notifPermission === 'granted' ? 'bg-primary-container/20 text-primary-color' : 'bg-error-container/20 text-error'
                  }`}>
                  {notifPermission === 'granted' ? 'AKTIF' : 'NONAKTIF'}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Pengingat harian dan laporan mingguan dikirimkan otomatis ke perangkat ini.
              </p>
              {notifPermission !== 'granted' && (
                <button
                  onClick={async () => {
                    const res = await Notification.requestPermission();
                    setNotifPermission(res);
                    if (res === 'granted') setupPushNotifications();
                  }}
                  className="py-2.5 bg-primary text-white rounded-lg font-bold text-xs border-none cursor-pointer hover:opacity-90"
                >
                  Izinkan Notifikasi
                </button>
              )}
            </div>

            {/* System buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={resetAllTutorials}
                className="py-3 px-4 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container font-bold text-xs text-on-surface flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <MaterialIcon name="restart_alt" className="text-sm" />
                Ulangi Semua Tutorial
              </button>
              <button
                onClick={() => handleMenuClick('whats_new')}
                className="py-3 px-4 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container font-bold text-xs text-on-surface flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <MaterialIcon name="new_releases" className="text-sm" />
                Apa yang Baru ✨
              </button>
            </div>

            <div className="flex flex-col gap-2 pt-2 text-center text-xs text-on-surface-variant">
              <div className="font-semibold flex items-center justify-center gap-1 cursor-pointer hover:underline" onClick={() => window.location.href = 'mailto:rizqydaffa14@gmail.com?subject=Bantuan MoneyApp'}>
                <MaterialIcon name="mail" className="text-sm" /> Hubungi Dukungan (rizqydaffa14@gmail.com)
              </div>
              <div className="text-[10px] opacity-75">MoneyApp v2.0.0 • Dibuat dengan ❤️ by Dappal</div>
            </div>

            <button
              onClick={() => showConfirm('Keluar Akun', 'Apakah Anda yakin ingin keluar dari akun ini?', () => logOut(), 'warning', 'Ya, Keluar')}
              className="w-full py-3 bg-error/10 hover:bg-error/20 border border-error/20 text-error font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <MaterialIcon name="logout" className="text-sm" /> Logout
            </button>
          </section>
        </div>
      </div>

      {/* Hidden inputs for backup handler */}
      <input
        ref={importInputRef}
        type="file" accept=".json" style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const validation = await validateFileSecure(file, {
            maxSizeMB: 10, // JSON backups can be slightly larger
            allowedExtensions: ['.json'],
            allowedMimeTypes: ['application/json', 'text/plain', ''], // empty for cases where OS doesn't recognize it
            checkMagicBytes: 'text'
          });

          if (!validation.isValid) {
            showToast(validation.error || 'Format file JSON tidak valid', 'error');
            e.target.value = '';
            return;
          }

          showConfirm(
            'Restore Backup',
            'Ini akan MENGGANTI semua data saat ini dengan data dari file backup. Lanjutkan?',
            async () => {
              try {
                setIsImporting(true);
                await importData(file);
                showToast('Data berhasil diimpor! Halaman akan dimuat ulang.', 'success');
                window.location.reload();
              } catch {
                showToast('File backup tidak valid atau rusak.', 'error');
              } finally {
                setIsImporting(false);
                e.target.value = '';
              }
            },
            'danger',
            'Ya, Restore'
          );
        }}
      />
      <ExcelMappingModal
        isOpen={mappingModalOpen}
        onClose={() => {
          setMappingModalOpen(false);
          setPendingExcelFile(null);
          setIsImportingExcel(false);
          if (excelImportRef.current) excelImportRef.current.value = '';
        }}
        headers={excelHeaders}
        onConfirm={async (mapping) => {
          setMappingModalOpen(false);
          if (!pendingExcelFile) return;
          try {
            const { rows, result } = await parseExcelFile(pendingExcelFile, categories, assets, mapping);
            setExcelResult(result);
            if (rows.length > 0) {
              navigate('/bulk-input', { state: { excelDraftData: rows } });
            }
          } catch (err) {
            setExcelResult({ imported: 0, skipped: 0, errors: [`Gagal membaca file: ${String(err)}`] });
          } finally {
            setIsImportingExcel(false);
            setPendingExcelFile(null);
            if (excelImportRef.current) excelImportRef.current.value = '';
          }
        }}
      />

      <input
        ref={excelImportRef}
        type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const validation = await validateFileSecure(file, {
            maxSizeMB: 5,
            allowedExtensions: ['.xlsx', '.xls', '.csv'],
            allowedMimeTypes: [
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-excel',
              'text/csv',
              '' // Allow empty MIME for CSVs on some systems
            ],
            checkMagicBytes: 'excel'
          });

          if (!validation.isValid) {
            setExcelResult({ imported: 0, skipped: 0, errors: [validation.error || 'Format file Excel/CSV tidak valid'] });
            e.target.value = '';
            return;
          }

          setExcelResult(null);
          setIsImportingExcel(true);

          if (excelMappingPreset === 'custom') {
            try {
              const headers = await extractExcelHeaders(file);
              setExcelHeaders(headers);
              setPendingExcelFile(file);
              setMappingModalOpen(true);
              return; // Wait for modal confirmation
            } catch (err) {
              setExcelResult({ imported: 0, skipped: 0, errors: [`Gagal ekstrak header: ${String(err)}`] });
              setIsImportingExcel(false);
              e.target.value = '';
              return;
            }
          }

          try {
            const presetArg = excelMappingPreset === 'default' ? undefined : excelMappingPreset as 'bca' | 'mandiri';
            const { rows, result } = await parseExcelFile(file, categories, assets, presetArg);
            setExcelResult(result);
            if (rows.length > 0) {
              navigate('/bulk-input', { state: { excelDraftData: rows } });
            }
          } catch (err) {
            setExcelResult({ imported: 0, skipped: 0, errors: [`Gagal membaca file: ${String(err)}`] });
          } finally {
            setIsImportingExcel(false);
            e.target.value = '';
          }
        }}
      />

      <AnimatePresence>
        {activeModal && (
          <motion.div
            className="modal-overlay"
            onClick={() => { setActiveModal(null); setEditingContact(null); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <motion.div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {renderModalContent()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CategoryManagerModal
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
      />

      {/* Global Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText}
      />
      <AssetSelectModal
        isOpen={isAssetSelectOpen}
        onClose={() => setIsAssetSelectOpen(false)}
        assets={assets}
        selectedAssetId={defaultAssetId || ''}
        onSelect={id => setDefaultAssetId(id || null)}
      />

      {/* Shared Bills Manager Modal */}
      <SharedBillsManagerModal 
        isOpen={isSharedBillsOpen}
        onClose={() => setIsSharedBillsOpen(false)}
      />

      <ReauthenticateModal
        isOpen={showReauthModal}
        onClose={() => setShowReauthModal(false)}
        onSuccess={() => {
          setShowReauthModal(false);
          // Auto-trigger the update profile save again now that they are re-authenticated
          const event = new Event('submit', { bubbles: true, cancelable: true });
          handleUpdateProfile(event as any);
        }}
      />

      <AssetSelectModal
        isOpen={isSubAssetSelectOpen}
        onClose={() => setIsSubAssetSelectOpen(false)}
        assets={assets}
        selectedAssetId={newSubAsset}
        onSelect={setNewSubAsset}
      />

      <CategorySelectModal
        isOpen={isSubCatSelectOpen}
        onClose={() => setIsSubCatSelectOpen(false)}
        categories={categories}
        type="pengeluaran"
        initialCategoryId={newSubCat}
        onSelect={(cat) => setNewSubCat(cat)}
      />
      <SharedBillsManagerModal
        isOpen={isSharedBillsOpen}
        onClose={() => setIsSharedBillsOpen(false)}
      />
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => {
          setIsContactModalOpen(false);
          setEditingContact(null);
        }}
        editingContact={contacts.find(c => c.id === editingContact)}
      />
      <OnboardingTutorial
        pageKey="settings"
        steps={[
          { targetSelector: '[data-tour="settings-profile"]', title: '👤 Profil Kamu', description: 'Atur nama, email, dan avatar kamu di sini.', onBeforeShow: () => setActiveModal(null) },
          { targetSelector: '[data-tour="settings-preferences"]', title: '⚙️ Preferensi Aplikasi', description: 'Atur opsi kustomisasi seperti mata uang default, budgeting, dan siklus bulanan di sini.' },
          { targetSelector: '[data-tour="pref-default-wallet"]', title: '💳 Dompet Utama', description: 'Pilih dompet default yang akan terpilih secara otomatis saat membuat transaksi baru.' },
          { targetSelector: '[data-tour="pref-financial-cycle"]', title: '📅 Siklus Finansial', description: 'Atur tanggal gajian atau awal siklus keuangan bulananmu.' },
          { targetSelector: '[data-tour="pref-currency"]', title: '💱 Mata Uang', description: 'Ubah simbol mata uang (seperti Rp, $, dll.) sesuai keinginanmu.' },
          { targetSelector: '[data-tour="pref-budget-mode"]', title: '🎯 Metode Budgeting', description: 'Pilih gaya budgeting: Reguler atau Zero-Based (ZBB).' },
          { targetSelector: '[data-tour="settings-menu"]', title: '🛠️ Pengaturan Lainnya', description: 'Temukan berbagai pengaturan lainnya mulai dari kategori, backup data, hingga mengulang tutorial.' }
        ]}
      />
      <RewardsStoreModal
        isOpen={showRewardsStore}
        onClose={() => setShowRewardsStore(false)}
      />
    </PageWrapper>
  );
};

export default Settings;
