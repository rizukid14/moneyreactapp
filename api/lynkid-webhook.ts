import admin from 'firebase-admin';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

// Initialize Firebase Admin securely inside the serverless function
const initializeAdmin = () => {
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

export const config = {
    api: {
        bodyParser: false,
    },
};

/**
 * Verify the Lynk.id webhook signature.
 * Lynk.id sends a HMAC-SHA256 signature in the `x-lynk-signature` header,
 * generated using the Merchant Key from your Lynk.id dashboard.
 */
function verifySignature(payload: string, signature: string, merchantKey: string): boolean {
    try {
        const expected = crypto.createHmac('sha256', merchantKey).update(payload, 'utf8').digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
    } catch {
        return false;
    }
}

async function getRawBody(req: VercelRequest): Promise<string> {
    const chunks: any[] = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const merchantKey = process.env.LYNKID_MERCHANT_KEY;
    if (!merchantKey) {
        console.error('Missing LYNKID_MERCHANT_KEY environment variable');
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    // Capture the exact raw body string BEFORE any JSON parsing
    const rawBody = await getRawBody(req);
    
    // ── Signature verification ──────────────────────────────────────────
    const signature = req.headers['x-lynk-signature'] as string | undefined;

    if (signature) {
        if (!verifySignature(rawBody, signature, merchantKey)) {
            console.warn('Invalid Lynk.id signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }
    } else {
        // Fallback or Test Ping mode
        const token = req.headers['x-webhook-token'];
        let payloadObj: any = {};
        try { payloadObj = JSON.parse(rawBody); } catch (e) {}

        // If it's just a test event from Lynk.id, allow it to pass for testing purposes
        if (payloadObj.event === 'test' || payloadObj.event === 'ping') {
            console.log('[LynkID] Received test/ping event from dashboard');
            return res.status(200).json({ status: 'success', message: 'Test connection successful' });
        }

        if (token !== merchantKey) {
            console.warn('Unauthorized webhook attempt (no signature, token mismatch)');
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    try {
        initializeAdmin();
        const db = admin.firestore();

        // Now we can safely parse the body for processing
        let payload: any;
        try {
            payload = JSON.parse(rawBody);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON payload' });
        }

        // ── Validate event type ─────────────────────────────────────────
        if (!payload || payload.event !== 'payment.received') {
            return res.status(200).json({ status: 'ignored', reason: 'Not a payment event' });
        }

        const data = payload.data;
        if (!data || data.message_action !== 'SUCCESS') {
            return res.status(200).json({ status: 'ignored', reason: 'Payment not successful' });
        }

        const messageData = data.message_data;
        if (!messageData) {
            return res.status(200).json({ status: 'ignored', reason: 'No message data' });
        }

        // ── Extract transaction info ────────────────────────────────────
        const refId = messageData.refId;
        const customerEmail = messageData.customer?.email?.toLowerCase()?.trim() || '';
        const customerName = messageData.customer?.name || 'Unknown';
        const grandTotal = messageData.totals?.grandTotal || 0;
        const items = messageData.items || [];
        const productTitle = items[0]?.title || '';

        // ── Extract activation code from notes/questions ────────────────
        // User is instructed to paste their 6-char code in the OTP field
        const questionsRaw = items[0]?.questions || '{}';
        let activationCode = '';
        try {
            const questions = typeof questionsRaw === 'string' ? JSON.parse(questionsRaw) : questionsRaw;
            
            // First, specifically look for a field named 'otp' (case insensitive)
            for (const key of Object.keys(questions)) {
                if (key.toLowerCase().includes('otp')) {
                    const val = String(questions[key] || '').trim().toUpperCase();
                    if (/^[A-Z2-9]{6}$/.test(val)) {
                        activationCode = val;
                        break;
                    }
                }
            }

            // Fallback: Look for the activation code in any question answer
            if (!activationCode) {
                for (const key of Object.keys(questions)) {
                    const val = String(questions[key] || '').trim().toUpperCase();
                    if (/^[A-Z2-9]{6}$/.test(val)) {
                        activationCode = val;
                        break;
                    }
                }
            }
        } catch { /* ignore parse errors */ }

        // Also try to find code in voucher field or shipping info (common notes fields)
        if (!activationCode) {
            const possibleCode = (messageData.voucherCode || messageData.shippingInfo || '').trim().toUpperCase();
            if (/^[A-Z2-9]{6}$/.test(possibleCode)) {
                activationCode = possibleCode;
            }
        }

        console.log(`[LynkID] Payment received: ${customerEmail} | code:${activationCode || 'none'} | ${productTitle} | Rp${grandTotal} | ref:${refId}`);

        // ── Determine plan from price ───────────────────────────────────
        let plan: 'monthly' | 'semi-annual' | 'yearly';
        if (grandTotal >= 199000) {
            plan = 'yearly';
        } else if (grandTotal >= 99000) {
            plan = 'semi-annual';
        } else if (grandTotal >= 20000) {
            plan = 'monthly';
        } else {
            // Fallback: try to detect from product title
            const titleLower = productTitle.toLowerCase();
            if (titleLower.includes('tahun') || titleLower.includes('yearly') || titleLower.includes('annual') || titleLower.includes('year')) {
                plan = 'yearly';
            } else if (titleLower.includes('6 bulan') || titleLower.includes('semi-annual') || titleLower.includes('6 month')) {
                plan = 'semi-annual';
            } else {
                plan = 'monthly';
            }
            console.log(`[LynkID] Price (${grandTotal}) below threshold, detected plan "${plan}" from title.`);
        }

        // ── Find Firebase user: activation code first, then email ───────
        let uid: string | null = null;
        let matchMethod = '';

        // Strategy 1: Match by activation code (most reliable)
        if (activationCode) {
            const codeQuery = await db.collectionGroup('settings')
                .where('value', '==', activationCode)
                .get();

            for (const doc of codeQuery.docs) {
                if (doc.id === 'premiumActivationCode') {
                    uid = doc.ref.parent.parent?.id || null;
                    matchMethod = 'activation_code';
                    break;
                }
            }

            if (uid) {
                console.log(`[LynkID] Matched activation code ${activationCode} → uid ${uid}`);
            } else {
                console.log(`[LynkID] Activation code ${activationCode} not found in any user settings`);
            }
        }

        // Strategy 2: Fall back to email match
        if (!uid && customerEmail) {
            try {
                const userRecord = await admin.auth().getUserByEmail(customerEmail);
                uid = userRecord.uid;
                matchMethod = 'email';
                console.log(`[LynkID] Matched email ${customerEmail} → uid ${uid}`);
            } catch {
                console.warn(`[LynkID] No Firebase user found for email: ${customerEmail}`);
            }
        }

        if (!uid) {
            console.error(`[LynkID] Could not match user. email=${customerEmail}, code=${activationCode}`);
            return res.status(200).json({ status: 'error', reason: 'Could not match to any user' });
        }

        console.log(`[LynkID] User resolved via ${matchMethod}: uid=${uid}`);

        // ── Activate/extend premium ─────────────────────────────────────
        const userRef = db.collection('users').doc(uid);
        const premiumRef = userRef.collection('settings').doc('premium');
        const premiumSnap = await premiumRef.get();

        const now = new Date();
        let expiresAt = new Date();

        // If already premium with future expiry, extend from that date
        if (premiumSnap.exists) {
            const currentPremium = premiumSnap.data()?.value;
            if (currentPremium?.isPremium && currentPremium.expiresAt) {
                const currentExpiry = new Date(currentPremium.expiresAt);
                if (currentExpiry > now) {
                    expiresAt = currentExpiry;
                }
            }
        }

        if (plan === 'yearly') {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else if (plan === 'semi-annual') {
            expiresAt.setMonth(expiresAt.getMonth() + 6);
        } else {
            expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        const newPremiumData = {
            isPremium: true,
            plan,
            activatedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            lynkIdRefId: refId,
            customerName,
            customerEmail,
        };

        await premiumRef.set({ value: newPremiumData });

        // ── Destroy activation code ─────────────────────────────────────
        try {
            const activationCodeRef = userRef.collection('settings').doc('premiumActivationCode');
            await activationCodeRef.delete();
            console.log(`[LynkID] Destroyed activation code for uid: ${uid}`);
        } catch (e) {
            console.warn(`[LynkID] Failed to destroy activation code for uid: ${uid}`, e);
        }

        console.log(`[LynkID] Successfully activated ${plan} premium for ${customerEmail} (uid: ${uid}), expires: ${expiresAt.toISOString()}`);

        return res.status(200).json({ status: 'success', plan, uid, expiresAt: expiresAt.toISOString() });
    } catch (error: any) {
        console.error('[LynkID] Webhook processing error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
