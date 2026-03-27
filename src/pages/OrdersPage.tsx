/**
 * OrdersPage – Lists all orders with filtering, detail view dialog,
 * status-update capability, and WooCommerce sync (like ProductsPage).
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  IconShoppingCart,
  IconSearch,
  IconRefresh,
  IconEye,
} from '@tabler/icons-react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Package,
  RefreshCw,
  Globe,
  Eye,
  Store,
  Loader2,
  Check,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { orderService } from '@/services/order.service';
import { salesChannelService } from '@/services/salesChannel.service';
import { useAuthStore } from '@/store/authStore';
import { hasAnyRole } from '@/hooks/useAuth';
import type {
  OrderListItem,
  OrderDetail,
  OrderSummary,
  OrderStatus,
  SalesChannel,
} from '@/types';
import type { WooCommerceOrderPreviewResponse } from '@/services/order.service';
import { getMediaUrl } from '@/utils/helpers';

/* ─── helpers extracted to keep component complexity low ─── */

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  ON_HOLD: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-purple-100 text-purple-800',
  FAILED: 'bg-gray-100 text-gray-800',
};

const SOURCE_COLORS: Record<string, string> = {
  WOOCOMMERCE: 'bg-indigo-100 text-indigo-800',
  POS: 'bg-teal-100 text-teal-800',
  MANUAL: 'bg-gray-100 text-gray-700',
};

function StatusBadge({ status }: Readonly<{ status: string }>) {
  return (
    <Badge
      variant="outline"
      className={`text-xs ${STATUS_COLORS[status] ?? ''}`}
    >
      {status.replace('_', ' ')}
    </Badge>
  );
}

function SourceBadge({ source }: Readonly<{ source: string }>) {
  return (
    <Badge
      variant="outline"
      className={`text-xs ${SOURCE_COLORS[source] ?? ''}`}
    >
      {source}
    </Badge>
  );
}

/* ─── detail content extracted as a separate component ─── */

interface DetailProps {
  order: OrderDetail;
  onStatusChange: (id: number, s: OrderStatus) => void;
}

function OrderDetailContent({ order, onStatusChange }: Readonly<DetailProps>) {
  return (
    <>
      {/* header summary */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mt-2">
        <div>
          <span className="text-muted-foreground block text-xs">Channel</span>
          <p className="font-medium">{order.sales_channel_name}</p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Client</span>
          <p>{order.client_name ?? order.client_email ?? '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Source</span>
          <SourceBadge source={order.source} />
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Status</span>
          <StatusBadge status={order.status} />
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Payment</span>
          <p>
            {order.payment_method || '—'} ({order.payment_status})
          </p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Total</span>
          <p className="font-semibold text-lg">
            {order.currency} {order.total}
          </p>
        </div>
      </div>

      {/* line items */}
      <h4 className="text-sm font-semibold mt-4 mb-2">Line Items</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.lines.map(l => (
            <TableRow key={l.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {l.product_image ? (
                    <img
                      src={getMediaUrl(l.product_image)}
                      alt={l.product_name}
                      className="h-8 w-8 rounded object-cover border"
                      loading="lazy"
                      onError={e => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span>{l.product_name}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">{l.quantity}</TableCell>
              <TableCell className="text-right">{l.unit_price}</TableCell>
              <TableCell className="text-right">{l.total}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* totals */}
      <div className="text-sm mt-3 space-y-1 text-right">
        <p>
          Subtotal: {order.currency} {order.subtotal}
        </p>
        <p>
          Tax: {order.currency} {order.tax_total}
        </p>
        <p>
          Shipping: {order.currency} {order.shipping_total}
        </p>
        <p>
          Discount: -{order.currency} {order.discount_total}
        </p>
        <p className="font-bold text-base">
          Total: {order.currency} {order.total}
        </p>
      </div>

      {order.customer_note ? (
        <p className="text-xs text-muted-foreground mt-3">
          <strong>Customer note:</strong> {order.customer_note}
        </p>
      ) : null}

      {/* quick-status buttons */}
      <DialogFooter className="mt-4 gap-2">
        {order.status !== 'COMPLETED' && (
          <Button
            size="sm"
            onClick={() => onStatusChange(order.id, 'COMPLETED')}
          >
            <CheckCircle className="h-4 w-4 mr-1" /> Complete
          </Button>
        )}
        {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onStatusChange(order.id, 'CANCELLED')}
          >
            <XCircle className="h-4 w-4 mr-1" /> Cancel
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function OrdersPage() {
  /* ── state ───────────────────────────────────────────────────────────── */
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [viewOrder, setViewOrder] = useState<OrderDetail | null>(null);

  /* ── sync state ──────────────────────────────────────────────────────── */
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [syncDialog, setSyncDialog] = useState(false);
  const [selectedSyncChannel, setSelectedSyncChannel] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewData, setPreviewData] =
    useState<WooCommerceOrderPreviewResponse | null>(null);
  const [selectedWcOrders, setSelectedWcOrders] = useState<number[]>([]);
  const [syncingSelected, setSyncingSelected] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorDialog, setErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const user = useAuthStore(state => state.user);
  const isAdmin = hasAnyRole(user, ['SUPERADMIN', 'CEO', 'MANAGER']);

  const wooCommerceChannels = useMemo(
    () => channels.filter(ch => ch.channel_type === 'WOOCOMMERCE'),
    [channels]
  );

  const channelBrandMap = useMemo(() => {
    const map = new Map<number, number>();
    channels.forEach(channel => {
      map.set(channel.id, channel.brand);
    });
    return map;
  }, [channels]);

  const availableBrands = useMemo(() => {
    const map = new Map<number, string>();
    channels.forEach(channel => {
      if (!map.has(channel.brand)) {
        map.set(channel.brand, channel.brand_name);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [channels]);

  /* ── data fetching ──────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, summaryRes] = await Promise.all([
        orderService.getAll({ page_size: 200 }),
        orderService.getSummary(),
      ]);
      setOrders(ordersRes.results ?? ordersRes);
      setSummary(summaryRes);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    }
    try {
      const channelsRes = await salesChannelService.getAllChannels();
      setChannels(channelsRes);
    } catch (err) {
      console.error('Failed to fetch channels', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── filters ─────────────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let items = orders;
    if (statusFilter !== 'all')
      items = items.filter(o => o.status === statusFilter);
    if (sourceFilter !== 'all')
      items = items.filter(o => o.source === sourceFilter);
    if (brandFilter !== 'all') {
      const selectedBrandId = Number(brandFilter);
      items = items.filter(
        o => channelBrandMap.get(o.sales_channel) === selectedBrandId
      );
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        o =>
          o.order_number.toLowerCase().includes(q) ||
          (o.client_email ?? '').toLowerCase().includes(q) ||
          (o.client_name ?? '').toLowerCase().includes(q) ||
          (o.external_order_id ?? '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [
    orders,
    statusFilter,
    sourceFilter,
    brandFilter,
    search,
    channelBrandMap,
  ]);

  /* ── actions ─────────────────────────────────────────────────────────── */
  const openDetail = async (id: number) => {
    try {
      const detail = await orderService.getById(id);
      setViewOrder(detail);
    } catch (err) {
      console.error('Failed to load order detail', err);
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

  /* ── sync handlers ───────────────────────────────────────────────────── */
  const handleConfirmSync = async () => {
    if (!selectedSyncChannel) return;
    setSyncing(true);
    try {
      const res = await orderService.syncFromWooCommerce(
        Number(selectedSyncChannel)
      );
      setSyncDialog(false);
      setSelectedSyncChannel('');
      const errPart = res.errors ? `, ${res.errors} errors` : '';
      setSuccessMessage(
        `Orders synced! ${res.created} created, ${res.updated} updated${errPart}.`
      );
      setSuccessDialog(true);
      fetchData();
    } catch (err) {
      setSyncDialog(false);
      setErrorMessage(err instanceof Error ? err.message : 'Sync failed.');
      setErrorDialog(true);
    } finally {
      setSyncing(false);
    }
  };

  const handlePreviewOrders = async () => {
    if (!selectedSyncChannel) return;
    setPreviewing(true);
    try {
      const data = await orderService.previewFromWooCommerce(
        Number(selectedSyncChannel)
      );
      setPreviewData(data);
      setSelectedWcOrders([]);
      setSyncDialog(false);
      setPreviewDialog(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Preview failed.');
      setErrorDialog(true);
    } finally {
      setPreviewing(false);
    }
  };

  const toggleWcOrderSelection = (wcId: number) => {
    setSelectedWcOrders(prev =>
      prev.includes(wcId) ? prev.filter(id => id !== wcId) : [...prev, wcId]
    );
  };

  const handleSyncSelected = async () => {
    if (!previewData || selectedWcOrders.length === 0) return;
    setSyncingSelected(true);
    try {
      const res = await orderService.syncSelectedFromWooCommerce(
        previewData.sales_channel,
        selectedWcOrders
      );
      setPreviewDialog(false);
      const errPart = res.errors ? `, ${res.errors} errors` : '';
      setSuccessMessage(
        `${res.created} created, ${res.updated} updated${errPart}.`
      );
      setSuccessDialog(true);
      fetchData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Sync failed.');
      setErrorDialog(true);
    } finally {
      setSyncingSelected(false);
    }
  };

  const handleSyncAllFromPreview = async () => {
    if (!previewData) return;
    setSyncing(true);
    try {
      const res = await orderService.syncFromWooCommerce(
        previewData.sales_channel
      );
      setPreviewDialog(false);
      const errPart = res.errors ? `, ${res.errors} errors` : '';
      setSuccessMessage(
        `All orders synced: ${res.created} created, ${res.updated} updated${errPart}.`
      );
      setSuccessDialog(true);
      fetchData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Sync failed.');
      setErrorDialog(true);
    } finally {
      setSyncing(false);
    }
  };

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 p-6">
      {/* ── header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IconShoppingCart className="h-6 w-6" /> Orders
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            WooCommerce &amp; POS orders synced through the
            OrderIngestionService
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSyncDialog(true)}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Sync with WooCommerce
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <IconRefresh
              className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`}
            />{' '}
            Refresh
          </Button>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-2xl font-bold">{summary.total_orders}</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs text-yellow-600 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Pending
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-2xl font-bold text-yellow-600">
                {summary.pending}
              </p>
            </CardContent>
          </Card>
          <Card className="border-blue-200">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs text-blue-600 flex items-center gap-1">
                <Package className="h-3 w-3" /> Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-2xl font-bold text-blue-600">
                {summary.processing}
              </p>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Completed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-2xl font-bold text-green-600">
                {summary.completed}
              </p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs text-emerald-600">
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-xl font-bold text-emerald-600">
                TND {summary.revenue}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="WOOCOMMERCE">WooCommerce</SelectItem>
            <SelectItem value="POS">POS</SelectItem>
            <SelectItem value="MANUAL">Manual</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {availableBrands.map(brand => (
                <SelectItem key={brand.id} value={String(brand.id)}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ── table ──────────────────────────────────────────────────────── */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-10 text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-10 text-muted-foreground"
                >
                  No orders found.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              filtered.map(o => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => openDetail(o.id)}
                >
                  <TableCell className="font-mono text-xs">
                    {o.order_number}
                  </TableCell>
                  <TableCell>
                    {o.client_name ?? o.client_email ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {o.sales_channel_name}
                  </TableCell>
                  <TableCell>
                    <SourceBadge source={o.source} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-xs">{o.payment_status}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {o.currency} {o.total}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={e => {
                        e.stopPropagation();
                        openDetail(o.id);
                      }}
                    >
                      <IconEye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      {/* ── detail dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order {viewOrder?.order_number}</DialogTitle>
            <DialogDescription>
              {viewOrder?.external_order_id
                ? `WC #${viewOrder.external_order_id}`
                : 'Local order'}
            </DialogDescription>
          </DialogHeader>
          {viewOrder && (
            <OrderDetailContent
              order={viewOrder}
              onStatusChange={handleStatusChange}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Sync with WooCommerce dialog ─────────────────────────────── */}
      <Dialog open={syncDialog} onOpenChange={setSyncDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" /> Sync Orders from WooCommerce
            </DialogTitle>
            <DialogDescription>
              Select the WooCommerce sales channel to pull orders from
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {wooCommerceChannels.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No WooCommerce channels available
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create a WooCommerce sales channel first
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Select WooCommerce Store</Label>
                  <Select
                    value={selectedSyncChannel}
                    onValueChange={setSelectedSyncChannel}
                  >
                    <SelectTrigger>
                      <Store className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Select a store to sync from" />
                    </SelectTrigger>
                    <SelectContent>
                      {wooCommerceChannels.map(ch => (
                        <SelectItem key={ch.id} value={String(ch.id)}>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{ch.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {ch.brand_name}
                              </Badge>
                            </div>
                            {ch.wc_store_url && (
                              <span className="text-xs text-muted-foreground">
                                {ch.wc_store_url}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedSyncChannel && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Store:</span>
                      <span className="text-sm">
                        {
                          wooCommerceChannels.find(
                            c => String(c.id) === selectedSyncChannel
                          )?.name
                        }
                      </span>
                    </div>
                    {wooCommerceChannels.find(
                      c => String(c.id) === selectedSyncChannel
                    )?.wc_store_url && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">URL:</span>
                        <span className="text-xs text-muted-foreground">
                          {
                            wooCommerceChannels.find(
                              c => String(c.id) === selectedSyncChannel
                            )?.wc_store_url
                          }
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex flex-col gap-3 pt-2 border-t">
            <div className="flex gap-3">
              <Button
                onClick={handlePreviewOrders}
                disabled={
                  previewing ||
                  !selectedSyncChannel ||
                  wooCommerceChannels.length === 0
                }
                variant="outline"
                className="flex-1 gap-2"
              >
                <Eye
                  className={`h-4 w-4 ${previewing ? 'animate-pulse' : ''}`}
                />
                {previewing ? 'Loading…' : 'Preview & Select'}
              </Button>
              <Button
                onClick={handleConfirmSync}
                disabled={
                  syncing ||
                  !selectedSyncChannel ||
                  wooCommerceChannels.length === 0
                }
                className="flex-1 gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
                />
                {syncing ? 'Syncing…' : 'Sync All'}
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setSyncDialog(false);
                setSelectedSyncChannel('');
              }}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── WooCommerce Orders Preview dialog ────────────────────────── */}
      <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              WooCommerce Orders – {previewData?.sales_channel_name}
            </DialogTitle>
            <DialogDescription>
              Select orders to import. Orders marked "Exists" will be updated.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <>
              {/* stats */}
              <div className="flex gap-4 py-2">
                <Badge variant="outline" className="gap-1">
                  Total: {previewData.total_count}
                </Badge>
                <Badge variant="default" className="gap-1 bg-green-600">
                  New: {previewData.new_count}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  Existing: {previewData.existing_count}
                </Badge>
              </div>

              {/* select all / none */}
              <div className="flex items-center gap-3 py-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSelectedWcOrders(previewData.orders.map(o => o.wc_id))
                  }
                >
                  Select All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedWcOrders([])}
                >
                  Deselect All
                </Button>
                <span className="text-sm text-muted-foreground ml-auto">
                  {selectedWcOrders.length} selected
                </span>
              </div>

              {/* orders table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>WC #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Local</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.orders.map(o => (
                    <TableRow
                      key={o.wc_id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => toggleWcOrderSelection(o.wc_id)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedWcOrders.includes(o.wc_id)}
                          onCheckedChange={() =>
                            toggleWcOrderSelection(o.wc_id)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {o.order_number || o.wc_id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{o.customer_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">
                            {o.customer_email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {o.currency} {o.total}
                      </TableCell>
                      <TableCell className="text-xs">
                        {o.line_items_count}
                      </TableCell>
                      <TableCell className="text-xs">
                        {o.payment_method_title || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {o.date_created
                          ? new Date(o.date_created).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {o.exists_locally ? (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Check className="h-3 w-3" /> Exists
                          </Badge>
                        ) : (
                          <Badge
                            variant="default"
                            className="text-xs bg-green-600"
                          >
                            New
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleSyncSelected}
                  disabled={syncingSelected || selectedWcOrders.length === 0}
                  className="gap-2"
                >
                  {syncingSelected ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Sync Selected ({selectedWcOrders.length})
                </Button>
                <Button
                  onClick={handleSyncAllFromPreview}
                  disabled={syncingSelected}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${syncingSelected ? 'animate-spin' : ''}`}
                  />
                  Sync All
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setPreviewDialog(false)}
                  className="ml-auto"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── success dialog ─────────────────────────────────────────────── */}
      <AlertDialog open={successDialog} onOpenChange={setSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" /> Success
            </AlertDialogTitle>
            <AlertDialogDescription>{successMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSuccessDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── error dialog ───────────────────────────────────────────────── */}
      <AlertDialog open={errorDialog} onOpenChange={setErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Error</AlertDialogTitle>
            <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
