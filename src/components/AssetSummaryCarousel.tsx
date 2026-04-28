import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type CardId =
  | 'net_worth'
  | 'cash_bank'
  | 'savings'
  | 'investment'
  | 'savings_investment'
  | 'net_plus_savings'
  | 'net_plus_all'
  | 'liabilities';

export interface CardDef {
  id: CardId;
  label: string;
  description: string;
  types: string[];   // AssetTypes to include (empty = special case)
  negate?: boolean;  // if true, show absolute value as debt
}

export const ALL_CARD_DEFS: CardDef[] = [
  { id: 'net_worth',          label: 'Kekayaan Bersih',                  description: 'Total semua aset dikurangi hutang', types: [] },
  { id: 'cash_bank',          label: 'Kas & Bank',                        description: 'Tunai, rekening, & dompet digital', types: ['Cash', 'Bank Account', 'eWallet'] },
  { id: 'savings',            label: 'Tabungan',                          description: 'Aset bertipe Tabungan',            types: ['Savings'] },
  { id: 'investment',         label: 'Investasi',                         description: 'Aset bertipe Investasi',           types: ['Investment'] },
  { id: 'savings_investment', label: 'Tabungan + Investasi',              description: 'Gabungan tabungan & investasi',    types: ['Savings', 'Investment'] },
  { id: 'net_plus_savings',   label: 'Kekayaan + Tabungan',               description: 'Kas, bank, e-wallet & tabungan',   types: ['Cash', 'Bank Account', 'eWallet', 'Savings'] },
  { id: 'net_plus_all',       label: 'Kekayaan + Tabungan + Investasi',   description: 'Semua aset produktif',              types: ['Cash', 'Bank Account', 'eWallet', 'Savings', 'Investment'] },
  { id: 'liabilities',        label: 'Total Hutang',                      description: 'Kartu kredit & pinjaman (hutang)', types: ['Credit Card', 'Loan'], negate: true },
];

// ─── Gacha Tiers ─────────────────────────────────────────────────────────────
interface GachaTier {
  name: string;
  emoji: string;
  gradient: string;
  shadowColor: string;
  minVal: number;
}

const GACHA_TIERS: GachaTier[] = [
  { name: 'Kerja Keras dan Hemat Pengeluaran!', emoji: '⬜', gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)', shadowColor: 'rgba(100,116,139,0.3)', minVal: 0 },
  { name: 'Keep on Track! Jangan Boros!', emoji: '🟩', gradient: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)', shadowColor: 'rgba(74,222,128,0.3)', minVal: 1_000_000 },
  { name: 'Semangat 100 juta pertama yuk!', emoji: '🟦', gradient: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)', shadowColor: 'rgba(96,165,250,0.35)', minVal: 10_000_000 },
  { name: 'Kamu harus mulai serius ya!', emoji: '🟪', gradient: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)', shadowColor: 'rgba(192,132,252,0.35)', minVal: 100_000_000 },
  { name: 'Aku kaya! Mou sukoshi dake!', emoji: '🟨', gradient: 'linear-gradient(135deg, #fbbf24 0%, #b45309 100%)', shadowColor: 'rgba(251,191,36,0.4)', minVal: 500_000_000 },
  { name: 'Kamu adalah Miliarder Indonesia', emoji: '🔴', gradient: 'linear-gradient(135deg, #f472b6 0%, #be123c 100%)', shadowColor: 'rgba(244,114,182,0.4)', minVal: 1_000_000_000 },
];

export function getGachaTier(amount: number): GachaTier {
  const abs = Math.abs(amount);
  for (let i = GACHA_TIERS.length - 1; i >= 0; i--) {
    if (abs >= GACHA_TIERS[i].minVal) return GACHA_TIERS[i];
  }
  return GACHA_TIERS[0];
}

// ─── Card value calculation ───────────────────────────────────────────────────
interface Asset {
  id: string;
  type: string;
  isDeleted?: boolean;
  isHidden?: boolean;
}

export function calcCardValue(
  cardId: CardId,
  assets: Asset[],
  balances: Record<string, number>
): number {
  const def = ALL_CARD_DEFS.find(d => d.id === cardId)!;
  // Only exclude deleted assets — isHidden is a visual-only preference, carousel always shows full balance
  const visible = assets.filter(a => !a.isDeleted);

  // net_worth = true net worth: sum ALL asset types (liabilities are already negative in balance)
  if (cardId === 'net_worth') {
    return visible.reduce((s, a) => s + (balances[a.id] || 0), 0);
  }
  if (def.negate) {
    // liabilities: credit cards + loans — return absolute value
    const raw = visible
      .filter(a => def.types.includes(a.type))
      .reduce((s, a) => s + (balances[a.id] || 0), 0);
    return Math.abs(raw);
  }
  // All other type-filtered cards
  return visible
    .filter(a => def.types.includes(a.type))
    .reduce((s, a) => s + (balances[a.id] || 0), 0);
}

// ─── Single Card ──────────────────────────────────────────────────────────────
interface SummaryCardProps {
  def: CardDef;
  value: number;
  currencySymbol: string;
  isPrivateMode: boolean;
  onTogglePrivate: () => void;
  isActive: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  def, value, currencySymbol, isPrivateMode, onTogglePrivate, isActive
}) => {
  const tier = getGachaTier(def.negate ? -value : value);
  const formatted = isPrivateMode
    ? `${currencySymbol} ••••••••`
    : `${currencySymbol}${value.toLocaleString('id-ID')}`;

  return (
    <div style={{
      background: tier.gradient,
      borderRadius: '22px',
      padding: '24px',
      color: 'white',
      width: '100%',
      boxSizing: 'border-box',
      boxShadow: isActive ? `0 16px 40px ${tier.shadowColor}` : `0 8px 24px ${tier.shadowColor}`,
      transition: 'box-shadow 0.4s ease',
      minHeight: '140px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.85, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {def.label}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.65 }}>{def.description}</div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onTogglePrivate(); }}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.75, padding: '4px', flexShrink: 0 }}
        >
          {isPrivateMode ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {/* Amount */}
      <div>
        <div style={{
          fontSize: value > 999_999_999 ? '22px' : value > 99_999_999 ? '26px' : '30px',
          fontWeight: 800,
          letterSpacing: '-1px',
          lineHeight: 1.1,
          marginBottom: '10px',
          transition: 'font-size 0.2s',
        }}>
          {formatted}
        </div>
        {/* Tier badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: 'rgba(0,0,0,0.18)',
          borderRadius: '20px',
          padding: '3px 10px',
          fontSize: '11px',
          fontWeight: 700,
          backdropFilter: 'blur(4px)',
        }}>
          <span>{tier.emoji}</span>
          <span>{tier.name}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Carousel Component ───────────────────────────────────────────────────────
interface AssetSummaryCarouselProps {
  cardIds: CardId[];
  assets: Asset[];
  balances: Record<string, number>;
  currencySymbol: string;
  isPrivateMode: boolean;
  onTogglePrivate: () => void;
}

const AssetSummaryCarousel: React.FC<AssetSummaryCarouselProps> = ({
  cardIds, assets, balances, currencySymbol, isPrivateMode, onTogglePrivate,
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Clamp active index when cardIds change
  useEffect(() => {
    if (activeIdx >= cardIds.length) setActiveIdx(Math.max(0, cardIds.length - 1));
  }, [cardIds.length]);

  const goTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(cardIds.length - 1, idx));
    setIsAnimating(true);
    setActiveIdx(clamped);
    setDragOffset(0);
    setTimeout(() => setIsAnimating(false), 320);
  }, [cardIds.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    // If mostly vertical, don't interfere with page scroll
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dragOffset) < 5) return;
    e.preventDefault();
    setDragOffset(dx);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    const threshold = 50;
    if (dragOffset < -threshold) goTo(activeIdx + 1);
    else if (dragOffset > threshold) goTo(activeIdx - 1);
    else setDragOffset(0);
  };

  if (cardIds.length === 0) return null;

  const defs = cardIds.map(id => ALL_CARD_DEFS.find(d => d.id === id)!).filter(Boolean);

  return (
    <div style={{ marginBottom: '28px', position: 'relative' }}>
      {/* Track */}
      <div
        ref={trackRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ overflow: 'hidden', borderRadius: '22px', touchAction: 'pan-y' }}
      >
        <div style={{
          display: 'flex',
          transform: `translateX(calc(-${activeIdx * 100}% + ${dragOffset}px))`,
          transition: isAnimating || dragOffset === 0 ? 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          willChange: 'transform',
        }}>
          {defs.map((def, i) => (
            <div key={def.id} style={{ minWidth: '100%', padding: '0 1px' }}>
              <SummaryCard
                def={def}
                value={calcCardValue(def.id, assets, balances)}
                currencySymbol={currencySymbol}
                isPrivateMode={isPrivateMode}
                onTogglePrivate={onTogglePrivate}
                isActive={i === activeIdx}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators + arrow hints */}
      {defs.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '6px',
          marginTop: '12px',
        }}>
          {defs.map((d, i) => (
            <button
              key={d.id}
              onClick={() => goTo(i)}
              style={{
                width: i === activeIdx ? '20px' : '6px',
                height: '6px',
                borderRadius: '3px',
                border: 'none',
                background: i === activeIdx ? 'var(--primary)' : 'var(--border-color)',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AssetSummaryCarousel;
