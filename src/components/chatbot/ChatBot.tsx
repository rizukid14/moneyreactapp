import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney } from '../../contexts/MoneyContext';
import { useToast } from '../common/Toast';
import { getLocalDate, getLocalTime } from '../../lib/utils';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCall?: {
    name: string;
    arguments: any;
  };
}

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Halo! Saya MoneyBot. Ada yang bisa saya bantu tentang MoneyApp atau pencatatan keuanganmu hari ini?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { 
    categories, assets, transactions, contacts, getAssetBalance, addTransaction, addDebt, 
    currencySymbol, isChatOpen, setIsChatOpen,
    recurringTransactions, subscriptions, budgetMode, monthlyIncome, zbbMode,
    startOfMonthDay
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

  const triggerEOMReview = async () => {
    setIsLoading(true);
    const { dateStr } = getDaysToEOM();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Tolong berikan evaluasi dan nasihat akhir bulan saya berdasarkan transaksi yang ada.' }],
          categories,
          assets: assets.map(a => ({
            ...a,
            balance: getAssetBalance(a.id)
          })),
          transactions: transactions.slice(0, 150).map(t => ({
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
          appKnowledge: {
            currentVersion: 'v1.0.18',
            latestFeatures: []
          }
        })
      });

      if (!response.ok) throw new Error('Failed to fetch from chat API');

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

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          categories,
          assets: assets.map(a => ({
            ...a,
            balance: getAssetBalance(a.id)
          })),
          transactions: transactions.slice(0, 150).map(t => ({
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

      if (!response.ok) throw new Error('Failed to fetch from chat API');

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
  
  const handleUpdateDraftDate = (msgIndex: number, newDate: string) => {
    setMessages(prev => prev.map((m, i) => 
      i === msgIndex && m.toolCall ? { 
        ...m, 
        toolCall: { 
          ...m.toolCall, 
          arguments: { ...m.toolCall.arguments, date: newDate } 
        } 
      } : m
    ));
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
                    {msg.content}
                  </div>
                )}

                {msg.toolCall && (msg.toolCall.name === 'create_transaction' || msg.toolCall.name === 'create_debt') && (
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
                        {msg.toolCall.name === 'create_transaction' ? 'Draft Transaksi' : 'Draft Catatan Hutang'}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {msg.toolCall.name === 'create_transaction' ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Tipe:</span>
                            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{msg.toolCall.arguments.type}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Nominal:</span>
                            <span style={{ fontWeight: 700, color: msg.toolCall.arguments.type === 'pendapatan' ? 'var(--success)' : 'var(--danger)' }}>
                              {currencySymbol}{msg.toolCall.arguments.amount?.toLocaleString('id-ID')}
                            </span>
                          </div>
                          {msg.toolCall.arguments.type !== 'transfer' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Kategori:</span>
                              <span style={{ fontWeight: 500 }}>
                                {msg.toolCall.arguments.category}{msg.toolCall.arguments.subCategory ? ` > ${msg.toolCall.arguments.subCategory}` : ''}
                              </span>
                            </div>
                          )}
                          {msg.toolCall.arguments.type === 'transfer' ? (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Dari:</span>
                                <span style={{ fontWeight: 500 }}>
                                  {assets.find(a => a.id === msg.toolCall?.arguments.fromAssetId)?.name || 'Tidak diketahui'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Ke:</span>
                                <span style={{ fontWeight: 500 }}>
                                  {assets.find(a => a.id === msg.toolCall?.arguments.toAssetId)?.name || 'Tidak diketahui'}
                                </span>
                              </div>
                              {msg.toolCall.arguments.adminFee > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Biaya Admin:</span>
                                  <span style={{ fontWeight: 600, color: 'var(--danger)' }}>
                                    {currencySymbol}{msg.toolCall.arguments.adminFee.toLocaleString('id-ID')} ({msg.toolCall.arguments.adminFeeTarget})
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Aset:</span>
                              <span style={{ fontWeight: 500 }}>
                                {assets.find(a => a.id === msg.toolCall?.arguments.assetId)?.name || 'Tidak diketahui'}
                              </span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Catatan:</span>
                            <span style={{ fontWeight: 500 }}>{msg.toolCall.arguments.note}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Tipe:</span>
                            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{msg.toolCall.arguments.type}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Kontak:</span>
                            <span style={{ fontWeight: 600 }}>{msg.toolCall.arguments.contactName}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Nominal:</span>
                            <span style={{ fontWeight: 700, color: msg.toolCall.arguments.type === 'piutang' ? 'var(--success)' : 'var(--danger)' }}>
                              {currencySymbol}{msg.toolCall.arguments.amount?.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Kategori:</span>
                            <span style={{ fontWeight: 500 }}>
                              {msg.toolCall.arguments.category || 'Lainnya'}
                            </span>
                          </div>
                          {msg.toolCall.arguments.assetId && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Aset Terkait:</span>
                              <span style={{ fontWeight: 500 }}>
                                {assets.find(a => a.id === msg.toolCall?.arguments.assetId)?.name || 'Tidak diketahui'}
                              </span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Keterangan:</span>
                            <span style={{ fontWeight: 500 }}>{msg.toolCall.arguments.description || '-'}</span>
                          </div>
                        </>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tanggal:</span>
                        <input 
                          type="date" 
                          value={msg.toolCall.arguments.date || getLocalDate()}
                          onChange={(e) => handleUpdateDraftDate(idx, e.target.value)}
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
                          } else {
                            handleConfirmDebt(idx, msg.toolCall!.arguments);
                          }
                        }}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Check size={16} /> Konfirmasi
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
            padding: '16px 20px calc(16px + env(safe-area-inset-bottom, 0px))', 
            background: 'var(--bg-card)', 
            borderTop: '1px solid var(--border-color)',
          }}>
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
                onClick={handleSend}
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
    </>
  );
};

export default ChatBot;
