importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Firebase config for background push notifications (Service Worker context).
// These values are duplicated here because Service Workers cannot use import.meta.env.
// Replace these with your actual Firebase project values from the Firebase Console.
const firebaseConfig = {
  apiKey: "YOUR_VITE_FIREBASE_API_KEY",
  authDomain: "YOUR_VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "YOUR_VITE_FIREBASE_PROJECT_ID",
  storageBucket: "YOUR_VITE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "YOUR_VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "YOUR_VITE_FIREBASE_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title || 'MoneyApp Notification';
  const notificationOptions = {
    body: payload.notification.body || '',
    icon: '/favicon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Intercept Web Share Target POST requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const title = formData.get('title') || '';
          const text = formData.get('text') || '';
          const sharedUrl = formData.get('url') || '';
          const file = formData.get('files'); // matches manifest params.files name 'files'

          // Open custom cache for shared data
          const cache = await caches.open('shared-data');

          // Store metadata
          const metadata = {
            title,
            text,
            url: sharedUrl,
            hasFile: !!file
          };

          await cache.put(
            new Request('/shared-metadata.json'),
            new Response(JSON.stringify(metadata), {
              headers: { 'Content-Type': 'application/json' }
            })
          );

          // Store file blob if present
          if (file) {
            await cache.put(
              new Request('/shared-file.bin'),
              new Response(file, {
                headers: {
                  'Content-Type': file.type || 'application/octet-stream',
                  'Content-Disposition': `attachment; filename="${file.name || 'shared-file'}"`
                }
              })
            );
          } else {
            await cache.delete('/shared-file.bin');
          }

          // Redirect to appropriate route based on shared content
          // If it contains a file, redirect to Receipt Scanner. Otherwise, redirect to Bulk Input.
          const redirectUrl = file ? '/scan?shared=true' : '/bulk-input?shared=true';
          return Response.redirect(redirectUrl, 303);
        } catch (err) {
          console.error('[sw] Error handling share target:', err);
          return Response.redirect('/?shared-error=true', 303);
        }
      })()
    );
  }
});
