import React, { useMemo } from 'react';
import { ArrowRight, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { type Trip, type TripExpense } from '../../contexts/MoneyContext';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';

interface SettlementExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  settlement: { from: string; to: string; amount: number } | null;
  mode: 'simple' | 'detailed';
  trip: Trip | any; // allow any for shared trip shape
  expenses: TripExpense[] | any[]; // allow any for shared trip shape
  currencySymbol: string;
  settlementData?: any; // Optional full settlement object
}

const SettlementExplanationModal: React.FC<SettlementExplanationModalProps> = ({
  isOpen,
  onClose,
  settlement,
  mode,
  trip,
  expenses,
  currencySymbol,
  settlementData
}) => {
  const explanation = useMemo(() => {
    if (!settlement || !trip) return null;

    const findMember = (identifier: string) => {
      const match = trip.members.find((m: any) => m.id === identifier || m.name === identifier);
      if (match) return match;
      // Fallback for older shared links where 'me' was named 'Saya' but settlement uses real name
      const meMember = trip.members.find((m: any) => m.id === 'me');
      if (meMember) return meMember;
      return { id: identifier, name: identifier };
    };

    const fromMember = findMember(settlement.from);
    const toMember = findMember(settlement.to);

    if (mode === 'detailed') {
      // Find all expenses where toMember paid and fromMember consumed
      const fromOwesTo = expenses.filter(e => 
        String(e.payerId) === String(toMember.id) && e.splits && e.splits.some((s: any) => String(s.memberId) === String(fromMember.id))
      ).map(e => ({
        description: e.description,
        date: e.date,
        amount: e.splits.find((s: any) => String(s.memberId) === String(fromMember.id))?.amount || 0
      }));

      // Find all expenses where fromMember paid and toMember consumed
      const toOwesFrom = expenses.filter(e => 
        String(e.payerId) === String(fromMember.id) && e.splits && e.splits.some((s: any) => String(s.memberId) === String(toMember.id))
      ).map(e => ({
        description: e.description,
        date: e.date,
        amount: e.splits.find((s: any) => String(s.memberId) === String(toMember.id))?.amount || 0
      }));

      return {
        type: 'detailed',
        from: fromMember.name,
        to: toMember.name,
        fromOwesTo,
        toOwesFrom
      };
    } else {
      // Simple Mode Explanation: Net Balances
      let fromConsumed = 0;
      let fromPaid = 0;
      let toConsumed = 0;
      let toPaid = 0;

      // Use pre-calculated settlementData if available (from SettleUpModal)
      if (settlementData && settlementData.consumed) {
        fromConsumed = settlementData.consumed[fromMember.id] || 0;
        fromPaid = settlementData.paid[fromMember.id] || 0;
        toConsumed = settlementData.consumed[toMember.id] || 0;
        toPaid = settlementData.paid[toMember.id] || 0;
      } else {
        // Fallback calculation for SharedSplitBill view
        expenses.forEach(e => {
          if (String(e.payerId) === String(fromMember.id)) fromPaid += e.amount;
          if (String(e.payerId) === String(toMember.id)) toPaid += e.amount;
          
          if (e.splits) {
            e.splits.forEach((s: any) => {
              if (String(s.memberId) === String(fromMember.id)) fromConsumed += s.amount;
              if (String(s.memberId) === String(toMember.id)) toConsumed += s.amount;
            });
          }
        });
      }

      const fromNet = fromPaid - fromConsumed;
      const toNet = toPaid - toConsumed;

      return {
        type: 'simple',
        from: { name: fromMember.name, consumed: fromConsumed, paid: fromPaid, net: fromNet },
        to: { name: toMember.name, consumed: toConsumed, paid: toPaid, net: toNet },
        transferAmount: settlement.amount
      };
    }
  }, [settlement, mode, trip, expenses]);

  if (!isOpen || !settlement || !explanation) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rincian Transfer"
    >
          <Card variant="glass" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            padding: '16px', marginBottom: '24px'
          }}>
            <span style={{ fontWeight: 800, fontSize: '16px' }}>{explanation.from?.name || (explanation as any).from}</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <ArrowRight size={20} color="var(--primary)" />
              <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--primary)' }}>{currencySymbol}{settlement.amount.toLocaleString('id-ID')}</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: '16px' }}>{explanation.to?.name || (explanation as any).to}</span>
          </Card>

          {mode === 'detailed' ? (
            <div style={{ display: 'grid', gap: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                Ini adalah rincian histori timbal balik antara <b>{(explanation as any).from}</b> dan <b>{(explanation as any).to}</b>.
              </p>

              {(explanation as any).fromOwesTo.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <ArrowDownRight size={14} /> Hutang {(explanation as any).from} ke {(explanation as any).to}
                  </h4>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {(explanation as any).fromOwesTo.map((item: any, i: number) => (
                      <Card key={i} variant="default" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700 }}>{item.description}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.date}</div>
                        </div>
                        <div style={{ fontWeight: 800, color: 'var(--danger)' }}>{currencySymbol}{item.amount.toLocaleString('id-ID')}</div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {(explanation as any).toOwesFrom.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <ArrowUpRight size={14} /> Piutang {(explanation as any).from} dari {(explanation as any).to}
                  </h4>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {(explanation as any).toOwesFrom.map((item: any, i: number) => (
                      <Card key={i} variant="default" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700 }}>{item.description}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.date}</div>
                        </div>
                        <div style={{ fontWeight: 800, color: 'var(--success)' }}>{currencySymbol}{item.amount.toLocaleString('id-ID')}</div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                Di mode <b>Simple</b>, sistem menyelesaikan hutang berantai secara efisien berdasarkan "Status Saldo" (Net Balance).
              </p>

              <div style={{ display: 'grid', gap: '12px' }}>
                {[(explanation as any).from, (explanation as any).to].map((user, i) => (
                  <Card key={i} variant="default" style={{ padding: '16px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 12px 0' }}>Status Saldo {user.name}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Pengeluaran Pribadi (Pakai)</span>
                      <span style={{ fontWeight: 700 }}>{currencySymbol}{user.consumed.toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Dana Talangan (Nalangin)</span>
                      <span style={{ fontWeight: 700 }}>{currencySymbol}{user.paid.toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed var(--border-color)', fontSize: '13px' }}>
                      <span style={{ fontWeight: 800 }}>Saldo Akhir (Net)</span>
                      <span style={{ 
                        fontWeight: 900, 
                        color: user.net > 0 ? 'var(--success)' : user.net < 0 ? 'var(--danger)' : 'var(--text-muted)'
                      }}>
                        {user.net > 0 ? '+' : ''}{currencySymbol}{Math.abs(user.net).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

    </Modal>
  );
};

export default SettlementExplanationModal;
