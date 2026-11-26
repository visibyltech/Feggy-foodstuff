import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Package } from 'lucide-react';
import { CATEGORY_LABELS } from '../data/catalog';
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

  const [heroIndex, setHeroIndex] = useState(0);
  const [featureIndex, setFeatureIndex] = useState(0);

  const featureMessages = [
    { title: 'Wide Assortment', subtitle: 'Everyday Nigerian foodstuffs and pantry essentials' },
    { title: 'Pay Small Small', subtitle: 'Start from ₦500 daily or ₦5,000 weekly' },
    { title: 'Shop with Confidence', subtitle: 'Secure payments and convenient delivery' },
  ];

  const heroSlides = [
    {
      image: 'https://www.grocedy.com/static/media/gifts-2.092f6ad3635cd53c8b6b.jpg',
      alt: 'Real photograph of a Nigerian grocery foodstuff bundle with rice, garri, beans and cooking oil',
      eyebrow: 'FEGGY FOODSTUFF · EASY BUY FOODSTUFF',
      title: 'Everything your kitchen needs, all in one place',
      subtitle: 'Shop everyday food essentials and selected family bundles.',
    },
    {
      image: 'https://haskefoods.com/cdn/shop/files/african-foodstuffs-christmas-gift-hamper-in-a-rectangular-basket_c647e462-eb15-47ac-be31-d58e2bc08c85.png?v=1770659656',
      alt: 'Real photograph of an African foodstuff hamper with rice, palm oil and pantry staples',
      eyebrow: 'FOOD BUNDLES FOR EVERY HOME',
      title: 'Choose a bundle that works for your family',
      subtitle: 'Explore carefully selected foodstuff combinations for your home.',
    },
    {
      image: 'https://res.cloudinary.com/duxaaaejl/image/upload/v1756114128/lcirrfv9umw6qzusioow.png',
      alt: 'Real photograph of Nigerian rice, cooking oil, beans, garri and packaged pantry essentials',
      eyebrow: 'BUY NOW OR PAY SMALL SMALL',
      title: 'Stock your kitchen at your own pace',
      subtitle: 'Shop foodstuffs and choose the payment option that suits you.',
    },
  ];

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
      {/* Supermarket-style hero: assurance strip + photographic campaign slider */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 py-4 sm:py-5 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setFeatureIndex((i) => (i + featureMessages.length - 1) % featureMessages.length)}
              aria-label="Previous store highlight"
              className="text-slate-400 hover:text-green-800 p-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-center gap-4 sm:gap-6 min-w-0">
              <div className="hidden sm:flex items-center justify-center w-12 h-12 text-green-800">
                <Package className="w-10 h-10" strokeWidth={1.7} />
              </div>
              <div className="text-center sm:text-left min-w-0">
                <h2 className="font-bold text-slate-900 text-base sm:text-lg">{featureMessages[featureIndex].title}</h2>
                <p className="text-slate-600 text-sm sm:text-base">{featureMessages[featureIndex].subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFeatureIndex((i) => (i + 1) % featureMessages.length)}
              aria-label="Next store highlight"
              className="text-slate-600 hover:text-green-800 p-1"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="relative mt-0 sm:mt-5 overflow-hidden bg-green-950 sm:rounded-2xl">
            <div className="relative aspect-[1/1.02] sm:aspect-[16/7] lg:aspect-[16/6]">
              <img
                src={heroSlides[heroIndex].image}
                alt={heroSlides[heroIndex].alt}
                className="absolute inset-0 w-full h-full object-cover"
                fetchPriority="high"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/5" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-12 text-white">
                <p className="text-xs sm:text-sm font-bold tracking-[0.16em] uppercase text-orange-200 mb-2">
                  {heroSlides[heroIndex].eyebrow}
                </p>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight max-w-2xl">
                  {heroSlides[heroIndex].title}
                </h1>
                <p className="text-sm sm:text-base text-white/90 mt-2 max-w-xl">
                  {heroSlides[heroIndex].subtitle}
                </p>
                <button
                  type="button"
                  onClick={() => navigate({ view: 'shop', category: 'all' })}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 px-5 py-3 text-sm font-semibold text-white transition-colors"
                >
                  Shop Foodstuffs <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setHeroIndex((i) => (i + heroSlides.length - 1) % heroSlides.length)}
                aria-label="Previous promotion"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white text-slate-900 p-2 shadow"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setHeroIndex((i) => (i + 1) % heroSlides.length)}
                aria-label="Next promotion"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white text-slate-900 p-2 shadow"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <div className="absolute top-4 right-4 flex gap-1.5">
                {heroSlides.map((slide, i) => (
                  <button
                    key={slide.title}
                    type="button"
                    aria-label={`Show promotion ${i + 1}`}
                    onClick={() => setHeroIndex(i)}
                    className={`h-2 rounded-full transition-all ${i === heroIndex ? 'w-7 bg-white' : 'w-2 bg-white/60'}`}
                  />
                ))}
              </div>
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
