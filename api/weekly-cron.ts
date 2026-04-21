import admin from 'firebase-admin';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Firebase Admin securely inside the serverless function
const initializeAdmin = () => {
    if (!admin.apps.length) {
        let rawServiceAccountStr = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '').trim();
        if (!rawServiceAccountStr) {
            throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
        }

        const sanitize = (str: string) => {
            let s = str.trim();
            // 1. Remove wrapping quotes if they exist
            if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
                s = s.substring(1, s.length - 1).trim();
            }
            // 2. Handle URL-encoded characters (like %22)
            try {
                if (s.includes('%')) s = decodeURIComponent(s);
            } catch (e) { /* ignore encoding errors and try raw */ }
            // 3. Handle double-escaping (e.g. \" -> " and \\n -> \n)
            return s.replace(/\\"/g, '"').replace(/\\n/g, '\n');
        };

        const serviceAccountStr = sanitize(rawServiceAccountStr);
        
        let serviceAccount;
        try {
            // Attempt 1: Direct parse
            serviceAccount = JSON.parse(serviceAccountStr);
        } catch (e1: any) {
            try {
                // Attempt 2: Fallback for mixed literal newlines
                serviceAccount = JSON.parse(serviceAccountStr.replace(/\r?\n|\r/g, ' '));
            } catch (e2: any) {
                try {
                    // Attempt 3: Base64 fallback (on the original raw string)
                    serviceAccount = JSON.parse(Buffer.from(rawServiceAccountStr, 'base64').toString('utf8'));
                } catch (e3: any) {
                    const posMatch = e1.message.match(/at position (\d+)/);
                    const pos = posMatch ? parseInt(posMatch[1], 10) : 0;
                    const start = Math.max(0, pos - 40);
                    const end = Math.min(serviceAccountStr.length, pos + 40);
                    
                    console.error('[Firebase Init] All parsing attempts failed.', {
                        directError: e1.message,
                        inputLength: serviceAccountStr.length,
                        errorPosition: pos,
                        contextSnippet: JSON.stringify(serviceAccountStr.substring(start, end)),
                        charCodes: serviceAccountStr.substring(Math.max(0, pos-2), Math.min(serviceAccountStr.length, pos+2)).split('').map(c => c.charCodeAt(0))
                    });
                    throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY after sanitization: ${e1.message}`);
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

const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

export default async function handler(_req: VercelRequest, res: VercelResponse) {
    try {
        initializeAdmin();
        const db = admin.firestore();
        const messaging = admin.messaging();

        console.log('[Cron] Starting Weekly Report Push Broadcast...');

        // 1. Find all users who have weeklyReport == true
        const weeklyReportDocs = await db.collectionGroup('settings')
            .where('value', '==', true)
            .get();
            
        const targetUserUids: string[] = [];
        weeklyReportDocs.forEach(docSnap => {
            if (docSnap.id === 'weeklyReport') {
                const uid = docSnap.ref.parent.parent?.id;
                if (uid) targetUserUids.push(uid);
            }
        });

        console.log(`[Cron] Found ${targetUserUids.length} users with Weekly Reports enabled.`);

        if (targetUserUids.length === 0) {
            return res.status(200).json({ success: true, message: 'No users targeting weekly report.' });
        }

        // Calculate time window (Last 7 days)
        const now = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        let successCount = 0;
        let failureCount = 0;

        // 2. Process each user individually (for customized metrics)
        await Promise.all(targetUserUids.map(async (uid) => {
            try {
                // Fetch Token
                const tokenDoc = await db.doc(`users/${uid}/settings/fcmToken`).get();
                if (!tokenDoc.exists || !tokenDoc.data()?.value) return;
                const fcmToken = tokenDoc.data()?.value as string;

                // Fetch recent transactions (Filter securely server-side)
                const txSnapshot = await db.collection(`users/${uid}/transactions`)
                    .where('date', '>=', sevenDaysAgoStr)
                    .get();

                let totalIncome = 0;
                let totalExpense = 0;

                txSnapshot.forEach(txDoc => {
                    const tx = txDoc.data();
                    if (tx.type === 'pendapatan') totalIncome += (tx.amount || 0);
                    if (tx.type === 'pengeluaran') totalExpense += (tx.amount || 0);
                });

                // Construct personalized message
                const bodyText = `Income: ${formatRupiah(totalIncome)} | Expense: ${formatRupiah(totalExpense)}`;

                // Send explicitly to this specific user's device
                await messaging.send({
                    token: fcmToken,
                    notification: {
                        title: 'Laporan Finansial Mingguan 📊',
                        body: bodyText
                    }
                });

                successCount++;
            } catch (err) {
                console.error(`[Cron] Failed processing weekly report for user ${uid}`, err);
                failureCount++;
            }
        }));

        console.log(`[Cron] Weekly Broadcast complete. Success: ${successCount}, Failures: ${failureCount}`);

        return res.status(200).json({
            success: true,
            broadcasted: successCount,
            failures: failureCount
        });

    } catch (error: any) {
        console.error('[Cron] Fatal Error: ', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
