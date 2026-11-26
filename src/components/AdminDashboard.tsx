import { useState } from 'react';
import {
  Bell,
  Database,
  Package,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Users,
  Wallet,
} from 'lucide-react';
import { CATEGORY_LABELS, formatNgn, formatReadableDate } from '../data/catalog';
import {
  deleteProductFromFirestore,
  logReminderByAdmin,
  saveProductToFirestore,
  seedDefaultCatalogToFirestore,
  updateInstallmentStatusByAdmin,
  updateOrderDeliveryStatus,
} from '../lib/firestoreService';
import {
  dispatchReminderFromServer,
  uploadProductImageToCloudinary,
  type PublicGatewayConfig,
} from '../lib/paystack';
import type {
  DeliveryStatus,
  InstallmentPlan,
  InstallmentStatus,
  Order,
  PaymentRecord,
  Product,
  ProductCategory,
  ProductVariant,
  ReminderLog,
  RouteState,
  Subscription,
  UserProfile,
} from '../types';
import { FoodImage } from './FoodImage';

interface AdminDashboardProps {
  isAdmin: boolean;
  products: Product[];
  plans: InstallmentPlan[];
  orders: Order[];
  payments: PaymentRecord[];
  subscriptions: Subscription[];
  customers: UserProfile[];
  reminderLogs: ReminderLog[];
  activeTab: string;
  gatewayConfig: PublicGatewayConfig;
  navigate: (route: RouteState) => void;
  onShowToast: (msg: string, tone?: 'success' | 'error' | 'info') => void;
}

const EMPTY_PRODUCT: Product = {
  id: '',
  name: '',
  slug: '',
  category: 'rice',
  description: '',
  imageUrl: '',
  isBundle: false,
  bundleItems: [],
  variants: [{ label: '5kg Bag', weightKg: 5, priceNgn: 11500, stock: 25 }],
  minPriceNgn: 11500,
  minDailyNgn: 500,
  minWeeklyNgn: 5000,
  featured: false,
  active: true,
};

export function AdminDashboard({
  isAdmin,
  products,
  plans,
  orders,
  payments,
  subscriptions,
  customers,
  reminderLogs,
  activeTab,
  gatewayConfig,
  navigate,
  onShowToast,
}: AdminDashboardProps) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [bundleItemsText, setBundleItemsText] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="border border-red-200 bg-red-50 rounded-2xl p-8">
          <h1 className="font-display text-xl font-bold text-red-900">
            Administrator Access Required
          </h1>
          <p className="text-sm text-red-700 mt-2">
            Sign in with the verified FEGGY administrator account to manage inventory, Pay Small
            Small plans, orders, and Cloudinary uploads.
          </p>
        </div>
      </div>
    );
  }

  const totalRevenue = payments.reduce((sum, p) => sum + p.amountNgn, 0);
  const activePlansCount = plans.filter((p) => p.status === 'active').length;
  const pendingReceivables = plans
    .filter((p) => p.status === 'active')
    .reduce((sum, p) => sum + p.outstandingBalanceNgn, 0);
  const activeSubsCount = subscriptions.filter((s) => s.status === 'active').length;

  const openNewProductForm = () => {
    const newId = `prod-${Date.now()}`;
    setEditingProduct({ ...EMPTY_PRODUCT, id: newId });
    setBundleItemsText('');
    setIsNewProduct(true);
  };

  const openEditProductForm = (product: Product) => {
    setEditingProduct({
      ...product,
      variants: product.variants.map((v) => ({ ...v })),
    });
    setBundleItemsText((product.bundleItems || []).join('\n'));
    setIsNewProduct(false);
  };

  const handleCloudinaryUpload = async (file: File) => {
    if (!editingProduct) return;
    setUploadingImage(true);
    try {
      const secureUrl = await uploadProductImageToCloudinary(file);
      setEditingProduct({ ...editingProduct, imageUrl: secureUrl });
      onShowToast('Image uploaded to Cloudinary successfully.', 'success');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Cloudinary upload failed.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editingProduct.name.trim() || !editingProduct.imageUrl.trim()) {
      onShowToast('Product name and genuine product image URL are required.', 'error');
      return;
    }

    setSavingProduct(true);
    try {
      const slug =
        editingProduct.slug.trim() ||
        editingProduct.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      const bundleItems = editingProduct.isBundle
        ? bundleItemsText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      await saveProductToFirestore(
        {
          ...editingProduct,
          slug,
          bundleItems,
        },
        isNewProduct
      );
      onShowToast('Product saved to Firestore.', 'success');
      setEditingProduct(null);
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Could not save product.', 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleSeedCatalog = async () => {
    setSeeding(true);
    try {
      const count = await seedDefaultCatalogToFirestore(products.map((p) => p.id));
      onShowToast(`Published ${count} Nigerian foodstuffs & bundles to Firestore.`, 'success');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Catalog seed failed.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleSendReminder = async (plan: InstallmentPlan, channel: 'sms' | 'email') => {
    const recipient = channel === 'sms' ? plan.reminderPhone : plan.customerEmail;
    setSendingReminderId(`${plan.id}-${channel}`);
    try {
      const res = await dispatchReminderFromServer({
        channel,
        recipient,
        customerName: plan.customerName,
        productName: plan.productName,
        installmentAmountNgn: plan.installmentAmountNgn,
        outstandingBalanceNgn: plan.outstandingBalanceNgn,
        frequency: plan.frequency,
      });

      await logReminderByAdmin({
        userId: plan.userId,
        planId: plan.id,
        channel,
        frequency: plan.frequency,
        recipient,
        status: 'sent',
        message: res.message,
      });

      onShowToast(`${channel.toUpperCase()} reminder dispatched to ${recipient}.`, 'success');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Reminder failed.', 'error');
    } finally {
      setSendingReminderId(null);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'products', label: `Products (${products.length})` },
    { id: 'plans', label: `Installments (${plans.length})` },
    { id: 'orders', label: `Orders (${orders.length})` },
    { id: 'payments', label: `Payments (${payments.length})` },
    { id: 'subscriptions', label: `Subscriptions (${subscriptions.length})` },
    { id: 'customers', label: `Customers (${customers.length})` },
    { id: 'reminders', label: `Reminder Logs (${reminderLogs.length})` },
  ];

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
              FEGGY Admin Console
            </p>
            <h1 className="font-display text-2xl font-bold text-[#0B2545] mt-1">
              Store, Pay Small Small &amp; Logistics Control
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSeedCatalog}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-green-700 text-green-800 text-xs font-semibold hover:bg-green-50 disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{seeding ? 'Publishing...' : 'Sync Default Catalog to Firestore'}</span>
            </button>
            <button
              type="button"
              onClick={openNewProductForm}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product / Bundle</span>
            </button>
          </div>
        </div>

        {/* Admin Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate({ view: 'admin', tab: tab.id })}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#0B2545] text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview KPIs */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Verified Revenue</span>
                  <Wallet className="w-4 h-4 text-green-700" />
                </div>
                <p className="font-display text-2xl font-bold text-green-800 tabular-nums mt-2">
                  {formatNgn(totalRevenue)}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Active Pay Small Small</span>
                  <RefreshCw className="w-4 h-4 text-orange-600" />
                </div>
                <p className="font-display text-2xl font-bold text-[#0B2545] tabular-nums mt-2">
                  {activePlansCount} plans
                </p>
                <p className="text-xs text-slate-500 mt-1 tabular-nums">
                  {formatNgn(pendingReceivables)} receivable
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Total Orders</span>
                  <Package className="w-4 h-4 text-green-700" />
                </div>
                <p className="font-display text-2xl font-bold text-[#0B2545] tabular-nums mt-2">
                  {orders.length}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Active Subscriptions</span>
                  <Users className="w-4 h-4 text-orange-600" />
                </div>
                <p className="font-display text-2xl font-bold text-[#0B2545] tabular-nums mt-2">
                  {activeSubsCount}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
              <h2 className="font-display text-base font-bold text-[#0B2545]">
                Connected Service Integrations
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200">
                  <p className="font-semibold text-slate-900">Paystack Gateway</p>
                  <p className={gatewayConfig.paystackConfigured ? 'text-green-700 mt-1' : 'text-amber-700 mt-1'}>
                    {gatewayConfig.paystackConfigured ? 'Configured & Active' : 'Needs PAYSTACK_SECRET_KEY'}
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200">
                  <p className="font-semibold text-slate-900">Cloudinary Uploads</p>
                  <p className={gatewayConfig.cloudinaryConfigured ? 'text-green-700 mt-1' : 'text-amber-700 mt-1'}>
                    {gatewayConfig.cloudinaryConfigured ? 'Configured & Ready' : 'Needs CLOUDINARY_* secrets'}
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200">
                  <p className="font-semibold text-slate-900">Termii SMS Reminders</p>
                  <p className={gatewayConfig.termiiConfigured ? 'text-green-700 mt-1' : 'text-amber-700 mt-1'}>
                    {gatewayConfig.termiiConfigured ? 'Configured' : 'Needs TERMII_API_KEY'}
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200">
                  <p className="font-semibold text-slate-900">Resend Email Reminders</p>
                  <p className={gatewayConfig.resendConfigured ? 'text-green-700 mt-1' : 'text-amber-700 mt-1'}>
                    {gatewayConfig.resendConfigured ? 'Configured' : 'Needs RESEND_API_KEY'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products & Bundles Management */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {editingProduct && (
              <form
                onSubmit={handleSaveProduct}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="font-display text-lg font-bold text-[#0B2545]">
                    {isNewProduct ? 'Add New Foodstuff / Bundle' : `Edit: ${editingProduct.name}`}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Product Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, name: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      value={editingProduct.category}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          category: e.target.value as ProductCategory,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      {(Object.keys(CATEGORY_LABELS) as Array<ProductCategory | 'all'>)
                        .filter((k) => k !== 'all')
                        .map((cat) => (
                          <option key={cat} value={cat}>
                            {CATEGORY_LABELS[cat]}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={editingProduct.description}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, description: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                {/* Cloudinary Upload + Image URL */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Genuine Food Product Image URL (or Upload via Cloudinary)
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://..."
                      value={editingProduct.imageUrl}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, imageUrl: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100">
                      <Upload className="w-3.5 h-3.5 text-orange-600" />
                      <span>
                        {uploadingImage ? 'Uploading to Cloudinary...' : 'Upload Photo to Cloudinary'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleCloudinaryUpload(file);
                        }}
                      />
                    </label>
                  </div>
                  <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-white p-2">
                    <FoodImage
                      src={editingProduct.imageUrl}
                      alt={editingProduct.name || 'Preview'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Variants Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      Quantity / Bag Variants (5kg, 25kg, 50kg, etc.)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProduct({
                          ...editingProduct,
                          variants: [
                            ...editingProduct.variants,
                            { label: '25kg Bag', weightKg: 25, priceNgn: 45000, stock: 20 },
                          ],
                        })
                      }
                      className="text-xs font-semibold text-green-800 hover:underline"
                    >
                      + Add Variant
                    </button>
                  </div>
                  {editingProduct.variants.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Label (e.g. 50kg Bag)"
                        value={v.label}
                        onChange={(e) => {
                          const next = [...editingProduct.variants];
                          next[idx] = { ...v, label: e.target.value };
                          setEditingProduct({ ...editingProduct, variants: next });
                        }}
                        className="col-span-4 px-3 py-2 rounded-lg border border-slate-200 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Kg"
                        value={v.weightKg}
                        onChange={(e) => {
                          const next = [...editingProduct.variants];
                          next[idx] = { ...v, weightKg: Number(e.target.value) };
                          setEditingProduct({ ...editingProduct, variants: next });
                        }}
                        className="col-span-2 px-3 py-2 rounded-lg border border-slate-200 text-xs tabular-nums"
                      />
                      <input
                        type="number"
                        placeholder="Price ₦"
                        value={v.priceNgn}
                        onChange={(e) => {
                          const next = [...editingProduct.variants];
                          next[idx] = { ...v, priceNgn: Number(e.target.value) };
                          setEditingProduct({ ...editingProduct, variants: next });
                        }}
                        className="col-span-3 px-3 py-2 rounded-lg border border-slate-200 text-xs tabular-nums"
                      />
                      <input
                        type="number"
                        placeholder="Stock"
                        value={v.stock}
                        onChange={(e) => {
                          const next = [...editingProduct.variants];
                          next[idx] = { ...v, stock: Number(e.target.value) };
                          setEditingProduct({ ...editingProduct, variants: next });
                        }}
                        className="col-span-2 px-3 py-2 rounded-lg border border-slate-200 text-xs tabular-nums"
                      />
                      <button
                        type="button"
                        disabled={editingProduct.variants.length <= 1}
                        onClick={() => {
                          const next = editingProduct.variants.filter((_, i) => i !== idx);
                          setEditingProduct({ ...editingProduct, variants: next });
                        }}
                        className="col-span-1 p-1.5 text-red-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-6 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.isBundle}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, isBundle: e.target.checked })
                      }
                      className="w-4 h-4 accent-green-700"
                    />
                    <span>Ready-Made Food Bundle</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.featured}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, featured: e.target.checked })
                      }
                      className="w-4 h-4 accent-green-700"
                    />
                    <span>Feature on Homepage</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.active}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, active: e.target.checked })
                      }
                      className="w-4 h-4 accent-green-700"
                    />
                    <span>Active in Storefront</span>
                  </label>
                </div>

                {editingProduct.isBundle && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Bundle Contents (one item per line)
                    </label>
                    <textarea
                      rows={4}
                      value={bundleItemsText}
                      onChange={(e) => setBundleItemsText(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-6 py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
                >
                  {savingProduct ? 'Saving...' : 'Save Product'}
                </button>
              </form>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Product</th>
                      <th className="py-3 px-4 font-semibold">Category</th>
                      <th className="py-3 px-4 font-semibold">Variants &amp; Stock</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                        <td className="py-3 px-4 text-slate-600">{CATEGORY_LABELS[p.category]}</td>
                        <td className="py-3 px-4 text-slate-600 tabular-nums">
                          {p.variants.map((v: ProductVariant) => `${v.label}: ${formatNgn(v.priceNgn)} (${v.stock})`).join(' · ')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={p.active ? 'text-green-700 font-semibold' : 'text-slate-400'}>
                            {p.active ? 'Active' : 'Hidden'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-3">
                          <button
                            type="button"
                            onClick={() => openEditProductForm(p)}
                            className="text-green-800 font-semibold hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteProductFromFirestore(p.id);
                              onShowToast('Product deleted.', 'info');
                            }}
                            className="text-red-700 font-semibold hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Installment Plans Tab */}
        {activeTab === 'plans' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Customer</th>
                    <th className="py-3 px-4 font-semibold">Item &amp; Plan</th>
                    <th className="py-3 px-4 font-semibold">Paid / Target</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Reminders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{plan.customerName}</p>
                        <p className="text-slate-500">{plan.reminderPhone}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">
                          {plan.productName} ({plan.variantLabel})
                        </p>
                        <p className="text-slate-500 capitalize">
                          {plan.frequency} · {formatNgn(plan.installmentAmountNgn)}
                        </p>
                      </td>
                      <td className="py-3 px-4 tabular-nums">
                        <span className="font-bold text-green-800">
                          {formatNgn(plan.amountPaidNgn)}
                        </span>{' '}
                        / {formatNgn(plan.totalTargetNgn)}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={plan.status}
                          onChange={(e) =>
                            updateInstallmentStatusByAdmin(
                              plan.id,
                              e.target.value as InstallmentStatus
                            )
                          }
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                        >
                          <option value="active">active</option>
                          <option value="completed">completed</option>
                          <option value="ready_for_delivery">ready_for_delivery</option>
                          <option value="delivered">delivered</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          disabled={sendingReminderId === `${plan.id}-sms`}
                          onClick={() => handleSendReminder(plan, 'sms')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-orange-500 text-slate-700"
                        >
                          <Bell className="w-3 h-3" />
                          <span>SMS</span>
                        </button>
                        <button
                          type="button"
                          disabled={sendingReminderId === `${plan.id}-email`}
                          onClick={() => handleSendReminder(plan, 'email')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-green-700 text-slate-700"
                        >
                          <Bell className="w-3 h-3" />
                          <span>Email</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders & Deliveries Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Order</th>
                    <th className="py-3 px-4 font-semibold">Customer &amp; Address</th>
                    <th className="py-3 px-4 font-semibold">Total</th>
                    <th className="py-3 px-4 font-semibold">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-3 px-4">
                        <p className="font-mono-nums font-semibold text-slate-900">{order.id}</p>
                        <p className="text-slate-500 capitalize">
                          {order.purchaseMode.replace(/_/g, ' ')}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">
                          {order.customerName} · {order.customerPhone}
                        </p>
                        <p className="text-slate-500">{order.deliveryAddress}</p>
                      </td>
                      <td className="py-3 px-4 font-bold text-green-800 tabular-nums">
                        {formatNgn(order.totalAmountNgn)}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={order.deliveryStatus}
                          onChange={async (e) => {
                            const next = e.target.value as DeliveryStatus;
                            await updateOrderDeliveryStatus(order.id, next);
                            onShowToast(`Order ${order.id} updated to ${next}.`, 'success');
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                        >
                          <option value="processing">processing</option>
                          <option value="packed">packed</option>
                          <option value="out_for_delivery">out_for_delivery</option>
                          <option value="delivered">delivered</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Receipt</th>
                    <th className="py-3 px-4 font-semibold">Customer</th>
                    <th className="py-3 px-4 font-semibold">Paystack Ref</th>
                    <th className="py-3 px-4 font-semibold">Purpose</th>
                    <th className="py-3 px-4 font-semibold">Amount</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((pay) => (
                    <tr key={pay.id}>
                      <td className="py-3 px-4 font-mono-nums font-semibold">{pay.receiptNumber}</td>
                      <td className="py-3 px-4">{pay.customerEmail}</td>
                      <td className="py-3 px-4 font-mono-nums text-slate-500">
                        {pay.paystackReference}
                      </td>
                      <td className="py-3 px-4 capitalize">{pay.purpose.replace(/_/g, ' ')}</td>
                      <td className="py-3 px-4 font-bold text-green-800 tabular-nums">
                        {formatNgn(pay.amountNgn)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatReadableDate(pay.paidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Customer</th>
                    <th className="py-3 px-4 font-semibold">Bundle</th>
                    <th className="py-3 px-4 font-semibold">Monthly Price</th>
                    <th className="py-3 px-4 font-semibold">Next Billing</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id}>
                      <td className="py-3 px-4">
                        <p className="font-semibold">{sub.customerName}</p>
                        <p className="text-slate-500">{sub.customerEmail}</p>
                      </td>
                      <td className="py-3 px-4">{sub.bundleTitle}</td>
                      <td className="py-3 px-4 font-bold tabular-nums">{formatNgn(sub.priceNgn)}</td>
                      <td className="py-3 px-4">{formatReadableDate(sub.nextBillingDate)}</td>
                      <td className="py-3 px-4 uppercase font-semibold">{sub.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Phone</th>
                    <th className="py-3 px-4 font-semibold">Address</th>
                    <th className="py-3 px-4 font-semibold">Reminders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.uid}>
                      <td className="py-3 px-4 font-semibold">{c.displayName}</td>
                      <td className="py-3 px-4">{c.email}</td>
                      <td className="py-3 px-4">{c.phone || '—'}</td>
                      <td className="py-3 px-4">{c.deliveryAddress || '—'}</td>
                      <td className="py-3 px-4">
                        {c.smsRemindersEnabled ? 'SMS ' : ''}
                        {c.emailRemindersEnabled ? 'Email' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reminder Logs Tab */}
        {activeTab === 'reminders' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Channel</th>
                    <th className="py-3 px-4 font-semibold">Recipient</th>
                    <th className="py-3 px-4 font-semibold">Frequency</th>
                    <th className="py-3 px-4 font-semibold">Message</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reminderLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-3 px-4 uppercase font-bold">{log.channel}</td>
                      <td className="py-3 px-4">{log.recipient}</td>
                      <td className="py-3 px-4 capitalize">{log.frequency}</td>
                      <td className="py-3 px-4 max-w-md truncate">{log.message}</td>
                      <td className="py-3 px-4 uppercase font-semibold text-green-800">
                        {log.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
