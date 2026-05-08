import {
  ShoppingCart,
  CreditCard,
  Banknote,
  Building2,
  Loader2,
  Receipt,
  Trash2,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { POSCartItem } from './POSCartItem';
import { POSCalculator } from './POSCalculator';
import { POSCustomerSection } from './POSCustomerSection';
import { fmtTND } from './types';
import type { Client } from '@/types';
import type { CartLine } from './types';

/* ── Payment options ───────────────────────────────────────────────────── */

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'bank_transfer', label: 'Transfer', icon: Building2 },
] as const;

/* ── Props ─────────────────────────────────────────────────────────────── */

interface POSCartProps {
  cart: CartLine[];
  cartTotal: number;
  cartOriginalTotal: number;
  cartItemCount: number;
  onQtyChange: (productId: number, delta: number) => void;
  onRemove: (productId: number) => void;
  onClearCart: () => void;
  getPrice?: (product: CartLine['product']) => number;
  /* Customer handling */
  clients: Client[];
  selectedClient: Client | null;
  clientSkipped: boolean;
  onSelectClient: (client: Client) => void;
  onSkipClient: () => void;
  onClearClient: () => void;
  onAddClientClick: () => void;
  canAddClient?: boolean;
  /* Payment & checkout */
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  customerNote: string;
  onNoteChange: (value: string) => void;
  amountReceived: number;
  onAmountReceivedChange: (amount: number) => void;
  onSubmit: () => void;
  submitting: boolean;
  disabled: boolean;
}

/* ── Component ─────────────────────────────────────────────────────────── */

export function POSCart({
  cart,
  cartTotal,
  cartOriginalTotal,
  cartItemCount,
  onQtyChange,
  onRemove,
  onClearCart,
  getPrice,
  clients,
  selectedClient,
  clientSkipped,
  onSelectClient,
  onSkipClient,
  onClearClient,
  onAddClientClick,
  canAddClient = true,
  paymentMethod,
  onPaymentMethodChange,
  customerNote,
  onNoteChange,
  amountReceived,
  onAmountReceivedChange,
  onSubmit,
  submitting,
  disabled,
}: POSCartProps) {
  const hasItems = cart.length > 0;
  const savings = Math.max(0, cartOriginalTotal - cartTotal);
  const hasDiscount = savings > 0.001;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="size-4" />
          <span className="font-semibold text-sm">Cart</span>
          {cartItemCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {cartItemCount}
            </Badge>
          )}
        </div>
        {hasItems && (
          <Button
            variant="ghost"
            size="xs"
            className="text-destructive hover:text-destructive gap-1"
            onClick={onClearCart}
          >
            <Trash2 className="size-3" />
            Clear
          </Button>
        )}
      </div>

      {/* ── Items list ──────────────────────────────────────────────── */}
      <ScrollArea className="flex-1 min-h-0 -mx-1">
        {!hasItems ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ShoppingCart className="size-8 mb-2 opacity-30" />
            <p className="text-sm">Cart is empty</p>
            <p className="text-xs mt-1">Tap a product to add it</p>
          </div>
        ) : (
          <div className="space-y-0.5 px-1">
            {cart.map(line => (
              <POSCartItem
                key={line.product.id}
                line={line}
                onQty={onQtyChange}
                onRemove={onRemove}
                getPrice={getPrice}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* ── Checkout section ────────────────────────────────────────── */}
      {hasItems && (
        <>
          <Separator />

          {/* Customer */}
          <div>
            <Label className="text-xs mb-1.5 block">Customer</Label>
            <POSCustomerSection
              clients={clients}
              selectedClient={selectedClient}
              clientSkipped={clientSkipped}
              onSelectClient={onSelectClient}
              onSkipClient={onSkipClient}
              onClearClient={onClearClient}
              onAddClientClick={onAddClientClick}
              canAddClient={canAddClient}
            />
          </div>

          {/* Payment Method */}
          <div>
            <Label className="text-xs mb-1 block">Payment</Label>
            <div className="flex gap-1.5">
              {PAYMENT_METHODS.map(pm => {
                const Icon = pm.icon;
                const isActive = paymentMethod === pm.value;
                return (
                  <Button
                    key={pm.value}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 gap-1.5 h-8 text-xs"
                    onClick={() => onPaymentMethodChange(pm.value)}
                  >
                    <Icon className="size-3.5" />
                    {pm.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <Label className="text-xs mb-1 block">Note</Label>
            <Textarea
              rows={2}
              value={customerNote}
              onChange={e => onNoteChange(e.target.value)}
              placeholder="Optional note..."
              className="text-sm resize-none"
            />
          </div>

          {/* Calculator (cash only) */}
          {paymentMethod === 'cash' && (
            <POSCalculator
              total={cartTotal}
              amountReceived={amountReceived}
              onAmountChange={onAmountReceivedChange}
            />
          )}

          {/* ── Totals & Submit ─────────────────────────────────────── */}
          <div className="border-t pt-3 space-y-1.5">

            {/* Subtotal row — only when a discount applies */}
            {hasDiscount && (
              <div className="flex justify-between items-baseline text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums line-through">
                  {fmtTND(cartOriginalTotal)} TND
                </span>
              </div>
            )}

            {/* Savings row */}
            {hasDiscount && (
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                  <Tag className="size-3.5" />
                  Promotions
                </span>
                <span className="text-sm font-semibold text-green-600 tabular-nums">
                  −{fmtTND(savings)} TND
                </span>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-baseline pt-0.5">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className={`text-xl font-bold tabular-nums ${hasDiscount ? 'text-green-600' : ''}`}>
                {fmtTND(cartTotal)}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  TND
                </span>
              </span>
            </div>

            <Button
              className="w-full h-11 text-sm font-semibold gap-2 mt-1"
              size="lg"
              disabled={disabled || submitting}
              onClick={onSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Applying promotions &amp; processing…
                </>
              ) : (
                <>
                  <Receipt className="size-4" />
                  Place Order — {fmtTND(cartTotal)} TND
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
