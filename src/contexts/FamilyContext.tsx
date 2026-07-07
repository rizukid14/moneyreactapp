import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, query, where } from 'firebase/firestore';
import { auth, db as firestore, isFirebaseConfigured } from '../lib/firebase';
import { setSyncWorkspace, dbPutSetting } from '../lib/db';

export interface Family {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  joinCode: string;
  createdAt: number;
}

interface FamilyContextProps {
  activeWorkspaceId: string | null;
  families: Family[];
  currentFamily: Family | null;
  isLoading: boolean;
  createFamily: (name: string) => Promise<void>;
  joinFamily: (joinCode: string) => Promise<void>;
  switchWorkspace: (workspaceId: string | null) => Promise<void>;
  editFamilyName: (familyId: string, newName: string) => Promise<void>;
  leaveFamily: (familyId: string) => Promise<void>;
  removeMember: (familyId: string, memberUid: string) => Promise<void>;
  transferOwnership: (familyId: string, newOwnerUid: string) => Promise<void>;
  deleteFamily: (familyId: string) => Promise<void>;
}

const FamilyContext = createContext<FamilyContextProps>({
  activeWorkspaceId: null,
  families: [],
  currentFamily: null,
  isLoading: true,
  createFamily: async () => {},
  joinFamily: async () => {},
  switchWorkspace: async () => {},
  editFamilyName: async () => {},
  leaveFamily: async () => {},
  removeMember: async () => {},
  transferOwnership: async () => {},
  deleteFamily: async () => {},
});

export const useFamily = () => useContext(FamilyContext);

export const FamilyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize workspace from local settings or auth
  useEffect(() => {
    const init = async () => {
      if (!isFirebaseConfigured) {
        setIsLoading(false);
        return;
      }
      
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user) {
          await loadFamilies(user.uid);
          // Use localStorage strictly to avoid cross-db contamination
          let savedWorkspace = localStorage.getItem('activeWorkspaceId');

          if (savedWorkspace && savedWorkspace !== 'null') {
            setActiveWorkspaceId(savedWorkspace);
            await setSyncWorkspace(savedWorkspace);
          }
          setIsLoading(false);
        } else {
          setFamilies([]);
          setActiveWorkspaceId(null);
          setIsLoading(false);
        }
      });
      return () => unsubscribe();
    };
    init();
  }, []);

  const loadFamilies = async (uid: string) => {
    try {
      const q = query(collection(firestore, 'families'), where('members', 'array-contains', uid));
      const querySnapshot = await getDocs(q);
      const loadedFamilies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Family));
      setFamilies(loadedFamilies);
    } catch (e) {
      console.error("Error loading families:", e);
    }
  };

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createFamily = async (name: string) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const uid = auth.currentUser.uid;
    const newFamilyRef = doc(collection(firestore, 'families'));
    
    const newFamily: Family = {
      id: newFamilyRef.id,
      name,
      ownerId: uid,
      members: [uid],
      joinCode: generateJoinCode(),
      createdAt: Date.now(),
    };

    await setDoc(newFamilyRef, newFamily);
    
    // Update local state
    setFamilies(prev => [...prev, newFamily]);
    
    // Switch to new family
    await switchWorkspace(newFamily.id);
  };

  const joinFamily = async (joinCode: string) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const uid = auth.currentUser.uid;
    
    const q = query(collection(firestore, 'families'), where('joinCode', '==', joinCode));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error("Kode undangan tidak valid atau tidak ditemukan");
    }
    
    const familyDoc = querySnapshot.docs[0];
    const familyData = familyDoc.data() as Family;
    
    if (familyData.members.includes(uid)) {
      throw new Error("Anda sudah menjadi anggota keluarga ini");
    }
    
    await updateDoc(doc(firestore, 'families', familyDoc.id), {
      members: arrayUnion(uid)
    });
    
    await loadFamilies(uid);
    await switchWorkspace(familyDoc.id);
  };

  const editFamilyName = async (familyId: string, newName: string) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const family = families.find(f => f.id === familyId);
    if (!family) throw new Error("Family tidak ditemukan");
    if (family.ownerId !== auth.currentUser.uid) throw new Error("Hanya pemilik keluarga yang bisa mengubah nama");

    await updateDoc(doc(firestore, 'families', familyId), { name: newName });
    setFamilies(prev => prev.map(f => f.id === familyId ? { ...f, name: newName } : f));
  };

  const transferOwnership = async (familyId: string, newOwnerUid: string) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const family = families.find(f => f.id === familyId);
    if (!family) throw new Error("Family tidak ditemukan");
    if (family.ownerId !== auth.currentUser.uid) throw new Error("Hanya pemilik keluarga yang bisa mentransfer kepemilikan");
    if (!family.members.includes(newOwnerUid)) throw new Error("Pemilik baru harus terdaftar sebagai anggota keluarga");

    await updateDoc(doc(firestore, 'families', familyId), { ownerId: newOwnerUid });
    setFamilies(prev => prev.map(f => f.id === familyId ? { ...f, ownerId: newOwnerUid } : f));
  };

  const leaveFamily = async (familyId: string) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const uid = auth.currentUser.uid;
    const family = families.find(f => f.id === familyId);
    if (!family) throw new Error("Family tidak ditemukan");
    if (family.ownerId === uid) throw new Error("Pemilik tidak bisa keluar. Harap transfer kepemilikan terlebih dahulu.");

    await updateDoc(doc(firestore, 'families', familyId), {
      members: arrayRemove(uid)
    });

    if (activeWorkspaceId === familyId) {
      await switchWorkspace(null);
    } else {
      setFamilies(prev => prev.filter(f => f.id !== familyId));
    }
  };

  const removeMember = async (familyId: string, memberUid: string) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const family = families.find(f => f.id === familyId);
    if (!family) throw new Error("Family tidak ditemukan");
    if (family.ownerId !== auth.currentUser.uid) throw new Error("Hanya pemilik keluarga yang bisa mengeluarkan anggota");
    if (memberUid === auth.currentUser.uid) throw new Error("Anda tidak bisa mengeluarkan diri sendiri");

    await updateDoc(doc(firestore, 'families', familyId), {
      members: arrayRemove(memberUid)
    });
    setFamilies(prev => prev.map(f => f.id === familyId ? { ...f, members: f.members.filter(m => m !== memberUid) } : f));
  };

  const deleteFamily = async (familyId: string) => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const family = families.find(f => f.id === familyId);
    if (!family) throw new Error("Family tidak ditemukan");
    if (family.ownerId !== auth.currentUser.uid) throw new Error("Hanya pemilik keluarga yang bisa menghapus keluarga");

    // Cleanup sub-collections
    const collectionsToCleanup = [
      'transactions', 'assets', 'categories', 'debts', 'recurring_transactions', 
      'contacts', 'subscriptions', 'goals', 'trips', 'trip_expenses', 
      'monthly_incomes', 'budget_reallocations', 'notifications', 'settings'
    ];

    for (const col of collectionsToCleanup) {
      try {
        const colRef = collection(firestore, `families/${familyId}/${col}`);
        const snapshot = await getDocs(colRef);
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      } catch (e) {
        console.error(`Failed to clean up family subcollection: ${col}`, e);
      }
    }

    // Delete the family doc itself
    await deleteDoc(doc(firestore, 'families', familyId));

    if (activeWorkspaceId === familyId) {
      await switchWorkspace(null);
    } else {
      setFamilies(prev => prev.filter(f => f.id !== familyId));
    }
  };

  const switchWorkspace = async (workspaceId: string | null) => {
    setIsLoading(true);
    setActiveWorkspaceId(workspaceId);
    
    if (workspaceId) {
      localStorage.setItem('activeWorkspaceId', workspaceId);
    } else {
      localStorage.removeItem('activeWorkspaceId');
      // Force clear the IDB setting as well so fallback doesn't trigger
      await dbPutSetting('activeWorkspaceId', null);
    }
    
    await setSyncWorkspace(workspaceId);
    
    // Force a full re-sync from cloud for this new workspace
    // The MoneyContext will need to be re-initialized.
    // For now, reloading the page is the safest way to re-init all contexts cleanly
    window.location.reload(); 
  };

  const currentFamily = activeWorkspaceId ? families.find(f => f.id === activeWorkspaceId) || null : null;

  return (
    <FamilyContext.Provider value={{
      activeWorkspaceId,
      families,
      currentFamily,
      isLoading,
      createFamily,
      joinFamily,
      switchWorkspace,
      editFamilyName,
      leaveFamily,
      removeMember,
      transferOwnership,
      deleteFamily
    }}>
      {children}
    </FamilyContext.Provider>
  );
};
