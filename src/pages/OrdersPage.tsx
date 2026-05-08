/**
 * OrdersPage – Clean, responsive order management with KPI dashboard,
 * filtering, detail/edit dialogs (responsive: Dialog on desktop, Drawer on mobile),
 * WooCommerce sync, and soft-delete support.
 *
 * Architecture:
 *   - Data fetched via service layer (no React Query — matches existing pattern)
 *   - Server-side search/filter/pagination for scalable lists
 *   - Memoised helpers to avoid re-renders
 *   - Mobile-responsive table with progressive column hiding
 *   - Always-visible action buttons (no opacity tricks)
 */
import { useEffect, useMemo, useState, useCallback, useDeferredValue, type ReactNode } from 'react';
import {
  ShoppingCart, Search, RefreshCw, Eye, MoreVertical,
  CheckCircle, Clock, Package, Pencil, History, Trash2,
  Undo2, Loader2, TrendingUp,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { orderService } from '@/services/order.service';
import { productService } from '@/services/product.service';
import { salesChannelService } from '@/services/salesChannel.service';
import { useAuthStore } from '@/store/authStore';
import { hasAnyRole } from '@/hooks/useAuth';
import type {
  OrderListItem, OrderDetail, OrderEditLineInput, OrderEditRequest,
  OrderDiscountType, OrderSummary, OrderStatus, SalesChannel, ProductListItem,
  OrderLogEntry,
} from '@/types';
import type { WooCommerceOrderPreviewResponse } from '@/services/order.service';

import {
  OrderDetailDialog, SyncDialog, PreviewDialog, LogsDialog, MessageAlert,
} from './components/OrderDialogs';

/* ═══════════════════════════════════════════════════════════════════════════ */
/* HELPERS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

const STATUS_STYLES: Record<string, string> = {
  PENDING:    'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  ON_HOLD:    'bg-orange-100 text-orange-800',
  COMPLETED:  'bg-emerald-100 text-emerald-800',
  CANCELLED:  'bg-red-100 text-red-800',
  REFUNDED:   'bg-purple-100 text-purple-800',
  FAILED:     'bg-gray-100 text-gray-800',
};

const SOURCE_STYLES: Record<string, string> = {
  WOOCOMMERCE: 'bg-indigo-100 text-indigo-800',
  POS:         'bg-teal-100 text-teal-800',
  MANUAL:      'bg-slate-100 text-slate-700',
};

const PAYMENT_STYLES: Record<string, string> = {
  PAID:     'bg-emerald-100 text-emerald-800',
  UNPAID:   'bg-red-100 text-red-800',
  PARTIAL:  'bg-amber-100 text-amber-800',
  REFUNDED: 'bg-purple-100 text-purple-800',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`text-xs border-transparent ${STATUS_STYLES[status] ?? ''}`}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

function SourceBadge({ source }: { source: string }) {
  return (
    <Badge variant="outline" className={`text-xs border-transparent ${SOURCE_STYLES[source] ?? ''}`}>
      {source}
    </Badge>
  );
}

function PaymentBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`text-xs border-transparent ${PAYMENT_STYLES[status] ?? ''}`}>
      {status}
    </Badge>
  );
}

const fmtCurrency = (currency: string, value: string) => `${currency} ${value}`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/* ═══════════════════════════════════════════════════════════════════════════ */
/* KPI CARD                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

function KpiCard({ title, value, tone, icon }: Readonly<{
  title: string; value: string | number; tone?: string; icon?: ReactNode;
}>) {
  return (
    <Card>
      <CardHeader className="p-4 pb-1">
        <CardTitle className={`text-xs flex items-center gap-1 text-muted-foreground ${tone ?? ''}`}>
          {icon}{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className={`text-2xl font-bold tracking-tight tabular-nums ${tone ?? ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* MAIN PAGE                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function OrdersPage() {
  /* ── core state ─── */
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const pageSize = 20;

  /* ── detail / edit state ─── */
  const [viewOrder, setViewOrder] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<OrderEditRequest | null>(null);
  const [editProducts, setEditProducts] = useState<ProductListItem[]>([]);
  const [loadingEditProducts, setLoadingEditProducts] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [mutatingOrder, setMutatingOrder] = useState(false);
  const [logsDialog, setLogsDialog] = useState(false);
  const [orderLogs, setOrderLogs] = useState<OrderLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  /* ── sync state ─── */
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [syncDialog, setSyncDialog] = useState(false);
  const [selectedSyncChannel, setSelectedSyncChannel] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewData, setPreviewData] = useState<WooCommerceOrderPreviewResponse | null>(null);
  const [selectedWcOrders, setSelectedWcOrders] = useState<number[]>([]);
  const [syncingSelected, setSyncingSelected] = useState(false);

  /* ── alert state ─── */
  const [successDialog, setSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorDialog, setErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const user = useAuthStore(s => s.user);
  const isAdmin = hasAnyRole(user, ['SUPERADMIN', 'CEO', 'MANAGER']);
  const deferredSearch = useDeferredValue(search);

  /* ── brand/channel maps ─── */
  const availableBrands = useMemo(() => {
    const m = new Map<number, string>();
    channels.forEach(c => { if (!m.has(c.brand)) m.set(c.brand, c.brand_name); });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [channels]);

  /* ══════════════════════════════════════════════════════════════════════════ */
  /* DATA FETCHING                                                            */
  /* ══════════════════════════════════════════════════════════════════════════ */

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, summaryRes] = await Promise.all([
        orderService.getAll({
          page: currentPage,
          page_size: pageSize,
          include_deleted: includeDeleted,
          ...(statusFilter !== 'all' ? { status: statusFilter as OrderStatus } : {}),
          ...(sourceFilter !== 'all' ? { source: sourceFilter } : {}),
          ...(brandFilter !== 'all' ? { brand: Number(brandFilter) } : {}),
          ...(deferredSearch ? { search: deferredSearch } : {}),
        }),
        orderService.getSummary(),
      ]);
      const paginated = !Array.isArray(ordersRes) && Array.isArray(ordersRes.results);
      setOrders(paginated ? ordersRes.results : ordersRes);
      setTotalOrders(paginated ? ordersRes.count : ordersRes.length);
      setSummary(summaryRes);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    }
    try {
      const ch = await salesChannelService.getAllChannels();
      setChannels(ch);
    } catch (err) {
      console.error('Failed to fetch channels', err);
    } finally {
      setLoading(false);
    }
  }, [brandFilter, currentPage, deferredSearch, includeDeleted, sourceFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [brandFilter, deferredSearch, includeDeleted, sourceFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));

  /* ══════════════════════════════════════════════════════════════════════════ */
  /* DETAIL / EDIT ACTIONS                                                    */
  /* ══════════════════════════════════════════════════════════════════════════ */

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const detail = await orderService.getById(id);
      setViewOrder(detail);
      setEditMode(false);
      setEditForm({
        lines: detail.lines.map((l): OrderEditLineInput => ({
          id: l.id, product: l.product, product_name: l.product_name,
          barcode: l.barcode, quantity: l.quantity, unit_price: l.unit_price,
        })),
        discount_type: detail.discount_type,
        discount_value: detail.discount_value,
        customer_note: detail.customer_note,
        internal_note: detail.internal_note,
        // Billing fields
        billing_first_name: detail.billing_first_name,
        billing_last_name: detail.billing_last_name,
        billing_company: detail.billing_company,
        billing_email: detail.billing_email,
        billing_phone: detail.billing_phone,
        billing_address_1: detail.billing_address_1,
        billing_address_2: detail.billing_address_2,
        billing_city: detail.billing_city,
        billing_state: detail.billing_state,
        billing_postcode: detail.billing_postcode,
        billing_country: detail.billing_country,
      });
    } catch (err) {
      console.error('Failed to load order detail', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: OrderStatus) => {
    try {
      await orderService.updateStatus(id, status);
      setViewOrder(null);
      fetchData();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  // Load products when entering edit mode
  useEffect(() => {
    if (!editMode || !viewOrder) { 
      setEditProducts([]); 
      return; 
    }
    
    // Determine brand ID from current view
    const brandId = viewOrder.brand ?? channels.find(c => c.id === viewOrder.sales_channel)?.brand;
    if (!brandId) { 
      console.warn('No brand found for order', viewOrder.id);
      setEditProducts([]); 
      return; 
    }

    setLoadingEditProducts(true);
    productService.getAllProducts({ brand: brandId, page_size: 500 })
      .then(products => {
        if (!products || products.length === 0) {
          console.warn(`No products found for brand ${brandId}`);
        }
        setEditProducts(products || []);
      })
      .catch(err => {
        console.error('Failed to load edit products:', err);
        setEditProducts([]);
      })
      .finally(() => setLoadingEditProducts(false));
  }, [editMode, viewOrder, channels]);

  /* ── edit form helpers ─── */
  const updateEditLine = useCallback((index: number, key: 'quantity' | 'unit_price', value: string) => {
    setEditForm(prev => {
      if (!prev) return prev;
      const lines = [...prev.lines];
      const cur = lines[index];
      if (!cur) return prev;
      if (key === 'quantity') {
        const qty = Number(value);
        lines[index] = { ...cur, quantity: Number.isFinite(qty) && qty > 0 ? qty : 1 };
      } else {
        lines[index] = { ...cur, unit_price: String(value || '0.00') };
      }
      return { ...prev, lines };
    });
  }, []);

  const updateEditLineProduct = useCallback((index: number, selectedValue: string) => {
    setEditForm(prev => {
      if (!prev) return prev;
      const lines = [...prev.lines];
      const cur = lines[index];
      if (!cur) return prev;

      // Manual entry mode
      if (selectedValue === '__manual__') {
        lines[index] = { 
          ...cur, 
          product: null, 
          product_name: cur.product_name ?? '',
          quantity: cur.quantity || 1,
          unit_price: cur.unit_price || '0.00',
          barcode: cur.barcode || '',
        };
        return { ...prev, lines };
      }

      // Lookup product from loaded products
      const pid = Number(selectedValue);
      const selectedProduct = editProducts.find(x => x.id === pid);
      
      if (!selectedProduct) {
        console.warn(`Product ${pid} not found in editProducts. Available: ${editProducts.map(p => p.id).join(',')}`);
        return prev;
      }

      // Sync all product data including price
      lines[index] = {
        ...cur, 
        product: selectedProduct.id, 
        product_name: selectedProduct.name,
        barcode: selectedProduct.barcode || cur.barcode || '',
        quantity: cur.quantity || 1,
        unit_price: String(selectedProduct.sales_price || cur.unit_price || '0.00'),
      };
      return { ...prev, lines };
    });
  }, [editProducts]);

  const handleAddLine = useCallback(() => {
    setEditForm(prev => prev ? {
      ...prev,
      lines: [...prev.lines, { product: null, product_name: '', barcode: '', quantity: 1, unit_price: '0.00' }],
    } : prev);
  }, []);

  const handleRemoveLine = useCallback((index: number) => {
    setEditForm(prev => {
      if (!prev || prev.lines.length <= 1) return prev;
      return { ...prev, lines: prev.lines.filter((_, i) => i !== index) };
    });
  }, []);

  const handleSaveEdit = async () => {
    if (!viewOrder || !editForm) return;
    if (editForm.lines.some(l => !l.product && !(l.product_name ?? '').trim())) {
      setErrorMessage('Each line must have either a product or a name.'); setErrorDialog(true);
      return;
    }

    setSavingEdit(true);
    try {
      const payload: OrderEditRequest = {
        ...editForm,
        discount_type: (editForm.discount_type ?? 'NONE') as OrderDiscountType,
        discount_value: editForm.discount_value ?? '0.00',
        lines: editForm.lines.map(l => ({
          id: l.id, product: l.product, product_name: l.product_name, barcode: l.barcode,
          quantity: Number(l.quantity) > 0 ? Number(l.quantity) : 1,
          unit_price: String(l.unit_price ?? '0'),
        })),
      };
      const updated = await orderService.editOrder(viewOrder.id, payload);
      setViewOrder(updated);
      setEditMode(false);
      await fetchData();
      setSuccessMessage('Order updated successfully.'); setSuccessDialog(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update order.'); setErrorDialog(true);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!viewOrder) return;
    setMutatingOrder(true);
    try {
      await orderService.softDelete(viewOrder.id, 'Deleted from Orders page');
      setViewOrder(null); setEditMode(false);
      await fetchData();
      setSuccessMessage('Order soft-deleted.'); setSuccessDialog(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete.'); setErrorDialog(true);
    } finally { setMutatingOrder(false); }
  };

  const handleRestoreOrder = async () => {
    if (!viewOrder) return;
    setMutatingOrder(true);
    try {
      const restored = await orderService.restore(viewOrder.id);
      setViewOrder(restored);
      await fetchData();
      setSuccessMessage('Order restored.'); setSuccessDialog(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to restore.'); setErrorDialog(true);
    } finally { setMutatingOrder(false); }
  };

  const handleOpenLogs = async () => {
    if (!viewOrder) return;
    setLoadingLogs(true); setLogsDialog(true);
    try {
      setOrderLogs(await orderService.getLogs(viewOrder.id));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load logs.'); setErrorDialog(true);
      setLogsDialog(false);
    } finally { setLoadingLogs(false); }
  };

  /* ══════════════════════════════════════════════════════════════════════════ */
  /* ORDER OUTCOME HANDLERS                                                   */
  /* ══════════════════════════════════════════════════════════════════════════ */

  const handleConfirmOrder = async (id: number) => {
    setMutatingOrder(true);
    try {
      const updated = await orderService.confirmOrder(id);
      setViewOrder(updated);
      await fetchData();
      setSuccessMessage('Order confirmed successfully.');
      setSuccessDialog(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to confirm order.');
      setErrorDialog(true);
    } finally { setMutatingOrder(false); }
  };

  const handleDelayOrder = async (id: number, data: { delay_date: string; delay_reason: string; note?: string }) => {
    setMutatingOrder(true);
    try {
      const updated = await orderService.delayOrder(id, data);
      setViewOrder(updated);
      await fetchData();
      setSuccessMessage('Order marked as delayed.');
      setSuccessDialog(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delay order.');
      setErrorDialog(true);
    } finally { setMutatingOrder(false); }
  };

  const handleCancelOrder = async (id: number, data: { cancellation_reason: string; note?: string }) => {
    setMutatingOrder(true);
    try {
      const updated = await orderService.cancelOrder(id, data);
      setViewOrder(updated);
      await fetchData();
      setSuccessMessage('Order cancelled.');
      setSuccessDialog(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to cancel order.');
      setErrorDialog(true);
    } finally { setMutatingOrder(false); }
  };

  /* ══════════════════════════════════════════════════════════════════════════ */
  /* SYNC HANDLERS                                                            */
  /* ══════════════════════════════════════════════════════════════════════════ */

  const handleConfirmSync = async () => {
    if (!selectedSyncChannel) return;
    setSyncing(true);
    try {
      const res = await orderService.syncFromWooCommerce(Number(selectedSyncChannel));
      setSyncDialog(false); setSelectedSyncChannel('');
      setSuccessMessage(`Synced! ${res.created} created, ${res.updated} updated${res.errors ? `, ${res.errors} errors` : ''}.`);
      setSuccessDialog(true); fetchData();
    } catch (err) {
      setSyncDialog(false);
      setErrorMessage(err instanceof Error ? err.message : 'Sync failed.'); setErrorDialog(true);
    } finally { setSyncing(false); }
  };

  const handlePreviewOrders = async () => {
    if (!selectedSyncChannel) return;
    setPreviewing(true);
    try {
      const data = await orderService.previewFromWooCommerce(Number(selectedSyncChannel));
      setPreviewData(data); setSelectedWcOrders([]); setSyncDialog(false); setPreviewDialog(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Preview failed.'); setErrorDialog(true);
    } finally { setPreviewing(false); }
  };

  const toggleWcOrder = (wcId: number) =>
    setSelectedWcOrders(p => p.includes(wcId) ? p.filter(x => x !== wcId) : [...p, wcId]);

  const handleSyncSelected = async () => {
    if (!previewData || !selectedWcOrders.length) return;
    setSyncingSelected(true);
    try {
      const res = await orderService.syncSelectedFromWooCommerce(previewData.sales_channel, selectedWcOrders);
      setPreviewDialog(false);
      setSuccessMessage(`${res.created} created, ${res.updated} updated${res.errors ? `, ${res.errors} errors` : ''}.`);
      setSuccessDialog(true); fetchData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Sync failed.'); setErrorDialog(true);
    } finally { setSyncingSelected(false); }
  };

  const handleSyncAllFromPreview = async () => {
    if (!previewData) return;
    setSyncing(true);
    try {
      const res = await orderService.syncFromWooCommerce(previewData.sales_channel);
      setPreviewDialog(false);
      setSuccessMessage(`All synced: ${res.created} created, ${res.updated} updated.`);
      setSuccessDialog(true); fetchData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Sync failed.'); setErrorDialog(true);
    } finally { setSyncing(false); }
  };

  /* ══════════════════════════════════════════════════════════════════════════ */
  /* RENDER                                                                   */
  /* ══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-5 p-4 sm:p-6">

      {/* ── Header ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
            <ShoppingCart className="size-6" /> Orders
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage WooCommerce, POS, and manual orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSyncDialog(true)} className="gap-2">
            <RefreshCw className="size-4" /> Sync WC
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`size-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── KPIs ─── */}
      {summary && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard title="Total" value={summary.total_orders} icon={<ShoppingCart className="size-3" />} />
            <KpiCard title="Pending" value={summary.pending} tone="text-amber-600" icon={<Clock className="size-3" />} />
            <KpiCard title="Processing" value={summary.processing} tone="text-blue-600" icon={<Package className="size-3" />} />
            <KpiCard title="Completed" value={summary.completed} tone="text-emerald-600" icon={<CheckCircle className="size-3" />} />
            <KpiCard title="Revenue" value={`TND ${summary.revenue}`} tone="text-emerald-600" icon={<TrendingUp className="size-3" />} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <KpiCard title="Confirmed" value={summary.confirmed_count} tone="text-emerald-600" icon={<CheckCircle className="size-3" />} />
            <KpiCard title="Delayed" value={summary.delayed_count} tone="text-amber-600" icon={<Clock className="size-3" />} />
            <KpiCard title="Cancelled" value={summary.cancelled_outcome} tone="text-red-600" icon={<ShoppingCart className="size-3" />} />
          </div>
        </div>
      )}

      {/* ── Filters ─── */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search orders, clients, external id..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="WOOCOMMERCE">WooCommerce</SelectItem>
                <SelectItem value="POS">POS</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
              </SelectContent>
            </Select>
            {isAdmin ? (
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {availableBrands.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : <div />}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {loading ? 'Loading...' : `${totalOrders} order${totalOrders !== 1 ? 's' : ''}`}
            </span>
            {isAdmin && (
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={includeDeleted}
                  onCheckedChange={c => setIncludeDeleted(Boolean(c))}
                />
                Include deleted
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Orders table ─── */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="h-10 text-xs font-semibold">Order #</TableHead>
                <TableHead className="h-10 text-xs font-semibold">Client</TableHead>
                <TableHead className="h-10 text-xs font-semibold hidden md:table-cell">Channel</TableHead>
                <TableHead className="h-10 text-xs font-semibold hidden sm:table-cell">Source</TableHead>
                <TableHead className="h-10 text-xs font-semibold">Status</TableHead>
                <TableHead className="h-10 text-xs font-semibold hidden lg:table-cell">Payment</TableHead>
                <TableHead className="h-10 text-xs font-semibold text-right">Total</TableHead>
                <TableHead className="h-10 text-xs font-semibold hidden md:table-cell">Date</TableHead>
                <TableHead className="h-10 text-xs font-semibold w-12 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Loading orders...</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!loading && orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
              {!loading && orders.map(o => (
                <TableRow
                  key={o.id}
                  className={`group hover:bg-muted/30 cursor-pointer transition-colors ${o.is_deleted ? 'opacity-50' : ''}`}
                  onClick={() => openDetail(o.id)}
                >
                  <TableCell className="font-mono text-xs font-semibold">{o.order_number}</TableCell>
                  <TableCell>
                    <p className="text-sm font-medium truncate max-w-[140px]">{o.client_name ?? o.client_email ?? '—'}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{o.sales_channel_name}</TableCell>
                  <TableCell className="hidden sm:table-cell"><SourceBadge source={o.source} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={o.status} />
                      {o.outcome && o.outcome !== 'NONE' && (
                        <Badge variant="outline" className={`text-[10px] border-transparent ${
                          o.outcome === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' :
                          o.outcome === 'DELAYED' ? 'bg-amber-100 text-amber-700' :
                          o.outcome === 'CANCELLED' ? 'bg-red-100 text-red-700' : ''
                        }`}>
                          {o.outcome === 'CONFIRMED' ? 'Confirmed' :
                           o.outcome === 'DELAYED' ? 'Delayed' :
                           o.outcome === 'CANCELLED' ? 'Cancelled' : o.outcome}
                        </Badge>
                      )}
                      {o.is_deleted && <Badge variant="destructive" className="text-xs">Deleted</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell"><PaymentBadge status={o.payment_status} /></TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{fmtCurrency(o.currency, o.total)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{fmtDate(o.created_at)}</TableCell>
                  <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openDetail(o.id)} className="gap-2">
                          <Eye className="size-4" /> View Details
                        </DropdownMenuItem>
                        {!o.is_deleted && (
                          <DropdownMenuItem onClick={() => { openDetail(o.id).then(() => setEditMode(true)); }} className="gap-2">
                            <Pencil className="size-4" /> Edit Order
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => { openDetail(o.id).then(() => { setLogsDialog(true); }); }} className="gap-2">
                          <History className="size-4" /> View Logs
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {o.is_deleted ? (
                          <DropdownMenuItem className="gap-2 text-emerald-700" onClick={async () => {
                            try { await orderService.restore(o.id); fetchData(); setSuccessMessage('Order restored.'); setSuccessDialog(true); }
                            catch { setErrorMessage('Failed to restore.'); setErrorDialog(true); }
                          }}>
                            <Undo2 className="size-4" /> Restore
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={async () => {
                            try { await orderService.softDelete(o.id, 'Quick delete'); fetchData(); setSuccessMessage('Order deleted.'); setSuccessDialog(true); }
                            catch { setErrorMessage('Failed to delete.'); setErrorDialog(true); }
                          }}>
                            <Trash2 className="size-4" /> Soft Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || currentPage <= 1}
            onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || currentPage >= totalPages}
            onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {/* ── Dialogs ─── */}
      <OrderDetailDialog
        open={detailLoading || !!viewOrder}
        onOpenChange={() => { setViewOrder(null); setDetailLoading(false); setEditMode(false); }}
        order={viewOrder}
        isDetailLoading={detailLoading}
        isEditMode={editMode}
        editForm={editForm}
        editProducts={editProducts}
        loadingEditProducts={loadingEditProducts}
        savingEdit={savingEdit}
        mutatingOrder={mutatingOrder}
        onStatusChange={handleStatusChange}
        onConfirmOrder={handleConfirmOrder}
        onDelayOrder={handleDelayOrder}
        onCancelOrder={handleCancelOrder}
        onEditModeChange={setEditMode}
        onUpdateLine={updateEditLine}
        onUpdateLineProduct={updateEditLineProduct}
        onAddLine={handleAddLine}
        onRemoveLine={handleRemoveLine}
        onSaveEdit={handleSaveEdit}
        onChangeDiscount={(field, val) => {
          setEditForm(prev => prev ? { ...prev, [field === 'type' ? 'discount_type' : 'discount_value']: val } : prev);
        }}
        onChangeNote={(field, val) => {
          setEditForm(prev => prev ? { ...prev, [field === 'customer' ? 'customer_note' : 'internal_note']: val } : prev);
        }}
        onOpenLogs={handleOpenLogs}
        onDelete={handleSoftDelete}
        onRestore={handleRestoreOrder}
      />

      <SyncDialog
        open={syncDialog} onOpenChange={setSyncDialog}
        channels={channels} selectedChannel={selectedSyncChannel}
        onChannelChange={setSelectedSyncChannel}
        onPreview={handlePreviewOrders} onSyncAll={handleConfirmSync}
        isPreviewing={previewing} isSyncing={syncing}
      />

      <PreviewDialog
        open={previewDialog} onOpenChange={setPreviewDialog}
        data={previewData} selectedIds={selectedWcOrders}
        onToggleOrder={toggleWcOrder}
        onSelectAll={() => setSelectedWcOrders(previewData?.orders.map(o => o.wc_id) ?? [])}
        onDeselectAll={() => setSelectedWcOrders([])}
        onSyncSelected={handleSyncSelected} onSyncAll={handleSyncAllFromPreview}
        isSyncingSelected={syncingSelected}
      />

      <LogsDialog
        open={logsDialog} onOpenChange={setLogsDialog}
        orderNumber={viewOrder?.order_number} logs={orderLogs} isLoading={loadingLogs}
      />

      <MessageAlert open={successDialog} onOpenChange={setSuccessDialog} type="success" message={successMessage} />
      <MessageAlert open={errorDialog} onOpenChange={setErrorDialog} type="error" message={errorMessage} />
    </div>
  );
}
