import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, Calculator } from 'lucide-react';

export interface StatDetailItem {
  label: string;
  value: string | React.ReactNode;
  type?: 'addition' | 'subtraction' | 'result' | 'neutral';
}

interface StatDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  explanation?: string;
  formula?: React.ReactNode;
  details: StatDetailItem[];
}

const StatDetailModal: React.FC<StatDetailModalProps> = ({
  isOpen, onClose, title, explanation, formula, details
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          style={{ zIndex: 1000 }} // Ensure it is above everything
        >
          <motion.div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 600, mass: 0.5 }}
          >
            <div className="modal-header">
              <h2 className="subtitle" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '10px', 
                  background: 'var(--bg-income)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Calculator size={18} />
                </div>
                {title}
              </h2>
              <button className="close-btn" onClick={onClose}><X size={24} /></button>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              {explanation && (
                <div style={{ 
                  padding: '14px', 
                  background: 'var(--bg-main)', 
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  marginBottom: '20px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}>
                  <Info size={18} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--text-main)', opacity: 0.9 }}>
                    {explanation}
                  </p>
                </div>
              )}

              {formula && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '4px' }}>
                    Rumus Kalkulasi
                  </div>
                  <div style={{
                    padding: '16px',
                    background: 'var(--bg-card-solid)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    color: 'var(--text-main)',
                    textAlign: 'center',
                    fontWeight: 700,
                    wordBreak: 'break-word',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    {formula}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '4px' }}>
                  Rincian Angka
                </div>
                <div style={{
                  background: 'var(--bg-card-solid)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                }}>
                  {details.map((item, idx) => {
                    const isResult = item.type === 'result';
                    const isAddition = item.type === 'addition';
                    const isSubtraction = item.type === 'subtraction';

                    return (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        borderBottom: idx < details.length - 1 ? '1px solid var(--border-color)' : 'none',
                        background: isResult ? 'var(--bg-main)' : 'transparent',
                        position: 'relative'
                      }}>
                        {/* Type indicator line */}
                        {(isAddition || isSubtraction || isResult) && (
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: '16px',
                            bottom: '16px',
                            width: '4px',
                            borderRadius: '0 4px 4px 0',
                            background: isResult ? 'var(--primary)' : isAddition ? 'var(--primary)' : isSubtraction ? 'var(--danger)' : 'transparent'
                          }} />
                        )}
                        <span style={{ 
                          fontSize: '13px', 
                          fontWeight: isResult ? 800 : 600, 
                          color: isResult ? 'var(--text-main)' : 'var(--text-muted)',
                          paddingLeft: (isAddition || isSubtraction || isResult) ? '8px' : '0'
                        }}>
                          {item.label}
                        </span>
                        <span style={{ 
                          fontSize: '15px', 
                          fontWeight: isResult ? 800 : 700, 
                          color: isResult ? 'var(--primary)' : isAddition ? 'var(--primary)' : isSubtraction ? 'var(--danger)' : 'var(--text-main)',
                          fontFamily: 'monospace'
                        }}>
                          {isAddition && '+ '}{isSubtraction && '- '}{item.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StatDetailModal;
