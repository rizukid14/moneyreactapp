import admin from 'firebase-admin';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeAdmin } from './_admin.js';

const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
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

        console.log('[Cron] Starting Weekly Report Push Broadcast...');

        // 1. Find all users who have an fcmToken registered
        // We query the collection group 'settings' and filter for docs named 'fcmToken' in-memory
        // to avoid the need for custom Firestore indices.
        const settingsDocs = await db.collectionGroup('settings').get();
            
        const targets: { uid: string, token: string }[] = [];
        settingsDocs.forEach(docSnap => {
            if (docSnap.id === 'fcmToken') {
                const token = docSnap.data()?.value;
                const uid = docSnap.ref.parent.parent?.id;
                if (typeof token === 'string' && uid) {
                    targets.push({ uid, token });
                }
            }
        });

        console.log(`[Cron] Found ${targets.length} users with active FCM tokens.`);

        if (targets.length === 0) {
            return res.status(200).json({ success: true, message: 'No users with active tokens found.' });
        }

        // Calculate time window (Last 7 days in WIB)
        const wibFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' });
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const sevenDaysAgoStr = wibFormatter.format(sevenDaysAgo); // Format: YYYY-MM-DD

        let successCount = 0;
        let failureCount = 0;

        // 2. Process each user individually (for customized metrics)
        await Promise.all(targets.map(async ({ uid, token: fcmToken }) => {
            try {
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

    } catch (error: unknown) {
        console.error('[Cron] Fatal Error: ', error);
        const err = error as { message?: string };
        return res.status(500).json({ success: false, error: err.message || 'Internal error' });
    }
}
