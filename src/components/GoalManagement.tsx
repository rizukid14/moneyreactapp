import React, { useState, useMemo } from 'react';
import MaterialIcon from './common/MaterialIcon';
import { useMoney, type Goal, type SavingsChallenge, type UserProfile } from '../contexts/MoneyContext';
import { EmergencyFundShield } from './EmergencyFundShield';
import { SavingsChallengeCard } from './SavingsChallengeCard';

import GoalModal from './modals/GoalModal';
import ConfirmDialog from './common/ConfirmDialog';
import DropdownMenu from './common/DropdownMenu';

const fmt = (val: number, sym: string) => `${sym}${val.toLocaleString('id-ID')}`;

const GoalCard: React.FC<{
  goal: Goal;
  currentAmount: number;
  onEdit: () => void;
  onDelete: () => void;
  currencySymbol: string;
}> = ({ goal, currentAmount, onEdit, onDelete, currencySymbol }) => {
  const percent = goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0;
  const isCompleted = percent >= 100;
  
  // Calculate pace and ETA
  const createdAt = new Date(goal.createdAt);
  const now = new Date();
  const daysSinceStart = Math.max(1, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
  const pacePerDay = currentAmount / daysSinceStart;
  const remainingAmount = goal.targetAmount - currentAmount;
  
  let etaText = '--';
  let status: 'on_track' | 'behind' | 'completed' = 'on_track';
  
  if (isCompleted) {
    status = 'completed';
    etaText = 'Selesai!';
  } else if (pacePerDay > 0) {
    const daysToFinish = Math.ceil(remainingAmount / pacePerDay);
    const finishDate = new Date(now.getTime() + daysToFinish * (1000 * 60 * 60 * 24));
    const targetDate = new Date(goal.targetDate);
    
    etaText = finishDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    if (finishDate > targetDate) status = 'behind';
  }

  return (
    <div className={`bg-bg-card dark:bg-surface-container-low p-6 rounded-xl border shadow-sm group relative overflow-hidden transition-shadow hover:shadow-md ${
      isCompleted ? 'border-2 border-success' : 'border border-border-light'
    }`}>
      {isCompleted && (
        <div className="absolute top-0 right-0 bg-success text-white text-[10px] px-3 py-1 font-bold rounded-bl-lg">SELESAI</div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? 'bg-success-container text-success' : 'bg-primary-container/30 text-primary'}`}>
            <MaterialIcon name={isCompleted ? "check_circle" : "flag"} className="text-xl" />
          </div>
          <div>
            <h3 className="font-extrabold text-on-surface text-base sm:text-lg">{goal.name}</h3>
            <div className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
              <MaterialIcon name="calendar_today" className="text-xs" /> Target: {new Date(goal.targetDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
        <DropdownMenu 
          items={[
            { icon: 'edit', label: 'Edit', onClick: onEdit },
            { icon: 'delete', label: 'Hapus', danger: true, onClick: onDelete }
          ]}
        />
      </div>

      <div className="flex justify-between text-sm text-on-surface-variant mb-2">
        <span>Terkumpul: <span className="font-bold text-on-surface">{fmt(currentAmount, currencySymbol)}</span> <span className="opacity-60">/ {fmt(goal.targetAmount, currencySymbol)}</span></span>
        <span className={`font-extrabold ${isCompleted ? 'text-success' : status === 'behind' ? 'text-amber-500' : 'text-primary'}`}>
          {Math.floor(percent)}%
        </span>
      </div>

      <div className="w-full h-3 rounded-full overflow-hidden bg-surface-container mb-4">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-success' : status === 'behind' ? 'bg-amber-500' : 'bg-primary'}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 bg-surface-container-lowest border border-border-light rounded-xl text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-0.5">Estimasi Selesai</span>
          <div className="font-bold text-on-surface flex items-center gap-1">
            <MaterialIcon name="schedule" className={`text-xs ${status === 'behind' ? 'text-amber-500' : 'text-primary'}`} />
            <span>{etaText}</span>
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-0.5">Status</span>
          <div className={`font-extrabold flex items-center gap-1 ${isCompleted ? 'text-success' : status === 'behind' ? 'text-amber-500' : 'text-primary'}`}>
            {isCompleted ? 'Selesai' : status === 'behind' ? 'Terlambat' : 'On Track'}
          </div>
        </div>
      </div>
    </div>
  );
};

export const GoalManagement: React.FC<{ hideSubTabs?: boolean }> = ({ hideSubTabs = false }) => {
  const { goals, transactions, assets, addGoal, updateGoal, deleteGoal, currencySymbol, getAssetBalance, user, updateUser } = useMoney();
  const [activeSubTab, setActiveSubTab] = useState<'goals' | 'emergency' | 'challenge'>('goals');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string }>({ open: false, id: '' });

  const updateUserProfile = (updatedFields: Partial<UserProfile>) => {
    updateUser({ ...user, ...updatedFields });
  };

  const goalAllocations = useMemo(() => {
    const map: Record<string, number> = {};
    goals.forEach(g => {
      // Filter transactions linked to this goal
      const linkedTxs = transactions.filter(tx => tx.goalId === g.id);
      let total = linkedTxs.reduce((sum, tx) => {
        if (tx.type === 'pendapatan') return sum + tx.amount;
        if (tx.type === 'transfer') return sum + tx.amount; // Transfer TO goal
        if (tx.type === 'pengeluaran') return sum - tx.amount; // Spending FROM goal
        return sum;
      }, 0);
      
      map[g.id] = Math.max(0, total);
    });
    return map;
  }, [goals, transactions]);

  const openAdd = () => { setEditingGoal(null); setIsModalOpen(true); };
  const handleEdit = (g: Goal) => { setEditingGoal(g); setIsModalOpen(true); };
  const handleDelete = (id: string) => {
    setDeleteConfirm({ open: true, id });
  };

  const handleUpdateChallenge = (challenge: SavingsChallenge) => {
    const currentList: SavingsChallenge[] = user?.savingsChallenges || [];
    const idx = currentList.findIndex((c: SavingsChallenge) => c.id === challenge.id);
    let updatedList: SavingsChallenge[];
    if (idx >= 0) {
      updatedList = currentList.map((c: SavingsChallenge) => (c.id === challenge.id ? challenge : c));
    } else {
      updatedList = [...currentList, challenge];
    }
    updateUserProfile({ savingsChallenges: updatedList });
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs Header (Hidden when hideSubTabs is true) */}
      {!hideSubTabs && (
        <div className="flex items-center gap-1.5 p-1 bg-surface-container-lowest rounded-xl border border-border-light text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('goals')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer ${
              activeSubTab === 'goals'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface bg-transparent'
            }`}
          >
            <MaterialIcon name="flag" className="text-base" /> Target Impian
          </button>

          <button
            onClick={() => setActiveSubTab('emergency')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer ${
              activeSubTab === 'emergency'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface bg-transparent'
            }`}
          >
            <MaterialIcon name="shield" className="text-base" /> Emergency Shield
          </button>

          <button
            onClick={() => setActiveSubTab('challenge')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer ${
              activeSubTab === 'challenge'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface bg-transparent'
            }`}
          >
            <MaterialIcon name="military_tech" className="text-base" /> Challenge 🏆
          </button>
        </div>
      )}

      {activeSubTab === 'goals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-headline-md font-extrabold flex items-center gap-2 text-on-surface">
              <MaterialIcon name="flag" className="text-primary text-xl md:text-2xl" />
              <span>Target Tabungan Impian</span>
            </h2>
            <button onClick={openAdd} className="flex items-center gap-1.5 text-primary font-bold text-xs md:text-sm hover:underline shrink-0 border-none bg-transparent cursor-pointer">
              <MaterialIcon name="add_circle" className="text-sm md:text-base" />
              <span>Buat Target Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {goals.map(g => (
              <div key={g.id} onClick={e => e.stopPropagation()}>
                <GoalCard
                  goal={g}
                  currentAmount={goalAllocations[g.id] || 0}
                  onEdit={() => handleEdit(g)}
                  onDelete={() => handleDelete(g.id)}
                  currencySymbol={currencySymbol}
                />
              </div>
            ))}
            {goals.length === 0 && (
              <div className="col-span-full py-12 text-center text-on-surface-variant bg-surface-container-low rounded-xl border border-dashed border-outline-variant">
                <MaterialIcon name="flag" className="text-4xl mb-2 opacity-50 block mx-auto" />
                <p className="font-bold text-sm">Belum ada target tabungan</p>
                <p className="text-xs mt-1">Mulai buat rencana untuk wujudkan impian Anda!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'emergency' && (
        <EmergencyFundShield
          assets={assets}
          transactions={transactions}
          getAssetBalance={getAssetBalance}
          targetMonths={user?.emergencyFundMonthsTarget || 6}
          onUpdateTargetMonths={months => updateUserProfile({ emergencyFundMonthsTarget: months })}
        />
      )}

      {activeSubTab === 'challenge' && (
        <SavingsChallengeCard
          challenges={user?.savingsChallenges}
          onUpdateChallenge={handleUpdateChallenge}
          rewardPoints={user?.rewardPoints || 0}
          onRewardPointsChange={pts => updateUserProfile({ rewardPoints: pts })}
        />
      )}

      <GoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        goals={goals}
        assets={assets}
        addGoal={addGoal}
        updateGoal={updateGoal}
        editingGoal={editingGoal}
        currencySymbol={currencySymbol}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: '' })}
        onConfirm={() => deleteGoal(deleteConfirm.id)}
        title="Hapus Target"
        message="Yakin ingin menghapus target tabungan ini? Riwayat transaksi yang terhubung akan tetap ada namun tidak lagi tertaut."
        type="danger"
        confirmText="Ya, Hapus"
      />
    </div>
  );
};
