import admin from 'firebase-admin';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Firebase Admin securely inside the serverless function
const initializeAdmin = () => {
    if (!admin.apps.length) {
        const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!serviceAccountStr) {
            throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
        }
        
        try {
            // Sanitizing string for JSON format (Vercel ENV often adds literal newlines)
            const serviceAccount = serviceAccountStr.startsWith('{') 
                ? JSON.parse(serviceAccountStr.replace(/\r?\n|\r/g, '')) 
                : JSON.parse(Buffer.from(serviceAccountStr, 'base64').toString('ascii'));
                
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (e) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY', e);
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
