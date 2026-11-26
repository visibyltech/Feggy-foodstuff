import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  LogOut,
  Package,
  Receipt,
  RefreshCw,
  Settings,
  Truck,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { formatNgn, formatReadableDate, getMinimumInstallment } from '../data/catalog';
import {
  recordPlanContributionWithPayment,
  renewSubscriptionWithPayment,
  updateSubscriptionState,
  updateUserProfileDetails,
} from '../lib/firestoreService';
import {
  initiateAndVerifyPaystackPayment,
  type PublicGatewayConfig,
} from '../lib/paystack';
import type {
  InstallmentPlan,
  Order,
  PaymentRecord,
  RouteState,
  Subscription,
  UserProfile,
} from '../types';
import { FoodImage } from './FoodImage';

interface CustomerDashboardProps {
  user: User | null;
  profile: UserProfile | null;
  plans: InstallmentPlan[];
  orders: Order[];
  payments: PaymentRecord[];
  subscriptions: Subscription[];
  activeTab: string;
  gatewayConfig: PublicGatewayConfig;
  navigate: (route: RouteState) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenReceipt: (payment: PaymentRecord) => void;
  onShowToast: (msg: string, tone?: 'success' | 'error' | 'info') => void;
}

const DELIVERY_STATUS_LABELS: Record<Order['deliveryStatus'], string> = {
  processing: 'Processing Order',
  packed: 'Packed at Warehouse',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
};

export function CustomerDashboard({
  user,
  profile,
  plans,
  orders,
  payments,
  subscriptions,
  activeTab,
  gatewayConfig,
  navigate,
  onSignIn,
  onSignOut,
  onOpenReceipt,
  onShowToast,
}: CustomerDashboardProps) {
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);
  const [customPayAmounts, setCustomPayAmounts] = useState<Record<string, number>>({});
  const [busySubId, setBusySubId] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState(profile?.deliveryAddress || '');
  const [city, setCity] = useState(profile?.city || 'Lagos');
  const [stateVal, setStateVal] = useState(profile?.state || 'Lagos');
  const [smsOptIn, setSmsOptIn] = useState(profile?.smsRemindersEnabled ?? true);
  const [emailOptIn, setEmailOptIn] = useState(profile?.emailRemindersEnabled ?? true);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhone(profile.phone || '');
      setDeliveryAddress(profile.deliveryAddress || '');
      setCity(profile.city || 'Lagos');
      setStateVal(profile.state || 'Lagos');
      setSmsOptIn(profile.smsRemindersEnabled);
      setEmailOptIn(profile.emailRemindersEnabled);
    }
  }, [profile]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="border border-slate-200 rounded-2xl p-8 bg-slate-50 space-y-4">
          <h1 className="font-display text-2xl font-bold text-[#0B2545]">
            Sign In to Your FEGGY Dashboard
          </h1>
          <p className="text-sm text-slate-600">
            Track your Pay Small Small balances, make daily or weekly contributions via Paystack,
            manage food subscriptions, and view delivery updates.
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="px-6 py-3 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition-colors"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  const handlePayContribution = async (plan: InstallmentPlan) => {
    const minReq = Math.min(plan.outstandingBalanceNgn, getMinimumInstallment(plan.frequency));
    const defaultAmt = Math.min(plan.outstandingBalanceNgn, plan.installmentAmountNgn);
    const chosenAmt = customPayAmounts[plan.id] ?? defaultAmt;
    const payAmt = Math.min(plan.outstandingBalanceNgn, Math.max(minReq, chosenAmt));

    setPayingPlanId(plan.id);
    try {
      const verified = await initiateAndVerifyPaystackPayment({
        amountNgn: payAmt,
        purpose: 'installment_contribution',
        publicKey: gatewayConfig.paystackPublicKey,
        metadata: {
          planId: plan.id,
          productName: plan.productName,
        },
        intentPayload: {
          planId: plan.id,
        },
      });

      const res = await recordPlanContributionWithPayment({
        user,
        plan,
        verifiedPayment: verified,
      });

      onShowToast(
        res.completedNow
          ? `Congratulations! ${plan.productName} is 100% paid and queued for delivery. Receipt ${res.receiptNumber}.`
          : `Contribution recorded! Receipt ${res.receiptNumber} issued.`,
        'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment could not be verified.';
      if (msg !== 'REDIRECTING_TO_PAYSTACK') {
        onShowToast(msg, 'error');
      }
    } finally {
      setPayingPlanId(null);
    }
  };

  const handleRenewSubscription = async (sub: Subscription) => {
    setBusySubId(sub.id);
    try {
      const verified = await initiateAndVerifyPaystackPayment({
        amountNgn: sub.priceNgn,
        purpose: 'subscription_renewal',
        publicKey: gatewayConfig.paystackPublicKey,
        metadata: { subscriptionId: sub.id, bundleTitle: sub.bundleTitle },
        intentPayload: { subscriptionId: sub.id },
      });

      const res = await renewSubscriptionWithPayment({
        user,
        subscription: sub,
        verifiedPayment: verified,
      });

      onShowToast(
        `Monthly subscription renewed! Order queued and receipt ${res.receiptNumber} issued.`,
        'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Renewal payment failed.';
      if (msg !== 'REDIRECTING_TO_PAYSTACK') {
        onShowToast(msg, 'error');
      }
    } finally {
      setBusySubId(null);
    }
  };

  const handleToggleSubStatus = async (sub: Subscription, status: 'active' | 'paused' | 'cancelled') => {
    setBusySubId(sub.id);
    try {
      await updateSubscriptionState(sub.id, status);
      onShowToast(`Subscription ${status}.`, 'success');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Could not update subscription.', 'error');
    } finally {
      setBusySubId(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfileDetails(user.uid, {
        displayName: displayName || user.displayName || 'Customer',
        phone,
        deliveryAddress,
        city,
        state: stateVal,
        smsRemindersEnabled: smsOptIn,
        emailRemindersEnabled: emailOptIn,
      });
      onShowToast('Profile & reminder preferences saved.', 'success');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Failed to save profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const tabs = [
    { id: 'plans', label: `Pay Small Small (${plans.length})`, icon: CreditCard },
    { id: 'orders', label: `Orders & Delivery (${orders.length})`, icon: Truck },
    { id: 'subscriptions', label: `Subscriptions (${subscriptions.length})`, icon: RefreshCw },
    { id: 'receipts', label: `Receipts (${payments.length})`, icon: Receipt },
    { id: 'profile', label: 'Reminders & Profile', icon: Settings },
  ];

  const totalSavedOnPlans = plans.reduce((s, p) => s + p.amountPaidNgn, 0);
  const totalOutstandingOnPlans = plans.reduce((s, p) => s + p.outstandingBalanceNgn, 0);

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">
              Customer Account · {user.email}
            </p>
            <h1 className="font-display text-2xl font-bold text-[#0B2545] mt-1">
              Welcome, {profile?.displayName || user.displayName || 'Customer'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs text-slate-500">Total Paid on Plans</p>
              <p className="font-display text-lg font-bold text-green-800 tabular-nums">
                {formatNgn(totalSavedOnPlans)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Outstanding Balance</p>
              <p className="font-display text-lg font-bold text-orange-700 tabular-nums">
                {formatNgn(totalOutstandingOnPlans)}
              </p>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate({ view: 'dashboard', tab: tab.id })}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-green-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-green-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Pay Small Small Plans */}
        {activeTab === 'plans' && (
          <div className="space-y-4">
            {plans.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <p className="font-display text-lg font-bold text-slate-900">
                  No Pay Small Small plans yet
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Start contributing from ₦500 daily or ₦5,000 weekly toward your foodstuffs.
                </p>
                <button
                  type="button"
                  onClick={() => navigate({ view: 'pay-small-small' })}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold"
                >
                  Start a Pay Small Small Plan
                </button>
              </div>
            ) : (
              plans.map((plan) => {
                const pct = Math.min(
                  100,
                  Math.round((plan.amountPaidNgn / plan.totalTargetNgn) * 100)
                );
                const minStep = Math.min(
                  plan.outstandingBalanceNgn,
                  getMinimumInstallment(plan.frequency)
                );
                const defaultNext = Math.min(
                  plan.outstandingBalanceNgn,
                  plan.installmentAmountNgn
                );
                const inputVal = customPayAmounts[plan.id] ?? defaultNext;

                return (
                  <div
                    key={plan.id}
                    className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                          <FoodImage
                            src={plan.productImageUrl}
                            alt={plan.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 capitalize">
                            {plan.frequency} Plan · {plan.variantLabel}
                          </p>
                          <h3 className="font-display text-lg font-bold text-[#0B2545]">
                            {plan.productName}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Expected completion: {formatReadableDate(plan.expectedCompletionDate)} ·
                            Next due: {formatReadableDate(plan.nextDueDate)}
                          </p>
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <span
                          className={`text-xs font-bold uppercase ${
                            plan.status === 'active'
                              ? 'text-orange-700'
                              : 'text-green-800'
                          }`}
                        >
                          {plan.status.replace(/_/g, ' ')}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">
                          {plan.contributionsCount} of ~{plan.totalInstallments} payments made
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-semibold text-green-800 tabular-nums">
                          Paid: {formatNgn(plan.amountPaidNgn)} ({pct}%)
                        </span>
                        <span className="font-semibold text-slate-700 tabular-nums">
                          Balance: {formatNgn(plan.outstandingBalanceNgn)} of{' '}
                          {formatNgn(plan.totalTargetNgn)}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-700 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {plan.status === 'active' && plan.outstandingBalanceNgn > 0 && (
                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor={`topup-${plan.id}`}
                            className="text-xs font-medium text-slate-600 whitespace-nowrap"
                          >
                            Amount (₦):
                          </label>
                          <input
                            id={`topup-${plan.id}`}
                            type="number"
                            min={minStep}
                            max={plan.outstandingBalanceNgn}
                            step={100}
                            value={inputVal}
                            onChange={(e) =>
                              setCustomPayAmounts((prev) => ({
                                ...prev,
                                [plan.id]: Number(e.target.value),
                              }))
                            }
                            className="w-32 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setCustomPayAmounts((prev) => ({
                                ...prev,
                                [plan.id]: plan.outstandingBalanceNgn,
                              }))
                            }
                            className="text-xs font-semibold text-green-800 hover:underline whitespace-nowrap"
                          >
                            Pay Full Balance
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={payingPlanId === plan.id}
                          onClick={() => handlePayContribution(plan)}
                          className="px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                          {payingPlanId === plan.id
                            ? 'Verifying Paystack...'
                            : `Pay ${formatNgn(
                                Math.min(plan.outstandingBalanceNgn, Math.max(minStep, inputVal))
                              )} via Paystack`}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Orders & Delivery */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <Package className="w-9 h-9 text-slate-400 mx-auto mb-2" />
                <p className="font-display text-lg font-bold text-slate-900">No orders yet</p>
                <p className="text-sm text-slate-600 mt-1">
                  Completed Pay Small Small plans and Buy Now purchases appear here with live
                  delivery tracking.
                </p>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <p className="font-mono-nums text-xs text-slate-500">
                        Order {order.id} · Ref {order.paystackReference}
                      </p>
                      <p className="text-sm font-bold text-[#0B2545] mt-0.5 tabular-nums">
                        {formatNgn(order.totalAmountNgn)} ·{' '}
                        <span className="text-green-800">
                          {DELIVERY_STATUS_LABELS[order.deliveryStatus]}
                        </span>
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 capitalize">
                      {order.purchaseMode.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={`${item.productId}-${idx}`} className="flex justify-between text-xs">
                        <span className="text-slate-700">
                          {item.quantity}x {item.productName} ({item.variantLabel})
                        </span>
                        <span className="font-semibold tabular-nums">
                          {formatNgn(item.unitPriceNgn * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span>Deliver to: {order.deliveryAddress}</span>
                    {order.trackingNote && (
                      <span className="text-green-800 font-medium">{order.trackingNote}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Monthly Food Subscriptions */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-4">
            {subscriptions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <RefreshCw className="w-9 h-9 text-slate-400 mx-auto mb-2" />
                <p className="font-display text-lg font-bold text-slate-900">
                  No monthly food subscriptions yet
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  When paying in full for a bundle or foodstuff, tick the Monthly Subscription
                  option at checkout to automate restocking.
                </p>
              </div>
            ) : (
              subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      <FoodImage
                        src={sub.imageUrl}
                        alt={sub.bundleTitle}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">
                        Monthly Bundle · {sub.status}
                      </p>
                      <h3 className="font-display text-base font-bold text-[#0B2545]">
                        {sub.bundleTitle} ({sub.variantLabel})
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                        {formatNgn(sub.priceNgn)}/month · Next renewal:{' '}
                        {formatReadableDate(sub.nextBillingDate)} · Renewals: {sub.renewalsCount}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {sub.status !== 'cancelled' && (
                      <button
                        type="button"
                        disabled={busySubId === sub.id}
                        onClick={() => handleRenewSubscription(sub)}
                        className="px-4 py-2 rounded-xl bg-green-700 text-white text-xs font-semibold hover:bg-green-800 disabled:opacity-50"
                      >
                        Renew Now ({formatNgn(sub.priceNgn)})
                      </button>
                    )}
                    {sub.status === 'active' && (
                      <button
                        type="button"
                        disabled={busySubId === sub.id}
                        onClick={() => handleToggleSubStatus(sub, 'paused')}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Pause
                      </button>
                    )}
                    {sub.status === 'paused' && (
                      <button
                        type="button"
                        disabled={busySubId === sub.id}
                        onClick={() => handleToggleSubStatus(sub, 'active')}
                        className="px-3 py-2 rounded-xl border border-green-700 text-xs font-semibold text-green-800 hover:bg-green-50"
                      >
                        Resume
                      </button>
                    )}
                    {sub.status !== 'cancelled' && (
                      <button
                        type="button"
                        disabled={busySubId === sub.id}
                        onClick={() => handleToggleSubStatus(sub, 'cancelled')}
                        className="px-3 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Receipts & Payments */}
        {activeTab === 'receipts' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {payments.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-600">
                No verified Paystack transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Receipt #</th>
                      <th className="py-3 px-4 font-semibold">Description</th>
                      <th className="py-3 px-4 font-semibold">Paystack Ref</th>
                      <th className="py-3 px-4 font-semibold">Amount</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono-nums font-semibold text-slate-900">
                          {pay.receiptNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{pay.description}</td>
                        <td className="py-3 px-4 font-mono-nums text-slate-500">
                          {pay.paystackReference}
                        </td>
                        <td className="py-3 px-4 font-bold text-green-800 tabular-nums">
                          {formatNgn(pay.amountNgn)}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {formatReadableDate(pay.paidAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onOpenReceipt(pay)}
                            className="text-orange-700 font-semibold hover:underline"
                          >
                            View Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Profile & Reminder Settings */}
        {activeTab === 'profile' && (
          <form
            onSubmit={handleSaveProfile}
            className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl space-y-5"
          >
            <div>
              <h2 className="font-display text-lg font-bold text-[#0B2545]">
                Delivery &amp; Reminder Preferences
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your SMS and Email reminder channels for automated daily, weekly, and
                monthly Pay Small Small alerts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  SMS Reminder Phone
                </label>
                <input
                  type="tel"
                  placeholder="+234 803 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Default Delivery Address
              </label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={stateVal}
                  onChange={(e) => setStateVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsOptIn}
                  onChange={(e) => setSmsOptIn(e.target.checked)}
                  className="w-4 h-4 accent-green-700"
                />
                <span>Enable automated SMS reminders for Pay Small Small due dates</span>
              </label>
              <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailOptIn}
                  onChange={(e) => setEmailOptIn(e.target.checked)}
                  className="w-4 h-4 accent-green-700"
                />
                <span>Enable automated Email reminders &amp; Paystack payment receipts</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{savingProfile ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
