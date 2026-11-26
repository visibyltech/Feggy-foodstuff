import * as crypto from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();
const db = getFirestore();

const PAYSTACK_SECRET_KEY = defineSecret('PAYSTACK_SECRET_KEY');
const TERMII_API_KEY = defineSecret('TERMII_API_KEY');
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

interface InstallmentPlanDoc {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  reminderPhone: string;
  productName: string;
  variantLabel: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  installmentAmountNgn: number;
  outstandingBalanceNgn: number;
  status: string;
}

async function sendSmsReminder(apiKey: string, phone: string, message: string): Promise<boolean> {
  if (!apiKey || !phone) return false;
  const response = await fetch('https://api.ng.termii.com/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: phone,
      from: 'FeggyFood',
      sms: message,
      type: 'plain',
      channel: 'generic',
      api_key: apiKey,
    }),
  });
  return response.ok;
}

async function sendEmailReminder(
  apiKey: string,
  toEmail: string,
  subject: string,
  message: string
): Promise<boolean> {
  if (!apiKey || !toEmail) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FEGGY FOODSTUFF <reminders@feggyfoodstuff.ng>',
      to: [toEmail],
      subject,
      text: message,
    }),
  });
  return response.ok;
}

async function dispatchRemindersForFrequency(
  frequency: 'daily' | 'weekly' | 'monthly',
  termiiKey: string,
  resendKey: string
): Promise<void> {
  const snapshot = await db
    .collection('installmentPlans')
    .where('status', '==', 'active')
    .where('frequency', '==', frequency)
    .get();

  for (const docSnap of snapshot.docs) {
    const plan = docSnap.data() as InstallmentPlanDoc;
    const installmentText = `₦${plan.installmentAmountNgn.toLocaleString('en-NG')}`;
    const balanceText = `₦${plan.outstandingBalanceNgn.toLocaleString('en-NG')}`;
    const message = `Hi ${plan.customerName}, reminder for your ${frequency} Pay Small Small plan (${plan.productName} - ${plan.variantLabel}). Due today: ${installmentText}. Outstanding balance: ${balanceText}. Easy Buy Foodstuff with FEGGY.`;

    const smsSent = await sendSmsReminder(termiiKey, plan.reminderPhone, message);
    const emailSent = await sendEmailReminder(
      resendKey,
      plan.customerEmail,
      `FEGGY Pay Small Small (${frequency}) Payment Reminder`,
      message
    );

    const now = FieldValue.serverTimestamp();
    if (plan.reminderPhone) {
      const logId = `sms_${plan.id}_${Date.now()}`;
      await db.collection('reminderLogs').doc(logId).set({
        id: logId,
        userId: plan.userId,
        planId: plan.id,
        channel: 'sms',
        frequency,
        recipient: plan.reminderPhone,
        status: smsSent ? 'sent' : 'failed',
        message,
        sentAt: now,
      });
    }
    if (plan.customerEmail) {
      const logId = `email_${plan.id}_${Date.now()}`;
      await db.collection('reminderLogs').doc(logId).set({
        id: logId,
        userId: plan.userId,
        planId: plan.id,
        channel: 'email',
        frequency,
        recipient: plan.customerEmail,
        status: emailSent ? 'sent' : 'failed',
        message,
        sentAt: now,
      });
    }
  }
}

export const dailyPaySmallSmallReminders = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: 'Africa/Lagos',
    secrets: [TERMII_API_KEY, RESEND_API_KEY],
  },
  async () => {
    await dispatchRemindersForFrequency('daily', TERMII_API_KEY.value(), RESEND_API_KEY.value());
  }
);

export const weeklyPaySmallSmallReminders = onSchedule(
  {
    schedule: '0 8 * * 1',
    timeZone: 'Africa/Lagos',
    secrets: [TERMII_API_KEY, RESEND_API_KEY],
  },
  async () => {
    await dispatchRemindersForFrequency('weekly', TERMII_API_KEY.value(), RESEND_API_KEY.value());
  }
);

export const monthlyPaySmallSmallReminders = onSchedule(
  {
    schedule: '0 8 1 * *',
    timeZone: 'Africa/Lagos',
    secrets: [TERMII_API_KEY, RESEND_API_KEY],
  },
  async () => {
    await dispatchRemindersForFrequency('monthly', TERMII_API_KEY.value(), RESEND_API_KEY.value());
  }
);

export const paystackWebhook = onRequest(
  { secrets: [PAYSTACK_SECRET_KEY] },
  async (req: { headers: Record<string, string | string[] | undefined>; rawBody: Buffer; body: unknown }, res: { status: (code: number) => { send: (body: string) => void; json: (body: unknown) => void } }) => {
    const signature = req.headers['x-paystack-signature'];
    if (typeof signature !== 'string') {
      res.status(400).send('Missing signature');
      return;
    }
    const expected = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY.value())
      .update(req.rawBody)
      .digest('hex');

    if (signature !== expected) {
      res.status(401).send('Invalid signature');
      return;
    }

    const event = req.body as {
      event?: string;
      data?: { reference?: string; amount?: number; currency?: string; status?: string };
    };
    if (event.event === 'charge.success' && event.data?.reference) {
      await db.collection('webhookEvents').doc(event.data.reference).set({
        reference: event.data.reference,
        amountKobo: event.data.amount ?? 0,
        currency: event.data.currency ?? 'NGN',
        status: event.data.status ?? 'success',
        receivedAt: FieldValue.serverTimestamp(),
      });
    }
    res.status(200).json({ ok: true });
  }
);
