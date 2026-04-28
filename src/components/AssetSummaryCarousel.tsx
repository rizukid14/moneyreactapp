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

// ─── Gacha Tiers (9 tiers) ────────────────────────────────────────────────────
export interface GachaTier {
  rank: string;           // tier rank name (e.g. "Common")
  messages: string[];     // 3 rotating motivational messages
  emoji: string;
  gradient: string;
  shadowColor: string;
  liquidColor: string;    // color of the liquid wave
  minVal: number;
  maxVal: number;         // used for fill % calculation (Infinity for last tier)
}

const GACHA_TIERS: GachaTier[] = [
  {
    rank: 'Bronze',
    messages: [
      '💪 Mulai dari nol itu tidak apa-apa, yang penting terus bergerak!',
      '🌱 Setiap rupiah tersimpan adalah benih yang akan tumbuh!',
      '🚀 Kerja keras + hemat = kebebasan finansial. Kamu bisa!',
    ],
    emoji: '🩶',
    gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
    shadowColor: 'rgba(100,116,139,0.35)',
    liquidColor: 'rgba(148,163,184,0.55)',
    minVal: 0,
    maxVal: 500_000,
  },
  {
    rank: 'Silver',
    messages: [
      '✨ Setengah juta! Fondasi keuanganmu mulai terbentuk!',
      '📈 Kamu di jalur yang benar, jangan berhenti sekarang!',
      '💡 Disiplin kecil setiap hari = hasil besar besok!',
    ],
    emoji: '🥈',
    gradient: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
    shadowColor: 'rgba(148,163,184,0.35)',
    liquidColor: 'rgba(203,213,225,0.55)',
    minVal: 500_001,
    maxVal: 2_500_000,
  },
  {
    rank: 'Gold',
    messages: [
      '🥇 2,5 juta! Kamu lebih baik dari kebanyakan orang seumuranmu!',
      '💰 Terus tabung, masa depan cerah sudah menanti!',
      '🔥 Konsistensimu mulai terasa. Jangan putus di sini!',
    ],
    emoji: '🥇',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
    shadowColor: 'rgba(251,191,36,0.4)',
    liquidColor: 'rgba(251,191,36,0.5)',
    minVal: 2_500_001,
    maxVal: 7_500_000,
  },
  {
    rank: 'Emerald',
    messages: [
      '💚 7,5 juta! Dana daruratmu sudah mulai terbentuk!',
      '🌿 Kamu sedang membangun benteng finansial yang kuat!',
      '🎯 Target 10 juta sudah di depan mata. Ayo kejar!',
    ],
    emoji: '💚',
    gradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
    shadowColor: 'rgba(52,211,153,0.4)',
    liquidColor: 'rgba(52,211,153,0.5)',
    minVal: 7_500_001,
    maxVal: 10_000_000,
  },
  {
    rank: 'Sapphire',
    messages: [
      '💎 10 juta! Selamat — kamu masuk level serius!',
      '📊 Di sini portofolio mulai bermakna. Investasikan dengan bijak!',
      '🌊 Aliran uangmu sudah lebih stabil. Jaga terus!',
    ],
    emoji: '💎',
    gradient: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
    shadowColor: 'rgba(96,165,250,0.4)',
    liquidColor: 'rgba(96,165,250,0.5)',
    minVal: 10_000_001,
    maxVal: 25_000_000,
  },
  {
    rank: 'Ruby',
    messages: [
      '❤️‍🔥 25 juta! Kamu sudah jauh meninggalkan rata-rata!',
      '🏆 Dedikasi finansialmu sungguh luar biasa. Terus berjuang!',
      '🔮 Masa pensiun yang nyaman sudah tidak terlalu jauh!',
    ],
    emoji: '♦️',
    gradient: 'linear-gradient(135deg, #f87171 0%, #b91c1c 100%)',
    shadowColor: 'rgba(248,113,113,0.4)',
    liquidColor: 'rgba(248,113,113,0.5)',
    minVal: 25_000_001,
    maxVal: 50_000_000,
  },
  {
    rank: 'Amethyst',
    messages: [
      '🔮 50 juta! Kamu bermain di liga yang berbeda sekarang!',
      '👑 Pilihan finansialmu yang bijak mulai berbuah nyata!',
      '✨ Setengah dari 100 juta — puncak sudah terlihat!',
    ],
    emoji: '🔮',
    gradient: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)',
    shadowColor: 'rgba(192,132,252,0.4)',
    liquidColor: 'rgba(192,132,252,0.5)',
    minVal: 50_000_001,
    maxVal: 100_000_000,
  },
  {
    rank: 'Diamond',
    messages: [
      '💠 100 juta! Angka yang diimpikan banyak orang, kamu capai!',
      '🦅 Kamu terbang tinggi! Menuju setengah miliar!',
      '🌟 Kekayaanmu bukan keberuntungan — itu hasil kerja kerasmu!',
    ],
    emoji: '💠',
    gradient: 'linear-gradient(135deg, #67e8f9 0%, #0e7490 100%)',
    shadowColor: 'rgba(103,232,249,0.4)',
    liquidColor: 'rgba(103,232,249,0.5)',
    minVal: 100_000_001,
    maxVal: 500_000_000,
  },
  {
    rank: 'Sultan 👑',
    messages: [
      '🤑 Sultan detected! Tolong ajarkan kami caramu!',
      '🏰 500 juta+! Kamu bukan lagi menabung — kamu membangun kerajaan!',
      '🌏 Level Sultan tercapai. Sekarang, warisan apa yang ingin kamu tinggalkan?',
    ],
    emoji: '👑',
    gradient: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 40%, #ef4444 70%, #c026d3 100%)',
    shadowColor: 'rgba(245,158,11,0.5)',
    liquidColor: 'rgba(253,230,138,0.6)',
    minVal: 500_000_001,
    maxVal: Infinity,
  },
];

export function getGachaTier(amount: number): GachaTier {
  const abs = Math.abs(amount);
  for (let i = GACHA_TIERS.length - 1; i >= 0; i--) {
    if (abs >= GACHA_TIERS[i].minVal) return GACHA_TIERS[i];
  }
  return GACHA_TIERS[0];
}

/** Progress within current tier [0–1] */
function getTierFillPercent(amount: number, tier: GachaTier): number {
  if (tier.maxVal === Infinity) return 1;
  const range = tier.maxVal - tier.minVal;
  if (range <= 0) return 1;
  const within = Math.abs(amount) - tier.minVal;
  return Math.min(1, Math.max(0, within / range));
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
  // Only exclude deleted assets — isHidden is a visual-only preference
  const visible = assets.filter(a => !a.isDeleted);

  if (cardId === 'net_worth') {
    return visible.reduce((s, a) => s + (balances[a.id] || 0), 0);
  }
  if (def.negate) {
    const raw = visible
      .filter(a => def.types.includes(a.type))
      .reduce((s, a) => s + (balances[a.id] || 0), 0);
    return Math.abs(raw);
  }
  return visible
    .filter(a => def.types.includes(a.type))
    .reduce((s, a) => s + (balances[a.id] || 0), 0);
}

// ─── Liquid Wave Animation CSS (injected once) ────────────────────────────────
const WAVE_CSS = `
@keyframes _liquid_wave {
  0%   { transform: translateX(0) translateY(0); }
  50%  { transform: translateX(-25%) translateY(-4px); }
  100% { transform: translateX(-50%) translateY(0); }
}
@keyframes _liquid_wave2 {
  0%   { transform: translateX(0) translateY(0); }
  50%  { transform: translateX(-25%) translateY(4px); }
  100% { transform: translateX(-50%) translateY(0); }
}
`;
let waveStyleInjected = false;
function ensureWaveCSS() {
  if (waveStyleInjected) return;
  const s = document.createElement('style');
  s.textContent = WAVE_CSS;
  document.head.appendChild(s);
  waveStyleInjected = true;
}

// ─── Liquid Fill Sub-component ─────────────────────────────────────────────────
const LiquidFill: React.FC<{ fillPercent: number; color: string }> = ({ fillPercent, color }) => {
  useEffect(() => { ensureWaveCSS(); }, []);

  // Animate fill on mount / change
  const [rendered, setRendered] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setRendered(fillPercent), 60);
    return () => clearTimeout(t);
  }, [fillPercent]);

  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: '22px', overflow: 'hidden',
      pointerEvents: 'none', zIndex: 0,
    }}>
      {/* Liquid body */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: `${rendered * 100}%`,
        transition: 'height 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}>
        {/* Wave 1 */}
        <div style={{
          position: 'absolute', top: -20, left: 0,
          width: '200%', height: '40px',
          background: color,
          borderRadius: '40%',
          animation: '_liquid_wave 3.5s linear infinite',
          opacity: 0.8,
        }} />
        {/* Wave 2 (offset phase) */}
        <div style={{
          position: 'absolute', top: -14, left: 0,
          width: '200%', height: '36px',
          background: color,
          borderRadius: '38%',
          animation: '_liquid_wave2 4.5s linear infinite',
          opacity: 0.5,
        }} />
        {/* Fill body below waves */}
        <div style={{
          position: 'absolute',
          top: 20, bottom: 0, left: 0, right: 0,
          background: color,
          opacity: 0.65,
        }} />
      </div>
      {/* Dark vignette at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.12) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
};

// ─── Rotating Message Hook ────────────────────────────────────────────────────
function useRotatingMessage(messages: string[], intervalMs = 4000): string {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * messages.length));
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), intervalMs);
    return () => clearInterval(t);
  }, [messages, intervalMs]);
  return messages[idx];
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
  const absValue = def.negate ? value : value;
  const tier = getGachaTier(def.negate ? -absValue : absValue);
  const fillPercent = getTierFillPercent(absValue, tier);
  const message = useRotatingMessage(tier.messages);

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
      minHeight: '160px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Liquid fill animation layer */}
      <LiquidFill fillPercent={fillPercent} color={tier.liquidColor} />

      {/* Content above liquid */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', justifyContent: 'space-between' }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.9, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {def.label}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>{def.description}</div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onTogglePrivate(); }}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8, padding: '4px', flexShrink: 0 }}
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
            marginBottom: '8px',
            transition: 'font-size 0.2s',
            textShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            {formatted}
          </div>

          {/* Tier badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: 'rgba(0,0,0,0.22)',
            borderRadius: '20px',
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 700,
            backdropFilter: 'blur(4px)',
            marginBottom: '6px',
          }}>
            <span>{tier.emoji}</span>
            <span>{tier.rank}</span>
          </div>

          {/* Rotating motivational message */}
          <div key={message} style={{
            fontSize: '11px',
            opacity: 0.88,
            lineHeight: 1.45,
            fontStyle: 'italic',
            fontWeight: 500,
            animation: 'fadeIn 0.5s ease',
          }}>
            {message}
          </div>
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

      {/* Dot indicators */}
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
