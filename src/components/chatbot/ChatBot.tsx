import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Check, AlertCircle, Mic, Square, ArrowRight, Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney } from '../../contexts/MoneyContext';
import { useToast } from '../common/Toast';
import { getLocalDate, getLocalTime } from '../../lib/utils';
import CategorySelectModal from '../modals/CategorySelectModal';
import AssetSelectModal from '../modals/AssetSelectModal';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCall?: {
    name: string;
    arguments: any;
  };
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Halo! Saya MoneyBot. Ada yang bisa saya bantu tentang MoneyApp atau pencatatan keuanganmu hari ini?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const speechBaseRef = useRef('');
  const finalTranscriptRef = useRef('');

  // States for custom selection modals
  const [activeSelectCategoryMsgIdx, setActiveSelectCategoryMsgIdx] = useState<number | null>(null);
  const [categoryModalType, setCategoryModalType] = useState<'pengeluaran' | 'pendapatan'>('pengeluaran');
  const [categorySelectCallback, setCategorySelectCallback] = useState<((categoryName: string, subCategoryName: string) => void) | null>(null);
  
  const [activeSelectAssetMsgIdx, setActiveSelectAssetMsgIdx] = useState<number | null>(null);
  const [assetSelectCallback, setAssetSelectCallback] = useState<((assetId: string) => void) | null>(null);
  
  const { 
    categories, assets, transactions, contacts, getAssetBalance, addTransaction, addDebt, 
    currencySymbol, isChatOpen, setIsChatOpen,
    recurringTransactions, subscriptions, budgetMode, monthlyIncome, zbbMode,
    startOfMonthDay, budgets, goals, addBudget, updateBudget, addSubscription,
    addRecurringTransaction
  } = useMoney();
  const { showToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getDaysToEOM = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1; // 1-indexed
    const year = today.getFullYear();

    const startDay = startOfMonthDay || 1;
    let endYear = year;
    let endMonth = month;
    let endDay = startDay - 1;

    if (startDay === 1) {
      const lastDayOfCalMonth = new Date(year, month, 0).getDate();
      endDay = lastDayOfCalMonth;
    } else {
      if (day >= startDay) {
        endMonth = month + 1;
        if (endMonth > 12) {
          endMonth = 1;
          endYear = year + 1;
        }
      }
    }

    const eomDate = new Date(endYear, endMonth - 1, endDay);
    const todayDate = new Date(year, month - 1, day);
    const diffTime = eomDate.getTime() - todayDate.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { days, dateStr: `${endDay}/${endMonth}/${endYear}` };
  };

  const getCurrentFinancialMonthDates = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1; // 1-12
    const year = today.getFullYear();
    const startDay = startOfMonthDay || 1;

    let startYear = year;
    let startMonth = month;
    let endYear = year;
    let endMonth = month;
    let endDay = startDay - 1;

    if (startDay === 1) {
      endDay = new Date(year, month, 0).getDate();
    } else {
      if (day >= startDay) {
        endMonth = month + 1;
        if (endMonth > 12) {
          endMonth = 1;
          endYear = year + 1;
        }
      } else {
        startMonth = month - 1;
        if (startMonth < 1) {
          startMonth = 12;
          startYear = year - 1;
        }
      }
    }

    const format = (y: number, m: number, d: number) => 
      `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    return {
      startDateStr: format(startYear, startMonth, startDay),
      endDateStr: format(endYear, endMonth, endDay)
    };
  };

  const triggerEOMReview = async () => {
    setIsLoading(true);
    const { dateStr } = getDaysToEOM();
    const { startDateStr, endDateStr } = getCurrentFinancialMonthDates();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Tolong berikan evaluasi dan nasihat akhir bulan saya berdasarkan transaksi dari tanggal ${startDateStr} sampai ${endDateStr}.` }],
          categories: categories.filter(c => !c.isDeleted),
          assets: assets
            .filter(a => !a.isDeleted && !['Credit Card', 'Loan'].includes(a.type))
            .map(a => ({
              ...a,
              balance: getAssetBalance(a.id)
            })),
          transactions: [...transactions]
            .filter(t => ['pengeluaran', 'pendapatan', 'transfer'].includes(t.type))
            .filter(t => t.date >= startDateStr && t.date <= endDateStr)
            .sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''))
            .map(t => ({
              type: t.type,
              amount: t.amount,
              category: t.category,
              note: t.note,
              date: t.date
            })),
          contacts: contacts.map(c => ({ name: c.name })),
          recurringTransactions: recurringTransactions.filter(rt => rt.isActive).map(rt => ({
            type: rt.type,
            amount: rt.amount,
            category: rt.category,
            frequency: rt.frequency,
            startDate: rt.startDate,
            note: rt.note
          })),
          subscriptions: subscriptions.filter(s => s.isActive).map(s => ({
            name: s.name,
            amount: s.amount,
            billingCycle: s.billingCycle,
            nextBillingDate: s.nextBillingDate
          })),
          budgetMode,
          monthlyIncome,
          zbbMode,
          startOfMonthDay: startOfMonthDay || 1,
          currentDate: getLocalDate(),
          currentTime: getLocalTime(),
          budgets,
          goals,
          appKnowledge: {
            currentVersion: 'v1.0.18',
            latestFeatures: []
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Failed to fetch from chat API');
      }

      const data = await response.json();
      
      setMessages([
        { role: 'assistant', content: `Halo! Karena hari ini mendekati akhir bulan finansialmu (${dateStr}), saya telah menganalisis keuangan bulananmu secara otomatis:` },
        { role: 'assistant', content: data.content }
      ]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Maaf, gagal membuat evaluasi akhir bulan otomatis.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  useEffect(() => {
    if (isChatOpen && messages.length === 1) {
      const { days } = getDaysToEOM();
      if (days >= 0 && days <= 5) {
        triggerEOMReview();
      }
    }
  }, [isChatOpen, messages.length]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = { role: 'user', content: textToSend };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const { startDateStr, endDateStr } = getCurrentFinancialMonthDates();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          categories: categories.filter(c => !c.isDeleted),
          assets: assets
            .filter(a => !a.isDeleted && !['Credit Card', 'Loan'].includes(a.type))
            .map(a => ({
              ...a,
              balance: getAssetBalance(a.id)
            })),
          transactions: [...transactions]
            .filter(t => ['pengeluaran', 'pendapatan', 'transfer'].includes(t.type))
            .filter(t => t.date >= startDateStr && t.date <= endDateStr)
            .sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''))
            .map(t => ({
              type: t.type,
              amount: t.amount,
              category: t.category,
              note: t.note,
              date: t.date
            })),
          contacts: contacts.map(c => ({ name: c.name })),
          recurringTransactions: recurringTransactions.filter(rt => rt.isActive).map(rt => ({
            type: rt.type,
            amount: rt.amount,
            category: rt.category,
            frequency: rt.frequency,
            startDate: rt.startDate,
            note: rt.note
          })),
          subscriptions: subscriptions.filter(s => s.isActive).map(s => ({
            name: s.name,
            amount: s.amount,
            billingCycle: s.billingCycle,
            nextBillingDate: s.nextBillingDate
          })),
          budgetMode,
          monthlyIncome,
          zbbMode,
          startOfMonthDay: startOfMonthDay || 1,
          currentDate: getLocalDate(),
          currentTime: getLocalTime(),
          budgets,
          goals,
          appKnowledge: {
            currentVersion: 'v1.0.18',
            latestFeatures: [
              'Zero-Based Budgeting (ZBB): Fitur alokasi pendapatan secara ketat di mana setiap pemasukan harus dialokasikan ke amplop kategori sampai habis bersisa 0.',
              'ZBB Strict Mode: Sistem pemblokiran/pencegatan otomatis pada transaksi (manual, struk OCR, maupun mutasi) jika nominal melebihi sisa limit kategori, mengharuskan pemindahan/realokasi anggaran sebelum lanjut.',
              'Tampilan UI Envelope System pada halaman budgeting dengan dukungan penguncian (lock) pendapatan.'
            ]
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Failed to fetch from chat API');
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content,
        toolCall: data.toolCall
      }]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Maaf, terjadi kesalahan saat menghubungi server.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      showToast('Speech-to-text tidak didukung di browser ini.', 'warning');
      return;
    }

    const recognition = new SR();
    recognition.lang = 'id-ID';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognitionRef.current = recognition;
    speechBaseRef.current = input.trim();
    finalTranscriptRef.current = '';
    setIsListening(true);

    recognition.onresult = (event: any) => {
      let newFinalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) newFinalText += t;
        else interimText += t;
      }
      if (newFinalText) finalTranscriptRef.current += newFinalText;
      const combined = `${speechBaseRef.current} ${finalTranscriptRef.current} ${interimText}`.trim();
      setInput(combined);
    };
    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
      showToast('Gagal menangkap suara.', 'warning');
    };
    recognition.onend = () => {
      const combined = `${speechBaseRef.current} ${finalTranscriptRef.current}`.trim();
      if (combined) setInput(combined);
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.start();
  };

  const handleConfirmTransaction = (msgIndex: number, toolArgs: any) => {
    try {
      if (toolArgs.type === 'transfer') {
        const fromId = toolArgs.fromAssetId;
        const toId = toolArgs.toAssetId;

        if (!fromId || !toId) {
          showToast('Rekening asal atau tujuan tidak ditemukan', 'warning');
          return;
        }

        const newTx = addTransaction({
          type: 'transfer',
          amount: Number(toolArgs.amount),
          date: toolArgs.date || getLocalDate(),
          note: toolArgs.note || 'Transfer via AI Chat',
          category: 'Transfer',
          fromAssetId: fromId,
          toAssetId: toId,
        });

        if (toolArgs.adminFee && toolArgs.adminFee > 0) {
          const feeAssetId = toolArgs.adminFeeTarget === 'receiver' ? toId : fromId;
          addTransaction({
            type: 'pengeluaran',
            amount: Number(toolArgs.adminFee),
            category: 'Biaya Admin',
            date: toolArgs.date || getLocalDate(),
            note: `Biaya admin transfer`,
            assetId: feeAssetId,
            relatedId: newTx.id,
          });
        }
      } else {
        addTransaction({
          type: toolArgs.type,
          amount: Number(toolArgs.amount),
          category: toolArgs.category,
          subCategory: toolArgs.subCategory || undefined,
          assetId: toolArgs.assetId,
          note: toolArgs.note || 'Dari AI Chat',
          date: toolArgs.date || getLocalDate(),
        });
      }

      setMessages(prev => prev.map((m, i) => 
        i === msgIndex ? { ...m, toolCall: undefined, content: '✅ Transaksi berhasil dicatat!' } : m
      ));
      
      showToast('Transaksi berhasil ditambahkan via AI!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan transaksi', 'error');
    }
  };

  const handleConfirmDebt = (msgIndex: number, toolArgs: any) => {
    try {
      addDebt({
        type: toolArgs.type,
        contact: toolArgs.contactName,
        description: toolArgs.description || '',
        totalAmount: Number(toolArgs.amount),
        isPaid: false,
        date: toolArgs.date || getLocalDate(),
        createdAt: toolArgs.date ? `${toolArgs.date}T${getLocalTime()}:00` : new Date().toISOString(),
        isInstallment: toolArgs.isInstallment || false,
        totalInstallments: toolArgs.totalInstallments,
        paidInstallments: 0,
        liabilityAssetId: toolArgs.type === 'hutang' ? toolArgs.assetId : undefined,
        paymentAssetId: toolArgs.type === 'piutang' ? toolArgs.assetId : undefined
      }, toolArgs.type === 'hutang' ? 'cash' : 'none', toolArgs.category, toolArgs.subCategory);

      setMessages(prev => prev.map((m, i) => 
        i === msgIndex ? { ...m, toolCall: undefined, content: `✅ ${toolArgs.type === 'hutang' ? 'Hutang' : 'Piutang'} berhasil dicatat!` } : m
      ));
      
      showToast(`${toolArgs.type === 'hutang' ? 'Hutang' : 'Piutang'} berhasil ditambahkan!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan catatan hutang', 'error');
    }
  };

  const handleCancelTransaction = (msgIndex: number) => {
    setMessages(prev => prev.map((m, i) => 
      i === msgIndex ? { ...m, toolCall: undefined, content: '❌ Transaksi dibatalkan.' } : m
    ));
  };
  
  const handleUpdateDraftField = (msgIndex: number, field: string, value: any) => {
    setMessages(prev => prev.map((m, i) => 
      i === msgIndex && m.toolCall ? { 
        ...m, 
        toolCall: { 
          ...m.toolCall, 
          arguments: { ...m.toolCall.arguments, [field]: value } 
        } 
      } : m
    ));
  };

  const handleConfirmBudget = (msgIndex: number, toolArgs: any) => {
    try {
      const { recommendations, month, year } = toolArgs;
      if (!recommendations || !Array.isArray(recommendations)) {
        showToast('Rekomendasi tidak valid', 'warning');
        return;
      }

      recommendations.forEach((rec: any) => {
        const existing = budgets.find(
          b => b.categoryId === rec.categoryId && b.month === month && b.year === year
        );

        if (existing) {
          updateBudget(existing.id, { limit: Number(rec.limit) });
        } else {
          addBudget({
            categoryId: rec.categoryId,
            limit: Number(rec.limit),
            period: 'monthly',
            month,
            year
          });
        }
      });

      setMessages(prev => prev.map((m, i) => 
        i === msgIndex ? { ...m, toolCall: undefined, content: '✅ Rekomendasi anggaran berhasil diterapkan!' } : m
      ));
      
      showToast('Anggaran berhasil diperbarui berdasarkan rekomendasi!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menerapkan anggaran', 'error');
    }
  };

  const handleUpdateDraftBudgetLimit = (msgIndex: number, categoryId: string, newLimit: number) => {
    setMessages(prev => prev.map((m, i) => {
      if (i === msgIndex && m.toolCall && m.toolCall.name === 'recommend_budget') {
        const updatedRecs = m.toolCall.arguments.recommendations.map((rec: any) => 
          rec.categoryId === categoryId ? { ...rec, limit: newLimit } : rec
        );
        return {
          ...m,
          toolCall: {
            ...m.toolCall,
            arguments: { ...m.toolCall.arguments, recommendations: updatedRecs }
          }
        };
      }
      return m;
    }));
  };

  const handleRemoveDraftBudgetCategory = (msgIndex: number, categoryId: string) => {
    setMessages(prev => prev.map((m, i) => {
      if (i === msgIndex && m.toolCall && m.toolCall.name === 'recommend_budget') {
        const updatedRecs = m.toolCall.arguments.recommendations.filter(
          (rec: any) => rec.categoryId !== categoryId
        );
        return {
          ...m,
          toolCall: {
            ...m.toolCall,
            arguments: { ...m.toolCall.arguments, recommendations: updatedRecs }
          }
        };
      }
      return m;
    }));
  };

  const handleAddDraftBudgetCategory = (msgIndex: number, categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    setMessages(prev => prev.map((m, i) => {
      if (i === msgIndex && m.toolCall && m.toolCall.name === 'recommend_budget') {
        const exists = m.toolCall.arguments.recommendations.some((rec: any) => rec.categoryId === categoryId);
        if (exists) {
          showToast(`Kategori ${cat.name} sudah ada dalam rekomendasi!`, 'error');
          return m;
        }

        const newRec = {
          categoryId: cat.id,
          categoryName: cat.name,
          limit: 0,
          reason: 'Ditambahkan manual'
        };
        const updatedRecs = [...m.toolCall.arguments.recommendations, newRec];
        return {
          ...m,
          toolCall: {
            ...m.toolCall,
            arguments: { ...m.toolCall.arguments, recommendations: updatedRecs }
          }
        };
      }
      return m;
    }));
  };

  const handleConfirmSubscription = (msgIndex: number, toolArgs: any) => {
    try {
      addSubscription({
        name: toolArgs.name,
        amount: Number(toolArgs.amount),
        billingCycle: toolArgs.billingCycle,
        nextBillingDate: toolArgs.nextBillingDate || getLocalDate(),
        category: toolArgs.category,
        assetId: toolArgs.assetId,
        isActive: true,
        note: toolArgs.note || ''
      });

      setMessages(prev => prev.map((m, i) => 
        i === msgIndex ? { ...m, toolCall: undefined, content: `✅ Langganan ${toolArgs.name} berhasil dicatat!` } : m
      ));
      
      showToast(`Langganan ${toolArgs.name} berhasil ditambahkan!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan langganan', 'error');
    }
  };

  const handleExecuteTransferRecommendation = (msgIndex: number, transferIdx: number, tf: any) => {
    try {
      const fromAsset = assets.find(a => a.id === tf.fromAssetId);
      const toAsset = assets.find(a => a.id === tf.toAssetId);

      if (!fromAsset || fromAsset.isDeleted || ['Credit Card', 'Loan'].includes(fromAsset.type)) {
        throw new Error('Rekening asal tidak valid atau merupakan kartu kredit/pinjaman.');
      }
      if (!toAsset || toAsset.isDeleted || ['Credit Card', 'Loan'].includes(toAsset.type)) {
        throw new Error('Rekening tujuan tidak valid atau merupakan kartu kredit/pinjaman.');
      }

      addTransaction({
        type: 'transfer',
        amount: Number(tf.amount),
        date: getLocalDate(),
        note: tf.reason || `Transfer Rekomendasi AI`,
        category: 'Transfer',
        fromAssetId: tf.fromAssetId,
        toAssetId: tf.toAssetId,
      });

      setMessages(prev => prev.map((m, i) => {
        if (i === msgIndex && m.toolCall && m.toolCall.name === 'recommend_budget') {
          const updatedTfs = (m.toolCall.arguments.transferRecommendations || []).map((t: any, idx: number) => 
            idx === transferIdx ? { ...t, isExecuted: true } : t
          );
          return {
            ...m,
            toolCall: {
              ...m.toolCall,
              arguments: { ...m.toolCall.arguments, transferRecommendations: updatedTfs }
            }
          };
        }
        return m;
      }));

      showToast(`Berhasil mentransfer Rp${tf.amount.toLocaleString('id-ID')} dari ${tf.fromAssetName} ke ${tf.toAssetName}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal melakukan transfer', 'error');
    }
  };

  const handleExecuteRecurringRecommendation = (msgIndex: number, recIdx: number, rt: any) => {
    try {
      addRecurringTransaction({
        type: rt.type,
        amount: Number(rt.amount),
        category: rt.category,
        note: rt.note,
        frequency: rt.frequency,
        startDate: getLocalDate(),
        isActive: true
      });

      setMessages(prev => prev.map((m, i) => {
        if (i === msgIndex && m.toolCall && m.toolCall.name === 'recommend_budget') {
          const updatedRts = (m.toolCall.arguments.recurringRecommendations || []).map((t: any, idx: number) => 
            idx === recIdx ? { ...t, isExecuted: true } : t
          );
          return {
            ...m,
            toolCall: {
              ...m.toolCall,
              arguments: { ...m.toolCall.arguments, recurringRecommendations: updatedRts }
            }
          };
        }
        return m;
      }));

      showToast(`Berhasil mengaktifkan transaksi rutin: ${rt.note}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengaktifkan transaksi rutin', 'error');
    }
  };

  return (
    <>
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsChatOpen(false)}
            style={{ zIndex: 1100 }}
          >
            <motion.div 
              className="modal-content"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                height: '85vh',
                maxHeight: '800px',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            background: 'var(--primary-gradient)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageCircle size={18} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '16px' }}>MoneyBot AI</span>
            </div>
            <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}>
                {msg.content && (
                  <div style={{
                    maxWidth: '85%',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                    borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                    background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-main)',
                    color: msg.role === 'user' ? 'white' : 'var(--text-main)',
                    border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none',
                    fontSize: '14px',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {renderMarkdown(msg.content)}
                  </div>
                )}
                {msg.toolCall && (msg.toolCall.name === 'create_transaction' || msg.toolCall.name === 'create_debt' || msg.toolCall.name === 'create_subscription') && (
                  <div style={{
                    marginTop: '8px',
                    width: '100%',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--primary)' }}>
                      <AlertCircle size={16} />
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>
                        {msg.toolCall.name === 'create_transaction' ? 'Draft Transaksi' : msg.toolCall.name === 'create_debt' ? 'Draft Catatan Hutang' : 'Draft Langganan Baru'}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {msg.toolCall.name === 'create_transaction' ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Tipe:</span>
                            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{msg.toolCall.arguments.type}</span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Nominal:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontWeight: 600 }}>{currencySymbol}</span>
                              <input 
                                type="text" 
                                value={msg.toolCall.arguments.amount === 0 || !msg.toolCall.arguments.amount ? '' : msg.toolCall.arguments.amount.toLocaleString('id-ID')}
                                onChange={(e) => {
                                  const val = Number(e.target.value.replace(/\D/g, '')) || 0;
                                  handleUpdateDraftField(idx, 'amount', val);
                                }}
                                style={{
                                  background: 'var(--bg-neutral)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '8px',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  color: 'var(--text-main)',
                                  outline: 'none',
                                  width: '120px',
                                  textAlign: 'right',
                                  fontWeight: 700
                                }}
                              />
                            </div>
                          </div>

                          {msg.toolCall.arguments.type !== 'transfer' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Kategori:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSelectCategoryMsgIdx(idx);
                                  const flowType = msg.toolCall?.arguments?.type === 'pendapatan' ? 'pendapatan' : 'pengeluaran';
                                  setCategoryModalType(flowType);
                                  setCategorySelectCallback(() => (categoryName: string, subCategoryName: string) => {
                                    handleUpdateDraftField(idx, 'category', categoryName);
                                    handleUpdateDraftField(idx, 'subCategory', subCategoryName);
                                  });
                                }}
                                style={{
                                  background: 'var(--bg-neutral)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '8px',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  color: 'var(--text-main)',
                                  outline: 'none',
                                  width: '150px',
                                  textAlign: 'right',
                                  cursor: 'pointer'
                                }}
                              >
                                {msg.toolCall?.arguments?.category 
                                  ? (msg.toolCall.arguments.subCategory 
                                      ? `${msg.toolCall.arguments.category} (${msg.toolCall.arguments.subCategory})` 
                                      : msg.toolCall.arguments.category)
                                  : 'Pilih Kategori...'}
                              </button>
                            </div>
                          )}

                          {msg.toolCall.arguments.type === 'transfer' ? (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Dari:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSelectAssetMsgIdx(idx);
                                    setAssetSelectCallback(() => (assetId: string) => {
                                      handleUpdateDraftField(idx, 'fromAssetId', assetId);
                                    });
                                  }}
                                  style={{
                                    background: 'var(--bg-neutral)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    color: 'var(--text-main)',
                                    outline: 'none',
                                    width: '150px',
                                    textAlign: 'right',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {assets.find(a => a.id === msg.toolCall?.arguments?.fromAssetId)?.name || 'Pilih Rekening Asal...'}
                                </button>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Ke:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSelectAssetMsgIdx(idx);
                                    setAssetSelectCallback(() => (assetId: string) => {
                                      handleUpdateDraftField(idx, 'toAssetId', assetId);
                                    });
                                  }}
                                  style={{
                                    background: 'var(--bg-neutral)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    color: 'var(--text-main)',
                                    outline: 'none',
                                    width: '150px',
                                    textAlign: 'right',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {assets.find(a => a.id === msg.toolCall?.arguments?.toAssetId)?.name || 'Pilih Rekening Tujuan...'}
                                </button>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Biaya Admin:</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '11px' }}>{currencySymbol}</span>
                                  <input 
                                    type="text" 
                                    value={msg.toolCall.arguments.adminFee === 0 || !msg.toolCall.arguments.adminFee ? '' : msg.toolCall.arguments.adminFee.toLocaleString('id-ID')}
                                    onChange={(e) => {
                                      const val = Number(e.target.value.replace(/\D/g, '')) || 0;
                                      handleUpdateDraftField(idx, 'adminFee', val);
                                    }}
                                    style={{
                                      background: 'var(--bg-neutral)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '8px',
                                      padding: '4px 8px',
                                      fontSize: '12px',
                                      color: 'var(--text-main)',
                                      outline: 'none',
                                      width: '60px',
                                      textAlign: 'right'
                                    }}
                                  />
                                  <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-color)' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDraftField(idx, 'adminFeeTarget', 'sender')}
                                      style={{
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: 'none',
                                        background: (msg.toolCall.arguments.adminFeeTarget || 'sender') === 'sender' ? 'var(--bg-neutral)' : 'transparent',
                                        color: (msg.toolCall.arguments.adminFeeTarget || 'sender') === 'sender' ? 'var(--text-main)' : 'var(--text-muted)',
                                        fontSize: '10px',
                                        fontWeight: (msg.toolCall.arguments.adminFeeTarget || 'sender') === 'sender' ? 700 : 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                      }}
                                    >
                                      Pengirim
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDraftField(idx, 'adminFeeTarget', 'receiver')}
                                      style={{
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: 'none',
                                        background: msg.toolCall.arguments.adminFeeTarget === 'receiver' ? 'var(--bg-neutral)' : 'transparent',
                                        color: msg.toolCall.arguments.adminFeeTarget === 'receiver' ? 'var(--text-main)' : 'var(--text-muted)',
                                        fontSize: '10px',
                                        fontWeight: msg.toolCall.arguments.adminFeeTarget === 'receiver' ? 700 : 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                      }}
                                    >
                                      Penerima
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Aset:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSelectAssetMsgIdx(idx);
                                  setAssetSelectCallback(() => (assetId: string) => {
                                    handleUpdateDraftField(idx, 'assetId', assetId);
                                  });
                                }}
                                style={{
                                  background: 'var(--bg-neutral)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '8px',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  color: 'var(--text-main)',
                                  outline: 'none',
                                  width: '150px',
                                  textAlign: 'right',
                                  cursor: 'pointer'
                                }}
                              >
                                {assets.find(a => a.id === msg.toolCall?.arguments?.assetId)?.name || 'Pilih Rekening...'}
                              </button>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Catatan:</span>
                            <input 
                              type="text" 
                              value={msg.toolCall.arguments.note || ''} 
                              onChange={(e) => handleUpdateDraftField(idx, 'note', e.target.value)}
                              placeholder="Catatan..."
                              style={{
                                background: 'var(--bg-neutral)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                color: 'var(--text-main)',
                                outline: 'none',
                                width: '150px',
                                textAlign: 'right'
                              }}
                            />
                          </div>
                        </>
                      ) : msg.toolCall.name === 'create_debt' ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Tipe:</span>
                            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{msg.toolCall.arguments.type}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Kontak:</span>
                            <input 
                              type="text" 
                              value={msg.toolCall.arguments.contactName || ''} 
                              onChange={(e) => handleUpdateDraftField(idx, 'contactName', e.target.value)}
                              placeholder="Nama kontak..."
                              style={{
                                background: 'var(--bg-neutral)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                color: 'var(--text-main)',
                                outline: 'none',
                                width: '150px',
                                textAlign: 'right'
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Nominal:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontWeight: 600 }}>{currencySymbol}</span>
                              <input 
                                type="text" 
                                value={msg.toolCall.arguments.amount === 0 || !msg.toolCall.arguments.amount ? '' : msg.toolCall.arguments.amount.toLocaleString('id-ID')}
                                onChange={(e) => {
                                  const val = Number(e.target.value.replace(/\D/g, '')) || 0;
                                  handleUpdateDraftField(idx, 'amount', val);
                                }}
                                style={{
                                  background: 'var(--bg-neutral)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '8px',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  color: 'var(--text-main)',
                                  outline: 'none',
                                  width: '120px',
                                  textAlign: 'right',
                                  fontWeight: 700
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Kategori:</span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSelectCategoryMsgIdx(idx);
                                const flowType = msg.toolCall?.arguments?.type === 'hutang' ? 'pengeluaran' : 'pengeluaran';
                                setCategoryModalType(flowType);
                                setCategorySelectCallback(() => (categoryName: string, subCategoryName: string) => {
                                  handleUpdateDraftField(idx, 'category', categoryName);
                                  handleUpdateDraftField(idx, 'subCategory', subCategoryName);
                                });
                              }}
                              style={{
                                background: 'var(--bg-neutral)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                color: 'var(--text-main)',
                                outline: 'none',
                                width: '150px',
                                textAlign: 'right',
                                cursor: 'pointer'
                              }}
                            >
                              {msg.toolCall?.arguments?.category 
                                ? (msg.toolCall.arguments.subCategory 
                                    ? `${msg.toolCall.arguments.category} (${msg.toolCall.arguments.subCategory})` 
                                    : msg.toolCall.arguments.category)
                                : 'Pilih Kategori...'}
                            </button>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Aset Terkait:</span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSelectAssetMsgIdx(idx);
                                setAssetSelectCallback(() => (assetId: string) => {
                                  handleUpdateDraftField(idx, 'assetId', assetId);
                                });
                              }}
                              style={{
                                background: 'var(--bg-neutral)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                color: 'var(--text-main)',
                                outline: 'none',
                                width: '150px',
                                textAlign: 'right',
                                cursor: 'pointer'
                              }}
                            >
                              {assets.find(a => a.id === msg.toolCall?.arguments?.assetId)?.name || 'Pilih Rekening...'}
                            </button>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Keterangan:</span>
                            <input 
                              type="text" 
                              value={msg.toolCall.arguments.description || ''} 
                              onChange={(e) => handleUpdateDraftField(idx, 'description', e.target.value)}
                              placeholder="Keterangan..."
                              style={{
                                background: 'var(--bg-neutral)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                color: 'var(--text-main)',
                                outline: 'none',
                                width: '150px',
                                textAlign: 'right'
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Nama:</span>
                            <input 
                              type="text" 
                              value={msg.toolCall.arguments.name || ''} 
                              onChange={(e) => handleUpdateDraftField(idx, 'name', e.target.value)}
                              placeholder="Nama langganan..."
                              style={{
                                background: 'var(--bg-neutral)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                color: 'var(--text-main)',
                                outline: 'none',
                                width: '150px',
                                textAlign: 'right'
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Nominal:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontWeight: 600 }}>{currencySymbol}</span>
                              <input 
                                type="text" 
                                value={msg.toolCall.arguments.amount === 0 || !msg.toolCall.arguments.amount ? '' : msg.toolCall.arguments.amount.toLocaleString('id-ID')}
                                onChange={(e) => {
                                  const val = Number(e.target.value.replace(/\D/g, '')) || 0;
                                  handleUpdateDraftField(idx, 'amount', val);
                                }}
                                style={{
                                  background: 'var(--bg-neutral)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '8px',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  color: 'var(--text-main)',
                                  outline: 'none',
                                  width: '120px',
                                  textAlign: 'right',
                                  fontWeight: 700
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Siklus:</span>
                            <div style={{ display: 'flex', background: 'var(--bg-neutral)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color)', width: '150px' }}>
                              <button
                                type="button"
                                onClick={() => handleUpdateDraftField(idx, 'billingCycle', 'monthly')}
                                style={{
                                  flex: 1,
                                  padding: '4px 0',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: (msg.toolCall.arguments.billingCycle || 'monthly') === 'monthly' ? 'var(--bg-card)' : 'transparent',
                                  color: (msg.toolCall.arguments.billingCycle || 'monthly') === 'monthly' ? 'var(--text-main)' : 'var(--text-muted)',
                                  fontSize: '11px',
                                  fontWeight: (msg.toolCall.arguments.billingCycle || 'monthly') === 'monthly' ? 700 : 500,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                  textAlign: 'center'
                                }}
                              >
                                Bulanan
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateDraftField(idx, 'billingCycle', 'yearly')}
                                style={{
                                  flex: 1,
                                  padding: '4px 0',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: msg.toolCall.arguments.billingCycle === 'yearly' ? 'var(--bg-card)' : 'transparent',
                                  color: msg.toolCall.arguments.billingCycle === 'yearly' ? 'var(--text-main)' : 'var(--text-muted)',
                                  fontSize: '11px',
                                  fontWeight: msg.toolCall.arguments.billingCycle === 'yearly' ? 700 : 500,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                  textAlign: 'center'
                                }}
                              >
                                Tahunan
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Kategori:</span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSelectCategoryMsgIdx(idx);
                                setCategoryModalType('pengeluaran');
                                setCategorySelectCallback(() => (categoryName: string, _subCategoryName?: string) => {
                                  handleUpdateDraftField(idx, 'category', categoryName);
                                });
                              }}
                              style={{
                                background: 'var(--bg-neutral)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                color: 'var(--text-main)',
                                outline: 'none',
                                width: '150px',
                                textAlign: 'right',
                                cursor: 'pointer'
                              }}
                            >
                              {msg.toolCall?.arguments?.category || 'Pilih Kategori...'}
                            </button>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Sumber Rekening:</span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSelectAssetMsgIdx(idx);
                                setAssetSelectCallback(() => (assetId: string) => {
                                  handleUpdateDraftField(idx, 'assetId', assetId);
                                });
                              }}
                              style={{
                                background: 'var(--bg-neutral)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                color: 'var(--text-main)',
                                outline: 'none',
                                width: '150px',
                                textAlign: 'right',
                                cursor: 'pointer'
                              }}
                            >
                              {assets.find(a => a.id === msg.toolCall?.arguments?.assetId)?.name || 'Pilih Rekening...'}
                            </button>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Catatan:</span>
                            <input 
                              type="text" 
                              value={msg.toolCall.arguments.note || ''} 
                              onChange={(e) => handleUpdateDraftField(idx, 'note', e.target.value)}
                              placeholder="Catatan..."
                              style={{
                                background: 'var(--bg-neutral)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                color: 'var(--text-main)',
                                outline: 'none',
                                width: '150px',
                                textAlign: 'right'
                              }}
                            />
                          </div>
                        </>
                      )}

                      {msg.toolCall.name !== 'create_subscription' ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Tanggal:</span>
                          <input 
                            type="date" 
                            value={msg.toolCall.arguments.date || getLocalDate()}
                            onChange={(e) => handleUpdateDraftField(idx, 'date', e.target.value)}
                            style={{ 
                              background: 'var(--bg-neutral)', 
                              border: '1px solid var(--border-color)', 
                              borderRadius: '8px', 
                              padding: '4px 8px', 
                              fontSize: '12px', 
                              color: 'var(--text-main)',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Tgl Tagihan:</span>
                          <input 
                            type="date" 
                            value={msg.toolCall.arguments.nextBillingDate || getLocalDate()}
                            onChange={(e) => handleUpdateDraftField(idx, 'nextBillingDate', e.target.value)}
                            style={{ 
                              background: 'var(--bg-neutral)', 
                              border: '1px solid var(--border-color)', 
                              borderRadius: '8px', 
                              padding: '4px 8px', 
                              fontSize: '12px', 
                              color: 'var(--text-main)',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleCancelTransaction(idx)}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Batal
                      </button>
                      <button 
                        onClick={() => {
                          if (msg.toolCall?.name === 'create_transaction') {
                            handleConfirmTransaction(idx, msg.toolCall.arguments);
                          } else if (msg.toolCall?.name === 'create_debt') {
                            handleConfirmDebt(idx, msg.toolCall.arguments);
                          } else {
                            handleConfirmSubscription(idx, msg.toolCall!.arguments);
                          }
                        }}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Check size={16} /> Konfirmasi
                      </button>
                    </div>
                  </div>
                )}

                {msg.toolCall && msg.toolCall.name === 'recommend_budget' && (
                  <div style={{
                    marginTop: '8px',
                    width: '100%',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--primary)' }}>
                      <AlertCircle size={16} />
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>
                        Rekomendasi Anggaran ({MONTH_NAMES[msg.toolCall.arguments.month] || msg.toolCall.arguments.month} {msg.toolCall.arguments.year})
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                      {msg.toolCall.arguments.recommendations.map((rec: any, recIdx: number) => {
                        const existing = budgets.find(
                          b => b.categoryId === rec.categoryId && b.month === msg.toolCall?.arguments.month && b.year === msg.toolCall?.arguments.year
                        );

                        return (
                          <div key={rec.categoryId || recIdx} style={{ 
                            padding: '12px', 
                            background: 'var(--bg-card)', 
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>{rec.categoryName}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{currencySymbol}</span>
                                  <input 
                                    type="text"
                                    value={rec.limit === 0 ? '' : rec.limit.toLocaleString('id-ID')}
                                    onChange={(e) => {
                                      const val = Number(e.target.value.replace(/\D/g, '')) || 0;
                                      handleUpdateDraftBudgetLimit(idx, rec.categoryId, val);
                                    }}
                                    style={{
                                      width: '100px',
                                      padding: '4px 8px',
                                      borderRadius: '8px',
                                      border: '1px solid var(--border-color)',
                                      background: 'var(--bg-main)',
                                      color: 'var(--text-main)',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      textAlign: 'right',
                                      outline: 'none'
                                    }}
                                  />
                                </div>
                                <button
                                  onClick={() => handleRemoveDraftBudgetCategory(idx, rec.categoryId)}
                                  title="Hapus Kategori"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.2s',
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            
                            {existing && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Limit saat ini: {currencySymbol}{existing.limit.toLocaleString('id-ID')}
                              </div>
                            )}

                            {rec.reason && (
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.35 }}>
                                {rec.reason}
                              </p>
                            )}
                          </div>
                        );
                      })}

                      {(() => {
                        const draftCategoryIds = msg.toolCall.arguments.recommendations.map((r: any) => r.categoryId);
                        const availableCategoriesToAdd = categories.filter(
                          c => c.type === 'pengeluaran' && !c.isDeleted && !draftCategoryIds.includes(c.id)
                        );

                        if (availableCategoriesToAdd.length === 0) return null;

                        return (
                          <div style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                            background: 'var(--bg-card)',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            border: '1px dashed var(--border-color)',
                            marginTop: '4px'
                          }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Plus size={14} /> Tambah:
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSelectCategoryMsgIdx(idx);
                                setCategoryModalType('pengeluaran');
                                setCategorySelectCallback(() => (categoryName: string, _subCategoryName: string) => {
                                  const cat = categories.find(c => c.name === categoryName);
                                  if (cat) {
                                    handleAddDraftBudgetCategory(idx, cat.id);
                                  }
                                });
                              }}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-main)',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-neutral)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-main)'}
                            >
                              Pilih Kategori...
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    {msg.toolCall.arguments.transferRecommendations && msg.toolCall.arguments.transferRecommendations.length > 0 && (
                      <div style={{ 
                        marginTop: '16px', 
                        borderTop: '1px dashed var(--border-color)', 
                        paddingTop: '16px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px', 
                        marginBottom: '16px' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)' }}>
                          <ArrowRight size={16} />
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>
                            Rekomendasi Transfer Saldo
                          </span>
                        </div>
                        {msg.toolCall.arguments.transferRecommendations.map((tf: any, tfIdx: number) => {
                          const fromAsset = assets.find(a => a.id === tf.fromAssetId);
                          const toAsset = assets.find(a => a.id === tf.toAssetId);
                          
                          // Skip rendering if it involves Credit Card, Loan, or deleted assets
                          const isFromDebt = fromAsset && ['Credit Card', 'Loan'].includes(fromAsset.type);
                          const isToDebt = toAsset && ['Credit Card', 'Loan'].includes(toAsset.type);
                          const isDeleted = (fromAsset && fromAsset.isDeleted) || (toAsset && toAsset.isDeleted);
                          
                          if (isFromDebt || isToDebt || isDeleted || !fromAsset || !toAsset) {
                            return null;
                          }

                          return (
                            <div key={tfIdx} style={{ 
                            padding: '12px', 
                            background: 'var(--bg-card)', 
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                                <span>{tf.fromAssetName}</span>
                                <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                                <span>{tf.toAssetName}</span>
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                                {currencySymbol}{tf.amount.toLocaleString('id-ID')}
                              </span>
                            </div>
                            {tf.reason && (
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.35 }}>
                                {tf.reason}
                              </p>
                            )}
                            <button
                              onClick={() => handleExecuteTransferRecommendation(idx, tfIdx, tf)}
                              disabled={tf.isExecuted}
                              style={{
                                marginTop: '4px',
                                width: '100%',
                                padding: '6px',
                                borderRadius: '8px',
                                border: tf.isExecuted ? '1px solid var(--success-border, #10b981)' : 'none',
                                background: tf.isExecuted ? 'rgba(16, 185, 129, 0.1)' : 'var(--success-text, #10b981)',
                                color: tf.isExecuted ? 'var(--success-text, #10b981)' : 'white',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: tf.isExecuted ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              {tf.isExecuted ? (
                                <>
                                  <Check size={12} /> Berhasil Ditransfer
                                </>
                              ) : (
                                'Transfer Sekarang'
                              )}
                            </button>
                          </div>
                        );
                      })}
                      </div>
                    )}

                    {msg.toolCall.arguments.recurringRecommendations && msg.toolCall.arguments.recurringRecommendations.length > 0 && (
                      <div style={{ 
                        marginTop: '16px', 
                        borderTop: '1px dashed var(--border-color)', 
                        paddingTop: '16px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px', 
                        marginBottom: '16px' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)' }}>
                          <ArrowRight size={16} />
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>
                            Rekomendasi Transaksi Rutin
                          </span>
                        </div>
                        {msg.toolCall.arguments.recurringRecommendations.map((rt: any, rtIdx: number) => (
                          <div key={rtIdx} style={{ 
                            padding: '12px', 
                            background: 'var(--bg-card)', 
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                                {rt.note} ({rt.frequency === 'monthly' ? 'Bulanan' : rt.frequency === 'weekly' ? 'Mingguan' : rt.frequency === 'daily' ? 'Harian' : 'Tahunan'})
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                                {currencySymbol}{rt.amount.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Kategori: {rt.category} | Tipe: {rt.type === 'pengeluaran' ? 'Pengeluaran' : 'Pendapatan'}
                            </div>
                            {rt.reason && (
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.35 }}>
                                {rt.reason}
                              </p>
                            )}
                            <button
                              onClick={() => handleExecuteRecurringRecommendation(idx, rtIdx, rt)}
                              disabled={rt.isExecuted}
                              style={{
                                marginTop: '4px',
                                width: '100%',
                                padding: '6px',
                                borderRadius: '8px',
                                border: rt.isExecuted ? '1px solid var(--success-border, #10b981)' : 'none',
                                background: rt.isExecuted ? 'rgba(16, 185, 129, 0.1)' : 'var(--success-text, #10b981)',
                                color: rt.isExecuted ? 'var(--success-text, #10b981)' : 'white',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: rt.isExecuted ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              {rt.isExecuted ? (
                                <>
                                  <Check size={12} /> Aktif Berulang
                                </>
                              ) : (
                                'Aktifkan Transaksi Rutin'
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleCancelTransaction(idx)}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Batal
                      </button>
                      <button 
                        onClick={() => handleConfirmBudget(idx, msg.toolCall!.arguments)}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Check size={16} /> Terapkan Anggaran
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                borderBottomLeftRadius: '4px',
                alignSelf: 'flex-start',
                maxWidth: '85%'
              }}>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center', height: '10px' }} aria-label="MoneyBot sedang mengetik">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'inline-block',
                      }}
                      animate={{
                        y: ['0px', '-5px', '0px'],
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ 
            padding: '12px 20px calc(16px + env(safe-area-inset-bottom, 0px))', 
            background: 'var(--bg-card)', 
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {/* Suggested Actions */}
            {!isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '4px' }}>
                <div 
                  className="hide-scrollbar"
                  style={{ 
                    display: 'flex', 
                    gap: '6px', 
                    overflowX: 'auto',
                    margin: '0 -20px',
                    padding: '4px 20px',
                    scrollbarWidth: 'none',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleSend("Buat rencana keuangan bulan ini.")}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      background: 'var(--bg-neutral)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--primary)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-neutral)';
                      e.currentTarget.style.color = 'var(--text-main)';
                    }}
                  >
                    ✨ Buat Rencana Keuangan
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSend("Tolong berikan analisis singkat kondisi keuangan saya bulan ini beserta pengeluaran terbesar.")}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      background: 'var(--bg-neutral)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--primary)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-neutral)';
                      e.currentTarget.style.color = 'var(--text-main)';
                    }}
                  >
                    📊 Analisis Pengeluaran
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSend("Bagaimana proyeksi cash flow dan saldo rekening saya 30 hari ke depan?")}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      background: 'var(--bg-neutral)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--primary)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-neutral)';
                      e.currentTarget.style.color = 'var(--text-main)';
                    }}
                  >
                    🔮 Proyeksi Cash Flow
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSend("Berapa batas aman belanja saya hari ini (Safe-to-Spend)?")}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      background: 'var(--bg-neutral)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--primary)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-neutral)';
                      e.currentTarget.style.color = 'var(--text-main)';
                    }}
                  >
                    🛡️ Batas Aman Belanja
                  </button>

                  <button
                    type="button"
                    onClick={triggerEOMReview}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      background: 'var(--bg-neutral)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--primary)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-neutral)';
                      e.currentTarget.style.color = 'var(--text-main)';
                    }}
                  >
                    📅 Evaluasi Akhir Bulan
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSend("Tolong jelaskan fitur-fitur utama di aplikasi ini.")}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      background: 'var(--bg-neutral)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--primary)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-neutral)';
                      e.currentTarget.style.color = 'var(--text-main)';
                    }}
                  >
                    ❓ Panduan Fitur
                  </button>
                </div>
              </div>
            )}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'var(--bg-main)',
              borderRadius: '28px',
              padding: '6px 6px 6px 18px',
              border: '1.5px solid var(--border-color)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
              transition: 'border-color 0.2s ease',
            }}>
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                placeholder="Tanya bot atau catat transaksi..."
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  padding: '10px 0',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'var(--text-main)',
                  outline: 'none',
                  marginBottom: 0
                }}
                disabled={isLoading}
              />
              <button
                onClick={handleVoiceInput}
                disabled={isLoading}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: isListening ? 'var(--bg-neutral)' : 'var(--bg-income)',
                  color: isListening ? 'var(--text-muted)' : 'var(--primary)',
                  border: 'none',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: isLoading ? 'default' : 'pointer',
                  flexShrink: 0
                }}
                title={isListening ? 'Sedang mendengar...' : 'Voice Input'}
              >
                {isListening ? <Square size={16} /> : <Mic size={16} />}
              </button>
              <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: input.trim() && !isLoading ? 'var(--primary-gradient)' : 'var(--bg-neutral)',
                  color: input.trim() && !isLoading ? 'white' : 'var(--text-muted)',
                  border: 'none',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: input.trim() && !isLoading ? '0 4px 15px var(--primary-glow)' : 'none',
                  flexShrink: 0
                }}
              >
                <Send size={20} style={{ marginLeft: input.trim() ? '2px' : '0' }} />
              </button>
            </div>
          </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {activeSelectCategoryMsgIdx !== null && (
        <CategorySelectModal
          isOpen={activeSelectCategoryMsgIdx !== null}
          onClose={() => {
            setActiveSelectCategoryMsgIdx(null);
            setCategorySelectCallback(null);
          }}
          categories={categories}
          type={categoryModalType}
          onSelect={(categoryName, subCategoryName) => {
            if (categorySelectCallback) {
              categorySelectCallback(categoryName, subCategoryName);
            }
          }}
        />
      )}

      {activeSelectAssetMsgIdx !== null && (
        <AssetSelectModal
          isOpen={activeSelectAssetMsgIdx !== null}
          onClose={() => {
            setActiveSelectAssetMsgIdx(null);
            setAssetSelectCallback(null);
          }}
          assets={assets}
          onSelect={(assetId) => {
            if (assetSelectCallback) {
              assetSelectCallback(assetId);
            }
          }}
        />
      )}
    </>
  );
};

export default ChatBot;

// --- Native Safe Markdown Parser for Chat Messages ---
const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  const regex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const splitParts = text.split(regex);

  return splitParts.map((part, index) => {
    if (part.startsWith('***') && part.endsWith('***')) {
      return <strong key={index}><em>{part.slice(3, -3)}</em></strong>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const renderMarkdown = (content: string): React.ReactNode => {
  if (!content) return null;

  const blocks = content.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) {
          return <div key={idx} style={{ height: '6px' }} />;
        }

        // Headings
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} style={{ margin: '8px 0 4px 0', fontSize: '14px', fontWeight: 800, color: 'inherit' }}>
              {parseInlineMarkdown(trimmed.substring(4))}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} style={{ margin: '12px 0 6px 0', fontSize: '15px', fontWeight: 800, color: 'inherit' }}>
              {parseInlineMarkdown(trimmed.substring(3))}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={idx} style={{ margin: '14px 0 8px 0', fontSize: '16px', fontWeight: 800, color: 'inherit' }}>
              {parseInlineMarkdown(trimmed.substring(2))}
            </h2>
          );
        }

        // Bullet lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '6px', paddingLeft: '4px', margin: '2px 0', lineHeight: 1.4 }}>
              <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>•</span>
              <span style={{ flex: 1 }}>{parseInlineMarkdown(trimmed.substring(2))}</span>
            </div>
          );
        }

        // Ordered lists
        const orderedMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (orderedMatch) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '6px', paddingLeft: '4px', margin: '2px 0', lineHeight: 1.4 }}>
              <span style={{ color: 'var(--primary)', fontWeight: 'bold', minWidth: '14px' }}>{orderedMatch[1]}.</span>
              <span style={{ flex: 1 }}>{parseInlineMarkdown(orderedMatch[2])}</span>
            </div>
          );
        }

        // Normal paragraph text
        return (
          <div key={idx} style={{ margin: 0, lineHeight: 1.4 }}>
            {parseInlineMarkdown(block)}
          </div>
        );
      })}
    </div>
  );
};
