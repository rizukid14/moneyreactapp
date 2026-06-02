import React from 'react';
import { ArrowRightLeft, TrendingDown, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface DebtOffsetModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  totalHutang: number;
  totalPiutang: number;
  offsetAmount: number;
  onConfirm: (date: string) => void;
  currencySymbol: string;
}

const fmt = (n: number, sym: string) => `${sym}${n.toLocaleString('id-ID')}`;

const DebtOffsetModal: React.FC<DebtOffsetModalProps> = ({
  isOpen, onClose, onConfirm, contactName, totalHutang, totalPiutang, offsetAmount, currencySymbol
}) => {
  if (!isOpen) return null;

  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]);
  const remainingHutang = totalHutang - offsetAmount;
  const remainingPiutang = totalPiutang - offsetAmount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Potong Silang Utang"
    >
        <div>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ 
              width: '60px', height: '60px', borderRadius: '30px', 
              background: 'var(--bg-income)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <ArrowRightLeft size={30} />
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{contactName}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              Anda memiliki hutang & piutang sekaligus dengan orang ini.
            </p>
          </div>

          <Card variant="default" style={{ padding: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingDown size={14} color="var(--danger)" />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Total Hutang</span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger)' }}>{fmt(totalHutang, currencySymbol)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={14} color="var(--primary)" />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Total Piutang</span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>{fmt(totalPiutang, currencySymbol)}</span>
            </div>

            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nominal Potong Silang:</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>{fmt(offsetAmount, currencySymbol)}</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                *Saldo rekening asli Anda tidak akan berubah.
              </p>
            </div>
          </Card>

          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-muted)' }}>SETELAH POTONG SILANG:</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, background: 'var(--bg-card)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>SISA HUTANG</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: remainingHutang > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {remainingHutang > 0 ? fmt(remainingHutang, currencySymbol) : 'LUNAS'}
                </div>
              </div>
              <div style={{ flex: 1, background: 'var(--bg-card)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>SISA PIUTANG</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: remainingPiutang > 0 ? 'var(--primary)' : 'var(--success)' }}>
                  {remainingPiutang > 0 ? fmt(remainingPiutang, currencySymbol) : 'LUNAS'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              Tanggal Transaksi:
            </label>
            <Input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              style={{ marginBottom: 0 }} 
            />
          </div>

          <Button
            variant="primary"
            onClick={() => onConfirm(date)}
            fullWidth
            style={{
              padding: '14px', fontWeight: 800, fontSize: '15px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <CheckCircle2 size={18} /> Konfirmasi Potong Silang
          </Button>
        </div>
    </Modal>
  );
};

export default DebtOffsetModal;
