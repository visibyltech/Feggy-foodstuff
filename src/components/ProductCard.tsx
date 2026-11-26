import { useState } from 'react';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { CATEGORY_LABELS, formatNgn } from '../data/catalog';
import type { Product, ProductVariant } from '../types';
import { FoodImage } from './FoodImage';

interface ProductCardProps {
  product: Product;
  onOpenProduct: (productId: string) => void;
  onQuickAddToCart: (product: Product, variant: ProductVariant) => void;
}

export function ProductCard({ product, onOpenProduct, onQuickAddToCart }: ProductCardProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const activeVariant = product.variants[selectedIdx] || product.variants[0];

  return (
    <article className="group bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={() => onOpenProduct(product.id)}
        className="relative aspect-[4/3] w-full overflow-hidden bg-white border-b border-slate-100 p-2 sm:p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
      >
        <FoodImage
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </button>

      <div className="p-3 sm:p-5 flex-1 flex flex-col">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] sm:text-xs text-slate-500">
          <span className="font-semibold text-green-800 uppercase tracking-wide truncate max-w-full">
            {CATEGORY_LABELS[product.category]}
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span className="tabular-nums">
            {activeVariant.stock > 0 ? `${activeVariant.stock} in stock` : 'Out of stock'}
          </span>
        </div>

        <h3 className="mt-1 sm:mt-1.5 font-display text-xs sm:text-base font-bold text-[#0B2545] leading-snug line-clamp-2">
          <button
            type="button"
            onClick={() => onOpenProduct(product.id)}
            className="text-left hover:text-green-800 transition-colors"
          >
            {product.name}
          </button>
        </h3>

        {/* Quantity / Weight Selector */}
        <div className="mt-2.5 sm:mt-3 flex flex-wrap gap-1 sm:gap-1.5">
          {product.variants.map((variant, idx) => (
            <button
              key={variant.label}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                idx === selectedIdx
                  ? 'bg-green-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {variant.label}
            </button>
          ))}
        </div>

        {/* Pay Small Small Primary Callout + Buy Now Secondary */}
        <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-orange-700">
              Pay Small Small
            </span>
            <span className="text-xs sm:text-sm font-bold text-orange-700 tabular-nums">
              From {formatNgn(product.minDailyNgn)}/day
            </span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-1 text-[10px] sm:text-xs text-slate-600">
            <span className="hidden sm:inline">Weekly from {formatNgn(product.minWeeklyNgn)}</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              Buy Now: {formatNgn(activeVariant.priceNgn)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenProduct(product.id)}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-green-700 text-white text-[11px] sm:text-xs font-semibold hover:bg-green-800 transition-colors whitespace-nowrap"
          >
            <span>Pay Small Small</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => onQuickAddToCart(product, activeVariant)}
            disabled={activeVariant.stock <= 0}
            aria-label={`Add ${product.name} ${activeVariant.label} to cart`}
            title="Buy Now / Add to Cart"
            className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-slate-800 text-[11px] sm:text-xs font-semibold hover:border-orange-500 hover:text-orange-700 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span>Buy Now</span>
          </button>
        </div>
      </div>
    </article>
  );
}
