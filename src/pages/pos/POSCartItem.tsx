import { memo } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEffectivePrice, fmtTND } from './types';
import type { CartLine } from './types';

interface POSCartItemProps {
  line: CartLine;
  onQty: (productId: number, delta: number) => void;
  onRemove: (productId: number) => void;
  getPrice?: (product: CartLine['product']) => number;
}

export const POSCartItem = memo(function POSCartItem({
  line,
  onQty,
  onRemove,
  getPrice,
}: POSCartItemProps) {
  const originalPrice = getEffectivePrice(line.product);
  const unitPrice = getPrice ? getPrice(line.product) : originalPrice;
  const hasDiscount = unitPrice < originalPrice - 0.001;
  const lineTotal = fmtTND(line.quantity * unitPrice);

  return (
    <div className="flex items-center gap-2 py-2 px-1 group hover:bg-muted/50 rounded-md transition-colors">
      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{line.product.name}</p>

        {/* Price display */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className={`text-[11px] font-medium ${hasDiscount ? 'text-rose-600' : 'text-muted-foreground'}`}>
            {fmtTND(unitPrice)} TND
          </p>
          {hasDiscount && (
            <p className="text-[10px] text-muted-foreground line-through">
              {fmtTND(originalPrice)}
            </p>
          )}
        </div>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-xs"
          className="size-7 rounded-full"
          onClick={() => onQty(line.product.id, -1)}
          aria-label={`Decrease ${line.product.name}`}
        >
          <Minus className="size-3" />
        </Button>
        <span className="w-7 text-center text-sm font-semibold tabular-nums">
          {line.quantity}
        </span>
        <Button
          variant="outline"
          size="icon-xs"
          className="size-7 rounded-full"
          onClick={() => onQty(line.product.id, 1)}
          aria-label={`Increase ${line.product.name}`}
        >
          <Plus className="size-3" />
        </Button>
      </div>

      {/* Line Total */}
      <span className={`w-20 text-right text-sm font-semibold tabular-nums ${hasDiscount ? 'text-rose-600' : ''}`}>
        {lineTotal}
      </span>

      {/* Remove */}
      <Button
        variant="ghost"
        size="icon-xs"
        className="size-6 text-muted-foreground/40 hover:text-destructive
          group-hover:text-destructive transition-colors"
        onClick={() => onRemove(line.product.id)}
        aria-label={`Remove ${line.product.name}`}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
});
