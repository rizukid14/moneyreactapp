import React from 'react';
import { X, Target, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Goal } from '../../contexts/MoneyContext';

interface GoalSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: Goal[];
  selectedGoalId?: string;
  onSelect: (goalId: string | undefined) => void;
}

const GoalSelectModal: React.FC<GoalSelectModalProps> = ({
  isOpen, onClose, goals, selectedGoalId, onSelect,
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
          transition={{ duration: 0.15 }}
          style={{ zIndex: 3000 }}
        >
          <motion.div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400, mass: 0.5 }}
            style={{ padding: 0, height: '60vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0,
            }}>
              <h2 className="subtitle" style={{ margin: 0, fontSize: '16px' }}>Pilih Target Tabungan</h2>
              <button className="close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              <button
                onClick={() => { onSelect(undefined); onClose(); }}
                style={{
                  width: '100%', padding: '16px 20px',
                  background: !selectedGoalId ? 'var(--bg-income)' : 'transparent',
                  border: 'none', borderBottom: '1px solid var(--border-color)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: !selectedGoalId ? 700 : 500, color: !selectedGoalId ? 'var(--primary)' : 'var(--text-main)' }}>
                  -- Tidak Dihubungkan --
                </div>
                {!selectedGoalId && <Check size={18} color="var(--primary)" />}
              </button>

              {goals.map(goal => {
                const isSelected = goal.id === selectedGoalId;
                return (
                  <button
                    key={goal.id}
                    onClick={() => { onSelect(goal.id); onClose(); }}
                    style={{
                      width: '100%', padding: '16px 20px',
                      background: isSelected ? 'var(--bg-income)' : 'transparent',
                      border: 'none', borderBottom: '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: isSelected ? 'var(--primary)' : 'var(--bg-main)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isSelected ? 'white' : 'var(--primary)', flexShrink: 0
                      }}>
                        <Target size={16} />
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                        {goal.name}
                      </div>
                    </div>
                    {isSelected && <Check size={18} color="var(--primary)" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GoalSelectModal;
