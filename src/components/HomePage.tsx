import { useMemo, useState } from 'react';
import { ArrowRight, CalendarCheck, CheckCircle2, Clock, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  CATEGORY_LABELS,
  computePlanSchedule,
  formatNgn,
  formatReadableDate,
  getPresetAmounts,
} from '../data/catalog';
import type {
  InstallmentFrequency,
  Product,
  ProductCategory,
  ProductVariant,
  RouteState,
} from '../types';
import { FoodImage } from './FoodImage';
import { ProductCard } from './ProductCard';

interface HomePageProps {
  products: Product[];
  navigate: (route: RouteState) => void;
  onQuickAddToCart: (product: Product, variant: ProductVariant) => void;
}

const ORDERED_CATEGORIES: ProductCategory[] = [
  'bundles',
  'rice',
  'beans',
  'garri',
  'palm_oil',
  'groundnut_oil',
  'vegetable_oil',
  'yam',
  'onions',
  'tomatoes',
  'pasta_noodles',
  'swallow_flour',
  'meat_fish',
  'spices_seasoning',
];

export function HomePage({ products, navigate, onQuickAddToCart }: HomePageProps) {
  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);

  const featuredProducts = useMemo(() => {
    const featured = activeProducts.filter((p) => p.featured);
    return (featured.length >= 8 ? featured : activeProducts).slice(0, 8);
  }, [activeProducts]);

  const alignedCategories = useMemo(() => {
    return ORDERED_CATEGORIES.map((cat) => {
      const items = activeProducts.filter((p) => p.category === cat);
      return {
        category: cat,
        label: CATEGORY_LABELS[cat],
        count: items.length,
        previewImage: items[0]?.imageUrl || '',
      };
    }).filter((entry) => entry.count > 0);
  }, [activeProducts]);

  const calcProducts = activeProducts;
  const [calcProductId, setCalcProductId] = useState<string>(
    calcProducts[0]?.id || 'sm-bundle-family-pantry'
  );
  const selectedProduct =
    calcProducts.find((p) => p.id === calcProductId) || calcProducts[0];
  const [calcVariantIdx, setCalcVariantIdx] = useState(0);
  const selectedVariant =
    selectedProduct?.variants[calcVariantIdx] || selectedProduct?.variants[0];

  const [frequency, setFrequency] = useState<InstallmentFrequency>('daily');
  const [customAmount, setCustomAmount] = useState<number>(1000);

  const presets = selectedVariant
    ? getPresetAmounts(frequency, selectedVariant.priceNgn)
    : [500, 1000, 2000];

  const effectiveAmount = Math.max(
    frequency === 'daily' ? 500 : frequency === 'weekly' ? 5000 : 1000,
    customAmount
  );

  const schedule = selectedVariant
    ? computePlanSchedule(selectedVariant.priceNgn, frequency, effectiveAmount)
    : null;

  const handleFrequencyChange = (nextFreq: InstallmentFrequency) => {
    setFrequency(nextFreq);
    if (nextFreq === 'daily') setCustomAmount(1000);
    else if (nextFreq === 'weekly') setCustomAmount(5000);
    else if (selectedVariant) {
      setCustomAmount(Math.max(1000, Math.ceil(selectedVariant.priceNgn / 3 / 500) * 500));
    }
  };

  return (
    <div className="bg-white">
      {/* Hero Section: Pay Small Small Focal Point */}
      <section className="bg-gradient-to-b from-green-50/80 via-white to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          {/* Hero Left */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div className="text-xs font-semibold text-orange-700 tracking-wide uppercase">
              Easy Buy Foodstuff · Pay Small Small
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#0B2545] tracking-tight leading-[1.1] text-balance max-w-2xl">
              Stock your Nigerian kitchen and pay small small at your pace.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              Lock today&apos;s foodstuff prices on rice, beans, garri, palm oil, yams, and family
              bundles. Contribute from <span className="font-semibold text-green-800">₦500 daily</span>{' '}
              or <span className="font-semibold text-green-800">₦5,000 weekly</span> via Paystack, or
              buy in full with optional monthly delivery.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate({ view: 'pay-small-small' })}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors whitespace-nowrap"
              >
                <span>Start Pay Small Small</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate({ view: 'shop', category: 'all' })}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-green-700 text-green-800 text-sm font-semibold hover:bg-green-50 transition-colors whitespace-nowrap"
              >
                Browse Foodstuffs
              </button>
            </div>

            <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-200/80 max-w-lg">
              <div>
                <p className="font-display text-xl font-bold text-green-800 tabular-nums">₦500+</p>
                <p className="text-xs text-slate-500 mt-0.5">Daily minimum</p>
              </div>
              <div>
                <p className="font-display text-xl font-bold text-green-800 tabular-nums">₦5,000+</p>
                <p className="text-xs text-slate-500 mt-0.5">Weekly minimum</p>
              </div>
              <div>
                <p className="font-display text-xl font-bold text-orange-600">Paystack</p>
                <p className="text-xs text-slate-500 mt-0.5">Verified receipts</p>
              </div>
            </div>
          </div>

          {/* Hero Right: Interactive Pay Small Small Calculator */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B2545]">
                    Pay Small Small Planner
                  </h2>
                  <p className="text-xs text-slate-500">Calculate your foodstuff contribution plan</p>
                </div>
                <span className="text-xs font-semibold text-green-800">0% Hidden Fees</span>
              </div>

              {selectedProduct && selectedVariant && schedule && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label
                      htmlFor="hero-calc-product"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      1. Choose Foodstuff or Bundle
                    </label>
                    <select
                      id="hero-calc-product"
                      value={selectedProduct.id}
                      onChange={(e) => {
                        setCalcProductId(e.target.value);
                        setCalcVariantIdx(0);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-700"
                    >
                      {calcProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {selectedProduct.variants.map((v, idx) => (
                      <button
                        key={v.label}
                        type="button"
                        onClick={() => setCalcVariantIdx(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          idx === calcVariantIdx
                            ? 'bg-green-800 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {v.label} · {formatNgn(v.priceNgn)}
                      </button>
                    ))}
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-slate-700 mb-1.5">
                      2. Contribution Frequency
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
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
                    <span className="block text-xs font-medium text-slate-700 mb-1.5">
                      3. Select Contribution Amount
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {presets.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCustomAmount(amt)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold tabular-nums transition-colors ${
                            effectiveAmount === amt
                              ? 'bg-orange-600 text-white'
                              : 'border border-slate-200 text-slate-700 hover:border-orange-500'
                          }`}
                        >
                          {formatNgn(amt)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-green-50/80 border border-green-200 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Target Amount</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatNgn(selectedVariant.priceNgn)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Contribution ({frequency})</span>
                      <span className="font-bold text-orange-700 tabular-nums">
                        {formatNgn(schedule.installmentAmountNgn)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Balance After Today&apos;s Payment</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatNgn(schedule.remainingAfterFirstNgn)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-green-200">
                      <span className="text-slate-600">Expected Completion</span>
                      <span className="font-semibold text-green-900 tabular-nums">
                        {formatReadableDate(schedule.expectedCompletionDate)} ({schedule.totalInstallments}{' '}
                        steps)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedProduct && (
              <button
                type="button"
                onClick={() => navigate({ view: 'product', productId: selectedProduct.id })}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition-colors"
              >
                <span>Open Plan &amp; Pay First Installment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 4-Column Feature Strip */}
      <section className="border-b border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <CalendarCheck className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">1. Pay Small Small</h3>
              <p className="text-xs text-slate-600 mt-1">
                Daily from ₦500, weekly from ₦5,000, or monthly packages with SMS &amp; email
                reminders.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">2. Buy Now (Instant)</h3>
              <p className="text-xs text-slate-600 mt-1">
                Pay in full via Paystack for immediate dispatch of single items or family bundles.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">3. Monthly Subscriptions</h3>
              <p className="text-xs text-slate-600 mt-1">
                Opt into automatic monthly restocking for your food bundles during checkout.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Buy Now Pay Later · Coming Soon
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Credit-backed BNPL is under review and will be activated after official rollout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Aligned Categories Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">
              Aligned Store Categories
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545] mt-1">
              Shop Foodstuffs by Category
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate({ view: 'shop', category: 'all' })}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-800 hover:text-orange-600 transition-colors whitespace-nowrap"
          >
            <span>Explore Full Market ({activeProducts.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {alignedCategories.map((cat) => (
            <button
              key={cat.category}
              type="button"
              onClick={() => navigate({ view: 'shop', category: cat.category })}
              className="group bg-white border border-slate-200 rounded-xl p-3 text-left hover:border-green-700 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="aspect-[4/3] w-full rounded-lg bg-white overflow-hidden mb-2.5 flex items-center justify-center p-1">
                <FoodImage
                  src={cat.previewImage}
                  alt={cat.label}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-[#0B2545] leading-snug line-clamp-2">
                  {cat.label}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                  {cat.count} {cat.count === 1 ? 'item' : 'items'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Staples & Bundles (2-Column Grid) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
              Genuine Nigerian Foodstuffs
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545] mt-1">
              Featured Bundles &amp; Essential Staples
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate({ view: 'shop', category: 'all' })}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-800 hover:text-orange-600 transition-colors whitespace-nowrap"
          >
            <span>View All Foodstuffs ({activeProducts.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpenProduct={(id) => navigate({ view: 'product', productId: id })}
              onQuickAddToCart={onQuickAddToCart}
            />
          ))}
        </div>
      </section>

      {/* Proof & Subscription / BNPL Clarity Section */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 bg-white p-6">
            <FoodImage
              src="https://cdn.shopify.com/s/files/1/0773/4037/7385/files/spxabc416_king-s_pure_refined_palm_olein_5_l.jpg?v=1688846700"
              alt="King's Pure Refined Vegetable Oil 5L Nigerian staple"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                Transparent Payment Options
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545] mt-1 text-balance">
                Built around Pay Small Small, with Buy Now &amp; Subscriptions
              </h2>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-orange-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pay Small Small (Active · Primary Option)</span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Track every Naira paid, remaining balance, and expected completion date in your
                  dashboard. Receive automated daily, weekly, or monthly SMS and email reminders.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-green-800">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Buy Now + Optional Monthly Food Subscription (Active)</span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Pay in full at checkout and optionally subscribe to monthly bundle deliveries you
                  can pause, renew, or cancel anytime.
                </p>
              </div>

              <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 opacity-90">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-800">Buy Now Pay Later (BNPL)</span>
                  <span className="text-xs font-bold text-orange-700 uppercase">Coming Soon</span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  BNPL credit-based ordering is currently disabled and does not accept applications
                  until officially activated.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
