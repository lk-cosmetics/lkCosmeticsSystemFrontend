import type { ProductListItem, OrderDetail, SalesChannel, Client } from '@/types';

/* ── Cart ──────────────────────────────────────────────────────────────── */

export interface CartLine {
  product: ProductListItem;
  quantity: number;
}

/* ── Print ─────────────────────────────────────────────────────────────── */

export interface PrintableOrderData {
  order: OrderDetail;
  channel: SalesChannel | undefined;
  client: Client | undefined;
  paymentMethod: string;
  amountReceived: number;
  changeAmount: number;
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

/** Resolve the effective selling price (promo when active, else regular). */
export function getEffectivePrice(product: ProductListItem): number {
  const promo = Number(product.promotion_price);
  if (promo > 0) return promo;
  return Number(product.sales_price);
}

/** Format a number as TND with 3 decimals. */
export function fmtTND(n: number): string {
  return n.toFixed(3);
}
