import admin from 'firebase-admin';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Firebase Admin securely inside the serverless function
const initializeAdmin = () => {
    if (!admin.apps.length) {
        let serviceAccountStr = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '').trim();
        if (!serviceAccountStr) {
            throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
        }

        // Remove wrapping quotes if they exist (common in some .env/Vercel environments)
        if ((serviceAccountStr.startsWith("'") && serviceAccountStr.endsWith("'")) || 
            (serviceAccountStr.startsWith('"') && serviceAccountStr.endsWith('"'))) {
                serviceAccountStr = serviceAccountStr.substring(1, serviceAccountStr.length - 1).trim();
        }
        
        let serviceAccount;
        try {
            // Attempt 1: Direct parse
            serviceAccount = JSON.parse(serviceAccountStr);
        } catch (e1: any) {
            try {
                // Attempt 2: Clean up literal newlines and handle potential escaped newlines
                const cleaned = serviceAccountStr
                    .replace(/\r?\n|\r/g, ' ')
                    .replace(/\\n/g, '\n');
                serviceAccount = JSON.parse(cleaned);
            } catch (e2: any) {
                try {
                    // Attempt 3: Base64 fallback
                    serviceAccount = JSON.parse(Buffer.from(serviceAccountStr, 'base64').toString('utf8'));
                } catch (e3: any) {
                    // Extract error position if possible (standard Node SyntaxError format)
                    const posMatch = e1.message.match(/at position (\d+)/);
                    const pos = posMatch ? parseInt(posMatch[1], 10) : 0;
                    
                    const start = Math.max(0, pos - 40);
                    const end = Math.min(serviceAccountStr.length, pos + 40);
                    
                    console.error('[Firebase Init] All parsing attempts failed.', {
                        directError: e1.message,
                        inputLength: serviceAccountStr.length,
                        errorPosition: pos,
                        context: JSON.stringify(serviceAccountStr.substring(start, end)),
                        charCodesNearError: serviceAccountStr.substring(Math.max(0, pos-2), Math.min(serviceAccountStr.length, pos+2)).split('').map(c => c.charCodeAt(0))
                    });
                    throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${e1.message}`);
                }
            }
        }

        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (e: any) {
            console.error('Failed to initialize Firebase Admin', e);
            throw e;
        }
    }
};

export default async function handler(_req: VercelRequest, res: VercelResponse) {
    // Basic security to ensure this is only triggered by Vercel Cron or authorized request
    // Optional: Vercel sends a specific header `x-vercel-cron` we could verify
    
    try {
        initializeAdmin();
        const db = admin.firestore();
        const messaging = admin.messaging();

        console.log('[Cron] Starting Daily Reminder Push Broadcast...');

        // 1. Find all users who have dailyReminder == true
        // In our Firestore schema, this is stored as /users/{uid}/settings/dailyReminder { value: true }
        const dailyReminderDocs = await db.collectionGroup('settings')
            .where('value', '==', true)
            .get();
            
        // Filter out those strictly named "dailyReminder" since FieldPath documentId query on collectionGroups is restricted
        const targetUserUids: string[] = [];
        dailyReminderDocs.forEach(docSnap => {
            if (docSnap.id === 'dailyReminder') {
                // The parent path is /users/{uid}/settings
                const uid = docSnap.ref.parent.parent?.id;
                if (uid) targetUserUids.push(uid);
            }
        });

        console.log(`[Cron] Found ${targetUserUids.length} users with Daily Reminders enabled.`);

        if (targetUserUids.length === 0) {
            return res.status(200).json({ success: true, message: 'No users targeting daily reminder.' });
        }

        // 2. Fetch the FCM Tokens for those specific users
        const tokensToPing: string[] = [];
        
        // Fetch tokens concurrently in small batches
        await Promise.all(targetUserUids.map(async (uid) => {
            try {
                const tokenDoc = await db.doc(`users/${uid}/settings/fcmToken`).get();
                if (tokenDoc.exists) {
                    const tokenData = tokenDoc.data();
                    if (tokenData && typeof tokenData.value === 'string') {
                        tokensToPing.push(tokenData.value);
                    }
                }
            } catch (err) {
                console.warn(`[Cron] Could not fetch token for user ${uid}`);
            }
        }));

        console.log(`[Cron] Found ${tokensToPing.length} active FCM tokens.`);

        if (tokensToPing.length === 0) {
            return res.status(200).json({ success: true, message: 'No active valid tokens found for the targeted users.' });
        }

        // 3. Blast the Multicast Message securely from the cloud!
        const messagePayload = {
            notification: {
                title: 'Pengingat Keuangan 💰',
                body: 'Jangan lupa luangkan 1 menit untuk mencatat pengeluaran Anda hari ini!'
            },
            tokens: tokensToPing,
        };

        const batchResponse = await messaging.sendEachForMulticast(messagePayload);
        
        console.log(`[Cron] Broadcast complete. Success: ${batchResponse.successCount}, Failures: ${batchResponse.failureCount}`);

        return res.status(200).json({
            success: true,
            broadcasted: batchResponse.successCount,
            failures: batchResponse.failureCount
        });

    } catch (error: any) {
        console.error('[Cron] Fatal Error: ', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
