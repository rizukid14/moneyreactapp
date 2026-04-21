import admin from 'firebase-admin';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Firebase Admin securely inside the serverless function
const initializeAdmin = () => {
    if (!admin.apps.length) {
        let rawServiceAccountStr = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '').trim();
        if (!rawServiceAccountStr) {
            throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
        }

        const sanitize = (val: string) => {
            let s = val.trim();
            // 1. Handle wrapping quotes
            if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
                s = s.substring(1, s.length - 1).trim();
            }
            // 2. Handle URL-encoding (%22)
            try {
                if (s.includes('%')) s = decodeURIComponent(s);
            } catch (e) {}
            // 3. Unescape quotes (if they were mangled to \")
            return s.replace(/\\"/g, '"');
        };

        const serviceAccountStr = sanitize(rawServiceAccountStr);
        
        let serviceAccount;
        try {
            // Attempt 1: Direct parse
            serviceAccount = JSON.parse(serviceAccountStr);
        } catch (e1: any) {
            try {
                // Attempt 2: Handle literal newlines that break JSON.parse
                // We replace them with spaces to make it technically valid JSON, 
                // but we MUST restore the newlines in the private_key later.
                serviceAccount = JSON.parse(serviceAccountStr.replace(/\r?\n|\r/g, ' '));
            } catch (e2: any) {
                try {
                    // Attempt 3: Base64 fallback
                    serviceAccount = JSON.parse(Buffer.from(rawServiceAccountStr, 'base64').toString('utf8'));
                } catch (e3: any) {
                    const posMatch = e1.message.match(/at position (\d+)/);
                    const pos = posMatch ? parseInt(posMatch[1], 10) : 0;
                    console.error('[Firebase Init] All parsing attempts failed.', {
                        directError: e1.message,
                        inputLength: serviceAccountStr.length,
                        contextSnippet: JSON.stringify(serviceAccountStr.substring(Math.max(0, pos-40), Math.min(serviceAccountStr.length, pos+40)))
                    });
                    throw new Error(`Critical: Failed to parse Firebase Key: ${e1.message}`);
                }
            }
        }

        // CRITICAL: Restore PEM format for private_key (essential to avoid DECODER routines error)
        if (serviceAccount && typeof serviceAccount.private_key === 'string') {
            let key = serviceAccount.private_key;
            // 1. Convert literal \\n sequences to real newlines
            key = key.replace(/\\n/g, '\n');
            // 2. If the key has no newlines but has spaces (common after Attempt 2), 
            // we must restore the PEM structure.
            if (key.includes('-----BEGIN PRIVATE KEY-----') && !key.includes('\n')) {
                key = key.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
                         .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')
                         .replace(/([^-]) (?!-)/g, '$1\n'); // Replace internal spaces with \n
            }
            serviceAccount.private_key = key;
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

        // 1. Find all users who have an fcmToken registered
        // We query the collection group 'settings' and filter for docs named 'fcmToken' in-memory
        // to avoid the need for custom Firestore indices.
        const settingsDocs = await db.collectionGroup('settings').get();
            
        const tokensToPing: string[] = [];
        settingsDocs.forEach(docSnap => {
            if (docSnap.id === 'fcmToken') {
                const token = docSnap.data()?.value;
                if (typeof token === 'string') {
                    tokensToPing.push(token);
                }
            }
        });

        console.log(`[Cron] Found ${tokensToPing.length} active FCM tokens.`);

        if (tokensToPing.length === 0) {
            return res.status(200).json({ success: true, message: 'No active valid tokens found.' });
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
