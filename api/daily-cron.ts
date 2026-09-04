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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    try {
        initializeAdmin();
        const db = admin.firestore();
        const messaging = admin.messaging();
        const wibFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' });
        const todayStr = wibFormatter.format(new Date());
        const today = parseLocalDate(todayStr);

        console.log(`[Cron] Starting Routine Processing for ${todayStr}...`);

        let totalGenerated = 0;
        const messagesToSend: any[] = [];

        // 1. Fetch all recurring transactions across all users using collectionGroup
        const allRecurring = await db.collectionGroup('recurring_transactions').get();
        const activeRecurringDocs = allRecurring.docs.filter(doc => {
            const data = doc.data();
            return data.isActive === true && data.isDeleted !== true;
        });

        if (activeRecurringDocs.length === 0) {
            console.log('[Cron] No active recurring transactions found.');
        } else {
            console.log(`[Cron] Found ${activeRecurringDocs.length} active routines.`);
            
            for (const rtDoc of activeRecurringDocs) {
                const rt = rtDoc.data();
                if (rt.isDeleted) continue;
                // Get parent document ref (e.g. users/[uid] or families/[familyId])
                const parentRef = rtDoc.ref.parent.parent;
                if (!parentRef) continue;

                const startDate = parseLocalDate(rt.startDate || todayStr);
                const originalDay = startDate.getDate();

                const lastDate = rt.lastProcessedDate ? parseLocalDate(rt.lastProcessedDate) : new Date(startDate);

                // If already processed today or in future, skip
                if (lastDate >= today && rt.lastProcessedDate) continue;

                const endDate = rt.endDate ? parseLocalDate(rt.endDate) : null;
                if (endDate) endDate.setHours(23, 59, 59, 999);

                let currentCheck = new Date(lastDate);
                if (rt.lastProcessedDate) {
                    currentCheck = getNextDate(currentCheck, rt.frequency, originalDay);
                }

                const batch = db.batch();
                let hasChanges = false;
                let latestProcessed = rt.lastProcessedDate || null;
                const userGeneratedDetails: string[] = [];
                const now = Date.now();

                while (currentCheck <= today) {
                    if (endDate && currentCheck > endDate) break;

                    const txDate = formatDateStr(currentCheck);
                    const txId = `auto-${rt.id}-${txDate}`;
                    
                    const txRef = parentRef.collection('transactions').doc(txId);
                    const existingTx = await txRef.get();
                    
                    if (!existingTx.exists) {
                        const newTx = {
                            id: txId,
                            type: rt.type || 'pengeluaran',
                            amount: Number(rt.amount) || 0,
                            categoryId: rt.categoryId || null,
                            subCategoryId: rt.subCategoryId || null,
                            assetId: rt.assetId || null,
                            fromAssetId: rt.fromAssetId || null,
                            toAssetId: rt.toAssetId || null,
                            goalId: rt.goalId || null,
                            date: txDate,
                            time: '00:00',
                            note: (rt.note ? `${rt.note} [Auto:${rt.id}]` : `Transaksi Rutin [Auto:${rt.id}]`).trim(),
                            createdAt: `${txDate}T00:00:00.000Z`,
                            updatedAt: now,
                            isDeleted: false
                        };
                        
                        batch.set(txRef, newTx);
                        hasChanges = true;
                        totalGenerated++;
                        userGeneratedDetails.push(`${rt.note || rt.categoryId || 'Rutin'}: Rp${(rt.amount || 0).toLocaleString('id-ID')}`);
                    } else {
                        // If transaction exists but lacks updatedAt, update its updatedAt so deltaSync can pick it up
                        const existingData = existingTx.data();
                        if (existingData && !existingData.updatedAt) {
                            batch.update(txRef, { updatedAt: now });
                            hasChanges = true;
                        }
                    }

                    latestProcessed = txDate;
                    currentCheck = getNextDate(currentCheck, rt.frequency, originalDay);
                }

                if (hasChanges) {
                    batch.update(rtDoc.ref, { 
                        lastProcessedDate: latestProcessed,
                        updatedAt: now
                    });
                    await batch.commit();

                    // Queue notification for this user
                    const tokenDoc = await parentRef.collection('settings').doc('fcmToken').get();
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

        // 3. Process settings across all users (FCM tokens & Premium expiry)
        const settingsDocs = await db.collectionGroup('settings').get();
        const pingedTokens = new Set(messagesToSend.map(m => m.token));
        
        let expiredCount = 0;
        const expireBatch = db.batch();

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
            } else if (docSnap.id === 'premium') {
                const data = docSnap.data()?.value;
                if (data && data.isPremium && data.expiresAt) {
                    const expiresAt = new Date(data.expiresAt);
                    if (expiresAt < today) {
                        expireBatch.update(docSnap.ref, { 
                            'value.isPremium': false, 
                            'value.plan': null,
                            'value.expiresAt': null
                        });
                        expiredCount++;
                        
                        const uid = docSnap.ref.parent.parent?.id;
                        if (uid) {
                            // Find their token if we already fetched it or can fetch it
                            const tokenDoc = settingsDocs.docs.find(d => d.ref.parent.parent?.id === uid && d.id === 'fcmToken');
                            const userToken = tokenDoc?.data()?.value;
                            if (userToken && !pingedTokens.has(userToken)) {
                                messagesToSend.push({
                                    token: userToken,
                                    notification: {
                                        title: 'Akses Premium Berakhir 🔔',
                                        body: 'Masa aktif Premium Anda telah habis. Perpanjang sekarang untuk terus menikmati fitur eksklusif!'
                                    }
                                });
                                pingedTokens.add(userToken);
                            }
                        }
                    }
                }
            }
        });

        if (expiredCount > 0) {
            await expireBatch.commit();
            console.log(`[Cron] Expired ${expiredCount} premium subscriptions.`);
        }
        

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

function parseLocalDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length < 3) return new Date(dateStr);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function formatDateStr(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getNextDate(date: Date, freq: string, originalDay?: number): Date {
    const next = new Date(date);
    if (freq === 'daily') {
        next.setDate(next.getDate() + 1);
        return next;
    }
    if (freq === 'weekly') {
        next.setDate(next.getDate() + 7);
        return next;
    }
    if (freq === 'monthly') {
        const targetDay = originalDay ?? next.getDate();
        let year = next.getFullYear();
        let month = next.getMonth() + 1;
        if (month > 11) {
            year += Math.floor(month / 12);
            month = month % 12;
        }
        const maxDays = new Date(year, month + 1, 0).getDate();
        const day = Math.min(targetDay, maxDays);
        return new Date(year, month, day, 0, 0, 0, 0);
    }
    if (freq === 'yearly') {
        const targetDay = originalDay ?? next.getDate();
        const month = next.getMonth();
        const year = next.getFullYear() + 1;
        const maxDays = new Date(year, month + 1, 0).getDate();
        const day = Math.min(targetDay, maxDays);
        return new Date(year, month, day, 0, 0, 0, 0);
    }
    return next;
}

