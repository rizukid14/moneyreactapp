import React, { useMemo } from 'react';

import { type Trip, type TripExpense } from '../../contexts/MoneyContext';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import MaterialIcon from '../common/MaterialIcon';

export interface TripMemberLike {
  id: string;
  name: string;
}

export interface TripLike {
  members: TripMemberLike[];
}

export interface ExpenseSplitLike {
  memberId: string;
  amount: number;
}

export interface ExpenseLike {
  payerId: string;
  description: string;
  date: string;
  amount: number;
  splits?: ExpenseSplitLike[];
}

export interface SettlementDataLike {
  consumed?: Record<string, number>;
  paid?: Record<string, number>;
}

interface DetailedOwedItem {
  description: string;
  date: string;
  amount: number;
}

interface DetailedExplanation {
  type: 'detailed';
  from: string;
  to: string;
  fromOwesTo: DetailedOwedItem[];
  toOwesFrom: DetailedOwedItem[];
}

interface SimpleParty {
  name: string;
  consumed: number;
  paid: number;
  net: number;
}

interface SimpleExplanation {
  type: 'simple';
  from: SimpleParty;
  to: SimpleParty;
  transferAmount: number;
}

type Explanation = DetailedExplanation | SimpleExplanation;

interface SettlementExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  settlement: { from: string; to: string; amount: number } | null;
  mode: 'simple' | 'detailed';
  trip: Trip | TripLike;
  expenses: (TripExpense | ExpenseLike)[];
  currencySymbol: string;
  settlementData?: SettlementDataLike;
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
  const explanation = useMemo((): Explanation | null => {
    if (!settlement || !trip) return null;

    const findMember = (identifier: string): TripMemberLike => {
      const match = trip.members.find((m) => m.id === identifier || m.name === identifier);
      if (match) return match;
      // Fallback for older shared links where 'me' was named 'Saya' but settlement uses real name
      const meMember = trip.members.find((m) => m.id === 'me');
      if (meMember) return meMember;
      return { id: identifier, name: identifier };
    };

    const fromMember = findMember(settlement.from);
    const toMember = findMember(settlement.to);

    if (mode === 'detailed') {
      // Find all expenses where toMember paid and fromMember consumed
      const fromOwesTo = expenses.filter(e => 
        String(e.payerId) === String(toMember.id) && e.splits && e.splits.some((s) => String(s.memberId) === String(fromMember.id))
      ).map(e => ({
        description: e.description,
        date: e.date,
        amount: e.splits?.find((s) => String(s.memberId) === String(fromMember.id))?.amount || 0
      }));

      // Find all expenses where fromMember paid and toMember consumed
      const toOwesFrom = expenses.filter(e => 
        String(e.payerId) === String(fromMember.id) && e.splits && e.splits.some((s) => String(s.memberId) === String(toMember.id))
      ).map(e => ({
        description: e.description,
        date: e.date,
        amount: e.splits?.find((s) => String(s.memberId) === String(toMember.id))?.amount || 0
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
      if (settlementData && settlementData.consumed && settlementData.paid) {
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
            e.splits.forEach((s) => {
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
  }, [settlement, mode, trip, expenses, settlementData]);

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
        <span style={{ fontWeight: 800, fontSize: '16px' }}>{explanation.from ? (typeof explanation.from === 'string' ? explanation.from : explanation.from.name) : ''}</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <MaterialIcon name="arrow_forward" className="text-[20px]" />
          <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--primary)' }}>{currencySymbol}{settlement.amount.toLocaleString('id-ID')}</span>
        </div>
        <span style={{ fontWeight: 800, fontSize: '16px' }}>{explanation.to ? (typeof explanation.to === 'string' ? explanation.to : explanation.to.name) : ''}</span>
      </Card>

      {explanation.type === 'detailed' ? (
        <div style={{ display: 'grid', gap: '20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            Ini adalah rincian histori timbal balik antara <b>{explanation.from}</b> dan <b>{explanation.to}</b>.
          </p>

          {explanation.fromOwesTo.length > 0 && (
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <MaterialIcon name="call_received" className="text-[14px]" /> Hutang {explanation.from} ke {explanation.to}
              </h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {explanation.fromOwesTo.map((item, i) => (
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

          {explanation.toOwesFrom.length > 0 && (
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <MaterialIcon name="call_made" className="text-[14px]" /> Piutang {explanation.from} dari {explanation.to}
              </h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {explanation.toOwesFrom.map((item, i) => (
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
            Di mode <b>Simple</b>, sistem menyelesaikan hutang berantai secara efisien berdasarkan &quot;Status Saldo&quot; (Net Balance).
          </p>

          <div style={{ display: 'grid', gap: '12px' }}>
            {[explanation.from, explanation.to].map((user, i) => (
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
