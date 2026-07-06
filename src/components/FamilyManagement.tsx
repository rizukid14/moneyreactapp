import React, { useState } from 'react';
import { useFamily } from '../contexts/FamilyContext';
import MaterialIcon from './common/MaterialIcon';
import { useToast } from './common/Toast';
import { auth } from '../lib/firebase';
import { PremiumGate } from './common/PremiumGate';

export const FamilyManagement: React.FC = () => {
  const { families, activeWorkspaceId, createFamily, joinFamily, currentFamily, switchWorkspace } = useFamily();
  const { showToast } = useToast();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await createFamily(newFamilyName.trim());
      showToast('Keluarga berhasil dibuat', 'success');
      setNewFamilyName('');
      setIsCreating(false);
    } catch (e: any) {
      showToast(e.message || 'Gagal membuat keluarga', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await joinFamily(joinCode.trim().toUpperCase());
      showToast('Berhasil bergabung dengan keluarga', 'success');
      setJoinCode('');
      setIsJoining(false);
    } catch (e: any) {
      showToast(e.message || 'Gagal bergabung, cek kode undangan', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const copyJoinCode = () => {
    if (currentFamily?.joinCode) {
      navigator.clipboard.writeText(currentFamily.joinCode);
      showToast('Kode undangan disalin!', 'success');
    }
  };

  return (
    <section id="family-management" className="bg-bg-card p-6 rounded-xl border border-border-light shadow-sm space-y-6">
      <PremiumGate mode="hard">
        <div>
          <h3 className="font-headline-sm text-lg text-on-surface flex items-center gap-2">
            <MaterialIcon name="diversity_3" className="text-primary" />
            Keluarga (Shared Workspace)
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Kelola keuangan bersama keluarga. Sinkronisasi waktu nyata antar perangkat.
          </p>
        </div>

      {activeWorkspaceId && currentFamily && (
        <div className="bg-primary-container p-4 rounded-xl border border-border-light flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Keluarga Saat Ini</p>
              <h4 className="font-headline-sm text-lg text-on-primary-container">{currentFamily.name}</h4>
            </div>
            <button 
              onClick={() => switchWorkspace(null)}
              className="py-1 px-3 bg-surface text-on-surface font-bold text-xs rounded-lg border border-outline-variant hover:bg-surface-container transition-colors cursor-pointer"
            >
              Kembali ke Personal
            </button>
          </div>
          
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Kode Undangan</p>
            <div className="flex items-center gap-2">
              <div className="bg-surface px-4 py-2 rounded-lg border border-outline-variant font-mono font-bold tracking-widest text-on-surface">
                {currentFamily.joinCode}
              </div>
              <button 
                onClick={copyJoinCode}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface border border-outline-variant hover:bg-surface-container transition-colors text-primary cursor-pointer"
              >
                <MaterialIcon name="content_copy" className="text-sm" />
              </button>
            </div>
            <p className="text-[10px] text-on-surface-variant mt-1">
              Bagikan kode ini agar anggota keluarga bisa bergabung.
            </p>
          </div>
          
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Anggota ({currentFamily.members.length})</p>
            <div className="flex flex-wrap gap-2">
              {currentFamily.members.map(memberUid => (
                <div key={memberUid} className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-full border border-outline-variant">
                  <MaterialIcon name="person" className="text-sm text-on-surface-variant" />
                  <span className="text-xs font-bold text-on-surface">
                    {memberUid === auth.currentUser?.uid ? 'Anda' : 'Anggota Keluarga'}
                  </span>
                  {memberUid === currentFamily.ownerId && (
                    <span className="text-[9px] bg-secondary text-on-secondary px-1.5 rounded-full font-bold ml-1">Owner</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        {/* CREATE FAMILY */}
        <div className="flex-1 bg-surface-container-low p-4 rounded-xl border border-outline-variant space-y-4">
          <div className="flex items-center gap-2 text-on-surface font-bold text-sm">
            <MaterialIcon name="add_circle" className="text-primary text-lg" />
            Buat Keluarga Baru
          </div>
          
          {isCreating ? (
            <form onSubmit={handleCreate} className="space-y-3">
              <input 
                type="text" 
                placeholder="Nama Keluarga"
                value={newFamilyName}
                onChange={e => setNewFamilyName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-outline-variant bg-surface text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                required
                autoFocus
                disabled={isSubmitting}
              />
              <div className="flex gap-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-primary text-white font-bold text-xs rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer border-none"
                >
                  Buat
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-surface-variant text-on-surface-variant font-bold text-xs rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer border-none"
                >
                  Batal
                </button>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => { setIsCreating(true); setIsJoining(false); }}
              className="w-full py-2.5 bg-primary text-white font-bold text-xs rounded-lg hover:opacity-90 transition-opacity cursor-pointer border-none"
            >
              Mulai Buat Keluarga
            </button>
          )}
        </div>

        {/* JOIN FAMILY */}
        <div className="flex-1 bg-surface-container-low p-4 rounded-xl border border-outline-variant space-y-4">
          <div className="flex items-center gap-2 text-on-surface font-bold text-sm">
            <MaterialIcon name="group_add" className="text-secondary text-lg" />
            Gabung Keluarga
          </div>
          
          {isJoining ? (
            <form onSubmit={handleJoin} className="space-y-3">
              <input 
                type="text" 
                placeholder="Masukkan Kode (6 karakter)"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full p-2.5 rounded-lg border border-outline-variant bg-surface text-sm uppercase font-mono tracking-widest focus:ring-1 focus:ring-primary focus:outline-none"
                required
                autoFocus
                disabled={isSubmitting}
              />
              <div className="flex gap-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-secondary text-on-secondary font-bold text-xs rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer border-none"
                >
                  Gabung
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsJoining(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-surface-variant text-on-surface-variant font-bold text-xs rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer border-none"
                >
                  Batal
                </button>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => { setIsJoining(true); setIsCreating(false); }}
              className="w-full py-2.5 bg-surface text-on-surface font-bold text-xs rounded-lg border border-outline-variant hover:bg-surface-container transition-colors cursor-pointer"
            >
              Punya Kode Undangan?
            </button>
          )}
        </div>
      </div>
      
      {families.length > 0 && !activeWorkspaceId && (
        <div>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Daftar Keluarga Anda</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {families.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 border border-outline-variant rounded-xl bg-surface">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-container text-primary flex items-center justify-center">
                    <MaterialIcon name="diversity_3" className="text-[18px]" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-on-surface">{f.name}</h5>
                    <p className="text-[10px] text-on-surface-variant">{f.members.length} Anggota</p>
                  </div>
                </div>
                <button 
                  onClick={() => switchWorkspace(f.id)}
                  className="px-3 py-1.5 bg-primary text-white font-bold text-[10px] rounded-full hover:opacity-90 transition-opacity cursor-pointer border-none"
                >
                  Masuk
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      </PremiumGate>
    </section>
  );
};
