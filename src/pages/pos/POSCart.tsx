import {
  ShoppingCart,
  User,
  CreditCard,
  Banknote,
  Building2,
  Loader2,
  Receipt,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { POSCartItem } from './POSCartItem';
import { POSCalculator } from './POSCalculator';
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
  cartItemCount: number;
  onQtyChange: (productId: number, delta: number) => void;
  onRemove: (productId: number) => void;
  onClearCart: () => void;
  clients: Client[];
  clientId: string;
  onClientChange: (value: string) => void;
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
  cartItemCount,
  onQtyChange,
  onRemove,
  onClearCart,
  clients,
  clientId,
  onClientChange,
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
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* ── Checkout section (only when cart has items) ──────────────── */}
      {hasItems && (
        <>
          <Separator />

          {/* Customer */}
          <div>
            <Label className="text-xs mb-1 block">Customer</Label>
            <Select
              value={clientId || '__walk_in__'}
              onValueChange={v => onClientChange(v === '__walk_in__' ? '' : v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Walk-in" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__walk_in__">
                  <div className="flex items-center gap-2">
                    <User className="size-3.5" />
                    Walk-in customer
                  </div>
                </SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* ── Total & Submit ──────────────────────────────────────── */}
          <div className="border-t pt-3 space-y-2.5">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-bold tabular-nums">
                {fmtTND(cartTotal)}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  TND
                </span>
              </span>
            </div>
            <Button
              className="w-full h-11 text-sm font-semibold gap-2"
              size="lg"
              disabled={disabled || submitting}
              onClick={onSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processing...
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
