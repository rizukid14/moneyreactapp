import admin from 'firebase-admin';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FREE_QUOTA_LIMITS, getQuotaKey, type QuotaFeature } from '../shared/quota.js';

export { FREE_QUOTA_LIMITS, getQuotaKey };

export const getErrorResponse = (e: unknown): { status: number; message: string } => {
    if (e && typeof e === 'object') {
        const err = e as { status?: number; message?: string; code?: number | string };
        return { status: err.status || 500, message: err.message || 'Internal server error' };
    }
    return { status: 500, message: 'Internal server error' };
};

export const initializeAdmin = () => {
    if (!admin.apps.length) {
        const rawServiceAccountStr = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '').trim();
        if (!rawServiceAccountStr) {
            throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
        }

        const sanitize = (val: string) => {
            let s = val.trim();
            if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
                s = s.substring(1, s.length - 1).trim();
            }
            try {
                if (s.includes('%')) s = decodeURIComponent(s);
            } catch {
                // Ignore decode failure
            }
            return s.replace(/\\"/g, '"');
        };

        const serviceAccountStr = sanitize(rawServiceAccountStr);
        let serviceAccount: admin.ServiceAccount | undefined;
        try {
            serviceAccount = JSON.parse(serviceAccountStr);
        } catch {
            try {
                serviceAccount = JSON.parse(serviceAccountStr.replace(/\r?\n|\r/g, ' '));
            } catch {
                try {
                    serviceAccount = JSON.parse(Buffer.from(rawServiceAccountStr, 'base64').toString('utf8'));
                } catch {
                    throw new Error(`Critical: Failed to parse Firebase Key`);
                }
            }
        }

        if (serviceAccount && typeof serviceAccount.private_key === 'string') {
            let key = serviceAccount.private_key;
            key = key.replace(/\\n/g, '\n');
            if (key.includes('-----BEGIN PRIVATE KEY-----') && !key.includes('\n')) {
                key = key.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
                         .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')
                         .replace(/([^-]) (?!-)/g, '$1\n');
            }
            serviceAccount.private_key = key;
        }

        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
            });
        } catch (e: unknown) {
            console.error('Failed to initialize Firebase Admin', e);
            throw e;
        }
    }
};

export const verifyAuth = async (req: VercelRequest, res: VercelResponse) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Unauthorized: Missing or invalid token' });
        return null;
    }
    const token = authHeader.split('Bearer ')[1];
    
    try {
        initializeAdmin();
        const decodedToken = await admin.auth().verifyIdToken(token);
        return decodedToken;
    } catch (error) {
        console.error('Firebase Auth Error:', error);
        res.status(401).json({ message: 'Unauthorized: Invalid token' });
        return null;
    }
};

export const checkAndConsumeQuota = async (uid: string, feature: QuotaFeature) => {
    initializeAdmin();
    const db = admin.firestore();
    
    try {
        const premiumRef = db.collection('users').doc(uid).collection('settings').doc('premium');
        const premiumSnap = await premiumRef.get();
        let isPremium = false;
        
        if (premiumSnap.exists) {
            const data = premiumSnap.data();
            const premiumData = data?.value !== undefined ? data.value : data;
            
            if (premiumData && premiumData.isPremium) {
                if (premiumData.expiresAt && new Date(premiumData.expiresAt) < new Date()) {
                    // Downgrade permanently
                    premiumData.isPremium = false;
                    premiumData.plan = null;
                    await premiumRef.set({ value: premiumData, updatedAt: Date.now() }, { merge: true });
                } else {
                    isPremium = true;
                }
            }
        }
        
        if (isPremium) {
            return { allowed: true, quotaUsed: 0, isPremium: true };
        }
        
        // Check free quota (atomic read-modify-write via transaction)
        const quotaKey = getQuotaKey();
        const quotaRef = db.collection('users').doc(uid).collection('settings').doc(quotaKey);
        const limit = FREE_QUOTA_LIMITS[feature];

        // Centralized rate-limiting via Firestore sliding window: max 30 hits/minute per UID
        const rateLimitRef = db.collection('users').doc(uid).collection('settings').doc('_rate_limit');

        const result = await db.runTransaction(async (tx) => {
            const nowMs = Date.now();
            const rlSnap = await tx.get(rateLimitRef);
            let rlData = { count: 0, windowStart: nowMs };
            if (rlSnap.exists) {
                const raw = rlSnap.data();
                rlData = (raw?.value !== undefined ? raw.value : raw) || rlData;
            }

            if (nowMs - (rlData.windowStart || 0) < 60000) {
                if ((rlData.count || 0) >= 30) {
                    return { rateLimited: true as const, allowed: false as const };
                }
                tx.set(rateLimitRef, { value: { count: (rlData.count || 0) + 1, windowStart: rlData.windowStart }, updatedAt: nowMs }, { merge: true });
            } else {
                tx.set(rateLimitRef, { value: { count: 1, windowStart: nowMs }, updatedAt: nowMs }, { merge: true });
            }

            const quotaSnap = await tx.get(quotaRef);
            let quotaData: Record<string, number> = { chat: 0, scan: 0, bulk: 0 };

            if (quotaSnap.exists) {
                const data = quotaSnap.data();
                quotaData = (data?.value !== undefined ? data.value : data) || { chat: 0, scan: 0, bulk: 0 };
            }

            const used = quotaData[feature] || 0;
            if (used >= limit) {
                return { rateLimited: false as const, allowed: false as const };
            }

            const next = { ...quotaData, [feature]: used + 1 };
            tx.set(quotaRef, { value: next, updatedAt: Date.now() }, { merge: true });
            return { rateLimited: false as const, allowed: true as const, quotaUsed: next[feature] };
        });

        if (result.rateLimited) {
            throw { status: 429, message: 'Terlalu banyak permintaan. Mohon tunggu 1 menit.' };
        }

        if (!result.allowed) {
            return { allowed: false, error: 'Quota exceeded' };
        }

        return { allowed: true, quotaUsed: result.quotaUsed, isPremium: false };
        
    } catch (e: unknown) {
        const err = e as { code?: number; message?: string };
        if (err.code === 8 || err.message?.includes('RESOURCE_EXHAUSTED')) {
            console.error('Firestore Quota Exhausted:', e);
            throw { status: 503, message: 'Layanan database sedang sangat padat. Mohon coba beberapa saat lagi.' };
        }
        console.error('Error checking quota:', e);
        throw { status: 500, message: 'Internal server error while checking quota' };
    }
};
