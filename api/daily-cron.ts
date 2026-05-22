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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        console.log(`[Cron] Starting Routine Processing for ${todayStr}...`);

        let totalGenerated = 0;
        const messagesToSend: any[] = [];

        // 1. Fetch all recurring transactions across all users using collectionGroup
        const allRecurring = await db.collectionGroup('recurring_transactions').get();
        const activeRecurringDocs = allRecurring.docs.filter(doc => doc.data().isActive === true);

        if (activeRecurringDocs.length === 0) {
            console.log('[Cron] No active recurring transactions found.');
        } else {
            console.log(`[Cron] Found ${activeRecurringDocs.length} active routines.`);
            
            for (const rtDoc of activeRecurringDocs) {
                const rt = rtDoc.data();
                // Get UID from the document path: users/[uid]/recurring_transactions/[id]
                const uid = rtDoc.ref.parent.parent?.id;
                if (!uid) continue;

                const startDate = new Date(rt.startDate);
                startDate.setHours(0, 0, 0, 0);

                const lastDate = rt.lastProcessedDate ? new Date(rt.lastProcessedDate) : new Date(startDate);
                lastDate.setHours(0, 0, 0, 0);

                // If already processed today or in future, skip
                if (lastDate >= today && rt.lastProcessedDate) continue;

                const endDate = rt.endDate ? new Date(rt.endDate) : null;
                if (endDate) endDate.setHours(23, 59, 59, 999);

                let currentCheck = new Date(lastDate);
                if (rt.lastProcessedDate) {
                    currentCheck = getNextDate(currentCheck, rt.frequency);
                }

                const batch = db.batch();
                let hasChanges = false;
                let latestProcessed = rt.lastProcessedDate || null;
                const userGeneratedDetails: string[] = [];

                while (currentCheck <= today) {
                    if (endDate && currentCheck > endDate) break;

                    const txDate = currentCheck.toISOString().split('T')[0];
                    const txId = `auto-${rt.id}-${txDate}`;
                    
                    // Simple check if already exists to prevent duplicates
                    const existingTx = await db.collection('users').doc(uid).collection('transactions').doc(txId).get();
                    
                    if (!existingTx.exists) {
                        const newTx = {
                            id: txId,
                            type: rt.type,
                            amount: rt.amount,
                            category: rt.category,
                            subCategory: rt.subCategory || null,
                            assetId: rt.assetId || null,
                            fromAssetId: rt.fromAssetId || null,
                            toAssetId: rt.toAssetId || null,
                            goalId: rt.goalId || null,
                            date: txDate,
                            note: `${rt.note} [Auto:${rt.id}]`,
                        };
                        
                        batch.set(db.collection('users').doc(uid).collection('transactions').doc(txId), newTx);
                        hasChanges = true;
                        totalGenerated++;
                        userGeneratedDetails.push(`${rt.note || rt.category}: Rp${rt.amount.toLocaleString('id-ID')}`);
                    }

                    latestProcessed = txDate;
                    currentCheck = getNextDate(currentCheck, rt.frequency);
                }

                if (hasChanges) {
                    batch.update(rtDoc.ref, { lastProcessedDate: latestProcessed });
                    await batch.commit();

                    // Queue notification for this user
                    const tokenDoc = await db.collection('users').doc(uid).collection('settings').doc('fcmToken').get();
                    const token = tokenDoc.data()?.value;

                    if (token) {
                        messagesToSend.push({
                            token,
                            notification: {
                                title: 'Transaksi Rutin Tercatat 💸',
                                body: userGeneratedDetails.length === 1 
                                    ? `Berhasil mencatat: ${userGeneratedDetails[0]}`
                                    : `Berhasil mencatat ${userGeneratedDetails.length} transaksi rutin hari ini.`
                            }
                        });
                    }
                }
            }
        }

        // 3. Send out reminders to everyone else who didn't get a transaction update
        const settingsDocs = await db.collectionGroup('settings').get();
        const pingedTokens = new Set(messagesToSend.map(m => m.token));
        
        settingsDocs.forEach(docSnap => {
            if (docSnap.id === 'fcmToken') {
                const token = docSnap.data()?.value;
                if (token && !pingedTokens.has(token)) {
                    messagesToSend.push({
                        token,
                        notification: {
                            title: 'Pengingat Keuangan 💰',
                            body: 'Jangan lupa luangkan 1 menit untuk mencatat pengeluaran Anda hari ini!'
                        }
                    });
                }
            }
        });

        console.log(`[Cron] Generated ${totalGenerated} transactions. Sending ${messagesToSend.length} notifications.`);

        if (messagesToSend.length > 0) {
            // Note: messaging.sendEach is generally preferred for multiple messages
            await messaging.sendEach(messagesToSend);
        }

        return res.status(200).json({
            success: true,
            generated: totalGenerated,
            notifications: messagesToSend.length
        });

    } catch (error: any) {
        console.error('[Cron] Fatal Error: ', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

function getNextDate(date: Date, freq: string): Date {
    const next = new Date(date);
    if (freq === 'daily')   next.setDate(next.getDate() + 1);
    else if (freq === 'weekly')  next.setDate(next.getDate() + 7);
    else if (freq === 'monthly') next.setMonth(next.getMonth() + 1);
    else if (freq === 'yearly')  next.setFullYear(next.getFullYear() + 1);
    return next;
}
