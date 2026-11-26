import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { AdminDashboard } from './components/AdminDashboard';
import { CartCheckoutPage } from './components/CartCheckoutPage';
import { CustomerDashboard } from './components/CustomerDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { Navbar } from './components/Navbar';
import { PaySmallSmallPage } from './components/PaySmallSmallPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { ReceiptModal } from './components/ReceiptModal';
import { ShopPage } from './components/ShopPage';
import { INITIAL_NIGERIAN_CATALOG } from './data/catalog';
import { useAppRouter } from './hooks/useAppRouter';
import { ADMIN_EMAIL, auth, googleProvider, testConnection } from './lib/firebase';
import {
  createBuyNowOrderWithPayment,
  createInstallmentPlanWithPayment,
  ensureUserProfile,
  recordPlanContributionWithPayment,
  renewSubscriptionWithPayment,
  seedDefaultCatalogToFirestore,
  subscribeAllCustomers,
  subscribeAllOrders,
  subscribeAllPayments,
  subscribeAllPlans,
  subscribeAllReminderLogs,
  subscribeAllSubscriptions,
  subscribeProducts,
  subscribeUserOrders,
  subscribeUserPayments,
  subscribeUserPlans,
  subscribeUserProfile,
  subscribeUserSubscriptions,
} from './lib/firestoreService';
import {
  consumePendingCheckoutIntent,
  fetchPublicGatewayConfig,
  verifyPaystackReference,
  type PublicGatewayConfig,
} from './lib/paystack';
import type {
  CartItem,
  InstallmentFrequency,
  InstallmentPlan,
  Order,
  OrderItem,
  PaymentRecord,
  Product,
  ProductVariant,
  ReminderLog,
  Subscription,
  UserProfile,
} from './types';

interface ToastState {
  message: string;
  tone: 'success' | 'error' | 'info';
}

const CART_STORAGE_KEY = 'feggy_cart_v1';

function AppShell() {
  const { route, navigate, goBack } = useAppRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);

  const [userPlans, setUserPlans] = useState<InstallmentPlan[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userPayments, setUserPayments] = useState<PaymentRecord[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<Subscription[]>([]);

  const [adminPlans, setAdminPlans] = useState<InstallmentPlan[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [adminPayments, setAdminPayments] = useState<PaymentRecord[]>([]);
  const [adminSubscriptions, setAdminSubscriptions] = useState<Subscription[]>([]);
  const [adminCustomers, setAdminCustomers] = useState<UserProfile[]>([]);
  const [adminReminderLogs, setAdminReminderLogs] = useState<ReminderLog[]>([]);

  const [gatewayConfig, setGatewayConfig] = useState<PublicGatewayConfig>({
    paystackConfigured: false,
    paystackPublicKey: '',
    cloudinaryConfigured: false,
    cloudinaryCloudName: '',
    termiiConfigured: false,
    resendConfigured: false,
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [receiptPayment, setReceiptPayment] = useState<PaymentRecord | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, tone: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, tone });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage error
    }
  }, [cart]);

  useEffect(() => {
    void testConnection();
    void fetchPublicGatewayConfig().then(setGatewayConfig);

    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        try {
          await ensureUserProfile(nextUser);
        } catch (err) {
          console.error(err);
        }
      } else {
        setProfile(null);
        setUserPlans([]);
        setUserOrders([]);
        setUserPayments([]);
        setUserSubscriptions([]);
      }
    });

    const unsubProducts = subscribeProducts((items) => {
      setFirestoreProducts(items);
    });

    return () => {
      unsubAuth();
      unsubProducts();
    };
  }, []);

  const isAdmin = Boolean(
    user && user.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL
  );

  const hasLegacyWikimediaCatalog = useMemo(
    () =>
      firestoreProducts.length > 0 &&
      firestoreProducts.every((p) => !p.id.startsWith('sm-')) &&
      firestoreProducts.some((p) => p.imageUrl.includes('wikimedia.org')),
    [firestoreProducts]
  );

  useEffect(() => {
    if (!authReady || !isAdmin || !hasLegacyWikimediaCatalog) return;
    void seedDefaultCatalogToFirestore(firestoreProducts.map((p) => p.id)).catch((err) => {
      console.error('Failed to auto-sync Supermart catalog:', err);
    });
  }, [authReady, isAdmin, hasLegacyWikimediaCatalog, firestoreProducts]);

  const products = useMemo(
    () =>
      firestoreProducts.length > 0 && !hasLegacyWikimediaCatalog
        ? firestoreProducts
        : INITIAL_NIGERIAN_CATALOG,
    [firestoreProducts, hasLegacyWikimediaCatalog]
  );

  // Customer Firestore subscriptions
  useEffect(() => {
    if (!authReady || !user) return;
    const unsubs = [
      subscribeUserProfile(user.uid, setProfile),
      subscribeUserPlans(user.uid, setUserPlans),
      subscribeUserOrders(user.uid, setUserOrders),
      subscribeUserPayments(user.uid, setUserPayments),
      subscribeUserSubscriptions(user.uid, setUserSubscriptions),
    ];
    return () => unsubs.forEach((u) => u());
  }, [authReady, user]);

  // Admin Firestore subscriptions
  useEffect(() => {
    if (!authReady || !isAdmin) return;
    const unsubs = [
      subscribeAllPlans(setAdminPlans),
      subscribeAllOrders(setAdminOrders),
      subscribeAllPayments(setAdminPayments),
      subscribeAllSubscriptions(setAdminSubscriptions),
      subscribeAllCustomers(setAdminCustomers),
      subscribeAllReminderLogs(setAdminReminderLogs),
    ];
    return () => unsubs.forEach((u) => u());
  }, [authReady, isAdmin]);

  // Verify Paystack redirect callback if ?reference= or ?trxref= is present
  useEffect(() => {
    if (!authReady || !user) return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('reference') || params.get('trxref');
    if (!ref) return;

    const intent = consumePendingCheckoutIntent(ref);
    if (!intent) return;

    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    void (async () => {
      try {
        const verified = await verifyPaystackReference(ref);
        if (intent.type === 'buy_now') {
          const payload = intent.payload as {
            items: OrderItem[];
            totalAmountNgn: number;
            customerPhone: string;
            deliveryAddress: string;
            enableMonthlySubscription?: boolean;
          };
          const res = await createBuyNowOrderWithPayment({
            user,
            items: payload.items,
            totalAmountNgn: payload.totalAmountNgn,
            customerPhone: payload.customerPhone,
            deliveryAddress: payload.deliveryAddress,
            verifiedPayment: verified,
            enableMonthlySubscription: payload.enableMonthlySubscription,
          });
          setCart([]);
          showToast(`Paystack payment verified! Receipt ${res.receiptNumber} issued.`, 'success');
        } else if (intent.type === 'installment_start') {
          const payload = intent.payload as {
            productId: string;
            variantLabel: string;
            totalTargetNgn: number;
            frequency: InstallmentFrequency;
            installmentAmountNgn: number;
            reminderPhone: string;
            deliveryAddress: string;
          };
          const prod = products.find((p) => p.id === payload.productId);
          if (prod) {
            const res = await createInstallmentPlanWithPayment({
              user,
              product: prod,
              variantLabel: payload.variantLabel,
              totalTargetNgn: payload.totalTargetNgn,
              frequency: payload.frequency,
              installmentAmountNgn: payload.installmentAmountNgn,
              reminderPhone: payload.reminderPhone,
              deliveryAddress: payload.deliveryAddress,
              verifiedPayment: verified,
            });
            showToast(`Pay Small Small plan started! Receipt ${res.receiptNumber}.`, 'success');
          }
        } else if (intent.type === 'installment_contribution') {
          const payload = intent.payload as { planId: string };
          const plan = userPlans.find((p) => p.id === payload.planId);
          if (plan) {
            const res = await recordPlanContributionWithPayment({
              user,
              plan,
              verifiedPayment: verified,
            });
            showToast(`Contribution recorded! Receipt ${res.receiptNumber}.`, 'success');
          }
        } else if (intent.type === 'subscription_renewal') {
          const payload = intent.payload as { subscriptionId: string };
          const sub = userSubscriptions.find((s) => s.id === payload.subscriptionId);
          if (sub) {
            const res = await renewSubscriptionWithPayment({
              user,
              subscription: sub,
              verifiedPayment: verified,
            });
            showToast(`Subscription renewed! Receipt ${res.receiptNumber}.`, 'success');
          }
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Paystack verification error.', 'error');
      }
    })();
  }, [authReady, user, products, userPlans, userSubscriptions]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Signed in to FEGGY FOODSTUFF.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Google Sign-In failed.', 'error');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    showToast('You have signed out.', 'info');
    navigate({ view: 'home' });
  };

  const handleAddToCart = (product: Product, variant: ProductVariant, quantity = 1) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (c) => c.product.id === product.id && c.variant.label === variant.label
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + quantity,
        };
        return next;
      }
      return [...prev, { product, variant, quantity }];
    });
    showToast(`Added ${product.name} (${variant.label}) to cart.`, 'success');
  };

  const handleUpdateCartQty = (productId: string, variantLabel: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) =>
        prev.filter((c) => !(c.product.id === productId && c.variant.label === variantLabel))
      );
      return;
    }
    setCart((prev) =>
      prev.map((c) =>
        c.product.id === productId && c.variant.label === variantLabel
          ? { ...c, quantity: qty }
          : c
      )
    );
  };

  const handleRemoveCartItem = (productId: string, variantLabel: string) => {
    setCart((prev) =>
      prev.filter((c) => !(c.product.id === productId && c.variant.label === variantLabel))
    );
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeProduct = route.productId
    ? products.find((p) => p.id === route.productId)
    : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar
        route={route}
        navigate={navigate}
        goBack={goBack}
        cartCount={cartCount}
        user={user}
        isAdmin={isAdmin}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm no-print">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
              toast.tone === 'success'
                ? 'bg-green-900 text-white border-green-800'
                : toast.tone === 'error'
                ? 'bg-red-700 text-white border-red-800'
                : 'bg-[#0B2545] text-white border-slate-800'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <main className="flex-1">
        {route.view === 'home' && (
          <HomePage
            products={products}
            navigate={navigate}
            onQuickAddToCart={(p, v) => handleAddToCart(p, v, 1)}
          />
        )}

        {route.view === 'pay-small-small' && (
          <PaySmallSmallPage products={products} navigate={navigate} />
        )}

        {route.view === 'shop' && (
          <ShopPage
            products={products}
            initialCategory={route.category || 'all'}
            navigate={navigate}
            onQuickAddToCart={(p, v) => handleAddToCart(p, v, 1)}
          />
        )}

        {route.view === 'product' && (
          <ProductDetailPage
            product={activeProduct}
            user={user}
            profile={profile}
            gatewayConfig={gatewayConfig}
            onSignIn={handleSignIn}
            onAddToCart={handleAddToCart}
            navigate={navigate}
            goBack={goBack}
            onShowToast={showToast}
          />
        )}

        {route.view === 'cart' && (
          <CartCheckoutPage
            cart={cart}
            user={user}
            profile={profile}
            gatewayConfig={gatewayConfig}
            onUpdateQty={handleUpdateCartQty}
            onRemoveItem={handleRemoveCartItem}
            onClearCart={() => setCart([])}
            onSignIn={handleSignIn}
            navigate={navigate}
            goBack={goBack}
            onShowToast={showToast}
          />
        )}

        {route.view === 'dashboard' && (
          <CustomerDashboard
            user={user}
            profile={profile}
            plans={userPlans}
            orders={userOrders}
            payments={userPayments}
            subscriptions={userSubscriptions}
            activeTab={route.tab || 'plans'}
            gatewayConfig={gatewayConfig}
            navigate={navigate}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            onOpenReceipt={setReceiptPayment}
            onShowToast={showToast}
          />
        )}

        {route.view === 'admin' && (
          <AdminDashboard
            isAdmin={isAdmin}
            products={products}
            plans={adminPlans}
            orders={adminOrders}
            payments={adminPayments}
            subscriptions={adminSubscriptions}
            customers={adminCustomers}
            reminderLogs={adminReminderLogs}
            activeTab={route.tab || 'overview'}
            gatewayConfig={gatewayConfig}
            navigate={navigate}
            onShowToast={showToast}
          />
        )}
      </main>

      <Footer navigate={navigate} />
      <ReceiptModal payment={receiptPayment} onClose={() => setReceiptPayment(null)} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
