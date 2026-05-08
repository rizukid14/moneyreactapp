import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoney } from '../../contexts/MoneyContext';
import { useToast } from '../common/Toast';

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
  
  const { categories, assets, transactions, getAssetBalance, addTransaction, currencySymbol, isChatOpen, setIsChatOpen } = useMoney();
  const { showToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

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
          }))
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
      addTransaction({
        type: toolArgs.type,
        amount: Number(toolArgs.amount),
        category: toolArgs.category,
        subCategory: toolArgs.subCategory || undefined,
        assetId: toolArgs.assetId,
        note: toolArgs.note || 'Dari AI Chat',
        date: toolArgs.date || new Date().toISOString().split('T')[0],
      });

      // Update message to remove tool call and show success
      setMessages(prev => prev.map((m, i) => 
        i === msgIndex ? { ...m, toolCall: undefined, content: '✅ Transaksi berhasil dicatat!' } : m
      ));
      
      showToast('Transaksi berhasil ditambahkan via AI!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan transaksi', 'error');
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

                {msg.toolCall && msg.toolCall.name === 'create_transaction' && (
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
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>Draft Transaksi</span>
                    </div>
                    
                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Kategori:</span>
                        <span style={{ fontWeight: 500 }}>
                          {msg.toolCall.arguments.category}{msg.toolCall.arguments.subCategory ? ` > ${msg.toolCall.arguments.subCategory}` : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Aset:</span>
                        <span style={{ fontWeight: 500 }}>
                          {assets.find(a => a.id === msg.toolCall?.arguments.assetId)?.name || 'Tidak diketahui'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Catatan:</span>
                        <span style={{ fontWeight: 500 }}>{msg.toolCall.arguments.note}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tanggal:</span>
                        <input 
                          type="date" 
                          value={msg.toolCall.arguments.date || new Date().toISOString().split('T')[0]}
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
                        onClick={() => handleConfirmTransaction(idx, msg.toolCall!.arguments)}
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
