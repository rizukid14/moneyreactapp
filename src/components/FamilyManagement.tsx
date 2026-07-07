import React, { useState } from 'react';
import { useFamily } from '../contexts/FamilyContext';
import MaterialIcon from './common/MaterialIcon';
import { useToast } from './common/Toast';
import { auth } from '../lib/firebase';
import { PremiumGate } from './common/PremiumGate';
import { Modal } from './ui/Modal';
import ConfirmDialog from './common/ConfirmDialog';

export const FamilyManagement: React.FC = () => {
  const { 
    families, 
    activeWorkspaceId, 
    createFamily, 
    joinFamily, 
    currentFamily, 
    switchWorkspace,
    editFamilyName,
    leaveFamily,
    removeMember,
    transferOwnership,
    deleteFamily
  } = useFamily();
  const { showToast } = useToast();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Management State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const triggerConfirm = (params: {
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }) => {
    setConfirmDialog({
      isOpen: true,
      ...params
    });
  };

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

  // Management Handlers
  const handleEditNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim() || isSubmitting || !activeWorkspaceId) return;
    setIsSubmitting(true);
    try {
      await editFamilyName(activeWorkspaceId, editedName.trim());
      showToast('Nama keluarga berhasil diubah', 'success');
      setIsEditingName(false);
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah nama', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveFamily = async (familyId: string) => {
    const fam = families.find(f => f.id === familyId);
    if (!fam) return;

    if (fam.ownerId === auth.currentUser?.uid) {
      showToast('Pemilik tidak bisa keluar. Harap transfer kepemilikan terlebih dahulu.', 'warning');
      return;
    }

    triggerConfirm({
      title: 'Keluar dari Keluarga',
      message: `Yakin ingin keluar dari keluarga "${fam.name}"? Anda tidak akan bisa mengakses workspace ini lagi.`,
      type: 'warning',
      confirmText: 'Ya, Keluar',
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          await leaveFamily(familyId);
          showToast('Berhasil keluar dari keluarga', 'success');
        } catch (err: any) {
          showToast(err.message || 'Gagal keluar dari keluarga', 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handleRemoveMember = (memberUid: string) => {
    if (!activeWorkspaceId) return;
    triggerConfirm({
      title: 'Keluarkan Anggota',
      message: 'Yakin ingin mengeluarkan anggota ini dari keluarga?',
      type: 'danger',
      confirmText: 'Ya, Keluarkan',
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          await removeMember(activeWorkspaceId, memberUid);
          showToast('Anggota berhasil dikeluarkan', 'success');
        } catch (err: any) {
          showToast(err.message || 'Gagal mengeluarkan anggota', 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handleTransferOwnership = (memberUid: string) => {
    if (!activeWorkspaceId) return;
    triggerConfirm({
      title: 'Transfer Kepemilikan',
      message: 'Yakin ingin mentransfer kepemilikan keluarga ini? Anda akan menjadi anggota biasa.',
      type: 'warning',
      confirmText: 'Transfer',
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          await transferOwnership(activeWorkspaceId, memberUid);
          showToast('Kepemilikan berhasil ditransfer', 'success');
        } catch (err: any) {
          showToast(err.message || 'Gagal mentransfer kepemilikan', 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handleDeleteFamily = async () => {
    if (!activeWorkspaceId || !currentFamily) return;
    if (deleteConfirmText.trim() !== currentFamily.name) {
      showToast('Nama keluarga yang dimasukkan tidak cocok', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteFamily(activeWorkspaceId);
      showToast('Keluarga berhasil dihapus', 'success');
      setIsDeleteModalOpen(false);
      setDeleteConfirmText('');
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus keluarga', 'error');
    } finally {
      setIsSubmitting(false);
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
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Keluarga Saat Ini</p>
                {isEditingName ? (
                  <form onSubmit={handleEditNameSubmit} className="flex items-center gap-2 mt-1">
                    <input 
                      type="text"
                      value={editedName}
                      onChange={e => setEditedName(e.target.value)}
                      className="p-1.5 rounded-lg border border-outline-variant bg-surface text-sm focus:outline-none focus:ring-1 focus:ring-primary min-w-0 flex-1 max-w-[200px]"
                      required
                      autoFocus
                    />
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="p-1.5 bg-primary text-white rounded-lg hover:opacity-90 border-none cursor-pointer flex items-center justify-center"
                    >
                      <MaterialIcon name="check" className="text-sm" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="p-1.5 bg-surface-variant text-on-surface-variant rounded-lg hover:bg-surface-container-high border-none cursor-pointer flex items-center justify-center"
                    >
                      <MaterialIcon name="close" className="text-sm" />
                    </button>
                  </form>
                ) : (
                  <h4 className="font-headline-sm text-lg text-on-primary-container flex items-center gap-2">
                    {currentFamily.name}
                    {currentFamily.ownerId === auth.currentUser?.uid && (
                      <button 
                        onClick={() => {
                          setEditedName(currentFamily.name);
                          setIsEditingName(true);
                        }}
                        className="p-1 bg-transparent hover:bg-surface-container/30 rounded text-primary border-none cursor-pointer flex items-center justify-center opacity-70 hover:opacity-100 transition-all"
                        title="Ubah nama keluarga"
                      >
                        <MaterialIcon name="edit" className="text-sm" />
                      </button>
                    )}
                  </h4>
                )}
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
              <div className="flex flex-col gap-2">
                {currentFamily.members.map(memberUid => {
                  const isMe = memberUid === auth.currentUser?.uid;
                  const isOwner = memberUid === currentFamily.ownerId;
                  const amIOwner = currentFamily.ownerId === auth.currentUser?.uid;
                  
                  return (
                    <div key={memberUid} className="flex items-center justify-between bg-surface px-4 py-2.5 rounded-xl border border-outline-variant">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isOwner ? 'bg-secondary-container text-secondary' : 'bg-surface-variant text-on-surface-variant'}`}>
                          <MaterialIcon name={isOwner ? "shield_person" : "person"} className="text-sm" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-on-surface">
                            {isMe ? 'Anda' : `Anggota (${memberUid.substring(0, 6)}...)`}
                          </span>
                          {isOwner && (
                            <span className="text-[9px] text-secondary font-bold">Pemilik (Owner)</span>
                          )}
                        </div>
                      </div>
                      
                      {amIOwner && !isMe && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTransferOwnership(memberUid)}
                            className="p-1 text-secondary hover:bg-secondary-container rounded-lg border-none bg-transparent cursor-pointer flex items-center justify-center"
                            title="Transfer Kepemilikan"
                          >
                            <MaterialIcon name="swap_horiz" className="text-lg" />
                          </button>
                          <button
                            onClick={() => handleRemoveMember(memberUid)}
                            className="p-1 text-error hover:bg-error-container rounded-lg border-none bg-transparent cursor-pointer flex items-center justify-center"
                            title="Keluarkan dari Keluarga"
                          >
                            <MaterialIcon name="close" className="text-lg" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons inside current family */}
            <div className="flex gap-2 border-t border-border-light pt-4 mt-2">
              {currentFamily.ownerId === auth.currentUser?.uid ? (
                <button 
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex-1 py-2.5 bg-error text-white font-bold text-xs rounded-xl hover:opacity-90 transition-opacity border-none cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MaterialIcon name="delete" className="text-sm" />
                  Hapus Keluarga
                </button>
              ) : (
                <button 
                  onClick={() => handleLeaveFamily(activeWorkspaceId!)}
                  className="flex-1 py-2.5 bg-error-container text-error font-bold text-xs rounded-xl hover:bg-error/10 transition-colors border border-error/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MaterialIcon name="logout" className="text-sm" />
                  Keluar dari Keluarga
                </button>
              )}
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
                  <div className="flex items-center gap-2">
                    {f.ownerId === auth.currentUser?.uid ? (
                      <button 
                        onClick={() => {
                          triggerConfirm({
                            title: 'Hapus Keluarga',
                            message: `Yakin ingin menghapus keluarga "${f.name}"? Semua data di dalamnya akan dibersihkan secara permanen.`,
                            type: 'danger',
                            confirmText: 'Hapus',
                            onConfirm: async () => {
                              setIsSubmitting(true);
                              try {
                                await deleteFamily(f.id);
                                showToast('Keluarga berhasil dihapus', 'success');
                              } catch (err: any) {
                                showToast(err.message || 'Gagal menghapus', 'error');
                              } finally {
                                setIsSubmitting(false);
                              }
                            }
                          });
                        }}
                        className="p-1.5 bg-error-container text-error rounded-full hover:opacity-90 transition-opacity cursor-pointer border-none flex items-center justify-center"
                        title="Hapus Keluarga"
                      >
                        <MaterialIcon name="delete" className="text-sm" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleLeaveFamily(f.id)}
                        className="p-1.5 bg-surface-variant text-on-surface-variant rounded-full hover:bg-surface-container transition-colors cursor-pointer border border-outline-variant flex items-center justify-center"
                        title="Keluar dari Keluarga"
                      >
                        <MaterialIcon name="logout" className="text-sm" />
                      </button>
                    )}
                    <button 
                      onClick={() => switchWorkspace(f.id)}
                      className="px-3 py-1.5 bg-primary text-white font-bold text-[10px] rounded-full hover:opacity-90 transition-opacity cursor-pointer border-none"
                    >
                      Masuk
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </PremiumGate>

      {/* Delete Family Confirm Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteConfirmText('');
        }}
        title="Hapus Keluarga Permanen"
      >
        <div className="space-y-4">
          <div className="p-3 bg-error-container text-error rounded-xl text-xs flex gap-2">
            <MaterialIcon name="warning" className="text-lg flex-shrink-0" />
            <div>
              <p className="font-bold mb-1">Tindakan Destruktif!</p>
              <p>Menghapus keluarga akan melenyapkan semua data transaksi, kategori, budget, aset, dan riwayat di dalam workspace keluarga ini secara permanen dari Cloud.</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs font-bold text-on-surface">
              Ketik <span className="font-mono text-error">{(currentFamily || families.find(f => f.id === activeWorkspaceId))?.name}</span> untuk mengonfirmasi:
            </p>
            <input 
              type="text"
              placeholder="Ketik nama keluarga"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              className="w-full p-3 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:ring-1 focus:ring-error"
            />
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteConfirmText('');
              }}
              className="flex-1 py-2.5 bg-surface-variant text-on-surface-variant font-bold text-xs rounded-xl hover:bg-surface-container border-none cursor-pointer"
            >
              Batal
            </button>
            <button 
              onClick={handleDeleteFamily}
              disabled={isSubmitting || deleteConfirmText.trim() !== (currentFamily || families.find(f => f.id === activeWorkspaceId))?.name}
              className="flex-[1.5] py-2.5 bg-error text-white font-bold text-xs rounded-xl hover:opacity-90 disabled:opacity-50 transition-all border-none cursor-pointer flex items-center justify-center gap-1.5"
            >
              <MaterialIcon name="delete_forever" className="text-sm" />
              Hapus Permanen
            </button>
          </div>
        </div>
      </Modal>

      {/* Global Confirm Dialog */}
      <ConfirmDialog 
        {...confirmDialog} 
        onClose={() => setConfirmDialog(p => ({ ...p, isOpen: false }))} 
      />
    </section>
  );
};
