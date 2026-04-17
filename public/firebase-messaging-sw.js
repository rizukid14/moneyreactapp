importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// This requires actual credentials injected. We can fetch them via URL search params or hardcode during build.
// Since it's public, we'll initialize with basic config.
const firebaseConfig = {
  // We cannot use import.meta.env easily in public folder scripts without compiling.
  // The SDK recommends standard string injection or fetch.
  // For the sake of this migration tool, we will let the user paste them here manually later,
  // or we can use a vite build plugin.
  apiKey: "AIzaSyAZPrhER1evS8tiU1aoayPLe_SguprQrQ0",
  authDomain: "moneyapp-7016a.firebaseapp.com",
  projectId: "moneyapp-7016a",
  storageBucket: "moneyapp-7016a.firebasestorage.app",
  messagingSenderId: "742064429346",
  appId: "1:742064429346:web:971994f09a8468a0e4ad7b"
};

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title || 'MoneyApp Notification';
  const notificationOptions = {
    body: payload.notification.body || '',
    icon: '/favicon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
