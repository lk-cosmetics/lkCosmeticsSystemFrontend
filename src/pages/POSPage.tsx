/**
 * POSPage – Modern POS cashier UI.
 *
 * Product adding: 3 methods
 *   1. Hardware barcode scanner (keyboard interception)
 *   2. Camera barcode scanning (BarcodeDetector API)
 *   3. Manual product grid click
 *
 * Customer handling:
 *   - No default customer (starts null)
 *   - User can: select existing, add new, or skip
 *   - Order validation: if neither selected nor skipped → prompt dialog
 *
 * Layout: desktop side-by-side, mobile bottom drawer.
 */
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Loader2, ShoppingCart, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDebounce } from '@/hooks/useDebounce';
import { useInfiniteProducts } from '@/hooks/queries/useProducts';

import { salesChannelService } from '@/services/salesChannel.service';
import { clientService } from '@/services/client.service';
import { orderService } from '@/services/order.service';
import { productService } from '@/services/product.service';
import type {
  ProductListItem,
  SalesChannel,
  Client,
  OrderDetail,
  POSOrderCreateRequest,
} from '@/types';

import { POSProductGrid } from './pos/POSProductGrid';
import { POSCart } from './pos/POSCart';
import { POSPostOrderDialog } from './pos/POSPostOrderDialog';
import { POSReceiptPrint } from './pos/POSReceiptPrint';
import { POSInvoicePrint } from './pos/POSInvoicePrint';
import { POSCameraScanner } from './pos/POSCameraScanner';
import { POSAddClientDialog } from './pos/POSAddClientDialog';
import { POSClientPromptDialog } from './pos/POSClientPromptDialog';
import {
  getEffectivePrice,
  fmtTND,
  type CartLine,
  type PrintableOrderData,
} from './pos/types';

import './pos/pos-print.css';

/* ═══════════════════════════════════════════════════════════════════════ */

export default function POSPage() {
  const isMobile = useIsMobile();

  /* ── Data sources ──────────────────────────────────────────────────── */
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  /* ── Selections ────────────────────────────────────────────────────── */
  const [channelId, setChannelId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const debouncedProductSearch = useDebounce(productSearch, 500);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerNote, setCustomerNote] = useState('');

  /* ── Customer state (no default — starts null) ─────────────────────── */
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSkipped, setClientSkipped] = useState(false);

  /* ── Cart ───────────────────────────────────────────────────────────── */
  const [cart, setCart] = useState<CartLine[]>([]);
  const [amountReceived, setAmountReceived] = useState(0);

  /* ── Order submission ──────────────────────────────────────────────── */
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ── Post-order flow ───────────────────────────────────────────────── */
  const [completedOrder, setCompletedOrder] = useState<OrderDetail | null>(null);
  const [printData, setPrintData] = useState<PrintableOrderData | null>(null);
  const [printMode, setPrintMode] = useState<'receipt' | 'invoice' | null>(null);

  /* ── Mobile drawer ─────────────────────────────────────────────────── */
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  /* ── Dialog states ─────────────────────────────────────────────────── */
  const [cameraOpen, setCameraOpen] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [clientPromptOpen, setClientPromptOpen] = useState(false);

  /* ── Camera scanner feedback ───────────────────────────────────────── */
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [scanFeedbackType, setScanFeedbackType] = useState<'success' | 'error' | null>(null);

  /* ── Barcode scanner buffer (hardware scanner) ─────────────────────── */
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* ── Load reference data ───────────────────────────────────────────── */
  const fetchRef = useCallback(async () => {
    setDataLoading(true);
    try {
      const [chRes, clRes] = await Promise.all([
        salesChannelService.getAllChannels(),
        clientService.getAll({ page_size: 1000 }),
      ]);
      setChannels(chRes);
      setClients(Array.isArray(clRes) ? clRes : clRes.results);
    } catch (err) {
      console.error('Failed to load POS data:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRef();
  }, [fetchRef]);

  /* ── Channel-filtered products ─────────────────────────────────────── */
  const selectedChannel = channels.find(c => c.id === Number(channelId));
  const productQueryParams = useMemo(() => {
    if (!channelId || !selectedChannel) return { enabled: false as const };
    // Products are brand-scoped. Filtering by brand guarantees the list
    // matches the selected sales channel's brand for all channel types.
    return { brand: selectedChannel.brand, enabled: true as const };
  }, [channelId, selectedChannel]);

  const {
    data: productsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isProductsLoading,
  } = useInfiniteProducts({
    ...productQueryParams,
    search: debouncedProductSearch || undefined,
    page_size: 20,
  });

  const channelProducts = useMemo(() => {
    if (!channelId || !productsData?.pages) return [];
    return productsData.pages.flatMap(page => page?.results ?? []);
  }, [channelId, productsData?.pages]);

  /* ── Cart quantity map (for product card badges) ───────────────────── */
  const cartQuantities = useMemo(
    () => new Map(cart.map(l => [l.product.id, l.quantity])),
    [cart],
  );

  /* ── Cart helpers ──────────────────────────────────────────────────── */
  const addToCart = useCallback((product: ProductListItem) => {
    setCart(prev => {
      const existing = prev.find(l => l.product.id === product.id);
      if (existing) {
        return prev.map(l =>
          l.product.id === product.id
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const changeQty = useCallback((productId: number, delta: number) => {
    setCart(prev =>
      prev
        .map(l =>
          l.product.id === productId
            ? { ...l, quantity: Math.max(0, l.quantity + delta) }
            : l,
        )
        .filter(l => l.quantity > 0),
    );
  }, []);

  const removeFromCart = useCallback(
    (productId: number) =>
      setCart(prev => prev.filter(l => l.product.id !== productId)),
    [],
  );

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.quantity * getEffectivePrice(l.product), 0),
    [cart],
  );

  const cartItemCount = useMemo(
    () => cart.reduce((sum, l) => sum + l.quantity, 0),
    [cart],
  );

  const changeAmount = useMemo(
    () => Math.max(0, amountReceived - cartTotal),
    [amountReceived, cartTotal],
  );

  /* ── Customer handlers ─────────────────────────────────────────────── */
  const handleSelectClient = useCallback((client: Client) => {
    setSelectedClient(client);
    setClientSkipped(false);
  }, []);

  const handleSkipClient = useCallback(() => {
    setSelectedClient(null);
    setClientSkipped(true);
  }, []);

  const handleClearClient = useCallback(() => {
    setSelectedClient(null);
    setClientSkipped(false);
  }, []);

  const handleClientCreated = useCallback((client: Client) => {
    setClients(prev => [client, ...prev]);
    setSelectedClient(client);
    setClientSkipped(false);
  }, []);

  /* ── Barcode handler (shared by hardware scanner + camera) ─────────── */
  const handleBarcodeDetected = useCallback(
    async (barcode: string) => {
      // 1. Try local match first (faster, no network)
      const localMatch = channelProducts.find(
        p => p.barcode?.toLowerCase() === barcode.toLowerCase(),
      );
      if (localMatch) {
        addToCart(localMatch);
        setScanFeedback(`✓ ${localMatch.name} added`);
        setScanFeedbackType('success');
        return;
      }

      // 2. Try API barcode search
      const apiResult = await productService.searchByBarcode(barcode);
      if (apiResult) {
        addToCart(apiResult);
        setScanFeedback(`✓ ${apiResult.name} added`);
        setScanFeedbackType('success');
        return;
      }

      // 3. Not found
      setScanFeedback(`✗ Barcode "${barcode}" not found`);
      setScanFeedbackType('error');
    },
    [channelProducts, addToCart],
  );

  /* ── Hardware barcode scanner (keyboard input detection) ────────────── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable;

      if (isInput) return;

      if (e.key === 'Enter' && barcodeBuffer.current.length >= 3) {
        const barcode = barcodeBuffer.current;
        barcodeBuffer.current = '';
        handleBarcodeDetected(barcode);
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => {
          barcodeBuffer.current = '';
        }, 150);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(barcodeTimer.current);
    };
  }, [handleBarcodeDetected]);

  // Clear scan feedback after 3 seconds
  useEffect(() => {
    if (!scanFeedback) return;
    const t = setTimeout(() => {
      setScanFeedback(null);
      setScanFeedbackType(null);
    }, 3000);
    return () => clearTimeout(t);
  }, [scanFeedback]);

  /* ── Submit order ──────────────────────────────────────────────────── */
  const executeSubmit = useCallback(async () => {
    if (!channelId || cart.length === 0) return;
    setSubmitting(true);
    setErrorMsg(null);

    const currentChannel = channels.find(c => c.id === Number(channelId));

    const payload: POSOrderCreateRequest = {
      sales_channel: Number(channelId),
      billing: selectedClient
        ? {
            email: selectedClient.email,
            first_name: selectedClient.first_name,
            last_name: selectedClient.last_name,
            phone: selectedClient.phone ?? undefined,
            city: selectedClient.city,
          }
        : undefined,
      line_items: cart.map(l => ({
        local_product_id: l.product.id,
        name: l.product.name,
        sku: l.product.barcode ?? '',
        quantity: l.quantity,
        price: getEffectivePrice(l.product).toFixed(2),
        total: (l.quantity * getEffectivePrice(l.product)).toFixed(2),
      })),
      payment_method: paymentMethod,
      payment_method_title:
        paymentMethod === 'cash'
          ? 'Cash'
          : paymentMethod === 'card'
            ? 'Card'
            : 'Bank Transfer',
      customer_note: customerNote,
      status: 'completed',
      total: cartTotal.toFixed(2),
    };

    try {
      const result = await orderService.createPOS(payload);

      // Snapshot print data BEFORE clearing state
      setPrintData({
        order: result,
        channel: currentChannel,
        client: selectedClient ?? undefined,
        paymentMethod,
        amountReceived,
        changeAmount,
      });

      setCompletedOrder(result);

      // Reset form state
      setCart([]);
      setCustomerNote('');
      setSelectedClient(null);
      setClientSkipped(false);
      if (isMobile) setCartDrawerOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    channelId, cart, selectedClient, channels,
    paymentMethod, customerNote, cartTotal, amountReceived, changeAmount,
    isMobile,
  ]);

  const handleSubmit = useCallback(() => {
    // If customer not selected AND not skipped → show prompt
    if (!selectedClient && !clientSkipped) {
      setClientPromptOpen(true);
      return;
    }
    executeSubmit();
  }, [selectedClient, clientSkipped, executeSubmit]);

  // Called from the prompt dialog when user chooses "Skip"
  const handlePromptSkipAndSubmit = useCallback(() => {
    setClientSkipped(true);
    // Need to execute submit after state update
    setTimeout(() => executeSubmit(), 0);
  }, [executeSubmit]);

  /* ── Print handlers ────────────────────────────────────────────────── */
  const handlePrint = useCallback((mode: 'receipt' | 'invoice') => {
    setPrintMode(mode);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }, []);

  const handleClosePostOrder = useCallback(() => {
    setCompletedOrder(null);
    setPrintData(null);
    setPrintMode(null);
    setAmountReceived(0);
  }, []);

  useEffect(() => {
    const handler = () => setPrintMode(null);
    window.addEventListener('afterprint', handler);
    return () => window.removeEventListener('afterprint', handler);
  }, []);

  /* ── Channel change handler ────────────────────────────────────────── */
  const handleChannelChange = useCallback((v: string) => {
    setChannelId(v);
    setCart([]);
    setAmountReceived(0);
  }, []);

  /* ── Shared cart props ─────────────────────────────────────────────── */
  const cartProps = {
    cart,
    cartTotal,
    cartItemCount,
    onQtyChange: changeQty,
    onRemove: removeFromCart,
    onClearCart: clearCart,
    clients,
    selectedClient,
    clientSkipped,
    onSelectClient: handleSelectClient,
    onSkipClient: handleSkipClient,
    onClearClient: handleClearClient,
    onAddClientClick: () => setAddClientOpen(true),
    paymentMethod,
    onPaymentMethodChange: setPaymentMethod,
    customerNote,
    onNoteChange: setCustomerNote,
    amountReceived,
    onAmountReceivedChange: setAmountReceived,
    onSubmit: handleSubmit,
    submitting,
    disabled: cart.length === 0 || !channelId,
  };

  /* ── Loading state ─────────────────────────────────────────────────── */
  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="size-5 animate-spin" />
        Loading POS...
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-var(--header-height))]">
        {/* ── LEFT: Product Browser ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col p-3 lg:p-5 min-h-0 overflow-hidden">
          <POSProductGrid
            channels={channels}
            channelId={channelId}
            onChannelChange={handleChannelChange}
            productSearch={productSearch}
            onSearchChange={setProductSearch}
            products={channelProducts}
            cartQuantities={cartQuantities}
            onAddToCart={addToCart}
            onCameraScan={() => setCameraOpen(true)}
            isLoading={isProductsLoading}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            fetchNextPage={fetchNextPage}
          />
        </div>

        {/* ── RIGHT: Cart (desktop only) ─────────────────────────────── */}
        {!isMobile && (
          <div className="w-[380px] xl:w-[420px] border-l bg-card flex flex-col p-4 min-h-0">
            <POSCart {...cartProps} />
          </div>
        )}

        {/* ── Mobile: Sticky bottom bar ──────────────────────────────── */}
        {isMobile && (
          <div className="sticky bottom-0 z-30 bg-background border-t px-4 py-3 flex items-center gap-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold tabular-nums truncate">
                {fmtTND(cartTotal)}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  TND
                </span>
              </p>
            </div>
            <Button
              className="gap-2 h-11 px-5"
              onClick={() => setCartDrawerOpen(true)}
            >
              <ShoppingCart className="size-4" />
              Cart
              {cartItemCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 bg-white/20 text-white text-xs px-1.5 py-0"
                >
                  {cartItemCount}
                </Badge>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ── Mobile: Cart Drawer ───────────────────────────────────────── */}
      {isMobile && (
        <Drawer
          open={cartDrawerOpen}
          onOpenChange={setCartDrawerOpen}
          direction="bottom"
        >
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>Shopping Cart</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
              <POSCart {...cartProps} />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* ── Camera barcode scanner ─────────────────────────────────── */}
      <POSCameraScanner
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onBarcodeDetected={handleBarcodeDetected}
        feedbackMessage={scanFeedback}
        feedbackType={scanFeedbackType}
      />

      {/* ── Add client dialog ──────────────────────────────────────── */}
      <POSAddClientDialog
        open={addClientOpen}
        onOpenChange={setAddClientOpen}
        channel={selectedChannel}
        onClientCreated={handleClientCreated}
      />

      {/* ── Client prompt dialog (order validation) ────────────────── */}
      <POSClientPromptDialog
        open={clientPromptOpen}
        onOpenChange={setClientPromptOpen}
        onSelectClient={handleClearClient} // Opens customer section in default state
        onAddClient={() => setAddClientOpen(true)}
        onSkip={handlePromptSkipAndSubmit}
      />

      {/* ── Post-order dialog ────────────────────────────────────────── */}
      <POSPostOrderDialog
        order={completedOrder}
        onClose={handleClosePostOrder}
        onPrintReceipt={() => handlePrint('receipt')}
        onPrintInvoice={() => handlePrint('invoice')}
      />

      {/* ── Error dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!errorMsg} onOpenChange={() => setErrorMsg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Error
            </DialogTitle>
            <DialogDescription>{errorMsg}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setErrorMsg(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Hidden print targets ─────────────────────────────────────── */}
      {printMode === 'receipt' && printData && (
        <POSReceiptPrint data={printData} />
      )}
      {printMode === 'invoice' && printData && (
        <POSInvoicePrint data={printData} />
      )}
    </>
  );
}
