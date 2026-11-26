import { auth } from './firebase';

export interface PublicGatewayConfig {
  paystackConfigured: boolean;
  paystackPublicKey: string;
  cloudinaryConfigured: boolean;
  cloudinaryCloudName: string;
  termiiConfigured: boolean;
  resendConfigured: boolean;
}

export interface VerifiedPaystackPayment {
  verified: boolean;
  reference: string;
  amountNgn: number;
  currency: string;
  channel: string;
  paidAt: string;
  gatewayResponse: string;
  customerEmail: string;
  metadata: Record<string, unknown>;
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        ref: string;
        metadata?: Record<string, unknown>;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
  }
}

export async function fetchPublicGatewayConfig(): Promise<PublicGatewayConfig> {
  const res = await fetch('/api/config/public');
  if (!res.ok) {
    return {
      paystackConfigured: false,
      paystackPublicKey: '',
      cloudinaryConfigured: false,
      cloudinaryCloudName: '',
      termiiConfigured: false,
      resendConfigured: false,
    };
  }
  return (await res.json()) as PublicGatewayConfig;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in with Google before proceeding to payment.');
  }
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function verifyPaystackReference(reference: string): Promise<VerifiedPaystackPayment> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/paystack/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers,
  });
  const data = (await res.json()) as VerifiedPaystackPayment & { error?: string };
  if (!res.ok || !data.verified) {
    throw new Error(data.error || 'Paystack payment verification failed.');
  }
  return data;
}

export interface PendingCheckoutIntent {
  type: 'buy_now' | 'installment_start' | 'installment_contribution' | 'subscription_renewal';
  payload: Record<string, unknown>;
}

const PENDING_INTENT_KEY = 'feggy_pending_paystack_intent';

export function savePendingCheckoutIntent(reference: string, intent: PendingCheckoutIntent): void {
  try {
    sessionStorage.setItem(PENDING_INTENT_KEY, JSON.stringify({ reference, intent }));
  } catch {
    // Ignore storage quota issues
  }
}

export function consumePendingCheckoutIntent(reference: string): PendingCheckoutIntent | null {
  try {
    const raw = sessionStorage.getItem(PENDING_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { reference?: string; intent?: PendingCheckoutIntent };
    if (parsed.reference === reference && parsed.intent) {
      sessionStorage.removeItem(PENDING_INTENT_KEY);
      return parsed.intent;
    }
    return null;
  } catch {
    return null;
  }
}

export async function initiateAndVerifyPaystackPayment(params: {
  amountNgn: number;
  purpose: PendingCheckoutIntent['type'];
  metadata?: Record<string, unknown>;
  intentPayload: Record<string, unknown>;
  publicKey?: string;
}): Promise<VerifiedPaystackPayment> {
  const headers = await getAuthHeaders();
  const callbackUrl = `${window.location.origin}/dashboard`;

  const initRes = await fetch('/api/paystack/initialize', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amountNgn: params.amountNgn,
      purpose: params.purpose,
      callbackUrl,
      metadata: params.metadata ?? {},
    }),
  });

  const initData = (await initRes.json()) as {
    reference?: string;
    authorizationUrl?: string;
    amountKobo?: number;
    email?: string;
    error?: string;
  };

  if (!initRes.ok || !initData.reference || !initData.email || !initData.amountKobo) {
    throw new Error(initData.error || 'Unable to initialize Paystack checkout.');
  }

  const reference = initData.reference;
  const publicKey = params.publicKey || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

  // Prefer Paystack Inline Modal inside iframe when public key and PaystackPop are available
  if (publicKey && window.PaystackPop) {
    const completedRef = await new Promise<string>((resolve, reject) => {
      const handler = window.PaystackPop!.setup({
        key: publicKey,
        email: initData.email!,
        amount: initData.amountKobo!,
        currency: 'NGN',
        ref: reference,
        metadata: params.metadata,
        callback: (response) => {
          resolve(response.reference || reference);
        },
        onClose: () => {
          reject(new Error('Paystack payment window was closed before completion.'));
        },
      });
      handler.openIframe();
    });

    return verifyPaystackReference(completedRef);
  }

  // Otherwise save intent and navigate to Paystack hosted authorizationUrl
  if (initData.authorizationUrl) {
    savePendingCheckoutIntent(reference, {
      type: params.purpose,
      payload: params.intentPayload,
    });
    window.location.assign(initData.authorizationUrl);
    throw new Error('REDIRECTING_TO_PAYSTACK');
  }

  throw new Error('Paystack authorization URL was not returned by the server.');
}

export async function uploadProductImageToCloudinary(file: File): Promise<string> {
  const headers = await getAuthHeaders();
  const sigRes = await fetch('/api/cloudinary/signature', {
    method: 'POST',
    headers,
  });
  const sigData = (await sigRes.json()) as {
    mode?: 'signed' | 'unsigned';
    cloudName?: string;
    apiKey?: string;
    timestamp?: number;
    folder?: string;
    signature?: string;
    uploadPreset?: string;
    error?: string;
  };

  if (!sigRes.ok || !sigData.cloudName) {
    throw new Error(sigData.error || 'Cloudinary upload signature could not be generated.');
  }

  const formData = new FormData();
  formData.append('file', file);
  if (sigData.folder) formData.append('folder', sigData.folder);

  if (sigData.mode === 'signed' && sigData.apiKey && sigData.timestamp && sigData.signature) {
    formData.append('api_key', sigData.apiKey);
    formData.append('timestamp', String(sigData.timestamp));
    formData.append('signature', sigData.signature);
  } else if (sigData.uploadPreset) {
    formData.append('upload_preset', sigData.uploadPreset);
  } else {
    throw new Error('Incomplete Cloudinary configuration.');
  }

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(sigData.cloudName)}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );
  const uploadJson = (await uploadRes.json()) as { secure_url?: string; error?: { message?: string } };
  if (!uploadRes.ok || !uploadJson.secure_url) {
    throw new Error(uploadJson.error?.message || 'Cloudinary image upload failed.');
  }
  return uploadJson.secure_url;
}

export async function dispatchReminderFromServer(payload: {
  channel: 'sms' | 'email';
  recipient: string;
  customerName: string;
  productName: string;
  installmentAmountNgn: number;
  outstandingBalanceNgn: number;
  frequency: string;
}): Promise<{ sent: boolean; message: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/reminders/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { sent?: boolean; message?: string; error?: string };
  if (!res.ok || !data.sent) {
    throw new Error(data.error || 'Reminder dispatch failed.');
  }
  return { sent: true, message: data.message ?? '' };
}
