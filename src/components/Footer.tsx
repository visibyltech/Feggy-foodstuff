import { FEGGY_LOGO_URL } from '../data/catalog';
import type { RouteState } from '../types';

interface FooterProps {
  navigate: (route: RouteState) => void;
}

export function Footer({ navigate }: FooterProps) {
  return (
    <footer className="bg-green-950 text-green-50 border-t border-green-900 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={FEGGY_LOGO_URL}
              alt="FEGGY FOODSTUFF"
              className="w-11 h-11 object-contain rounded-lg bg-white p-1"
            />
            <div>
              <p className="font-display text-lg font-bold text-white">FEGGY FOODSTUFF</p>
              <p className="text-xs text-orange-300 font-medium">Easy Buy Foodstuff</p>
            </div>
          </div>
          <p className="text-sm text-green-200 max-w-md leading-relaxed">
            Nigeria&apos;s Pay Small Small foodstuff platform. Lock today&apos;s market prices on rice, beans,
            garri, palm oil, yams, tomatoes, and pantry bundles with flexible daily, weekly, and
            monthly Paystack contributions.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Quick Links</h4>
          <ul className="space-y-2 text-sm text-green-200">
            <li>
              <button
                type="button"
                onClick={() => navigate({ view: 'pay-small-small' })}
                className="hover:text-orange-300 transition-colors"
              >
                Pay Small Small Planner
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => navigate({ view: 'shop', category: 'bundles' })}
                className="hover:text-orange-300 transition-colors"
              >
                Ready-Made Food Bundles
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => navigate({ view: 'shop', category: 'rice' })}
                className="hover:text-orange-300 transition-colors"
              >
                5kg, 25kg & 50kg Rice
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => navigate({ view: 'dashboard', tab: 'plans' })}
                className="hover:text-orange-300 transition-colors"
              >
                Customer Dashboard
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Payment & Delivery</h4>
          <ul className="space-y-2 text-sm text-green-200">
            <li>Daily Minimum: ₦500 / day</li>
            <li>Weekly Minimum: ₦5,000 / week</li>
            <li>Monthly Bundle Subscriptions</li>
            <li>Secured by Paystack (NGN)</li>
            <li className="text-orange-300">Buy Now Pay Later: Coming Soon</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-green-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-green-300">
          <p>© {new Date().getFullYear()} FEGGY FOODSTUFF. Easy Buy Foodstuff.</p>
          <p>Lagos · Abuja · Port Harcourt · Nationwide Delivery</p>
        </div>
      </div>
    </footer>
  );
}
