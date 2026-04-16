importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// This requires actual credentials injected. We can fetch them via URL search params or hardcode during build.
// Since it's public, we'll initialize with basic config.
const firebaseConfig = {
  // We cannot use import.meta.env easily in public folder scripts without compiling.
  // The SDK recommends standard string injection or fetch.
  // For the sake of this migration tool, we will let the user paste them here manually later,
  // or we can use a vite build plugin.
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

// Initialize Firebase App
if (firebaseConfig.apiKey !== "REPLACE_ME") {
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
}
