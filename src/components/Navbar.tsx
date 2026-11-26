import { ArrowLeft, Menu, ShoppingCart, User as UserIcon, X } from 'lucide-react';
import { useState } from 'react';
import type { User } from 'firebase/auth';
import { FEGGY_LOGO_URL } from '../data/catalog';
import type { RouteState } from '../types';

interface NavbarProps {
  route: RouteState;
  navigate: (route: RouteState) => void;
  goBack: () => void;
  cartCount: number;
  user: User | null;
  isAdmin: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function Navbar({
  route,
  navigate,
  goBack,
  cartCount,
  user,
  isAdmin,
  onSignIn,
  onSignOut,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (next: RouteState) => {
    setMobileMenuOpen(false);
    navigate(next);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark + Logo */}
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          {route.view !== 'home' && (
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back to previous page"
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleNav({ view: 'home' })}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 rounded-lg"
          >
            <img
              src={FEGGY_LOGO_URL}
              alt="FEGGY FOODSTUFF"
              className="w-9 h-9 object-contain shrink-0"
            />
            <span className="flex flex-col items-start leading-tight">
              <span className="font-display text-lg font-bold tracking-tight text-[#0B2545] whitespace-nowrap">
                FEGGY FOODSTUFF
              </span>
              <span className="text-[10px] sm:text-xs font-semibold tracking-wide text-green-800 whitespace-nowrap">
                Pay Small Small (Easybuy)
              </span>
            </span>
          </button>
        </div>

        {/* Zone 2: Clean single-line nav links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => handleNav({ view: 'home' })}
            className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors hover:text-green-800 ${
              route.view === 'home' ? 'text-green-800 font-semibold border-b-2 border-orange-500' : ''
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => handleNav({ view: 'pay-small-small' })}
            className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors hover:text-green-800 ${
              route.view === 'pay-small-small'
                ? 'text-green-800 font-semibold border-b-2 border-orange-500'
                : ''
            }`}
          >
            Pay Small Small
          </button>
          <button
            type="button"
            onClick={() => handleNav({ view: 'shop', category: 'all' })}
            className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors hover:text-green-800 ${
              route.view === 'shop' ? 'text-green-800 font-semibold border-b-2 border-orange-500' : ''
            }`}
          >
            Shop Market
          </button>
          <button
            type="button"
            onClick={() => handleNav({ view: 'dashboard', tab: 'plans' })}
            className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors hover:text-green-800 ${
              route.view === 'dashboard'
                ? 'text-green-800 font-semibold border-b-2 border-orange-500'
                : ''
            }`}
          >
            Dashboard
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleNav({ view: 'admin', tab: 'overview' })}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors hover:text-orange-600 ${
                route.view === 'admin'
                  ? 'text-orange-600 font-semibold border-b-2 border-orange-500'
                  : ''
              }`}
            >
              Admin
            </button>
          )}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNav({ view: 'cart' })}
            aria-label="View shopping cart"
            className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:border-green-700 hover:text-green-800 transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Cart</span>
            <span className="tabular-nums font-semibold text-orange-600">({cartCount})</span>
          </button>

          {user ? (
            <button
              type="button"
              onClick={() => handleNav({ view: 'dashboard', tab: 'plans' })}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition-colors whitespace-nowrap shrink-0"
            >
              <UserIcon className="w-4 h-4" />
              <span className="max-w-[120px] truncate">{user.displayName?.split(' ')[0] || 'Account'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1">
          <button
            type="button"
            onClick={() => handleNav({ view: 'home' })}
            className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-green-50"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => handleNav({ view: 'pay-small-small' })}
            className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-green-800 hover:bg-green-50"
          >
            Pay Small Small Planner
          </button>
          <button
            type="button"
            onClick={() => handleNav({ view: 'shop', category: 'all' })}
            className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-green-50"
          >
            Shop All Foodstuffs
          </button>
          <button
            type="button"
            onClick={() => handleNav({ view: 'dashboard', tab: 'plans' })}
            className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 hover:bg-green-50"
          >
            Customer Dashboard
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleNav({ view: 'admin', tab: 'overview' })}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-orange-700 hover:bg-orange-50"
            >
              Admin Console
            </button>
          )}
          <div className="pt-2 border-t border-slate-100">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSignOut();
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Sign Out ({user.email})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSignIn();
                }}
                className="w-full px-4 py-2.5 rounded-lg bg-green-700 text-white text-sm font-semibold"
              >
                Sign In / Create Account
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
