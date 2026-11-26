import { useMemo } from 'react';
import { ArrowRight, CalendarCheck, CheckCircle2, Clock, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  CATEGORY_LABELS,
} from '../data/catalog';
import type {
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

  return (
    <div className="bg-white">
      {/* Hero Section: Pay Small Small Focal Point */}
      <section className="bg-gradient-to-b from-green-50/80 via-white to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 lg:py-20">
          {/* Hero Left */}
          <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-6">
            <div className="text-xs font-semibold text-orange-700 tracking-wide uppercase">
              Easy Buy Foodstuff · Pay Small Small
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#0B2545] tracking-tight leading-[1.1] text-balance max-w-2xl">
              Stock your Nigerian kitchen and pay small small at your pace.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
              Lock today&apos;s foodstuff prices on rice, beans, garri, palm oil, yams, and family
              bundles. Contribute from <span className="font-semibold text-green-800">₦500 daily</span>{' '}
              or <span className="font-semibold text-green-800">₦5,000 weekly</span> via Paystack, or
              buy in full with optional monthly delivery.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
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

            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-200/80 max-w-lg w-full text-left">
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
