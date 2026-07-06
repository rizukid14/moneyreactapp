import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db as firestore, auth, isFirebaseConfigured } from './firebase';

const SYNCED_COLLECTIONS = [
  'transactions',
  'assets',
  'categories',
  'debts',
  'goals',
  'contacts',
  'subscriptions',
  'trips',
  'trip_expenses',
  'monthly_incomes',
  'budget_reallocations',
  'notifications',
  'recurring_transactions'
];

let unsubscribers: (() => void)[] = [];

// Track the last sync timestamp per workspace to keep delta pulls strict.
// Using localStorage because it needs to persist globally.
export const getDeltaLastSyncTimestamp = (workspaceId: string | null): number => {
  const key = workspaceId ? `delta_sync_time_${workspaceId}` : 'delta_sync_time_personal';
  const val = localStorage.getItem(key);
  return val ? parseInt(val, 10) : 0;
};

export const setDeltaLastSyncTimestamp = (workspaceId: string | null, timestamp: number) => {
  const key = workspaceId ? `delta_sync_time_${workspaceId}` : 'delta_sync_time_personal';
  localStorage.setItem(key, String(timestamp));
};

export const startDeltaListeners = (
  workspaceId: string | null,
  getWorkspacePath: (col: string) => string,
  onDocChange: (collectionName: string, docData: any, changeType: 'added' | 'modified' | 'removed') => void
) => {
  stopDeltaListeners();

  if (!isFirebaseConfigured || !auth.currentUser) return;

  const lastSync = getDeltaLastSyncTimestamp(workspaceId);

  SYNCED_COLLECTIONS.forEach((colName) => {
    try {
      const colRef = collection(firestore, getWorkspacePath(colName));
      // Subtract 5 seconds to handle clock drift/latency
      const sinceTime = Math.max(0, lastSync - 5000);
      
      const q = sinceTime > 0
        ? query(colRef, where('updatedAt', '>', sinceTime))
        : colRef;

      const unsub = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const docData = { id: change.doc.id, ...change.doc.data() } as any;

          // Skip local changes since local handlers already updated state and IDB
          if (snapshot.metadata.hasPendingWrites) {
            return;
          }

          onDocChange(colName, docData, change.type);
        });

        // Find max updatedAt to progress sync timestamp safely
        let maxUpdatedAt = lastSync;
        snapshot.docs.forEach((doc) => {
          const uAt = doc.data().updatedAt;
          if (typeof uAt === 'number' && uAt > maxUpdatedAt) {
            maxUpdatedAt = uAt;
          }
        });
        
        const newTimestamp = Math.max(maxUpdatedAt, Date.now());
        setDeltaLastSyncTimestamp(workspaceId, newTimestamp);
      }, (error) => {
        console.error(`[deltaSync] Error listening to ${colName}:`, error);
      });

      unsubscribers.push(unsub);
    } catch (e) {
      console.error(`[deltaSync] Failed to setup listener for ${colName}:`, e);
    }
  });
  console.log(`[deltaSync] Started real-time delta listeners for workspace: ${workspaceId || 'Personal'} (lastSync: ${lastSync})`);
};

export const stopDeltaListeners = () => {
  unsubscribers.forEach((unsub) => unsub());
  unsubscribers = [];
  console.log('[deltaSync] Stopped all listeners.');
};
