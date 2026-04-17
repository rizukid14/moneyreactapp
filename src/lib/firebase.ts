import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase only if config is somewhat valid (prevents crash on load before user sets env)
export const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey.length > 5;

let app;
if (isFirebaseConfigured && getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else if (getApps().length > 0) {
  app = getApps()[0];
} else {
  // Mock app to prevent outright crash so we can show warning UI
  app = initializeApp({ apiKey: 'MOCK', projectId: 'MOCK' }, 'mock');
}

export const db = getFirestore(app);
export const auth = getAuth(app);

// Messaging is only supported in certain browser contexts
export const getMessagingInstance = async () => {
  if (isFirebaseConfigured) {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  }
  return null;
};
