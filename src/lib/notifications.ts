import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance } from './firebase';
import { dbPutSetting } from './db';

export const setupPushNotifications = async (): Promise<boolean> => {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    console.warn('[MoneyApp] This browser does not support Firebase Cloud Messaging.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('[MoneyApp] Notification permission granted.');
      
      // Get the unique FCM device token
      const currentToken = await getToken(messaging);
      
      if (currentToken) {
        // Save token to Firestore so the backend knows where to push messages
        console.log('[MoneyApp] FCM Token generated:', currentToken);
        await dbPutSetting('fcmToken', currentToken);
        
        // Listen for foreground messages while the app is actively open
        onMessage(messaging, (payload) => {
          console.log('[MoneyApp] Foreground message received:', payload);
          // Show a local notification
          new Notification(payload.notification?.title || 'System', {
            body: payload.notification?.body || 'You have a new message',
            icon: '/favicon.svg'
          });
        });
        
        return true;
      } else {
        console.warn('[MoneyApp] Failed to generate FCM token. Make sure VAPID key is configured later if necessary.');
        return false;
      }
    } else {
      console.warn('[MoneyApp] Notification permission denied.');
      return false;
    }
  } catch (error) {
    console.error('[MoneyApp] Error setting up notifications:', error);
    return false;
  }
};
