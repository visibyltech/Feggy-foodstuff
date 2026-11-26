import { useCallback, useEffect, useState } from 'react';
import type { ProductCategory, RouteState } from '../types';

function parseLocationToRoute(): RouteState {
  const path = window.location.pathname || '/';
  const params = new URLSearchParams(window.location.search);
  const category = (params.get('cat') as ProductCategory | 'all' | null) || 'all';
  const tab = params.get('tab') || undefined;

  if (path.startsWith('/product/')) {
    const productId = decodeURIComponent(path.slice('/product/'.length));
    if (productId) return { view: 'product', productId };
  }
  if (path === '/shop') {
    return { view: 'shop', category };
  }
  if (path === '/pay-small-small') {
    return { view: 'pay-small-small' };
  }
  if (path === '/cart' || path === '/checkout') {
    return { view: 'cart' };
  }
  if (path === '/dashboard') {
    return { view: 'dashboard', tab: tab || 'plans' };
  }
  if (path === '/admin') {
    return { view: 'admin', tab: tab || 'overview' };
  }
  return { view: 'home' };
}

function buildUrlFromRoute(route: RouteState): string {
  if (route.view === 'product' && route.productId) {
    return `/product/${encodeURIComponent(route.productId)}`;
  }
  if (route.view === 'shop') {
    return route.category && route.category !== 'all'
      ? `/shop?cat=${encodeURIComponent(route.category)}`
      : '/shop';
  }
  if (route.view === 'pay-small-small') return '/pay-small-small';
  if (route.view === 'cart') return '/cart';
  if (route.view === 'dashboard') {
    return route.tab && route.tab !== 'plans'
      ? `/dashboard?tab=${encodeURIComponent(route.tab)}`
      : '/dashboard';
  }
  if (route.view === 'admin') {
    return route.tab && route.tab !== 'overview'
      ? `/admin?tab=${encodeURIComponent(route.tab)}`
      : '/admin';
  }
  return '/';
}

export function useAppRouter() {
  const [route, setRoute] = useState<RouteState>(() => parseLocationToRoute());

  useEffect(() => {
    // Ensure initial history entry carries state so mobile back button pops predictably
    window.history.replaceState({ route: parseLocationToRoute() }, '', window.location.href);

    const handlePopState = () => {
      setRoute(parseLocationToRoute());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((nextRoute: RouteState, options?: { replace?: boolean }) => {
    const nextUrl = buildUrlFromRoute(nextRoute);
    if (options?.replace) {
      window.history.replaceState({ route: nextRoute }, '', nextUrl);
    } else {
      window.history.pushState({ route: nextRoute }, '', nextUrl);
    }
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ view: 'home' }, { replace: true });
    }
  }, [navigate]);

  return { route, navigate, goBack };
}
