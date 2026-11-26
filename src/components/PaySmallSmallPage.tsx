import { useMemo, useState } from 'react';
import { ArrowRight, BellRing, Calendar, CheckCircle2, Shield } from 'lucide-react';
import {
  computePlanSchedule,
  formatNgn,
  formatReadableDate,
  getMinimumInstallment,
  getPresetAmounts,
} from '../data/catalog';
import type { InstallmentFrequency, Product, RouteState } from '../types';
import { FoodImage } from './FoodImage';

interface PaySmallSmallPageProps {
  products: Product[];
  navigate: (route: RouteState) => void;
}

export function PaySmallSmallPage({ products, navigate }: PaySmallSmallPageProps) {
  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);
  const [selectedProductId, setSelectedProductId] = useState(
    activeProducts[0]?.id || 'sm-bundle-family-pantry'
  );
  const selectedProduct =
    activeProducts.find((p) => p.id === selectedProductId) || activeProducts[0];
  const [variantIdx, setVariantIdx] = useState(0);
  const selectedVariant =
    selectedProduct?.variants[variantIdx] || selectedProduct?.variants[0];

  const [frequency, setFrequency] = useState<InstallmentFrequency>('daily');
  const [installmentInput, setInstallmentInput] = useState<number>(1000);

  const minAmt = getMinimumInstallment(frequency);
  const safeInstallment = Math.max(minAmt, installmentInput || minAmt);
  const presets = selectedVariant
    ? getPresetAmounts(frequency, selectedVariant.priceNgn)
    : [500, 1000, 2000];
  const schedule = selectedVariant
    ? computePlanSchedule(selectedVariant.priceNgn, frequency, safeInstallment)
    : null;

  const handleFreqSelect = (next: InstallmentFrequency) => {
    setFrequency(next);
    if (next === 'daily') setInstallmentInput(1000);
    else if (next === 'weekly') setInstallmentInput(5000);
    else if (selectedVariant) {
      setInstallmentInput(Math.max(1000, Math.ceil(selectedVariant.priceNgn / 3 / 500) * 500));
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <section className="bg-green-900 text-white py-12 border-b border-green-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-3">
            <p className="text-xs font-semibold text-orange-300 uppercase tracking-wide">
              FEGGY Core Business Model
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-balance">
              Pay Small Small for All Your Nigerian Foodstuffs
            </h1>
            <p className="text-sm sm:text-base text-green-100 max-w-2xl leading-relaxed">
              Avoid sudden food price inflation. Pick your rice, beans, garri, oil, or family bundle,
              choose a daily (from ₦500), weekly (from ₦5,000), or monthly contribution package, and
              pay effortlessly via Paystack with automated SMS &amp; email reminders.
            </p>
          </div>
          <div className="lg:col-span-4 bg-green-800/70 border border-green-700 rounded-2xl p-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-green-200">Daily Plan Minimum</span>
              <span className="font-bold text-orange-300 tabular-nums">₦500 / day</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-200">Weekly Plan Minimum</span>
              <span className="font-bold text-orange-300 tabular-nums">₦5,000 / week</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-200">Monthly Packages</span>
              <span className="font-bold text-white">2 to 6 Months</span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Interactive Configurator */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <h2 className="font-display text-xl font-bold text-[#0B2545]">
            Build Your Pay Small Small Schedule
          </h2>

          <div>
            <label
              htmlFor="pss-product-select"
              className="block text-xs font-semibold text-slate-700 mb-2"
            >
              Select Foodstuff or Bundle
            </label>
            <select
              id="pss-product-select"
              value={selectedProduct?.id || ''}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setVariantIdx(0);
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-700"
            >
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-2">
                Select Quantity / Bag Size
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {selectedProduct.variants.map((v, idx) => (
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
                    <p className="text-sm font-bold tabular-nums mt-0.5">
                      {formatNgn(v.priceNgn)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-2">
              Choose Contribution Frequency
            </span>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
              {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => handleFreqSelect(freq)}
                  className={`py-2.5 rounded-lg text-sm font-semibold capitalize transition-colors ${
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
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">
                Contribution Amount (Min {formatNgn(minAmt)})
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {presets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setInstallmentInput(amt)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold tabular-nums transition-colors ${
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
              aria-label="Custom contribution amount in Naira"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-green-700"
            />
          </div>
        </div>

        {/* Right: Live Schedule Preview */}
        <div className="lg:col-span-5 space-y-6">
          {selectedProduct && selectedVariant && schedule && (
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-20 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 p-1 shrink-0">
                  <FoodImage
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{selectedVariant.label}</p>
                  <h3 className="font-display text-base font-bold text-[#0B2545]">
                    {selectedProduct.name}
                  </h3>
                </div>
              </div>

              <dl className="divide-y divide-slate-200 text-sm">
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-600">Total Target Amount</dt>
                  <dd className="font-bold text-slate-900 tabular-nums">
                    {formatNgn(selectedVariant.priceNgn)}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-600">Frequency</dt>
                  <dd className="font-semibold text-green-800 capitalize">{frequency}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-600">First Payment Today</dt>
                  <dd className="font-bold text-orange-700 tabular-nums">
                    {formatNgn(schedule.firstPaymentNgn)}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-600">Balance After 1st Payment</dt>
                  <dd className="font-semibold text-slate-900 tabular-nums">
                    {formatNgn(schedule.remainingAfterFirstNgn)}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-600">Installment Count</dt>
                  <dd className="font-semibold text-slate-900 tabular-nums">
                    {schedule.totalInstallments} payments
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-600">Expected Completion Date</dt>
                  <dd className="font-bold text-green-800 tabular-nums">
                    {formatReadableDate(schedule.expectedCompletionDate)}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => navigate({ view: 'product', productId: selectedProduct.id })}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors"
              >
                <span>Start This Plan &amp; Pay {formatNgn(schedule.firstPaymentNgn)}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="border border-slate-200 rounded-2xl p-5 space-y-3 text-xs text-slate-600">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <BellRing className="w-4 h-4 text-orange-600" />
              <span>Automated SMS &amp; Email Reminders</span>
            </div>
            <p>
              Firebase Cloud Functions automatically send scheduled daily, weekly, and monthly
              contribution reminders with your updated balance.
            </p>
            <div className="flex items-center gap-4 pt-1 text-green-800 font-medium">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Paystack Verified
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Instant Receipts
              </span>
              <span className="inline-flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Price Locked
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
