/**
 * OrderDialogs — Clean, production-ready dialog system for order management.
 *
 * Components exported:
 *   - OrderDetailDialog  — View + edit order (responsive: Dialog desktop / Drawer mobile)
 *   - SyncDialog         — WooCommerce import
 *   - PreviewDialog      — WC order preview + selective sync
 *   - LogsDialog         — Audit trail timeline
 *   - MessageAlert       — Success / error feedback
 */
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  CheckCircle, XCircle, RefreshCw, Eye, History, Undo2,
  Trash2, Plus, Loader2, Pencil, Store, Globe, Check,
  Package, AlertCircle, TrendingUp, Search, ChevronDown,
  CreditCard, Calendar, User, MapPin, Percent, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { getMediaUrl } from '@/utils/helpers';
import type {
  OrderDetail, OrderEditRequest, OrderLogEntry, OrderDiscountType,
  ProductListItem, SalesChannel, OrderStatus,
} from '@/types';
import type { WooCommerceOrderPreviewResponse } from '@/services/order.service';

/* ═══════════════════════════════════════════════════════════════════════════ */
/* RESPONSIVE SHEET                                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */

function ResponsiveSheet({
  open, onOpenChange, title, description, children,
  wide = false, footer,
}: Readonly<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}>) {
  const mobile = useIsMobile();

  if (mobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[95dvh] max-h-[95dvh] flex flex-col rounded-t-2xl">

          {/* Header */}
          <DrawerHeader className="text-left px-4 pt-4 pb-3 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <DrawerTitle className="text-base font-semibold tracking-tight">
              {title}
            </DrawerTitle>
            {description && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </DrawerHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="border-t px-4 py-3 bg-background/95 backdrop-blur">
              {footer}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`
          ${wide ? 'max-w-3xl lg:max-w-4xl w-[96vw]' : 'max-w-lg'}
          max-h-[90vh]
          flex flex-col
          p-0
          gap-0
          rounded-xl
          overflow-hidden
          shadow-2xl
        `}
      >
        {/* Dialog Header - Sticky */}
        <div className="border-b border-border px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-background to-muted/20 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-xs sm:text-sm mt-1 text-muted-foreground leading-relaxed">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-5">
            {children}
          </div>
        </div>

        {/* Dialog Footer - Sticky */}
        {footer && (
          <div className="border-t border-border px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-t from-muted/30 to-background sticky bottom-0 z-20 flex-shrink-0">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* TOKENS                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

const STATUS_MAP: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PENDING:    { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Pending' },
  PROCESSING: { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Processing' },
  ON_HOLD:    { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500',  label: 'On Hold' },
  COMPLETED:  { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Completed' },
  CANCELLED:  { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Cancelled' },
  REFUNDED:   { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500',  label: 'Refunded' },
  FAILED:     { bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400',    label: 'Failed' },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.FAILED!;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PRODUCT IMAGE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

function ProductImage({ src, alt, size = 'sm' }: { src?: string | null; alt: string; size?: 'sm' | 'md' }) {
  const [err, setErr] = useState(false);
  const url = getMediaUrl(src);
  const dims = size === 'sm' ? 'size-8' : 'size-10';

  if (!url || err) {
    return (
      <div className={`${dims} rounded-lg bg-muted flex items-center justify-center flex-shrink-0`}>
        <Package className="size-3.5 text-muted-foreground/40" />
      </div>
    );
  }
  return (
    <img
      src={url} alt={alt}
      className={`${dims} rounded-lg border object-cover flex-shrink-0`}
      loading="lazy"
      onError={() => setErr(true)}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PRODUCT SEARCH SELECT (edit mode)                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

function ProductSearchSelect({
  products, value, onChange, loading,
}: Readonly<{
  products: ProductListItem[];
  value: number | null | undefined;
  onChange: (productId: string) => void;
  loading?: boolean;
}>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return products.slice(0, 40);
    const q = query.toLowerCase();
    return products.filter(
      p => p.name.toLowerCase().includes(q) || (p.barcode?.toLowerCase().includes(q))
    ).slice(0, 40);
  }, [products, query]);

  const selected = products.find(p => p.id === value);

  const handleSelect = useCallback((pid: string) => {
    onChange(pid);
    setOpen(false);
    setQuery('');
  }, [onChange]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 60); }}
        className="flex items-center gap-2 w-full h-9 px-3 border rounded-md text-sm bg-background hover:bg-muted/30 transition-colors text-left"
      >
        {selected ? (
          <>
            <ProductImage src={selected.image_url} alt={selected.name} />
            <span className="truncate flex-1 font-medium">{selected.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground flex-1">Select product...</span>
        )}
        <ChevronDown className={`size-3.5 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-64 flex flex-col overflow-hidden">
          <div className="p-2 border-b flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search products..."
                className="h-8 pl-8 text-sm border-0 bg-muted/40 focus-visible:ring-0"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect('__manual__')}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left border-b"
            >
              <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
                <Plus className="size-3.5 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground">Manual entry</span>
            </button>

            {loading ? (
              <div className="flex items-center justify-center py-6 gap-2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">No products found</div>
            ) : (
              filtered.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(String(p.id))}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/40 transition-colors text-left ${value === p.id ? 'bg-primary/5' : ''}`}
                >
                  <ProductImage src={p.image_url} alt={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-[13px]">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.barcode || '—'} · {p.sales_price} TND</p>
                  </div>
                  {value === p.id && <Check className="size-4 text-primary flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ORDER DETAIL VIEW — tabbed layout (Details | Items | Notes)               */
/* ═══════════════════════════════════════════════════════════════════════════ */

function OrderViewMode({
  order, onStatusChange, isLoading,
}: Readonly<{
  order: OrderDetail;
  onStatusChange: (id: number, status: OrderStatus) => void;
  isLoading?: boolean;
}>) {
  const totalsRows = useMemo(() => [
    { label: 'Subtotal', value: order.subtotal },
    { label: 'Tax', value: order.tax_total },
    { label: 'Shipping', value: order.shipping_total },
    ...(parseFloat(order.discount_total) > 0 ? [{ label: 'Discount', value: `-${order.discount_total}` }] : []),
  ], [order]);

  return (
    <div className="space-y-6">
      {/* Main layout: 2-col on large */}
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        {/* Left column */}
        <Tabs defaultValue="details" className="gap-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="details" className="text-xs gap-1.5">
              <User className="size-3.5" /> Details
            </TabsTrigger>
            <TabsTrigger value="items" className="text-xs gap-1.5">
              <Package className="size-3.5" /> Items ({order.lines.length})
            </TabsTrigger>
            {(order.customer_note || order.internal_note) && (
              <TabsTrigger value="notes" className="text-xs gap-1.5">
                <MessageSquare className="size-3.5" /> Notes
              </TabsTrigger>
            )}
          </TabsList>

          {/* Tab: Details */}
          <TabsContent value="details">
            <div className="space-y-3">
              {/* Channel Card */}
              <div className="rounded-lg border bg-gradient-to-br from-cyan-50/30 to-transparent p-4 flex items-start gap-3">
                <div className="size-9 rounded-lg bg-cyan-600/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="size-4 text-cyan-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Channel</p>
                  <p className="text-sm font-medium text-foreground">{order.sales_channel_name}</p>
                </div>
              </div>

              {/* Client Card */}
              <div className="rounded-lg border bg-gradient-to-br from-indigo-50/30 to-transparent p-4 flex items-start gap-3">
                <div className="size-9 rounded-lg bg-indigo-600/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="size-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Client</p>
                  <p className="text-sm font-medium text-foreground truncate">{order.client_name ?? order.client_email ?? '—'}</p>
                </div>
              </div>

              {/* Source & Status Row */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-gradient-to-br from-violet-50/30 to-transparent p-4 flex items-start gap-3">
                  <div className="size-9 rounded-lg bg-violet-600/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Store className="size-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Source</p>
                    <Badge variant="secondary" className="text-[10px]">{order.source}</Badge>
                  </div>
                </div>
                <div className="rounded-lg border bg-gradient-to-br from-orange-50/30 to-transparent p-4 flex items-start gap-3">
                  <div className="size-9 rounded-lg bg-orange-600/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <TrendingUp className="size-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                    <StatusPill status={order.status} />
                  </div>
                </div>
              </div>

              {/* Payment Card */}
              <div className="rounded-lg border bg-gradient-to-br from-green-50/30 to-transparent p-4 flex items-start gap-3">
                <div className="size-9 rounded-lg bg-green-600/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CreditCard className="size-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Payment</p>
                  <p className="text-sm font-medium text-foreground">{order.payment_method || '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{order.payment_status}</p>
                </div>
              </div>

              {/* Created & External ID Row */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-gradient-to-br from-rose-50/30 to-transparent p-4 flex items-start gap-3">
                  <div className="size-9 rounded-lg bg-rose-600/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Calendar className="size-4 text-rose-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Created</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                {order.external_order_id && (
                  <div className="rounded-lg border bg-gradient-to-br from-slate-50/30 to-transparent p-4 flex items-start gap-3">
                    <div className="size-9 rounded-lg bg-slate-600/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Globe className="size-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">External ID</p>
                      <code className="text-xs bg-muted/60 px-2 py-1 rounded-md font-mono block truncate">{order.external_order_id}</code>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab: Line Items */}
          <TabsContent value="items">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 text-xs font-medium">Product</TableHead>
                    <TableHead className="h-9 text-xs font-medium text-center w-14">Qty</TableHead>
                    <TableHead className="h-9 text-xs font-medium text-right w-20 hidden sm:table-cell">Unit</TableHead>
                    <TableHead className="h-9 text-xs font-medium text-right w-24">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lines.map(line => (
                    <TableRow key={line.id} className="hover:bg-muted/30">
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <ProductImage src={line.product_image} alt={line.product_name} size="md" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[180px] sm:max-w-none">{line.product_name}</p>
                            {line.barcode && <p className="text-[11px] text-muted-foreground font-mono">{line.barcode}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-sm">{line.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground hidden sm:table-cell">{order.currency} {line.unit_price}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-semibold">{order.currency} {line.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Tab: Notes */}
          {(order.customer_note || order.internal_note) && (
            <TabsContent value="notes">
              <div className="space-y-3">
                {order.customer_note && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Customer Note</p>
                    <p className="text-sm leading-relaxed">{order.customer_note}</p>
                  </div>
                )}
                {order.internal_note && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                    <p className="text-xs font-medium text-amber-700 mb-1.5">Internal Note</p>
                    <p className="text-sm leading-relaxed">{order.internal_note}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Right sidebar: Totals + Actions */}
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Summary</h4>
            {totalsRows.map(r => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="tabular-nums">{order.currency} {r.value}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between items-baseline pt-1">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-bold tabular-nums text-emerald-600">{order.currency} {order.total}</span>
            </div>
          </div>

          {/* Quick status actions */}
          {(order.status !== 'COMPLETED' && order.status !== 'CANCELLED') && (
            <div className="space-y-2">
              <Button
                size="sm"
                className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => onStatusChange(order.id, 'COMPLETED')}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5" />}
                Mark Completed
              </Button>
              <Button
                size="sm" variant="outline"
                className="w-full gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => onStatusChange(order.id, 'CANCELLED')}
                disabled={isLoading}
              >
                <XCircle className="size-3.5" /> Cancel Order
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* EDIT MODE                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface OrderEditModeProps {
  editForm: OrderEditRequest;
  editProducts: ProductListItem[];
  loadingEditProducts: boolean;
  currency: string;
  onUpdateLine: (index: number, key: 'quantity' | 'unit_price', value: string) => void;
  onUpdateLineField: (index: number, key: 'product_name' | 'barcode', value: string) => void;
  onUpdateLineProduct: (index: number, productId: string) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
  onSaveEdit: () => void;
  onCancel: () => void;
  onChangeDiscount: (field: 'type' | 'value', val: string | OrderDiscountType) => void;
  onChangeNote: (field: 'customer' | 'internal', val: string) => void;
  isSaving?: boolean;
}

function OrderEditMode({
  editForm, editProducts, loadingEditProducts, currency,
  onUpdateLine, onUpdateLineField, onUpdateLineProduct,
  onAddLine, onRemoveLine, onSaveEdit, onCancel,
  onChangeDiscount, onChangeNote, isSaving,
}: Readonly<OrderEditModeProps>) {
  const liveSubtotal = useMemo(() =>
    editForm.lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0),
  [editForm.lines]);

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Line Items Section */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* Header */}
        <div className="border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-start sm:items-center gap-3">
            <div className="size-8 sm:size-9 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200 flex-shrink-0">
              <Package className="size-3.5 sm:size-4 text-gray-700" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">Line Items</h3>
              <p className="text-xs text-gray-500 mt-0.5">Manage products in this order</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-5">
          {loadingEditProducts && (
            <div className="flex items-center gap-2.5 text-xs text-gray-600 py-4 px-4 bg-gray-50 rounded-lg border border-gray-200 animate-pulse">
              <Loader2 className="size-4 animate-spin" /> 
              <span>Loading products...</span>
            </div>
          )}

          {!loadingEditProducts && editForm.lines.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="flex justify-center">
                <Package className="size-12 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-600">No items added yet</p>
              <p className="text-xs text-gray-500">Click "Add Item" to start adding products to this order</p>
            </div>
          ) : (
            <div className="space-y-3">
              {editForm.lines.map((line, i) => {
                const lineTotal = ((Number(line.quantity) || 0) * (Number(line.unit_price) || 0)).toFixed(2);
                return (
                  <div key={line.id ?? `new-${i}`} className="rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md transition-all duration-150 p-3 sm:p-4 space-y-3 group">
                    {/* Product Selection Row */}
                    <div className="flex items-start gap-2.5">
                      <div className="flex-1 min-w-0">
                        <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Product</Label>
                        <ProductSearchSelect
                          products={editProducts}
                          value={line.product}
                          onChange={val => onUpdateLineProduct(i, val)}
                          loading={loadingEditProducts}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveLine(i)}
                        disabled={editForm.lines.length <= 1}
                        className="size-8 mt-6 text-gray-300 hover:text-red-600 hover:bg-red-50 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-150 rounded-lg flex items-center justify-center"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    {/* Quantity, Price, Subtotal Row */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div>
                        <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Qty</Label>
                        <Input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={e => onUpdateLine(i, 'quantity', e.target.value)}
                          className="h-9 text-sm text-center border-gray-200 focus-visible:border-gray-400 focus-visible:ring-1 focus-visible:ring-gray-200 rounded-lg transition-colors"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Price</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.unit_price}
                          onChange={e => onUpdateLine(i, 'unit_price', e.target.value)}
                          className="h-9 text-sm text-right border-gray-200 focus-visible:border-gray-400 focus-visible:ring-1 focus-visible:ring-gray-200 rounded-lg transition-colors"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Total</Label>
                        <div className="h-9 flex items-center justify-end text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2.5 tabular-nums">
                          {currency} {lineTotal}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Item Button - Below Last Item */}
              <button
                type="button"
                onClick={onAddLine}
                disabled={loadingEditProducts}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-2 border-dashed border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-150"
              >
                <Plus className="size-4" /> Add Item
              </button>
            </div>
          )}

          {/* Subtotal Summary */}
          {editForm.lines.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg px-4 py-3.5 sm:py-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order Subtotal</span>
                  <p className="text-xs text-gray-600">Before discount and shipping</p>
                </div>
                <div className="text-right">
                  <span className="block text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">
                    {currency} {liveSubtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discount Section */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="border-b border-gray-100 px-4 sm:px-6 py-4 bg-gradient-to-r from-gray-50 to-white flex items-start sm:items-center gap-3">
          <div className="size-8 sm:size-9 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200 flex-shrink-0">
            <Percent className="size-3.5 sm:size-4 text-gray-700" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-gray-900">Discount</h4>
            <p className="text-xs text-gray-500 mt-0.5">Optional order-level discount (before shipping)</p>
          </div>
        </div>
        <div className="px-4 sm:px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-gray-700 mb-2 block">Type</Label>
              <Select value={editForm.discount_type ?? 'NONE'} onValueChange={v => onChangeDiscount('type', v as OrderDiscountType)}>
                <SelectTrigger className="h-9 text-sm border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No Discount</SelectItem>
                  <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700 mb-2 block">Value</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={editForm.discount_value ?? '0.00'}
                onChange={e => onChangeDiscount('value', e.target.value)}
                placeholder="0.00"
                className="h-9 text-sm text-right border-gray-200 focus-visible:border-gray-400 focus-visible:ring-1 focus-visible:ring-gray-200 rounded-lg transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="border-b border-gray-100 px-4 sm:px-6 py-4 bg-gradient-to-r from-gray-50 to-white flex items-start sm:items-center gap-3">
          <div className="size-8 sm:size-9 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200 flex-shrink-0">
            <MessageSquare className="size-3.5 sm:size-4 text-gray-700" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-gray-900">Notes</h4>
            <p className="text-xs text-gray-500 mt-0.5">Add notes for customer and internal use</p>
          </div>
        </div>
        <div className="px-4 sm:px-6 py-5 space-y-5">
          {/* Customer Note */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2 block">
              <Globe className="size-4 text-gray-600" />
              Customer Note
            </Label>
            <Textarea
              value={editForm.customer_note ?? ''}
              onChange={e => onChangeNote('customer', e.target.value)}
              placeholder="This note will be visible to the customer in their order confirmation..."
              className="min-h-20 text-sm resize-none border-gray-200 focus-visible:border-gray-400 focus-visible:ring-1 focus-visible:ring-gray-200 rounded-lg transition-colors p-3"
            />
            <p className="text-xs text-gray-500 mt-2">Visible to customer in email and order page</p>
          </div>

          {/* Internal Note */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2 block">
              <AlertCircle className="size-4 text-gray-600" />
              Internal Note
            </Label>
            <Textarea
              value={editForm.internal_note ?? ''}
              onChange={e => onChangeNote('internal', e.target.value)}
              placeholder="Internal notes only (not visible to customer)..."
              className="min-h-20 text-sm resize-none border-gray-200 focus-visible:border-gray-400 focus-visible:ring-1 focus-visible:ring-gray-200 rounded-lg transition-colors p-3"
            />
            <p className="text-xs text-gray-500 mt-2">For internal use and staff communication only</p>
          </div>
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/80 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg animate-in fade-in duration-300">
        <div className="text-xs sm:text-sm text-gray-600">
          <p className="font-medium">Unsaved changes</p>
          <p className="text-gray-500 text-xs">Changes will be saved immediately when you click save</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 sm:flex-none px-4 h-9 text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-150"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSaveEdit}
            disabled={isSaving}
            className="flex-1 sm:flex-none px-6 h-9 text-sm font-medium gap-2 min-w-32 bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-150 flex items-center justify-center"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="size-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ORDER DETAIL DIALOG                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderDetail | null;
  isDetailLoading: boolean;
  isEditMode: boolean;
  editForm: OrderEditRequest | null;
  editProducts: ProductListItem[];
  loadingEditProducts: boolean;
  savingEdit: boolean;
  mutatingOrder: boolean;
  onStatusChange: (id: number, status: OrderStatus) => void;
  onEditModeChange: (enabled: boolean) => void;
  onUpdateLine: (index: number, key: 'quantity' | 'unit_price', value: string) => void;
  onUpdateLineField: (index: number, key: 'product_name' | 'barcode', value: string) => void;
  onUpdateLineProduct: (index: number, productId: string) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
  onSaveEdit: () => void;
  onChangeDiscount: (field: 'type' | 'value', val: string | OrderDiscountType) => void;
  onChangeNote: (field: 'customer' | 'internal', val: string) => void;
  onOpenLogs: () => void;
  onDelete: () => void;
  onRestore: () => void;
}

export function OrderDetailDialog({
  open, onOpenChange, order, isDetailLoading,
  isEditMode, editForm, editProducts, loadingEditProducts,
  savingEdit, mutatingOrder,
  onStatusChange, onEditModeChange,
  onUpdateLine, onUpdateLineField, onUpdateLineProduct,
  onAddLine, onRemoveLine, onSaveEdit,
  onChangeDiscount, onChangeNote,
  onOpenLogs, onDelete, onRestore,
}: Readonly<OrderDetailDialogProps>) {
  const title = order ? `Order ${order.order_number}` : 'Loading...';
  const desc = order?.external_order_id ? `WC #${order.external_order_id}` : undefined;

  const footerActions = order && !isEditMode ? (
    <div className="flex items-center gap-2 justify-end w-full">
      {!order.is_deleted && (
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => onEditModeChange(true)}>
          <Pencil className="size-3" /> Edit
        </Button>
      )}
      <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={onOpenLogs}>
        <History className="size-3" /> Logs
      </Button>
      {order.is_deleted ? (
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={onRestore} disabled={mutatingOrder}>
          {mutatingOrder ? <Loader2 className="size-3 animate-spin" /> : <Undo2 className="size-3" />} Restore
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={onDelete} disabled={mutatingOrder}>
          {mutatingOrder ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />} Delete
        </Button>
      )}
    </div>
  ) : undefined;

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title={title} description={desc} wide footer={footerActions}>
      {isDetailLoading && !order ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : order ? (
        <div className="space-y-5">
          {/* Deleted banner */}
          {order.is_deleted && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
              <AlertCircle className="size-4 flex-shrink-0" />
              <span>This order has been soft-deleted.</span>
            </div>
          )}

          {!isEditMode ? (
            <OrderViewMode order={order} onStatusChange={onStatusChange} isLoading={mutatingOrder} />
          ) : editForm ? (
            <OrderEditMode
              editForm={editForm}
              editProducts={editProducts}
              loadingEditProducts={loadingEditProducts}
              currency={order.currency}
              onUpdateLine={onUpdateLine}
              onUpdateLineField={onUpdateLineField}
              onUpdateLineProduct={onUpdateLineProduct}
              onAddLine={onAddLine}
              onRemoveLine={onRemoveLine}
              onSaveEdit={onSaveEdit}
              onCancel={() => onEditModeChange(false)}
              onChangeDiscount={onChangeDiscount}
              onChangeNote={onChangeNote}
              isSaving={savingEdit}
            />
          ) : null}
        </div>
      ) : null}
    </ResponsiveSheet>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* SYNC DIALOG                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface SyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channels: SalesChannel[];
  selectedChannel: string;
  onChannelChange: (id: string) => void;
  onPreview: () => void;
  onSyncAll: () => void;
  isPreviewing?: boolean;
  isSyncing?: boolean;
}

export function SyncDialog({
  open, onOpenChange, channels, selectedChannel, onChannelChange,
  onPreview, onSyncAll, isPreviewing, isSyncing,
}: Readonly<SyncDialogProps>) {
  const wcChannels = channels.filter(ch => ch.channel_type === 'WOOCOMMERCE');
  const sel = wcChannels.find(c => String(c.id) === selectedChannel);

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Import Orders" description="Sync orders from WooCommerce">
      <div className="space-y-4">
        {wcChannels.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Globe className="size-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm font-medium">No WooCommerce channels</p>
            <p className="text-xs text-muted-foreground">Create a WooCommerce sales channel first.</p>
          </div>
        ) : (
          <>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Store</Label>
              <Select value={selectedChannel} onValueChange={onChannelChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a store..." />
                </SelectTrigger>
                <SelectContent>
                  {wcChannels.map(ch => (
                    <SelectItem key={ch.id} value={String(ch.id)}>
                      {ch.name}
                      <Badge variant="outline" className="ml-2 text-[10px]">{ch.brand_name}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {sel && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                <div className="size-8 rounded-md bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Store className="size-4 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{sel.name}</p>
                  {sel.wc_store_url && <p className="text-xs text-muted-foreground truncate">{sel.wc_store_url}</p>}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button onClick={onPreview} disabled={isPreviewing || !selectedChannel} variant="outline" className="flex-1 gap-1.5 h-9">
                <Eye className={`size-3.5 ${isPreviewing ? 'animate-pulse' : ''}`} />
                {isPreviewing ? 'Loading...' : 'Preview'}
              </Button>
              <Button onClick={onSyncAll} disabled={isSyncing || !selectedChannel} className="flex-1 gap-1.5 h-9">
                <RefreshCw className={`size-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync All'}
              </Button>
            </div>
          </>
        )}
      </div>
    </ResponsiveSheet>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PREVIEW DIALOG                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: WooCommerceOrderPreviewResponse | null;
  selectedIds: number[];
  onToggleOrder: (wcId: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSyncSelected: () => void;
  onSyncAll: () => void;
  isSyncingSelected?: boolean;
}

export function PreviewDialog({
  open, onOpenChange, data, selectedIds,
  onToggleOrder, onSelectAll, onDeselectAll,
  onSyncSelected, onSyncAll, isSyncingSelected,
}: Readonly<PreviewDialogProps>) {
  const footer = data ? (
    <div className="flex items-center gap-2 justify-between w-full">
      <div className="flex gap-2">
        <Button size="sm" onClick={onSyncSelected} disabled={isSyncingSelected || selectedIds.length === 0} className="gap-1.5 h-8 text-xs">
          {isSyncingSelected ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
          Sync ({selectedIds.length})
        </Button>
        <Button size="sm" onClick={onSyncAll} disabled={isSyncingSelected} variant="outline" className="gap-1.5 h-8 text-xs">
          <RefreshCw className="size-3" /> All
        </Button>
      </div>
      <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)} className="h-8 text-xs">Close</Button>
    </div>
  ) : undefined;

  return (
    <ResponsiveSheet
      open={open} onOpenChange={onOpenChange}
      title={`Preview — ${data?.sales_channel_name ?? ''}`}
      description="Select orders to import"
      wide footer={footer}
    >
      {data && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="gap-1"><Package className="size-3" /> {data.total_count} total</Badge>
            <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600"><TrendingUp className="size-3" /> {data.new_count} new</Badge>
            <Badge variant="secondary" className="gap-1"><Check className="size-3" /> {data.existing_count} existing</Badge>
          </div>

          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-muted/40 border text-xs">
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={onSelectAll} className="h-6 text-[11px] px-2">All</Button>
              <Button size="sm" variant="outline" onClick={onDeselectAll} className="h-6 text-[11px] px-2">None</Button>
            </div>
            <span className="text-muted-foreground">{selectedIds.length} selected</span>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 h-8">
                    <Checkbox
                      checked={selectedIds.length === data.orders.length && data.orders.length > 0}
                      onCheckedChange={c => c ? onSelectAll() : onDeselectAll()}
                    />
                  </TableHead>
                  <TableHead className="h-8 text-xs font-medium">Order</TableHead>
                  <TableHead className="h-8 text-xs font-medium">Customer</TableHead>
                  <TableHead className="h-8 text-xs font-medium hidden sm:table-cell">Status</TableHead>
                  <TableHead className="h-8 text-xs font-medium text-right">Total</TableHead>
                  <TableHead className="h-8 text-xs font-medium w-16">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.orders.map(o => (
                  <TableRow key={o.wc_id} className="hover:bg-muted/30 cursor-pointer" onClick={() => onToggleOrder(o.wc_id)}>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.includes(o.wc_id)} onCheckedChange={() => onToggleOrder(o.wc_id)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{o.order_number || o.wc_id}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium truncate max-w-[120px]">{o.customer_name || '—'}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="text-[11px]">{o.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">{o.currency} {o.total}</TableCell>
                    <TableCell>
                      {o.exists_locally
                        ? <Badge variant="secondary" className="text-[10px] gap-0.5"><RefreshCw className="size-2.5" /> Update</Badge>
                        : <Badge className="text-[10px] gap-0.5 bg-emerald-600 hover:bg-emerald-600"><Plus className="size-2.5" /> New</Badge>
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </ResponsiveSheet>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* LOGS DIALOG — Timeline layout                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

const LOG_COLORS: Record<string, string> = {
  CREATED: 'bg-green-500',
  UPDATED: 'bg-blue-500',
  STATUS_CHANGED: 'bg-indigo-500',
  DISCOUNT_APPLIED: 'bg-purple-500',
  SOFT_DELETED: 'bg-red-500',
  RESTORED: 'bg-emerald-500',
};

interface LogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber?: string;
  logs: OrderLogEntry[];
  isLoading?: boolean;
}

export function LogsDialog({ open, onOpenChange, orderNumber, logs, isLoading }: Readonly<LogsDialogProps>) {
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title={`Logs — ${orderNumber ?? ''}`} description="Audit trail">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Loading logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <History className="size-6 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No audit logs found</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-0">
            {logs.map((log) => {
              const dotColor = LOG_COLORS[log.action] ?? 'bg-gray-400';
              return (
                <div key={log.id} className="relative pl-7 pb-5 last:pb-0">
                  {/* Dot */}
                  <div className={`absolute left-0 top-1.5 size-[15px] rounded-full border-2 border-background ${dotColor}`} />

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      by <span className="font-medium text-foreground">{log.user_name || 'System'}</span>
                    </p>
                    {Object.keys(log.details).length > 0 && (
                      <pre className="text-[11px] font-mono bg-muted rounded-md p-2 mt-1.5 max-h-20 overflow-auto whitespace-pre-wrap break-words text-muted-foreground">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ResponsiveSheet>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* MESSAGE ALERT                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface MessageAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  type: 'success' | 'error';
}

export function MessageAlert({ open, onOpenChange, message, type }: Readonly<MessageAlertProps>) {
  const ok = type === 'success';
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xs">
        <AlertDialogHeader className="text-center">
          <div className={`size-10 rounded-full mx-auto mb-2 flex items-center justify-center ${ok ? 'bg-emerald-100' : 'bg-red-100'}`}>
            {ok ? <CheckCircle className="size-5 text-emerald-600" /> : <XCircle className="size-5 text-red-600" />}
          </div>
          <AlertDialogTitle className="text-sm font-semibold">{ok ? 'Success' : 'Error'}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="justify-center sm:justify-center">
          <AlertDialogAction onClick={() => onOpenChange(false)} className="min-w-[80px] h-8 text-sm">OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
