import { useEffect, useState } from 'react';
import { ArrowLeft, Minus, Plus, RefreshCw, ShoppingCart, Trash2 } from 'lucide-react';
import type { User } from 'firebase/auth';
import { formatNgn } from '../data/catalog';
import { createBuyNowOrderWithPayment } from '../lib/firestoreService';
import {
  initiateAndVerifyPaystackPayment,
  type PublicGatewayConfig,
} from '../lib/paystack';
import type { CartItem, RouteState, UserProfile } from '../types';
import { FoodImage } from './FoodImage';

interface CartCheckoutPageProps {
  cart: CartItem[];
  user: User | null;
  profile: UserProfile | null;
  gatewayConfig: PublicGatewayConfig;
  onUpdateQty: (productId: string, variantLabel: string, qty: number) => void;
  onRemoveItem: (productId: string, variantLabel: string) => void;
  onClearCart: () => void;
  onSignIn: () => void;
  navigate: (route: RouteState) => void;
  goBack: () => void;
  onShowToast: (msg: string, tone?: 'success' | 'error' | 'info') => void;
}

export function CartCheckoutPage({
  cart,
  user,
  profile,
  gatewayConfig,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onSignIn,
  navigate,
  goBack,
  onShowToast,
}: CartCheckoutPageProps) {
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.deliveryAddress || '');
  const [enableSubscription, setEnableSubscription] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (profile?.phone && !phone) setPhone(profile.phone);
    if (profile?.deliveryAddress && !address) setAddress(profile.deliveryAddress);
  }, [profile, phone, address]);

  const subtotal = cart.reduce((sum, item) => sum + item.variant.priceNgn * item.quantity, 0);

  const handlePaystackCheckout = async () => {
    setErrorMsg('');
    if (!user) {
      onSignIn();
      return;
    }
    if (phone.trim().length < 7) {
      setErrorMsg('Please enter a valid Nigerian delivery phone number.');
      return;
    }
    if (address.trim().length < 5) {
      setErrorMsg('Please enter your delivery address.');
      return;
    }

    setSubmitting(true);
    try {
      const orderItems = cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        variantLabel: c.variant.label,
        quantity: c.quantity,
        unitPriceNgn: c.variant.priceNgn,
        imageUrl: c.product.imageUrl,
      }));

      const verified = await initiateAndVerifyPaystackPayment({
        amountNgn: subtotal,
        purpose: 'buy_now',
        publicKey: gatewayConfig.paystackPublicKey,
        metadata: {
          itemCount: orderItems.length,
          enableMonthlySubscription: enableSubscription,
        },
        intentPayload: {
          items: orderItems,
          totalAmountNgn: subtotal,
          customerPhone: phone.trim(),
          deliveryAddress: address.trim(),
          enableMonthlySubscription: enableSubscription,
        },
      });

      const result = await createBuyNowOrderWithPayment({
        user,
        items: orderItems,
        totalAmountNgn: subtotal,
        customerPhone: phone.trim(),
        deliveryAddress: address.trim(),
        verifiedPayment: verified,
        enableMonthlySubscription: enableSubscription,
      });

      onClearCart();
      onShowToast(
        `Payment verified! Receipt ${result.receiptNumber}${
          result.subscriptionId ? ' & Monthly Subscription created' : ''
        }.`,
        'success'
      );
      navigate({ view: 'dashboard', tab: result.subscriptionId ? 'subscriptions' : 'orders' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Checkout failed.';
      if (msg !== 'REDIRECTING_TO_PAYSTACK') {
        setErrorMsg(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-green-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <h1 className="font-display text-3xl font-bold text-[#0B2545] mb-8">
          Shopping Cart &amp; Full Checkout
        </h1>

        {cart.length === 0 ? (
          <div className="border border-slate-200 rounded-2xl p-12 text-center bg-slate-50">
            <ShoppingCart className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h2 className="font-display text-xl font-bold text-slate-900">Your cart is empty</h2>
            <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Browse Nigerian foodstuffs or start a Pay Small Small daily/weekly contribution plan.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate({ view: 'pay-small-small' })}
                className="px-5 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold"
              >
                Start Pay Small Small
              </button>
              <button
                type="button"
                onClick={() => navigate({ view: 'shop', category: 'all' })}
                className="px-5 py-2.5 rounded-xl border border-green-700 text-green-800 text-sm font-semibold"
              >
                Browse Foodstuffs
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Cart Items */}
            <div className="lg:col-span-7 space-y-4">
              {cart.map((item) => (
                <div
                  key={`${item.product.id}-${item.variant.label}`}
                  className="border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 p-1 shrink-0">
                      <FoodImage
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-slate-900">
                        {item.product.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.variant.label} · {formatNgn(item.variant.priceNgn)} each
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          navigate({ view: 'product', productId: item.product.id })
                        }
                        className="text-xs font-semibold text-orange-700 hover:underline mt-1"
                      >
                        Switch this item to Pay Small Small →
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="inline-flex items-center border border-slate-200 rounded-lg">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQty(item.product.id, item.variant.label, item.quantity - 1)
                        }
                        aria-label="Decrease quantity"
                        className="p-2 text-slate-600 hover:text-slate-900"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-bold tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQty(item.product.id, item.variant.label, item.quantity + 1)
                        }
                        aria-label="Increase quantity"
                        className="p-2 text-slate-600 hover:text-slate-900"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="font-bold text-sm text-slate-900 tabular-nums min-w-[85px] text-right">
                      {formatNgn(item.variant.priceNgn * item.quantity)}
                    </p>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.product.id, item.variant.label)}
                      aria-label="Remove item"
                      className="p-2 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Buy Now + Subscription Checkout Box */}
            <div className="lg:col-span-5 border border-slate-200 rounded-2xl p-6 bg-slate-50 space-y-5">
              <h2 className="font-display text-lg font-bold text-[#0B2545]">
                Order Summary (Buy Now)
              </h2>

              <div className="space-y-2 text-sm border-b border-slate-200 pb-4">
                <div className="flex justify-between">
                  <span className="text-slate-600">Items Subtotal</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatNgn(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment Gateway</span>
                  <span className="font-semibold text-green-800">Paystack (NGN)</span>
                </div>
              </div>

              {/* Monthly Food Subscription Offer */}
              <label className="flex items-start gap-3 p-4 rounded-xl border border-green-200 bg-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSubscription}
                  onChange={(e) => setEnableSubscription(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-green-700"
                />
                <div className="text-xs">
                  <span className="font-bold text-green-900 inline-flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Enroll in Optional Monthly Food Subscription
                  </span>
                  <p className="text-slate-600 mt-1">
                    Automatically schedule monthly bundle renewals for{' '}
                    <span className="font-semibold tabular-nums">{formatNgn(subtotal)}</span>/month.
                    Manage or cancel anytime in your dashboard.
                  </p>
                </div>
              </label>

              <div className="space-y-3">
                <div>
                  <label htmlFor="cart-phone" className="block text-xs font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="cart-phone"
                    type="tel"
                    placeholder="+234 803 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
                <div>
                  <label htmlFor="cart-address" className="block text-xs font-medium text-slate-700 mb-1">
                    Delivery Address
                  </label>
                  <input
                    id="cart-address"
                    type="text"
                    placeholder="House No, Street, Area, State"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
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
                  Paystack requires PAYSTACK_SECRET_KEY in Settings → Secrets before live/test
                  transactions can be processed.
                </p>
              )}

              <button
                type="button"
                disabled={submitting}
                onClick={handlePaystackCheckout}
                className="w-full py-3.5 px-5 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors"
              >
                {submitting
                  ? 'Connecting to Paystack...'
                  : user
                  ? `Pay ${formatNgn(subtotal)} via Paystack`
                  : 'Sign In with Google to Checkout'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
