import React, { useState, useRef } from 'react';
import {
  User, Bell, Shield, Moon, CircleHelp, ChevronRight, X, Lock, ShieldCheck,
  Mail, Camera, Tags, Plus, Trash2, Download, Upload, DatabaseBackup,
  LogOut, FileSpreadsheet, AlertCircle, CheckCircle2, Target, RefreshCw,
  Sliders, Wallet, GripVertical, LayoutDashboard, Sparkles, BookUser, Edit2, UserPlus, Save, Search, CreditCard, Calendar, ChevronLeft, Folder, Landmark, Smartphone, PiggyBank, TrendingUp, HandCoins
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney } from '../contexts/MoneyContext';
import { setupPushNotifications } from '../lib/notifications';
import { downloadSampleExcel, parseExcelFile, type ImportResult } from '../lib/excelImport';
import { BudgetManagement } from '../components/BudgetManagement';
import { GoalManagement } from '../components/GoalManagement';
import { QuotaBanner } from '../components/QuotaBanner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { ALL_CARD_DEFS, getGachaTier, calcCardValue } from '../components/AssetSummaryCarousel';
import { useToast } from '../components/common/Toast';
import { changelogData, changelogTypeMeta } from '../data/changelog';
import AssetSelectModal from '../components/modals/AssetSelectModal';
import CategorySelectModal from '../components/modals/CategorySelectModal';

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
        <LayoutDashboard size={18} color="var(--primary)" />
        <span style={{ fontWeight: 700, fontSize: 14 }}>Rekap Aset di Halaman Aset</span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
        Pilih kartu yang tampil di carousel atas. Seret <GripVertical size={12} style={{ verticalAlign: 'middle', display: 'inline' }} /> untuk mengurutkan.
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
                  <GripVertical size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
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
                    <X size={14} />
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
              <Plus size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
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
  { id: 'budget', label: 'Anggaran', description: 'Pantau sisa budget bulanan' },
  { id: 'goals', label: 'Tabungan', description: 'Progres target impian' },
  { id: 'subs', label: 'Langganan', description: 'Biaya rutin bulanan' },
  { id: 'health', label: 'Kesehatan Finansial', description: 'Skor kesehatan finansial' },
  { id: 'forecast', label: 'Proyeksi Kas', description: 'Prediksi saldo 90 hari ke depan' },
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
        <TrendingUp size={18} color="var(--primary)" />
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
              <GripVertical size={16} color="var(--text-muted)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>{def.label}</div>
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
                  <X size={14} />
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
            <Plus size={14} color="var(--primary)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>{def.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{def.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const Settings: React.FC = () => {
  const { showToast } = useToast();
  const { user, updateUser, pin, setAppPin, lockApp, theme, toggleTheme, categories, assets, addCategory, deleteCategory, updateCategory, addSubCategory, deleteSubCategory, updateSubCategory, exportData, importData, addTransaction, logOut, defaultAssetId, setDefaultAssetId, startOfMonthDay, setStartOfMonthDay, currencySymbol, setCurrencySymbol, assetCarouselCards, setAssetCarouselCards, statsCarouselCards, setStatsCarouselCards, defaultStatsView, setDefaultStatsView, chartStyle, setChartStyle, pullFromCloud, contacts, addContact, updateContact, deleteContact, subscriptions, addSubscription, updateSubscription, deleteSubscription, transactions, getAssetBalance, budgetMode, setBudgetMode } = useMoney();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );
  const importInputRef = useRef<HTMLInputElement>(null);
  const excelImportRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [excelResult, setExcelResult] = useState<ImportResult | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullResult, setPullResult] = useState<{ total: number } | null>(null);

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
  // ... existing state ...
  const [tempEmail, setTempEmail] = useState(user.email);
  const [tempAvatar, setTempAvatar] = useState(user.avatar || '');

  // PIN Form State
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Category State
  const [catTab, setCatTab] = useState<'pengeluaran' | 'pendapatan'>('pengeluaran');
  const [newCatName, setNewCatName] = useState('');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [newSubCatName, setNewSubCatName] = useState('');

  // Category & Subcategory Edit State
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingSubCatId, setEditingSubCatId] = useState<string | null>(null);
  const [editingSubCatName, setEditingSubCatName] = useState('');

  // Contact State
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactNote, setNewContactNote] = useState('');
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [budgetTab, setBudgetTab] = useState<'budget' | 'goal'>('budget');

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

  const menuItems = [
    // ... existing menuItems ...
    { id: 'profile', icon: User, label: 'Profil Saya' },
    { id: 'preferences', icon: Sliders, label: 'Preferensi Aplikasi' },
    { id: 'contacts', icon: BookUser, label: 'Kontak' },
    { id: 'categories', icon: Tags, label: 'Manajemen Kategori' },
    { id: 'budgets', icon: Target, label: 'Budgeting & Goals' },
    { id: 'security', icon: Shield, label: 'Keamanan' },
    { id: 'recurring', icon: RefreshCw, label: 'Transaksi Rutin' },
    { id: 'subscriptions', icon: CreditCard, label: 'Langganan (Subs)' },
    { id: 'backup', icon: DatabaseBackup, label: 'Backup & Restore Data' },
    { id: 'whats_new', icon: Sparkles, label: "Apa yang Baru" },
    { id: 'help', icon: CircleHelp, label: 'Bantuan & Dukungan' },
  ];

  const handleMenuClick = (id: string) => {
    // ... existing handleMenuClick ...
    if (id === 'help') {
      window.location.href = 'mailto:rizqydaffa14@gmail.com?subject=Bantuan MoneyApp&body=Halo, saya butuh bantuan terkait...';
      return;
    }
    setActiveModal(id);
    if (id === 'profile') {
      setTempName(user.name);
      setTempEmail(user.email);
      setTempAvatar(user.avatar || '');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... existing handleImageUpload ...
    const file = e.target.files?.[0];
    if (!file) return;

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

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name: tempName, email: tempEmail, avatar: tempAvatar });
    setActiveModal(null);
  };

  const handleSetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 6) {
      setPinError('PIN harus 6 digit');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PIN tidak cocok');
      return;
    }
    setAppPin(newPin);
    setActiveModal(null);
    setNewPin(''); setConfirmPin(''); setPinError('');
    // alert is fine for success usually, or we can make it a Toast. 
    // For now the user asked for all alerts, but maybe just confirm() is enough.
  };

  const handleDisablePin = () => {
    showConfirm(
      'Matikan PIN',
      'Apakah Anda yakin ingin mematikan keamanan PIN?',
      () => {
        setAppPin(null);
        setActiveModal(null);
      },
      'warning',
      'Ya, Matikan'
    );
  };

  const handleAddCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    // Validation: Check if name already exists (case-insensitive, within the same type)
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

    // Validation: Check if name already exists (case-insensitive, within the same type)
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
    setNewSubCatName('');
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

  const { recurringTransactions, deleteRecurringTransaction, updateRecurringTransaction } = useMoney();

  const renderModalContent = () => {
    switch (activeModal) {
      case 'contacts':
        const handleAddContact = (e: React.FormEvent) => {
          e.preventDefault();
          if (!newContactName.trim()) return;
          if (editingContact) {
            updateContact(editingContact, {
              name: newContactName.trim(),
              phone: newContactPhone.trim() || undefined,
              note: newContactNote.trim() || undefined,
            });
            setEditingContact(null);
          } else {
            addContact({
              name: newContactName.trim(),
              phone: newContactPhone.trim() || undefined,
              note: newContactNote.trim() || undefined,
            });
          }
          setNewContactName('');
          setNewContactPhone('');
          setNewContactNote('');
        };

        return (
          <>
            <div className="modal-header">
              <h2 className="subtitle">Daftar Kontak</h2>
              <button className="close-btn" onClick={() => { setActiveModal(null); setEditingContact(null); setNewContactName(''); setNewContactPhone(''); setNewContactNote(''); setContactSearchQuery(''); }}><X /></button>
            </div>

            <div style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: '20px' }}>

              {/* Form Section - Only show when editing or via a toggle if we want to match exactly, 
                  but for Settings it's better to stay accessible. Let's style it to match the modal's add form. */}
              {(editingContact || contacts.length === 0 || newContactName) ? (
                <div style={{
                  padding: '20px',
                  background: 'var(--bg-main)',
                  borderBottom: '1px solid var(--border-color)',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {editingContact ? <Edit2 size={16} /> : <UserPlus size={16} />}
                    {editingContact ? 'Edit Kontak' : 'Tambah Kontak Baru'}
                  </div>
                  <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Nama Kontak</label>
                      <input
                        type="text"
                        value={newContactName}
                        onChange={e => setNewContactName(e.target.value)}
                        placeholder="Masukkan nama..."
                        style={{ width: '100%', marginBottom: 0 }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Nomor Telepon (Opsional)</label>
                      <input
                        type="tel"
                        value={newContactPhone}
                        onChange={e => setNewContactPhone(e.target.value)}
                        placeholder="0812..."
                        style={{ width: '100%', marginBottom: 0 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Catatan (Opsional)</label>
                      <input
                        type="text"
                        value={newContactNote}
                        onChange={e => setNewContactNote(e.target.value)}
                        placeholder="Contoh: Teman SD"
                        style={{ width: '100%', marginBottom: 0 }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      {(editingContact || newContactName) && (
                        <button
                          type="button"
                          onClick={() => { setEditingContact(null); setNewContactName(''); setNewContactPhone(''); setNewContactNote(''); }}
                          className="btn"
                          style={{ flex: 1, margin: 0, background: 'var(--bg-neutral)', color: 'var(--text-muted)', fontWeight: 700 }}
                        >
                          Batal
                        </button>
                      )}
                      <button type="submit" className="btn btn-primary" style={{ flex: 2, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Save size={18} /> {editingContact ? 'Simpan Perubahan' : 'Tambah Kontak'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>DAFTAR KONTAK</span>
                  <button
                    onClick={() => setNewContactName(' ')} // Trick to show form
                    style={{
                      padding: '8px 12px', background: 'var(--bg-income)', color: 'var(--primary)',
                      border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} /> Tambah
                  </button>
                </div>
              )}

              {/* Search Bar */}
              <div style={{ padding: '0 20px', marginBottom: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={18}
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder="Cari kontak..."
                    value={contactSearchQuery}
                    onChange={e => setContactSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 40px',
                      borderRadius: '12px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      fontSize: '14px',
                      marginBottom: 0
                    }}
                  />
                </div>
              </div>

              {/* List Section */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {(() => {
                  const filtered = contacts
                    .filter(c => c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()))
                    .sort((a, b) => a.name.localeCompare(b.name));

                  if (filtered.length === 0) {
                    return (
                      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{contactSearchQuery ? 'Tidak ada hasil' : 'Belum ada kontak'}</div>
                        <div style={{ fontSize: '12px' }}>{contactSearchQuery ? 'Coba kata kunci lain' : 'Tambahkan kontak untuk memudahkan mencatat hutang.'}</div>
                      </div>
                    );
                  }

                  return filtered.map(c => (
                    <div key={c.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 20px',
                      background: editingContact === c.id ? 'var(--bg-income)' : 'transparent',
                      borderBottom: '1px solid var(--border-color)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: 'var(--bg-main)', color: 'var(--text-muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700, flexShrink: 0
                        }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>{c.name}</div>
                          {c.phone && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                              📞 {c.phone}
                            </div>
                          )}
                          {c.note && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                              {c.note}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => {
                          setEditingContact(c.id);
                          setNewContactName(c.name);
                          setNewContactPhone(c.phone || '');
                          setNewContactNote(c.note || '');
                          // Scroll to top
                          const modal = document.querySelector('.modal-content');
                          if (modal) modal.scrollTo({ top: 0, behavior: 'smooth' });
                        }} className="btn-icon" style={{ color: 'var(--primary)', padding: 6 }}>
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => {
                          showConfirm(
                            'Hapus Kontak',
                            `Hapus kontak "${c.name}"? Catatan hutang/piutang yang menggunakan kontak ini tidak akan terhapus.`,
                            () => deleteContact(c.id)
                          );
                        }} className="btn-icon" style={{ color: 'var(--danger)', padding: 6 }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </>
        );

      case 'categories':
        const filteredCats = categories.filter(c => c.type === catTab);
        return (
          <>
            <div className="modal-header">
              <h2 className="subtitle">Kategori</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)}><X /></button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px' }}>
              <button
                type="button"
                onClick={() => setCatTab('pengeluaran')}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '13px',
                  background: catTab === 'pengeluaran' ? 'var(--bg-card)' : 'transparent',
                  color: catTab === 'pengeluaran' ? 'var(--danger)' : 'var(--text-muted)',
                  boxShadow: catTab === 'pengeluaran' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setCatTab('pendapatan')}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '13px',
                  background: catTab === 'pendapatan' ? 'var(--bg-card)' : 'transparent',
                  color: catTab === 'pendapatan' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: catTab === 'pendapatan' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Pendapatan
              </button>
            </div>

            <div style={{ 
              display: 'flex', 
              height: '400px', 
              border: '1px solid var(--border-color)', 
              borderRadius: '16px', 
              overflow: 'hidden',
              marginBottom: '16px',
              background: 'var(--bg-main)'
            }}>
              {/* Left Panel: Categories */}
              <div style={{ 
                flex: 1, 
                borderRight: '1px solid var(--border-color)', 
                overflowY: 'auto',
                padding: '8px 0'
              }}>
                {filteredCats.map(c => {
                  const isActive = expandedCat === c.id;
                  return (
                    <div 
                      key={c.id}
                      onClick={() => setExpandedCat(c.id)}
                      style={{ 
                        padding: '12px 16px',
                        cursor: 'pointer',
                        background: isActive ? 'var(--bg-card)' : 'transparent',
                        borderLeft: `4px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      {editingCatId === c.id ? (
                        <input
                          type="text"
                          value={editingCatName}
                          onChange={e => setEditingCatName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleUpdateCat(c.id, editingCatName);
                            else if (e.key === 'Escape') setEditingCatId(null);
                          }}
                          onClick={e => e.stopPropagation()}
                          autoFocus
                          style={{ margin: 0, padding: '4px 8px', fontSize: '13px', background: 'var(--bg-main)', border: '1px solid var(--primary)', borderRadius: '6px', width: '100%' }}
                        />
                      ) : (
                        <>
                          <span style={{ fontSize: '14px', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--text-main)' : 'var(--text-muted)' }}>{c.name}</span>
                          <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setEditingCatId(c.id); setEditingCatName(c.name); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => showConfirm('Hapus Kategori', `Hapus "${c.name}"?`, () => deleteCategory(c.id))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right Panel: Sub-categories */}
              <div style={{ 
                flex: 1.2, 
                overflowY: 'auto', 
                background: 'var(--bg-card-solid)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {expandedCat ? (
                  <>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.05)' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Sub-kategori: {categories.find(c => c.id === expandedCat)?.name}
                      </span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
                      {(categories.find(c => c.id === expandedCat)?.subcategories || []).map(sub => (
                        <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed var(--border-color)' }}>
                          {editingSubCatId === sub.id ? (
                            <input
                              type="text"
                              value={editingSubCatName}
                              onChange={e => setEditingSubCatName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleUpdateSubCat(expandedCat, sub.id, editingSubCatName);
                                else if (e.key === 'Escape') setEditingSubCatId(null);
                              }}
                              autoFocus
                              style={{ margin: 0, padding: '4px 8px', fontSize: '12px', background: 'var(--bg-card)', border: '1px solid var(--primary)', borderRadius: '6px', width: '100%' }}
                            />
                          ) : (
                            <>
                              <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>{sub.name}</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => { setEditingSubCatId(sub.id); setEditingSubCatName(sub.name); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                  <Edit2 size={12} />
                                </button>
                                <button onClick={() => showConfirm('Hapus Sub-kategori', `Hapus "${sub.name}"?`, () => deleteSubCategory(expandedCat, sub.id))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Add Sub-category Input */}
                    <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={newSubCatName}
                          onChange={e => setNewSubCatName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddSubCat(expandedCat, newSubCatName); }}
                          placeholder="Tambah sub..."
                          style={{ flex: 1, marginBottom: 0, padding: '8px 12px', fontSize: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                        />
                        <button onClick={() => handleAddSubCat(expandedCat, newSubCatName)} className="btn btn-primary" style={{ padding: '0 12px', margin: 0, borderRadius: '8px' }}>
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                    Pilih kategori di kiri untuk mengelola sub-kategori.
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleAddCat} style={{ 
              display: 'flex', 
              gap: '8px', 
              padding: '6px', 
              background: 'rgba(0,0,0,0.1)', 
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              marginTop: '8px'
            }}>
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Buat kategori baru..."
                style={{ 
                  flex: 1, 
                  marginBottom: 0,
                  padding: '10px 14px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  fontSize: '14px'
                }}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ width: '50px', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
                <Plus size={22} />
              </button>
            </form>
          </>
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
                  <Plus size={14} /> Tambah
                </button>
                <button className="close-btn" onClick={() => { setActiveModal(null); setEditingSub(null); }}><X /></button>
              </div>
            </div>

            <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingBottom: 20 }}>
              {/* Summary Card */}
              <div style={{
                margin: '0 20px 20px', padding: '16px',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
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
                        <CreditCard size={10} /> {currencySymbol}{s.amount.toLocaleString('id-ID')} • <Calendar size={10} /> {s.nextBillingDate} ({s.billingCycle === 'monthly' ? 'Bln' : 'Thn'})
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => updateSubscription(s.id, { isActive: !s.isActive })}
                        className="btn-icon"
                        style={{ color: s.isActive ? 'var(--primary)' : 'var(--text-muted)', padding: 6 }}
                      >
                        <RefreshCw size={18} style={{ opacity: s.isActive ? 1 : 0.4 }} />
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
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => showConfirm('Hapus Langganan', `Hapus "${s.name}"?`, () => deleteSubscription(s.id))}
                        className="btn-icon"
                        style={{ color: 'var(--danger)', padding: 6 }}
                      >
                        <Trash2 size={18} />
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
              <button className="close-btn" onClick={() => setActiveModal(null)}><X /></button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Wallet size={18} color="var(--primary)" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Dompet Utama</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAssetSelectOpen(true)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                  borderRadius: '12px', cursor: 'pointer', textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {(() => {
                    const asset = assets.find(a => a.id === defaultAssetId);
                    if (!asset) return <Wallet size={18} color="var(--primary)" />;
                    // Import icons or use a local helper. 
                    // Since we already have Wallet, Landmark, etc. imported or available.
                    let Icon = Wallet;
                    let color = 'var(--primary)';
                    switch (asset.type) {
                      case 'Cash': Icon = Wallet; color = 'var(--secondary)'; break;
                      case 'Bank Account': Icon = Landmark; color = 'var(--primary)'; break;
                      case 'Credit Card': Icon = CreditCard; color = 'var(--danger)'; break;
                      case 'eWallet': Icon = Smartphone; color = 'var(--success)'; break;
                      case 'Savings': Icon = PiggyBank; color = '#3b82f6'; break;
                      case 'Investment': Icon = TrendingUp; color = '#10b981'; break;
                      case 'Loan': Icon = HandCoins; color = 'var(--danger)'; break;
                    }
                    return <Icon size={18} color={color} />;
                  })()}
                  <span style={{ fontWeight: 600, color: defaultAssetId ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {assets.find(a => a.id === defaultAssetId)?.name || 'Pilih Dompet Utama...'}
                  </span>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 8 }}>Digunakan sebagai pilihan otomatis saat mencatat transaksi baru.</p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <RefreshCw size={18} color="var(--primary)" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Siklus Finansial</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Atur tanggal awal bulan finansial Anda (misalnya tanggal gajian).
              </p>
              <div style={{ position: 'relative', marginTop: '12px' }}>
                <select
                  value={startOfMonthDay}
                  onChange={(e) => setStartOfMonthDay(parseInt(e.target.value))}
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
                <Wallet size={18} color="var(--primary)" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Mata Uang & Simbol</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Ubah simbol mata uang yang ditampilkan (Contoh: Rp, $, RM).
              </p>
              <input
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="Simbol Mata Uang..."
                style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: 0 }}
              />
            </div>


            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Moon size={18} color="var(--primary)" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Gaya Grafik Transaksi Harian</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Pilih jenis grafik yang digunakan untuk menampilkan aktivitas pengeluaran harian Anda.
              </p>
              <select
                value={chartStyle}
                onChange={(e) => setChartStyle(e.target.value as 'area' | 'line')}
                style={{ width: '100%', padding: '12px', borderRadius: '12px' }}
              >
                <option value="area">Area Chart (Gradasi & Isian)</option>
                <option value="line">Line Chart (Garis Glowing Premium)</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Target size={18} color="var(--primary)" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Metode Budgeting</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Pilih antara budget reguler atau Zero-Based (Envelope).
              </p>
              <div style={{ 
                display: 'flex', background: 'var(--bg-main)', padding: '4px', 
                borderRadius: '12px', border: '1px solid var(--border-color)' 
              }}>
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
              <button type="button" className="close-btn" onClick={() => setActiveModal(null)}><X size={18} /></button>
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
                    <Camera size={12} style={{ flexShrink: 0, display: 'block' }} />
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
              <button className="close-btn" onClick={() => setActiveModal(null)}><X /></button>
            </div>

            {pin ? (
              <div style={{ textAlign: 'center' }}>
                <ShieldCheck size={48} color="var(--success)" style={{ margin: '0 auto 16px auto' }} />
                <p style={{ marginBottom: '20px', color: 'var(--text-main)', fontWeight: 600 }}>Keamanan PIN Aktif</p>
                <button type="button" onClick={handleDisablePin} className="btn" style={{ backgroundColor: 'var(--bg-expense)', color: 'var(--danger)', marginBottom: '10px', width: '100%' }}>Nonaktifkan PIN</button>
                <button type="button" onClick={lockApp} className="btn btn-primary" style={{ width: '100%' }}>Kunci Sekarang</button>
              </div>
            ) : (
              <form onSubmit={handleSetPin}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <Lock size={48} color="var(--secondary)" style={{ margin: '0 auto 16px auto' }} />
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
              <button className="close-btn" onClick={() => { setActiveModal(null); setExcelResult(null); }}><X /></button>
            </div>

            {/* ── Section 1: JSON Backup ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <DatabaseBackup size={15} color="var(--primary)" />
                <span style={{ fontWeight: 700, fontSize: 13 }}>Backup JSON (Full Data)</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Ekspor semua data (transaksi, aset, kategori, pengaturan) ke file .json untuk restore penuh.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onClick={exportData}
                >
                  <Download size={15} /> Ekspor Backup (.json)
                </button>
                <button
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--border-color)', color: 'var(--text-main)' }}
                  onClick={() => importInputRef.current?.click()}
                  disabled={isImporting}
                >
                  <Upload size={15} /> {isImporting ? 'Mengimpor...' : 'Restore Backup (.json)'}
                </button>
              </div>
            </div>

            {/* ── Section 1.5: Pull from Cloud ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <RefreshCw size={15} color="var(--secondary)" />
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
                <RefreshCw size={15} style={{ animation: isPulling ? 'spin 1s linear infinite' : 'none' }} />
                {isPulling ? 'Menarik data...' : 'Tarik Data dari Cloud'}
              </button>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0 20px' }} />

            {/* ── Section 2: Excel Import ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <FileSpreadsheet size={15} color="hsl(152,70%,42%)" />
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
                      ? <CheckCircle2 size={15} color="var(--success)" />
                      : <AlertCircle size={15} color="var(--danger)" />}
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
                  <FileSpreadsheet size={15} /> {isImportingExcel ? 'Memproses...' : 'Import Excel (.xlsx / .xls)'}
                </button>
                <button
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--bg-neutral)', color: 'var(--text-muted)', border: '1px dashed var(--border-color)' }}
                  onClick={downloadSampleExcel}
                >
                  <Download size={15} /> Download Contoh Format Excel
                </button>
              </div>
            </div>

            {/* Hidden inputs handled in parent to keep render clean */}
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
            category: newSubCat || 'Lainnya',
            assetId: newSubAsset,
            isActive: true,
          };
          if (editingSub) {
            updateSubscription(editingSub, subData);
          } else {
            addSubscription(subData);
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
                  <ChevronLeft size={20} />
                </button>
                <h2 className="subtitle" style={{ margin: 0 }}>{editingSub ? 'Edit Langganan' : 'Tambah Langganan'}</h2>
              </div>
              <button className="close-btn" onClick={() => { setActiveModal(null); setEditingSub(null); }}><X /></button>
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
                      <input
                        type="number" placeholder="0"
                        value={newSubAmount} onChange={e => setNewSubAmount(e.target.value)}
                        style={{ width: '100%', paddingLeft: 36, marginBottom: 0 }} required
                      />
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Siklus</label>
                    <select
                      value={newSubCycle} onChange={e => setNewSubCycle(e.target.value as any)}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: 14, fontWeight: 600 }}
                    >
                      <option value="monthly">Bulanan</option>
                      <option value="yearly">Tahunan</option>
                    </select>
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
                      <Folder size={18} color="var(--primary)" />
                      <span style={{ fontWeight: 600, color: newSubCat ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {newSubCat || 'Pilih Kategori...'}
                      </span>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
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
                      <Wallet size={18} color="var(--primary)" />
                      <span style={{ fontWeight: 600, color: newSubAsset ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {assets.find(a => a.id === newSubAsset)?.name || 'Pilih Dompet...'}
                      </span>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </button>
                </div>

                <div style={{ marginTop: 8 }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '14px', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Save size={18} /> {editingSub ? 'Simpan Perubahan' : 'Tambah Langganan'}
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
              <button className="close-btn" onClick={() => setActiveModal(null)}><X /></button>
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
                          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>{rt.note || rt.category}</div>
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
                            <Trash2 size={16} />
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
              <button className="close-btn" onClick={() => setActiveModal(null)}><X /></button>
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
              <button className="close-btn" onClick={() => setActiveModal(null)}><X /></button>
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
                Money Tracker v1.0.16 · Made with ❤️
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="page" style={{ paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="title" style={{ margin: 0 }}>Settings</h1>
      </div>

      <QuotaBanner />

      <div className="card" style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '28px',
          backgroundColor: 'var(--primary)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          color: 'white', marginRight: '16px',
          fontSize: '20px', fontWeight: 700,
          overflow: 'hidden'
        }}>
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h2 className="subtitle" style={{ margin: 0, fontSize: '18px' }}>{user.name}</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{user.email}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '8px 16px' }}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === menuItems.length - 1;
          return (
            <React.Fragment key={item.id}>
              <div onClick={() => handleMenuClick(item.id)} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 0',
                borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
                cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Icon size={20} color={item.id === 'security' && pin ? 'var(--success)' : 'var(--text-muted)'} style={{ marginRight: '16px' }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.id === 'security' && pin && <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: 700 }}>AKTIF</span>}
                  <ChevronRight size={20} color="var(--text-muted)" />
                </div>
              </div>

              {/* Tema Row - Inserted after Security */}
              {item.id === 'security' && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 0',
                  borderBottom: '1px solid var(--border-color)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Moon size={20} color="var(--text-muted)" style={{ marginRight: '16px' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Tema Gelap</span>
                  </div>
                  <div
                    onClick={toggleTheme}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px',
                      backgroundColor: theme === 'dark' ? 'var(--primary)' : 'var(--border-color)',
                      display: 'flex', alignItems: 'center', padding: '0 2px',
                      cursor: 'pointer', transition: 'all 0.3s'
                    }}>
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '10px',
                      backgroundColor: 'white',
                      transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ marginTop: '24px', padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Bell size={18} color="var(--text-muted)" style={{ marginRight: '12px' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Notifikasi Otomatis</span>
          </div>
          <span style={{
            fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 700,
            backgroundColor: notifPermission === 'granted' ? 'var(--success-glow)' : 'var(--danger-glow)',
            color: notifPermission === 'granted' ? 'var(--success)' : 'var(--danger)'
          }}>
            {notifPermission === 'granted' ? 'AKTIF' : 'NONAKTIF'}
          </span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
          Pengingat harian dan laporan mingguan dikirimkan otomatis ke perangkat ini.
          {notifPermission !== 'granted' && " Klik untuk mengaktifkan izin notifikasi."}
        </p>
        {notifPermission !== 'granted' && (
          <button
            onClick={async () => {
              const res = await Notification.requestPermission();
              setNotifPermission(res);
              if (res === 'granted') {
                setupPushNotifications();
              }
            }}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '12px', padding: '8px', fontSize: '12px' }}
          >
            Aktifkan Izin Notifikasi
          </button>
        )}
      </div>

      <div className="card" style={{
        marginTop: '16px',
        textAlign: 'center',
        backgroundColor: 'var(--bg-main)',
        borderColor: 'var(--border-color)',
        borderStyle: 'solid',
        borderWidth: '1px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: 700 }}>
          <Mail size={18} />
          Hubungi Dukungan
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>rizqydaffa14@gmail.com</p>
      </div>

      <div style={{ marginTop: '24px', paddingBottom: '20px' }}>
        <button
          onClick={() => {
            showConfirm(
              'Keluar Akun',
              'Apakah Anda yakin ingin keluar dari akun ini?',
              () => logOut(),
              'warning',
              'Ya, Keluar'
            );
          }}
          className="btn"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'var(--bg-expense)',
            color: 'var(--danger)',
            padding: '12px',
            borderRadius: '12px',
            fontWeight: 700,
            border: '1px solid var(--danger-glow)'
          }}
        >
          <LogOut size={20} /> Logout dari Akun
        </button>
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px' }}>
          MoneyApp v1.0.16 • Dibuat dengan ❤️ by Dappal
        </p>
      </div>

      {/* Hidden inputs for backup handler */}
      <input
        ref={importInputRef}
        type="file" accept=".json" style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
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
      <input
        ref={excelImportRef}
        type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setExcelResult(null);
          setIsImportingExcel(true);
          try {
            const { rows, result } = await parseExcelFile(file, categories, assets);
            if (rows.length > 0) {
              for (const tx of rows) addTransaction(tx);
            }
            setExcelResult(result);
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
            onClick={() => setActiveModal(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <motion.div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 600, mass: 0.5 }}
            >
              {renderModalContent()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        initialCategory={newSubCat}
        onSelect={(cat) => setNewSubCat(cat)}
      />
    </div>
  );
};

export default Settings;
