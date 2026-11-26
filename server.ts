import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseAppletConfig {
  projectId?: string;
}

let firebaseProjectId = '';
try {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as FirebaseAppletConfig;
    if (parsed.projectId && parsed.projectId !== 'remixed-project-id') {
      firebaseProjectId = parsed.projectId;
    }
  }
} catch (err) {
  console.error('Could not read firebase-applet-config.json:', err);
}

if (firebaseProjectId) {
  const adminApp = getApps().length ? getApp() : initializeApp({ projectId: firebaseProjectId });
  getAuth(adminApp);
}

const ADMIN_EMAILS = new Set(['usitakatelvin@gmail.com']);

interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token || !firebaseProjectId) {
    res.status(401).json({ error: 'Invalid authentication token or Firebase project.' });
    return;
  }
  try {
    const decoded = await getAuth().verifyIdToken(token);
    if (!decoded.email_verified) {
      res.status(403).json({ error: 'Verified email account is required.' });
      return;
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid authentication token.' });
  }
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const email = req.user?.email?.toLowerCase() ?? '';
  if (!req.user?.email_verified || !ADMIN_EMAILS.has(email)) {
    res.status(403).json({ error: 'Administrator access required.' });
    return;
  }
  next();
}

const VALID_REF_REGEX = /^[a-zA-Z0-9_-]{4,128}$/;

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);

  // Paystack Webhook endpoint (raw body required for HMAC-SHA512 verification)
  app.post('/api/paystack/webhook', express.raw({ type: 'application/json' }), (req: Request, res: Response) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      res.status(503).json({ error: 'PAYSTACK_SECRET_KEY not configured.' });
      return;
    }
    const signature = req.headers['x-paystack-signature'];
    if (typeof signature !== 'string' || !Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: 'Missing Paystack signature or payload.' });
      return;
    }
    const expectedHash = crypto.createHmac('sha512', secret).update(req.body).digest('hex');
    const sigBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expectedHash, 'utf8');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      res.status(401).json({ error: 'Invalid Paystack webhook signature.' });
      return;
    }

    try {
      const event = JSON.parse(req.body.toString('utf8')) as {
        event?: string;
        data?: { reference?: string; status?: string; amount?: number; currency?: string };
      };
      console.log('Verified Paystack webhook event:', event.event, event.data?.reference);
      res.status(200).json({ received: true, event: event.event ?? 'unknown' });
    } catch {
      res.status(400).json({ error: 'Malformed webhook JSON payload.' });
    }
  });

  app.use(express.json({ limit: '1mb' }));

  // Public gateway capability status (no secrets exposed)
  app.get('/api/config/public', (_req: Request, res: Response) => {
    const paystackSecretConfigured = Boolean(process.env.PAYSTACK_SECRET_KEY);
    const paystackPublicKey = process.env.VITE_PAYSTACK_PUBLIC_KEY ?? '';
    const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';
    const cloudinarySignedReady = Boolean(
      cloudinaryCloudName && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
    );
    const cloudinaryPresetReady = Boolean(cloudinaryCloudName && process.env.CLOUDINARY_UPLOAD_PRESET);

    res.json({
      paystackConfigured: paystackSecretConfigured,
      paystackPublicKey,
      cloudinaryConfigured: cloudinarySignedReady || cloudinaryPresetReady,
      cloudinaryCloudName,
      termiiConfigured: Boolean(process.env.TERMII_API_KEY),
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
    });
  });

  // Initialize a real Paystack transaction
  app.post('/api/paystack/initialize', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      res.status(503).json({
        error: 'Paystack is not configured on this server. Add PAYSTACK_SECRET_KEY in Settings -> Secrets to enable live/test NGN payments.',
      });
      return;
    }

    const body = req.body as {
      amountNgn?: unknown;
      purpose?: unknown;
      callbackUrl?: unknown;
      metadata?: Record<string, unknown>;
    };

    const amountNgn = typeof body.amountNgn === 'number' ? body.amountNgn : Number(body.amountNgn);
    if (!Number.isFinite(amountNgn) || amountNgn < 100 || amountNgn > 50_000_000) {
      res.status(400).json({ error: 'Invalid payment amount in Naira.' });
      return;
    }

    const customerEmail = req.user?.email;
    if (!customerEmail) {
      res.status(400).json({ error: 'Authenticated customer email is required for Paystack.' });
      return;
    }

    const reference = `FEGGY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin : process.env.APP_URL;
    let safeCallbackUrl = originHeader ? `${originHeader.replace(/\/$/, '')}/checkout` : undefined;
    if (typeof body.callbackUrl === 'string' && body.callbackUrl.startsWith('https://')) {
      safeCallbackUrl = body.callbackUrl;
    }

    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customerEmail,
          amount: Math.round(amountNgn * 100),
          currency: 'NGN',
          reference,
          callback_url: safeCallbackUrl,
          metadata: {
            ...(body.metadata ?? {}),
            userId: req.user?.uid,
            purpose: typeof body.purpose === 'string' ? body.purpose : 'order',
          },
        }),
      });

      const payload = (await response.json()) as {
        status?: boolean;
        message?: string;
        data?: { authorization_url?: string; access_code?: string; reference?: string };
      };

      if (!response.ok || !payload.status || !payload.data?.reference) {
        res.status(502).json({ error: payload.message || 'Unable to initialize Paystack transaction.' });
        return;
      }

      res.json({
        reference: payload.data.reference,
        authorizationUrl: payload.data.authorization_url,
        accessCode: payload.data.access_code,
        amountKobo: Math.round(amountNgn * 100),
        email: customerEmail,
      });
    } catch (err) {
      console.error('Paystack initialize error:', err);
      res.status(502).json({ error: 'Network error communicating with Paystack.' });
    }
  });

  // Verify a real Paystack transaction against Paystack API
  app.get('/api/paystack/verify/:reference', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      res.status(503).json({
        error: 'Paystack is not configured on this server. Add PAYSTACK_SECRET_KEY in Settings -> Secrets.',
      });
      return;
    }

    const referenceParam = req.params.reference;
    const reference = Array.isArray(referenceParam) ? referenceParam[0] : referenceParam;
    if (!reference || !VALID_REF_REGEX.test(reference)) {
      res.status(400).json({ error: 'Invalid Paystack transaction reference format.' });
      return;
    }

    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      });

      const payload = (await response.json()) as {
        status?: boolean;
        message?: string;
        data?: {
          status?: string;
          reference?: string;
          amount?: number;
          currency?: string;
          channel?: string;
          paid_at?: string;
          gateway_response?: string;
          customer?: { email?: string };
          metadata?: Record<string, unknown>;
        };
      };

      if (!response.ok || !payload.status || !payload.data) {
        res.status(502).json({ error: payload.message || 'Paystack verification failed.' });
        return;
      }

      if (payload.data.status !== 'success' || payload.data.currency !== 'NGN') {
        res.status(402).json({
          error: `Transaction is not paid (${payload.data.status ?? 'unknown'}): ${payload.data.gateway_response ?? ''}`,
        });
        return;
      }

      res.json({
        verified: true,
        reference: payload.data.reference,
        amountNgn: Math.round((payload.data.amount ?? 0) / 100),
        currency: payload.data.currency,
        channel: payload.data.channel ?? 'card',
        paidAt: payload.data.paid_at ?? new Date().toISOString(),
        gatewayResponse: payload.data.gateway_response ?? 'Approved',
        customerEmail: payload.data.customer?.email ?? req.user?.email ?? '',
        metadata: payload.data.metadata ?? {},
      });
    } catch (err) {
      console.error('Paystack verify error:', err);
      res.status(502).json({ error: 'Network error verifying transaction with Paystack.' });
    }
  });

  // Cloudinary signed upload parameters (Admin only)
  app.post('/api/cloudinary/signature', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName) {
      res.status(503).json({
        error: 'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server secrets.',
      });
      return;
    }

    const folder = 'feggy-foodstuff/products';
    const timestamp = Math.floor(Date.now() / 1000);

    if (apiKey && apiSecret) {
      const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(toSign).digest('hex');
      res.json({
        mode: 'signed',
        cloudName,
        apiKey,
        timestamp,
        folder,
        signature,
      });
      return;
    }

    if (uploadPreset) {
      res.json({
        mode: 'unsigned',
        cloudName,
        uploadPreset,
        folder,
      });
      return;
    }

    res.status(503).json({
      error: 'Cloudinary credentials incomplete. Provide CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET or CLOUDINARY_UPLOAD_PRESET.',
    });
  });

  // Admin manual reminder dispatch via Termii SMS & Resend Email
  app.post('/api/reminders/send', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const body = req.body as {
      channel?: 'sms' | 'email';
      recipient?: string;
      customerName?: string;
      productName?: string;
      installmentAmountNgn?: number;
      outstandingBalanceNgn?: number;
      frequency?: string;
    };

    if (!body.recipient || !body.channel || !body.productName) {
      res.status(400).json({ error: 'Missing required reminder fields.' });
      return;
    }

    const amountText = `₦${Number(body.installmentAmountNgn ?? 0).toLocaleString('en-NG')}`;
    const balanceText = `₦${Number(body.outstandingBalanceNgn ?? 0).toLocaleString('en-NG')}`;
    const message = `Hello ${body.customerName ?? 'Valued Customer'}, your FEGGY FOODSTUFF ${body.frequency ?? ''} Pay Small Small contribution of ${amountText} for ${body.productName} is due. Remaining balance: ${balanceText}. Log in to pay via Paystack.`;

    if (body.channel === 'sms') {
      const termiiKey = process.env.TERMII_API_KEY;
      if (!termiiKey) {
        res.status(503).json({ error: 'TERMII_API_KEY is not configured for SMS delivery.' });
        return;
      }
      try {
        const smsRes = await fetch('https://api.ng.termii.com/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: body.recipient,
            from: process.env.TERMII_SENDER_ID || 'FeggyFood',
            sms: message,
            type: 'plain',
            channel: 'generic',
            api_key: termiiKey,
          }),
        });
        const smsJson = (await smsRes.json()) as { message_id?: string; message?: string };
        if (!smsRes.ok) {
          res.status(502).json({ error: smsJson.message || 'Termii SMS dispatch failed.' });
          return;
        }
        res.json({ sent: true, channel: 'sms', message, providerId: smsJson.message_id });
        return;
      } catch {
        res.status(502).json({ error: 'Failed to reach Termii SMS gateway.' });
        return;
      }
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      res.status(503).json({ error: 'RESEND_API_KEY is not configured for Email reminders.' });
      return;
    }
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.REMINDER_FROM_EMAIL || 'FEGGY FOODSTUFF <reminders@feggyfoodstuff.ng>',
          to: [body.recipient],
          subject: `Pay Small Small ${body.frequency ?? ''} Reminder — ${body.productName}`,
          text: message,
        }),
      });
      const emailJson = (await emailRes.json()) as { id?: string; message?: string };
      if (!emailRes.ok) {
        res.status(502).json({ error: emailJson.message || 'Resend email dispatch failed.' });
        return;
      }
      res.json({ sent: true, channel: 'email', message, providerId: emailJson.id });
    } catch {
      res.status(502).json({ error: 'Failed to reach Resend email gateway.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FEGGY FOODSTUFF server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
