import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { computePlanSchedule, INITIAL_NIGERIAN_CATALOG } from '../data/catalog';
import { db, handleFirestoreError, OperationType } from './firebase';
import type { VerifiedPaystackPayment } from './paystack';
import type {
  DeliveryStatus,
  InstallmentFrequency,
  InstallmentPlan,
  InstallmentStatus,
  Order,
  OrderItem,
  PaymentRecord,
  Product,
  ReminderLog,
  Subscription,
  UserProfile,
} from '../types';

function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${Date.now()}-${rand}`;
}

function makeReceiptNumber(): string {
  return `FGY-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// -----------------------------------------------------------------------------
// Products
// -----------------------------------------------------------------------------
export function subscribeProducts(
  onData: (products: Product[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = 'products';
  const q = query(collection(db, path));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => d.data() as Product);
      items.sort((a, b) => Number(b.featured) - Number(a.featured));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveProductToFirestore(product: Product, isNew: boolean): Promise<void> {
  const path = `products/${product.id}`;
  try {
    const ref = doc(db, 'products', product.id);
    const payload = {
      id: product.id,
      name: product.name.trim(),
      slug: product.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
      category: product.category,
      description: product.description.trim(),
      imageUrl: product.imageUrl.trim(),
      isBundle: product.isBundle,
      ...(product.isBundle && product.bundleItems ? { bundleItems: product.bundleItems.slice(0, 15) } : {}),
      variants: product.variants.slice(0, 10),
      minPriceNgn: Math.min(...product.variants.map((v) => v.priceNgn)),
      minDailyNgn: Math.max(500, product.minDailyNgn || 500),
      minWeeklyNgn: Math.max(5000, product.minWeeklyNgn || 5000),
      featured: Boolean(product.featured),
      active: Boolean(product.active),
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp() } : { createdAt: product.createdAt || serverTimestamp() }),
    };
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedDefaultCatalogToFirestore(existingIds: string[] = []): Promise<number> {
  const path = 'products';
  try {
    const batch = writeBatch(db);
    const validIds = new Set(INITIAL_NIGERIAN_CATALOG.map((item) => item.id));
    for (const oldId of existingIds) {
      if (!validIds.has(oldId)) {
        batch.delete(doc(db, 'products', oldId));
      }
    }
    for (const item of INITIAL_NIGERIAN_CATALOG) {
      const ref = doc(db, 'products', item.id);
      batch.set(ref, {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return INITIAL_NIGERIAN_CATALOG.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// -----------------------------------------------------------------------------
// User Profiles
// -----------------------------------------------------------------------------
export async function ensureUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'FEGGY Customer',
        phone: user.phoneNumber || '',
        deliveryAddress: '',
        city: 'Lagos',
        state: 'Lagos',
        smsRemindersEnabled: true,
        emailRemindersEnabled: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserProfile) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function updateUserProfileDetails(
  uid: string,
  updates: Pick<
    UserProfile,
    'displayName' | 'phone' | 'deliveryAddress' | 'city' | 'state' | 'smsRemindersEnabled' | 'emailRemindersEnabled'
  >
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: updates.displayName.slice(0, 120),
      phone: (updates.phone || '').slice(0, 30),
      deliveryAddress: (updates.deliveryAddress || '').slice(0, 300),
      city: (updates.city || '').slice(0, 80),
      state: (updates.state || '').slice(0, 80),
      smsRemindersEnabled: Boolean(updates.smsRemindersEnabled),
      emailRemindersEnabled: Boolean(updates.emailRemindersEnabled),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// -----------------------------------------------------------------------------
// Pay Small Small Plans
// -----------------------------------------------------------------------------
export function subscribeUserPlans(
  uid: string,
  onData: (plans: InstallmentPlan[]) => void
): Unsubscribe {
  const path = 'installmentPlans';
  const q = query(collection(db, path), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as InstallmentPlan)),
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeAllPlans(onData: (plans: InstallmentPlan[]) => void): Unsubscribe {
  const path = 'installmentPlans';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as InstallmentPlan)),
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function createInstallmentPlanWithPayment(params: {
  user: User;
  product: Product;
  variantLabel: string;
  totalTargetNgn: number;
  frequency: InstallmentFrequency;
  installmentAmountNgn: number;
  reminderPhone: string;
  deliveryAddress: string;
  verifiedPayment: VerifiedPaystackPayment;
}): Promise<{ planId: string; paymentId: string; receiptNumber: string }> {
  const planId = makeSafeId('PSS');
  const paymentId = makeSafeId('PAY');
  const receiptNumber = makeReceiptNumber();

  const paidAmount = Math.min(params.totalTargetNgn, params.verifiedPayment.amountNgn);
  const outstanding = Math.max(0, params.totalTargetNgn - paidAmount);
  const schedule = computePlanSchedule(
    params.totalTargetNgn,
    params.frequency,
    params.installmentAmountNgn
  );
  const status: InstallmentStatus = outstanding === 0 ? 'completed' : 'active';

  const batch = writeBatch(db);

  batch.set(doc(db, 'installmentPlans', planId), {
    id: planId,
    userId: params.user.uid,
    customerName: params.user.displayName || params.user.email?.split('@')[0] || 'Customer',
    customerEmail: params.user.email || params.verifiedPayment.customerEmail,
    reminderPhone: params.reminderPhone.trim(),
    productId: params.product.id,
    productName: params.product.name,
    variantLabel: params.variantLabel,
    productImageUrl: params.product.imageUrl,
    frequency: params.frequency,
    installmentAmountNgn: params.installmentAmountNgn,
    totalTargetNgn: params.totalTargetNgn,
    amountPaidNgn: paidAmount,
    outstandingBalanceNgn: outstanding,
    contributionsCount: 1,
    totalInstallments: schedule.totalInstallments,
    status,
    deliveryAddress: params.deliveryAddress.trim(),
    nextDueDate: schedule.nextDueDate,
    expectedCompletionDate: schedule.expectedCompletionDate,
    lastPaymentReference: params.verifiedPayment.reference,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'payments', paymentId), {
    id: paymentId,
    userId: params.user.uid,
    customerEmail: params.user.email || params.verifiedPayment.customerEmail,
    customerName: params.user.displayName || 'Customer',
    paystackReference: params.verifiedPayment.reference,
    purpose: 'installment_start',
    relatedPlanId: planId,
    amountNgn: paidAmount,
    currency: 'NGN',
    channel: params.verifiedPayment.channel,
    gatewayStatus: 'success',
    receiptNumber,
    description: `Pay Small Small 1st ${params.frequency} payment — ${params.product.name} (${params.variantLabel})`,
    paidAt: params.verifiedPayment.paidAt,
    createdAt: serverTimestamp(),
  });

  if (outstanding === 0) {
    const orderId = makeSafeId('ORD');
    batch.set(doc(db, 'orders', orderId), {
      id: orderId,
      userId: params.user.uid,
      customerName: params.user.displayName || 'Customer',
      customerEmail: params.user.email || '',
      customerPhone: params.reminderPhone.trim(),
      purchaseMode: 'pay_small_small_completed',
      items: [
        {
          productId: params.product.id,
          productName: params.product.name,
          variantLabel: params.variantLabel,
          quantity: 1,
          unitPriceNgn: params.totalTargetNgn,
          imageUrl: params.product.imageUrl,
        },
      ],
      totalAmountNgn: params.totalTargetNgn,
      paystackReference: params.verifiedPayment.reference,
      paymentStatus: 'paid',
      deliveryStatus: 'processing',
      deliveryAddress: params.deliveryAddress.trim(),
      trackingNote: 'Pay Small Small completed — preparing for dispatch',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    return { planId, paymentId, receiptNumber };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `installmentPlans/${planId}`);
  }
}

export async function recordPlanContributionWithPayment(params: {
  user: User;
  plan: InstallmentPlan;
  verifiedPayment: VerifiedPaystackPayment;
}): Promise<{ paymentId: string; receiptNumber: string; completedNow: boolean }> {
  const paymentId = makeSafeId('PAY');
  const receiptNumber = makeReceiptNumber();

  const added = Math.min(params.plan.outstandingBalanceNgn, params.verifiedPayment.amountNgn);
  const newPaid = Math.min(params.plan.totalTargetNgn, params.plan.amountPaidNgn + added);
  const newOutstanding = Math.max(0, params.plan.totalTargetNgn - newPaid);
  const completedNow = newOutstanding === 0;

  const daysToAdd =
    params.plan.frequency === 'daily' ? 1 : params.plan.frequency === 'weekly' ? 7 : 30;
  const nextDue = completedNow ? params.plan.expectedCompletionDate : addDaysIso(daysToAdd);

  const batch = writeBatch(db);

  batch.update(doc(db, 'installmentPlans', params.plan.id), {
    amountPaidNgn: newPaid,
    outstandingBalanceNgn: newOutstanding,
    contributionsCount: params.plan.contributionsCount + 1,
    status: completedNow ? 'completed' : 'active',
    nextDueDate: nextDue,
    lastPaymentReference: params.verifiedPayment.reference,
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'payments', paymentId), {
    id: paymentId,
    userId: params.user.uid,
    customerEmail: params.user.email || params.verifiedPayment.customerEmail,
    customerName: params.user.displayName || params.plan.customerName,
    paystackReference: params.verifiedPayment.reference,
    purpose: 'installment_contribution',
    relatedPlanId: params.plan.id,
    amountNgn: added,
    currency: 'NGN',
    channel: params.verifiedPayment.channel,
    gatewayStatus: 'success',
    receiptNumber,
    description: `Pay Small Small contribution #${params.plan.contributionsCount + 1} — ${params.plan.productName}`,
    paidAt: params.verifiedPayment.paidAt,
    createdAt: serverTimestamp(),
  });

  if (completedNow) {
    const orderId = makeSafeId('ORD');
    batch.set(doc(db, 'orders', orderId), {
      id: orderId,
      userId: params.user.uid,
      customerName: params.plan.customerName,
      customerEmail: params.plan.customerEmail,
      customerPhone: params.plan.reminderPhone,
      purchaseMode: 'pay_small_small_completed',
      items: [
        {
          productId: params.plan.productId,
          productName: params.plan.productName,
          variantLabel: params.plan.variantLabel,
          quantity: 1,
          unitPriceNgn: params.plan.totalTargetNgn,
          imageUrl: params.plan.productImageUrl,
        },
      ],
      totalAmountNgn: params.plan.totalTargetNgn,
      paystackReference: params.verifiedPayment.reference,
      paymentStatus: 'paid',
      deliveryStatus: 'processing',
      deliveryAddress: params.plan.deliveryAddress,
      trackingNote: 'Pay Small Small goal reached 100% — queued for dispatch',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    return { paymentId, receiptNumber, completedNow };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `installmentPlans/${params.plan.id}`);
  }
}

export async function updateInstallmentStatusByAdmin(
  planId: string,
  status: InstallmentStatus
): Promise<void> {
  const path = `installmentPlans/${planId}`;
  try {
    await updateDoc(doc(db, 'installmentPlans', planId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// -----------------------------------------------------------------------------
// Orders & Monthly Subscriptions (Buy Now)
// -----------------------------------------------------------------------------
export function subscribeUserOrders(uid: string, onData: (orders: Order[]) => void): Unsubscribe {
  const path = 'orders';
  const q = query(collection(db, path), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as Order)),
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeAllOrders(onData: (orders: Order[]) => void): Unsubscribe {
  const path = 'orders';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as Order)),
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function createBuyNowOrderWithPayment(params: {
  user: User;
  items: OrderItem[];
  totalAmountNgn: number;
  customerPhone: string;
  deliveryAddress: string;
  verifiedPayment: VerifiedPaystackPayment;
  enableMonthlySubscription?: boolean;
}): Promise<{ orderId: string; paymentId: string; receiptNumber: string; subscriptionId?: string }> {
  const orderId = makeSafeId('ORD');
  const paymentId = makeSafeId('PAY');
  const receiptNumber = makeReceiptNumber();
  let subscriptionId: string | undefined;

  const batch = writeBatch(db);

  if (params.enableMonthlySubscription && params.items.length > 0) {
    subscriptionId = makeSafeId('SUB');
    const primaryItem = params.items[0];
    batch.set(doc(db, 'subscriptions', subscriptionId), {
      id: subscriptionId,
      userId: params.user.uid,
      customerName: params.user.displayName || 'Customer',
      customerEmail: params.user.email || params.verifiedPayment.customerEmail,
      customerPhone: params.customerPhone.trim(),
      productId: primaryItem.productId,
      bundleTitle:
        params.items.length > 1
          ? `${primaryItem.productName} + ${params.items.length - 1} more`
          : primaryItem.productName,
      variantLabel: primaryItem.variantLabel,
      imageUrl: primaryItem.imageUrl,
      priceNgn: params.totalAmountNgn,
      cadence: 'monthly',
      status: 'active',
      deliveryAddress: params.deliveryAddress.trim(),
      nextBillingDate: addDaysIso(30),
      lastPaymentReference: params.verifiedPayment.reference,
      renewalsCount: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  batch.set(doc(db, 'orders', orderId), {
    id: orderId,
    userId: params.user.uid,
    customerName: params.user.displayName || 'Customer',
    customerEmail: params.user.email || params.verifiedPayment.customerEmail,
    customerPhone: params.customerPhone.trim(),
    purchaseMode: 'buy_now',
    items: params.items,
    totalAmountNgn: params.totalAmountNgn,
    paystackReference: params.verifiedPayment.reference,
    paymentStatus: 'paid',
    deliveryStatus: 'processing',
    deliveryAddress: params.deliveryAddress.trim(),
    trackingNote: 'Payment verified via Paystack — preparing order',
    ...(subscriptionId ? { subscriptionId } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'payments', paymentId), {
    id: paymentId,
    userId: params.user.uid,
    customerEmail: params.user.email || params.verifiedPayment.customerEmail,
    customerName: params.user.displayName || 'Customer',
    paystackReference: params.verifiedPayment.reference,
    purpose: 'buy_now',
    relatedOrderId: orderId,
    amountNgn: params.totalAmountNgn,
    currency: 'NGN',
    channel: params.verifiedPayment.channel,
    gatewayStatus: 'success',
    receiptNumber,
    description: `Buy Now full payment (${params.items.length} item${params.items.length > 1 ? 's' : ''})`,
    paidAt: params.verifiedPayment.paidAt,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return { orderId, paymentId, receiptNumber, subscriptionId };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
  }
}

export async function updateOrderDeliveryStatus(
  orderId: string,
  deliveryStatus: DeliveryStatus,
  trackingNote?: string
): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      deliveryStatus,
      ...(trackingNote !== undefined ? { trackingNote } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// -----------------------------------------------------------------------------
// Payments & Subscriptions
// -----------------------------------------------------------------------------
export function subscribeUserPayments(
  uid: string,
  onData: (payments: PaymentRecord[]) => void
): Unsubscribe {
  const path = 'payments';
  const q = query(collection(db, path), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as PaymentRecord)),
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeAllPayments(onData: (payments: PaymentRecord[]) => void): Unsubscribe {
  const path = 'payments';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as PaymentRecord)),
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeUserSubscriptions(
  uid: string,
  onData: (subs: Subscription[]) => void
): Unsubscribe {
  const path = 'subscriptions';
  const q = query(collection(db, path), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as Subscription)),
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeAllSubscriptions(onData: (subs: Subscription[]) => void): Unsubscribe {
  const path = 'subscriptions';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as Subscription)),
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function updateSubscriptionState(
  subId: string,
  status: 'active' | 'paused' | 'cancelled',
  deliveryAddress?: string
): Promise<void> {
  const path = `subscriptions/${subId}`;
  try {
    await updateDoc(doc(db, 'subscriptions', subId), {
      status,
      ...(deliveryAddress ? { deliveryAddress } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function renewSubscriptionWithPayment(params: {
  user: User;
  subscription: Subscription;
  verifiedPayment: VerifiedPaystackPayment;
}): Promise<{ orderId: string; paymentId: string; receiptNumber: string }> {
  const orderId = makeSafeId('ORD');
  const paymentId = makeSafeId('PAY');
  const receiptNumber = makeReceiptNumber();

  const batch = writeBatch(db);

  batch.update(doc(db, 'subscriptions', params.subscription.id), {
    status: 'active',
    nextBillingDate: addDaysIso(30),
    lastPaymentReference: params.verifiedPayment.reference,
    renewalsCount: params.subscription.renewalsCount + 1,
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'orders', orderId), {
    id: orderId,
    userId: params.user.uid,
    customerName: params.subscription.customerName,
    customerEmail: params.subscription.customerEmail,
    customerPhone: params.subscription.customerPhone,
    purchaseMode: 'subscription_renewal',
    items: [
      {
        productId: params.subscription.productId,
        productName: params.subscription.bundleTitle,
        variantLabel: params.subscription.variantLabel,
        quantity: 1,
        unitPriceNgn: params.subscription.priceNgn,
        imageUrl: params.subscription.imageUrl,
      },
    ],
    totalAmountNgn: params.subscription.priceNgn,
    paystackReference: params.verifiedPayment.reference,
    paymentStatus: 'paid',
    deliveryStatus: 'processing',
    deliveryAddress: params.subscription.deliveryAddress,
    trackingNote: `Monthly subscription renewal #${params.subscription.renewalsCount + 1}`,
    subscriptionId: params.subscription.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'payments', paymentId), {
    id: paymentId,
    userId: params.user.uid,
    customerEmail: params.user.email || params.verifiedPayment.customerEmail,
    customerName: params.user.displayName || params.subscription.customerName,
    paystackReference: params.verifiedPayment.reference,
    purpose: 'subscription_renewal',
    relatedOrderId: orderId,
    amountNgn: params.subscription.priceNgn,
    currency: 'NGN',
    channel: params.verifiedPayment.channel,
    gatewayStatus: 'success',
    receiptNumber,
    description: `Monthly subscription renewal — ${params.subscription.bundleTitle}`,
    paidAt: params.verifiedPayment.paidAt,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return { orderId, paymentId, receiptNumber };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `subscriptions/${params.subscription.id}`);
  }
}

// -----------------------------------------------------------------------------
// Reminders & Customers (Admin)
// -----------------------------------------------------------------------------
export function subscribeAllCustomers(onData: (users: UserProfile[]) => void): Unsubscribe {
  const path = 'users';
  return onSnapshot(
    collection(db, path),
    (snap) => onData(snap.docs.map((d) => d.data() as UserProfile)),
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeAllReminderLogs(onData: (logs: ReminderLog[]) => void): Unsubscribe {
  const path = 'reminderLogs';
  const q = query(collection(db, path), orderBy('sentAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as ReminderLog)),
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function logReminderByAdmin(log: Omit<ReminderLog, 'id' | 'sentAt'>): Promise<void> {
  const id = makeSafeId('REM');
  const path = `reminderLogs/${id}`;
  try {
    await setDoc(doc(db, 'reminderLogs', id), {
      ...log,
      id,
      sentAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
