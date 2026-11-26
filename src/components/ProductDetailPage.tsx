import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  CATEGORY_LABELS,
  computePlanSchedule,
  formatNgn,
  formatReadableDate,
  getMinimumInstallment,
  getPresetAmounts,
} from '../data/catalog';
import {
  createBuyNowOrderWithPayment,
  createInstallmentPlanWithPayment,
} from '../lib/firestoreService';
import {
  initiateAndVerifyPaystackPayment,
  type PublicGatewayConfig,
} from '../lib/paystack';
import type {
  InstallmentFrequency,
  Product,
  ProductVariant,
  RouteState,
  UserProfile,
} from '../types';
import { FoodImage } from './FoodImage';

interface ProductDetailPageProps {
  product: Product | undefined;
  user: User | null;
  profile: UserProfile | null;
  gatewayConfig: PublicGatewayConfig;
  onSignIn: () => void;
  onAddToCart: (product: Product, variant: ProductVariant, quantity: number) => void;
  navigate: (route: RouteState) => void;
  goBack: () => void;
  onShowToast: (msg: string, tone?: 'success' | 'error' | 'info') => void;
}

export function ProductDetailPage({
  product,
  user,
  profile,
  gatewayConfig,
  onSignIn,
  onAddToCart,
  navigate,
  goBack,
  onShowToast,
}: ProductDetailPageProps) {
  const [variantIdx, setVariantIdx] = useState(0);
  const [purchaseMode, setPurchaseMode] = useState<'pay_small_small' | 'buy_now' | 'bnpl'>(
    'pay_small_small'
  );
  const [frequency, setFrequency] = useState<InstallmentFrequency>('daily');
  const [installmentInput, setInstallmentInput] = useState<number>(1000);
  const [buyQuantity, setBuyQuantity] = useState<number>(1);
  const [enableSubscription, setEnableSubscription] = useState<boolean>(false);

  const [phone, setPhone] = useState<string>(profile?.phone || '');
  const [address, setAddress] = useState<string>(profile?.deliveryAddress || '');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (profile?.phone && !phone) setPhone(profile.phone);
    if (profile?.deliveryAddress && !address) setAddress(profile.deliveryAddress);
  }, [profile, phone, address]);

  useEffect(() => {
    setVariantIdx(0);
    setErrorMsg('');
  }, [product?.id]);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900">Product not found</h1>
        <button
          type="button"
          onClick={() => navigate({ view: 'shop', category: 'all' })}
          className="mt-4 px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold"
        >
          Back to Market
        </button>
      </div>
    );
  }

  const activeVariant = product.variants[variantIdx] || product.variants[0];
  const minAmt = getMinimumInstallment(frequency);
  const safeInstallment = Math.min(
    activeVariant.priceNgn,
    Math.max(minAmt, installmentInput || minAmt)
  );
  const presets = getPresetAmounts(frequency, activeVariant.priceNgn);
  const schedule = computePlanSchedule(activeVariant.priceNgn, frequency, safeInstallment);
  const buyNowTotal = activeVariant.priceNgn * buyQuantity;

  const handleFrequencyChange = (next: InstallmentFrequency) => {
    setFrequency(next);
    if (next === 'daily') setInstallmentInput(1000);
    else if (next === 'weekly') setInstallmentInput(5000);
    else setInstallmentInput(Math.max(1000, Math.ceil(activeVariant.priceNgn / 3 / 500) * 500));
  };

  const handleStartPaySmallSmall = async () => {
    setErrorMsg('');
    if (!user) {
      onSignIn();
      return;
    }
    if (phone.trim().length < 7) {
      setErrorMsg('Please enter a valid Nigerian phone number for SMS payment reminders.');
      return;
    }
    if (address.trim().length < 5) {
      setErrorMsg('Please enter your delivery address.');
      return;
    }
    if (safeInstallment < minAmt) {
      setErrorMsg(`Minimum ${frequency} installment is ${formatNgn(minAmt)}.`);
      return;
    }

    setSubmitting(true);
    try {
      const verified = await initiateAndVerifyPaystackPayment({
        amountNgn: schedule.firstPaymentNgn,
        purpose: 'installment_start',
        publicKey: gatewayConfig.paystackPublicKey,
        metadata: {
          productId: product.id,
          productName: product.name,
          variantLabel: activeVariant.label,
          frequency,
        },
        intentPayload: {
          productId: product.id,
          variantLabel: activeVariant.label,
          totalTargetNgn: activeVariant.priceNgn,
          frequency,
          installmentAmountNgn: schedule.installmentAmountNgn,
          reminderPhone: phone.trim(),
          deliveryAddress: address.trim(),
        },
      });

      const res = await createInstallmentPlanWithPayment({
        user,
        product,
        variantLabel: activeVariant.label,
        totalTargetNgn: activeVariant.priceNgn,
        frequency,
        installmentAmountNgn: schedule.installmentAmountNgn,
        reminderPhone: phone.trim(),
        deliveryAddress: address.trim(),
        verifiedPayment: verified,
      });

      onShowToast(
        `Pay Small Small plan started! Receipt ${res.receiptNumber} issued.`,
        'success'
      );
      navigate({ view: 'dashboard', tab: 'plans' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to complete Paystack payment.';
      if (msg !== 'REDIRECTING_TO_PAYSTACK') {
        setErrorMsg(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuyNowDirect = async () => {
    setErrorMsg('');
    if (!user) {
      onSignIn();
      return;
    }
    if (phone.trim().length < 7) {
      setErrorMsg('Please enter a valid phone number for delivery updates.');
      return;
    }
    if (address.trim().length < 5) {
      setErrorMsg('Please enter your delivery address.');
      return;
    }

    setSubmitting(true);
    try {
      const verified = await initiateAndVerifyPaystackPayment({
        amountNgn: buyNowTotal,
        purpose: 'buy_now',
        publicKey: gatewayConfig.paystackPublicKey,
        metadata: {
          productId: product.id,
          variantLabel: activeVariant.label,
          quantity: buyQuantity,
          enableSubscription,
        },
        intentPayload: {
          items: [
            {
              productId: product.id,
              productName: product.name,
              variantLabel: activeVariant.label,
              quantity: buyQuantity,
              unitPriceNgn: activeVariant.priceNgn,
              imageUrl: product.imageUrl,
            },
          ],
          totalAmountNgn: buyNowTotal,
          customerPhone: phone.trim(),
          deliveryAddress: address.trim(),
          enableMonthlySubscription: enableSubscription,
        },
      });

      const res = await createBuyNowOrderWithPayment({
        user,
        items: [
          {
            productId: product.id,
            productName: product.name,
            variantLabel: activeVariant.label,
            quantity: buyQuantity,
            unitPriceNgn: activeVariant.priceNgn,
            imageUrl: product.imageUrl,
          },
        ],
        totalAmountNgn: buyNowTotal,
        customerPhone: phone.trim(),
        deliveryAddress: address.trim(),
        verifiedPayment: verified,
        enableMonthlySubscription: enableSubscription,
      });

      onShowToast(
        `Order confirmed! Receipt ${res.receiptNumber}${
          res.subscriptionId ? ' & Monthly Subscription active' : ''
        }.`,
        'success'
      );
      navigate({ view: 'dashboard', tab: res.subscriptionId ? 'subscriptions' : 'orders' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to complete Paystack payment.';
      if (msg !== 'REDIRECTING_TO_PAYSTACK') {
        setErrorMsg(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-green-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left: Product Image & Details */}
          <div className="lg:col-span-6 space-y-6 lg:sticky lg:top-24">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 bg-white p-4 sm:p-6">
              <FoodImage
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-green-800 uppercase">
                  {CATEGORY_LABELS[product.category]}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{activeVariant.stock} units available</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545]">
                {product.name}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {product.description}
              </p>

              {product.isBundle && product.bundleItems && product.bundleItems.length > 0 && (
                <div className="pt-4 border-t border-slate-200">
                  <h2 className="text-sm font-bold text-slate-900 mb-2">
                    What&apos;s Inside This Ready-Made Bundle:
                  </h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {product.bundleItems.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-xs text-slate-700 bg-green-50/70 px-3 py-2 rounded-lg border border-green-100"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-700 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Right: Contiguous Purchase Module */}
          <div className="lg:col-span-6 border border-slate-200 rounded-2xl p-6 sm:p-8 bg-white shadow-sm space-y-6">
            {/* Variant / Quantity Selection */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-2">
                Select Quantity / Pack Size
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {product.variants.map((v, idx) => (
                  <button
                    key={v.label}
                    type="button"
                    onClick={() => setVariantIdx(idx)}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      idx === variantIdx
                        ? 'border-green-700 bg-green-50 text-green-950'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-xs font-semibold">{v.label}</p>
                    <p className="text-sm font-bold tabular-nums mt-0.5">{formatNgn(v.priceNgn)}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Purchase Mode Tabs: Pay Small Small (Most Prominent), Buy Now, BNPL Coming Soon */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-2">
                Choose How You Want to Purchase
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPurchaseMode('pay_small_small')}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    purchaseMode === 'pay_small_small'
                      ? 'border-orange-600 bg-orange-50 ring-1 ring-orange-600'
                      : 'border-slate-200 hover:border-orange-300'
                  }`}
                >
                  <p className="text-xs font-bold text-orange-700">1. PAY SMALL SMALL</p>
                  <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                    From {formatNgn(product.minDailyNgn)}/day
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPurchaseMode('buy_now')}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    purchaseMode === 'buy_now'
                      ? 'border-green-700 bg-green-50 ring-1 ring-green-700'
                      : 'border-slate-200 hover:border-green-300'
                  }`}
                >
                  <p className="text-xs font-bold text-green-800">2. BUY NOW</p>
                  <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                    Full {formatNgn(activeVariant.priceNgn)}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPurchaseMode('bnpl')}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    purchaseMode === 'bnpl'
                      ? 'border-slate-400 bg-slate-100'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-700">BUY NOW PAY LATER</p>
                  <p className="text-[11px] font-bold text-orange-700 uppercase mt-0.5">
                    COMING SOON
                  </p>
                </button>
              </div>
            </div>

            {/* Mode 1: PAY SMALL SMALL */}
            {purchaseMode === 'pay_small_small' && (
              <div className="space-y-5 pt-2 border-t border-slate-100">
                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-2">
                    Contribution Frequency
                  </span>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                    {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => handleFrequencyChange(freq)}
                        className={`py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                          frequency === freq
                            ? 'bg-white text-green-800 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-2">
                    Select {frequency} contribution (Minimum {formatNgn(minAmt)})
                  </span>
                  <div className="flex flex-wrap gap-2 mb-2.5">
                    {presets.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setInstallmentInput(amt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold tabular-nums transition-colors ${
                          safeInstallment === amt
                            ? 'bg-orange-600 text-white'
                            : 'border border-slate-200 text-slate-700 hover:border-orange-500'
                        }`}
                      >
                        {formatNgn(amt)}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={minAmt}
                    step={100}
                    value={installmentInput}
                    onChange={(e) => setInstallmentInput(Number(e.target.value))}
                    aria-label="Custom installment amount"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>

                {/* Clear Plan Breakdown */}
                <dl className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Total Target Amount</dt>
                    <dd className="font-bold text-slate-900 tabular-nums">
                      {formatNgn(activeVariant.priceNgn)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Contribution Frequency</dt>
                    <dd className="font-semibold text-green-900 capitalize">
                      {frequency} ({formatNgn(schedule.installmentAmountNgn)})
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600">First Payment Due Today</dt>
                    <dd className="font-bold text-orange-700 tabular-nums">
                      {formatNgn(schedule.firstPaymentNgn)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Outstanding Balance After Today</dt>
                    <dd className="font-semibold text-slate-900 tabular-nums">
                      {formatNgn(schedule.remainingAfterFirstNgn)}
                    </dd>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-green-200">
                    <dt className="text-slate-600">Expected Completion Date</dt>
                    <dd className="font-bold text-green-900 tabular-nums">
                      {formatReadableDate(schedule.expectedCompletionDate)} ({schedule.totalInstallments}{' '}
                      payments)
                    </dd>
                  </div>
                </dl>

                {/* Delivery & Reminder Contact */}
                <div className="space-y-3">
                  <div>
                    <label htmlFor="pss-phone" className="block text-xs font-medium text-slate-700 mb-1">
                      Phone Number for SMS Reminders &amp; Delivery
                    </label>
                    <input
                      id="pss-phone"
                      type="tel"
                      placeholder="+234 803 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                    />
                  </div>
                  <div>
                    <label htmlFor="pss-address" className="block text-xs font-medium text-slate-700 mb-1">
                      Delivery Street Address &amp; State
                    </label>
                    <input
                      id="pss-address"
                      type="text"
                      placeholder="14 Admiralty Way, Lekki Phase 1, Lagos"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    {errorMsg}
                  </p>
                )}

                {!gatewayConfig.paystackConfigured && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    Paystack gateway awaits server secret configuration (PAYSTACK_SECRET_KEY) in
                    Settings → Secrets before processing live/test NGN charges.
                  </p>
                )}

                <button
                  type="button"
                  disabled={submitting || activeVariant.stock <= 0}
                  onClick={handleStartPaySmallSmall}
                  className="w-full py-3.5 px-5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  {submitting
                    ? 'Connecting to Paystack...'
                    : user
                    ? `Pay ${formatNgn(schedule.firstPaymentNgn)} Today & Start Plan`
                    : 'Sign In with Google to Start Plan'}
                </button>
              </div>
            )}

            {/* Mode 2: BUY NOW (Full Payment + Optional Monthly Food Subscription) */}
            {purchaseMode === 'buy_now' && (
              <div className="space-y-5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Quantity</span>
                  <div className="inline-flex items-center border border-slate-200 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setBuyQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                      className="p-2.5 text-slate-600 hover:text-slate-900"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 text-sm font-bold tabular-nums">{buyQuantity}</span>
                    <button
                      type="button"
                      onClick={() => setBuyQuantity((q) => Math.min(20, q + 1))}
                      aria-label="Increase quantity"
                      className="p-2.5 text-slate-600 hover:text-slate-900"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Optional Monthly Food Subscription */}
                <label className="flex items-start gap-3 p-4 rounded-xl border border-green-200 bg-green-50/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableSubscription}
                    onChange={(e) => setEnableSubscription(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-green-700"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-green-900 inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Add Optional Monthly Food Subscription
                    </span>
                    <p className="text-slate-600 mt-1">
                      Automatically schedule monthly restocking for this food bundle/item at{' '}
                      <span className="font-semibold tabular-nums">{formatNgn(buyNowTotal)}</span>
                      /month. Manage, pause, or renew anytime in your Customer Dashboard.
                    </p>
                  </div>
                </label>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="bn-phone" className="block text-xs font-medium text-slate-700 mb-1">
                      Delivery Phone Number
                    </label>
                    <input
                      id="bn-phone"
                      type="tel"
                      placeholder="+234 803 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                    />
                  </div>
                  <div>
                    <label htmlFor="bn-address" className="block text-xs font-medium text-slate-700 mb-1">
                      Delivery Address
                    </label>
                    <input
                      id="bn-address"
                      type="text"
                      placeholder="14 Admiralty Way, Lekki Phase 1, Lagos"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    {errorMsg}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    disabled={submitting || activeVariant.stock <= 0}
                    onClick={handleBuyNowDirect}
                    className="flex-1 py-3.5 px-5 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors"
                  >
                    {submitting
                      ? 'Connecting to Paystack...'
                      : `Buy Now · ${formatNgn(buyNowTotal)}`}
                  </button>
                  <button
                    type="button"
                    disabled={activeVariant.stock <= 0}
                    onClick={() => {
                      onAddToCart(product, activeVariant, buyQuantity);
                      onShowToast(`Added ${product.name} (${activeVariant.label}) to cart`, 'success');
                    }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold hover:border-green-700 transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mode 3: BUY NOW PAY LATER (COMING SOON ONLY) */}
            {purchaseMode === 'bnpl' && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span>Buy Now Pay Later (BNPL)</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-orange-100 text-orange-800 text-xs font-bold uppercase">
                      COMING SOON
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Credit-backed Buy Now Pay Later is currently inactive and does not accept
                    applications or process transactions until officially launched.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Applications closed until official activation</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPurchaseMode('pay_small_small')}
                  className="w-full py-3 px-4 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors"
                >
                  Use Active Pay Small Small Instead
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
