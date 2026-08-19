import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MaterialIcon from '../common/MaterialIcon';
import { useInsightData } from '../../hooks/useInsightData';
import { formatCurrency } from '../../lib/utils';
import { useMoney } from '../../contexts/MoneyContext';
import { usePremium } from '../../contexts/PremiumContext';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';

interface InsightStoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOTAL_SLIDES = 8;
const SLIDE_DURATION_MS = 5000;

export const InsightStoriesModal: React.FC<InsightStoriesModalProps> = ({ isOpen, onClose }) => {
  const { 
    monthYearLabel, daysToEOM, totalIncome, totalExpense, netSavings, savingsRate,
    topExpenses, topIncomes, topAssets, score, statusText, statusColor, statusBg, findings,
    summarySentence, budgetRecommendations, isPremium, aiReviewText, isAiLoading, aiError, fetchAIReview
  } = useInsightData();

  const { currencySymbol } = useMoney();
  const { setShowUpgradeModal } = usePremium();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const progressTimerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Prefetch AI Review immediately when modal opens if user is Premium
  useEffect(() => {
    if (isOpen && isPremium) {
      fetchAIReview();
    }
  }, [isOpen, isPremium, fetchAIReview]);

  // Handle Progress & Auto-advance
  useEffect(() => {
    if (!isOpen || isPaused) return;

    const interval = 50; // Update progress every 50ms
    startTimeRef.current = Date.now() - (progress / 100) * SLIDE_DURATION_MS;

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / SLIDE_DURATION_MS) * 100);
      setProgress(pct);

      if (pct >= 100) {
        if (currentSlide < TOTAL_SLIDES - 1) {
          setCurrentSlide(prev => prev + 1);
          setProgress(0);
        } else {
          // Last slide finished
          clearInterval(progressTimerRef.current);
          onClose();
        }
      }
    }, interval);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isOpen, isPaused, currentSlide, progress, onClose]);

  // Reset state and lock body scroll on open
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      setProgress(0);
      setIsPaused(false);

      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentSlide < TOTAL_SLIDES - 1) {
      setCurrentSlide(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
      setProgress(0);
    }
  };

  // Swipe gestures
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev
  });

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md overflow-hidden select-none"
      >
        {/* Main Stories Card Container */}
        <div
          {...swipeHandlers}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          className="relative w-full h-full max-w-md max-h-[92vh] sm:rounded-3xl bg-slate-950 text-white flex flex-col overflow-hidden shadow-2xl border border-white/10"
        >
          {/* Background Ambient Glow */}
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-emerald-600/30 rounded-full blur-3xl pointer-events-none" />

          {/* Header Controls (Progress Bars & Profile Info) */}
          <div className="relative z-20 p-4 pb-2 space-y-3 bg-gradient-to-b from-black/80 to-transparent">
            {/* Top Segmented Progress Bar */}
            <div className="flex gap-1.5 w-full">
              {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => {
                let barWidth = '0%';
                if (idx < currentSlide) barWidth = '100%';
                else if (idx === currentSlide) barWidth = `${progress}%`;

                return (
                  <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-75 ease-linear"
                      style={{ width: barWidth }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Title & Close Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-xs font-bold shadow-md">
                  ✨
                </div>
                <div>
                  <h3 className="text-xs font-bold leading-tight">Insight AI — {monthYearLabel}</h3>
                  <p className="text-[10px] text-slate-300 font-medium">Evaluasi EOM ({daysToEOM} hari lagi)</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer border-none"
              >
                <MaterialIcon name="close" className="text-sm" />
              </button>
            </div>
          </div>

          {/* Slide Content Container */}
          <div className="relative z-10 flex-1 p-6 flex flex-col justify-between overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col justify-between"
              >
                {/* ─── SLIDE 0: Arus Kas ─────────────────────────────── */}
                {currentSlide === 0 && (
                  <div className="space-y-6 my-auto">
                    <div className="text-center space-y-1">
                      <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-extrabold uppercase tracking-wider">
                        Slide 1 / 8
                      </span>
                      <h2 className="text-2xl font-black tracking-tight text-white mt-2">Ringkasan Arus Kas 🗓️</h2>
                      <p className="text-xs text-slate-300">Periode {monthYearLabel}</p>
                    </div>

                    <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                          <MaterialIcon name="arrow_downward" className="text-emerald-400 text-sm" /> Pemasukan
                        </span>
                        <span className="text-sm font-bold text-emerald-400">
                          {formatCurrency(totalIncome, currencySymbol)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: '100%' }} />
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                          <MaterialIcon name="arrow_upward" className="text-rose-400 text-sm" /> Pengeluaran
                        </span>
                        <span className="text-sm font-bold text-rose-400">
                          {formatCurrency(totalExpense, currencySymbol)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-rose-400 rounded-full" 
                          style={{ width: totalIncome > 0 ? `${Math.min(100, (totalExpense / totalIncome) * 100)}%` : '100%' }} 
                        />
                      </div>
                    </div>

                    {/* Net Savings Badge */}
                    <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 p-4 rounded-2xl text-center space-y-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">Tabungan Bersih (Net Savings)</span>
                      <p className="text-2xl font-black text-white">
                        {netSavings >= 0 ? '+' : ''}{formatCurrency(netSavings, currencySymbol)}
                      </p>
                      <p className="text-xs text-emerald-200 font-semibold">
                        Savings Rate: <span className="font-extrabold text-white">{savingsRate}%</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* ─── SLIDE 1: Top Pengeluaran ──────────────────────── */}
                {currentSlide === 1 && (
                  <div className="space-y-5 my-auto">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-extrabold uppercase tracking-wider">
                        Slide 2 / 8
                      </span>
                      <h2 className="text-2xl font-black tracking-tight text-white mt-2">Top Pengeluaran 📊</h2>
                      <p className="text-xs text-slate-300">Pos pengeluaran terbesar bulan ini</p>
                    </div>

                    <div className="space-y-3">
                      {topExpenses.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-8">Belum ada catatan pengeluaran.</p>
                      ) : (
                        topExpenses.map((exp, idx) => (
                          <div key={exp.id || idx} className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1.5">
                            <div className="flex justify-between items-center text-xs font-bold">
                              <span className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] flex items-center justify-center font-extrabold">
                                  {idx + 1}
                                </span>
                                {exp.name}
                              </span>
                              <span className="text-rose-300">{formatCurrency(exp.amount, currencySymbol)} ({exp.percentage}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full" 
                                style={{ width: `${exp.percentage}%` }} 
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ─── SLIDE 2: Top Pendapatan ───────────────────────── */}
                {currentSlide === 2 && (
                  <div className="space-y-5 my-auto">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
                        Slide 3 / 8
                      </span>
                      <h2 className="text-2xl font-black tracking-tight text-white mt-2">Top Pendapatan 💰</h2>
                      <p className="text-xs text-slate-300">Sumber pemasukan terbanyak bulan ini</p>
                    </div>

                    <div className="space-y-3">
                      {topIncomes.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-8">Belum ada catatan pemasukan.</p>
                      ) : (
                        topIncomes.map((inc, idx) => (
                          <div key={inc.id || idx} className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1.5">
                            <div className="flex justify-between items-center text-xs font-bold">
                              <span className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] flex items-center justify-center font-extrabold">
                                  {idx + 1}
                                </span>
                                {inc.name}
                              </span>
                              <span className="text-emerald-300">{formatCurrency(inc.amount, currencySymbol)} ({inc.percentage}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" 
                                style={{ width: `${inc.percentage}%` }} 
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ─── SLIDE 3: Aset Teraktif ─────────────────────────── */}
                {currentSlide === 3 && (
                  <div className="space-y-5 my-auto">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-extrabold uppercase tracking-wider">
                        Slide 4 / 8
                      </span>
                      <h2 className="text-2xl font-black tracking-tight text-white mt-2">Aset Paling Aktif 🏦</h2>
                      <p className="text-xs text-slate-300">Aset dengan frekuensi transaksi tertinggi</p>
                    </div>

                    <div className="space-y-3">
                      {topAssets.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-8">Belum ada transaksi di aset mana pun.</p>
                      ) : (
                        topAssets.map((ast, idx) => (
                          <div key={ast.id || idx} className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center">
                                <MaterialIcon name="account_balance_wallet" className="text-lg" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-white">{ast.name}</h4>
                                <span className="text-[10px] text-slate-400 font-medium">{ast.type} · {ast.txCount} Transaksi</span>
                              </div>
                            </div>
                            <span className="text-xs font-black text-sky-300">
                              {formatCurrency(ast.balance, currencySymbol)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ─── SLIDE 4: Health Score & Findings ──────────────── */}
                {currentSlide === 4 && (
                  <div className="space-y-5 my-auto text-center">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-extrabold uppercase tracking-wider">
                        Slide 5 / 8
                      </span>
                      <h2 className="text-2xl font-black tracking-tight text-white mt-2">Skor Kesehatan 🩺</h2>
                      <p className="text-xs text-slate-300">Audit otomatis kondisi finansialmu</p>
                    </div>

                    {/* Score Circle */}
                    <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                      <div 
                        className={`absolute inset-0 rounded-full border-4 border-current ${statusColor}`}
                        style={{
                          clipPath: `inset(0 0 0 0)`
                        }}
                      />
                      <div className="text-center">
                        <span className="text-3xl font-black text-white">{score}</span>
                        <span className="text-[10px] block font-bold text-slate-400">/ 100</span>
                      </div>
                    </div>

                    <span className={`inline-block px-4 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${statusBg} ${statusColor}`}>
                      Status: {statusText}
                    </span>

                    {/* Findings Bullet Points */}
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-left space-y-2">
                      <h4 className="text-xs font-bold text-slate-300">Catatan Temuan AI:</h4>
                      {findings.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-200">
                          <MaterialIcon name="check_circle" className="text-emerald-400 text-sm shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── SLIDE 5: Rekomendasi Budget ────────────────────── */}
                {currentSlide === 5 && (
                  <div className="space-y-5 my-auto">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                        Slide 6 / 8
                      </span>
                      <h2 className="text-2xl font-black tracking-tight text-white mt-2">Rekomendasi Budget 🎯</h2>
                      <p className="text-xs text-slate-300">Saran penyesuaian limit untuk bulan berikutnya</p>
                    </div>

                    <div className="space-y-3">
                      {budgetRecommendations.length === 0 ? (
                        <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/30 text-center space-y-2">
                          <MaterialIcon name="verified" className="text-3xl text-emerald-400" />
                          <h4 className="text-xs font-bold text-emerald-300">Budget Sangat Ideal!</h4>
                          <p className="text-xs text-slate-300">
                            Semua pengeluaranmu terkontrol dalam batas anggaran yang sehat.
                          </p>
                        </div>
                      ) : (
                        budgetRecommendations.map((rec, idx) => (
                          <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="flex items-center gap-1.5 text-amber-300">
                                <MaterialIcon name="lightbulb" className="text-sm text-amber-400" />
                                {rec.categoryName}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-300">
                                {rec.type === 'over_budget' ? 'Over Limit' : 'Belum Ada Budget'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed font-medium">
                              {rec.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ─── SLIDE 6: AI Review (Blur for Free, Full for Pro) ── */}
                {currentSlide === 6 && (
                  <div className="space-y-5 my-auto relative">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-extrabold uppercase tracking-wider">
                        Slide 7 / 8
                      </span>
                      <h2 className="text-2xl font-black tracking-tight text-white mt-2">AI Review & Evaluasi 🤖</h2>
                      <p className="text-xs text-slate-300">Analisis mendalam dari MoneyBot AI</p>
                    </div>

                    {!isPremium ? (
                      /* Free User: Blurred Teaser + Upgrade CTA */
                      <div className="relative overflow-hidden rounded-2xl border border-white/20 p-6 bg-white/5 space-y-4">
                        <div className="filter blur-sm select-none space-y-3 opacity-60">
                          <p className="text-xs leading-relaxed text-slate-200">
                            Berdasarkan analisis pola pengeluaran bulan ini, pengeluaran impulsif pada kategori restoran meningkat 35%. Disarankan untuk mengalokasikan sisa kas ke dana cadangan...
                          </p>
                          <p className="text-xs leading-relaxed text-slate-200">
                            Rekomendasi alokasi pendapatan bulan depan: 50% kebutuhan utama, 30% tabungan/investasi, 20% gaya hidup.
                          </p>
                        </div>

                        {/* Paywall Overlay */}
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center shadow-lg">
                            <MaterialIcon name="lock" className="text-2xl text-slate-950" />
                          </div>
                          <h4 className="text-sm font-bold text-white">Khusus Fitur Pro</h4>
                          <p className="text-xs text-slate-300 max-w-xs">
                            Dapatkan evaluasi naratif berbasis AI cerdas untuk optimasi keuangan bulananmu.
                          </p>
                          <button
                            onClick={() => {
                              onClose();
                              setShowUpgradeModal(true);
                            }}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-rose-500 text-slate-950 font-black text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none"
                          >
                            Upgrade ke Pro ✨
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Pro User: AI Response Content (Instant fallback + smooth AI injection + scrollable) */
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3 max-h-[55vh] overflow-y-auto min-h-[180px] flex flex-col justify-between shadow-inner">
                        {isAiLoading && (
                          <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold border-b border-white/10 pb-2">
                            <span className="flex items-center gap-1.5 animate-pulse">
                              <MaterialIcon name="auto_awesome" className="text-xs" />
                              Sedang menyempurnakan dengan AI...
                            </span>
                            <div className="w-3 h-3 rounded-full border-2 border-amber-300 border-t-transparent animate-spin" />
                          </div>
                        )}
                        {aiError && (
                          <div className="flex items-center gap-1 text-[10px] text-rose-300 font-medium">
                            <MaterialIcon name="info" className="text-xs" />
                            {aiError} (Menampilkan analisis lokal)
                          </div>
                        )}
                        <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-line font-medium flex-1 pt-1 overflow-y-auto">
                          {aiReviewText || summarySentence}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── SLIDE 7: Tips & Closing ────────────────────────── */}
                {currentSlide === 7 && (
                  <div className="space-y-6 my-auto text-center">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
                        Slide 8 / 8
                      </span>
                      <h2 className="text-2xl font-black tracking-tight text-white mt-2">Siap Menyambut Bulan Baru! 🚀</h2>
                      <p className="text-xs text-slate-300">Terus tingkatkan kedisiplinan finansialmu</p>
                    </div>

                    <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3 text-left max-h-[45vh] overflow-y-auto">
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">1</span>
                        <p className="text-xs text-slate-200">Kunci anggaran bulan depan sebelum mulai belanja.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">2</span>
                        <p className="text-xs text-slate-200">Utamakan mengalokasikan 20% pemasukan ke tabungan awal.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">3</span>
                        <p className="text-xs text-slate-200">Disiplin mencatat setiap pengeluaran sekecil apa pun.</p>
                      </div>
                    </div>

                    <button
                      onClick={onClose}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-sm shadow-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none"
                    >
                      Selesai & Tutup Story ✨
                    </button>
                  </div>
                )}

                {/* Footer Tap Navigation Hint */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium pt-4 border-t border-white/10">
                  <span onClick={handlePrev} className="cursor-pointer hover:text-white flex items-center gap-0.5">
                    ‹ Tap Kiri (Sebelumnya)
                  </span>
                  <span onClick={handleNext} className="cursor-pointer hover:text-white flex items-center gap-0.5">
                    Tap Kanan (Lanjut) ›
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Left/Right Tap Target Areas for Navigation (Edge 15% only so 70% center is scrollable) */}
          <div
            onClick={handlePrev}
            className="absolute top-16 left-0 bottom-12 w-[15%] z-20 cursor-pointer"
            aria-label="Previous slide"
          />
          <div
            onClick={handleNext}
            className="absolute top-16 right-0 bottom-12 w-[15%] z-20 cursor-pointer"
            aria-label="Next slide"
          />
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default InsightStoriesModal;
