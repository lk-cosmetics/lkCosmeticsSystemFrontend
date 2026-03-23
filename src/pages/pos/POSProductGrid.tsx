import { useEffect, useRef } from 'react';
import { Search, Store, Loader2, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { POSProductCard } from './POSProductCard';
import type { ProductListItem, SalesChannel } from '@/types';

interface POSProductGridProps {
  channels: SalesChannel[];
  channelId: string;
  onChannelChange: (value: string) => void;
  productSearch: string;
  onSearchChange: (value: string) => void;
  products: ProductListItem[];
  cartQuantities: Map<number, number>;
  onAddToCart: (product: ProductListItem) => void;
  onCameraScan: () => void;
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
}

export function POSProductGrid({
  channels,
  channelId,
  onChannelChange,
  productSearch,
  onSearchChange,
  products,
  cartQuantities,
  onAddToCart,
  onCameraScan,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
}: POSProductGridProps) {
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = loadMoreSentinelRef.current;
    if (!node || !hasNextPage || !fetchNextPage) return;

    const observer = new IntersectionObserver(
      entries => {
        const [entry] = entries;
        if (!entry.isIntersecting || isFetchingNextPage) return;
        fetchNextPage();
      },
      { root: null, rootMargin: '200px', threshold: 0.1 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="flex flex-col gap-3 min-h-0 flex-1">
      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="w-full sm:w-56">
          <Label className="text-xs mb-1 block">Sales Channel</Label>
          <Select value={channelId} onValueChange={onChannelChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select channel..." />
            </SelectTrigger>
            <SelectContent>
              {channels.map(ch => (
                <SelectItem key={ch.id} value={String(ch.id)}>
                  <div className="flex items-center gap-2">
                    <Store className="size-3.5 text-muted-foreground" />
                    {ch.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Label className="text-xs mb-1 block">Search Products</Label>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or barcode..."
                className="pl-9"
                value={productSearch}
                onChange={e => onSearchChange(e.target.value)}
                disabled={!channelId}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 size-9"
              onClick={onCameraScan}
              disabled={!channelId}
              aria-label="Scan barcode with camera"
              title="Scan with Camera"
            >
              <Camera className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <ScrollArea className="flex-1 min-h-0">
        {!channelId ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Store className="size-10 mb-3 opacity-40" />
            <p className="text-sm">Select a sales channel to browse products</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-10 mb-3 opacity-40 animate-spin" />
            <p className="text-sm">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Search className="size-10 mb-3 opacity-40" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pr-2">
              {products.map(p => (
                <POSProductCard
                  key={p.id}
                  product={p}
                  cartQuantity={cartQuantities.get(p.id) ?? 0}
                  onAdd={() => onAddToCart(p)}
                />
              ))}
            </div>
            {hasNextPage && (
              <div className="mt-2 pr-2">
                <div ref={loadMoreSentinelRef} className="h-px w-full" aria-hidden="true" />
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNextPage?.()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Load More
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
