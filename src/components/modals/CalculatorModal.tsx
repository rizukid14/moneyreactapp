import React, { useState, useEffect } from 'react';
import { X, Delete } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: number) => void;
  initialValue?: number | string;
}

const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose, onConfirm, initialValue }) => {
  const [expression, setExpression] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialValue) {
        setExpression(initialValue.toString().replace(/\D/g, ''));
      } else {
        setExpression('');
      }
    }
  }, [isOpen, initialValue]);

  const handlePress = (val: string) => {
    // Prevent starting with an operator (except minus)
    if (expression === '' && ['+', '×', '÷'].includes(val)) return;
    
    // Prevent multiple consecutive operators
    const lastChar = expression.slice(-1);
    const isOperator = ['+', '-', '×', '÷'].includes(val);
    const isLastCharOperator = ['+', '-', '×', '÷'].includes(lastChar);
    
    if (isOperator && isLastCharOperator) {
      setExpression(prev => prev.slice(0, -1) + val);
      return;
    }

    setExpression(prev => prev + val);
  };

  const handleBackspace = () => {
    setExpression(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setExpression('');
  };

  const calculate = () => {
    try {
      if (!expression) return;
      let safeExp = expression.replace(/×/g, '*').replace(/÷/g, '/');
      
      // Remove trailing operators before calculation
      if (['+', '-', '*', '/'].includes(safeExp.slice(-1))) {
        safeExp = safeExp.slice(0, -1);
      }

      // eslint-disable-next-line no-new-func
      const evalResult = new Function('return ' + safeExp)();
      
      if (typeof evalResult === 'number' && !isNaN(evalResult) && isFinite(evalResult)) {
        setExpression(Math.floor(evalResult).toString());
      } else {
        setExpression('');
      }
    } catch (e) {
      // Do nothing on eval error, just leave expression as is
    }
  };

  const handleConfirm = () => {
    let finalValue = 0;
    try {
      if (expression) {
        let safeExp = expression.replace(/×/g, '*').replace(/÷/g, '/');
        if (['+', '-', '*', '/'].includes(safeExp.slice(-1))) {
          safeExp = safeExp.slice(0, -1);
        }
        // eslint-disable-next-line no-new-func
        const evalResult = new Function('return ' + safeExp)();
        if (typeof evalResult === 'number' && !isNaN(evalResult) && isFinite(evalResult)) {
          finalValue = Math.floor(evalResult);
        }
      }
    } catch (e) {}

    onConfirm(Math.max(0, finalValue));
    onClose();
  };

  // Format expression to have dots as thousands separator for better readability
  const formatExpression = (expr: string) => {
    if (!expr) return '0';
    // Split by operators
    const parts = expr.split(/([+\-×÷])/);
    return parts.map(part => {
      if (['+', '-', '×', '÷'].includes(part)) return ` ${part} `;
      if (!part) return '';
      return parseInt(part).toLocaleString('id-ID');
    }).join('');
  };

  // Evaluate live result
  const getLiveResult = () => {
    try {
      let safeExp = expression.replace(/×/g, '*').replace(/÷/g, '/');
      if (['+', '-', '*', '/'].includes(safeExp.slice(-1))) {
        safeExp = safeExp.slice(0, -1);
      }
      // eslint-disable-next-line no-new-func
      const evalResult = new Function('return ' + safeExp)();
      if (typeof evalResult === 'number' && !isNaN(evalResult) && isFinite(evalResult) && evalResult.toString() !== safeExp) {
        return `= ${Math.floor(evalResult).toLocaleString('id-ID')}`;
      }
    } catch (e) {}
    return '';
  };

  const btnStyle = {
    padding: '16px',
    fontSize: '24px',
    fontWeight: 700,
    border: 'none',
    borderRadius: '16px',
    background: 'var(--bg-card)',
    color: 'var(--text-main)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  };

  const opBtnStyle = {
    ...btnStyle,
    background: 'var(--bg-income)',
    color: 'var(--primary)',
  };

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
          style={{ zIndex: 3000 }} // Ensure it's above other modals
        >
          <motion.div 
            className="modal-content" 
            onClick={e => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 400, mass: 0.5 }}
            style={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="subtitle" style={{ margin: 0, fontSize: '16px' }}>Kalkulator</h2>
              <button className="close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            <div style={{ 
              background: 'var(--bg-main)', 
              borderRadius: '16px', 
              padding: '20px', 
              marginBottom: '20px',
              border: '1.5px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', minHeight: '20px', textAlign: 'right', fontWeight: 600, letterSpacing: '0.5px' }}>
                {getLiveResult()}
              </div>
              <div style={{ 
                fontSize: expression.length > 15 ? '24px' : '36px', 
                fontWeight: 800, 
                color: 'var(--primary)', 
                textAlign: 'right', 
                wordBreak: 'break-all',
                transition: 'font-size 0.2s'
              }}>
                {formatExpression(expression)}
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '12px' 
            }}>
              <button style={btnStyle} onClick={handleClear}><span style={{ color: 'var(--danger)' }}>C</span></button>
              <button style={opBtnStyle} onClick={() => handlePress('÷')}>÷</button>
              <button style={opBtnStyle} onClick={() => handlePress('×')}>×</button>
              <button style={{...btnStyle, color: 'var(--danger)'}} onClick={handleBackspace}><Delete size={24} /></button>

              <button style={btnStyle} onClick={() => handlePress('7')}>7</button>
              <button style={btnStyle} onClick={() => handlePress('8')}>8</button>
              <button style={btnStyle} onClick={() => handlePress('9')}>9</button>
              <button style={opBtnStyle} onClick={() => handlePress('-')}>-</button>

              <button style={btnStyle} onClick={() => handlePress('4')}>4</button>
              <button style={btnStyle} onClick={() => handlePress('5')}>5</button>
              <button style={btnStyle} onClick={() => handlePress('6')}>6</button>
              <button style={opBtnStyle} onClick={() => handlePress('+')}>+</button>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridColumn: '1 / 4', gap: '12px' }}>
                <button style={btnStyle} onClick={() => handlePress('1')}>1</button>
                <button style={btnStyle} onClick={() => handlePress('2')}>2</button>
                <button style={btnStyle} onClick={() => handlePress('3')}>3</button>
                
                <button style={{...btnStyle, gridColumn: '1 / 3'}} onClick={() => handlePress('0')}>0</button>
                <button style={btnStyle} onClick={() => handlePress('000')}>000</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', gridColumn: '4 / 5', gridRow: '4 / 6' }}>
                <button style={{...btnStyle, flex: 1, background: 'var(--bg-main)'}} onClick={calculate}>=</button>
                <button style={{...btnStyle, flex: 1, background: 'var(--primary)', color: 'white', boxShadow: '0 4px 15px var(--primary-glow)'}} onClick={handleConfirm}>OK</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CalculatorModal;
