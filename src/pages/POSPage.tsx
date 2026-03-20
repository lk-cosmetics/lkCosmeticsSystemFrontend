/**
 * POSPage – "Method B" cashier UI.
 * Lets a user pick a sales channel, search products, add them to a cart,
 * optionally attach a customer, then submit.  The resulting JSON mirrors
 * the WooCommerce order shape so the backend OrderIngestionService can
 * process it through the same pipeline.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  IconShoppingCart,
  IconSearch,
  IconPlus,
  IconMinus,
  IconTrash,
  IconCash,
  IconReceipt,
} from '@tabler/icons-react';
import { CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';

import { productService } from '@/services/product.service';
import { salesChannelService } from '@/services/salesChannel.service';
import { clientService } from '@/services/client.service';
import { orderService } from '@/services/order.service';
import type {
  ProductListItem,
  SalesChannel,
  Client,
  POSOrderCreateRequest,
} from '@/types';
import { getMediaUrl } from '@/utils/helpers';

/* ─── types local to POS ─── */

interface CartLine {
  product: ProductListItem;
  quantity: number;
}

/* ─── small extracted components ─── */

function CartRow({
  line,
  onQty,
  onRemove,
}: Readonly<{
  line: CartLine;
  onQty: (id: number, delta: number) => void;
  onRemove: (id: number) => void;
}>) {
  const lineTotal = (line.quantity * Number(line.product.sales_price)).toFixed(
    2
  );
  return (
    <TableRow>
      <TableCell className="font-medium text-sm">{line.product.name}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {line.product.barcode || '—'}
      </TableCell>
      <TableCell className="text-right">{line.product.sales_price}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1 justify-center">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => onQty(line.product.id, -1)}
          >
            <IconMinus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center font-semibold">{line.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => onQty(line.product.id, 1)}
          >
            <IconPlus className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
      <TableCell className="text-right font-semibold">{lineTotal}</TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onRemove(line.product.id)}
        >
          <IconTrash className="h-4 w-4 text-red-500" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function POSPage() {
  /* ── data sources ────────────────────────────────────────────────────── */
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  /* ── selections ──────────────────────────────────────────────────────── */
  const [channelId, setChannelId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerNote, setCustomerNote] = useState('');

  /* ── result dialog ──────────────────────────────────────────────────── */
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ── load reference data ────────────────────────────────────────────── */
  const fetchRef = useCallback(async () => {
    setDataLoading(true);
    try {
      const [chRes, prRes, clRes] = await Promise.all([
        salesChannelService.getAllChannels(),
        productService.getAllProducts({ page_size: 1000 }),
        clientService.getAll({ page_size: 1000 }),
      ]);
      setChannels(chRes);
      setProducts(prRes);
      setClients(clRes.results ?? clRes);
    } catch (err) {
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRef();
  }, [fetchRef]);

  /* ── channel-filtered products (show products of the channel's brand) ─ */
  const channelProducts = useMemo(() => {
    if (!channelId) return [];
    const ch = channels.find(c => c.id === Number(channelId));
    if (!ch) return [];
    let items = products.filter(p => p.brand === ch.brand);
    if (productSearch) {
      const q = productSearch.toLowerCase();
      items = items.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode ?? '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [products, channels, channelId, productSearch]);

  /* ── cart helpers ────────────────────────────────────────────────────── */
  const addToCart = (product: ProductListItem) => {
    setCart(prev => {
      const existing = prev.find(l => l.product.id === product.id);
      if (existing) {
        return prev.map(l =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const changeQty = (productId: number, delta: number) => {
    setCart(prev =>
      prev
        .map(l =>
          l.product.id === productId
            ? { ...l, quantity: Math.max(0, l.quantity + delta) }
            : l
        )
        .filter(l => l.quantity > 0)
    );
  };

  const removeFromCart = (productId: number) =>
    setCart(prev => prev.filter(l => l.product.id !== productId));

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (sum, l) => sum + l.quantity * Number(l.product.sales_price),
        0
      ),
    [cart]
  );

  /* ── submit order ───────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!channelId || cart.length === 0) return;
    setSubmitting(true);
    setErrorMsg(null);

    const selectedClient = clientId
      ? clients.find(c => c.id === Number(clientId))
      : null;

    const payload: POSOrderCreateRequest = {
      sales_channel: Number(channelId),
      billing: selectedClient
        ? {
            email: selectedClient.email,
            first_name: selectedClient.first_name,
            last_name: selectedClient.last_name,
            phone: selectedClient.phone,
            city: selectedClient.city,
          }
        : undefined,
      line_items: cart.map(l => ({
        local_product_id: l.product.id,
        name: l.product.name,
        sku: l.product.barcode ?? '',
        quantity: l.quantity,
        price: l.product.sales_price,
        total: (l.quantity * Number(l.product.sales_price)).toFixed(2),
      })),
      payment_method: paymentMethod,
      payment_method_title: paymentMethod === 'cash' ? 'Cash' : paymentMethod,
      customer_note: customerNote,
      status: 'completed',
      total: cartTotal.toFixed(2),
    };

    try {
      const result = await orderService.createPOS(payload);
      setSuccessOrder(result.order_number);
      setCart([]);
      setCustomerNote('');
      setClientId('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── render ──────────────────────────────────────────────────────────── */
  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading POS data…
      </div>
    );
  }

  return (
    <div className="flex gap-6 p-6 h-[calc(100vh-64px)]">
      {/* ── LEFT: product browser ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IconCash className="h-6 w-6" /> Point of Sale
          </h1>
          <p className="text-muted-foreground text-sm">
            Select products, add to cart, submit order
          </p>
        </div>

        {/* channel picker */}
        <div className="flex gap-3 items-end">
          <div className="w-60">
            <Label className="text-xs">Sales Channel *</Label>
            <Select
              value={channelId}
              onValueChange={v => {
                setChannelId(v);
                setCart([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map(ch => (
                  <SelectItem key={ch.id} value={String(ch.id)}>
                    {ch.name} ({ch.channel_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or barcode…"
              className="pl-9"
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              disabled={!channelId}
            />
          </div>
        </div>

        {/* product grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {!channelId && (
            <p className="col-span-full text-center text-muted-foreground py-10">
              Select a sales channel to see products
            </p>
          )}
          {channelId && channelProducts.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-10">
              No products found
            </p>
          )}
          {channelProducts.map(p => (
            <Card
              key={p.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => addToCart(p)}
            >
              {p.image_url ? (
                <img
                  src={getMediaUrl(p.image_url)}
                  alt={p.name}
                  className="h-24 w-full object-cover rounded-t-lg"
                  loading="lazy"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget
                      .nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : (
                <div className="h-24 bg-muted flex items-center justify-center rounded-t-lg text-muted-foreground text-xs">
                  No image
                </div>
              )}
              {p.image_url ? (
                <div
                  className="h-24 bg-muted items-center justify-center rounded-t-lg text-muted-foreground text-xs"
                  style={{ display: 'none' }}
                >
                  No image
                </div>
              ) : null}
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.barcode || '—'}
                </p>
                <p className="text-sm font-bold mt-1">TND {p.sales_price}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── RIGHT: cart ────────────────────────────────────────────────── */}
      <div className="w-[420px] flex flex-col gap-4 border-l pl-6 overflow-hidden">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <IconShoppingCart className="h-5 w-5" /> Cart
          <Badge variant="outline" className="ml-auto">
            {cart.length} items
          </Badge>
        </h2>

        {/* cart table */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">
              Cart is empty
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-xs">SKU</TableHead>
                  <TableHead className="text-right text-xs">Price</TableHead>
                  <TableHead className="text-center text-xs">Qty</TableHead>
                  <TableHead className="text-right text-xs">Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map(l => (
                  <CartRow
                    key={l.product.id}
                    line={l}
                    onQty={changeQty}
                    onRemove={removeFromCart}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* customer */}
        <div>
          <Label className="text-xs">Customer (optional)</Label>
          <Select
            value={clientId || '__walk_in__'}
            onValueChange={v => setClientId(v === '__walk_in__' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Walk-in customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__walk_in__">Walk-in</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.full_name} ({c.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* payment & note */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Label className="text-xs">Payment</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Note</Label>
          <Textarea
            rows={2}
            value={customerNote}
            onChange={e => setCustomerNote(e.target.value)}
            placeholder="Optional note…"
          />
        </div>

        {/* total & submit */}
        <div className="border-t pt-3">
          <div className="flex justify-between text-lg font-bold mb-3">
            <span>Total</span>
            <span>TND {cartTotal.toFixed(2)}</span>
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={cart.length === 0 || !channelId || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              'Processing…'
            ) : (
              <>
                <IconReceipt className="h-5 w-5 mr-2" /> Place Order
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── success dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!successOrder} onOpenChange={() => setSuccessOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" /> Order Placed
            </DialogTitle>
            <DialogDescription>
              Order <strong>{successOrder}</strong> has been created
              successfully.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setSuccessOrder(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── error dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!errorMsg} onOpenChange={() => setErrorMsg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Error</DialogTitle>
            <DialogDescription>{errorMsg}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setErrorMsg(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
