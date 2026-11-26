import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CATEGORY_LABELS } from '../data/catalog';
import type { Product, ProductCategory, ProductVariant, RouteState } from '../types';
import { ProductCard } from './ProductCard';

interface ShopPageProps {
  products: Product[];
  initialCategory?: ProductCategory | 'all';
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

export function ShopPage({
  products,
  initialCategory = 'all',
  navigate,
  onQuickAddToCart,
}: ShopPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>(
    initialCategory
  );

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: activeProducts.length };
    for (const p of activeProducts) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [activeProducts]);

  const visibleCategories = useMemo<Array<ProductCategory | 'all'>>(() => {
    const present = ORDERED_CATEGORIES.filter((cat) => (categoryCounts[cat] || 0) > 0);
    return ['all', ...present];
  }, [categoryCounts]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeProducts
      .filter((p) => selectedCategory === 'all' || p.category === selectedCategory)
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          CATEGORY_LABELS[p.category].toLowerCase().includes(q)
        );
      });
  }, [activeProducts, selectedCategory, searchQuery]);

  const handleCategoryClick = (cat: ProductCategory | 'all') => {
    setSelectedCategory(cat);
    navigate({ view: 'shop', category: cat });
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
              Pay Small Small · Buy Now
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545] mt-1">
              FEGGY Foodstuff Market
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Every staple supports Pay Small Small (daily from ₦500 or weekly from ₦5,000) and
              full Buy Now checkout.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rice, beans, garri, yam..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
            />
          </div>
        </div>

        {/* Aligned Category Filter Bar */}
        <div className="py-5 flex flex-wrap items-center gap-2">
          {visibleCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryClick(cat)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                selectedCategory === cat
                  ? 'bg-green-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {CATEGORY_LABELS[cat]} ({categoryCounts[cat] || 0})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center border border-slate-200 rounded-2xl bg-slate-50">
            <p className="font-display text-lg font-bold text-slate-900">
              No matching foodstuffs found
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Try clearing your search or selecting another category.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                handleCategoryClick('all');
              }}
              className="mt-4 px-5 py-2 rounded-xl bg-green-700 text-white text-xs font-semibold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenProduct={(id) => navigate({ view: 'product', productId: id })}
                onQuickAddToCart={onQuickAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
