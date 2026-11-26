export type ProductCategory =
  | 'rice'
  | 'beans'
  | 'garri'
  | 'palm_oil'
  | 'groundnut_oil'
  | 'vegetable_oil'
  | 'yam'
  | 'onions'
  | 'tomatoes'
  | 'pasta_noodles'
  | 'swallow_flour'
  | 'meat_fish'
  | 'spices_seasoning'
  | 'bundles';

export interface ProductVariant {
  label: string;
  weightKg: number;
  priceNgn: number;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  description: string;
  imageUrl: string;
  isBundle: boolean;
  bundleItems?: string[];
  variants: ProductVariant[];
  minPriceNgn: number;
  minDailyNgn: number;
  minWeeklyNgn: number;
  featured: boolean;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type InstallmentFrequency = 'daily' | 'weekly' | 'monthly';

export type InstallmentStatus =
  | 'active'
  | 'completed'
  | 'ready_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface InstallmentPlan {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  reminderPhone: string;
  productId: string;
  productName: string;
  variantLabel: string;
  productImageUrl: string;
  frequency: InstallmentFrequency;
  installmentAmountNgn: number;
  totalTargetNgn: number;
  amountPaidNgn: number;
  outstandingBalanceNgn: number;
  contributionsCount: number;
  totalInstallments: number;
  status: InstallmentStatus;
  deliveryAddress: string;
  nextDueDate: string;
  expectedCompletionDate: string;
  lastPaymentReference: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderItem {
  productId: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  unitPriceNgn: number;
  imageUrl: string;
}

export type DeliveryStatus = 'processing' | 'packed' | 'out_for_delivery' | 'delivered';

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  purchaseMode: 'buy_now' | 'pay_small_small_completed' | 'subscription_renewal';
  items: OrderItem[];
  totalAmountNgn: number;
  paystackReference: string;
  paymentStatus: 'paid';
  deliveryStatus: DeliveryStatus;
  deliveryAddress: string;
  trackingNote?: string;
  subscriptionId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  customerEmail: string;
  customerName: string;
  paystackReference: string;
  purpose: 'buy_now' | 'installment_start' | 'installment_contribution' | 'subscription_renewal';
  relatedPlanId?: string;
  relatedOrderId?: string;
  amountNgn: number;
  currency: 'NGN';
  channel: string;
  gatewayStatus: 'success';
  receiptNumber: string;
  description: string;
  paidAt: string;
  createdAt?: unknown;
}

export interface Subscription {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productId: string;
  bundleTitle: string;
  variantLabel: string;
  imageUrl: string;
  priceNgn: number;
  cadence: 'monthly';
  status: 'active' | 'paused' | 'cancelled';
  deliveryAddress: string;
  nextBillingDate: string;
  lastPaymentReference: string;
  renewalsCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  deliveryAddress?: string;
  city?: string;
  state?: string;
  smsRemindersEnabled: boolean;
  emailRemindersEnabled: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ReminderLog {
  id: string;
  userId: string;
  planId: string;
  channel: 'sms' | 'email';
  frequency: InstallmentFrequency;
  recipient: string;
  status: 'sent' | 'failed' | 'queued';
  message: string;
  sentAt?: unknown;
}

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

export type AppView =
  | 'home'
  | 'shop'
  | 'pay-small-small'
  | 'product'
  | 'cart'
  | 'dashboard'
  | 'admin';

export interface RouteState {
  view: AppView;
  productId?: string;
  category?: ProductCategory | 'all';
  tab?: string;
}
