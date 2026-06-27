import admin from 'firebase-admin';

export const initializeAdmin = () => {
    if (!admin.apps.length) {
        let rawServiceAccountStr = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '').trim();
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
            } catch (e) {}
            return s.replace(/\\"/g, '"');
        };

        const serviceAccountStr = sanitize(rawServiceAccountStr);
        let serviceAccount;
        try {
            serviceAccount = JSON.parse(serviceAccountStr);
        } catch (e1: any) {
            try {
                serviceAccount = JSON.parse(serviceAccountStr.replace(/\r?\n|\r/g, ' '));
            } catch (e2: any) {
                try {
                    serviceAccount = JSON.parse(Buffer.from(rawServiceAccountStr, 'base64').toString('utf8'));
                } catch (e3: any) {
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
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (e: any) {
            console.error('Failed to initialize Firebase Admin', e);
            throw e;
        }
    }
};

export const verifyAuth = async (req: any, res: any) => {
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

export const FREE_QUOTA_LIMITS = {
  chat: 5,
  scan: 3,
  bulk: 2,
};

export const checkAndConsumeQuota = async (uid: string, feature: 'chat' | 'scan' | 'bulk') => {
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
                    await premiumRef.set({ value: premiumData }, { merge: true });
                } else {
                    isPremium = true;
                }
            }
        }
        
        if (isPremium) {
            return { allowed: true, quotaUsed: 0, isPremium: true };
        }
        
        // Check free quota
        const d = new Date();
        const quotaKey = `quota_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const quotaRef = db.collection('users').doc(uid).collection('settings').doc(quotaKey);
        
        const quotaSnap = await quotaRef.get();
        let quotaData: Record<string, number> = { chat: 0, scan: 0, bulk: 0 };
        
        if (quotaSnap.exists) {
            const data = quotaSnap.data();
            quotaData = (data?.value !== undefined ? data.value : data) || { chat: 0, scan: 0, bulk: 0 };
        }
        
        const used = quotaData[feature] || 0;
        const limit = FREE_QUOTA_LIMITS[feature];
        
        if (used >= limit) {
            return { allowed: false, error: 'Quota exceeded' };
        }
        
        // Increment
        quotaData[feature] = used + 1;
        await quotaRef.set({ value: quotaData }, { merge: true });
        
        return { allowed: true, quotaUsed: quotaData[feature], isPremium: false };
        
    } catch (e: any) {
        if (e.code === 8 || e.message?.includes('RESOURCE_EXHAUSTED')) {
            console.error('Firestore Quota Exhausted:', e);
            throw { status: 503, message: 'Layanan database sedang sangat padat. Mohon coba beberapa saat lagi.' };
        }
        console.error('Error checking quota:', e);
        throw { status: 500, message: 'Internal server error while checking quota' };
    }
};
