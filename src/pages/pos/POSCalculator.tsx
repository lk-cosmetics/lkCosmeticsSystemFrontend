import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { fmtTND } from './types';

const DENOMINATIONS = [0.5, 1, 5, 10, 20, 50] as const;

interface POSCalculatorProps {
  total: number;
  amountReceived: number;
  onAmountChange: (amount: number) => void;
}

export function POSCalculator({
  total,
  amountReceived,
  onAmountChange,
}: POSCalculatorProps) {
  const change = amountReceived - total;
  const isShort = change < -0.001;
  const isExact = Math.abs(change) < 0.001;
  const hasChange = change > 0.001;

  return (
    <div className="space-y-2.5 p-3 rounded-lg bg-muted/50 border">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Amount Received</Label>
        {amountReceived > 0 && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-5"
            onClick={() => onAmountChange(0)}
            aria-label="Clear amount"
          >
            <X className="size-3" />
          </Button>
        )}
      </div>

      <Input
        type="number"
        min={0}
        step="0.001"
        value={amountReceived || ''}
        onChange={e => onAmountChange(Number(e.target.value) || 0)}
        placeholder="0.000"
        className="text-lg font-semibold tabular-nums h-10"
      />

      {/* Quick denomination buttons */}
      <div className="flex flex-wrap gap-1.5">
        {DENOMINATIONS.map(d => (
          <Button
            key={d}
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs font-medium"
            onClick={() => onAmountChange(amountReceived + d)}
          >
            +{d}
          </Button>
        ))}
        <Button
          variant="secondary"
          size="sm"
          className="h-7 px-2.5 text-xs font-medium"
          onClick={() => onAmountChange(Math.ceil(total))}
        >
          Exact
        </Button>
      </div>

      <Separator />

      {/* Change Display */}
      <div
        className={`text-center py-1.5 rounded-md font-semibold text-sm ${
          amountReceived === 0
            ? 'text-muted-foreground bg-transparent'
            : isExact
              ? 'text-primary bg-primary/10'
              : isShort
                ? 'text-destructive bg-destructive/10'
                : 'text-green-600 bg-green-600/10'
        }`}
      >
        {amountReceived === 0
          ? 'Enter amount received'
          : isExact
            ? 'Exact amount'
            : isShort
              ? `Missing: ${fmtTND(Math.abs(change))} TND`
              : `Change (Be9i): ${fmtTND(change)} TND`}
      </div>

      {/* Quick total reference */}
      {hasChange && (
        <p className="text-[11px] text-center text-muted-foreground">
          {fmtTND(amountReceived)} − {fmtTND(total)} = {fmtTND(change)}
        </p>
      )}
    </div>
  );
}
