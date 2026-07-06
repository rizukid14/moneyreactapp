import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { collection, doc, getDocs, setDoc, updateDoc, arrayUnion, query, where } from 'firebase/firestore';
import { auth, db as firestore, isFirebaseConfigured } from '../lib/firebase';
import { setSyncWorkspace, dbGetSetting, dbPutSetting } from '../lib/db';

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
}

const FamilyContext = createContext<FamilyContextProps>({
  activeWorkspaceId: null,
  families: [],
  currentFamily: null,
  isLoading: true,
  createFamily: async () => {},
  joinFamily: async () => {},
  switchWorkspace: async () => {},
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
          const savedWorkspace = await dbGetSetting('activeWorkspaceId');
          if (savedWorkspace) {
            await switchWorkspace(savedWorkspace);
          } else {
            setIsLoading(false);
          }
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

  const switchWorkspace = async (workspaceId: string | null) => {
    setIsLoading(true);
    setActiveWorkspaceId(workspaceId);
    await dbPutSetting('activeWorkspaceId', workspaceId);
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
      switchWorkspace
    }}>
      {children}
    </FamilyContext.Provider>
  );
};
