/**
 * OrdersPage – Clean, responsive order management with KPI dashboard,
 * filtering, detail/edit dialogs (responsive: Dialog on desktop, Drawer on mobile),
 * WooCommerce sync, and soft-delete support.
 *
 * Architecture:
 *   - Data fetched via service layer (no React Query — matches existing pattern)
 *   - Deferred search for instant-feel filtering
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
  const channelBrandMap = useMemo(() => {
    const m = new Map<number, number>();
    channels.forEach(c => m.set(c.id, c.brand));
    return m;
  }, [channels]);

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
        orderService.getAll({ page_size: 200, include_deleted: includeDeleted }),
        orderService.getSummary(),
      ]);
      setOrders(ordersRes.results ?? ordersRes);
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
  }, [includeDeleted]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ══════════════════════════════════════════════════════════════════════════ */
  /* FILTERING                                                                */
  /* ══════════════════════════════════════════════════════════════════════════ */

  const filtered = useMemo(() => {
    let items = orders;
    if (statusFilter !== 'all') items = items.filter(o => o.status === statusFilter);
    if (sourceFilter !== 'all') items = items.filter(o => o.source === sourceFilter);
    if (brandFilter !== 'all') {
      const bid = Number(brandFilter);
      items = items.filter(o => channelBrandMap.get(o.sales_channel) === bid);
    }
    if (deferredSearch) {
      const q = deferredSearch.toLowerCase();
      items = items.filter(o =>
        o.order_number.toLowerCase().includes(q) ||
        (o.client_email ?? '').toLowerCase().includes(q) ||
        (o.client_name ?? '').toLowerCase().includes(q) ||
        (o.external_order_id ?? '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [orders, statusFilter, sourceFilter, brandFilter, deferredSearch, channelBrandMap]);

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
    if (!editMode || !viewOrder) { setEditProducts([]); return; }
    const brandId = viewOrder.brand ?? channels.find(c => c.id === viewOrder.sales_channel)?.brand;
    if (!brandId) { setEditProducts([]); return; }

    setLoadingEditProducts(true);
    productService.getAllProducts({ brand: brandId, page_size: 500 })
      .then(setEditProducts)
      .catch(() => setEditProducts([]))
      .finally(() => setLoadingEditProducts(false));
  }, [editMode, viewOrder, channels]);

  /* ── edit form helpers ─── */
  const updateEditLine = (index: number, key: 'quantity' | 'unit_price', value: string) => {
    setEditForm(prev => {
      if (!prev) return prev;
      const lines = [...prev.lines];
      const cur = lines[index];
      if (!cur) return prev;
      if (key === 'quantity') {
        const qty = Number(value);
        lines[index] = { ...cur, quantity: Number.isFinite(qty) && qty > 0 ? qty : 1 };
      } else {
        lines[index] = { ...cur, unit_price: value };
      }
      return { ...prev, lines };
    });
  };

  const updateEditLineField = (index: number, key: 'product_name' | 'barcode', value: string) => {
    setEditForm(prev => {
      if (!prev) return prev;
      const lines = [...prev.lines];
      const cur = lines[index];
      if (!cur) return prev;
      lines[index] = { ...cur, [key]: value };
      return { ...prev, lines };
    });
  };

  const updateEditLineProduct = (index: number, selectedValue: string) => {
    setEditForm(prev => {
      if (!prev) return prev;
      const lines = [...prev.lines];
      const cur = lines[index];
      if (!cur) return prev;

      if (selectedValue === '__manual__') {
        lines[index] = { ...cur, product: null, product_name: cur.product_name ?? '' };
        return { ...prev, lines };
      }

      const pid = Number(selectedValue);
      const p = editProducts.find(x => x.id === pid);
      if (!p) return prev;

      lines[index] = {
        ...cur, product: p.id, product_name: p.name,
        barcode: p.barcode || '', unit_price: p.sales_price || cur.unit_price || '0.00',
      };
      return { ...prev, lines };
    });
  };

  const handleAddLine = () => {
    setEditForm(prev => prev ? {
      ...prev,
      lines: [...prev.lines, { product: null, product_name: '', barcode: '', quantity: 1, unit_price: '0.00' }],
    } : prev);
  };

  const handleRemoveLine = (index: number) => {
    setEditForm(prev => {
      if (!prev || prev.lines.length <= 1) return prev;
      return { ...prev, lines: prev.lines.filter((_, i) => i !== index) };
    });
  };

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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard title="Total" value={summary.total_orders} icon={<ShoppingCart className="size-3" />} />
          <KpiCard title="Pending" value={summary.pending} tone="text-amber-600" icon={<Clock className="size-3" />} />
          <KpiCard title="Processing" value={summary.processing} tone="text-blue-600" icon={<Package className="size-3" />} />
          <KpiCard title="Completed" value={summary.completed} tone="text-emerald-600" icon={<CheckCircle className="size-3" />} />
          <KpiCard title="Revenue" value={`TND ${summary.revenue}`} tone="text-emerald-600" icon={<TrendingUp className="size-3" />} />
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
              {loading ? 'Loading...' : `${filtered.length} order${filtered.length !== 1 ? 's' : ''}`}
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
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.map(o => (
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
        onEditModeChange={setEditMode}
        onUpdateLine={updateEditLine}
        onUpdateLineField={updateEditLineField}
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
