import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Eye,
  Search,
  Filter,
  MoreVertical,
  Package,
  ArrowUpDown,
  AlertTriangle,
  Plus,
  RefreshCw,
  ArrowRightLeft,
  Loader2,
  Minus,
  TrendingUp,
  TrendingDown,
  BarChart3,
  XCircle,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  PackagePlus,
  PackageMinus,
  Send,
  Factory,
  PackageCheck,
  FlaskConical,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  storeInventoryService,
  inventoryMovementService,
  billOfMaterialsService,
  productionBatchService,
} from '@/services/inventory.service';
import { salesChannelService } from '@/services/salesChannel.service';
import { productService } from '@/services/product.service';
import type {
  SalesChannelInventory,
  InventoryMovement,
  SalesChannel,
  MovementSummary,
  ProductListItem,
  MovementType,
  BillOfMaterials,
  ProductionBatch,
  InFactorySummary,
} from '@/types';

// ─── Helper ─────────────────────────────────────────────────────────────────
const extractErrorMessage = (error: unknown): string => {
  const defaultMsg = 'An error occurred. Please try again.';
  if (!error || typeof error !== 'object') return defaultMsg;
  const err = error as { response?: { data?: unknown }; message?: string };
  if (err.response?.data) {
    const data = err.response.data;
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const fieldErrors = Object.entries(
        data as Record<string, unknown>
      ).flatMap(([field, messages]) => {
        const name = field
          .split('_')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        if (Array.isArray(messages)) return messages.map(m => `${name}: ${m}`);
        return typeof messages === 'string' ? [`${name}: ${messages}`] : [];
      });
      if (fieldErrors.length > 0)
        return 'Validation errors:\n\n' + fieldErrors.join('\n');
      const d = data as { detail?: string; message?: string };
      return d.detail ?? d.message ?? defaultMsg;
    }
    if (typeof data === 'string') return data;
  }
  if (err.message?.includes('Network Error'))
    return 'Network error. Please check your connection.';
  if (err.message?.includes('timeout'))
    return 'Request timeout. Please try again.';
  return err.message ?? defaultMsg;
};

// ─── Movement type badges ───────────────────────────────────────────────────
function movementBadge(type: string) {
  const map: Record<
    string,
    {
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
      icon: React.ReactNode;
    }
  > = {
    PURCHASE: {
      variant: 'default',
      icon: <TrendingUp className="h-3 w-3 mr-1" />,
    },
    RETURN_IN: {
      variant: 'default',
      icon: <TrendingUp className="h-3 w-3 mr-1" />,
    },
    TRANSFER_IN: {
      variant: 'default',
      icon: <ArrowRightLeft className="h-3 w-3 mr-1" />,
    },
    ADJUSTMENT_IN: {
      variant: 'default',
      icon: <Plus className="h-3 w-3 mr-1" />,
    },
    INITIAL: {
      variant: 'secondary',
      icon: <Package className="h-3 w-3 mr-1" />,
    },
    SALE: {
      variant: 'destructive',
      icon: <TrendingDown className="h-3 w-3 mr-1" />,
    },
    RETURN_OUT: {
      variant: 'destructive',
      icon: <TrendingDown className="h-3 w-3 mr-1" />,
    },
    TRANSFER_OUT: {
      variant: 'outline',
      icon: <ArrowRightLeft className="h-3 w-3 mr-1" />,
    },
    ADJUSTMENT_OUT: {
      variant: 'outline',
      icon: <Minus className="h-3 w-3 mr-1" />,
    },
    DAMAGE: {
      variant: 'destructive',
      icon: <AlertTriangle className="h-3 w-3 mr-1" />,
    },
    SENT_TO_FACTORY: {
      variant: 'outline',
      icon: <Factory className="h-3 w-3 mr-1" />,
    },
    PRODUCTION_IN: {
      variant: 'default',
      icon: <PackageCheck className="h-3 w-3 mr-1" />,
    },
  };
  const m = map[type] ?? { variant: 'secondary' as const, icon: null };
  return (
    <Badge variant={m.variant} className="flex items-center w-fit text-xs">
      {m.icon}
      {type.split('_').join(' ')}
    </Badge>
  );
}

function statusBadge(status: string) {
  switch (status) {
    case 'COMPLETED':
      return (
        <Badge variant="default" className="flex items-center gap-1 w-fit">
          <CheckCircle2 className="h-3 w-3" /> Completed
        </Badge>
      );
    case 'PENDING':
      return (
        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
          <XCircle className="h-3 w-3" /> Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ─── Production batch status badge ──────────────────────────────────────────
function productionBatchStatusBadge(status: string) {
  switch (status) {
    case 'SENT_TO_FACTORY':
      return (
        <Badge className="flex items-center gap-1 w-fit bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
          <Factory className="h-3 w-3" /> Sent to Factory
        </Badge>
      );
    case 'PARTIALLY_RECEIVED':
      return (
        <Badge className="flex items-center gap-1 w-fit bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          <Clock className="h-3 w-3" /> Partially Received
        </Badge>
      );
    case 'COMPLETED':
      return (
        <Badge className="flex items-center gap-1 w-fit bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
          <CheckCircle2 className="h-3 w-3" /> Completed
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
          <XCircle className="h-3 w-3" /> Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="flex items-center gap-1 w-fit">
          <Clock className="h-3 w-3" /> Draft
        </Badge>
      );
  }
}

// ─── Stock status badge ─────────────────────────────────────────────────────
function stockStatusBadge(inv: {
  is_out_of_stock: boolean;
  is_low_stock: boolean;
}) {
  if (inv.is_out_of_stock) {
    return (
      <Badge variant="destructive" className="text-xs">
        Out of Stock
      </Badge>
    );
  }
  if (inv.is_low_stock) {
    return (
      <Badge
        variant="secondary"
        className="text-xs bg-amber-100 text-amber-800"
      >
        Low Stock
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-xs text-green-700 border-green-300"
    >
      In Stock
    </Badge>
  );
}

// ─── Filter helpers (outside component to reduce cognitive complexity) ───────
function filterInventoryItems(
  items: SalesChannelInventory[],
  query: string,
  channelId: string,
  stock: string
): SalesChannelInventory[] {
  let result = items;
  if (query) {
    const q = query.toLowerCase();
    result = result.filter(
      i =>
        i.product_name.toLowerCase().includes(q) ||
        i.sales_channel_name.toLowerCase().includes(q) ||
        i.product_barcode?.toLowerCase().includes(q) ||
        i.bin_location?.toLowerCase().includes(q)
    );
  }
  if (channelId !== 'all') {
    result = result.filter(i => i.sales_channel === Number(channelId));
  }
  if (stock === 'low') result = result.filter(i => i.is_low_stock);
  else if (stock === 'out') result = result.filter(i => i.is_out_of_stock);
  else if (stock === 'ok')
    result = result.filter(i => !i.is_low_stock && !i.is_out_of_stock);
  return result;
}

function filterMovementItems(
  items: InventoryMovement[],
  query: string,
  channelId: string,
  typeFilter: string,
  statusFilter: string
): InventoryMovement[] {
  let result = items;
  if (query) {
    const q = query.toLowerCase();
    result = result.filter(
      m =>
        m.product_name.toLowerCase().includes(q) ||
        m.sales_channel_name.toLowerCase().includes(q) ||
        m.reference_number.toLowerCase().includes(q)
    );
  }
  if (channelId !== 'all')
    result = result.filter(m => m.sales_channel === Number(channelId));
  if (typeFilter !== 'all')
    result = result.filter(m => m.movement_type === typeFilter);
  if (statusFilter !== 'all')
    result = result.filter(m => m.status === statusFilter);
  return result;
}

// ─── Tab-specific filter controls (extracted to reduce complexity) ───────────
function TabFilters({
  activeTab,
  stockFilter,
  setStockFilter,
  movementTypeFilter,
  setMovementTypeFilter,
  movementStatusFilter,
  setMovementStatusFilter,
}: Readonly<{
  activeTab: string;
  stockFilter: string;
  setStockFilter: (v: string) => void;
  movementTypeFilter: string;
  setMovementTypeFilter: (v: string) => void;
  movementStatusFilter: string;
  setMovementStatusFilter: (v: string) => void;
}>) {
  if (activeTab === 'inventory') {
    return (
      <div className="w-[160px]">
        <Label className="text-xs text-muted-foreground mb-1 block">
          Stock status
        </Label>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="ok">In Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (activeTab === 'movements') {
    return (
      <>
        <div className="w-[160px]">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Type
          </Label>
          <Select
            value={movementTypeFilter}
            onValueChange={setMovementTypeFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="PURCHASE">Purchase</SelectItem>
              <SelectItem value="SALE">Sale</SelectItem>
              <SelectItem value="TRANSFER_IN">Transfer In</SelectItem>
              <SelectItem value="TRANSFER_OUT">Transfer Out</SelectItem>
              <SelectItem value="ADJUSTMENT_IN">Adjustment In</SelectItem>
              <SelectItem value="ADJUSTMENT_OUT">Adjustment Out</SelectItem>
              <SelectItem value="RETURN_IN">Return In</SelectItem>
              <SelectItem value="RETURN_OUT">Return Out</SelectItem>
              <SelectItem value="DAMAGE">Damage</SelectItem>
              <SelectItem value="INITIAL">Initial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-[150px]">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Status
          </Label>
          <Select
            value={movementStatusFilter}
            onValueChange={setMovementStatusFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </>
    );
  }
  return null;
}

// ─── Inventory detail content (extracted to reduce complexity) ───────────────
function InventoryDetailContent({
  inv,
  onAdjust,
  onTransfer,
  onEdit,
}: Readonly<{
  inv: SalesChannelInventory;
  onAdjust: (i: SalesChannelInventory) => void;
  onTransfer: (i: SalesChannelInventory) => void;
  onEdit: (i: SalesChannelInventory) => void;
}>) {
  return (
    <>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mt-2">
        <div>
          <span className="text-muted-foreground block text-xs">Product</span>
          <p className="font-medium">{inv.product_name}</p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Barcode</span>
          <p className="font-mono">{inv.product_barcode}</p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Channel</span>
          <p className="font-medium">{inv.sales_channel_name}</p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">
            Channel Code
          </span>
          <p className="font-mono">{inv.sales_channel_code || '\u2014'}</p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Quantity</span>
          <p className="font-semibold text-lg">{inv.quantity}</p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Reserved</span>
          <p>{inv.reserved_quantity}</p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Available</span>
          <p className="text-green-600 font-semibold">
            {inv.available_quantity}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Min Qty</span>
          <p>{inv.minimum_quantity}</p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Max Qty</span>
          <p>{inv.maximum_quantity ?? '\u2014'}</p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">
            Bin Location
          </span>
          <p>{inv.bin_location || '\u2014'}</p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Company</span>
          <p>{inv.company_name}</p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">
            Last Counted
          </span>
          <p>
            {inv.last_counted_at
              ? new Date(inv.last_counted_at).toLocaleString()
              : '\u2014'}
          </p>
        </div>
      </div>
      <DialogFooter className="mt-4 gap-2">
        <Button size="sm" variant="outline" onClick={() => onAdjust(inv)}>
          <PackagePlus className="h-4 w-4 mr-1" /> Adjust
        </Button>
        <Button size="sm" variant="outline" onClick={() => onTransfer(inv)}>
          <ArrowRightLeft className="h-4 w-4 mr-1" /> Transfer
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(inv)}>
          <Pencil className="h-4 w-4 mr-1" /> Edit
        </Button>
      </DialogFooter>
    </>
  );
}

// ─── Movement detail content (extracted to reduce complexity) ────────────────
function MovementDetailContent({
  mov,
  onComplete,
}: Readonly<{
  mov: InventoryMovement;
  onComplete: (m: InventoryMovement) => void;
}>) {
  return (
    <>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mt-2">
        <div>
          <span className="text-muted-foreground block text-xs">Reference</span>
          <p className="font-mono">{mov.reference_number}</p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Type</span>
          <div className="mt-1">{movementBadge(mov.movement_type)}</div>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Product</span>
          <p className="font-medium">{mov.product_name}</p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Barcode</span>
          <p className="font-mono">{mov.product_barcode}</p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Channel</span>
          <p>{mov.sales_channel_name}</p>
        </div>
        {mov.destination_channel_name && (
          <div>
            <span className="text-muted-foreground block text-xs">
              Destination
            </span>
            <p>{mov.destination_channel_name}</p>
          </div>
        )}
        <div>
          <span className="text-muted-foreground block text-xs">Quantity</span>
          <p
            className={`font-semibold ${mov.is_stock_in ? 'text-green-600' : 'text-red-600'}`}
          >
            {mov.is_stock_in ? '+' : '-'}
            {mov.quantity}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Status</span>
          <div className="mt-1">{statusBadge(mov.status)}</div>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">Before</span>
          <p className="font-mono">{mov.quantity_before}</p>
        </div>
        <div>
          <span className="text-muted-foreground block text-xs">After</span>
          <p className="font-mono">{mov.quantity_after}</p>
        </div>
        {mov.unit_cost && (
          <div>
            <span className="text-muted-foreground block text-xs">
              Unit Cost
            </span>
            <p>{mov.unit_cost}</p>
          </div>
        )}
        {mov.total_cost && (
          <div>
            <span className="text-muted-foreground block text-xs">
              Total Cost
            </span>
            <p>{mov.total_cost}</p>
          </div>
        )}
        <div>
          <span className="text-muted-foreground block text-xs">Created</span>
          <p>{new Date(mov.created_at).toLocaleString()}</p>
        </div>
        {mov.completed_at && (
          <div>
            <span className="text-muted-foreground block text-xs">
              Completed
            </span>
            <p>{new Date(mov.completed_at).toLocaleString()}</p>
          </div>
        )}
        {mov.created_by_name && (
          <div>
            <span className="text-muted-foreground block text-xs">
              Created By
            </span>
            <p>{mov.created_by_name}</p>
          </div>
        )}
        {mov.notes && (
          <div className="col-span-2">
            <span className="text-muted-foreground block text-xs">Notes</span>
            <p className="mt-1 bg-muted p-2 rounded text-xs">{mov.notes}</p>
          </div>
        )}
      </div>
      {mov.status === 'PENDING' && (
        <DialogFooter className="mt-4">
          <Button size="sm" onClick={() => onComplete(mov)}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Complete This Movement
          </Button>
        </DialogFooter>
      )}
    </>
  );
}

// ─── Check if filters are active (outside component) ────────────────────────
function hasActiveFilters(
  sq: string,
  ch: string,
  st: string,
  mt: string,
  ms: string
): boolean {
  return (
    sq !== '' || ch !== 'all' || st !== 'all' || mt !== 'all' || ms !== 'all'
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function InventoryPage() {
  // ── Data ────────────────────────────────────────────────────────────────
  const [inventories, setInventories] = useState<SalesChannelInventory[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [lowStock, setLowStock] = useState<SalesChannelInventory[]>([]);
  const [summary, setSummary] = useState<MovementSummary | null>(null);
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([]);
  const [inFactory, setInFactory] = useState<InFactorySummary[]>([]);

  // ── Page UI ─────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('inventory');
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [movementTypeFilter, setMovementTypeFilter] = useState('all');
  const [movementStatusFilter, setMovementStatusFilter] = useState('all');

  // ── Dialog state ────────────────────────────────────────────────────────
  const [viewInventory, setViewInventory] =
    useState<SalesChannelInventory | null>(null);
  const [viewMovement, setViewMovement] = useState<InventoryMovement | null>(
    null
  );

  // Add Inventory
  const [addDialog, setAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({
    sales_channel: '',
    product: '',
    quantity: '0',
    minimum_quantity: '0',
    maximum_quantity: '',
    bin_location: '',
  });

  // Adjust Stock
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [adjustTarget, setAdjustTarget] =
    useState<SalesChannelInventory | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    quantity_change: '',
    movement_type: 'ADJUSTMENT_IN' as 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT',
    notes: '',
  });

  // Edit Inventory
  const [editDialog, setEditDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<SalesChannelInventory | null>(
    null
  );
  const [editForm, setEditForm] = useState({
    minimum_quantity: '',
    maximum_quantity: '',
    bin_location: '',
  });

  // Delete Inventory
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<SalesChannelInventory | null>(null);

  // Transfer
  const [transferDialog, setTransferDialog] = useState(false);
  const [transferForm, setTransferForm] = useState({
    source_channel: '',
    destination_channel: '',
    product: '',
    quantity: '',
    notes: '',
  });

  // Record Movement
  const [movementDialog, setMovementDialog] = useState(false);
  const [movementForm, setMovementForm] = useState({
    sales_channel: '',
    product: '',
    movement_type: 'PURCHASE' as MovementType,
    quantity: '',
    unit_cost: '',
    notes: '',
  });

  // Complete Movement
  const [completeDialog, setCompleteDialog] = useState(false);
  const [completeTarget, setCompleteTarget] =
    useState<InventoryMovement | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');

  // Manufacturing
  const [bomDialog, setBomDialog] = useState(false);
  const [editingBomId, setEditingBomId] = useState<number | null>(null);
  const [bomForm, setBomForm] = useState({
    finished_product: '',
    name: '',
    notes: '',
    items: [
      { component: '', quantity_per_unit: '1', notes: '' },
    ],
  });
  const [quickPackagingForm, setQuickPackagingForm] = useState({
    name: '',
    barcode: '',
  });
  const [quickPackagingLoading, setQuickPackagingLoading] = useState(false);
  const [sendFactoryDialog, setSendFactoryDialog] = useState(false);
  const [sendFactoryForm, setSendFactoryForm] = useState({
    sales_channel: '',
    finished_product: '',
    planned_quantity: '',
    notes: '',
  });
  const [sendBomDetail, setSendBomDetail] = useState<BillOfMaterials | null>(null);
  const [sendBomLoading, setSendBomLoading] = useState(false);
  const [receiveFactoryDialog, setReceiveFactoryDialog] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<ProductionBatch | null>(null);
  const [receiveFactoryForm, setReceiveFactoryForm] = useState({
    received_quantity: '',
    reason: 'PRODUCTION_RETURNED' as 'PRODUCTION_RETURNED' | 'LAB_RECEIVED' | 'PARTIAL_PRODUCTION_RETURNED' | 'OTHER',
    notes: '',
  });
  const [viewProductionOrder, setViewProductionOrder] = useState<ProductionBatch | null>(null);
  const [cancelProductionTarget, setCancelProductionTarget] = useState<ProductionBatch | null>(null);
  const [cancelProductionNotes, setCancelProductionNotes] = useState('');

  // Success / Error feedback
  const [successDialog, setSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorDialog, setErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ── Data fetching ───────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [inv, mov, ch, prod, low, sum, bomList, batches, factoryStock] = await Promise.all([
        storeInventoryService.getAllStoreInventories(),
        inventoryMovementService.getAllMovements(),
        salesChannelService.getAllChannels(),
        productService.getAllProducts().catch(() => [] as ProductListItem[]),
        storeInventoryService
          .getLowStockItems()
          .catch(() => [] as SalesChannelInventory[]),
        inventoryMovementService.getMovementSummary().catch(() => null),
        billOfMaterialsService.getAll().catch(() => [] as BillOfMaterials[]),
        productionBatchService.getAll().catch(() => [] as ProductionBatch[]),
        productionBatchService.getInFactorySummary().catch(() => [] as InFactorySummary[]),
      ]);
      setInventories(inv);
      setMovements(mov);
      setChannels(ch);
      setProducts(prod);
      setLowStock(low);
      setSummary(sum);
      setBoms(bomList);
      setProductionBatches(batches);
      setInFactory(factoryStock);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Show feedback ───────────────────────────────────────────────────────
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setSuccessDialog(true);
  };
  const showError = (msg: string) => {
    setErrorMessage(msg);
    setErrorDialog(true);
  };

  // ── Filtered data ───────────────────────────────────────────────────────
  const filteredInventories = useMemo(
    () =>
      filterInventoryItems(
        inventories,
        searchQuery,
        channelFilter,
        stockFilter
      ),
    [inventories, searchQuery, channelFilter, stockFilter]
  );

  const filteredMovements = useMemo(
    () =>
      filterMovementItems(
        movements,
        searchQuery,
        channelFilter,
        movementTypeFilter,
        movementStatusFilter
      ),
    [
      movements,
      searchQuery,
      channelFilter,
      movementTypeFilter,
      movementStatusFilter,
    ]
  );

  // ── Stats ───────────────────────────────────────────────────────────────
  const totalProducts = useMemo(
    () => new Set(inventories.map(i => i.product)).size,
    [inventories]
  );
  const totalQty = useMemo(
    () => inventories.reduce((s, i) => s + i.quantity, 0),
    [inventories]
  );
  const outOfStock = useMemo(
    () => inventories.filter(i => i.is_out_of_stock).length,
    [inventories]
  );

  const finishedProductOptions = useMemo(
    () =>
      products.filter(
        p =>
          (p.product_type === 'resell' || p.product_type === 'finished') &&
          !p.is_pack &&
          !p.is_deleted
      ),
    [products]
  );

  const componentProductOptions = useMemo(
    () => products.filter(p => p.product_type === 'packaging' && !p.is_deleted),
    [products]
  );

  const selectedBomFinishedProduct = useMemo(
    () => products.find(p => p.id === Number(bomForm.finished_product)),
    [products, bomForm.finished_product]
  );

  // Live preview: what components will be consumed/remain when receiving
  const receivePreview = useMemo(() => {
    if (!receiveTarget?.components?.length || !receiveFactoryForm.received_quantity) return null;
    const newQty = Number(receiveFactoryForm.received_quantity);
    if (newQty <= 0 || isNaN(newQty)) return null;
    const newTotalReceived = receiveTarget.received_quantity + newQty;
    return receiveTarget.components.map(comp => {
      const newConsumedTotal = Math.min(
        comp.quantity_sent,
        Math.ceil(comp.quantity_sent * newTotalReceived / receiveTarget.planned_quantity)
      );
      return {
        component_name: comp.component_name,
        component_barcode: comp.component_barcode,
        willConsume: newConsumedTotal - comp.quantity_consumed,
        willRemain: comp.quantity_sent - newConsumedTotal,
      };
    });
  }, [receiveTarget, receiveFactoryForm.received_quantity]);

  // Live preview: what components will be sent to factory
  const sendPreview = useMemo(() => {
    if (!sendBomDetail?.items?.length || !sendFactoryForm.planned_quantity) return null;
    const qty = Number(sendFactoryForm.planned_quantity);
    if (qty <= 0 || isNaN(qty)) return null;
    return sendBomDetail.items.map(item => ({
      name: item.component_name ?? '',
      barcode: item.component_barcode ?? '',
      required: Math.ceil(
        Number(item.quantity_per_unit) * qty * (1 + Number(item.waste_percent ?? 0) / 100)
      ),
    }));
  }, [sendBomDetail, sendFactoryForm.planned_quantity]);

  const populateBomForm = (bom: BillOfMaterials) => {
    setEditingBomId(bom.id);
    setBomForm({
      finished_product: String(bom.finished_product),
      name: bom.name ?? '',
      notes: bom.notes ?? '',
      items:
        bom.items && bom.items.length > 0
          ? bom.items.map(item => ({
              component: String(item.component),
              quantity_per_unit: String(item.quantity_per_unit),
              notes: item.notes ?? '',
            }))
          : [{ component: '', quantity_per_unit: '1', notes: '' }],
    });
  };

  const openBomDialog = async (bom?: BillOfMaterials) => {
    setQuickPackagingForm({ name: '', barcode: '' });
    if (bom) {
      try {
        const detail = await billOfMaterialsService.getById(bom.id);
        populateBomForm(detail);
      } catch (err) {
        showError(extractErrorMessage(err));
        return;
      }
      setBomDialog(true);
      return;
    }
    setEditingBomId(null);
    setBomForm({
      finished_product: '',
      name: '',
      notes: '',
      items: [
        { component: '', quantity_per_unit: '1', notes: '' },
      ],
    });
    setBomDialog(true);
  };

  const handleBomFinishedProductChange = async (value: string) => {
    const existingBom = boms.find(bom => String(bom.finished_product) === value);
    if (existingBom) {
      try {
        const detail = await billOfMaterialsService.getById(existingBom.id);
        populateBomForm(detail);
      } catch (err) {
        showError(extractErrorMessage(err));
      }
      return;
    }
    setEditingBomId(null);
    setBomForm(current => ({
      ...current,
      finished_product: value,
      name: '',
      notes: '',
      items: [{ component: '', quantity_per_unit: '1', notes: '' }],
    }));
  };

  const updateBomItem = (
    index: number,
    field: 'component' | 'quantity_per_unit' | 'notes',
    value: string
  ) => {
    setBomForm(current => ({
      ...current,
      items: current.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addBomItem = () => {
    setBomForm(current => ({
      ...current,
      items: [
        ...current.items,
        { component: '', quantity_per_unit: '1', notes: '' },
      ],
    }));
  };

  const removeBomItem = (index: number) => {
    setBomForm(current => ({
      ...current,
      items: current.items.filter((_, i) => i !== index),
    }));
  };

  const handleSaveBom = async () => {
    const validItems = bomForm.items.filter(
      item => item.component && Number(item.quantity_per_unit) > 0
    );
    if (!bomForm.finished_product || validItems.length === 0) return;
    setActionLoading(true);
    try {
      const finishedProduct = products.find(
        p => p.id === Number(bomForm.finished_product)
      );
      const payload = {
        finished_product: Number(bomForm.finished_product),
        name: bomForm.name || `${finishedProduct?.name ?? 'Product'} BOM`,
        version:
          boms.find(bom => bom.id === editingBomId)?.version ??
          boms.find(bom => bom.finished_product === Number(bomForm.finished_product))?.version ??
          1,
        is_active: true,
        notes: bomForm.notes,
        items: validItems.map(item => ({
          component: Number(item.component),
          quantity_per_unit: item.quantity_per_unit,
          waste_percent: '0',
          notes: item.notes,
        })),
      };
      const existingBom =
        editingBomId !== null
          ? boms.find(bom => bom.id === editingBomId)
          : boms.find(bom => bom.finished_product === Number(bomForm.finished_product));
      if (existingBom) {
        await billOfMaterialsService.update(existingBom.id, payload);
      } else {
        await billOfMaterialsService.create(payload);
      }
      setBomDialog(false);
      showSuccess(existingBom ? 'BOM updated.' : 'BOM created and linked to product.');
      await fetchData();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePackagingComponent = async () => {
    const name = quickPackagingForm.name.trim();
    if (!name) return;
    setQuickPackagingLoading(true);
    try {
      const created = await productService.createProduct({
        name,
        barcode: quickPackagingForm.barcode.trim() || undefined,
        product_type: 'packaging',
        status: 'publish',
        brand: selectedBomFinishedProduct?.brand ?? undefined,
        purchase_price: '0.00',
        sales_price: '0.00',
        is_pack: false,
      });
      setProducts(current => [...current, created]);
      setBomForm(current => {
        const newItem = {
          component: String(created.id),
          quantity_per_unit: '1',
          notes: '',
        };
        const hasSingleEmptyItem =
          current.items.length === 1 && !current.items[0].component;
        return {
          ...current,
          items: hasSingleEmptyItem ? [newItem] : [...current.items, newItem],
        };
      });
      setQuickPackagingForm({ name: '', barcode: '' });
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setQuickPackagingLoading(false);
    }
  };

  const openSendFactoryDialog = (bom?: BillOfMaterials) => {
    const defaultWooChannel = channels.find(
      c => c.channel_type === 'WOOCOMMERCE' && c.is_active
    );
    setSendFactoryForm({
      sales_channel: defaultWooChannel ? String(defaultWooChannel.id) : '',
      finished_product: bom ? String(bom.finished_product) : '',
      planned_quantity: '',
      notes: '',
    });
    setSendBomDetail(null);
    if (bom) {
      void (async () => {
        setSendBomLoading(true);
        try {
          const detail = await billOfMaterialsService.getById(bom.id);
          setSendBomDetail(detail);
        } catch {
          // preview unavailable — not critical
        } finally {
          setSendBomLoading(false);
        }
      })();
    }
    setSendFactoryDialog(true);
  };

  const handleSendProductChange = async (value: string) => {
    setSendFactoryForm(f => ({ ...f, finished_product: value }));
    setSendBomDetail(null);
    const matchingBom = boms.find(b => String(b.finished_product) === value && b.is_active);
    if (!matchingBom) return;
    setSendBomLoading(true);
    try {
      const detail = await billOfMaterialsService.getById(matchingBom.id);
      setSendBomDetail(detail);
    } catch {
      // preview unavailable
    } finally {
      setSendBomLoading(false);
    }
  };

  const handleSendToFactory = async () => {
    if (
      !sendFactoryForm.sales_channel ||
      !sendFactoryForm.finished_product ||
      !sendFactoryForm.planned_quantity
    ) {
      return;
    }
    setActionLoading(true);
    try {
      const batch = await productionBatchService.sendToFactory({
        sales_channel: Number(sendFactoryForm.sales_channel),
        finished_product: Number(sendFactoryForm.finished_product),
        planned_quantity: Number(sendFactoryForm.planned_quantity),
        notes: sendFactoryForm.notes,
      });
      setSendFactoryDialog(false);
      showSuccess(`Components sent to factory. Batch ${batch.batch_number}.`);
      await fetchData();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const openReceiveFactoryDialog = async (batch: ProductionBatch) => {
    setActionLoading(true);
    try {
      const detail = await productionBatchService.getById(batch.id);
      setReceiveTarget(detail);
      setReceiveFactoryForm({
        received_quantity: '',
        reason: detail.in_factory_quantity === detail.planned_quantity
          ? 'PRODUCTION_RETURNED'
          : 'PARTIAL_PRODUCTION_RETURNED',
        notes: '',
      });
      setReceiveFactoryDialog(true);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const openProductionOrderDetail = async (batch: ProductionBatch) => {
    setActionLoading(true);
    try {
      const detail = await productionBatchService.getById(batch.id);
      setViewProductionOrder(detail);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceiveFromFactory = async () => {
    if (!receiveTarget || !receiveFactoryForm.received_quantity) return;
    setActionLoading(true);
    try {
      const batch = await productionBatchService.receiveFromFactory(
        receiveTarget.id,
        {
          received_quantity: Number(receiveFactoryForm.received_quantity),
          reason: receiveFactoryForm.reason,
          notes: receiveFactoryForm.notes,
        }
      );
      setReceiveFactoryDialog(false);
      showSuccess(`Finished products received. Batch ${batch.batch_number}.`);
      await fetchData();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProductionNotes = async () => {
    if (!viewProductionOrder) return;
    setActionLoading(true);
    try {
      const updated = await productionBatchService.update(viewProductionOrder.id, {
        notes: viewProductionOrder.notes,
      });
      setViewProductionOrder(updated);
      showSuccess('Production order updated.');
      await fetchData();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelProductionOrder = async () => {
    if (!cancelProductionTarget) return;
    setActionLoading(true);
    try {
      await productionBatchService.cancel(cancelProductionTarget.id, {
        notes: cancelProductionNotes,
      });
      setCancelProductionTarget(null);
      setCancelProductionNotes('');
      showSuccess('Production order cancelled and remaining components returned to stock.');
      await fetchData();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // ACTION HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  const openAddDialog = () => {
    setAddForm({
      sales_channel: '',
      product: '',
      quantity: '0',
      minimum_quantity: '0',
      maximum_quantity: '',
      bin_location: '',
    });
    setAddDialog(true);
  };

  const handleAddInventory = async () => {
    if (!addForm.sales_channel || !addForm.product) return;
    setActionLoading(true);
    try {
      await storeInventoryService.createStoreInventory({
        sales_channel: Number(addForm.sales_channel),
        product: Number(addForm.product),
        quantity: Number(addForm.quantity) || 0,
        minimum_quantity: Number(addForm.minimum_quantity) || 0,
        maximum_quantity: addForm.maximum_quantity
          ? Number(addForm.maximum_quantity)
          : null,
        bin_location: addForm.bin_location,
      });
      setAddDialog(false);
      showSuccess('Inventory record created successfully.');
      await fetchData();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const openAdjustDialog = (inv: SalesChannelInventory) => {
    setAdjustTarget(inv);
    setAdjustForm({
      quantity_change: '',
      movement_type: 'ADJUSTMENT_IN',
      notes: '',
    });
    setAdjustDialog(true);
  };

  const handleAdjustStock = async () => {
    if (!adjustTarget || !adjustForm.quantity_change) return;
    setActionLoading(true);
    try {
      const result = await storeInventoryService.adjustStock(adjustTarget.id, {
        quantity_change: Number(adjustForm.quantity_change),
        movement_type: adjustForm.movement_type,
        notes: adjustForm.notes,
      });
      setAdjustDialog(false);
      showSuccess(
        `Stock adjusted. New quantity: ${result.new_quantity}. Ref: ${result.movement_reference}`
      );
      await fetchData();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const openEditDialog = (inv: SalesChannelInventory) => {
    setEditTarget(inv);
    setEditForm({
      minimum_quantity: String(inv.minimum_quantity),
      maximum_quantity:
        inv.maximum_quantity === null || inv.maximum_quantity === undefined
          ? ''
          : String(inv.maximum_quantity),
      bin_location: inv.bin_location || '',
    });
    setEditDialog(true);
  };

  const handleEditInventory = async () => {
    if (!editTarget) return;
    setActionLoading(true);
    try {
      await storeInventoryService.updateStoreInventory(editTarget.id, {
        minimum_quantity: Number(editForm.minimum_quantity) || 0,
        maximum_quantity: editForm.maximum_quantity
          ? Number(editForm.maximum_quantity)
          : null,
        bin_location: editForm.bin_location,
      });
      setEditDialog(false);
      showSuccess('Inventory settings updated successfully.');
      await fetchData();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteDialog = (inv: SalesChannelInventory) => {
    setDeleteTarget(inv);
    setDeleteDialog(true);
  };

  const handleDeleteInventory = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await storeInventoryService.deleteStoreInventory(deleteTarget.id);
      setDeleteDialog(false);
      showSuccess(
        `Inventory record for "${deleteTarget.product_name}" removed.`
      );
      await fetchData();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const openTransferDialog = (inv?: SalesChannelInventory) => {
    setTransferForm({
      source_channel: inv ? String(inv.sales_channel) : '',
      destination_channel: '',
      product: inv ? String(inv.product) : '',
      quantity: '',
      notes: '',
    });
    setTransferDialog(true);
  };

  const handleTransfer = async () => {
    if (
      !transferForm.source_channel ||
      !transferForm.destination_channel ||
      !transferForm.product ||
      !transferForm.quantity
    )
      return;
    setActionLoading(true);
    try {
      const result = await inventoryMovementService.createTransfer({
        source_channel: Number(transferForm.source_channel),
        destination_channel: Number(transferForm.destination_channel),
        product: Number(transferForm.product),
        quantity: Number(transferForm.quantity),
        notes: transferForm.notes,
      });
      setTransferDialog(false);
      const inRef = result.transfer_in_reference
        ? ' | In: ' + result.transfer_in_reference
        : '';
      showSuccess(
        'Transfer created! Out: ' + result.transfer_out_reference + inRef
      );
      await fetchData();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const openMovementDialog = () => {
    setMovementForm({
      sales_channel: '',
      product: '',
      movement_type: 'PURCHASE',
      quantity: '',
      unit_cost: '',
      notes: '',
    });
    setMovementDialog(true);
  };

  const handleRecordMovement = async () => {
    if (
      !movementForm.sales_channel ||
      !movementForm.product ||
      !movementForm.quantity
    )
      return;
    setActionLoading(true);
    try {
      const result = await inventoryMovementService.createMovement({
        sales_channel: Number(movementForm.sales_channel),
        product: Number(movementForm.product),
        movement_type: movementForm.movement_type,
        quantity: Number(movementForm.quantity),
        unit_cost: movementForm.unit_cost
          ? Number(movementForm.unit_cost)
          : undefined,
        notes: movementForm.notes,
      });
      setMovementDialog(false);
      showSuccess(`Movement recorded: ${result.reference_number}`);
      await fetchData();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const openCompleteDialog = (mov: InventoryMovement) => {
    setCompleteTarget(mov);
    setCompleteNotes('');
    setCompleteDialog(true);
  };

  const handleCompleteMovement = async () => {
    if (!completeTarget) return;
    setActionLoading(true);
    try {
      await inventoryMovementService.completeMovement(
        completeTarget.id,
        completeNotes || undefined
      );
      setCompleteDialog(false);
      showSuccess(`Movement ${completeTarget.reference_number} completed.`);
      await fetchData();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-destructive text-sm">{error}</p>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Inventory Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Control stock levels, adjust quantities, and transfer between
            channels
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Stock
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openTransferDialog()}
          >
            <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Transfer
          </Button>
          <Button size="sm" variant="outline" onClick={openMovementDialog}>
            <ArrowUpDown className="h-4 w-4 mr-1.5" /> Record Movement
          </Button>
          <Button size="sm" variant="outline" onClick={() => void openBomDialog()}>
            <PackagePlus className="h-4 w-4 mr-1.5" /> New BOM
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 flex items-start gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total SKUs</p>
            <p className="text-2xl font-semibold">{totalProducts}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-start gap-3">
          <div className="p-2 rounded-md bg-blue-500/10">
            <BarChart3 className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Quantity</p>
            <p className="text-2xl font-semibold">
              {totalQty.toLocaleString()}
            </p>
          </div>
        </Card>
        <Card
          className="p-4 flex items-start gap-3 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            setStockFilter('low');
            setActiveTab('inventory');
          }}
        >
          <div className="p-2 rounded-md bg-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Low Stock Items</p>
            <p className="text-2xl font-semibold">{lowStock.length}</p>
          </div>
        </Card>
        <Card
          className="p-4 flex items-start gap-3 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            setStockFilter('out');
            setActiveTab('inventory');
          }}
        >
          <div className="p-2 rounded-md bg-red-500/10">
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Out of Stock</p>
            <p className="text-2xl font-semibold">{outOfStock}</p>
          </div>
        </Card>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory">
            <Package className="h-4 w-4 mr-1.5" /> Stock Levels
          </TabsTrigger>
          <TabsTrigger value="movements">
            <ArrowUpDown className="h-4 w-4 mr-1.5" /> Movements (
            {summary?.total_movements ?? movements.length})
          </TabsTrigger>
          <TabsTrigger value="low-stock">
            <AlertTriangle className="h-4 w-4 mr-1.5" /> Low Stock (
            {lowStock.length})
          </TabsTrigger>
          <TabsTrigger value="manufacturing">
            <PackagePlus className="h-4 w-4 mr-1.5" /> Manufacturing
          </TabsTrigger>
        </TabsList>

        {/* ── Filters (shared row) ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-end gap-3 mt-4">
          <div className="flex-1 min-w-[200px] max-w-sm">
            <Label className="text-xs text-muted-foreground mb-1 block">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Product, channel, barcode…"
                className="pl-9"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="w-[180px]">
            <Label className="text-xs text-muted-foreground mb-1 block">
              Channel
            </Label>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                {channels.map(ch => (
                  <SelectItem key={ch.id} value={String(ch.id)}>
                    {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabFilters
            activeTab={activeTab}
            stockFilter={stockFilter}
            setStockFilter={setStockFilter}
            movementTypeFilter={movementTypeFilter}
            setMovementTypeFilter={setMovementTypeFilter}
            movementStatusFilter={movementStatusFilter}
            setMovementStatusFilter={setMovementStatusFilter}
          />

          {hasActiveFilters(
            searchQuery,
            channelFilter,
            stockFilter,
            movementTypeFilter,
            movementStatusFilter
          ) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setChannelFilter('all');
                setStockFilter('all');
                setMovementTypeFilter('all');
                setMovementStatusFilter('all');
              }}
            >
              <Filter className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* ── TAB: Stock Levels ────────────────────────────────────────── */}
        <TabsContent value="inventory" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead>Bin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      {searchQuery || channelFilter !== 'all' || stockFilter !== 'all' ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Filter className="h-10 w-10 opacity-30" />
                          <p className="text-sm font-medium">No items match the current filters</p>
                          <p className="text-xs">Try adjusting or clearing your filters</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-1"
                            onClick={() => {
                              setSearchQuery('');
                              setChannelFilter('all');
                              setStockFilter('all');
                            }}
                          >
                            <Filter className="h-4 w-4 mr-1" /> Clear filters
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Package className="h-10 w-10 opacity-30" />
                          <p className="text-sm">No inventory records found</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-1"
                            onClick={openAddDialog}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add your first stock record
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventories.map(inv => (
                    <TableRow key={inv.id} className="group">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {inv.product_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {inv.product_barcode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {inv.sales_channel_name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {inv.sales_channel_code ?? ''}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {inv.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {inv.reserved_quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {inv.available_quantity}
                      </TableCell>
                      <TableCell className="text-sm">
                        {inv.bin_location || '—'}
                      </TableCell>
                      <TableCell>{stockStatusBadge(inv)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setViewInventory(inv)}
                            >
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openAdjustDialog(inv)}
                            >
                              <PackagePlus className="h-4 w-4 mr-2" /> Adjust
                              Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditDialog(inv)}
                            >
                              <Pencil className="h-4 w-4 mr-2" /> Edit Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openTransferDialog(inv)}
                            >
                              <ArrowRightLeft className="h-4 w-4 mr-2" />{' '}
                              Transfer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => openDeleteDialog(inv)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete Record
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── TAB: Movements ───────────────────────────────────────────── */}
        <TabsContent value="movements" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ArrowUpDown className="h-10 w-10 opacity-30" />
                        <p className="text-sm">No movements found</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1"
                          onClick={openMovementDialog}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Record a movement
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map(mov => (
                    <TableRow key={mov.id}>
                      <TableCell className="font-mono text-xs">
                        {mov.reference_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {mov.product_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {mov.product_barcode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {mov.sales_channel_name}
                        <span className="block text-xs text-muted-foreground">
                          {[mov.destination_channel_name]
                            .filter(Boolean)
                            .map(n => '\u2192 ' + n)}
                        </span>
                      </TableCell>
                      <TableCell>{movementBadge(mov.movement_type)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <span
                          className={
                            mov.is_stock_in ? 'text-green-600' : 'text-red-600'
                          }
                        >
                          {mov.is_stock_in ? '+' : '-'}
                          {mov.quantity}
                        </span>
                      </TableCell>
                      <TableCell>{statusBadge(mov.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(mov.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setViewMovement(mov)}
                            >
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {mov.status === 'PENDING' && (
                              <DropdownMenuItem
                                onClick={() => openCompleteDialog(mov)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />{' '}
                                Complete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── TAB: Low Stock ───────────────────────────────────────────── */}
        <TabsContent value="low-stock" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead className="text-right">Deficit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-10 w-10 text-green-500 opacity-50" />
                        <p className="text-sm">All stock levels are healthy!</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  lowStock.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {inv.product_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {inv.product_barcode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {inv.sales_channel_name}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {inv.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {inv.minimum_quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-red-600 font-semibold">
                        {inv.quantity - inv.minimum_quantity}
                      </TableCell>
                      <TableCell>{stockStatusBadge(inv)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => openAdjustDialog(inv)}
                        >
                          <PackagePlus className="h-3 w-3 mr-1" /> Restock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── TAB: Manufacturing ──────────────────────────────────────── */}
        <TabsContent value="manufacturing" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Factory className="h-5 w-5 text-blue-600" /> Production Orders
              </h2>
              <p className="text-sm text-muted-foreground">
                Send BOM components to your factory/lab, track what&apos;s in production, and receive finished products back into warehouse stock.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void openBomDialog()}>
                <PackagePlus className="h-4 w-4 mr-1.5" /> Create BOM
              </Button>
              <Button size="sm" variant="outline" onClick={() => openSendFactoryDialog()}>
                <Send className="h-4 w-4 mr-1.5" /> New Production Order
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 flex items-start gap-3">
              <div className="p-2 rounded-md bg-blue-500/10">
                <PackagePlus className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bills of Materials</p>
                <p className="text-2xl font-semibold">{boms.length}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-start gap-3">
              <div className="p-2 rounded-md bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orders In Progress</p>
                <p className="text-2xl font-semibold">
                  {productionBatches.filter(b =>
                    ['SENT_TO_FACTORY', 'PARTIALLY_RECEIVED'].includes(b.status)
                  ).length}
                </p>
              </div>
            </Card>
            <Card className="p-4 flex items-start gap-3">
              <div className="p-2 rounded-md bg-orange-500/10">
                <FlaskConical className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Components at Factory/Lab</p>
                <p className="text-2xl font-semibold">
                  {inFactory.reduce((sum, row) => sum + row.in_factory_quantity, 0)}
                </p>
              </div>
            </Card>
            <Card className="p-4 flex items-start gap-3">
              <div className="p-2 rounded-md bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed Orders</p>
                <p className="text-2xl font-semibold">
                  {productionBatches.filter(b => b.status === 'COMPLETED').length}
                </p>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <div className="p-4 border-b">
                <h2 className="font-semibold">Bills of Materials</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Finished Product</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Components</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        No BOMs yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    boms.map(bom => (
                      <TableRow key={bom.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{bom.finished_product_name}</div>
                          <div className="text-xs text-muted-foreground">{bom.finished_product_barcode || 'No barcode'}</div>
                        </TableCell>
                        <TableCell>v{bom.version}</TableCell>
                        <TableCell>{bom.items_count}</TableCell>
                        <TableCell>
                          <Badge variant={bom.is_active ? 'default' : 'secondary'}>
                            {bom.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => void openBomDialog(bom)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openSendFactoryDialog(bom)}>
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            <Card>
              <div className="p-4 border-b">
                <h2 className="font-semibold">In Factory Stock</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Consumed</TableHead>
                    <TableHead className="text-right">In Factory</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inFactory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        No components are currently in factory
                      </TableCell>
                    </TableRow>
                  ) : (
                    inFactory.map(row => (
                      <TableRow key={row.component_id}>
                        <TableCell>
                          <div className="font-medium text-sm">{row.component_name}</div>
                          <div className="text-xs text-muted-foreground">{row.component_barcode || 'No barcode'}</div>
                        </TableCell>
                        <TableCell className="text-right">{row.quantity_sent}</TableCell>
                        <TableCell className="text-right">{row.quantity_consumed}</TableCell>
                        <TableCell className="text-right font-medium">{row.in_factory_quantity}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>

          <Card>
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Production Orders</h2>
              <p className="text-xs text-muted-foreground">{productionBatches.length} total</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Finished Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Planned</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">At Factory/Lab</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionBatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Factory className="h-10 w-10 opacity-30" />
                        <p className="text-sm">No production orders yet</p>
                        <Button size="sm" variant="outline" className="mt-1" onClick={() => openSendFactoryDialog()}>
                          <Send className="h-4 w-4 mr-1" /> Create first order
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  productionBatches.map(batch => {
                    const pct = batch.planned_quantity > 0
                      ? Math.round((batch.received_quantity / batch.planned_quantity) * 100)
                      : 0;
                    return (
                      <TableRow key={batch.id} className="group">
                        <TableCell>
                          <div className="font-mono text-xs text-muted-foreground">{batch.batch_number}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{batch.sales_channel_name}</div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-sm">{batch.finished_product_name}</span>
                        </TableCell>
                        <TableCell>{productionBatchStatusBadge(batch.status)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{batch.planned_quantity}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-green-600 font-semibold">
                          {batch.received_quantity}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-amber-600 font-semibold">
                          {batch.in_factory_quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-mono">{pct}%</span>
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  batch.status === 'COMPLETED' ? 'bg-green-500' :
                                  batch.status === 'CANCELLED' ? 'bg-red-400' : 'bg-amber-400'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="View details"
                              onClick={() => void openProductionOrderDetail(batch)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {batch.in_factory_quantity > 0 && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Receive finished products"
                                onClick={() => void openReceiveFactoryDialog(batch)}
                              >
                                <PackageCheck className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {batch.received_quantity === 0 && batch.status !== 'CANCELLED' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Cancel order"
                                onClick={() => {
                                  setCancelProductionTarget(batch);
                                  setCancelProductionNotes('');
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Inventory Detail Dialog ────────────────────────────────────── */}
      <Dialog
        open={!!viewInventory}
        onOpenChange={() => setViewInventory(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Inventory Detail</DialogTitle>
            <DialogDescription>
              Stock information for this product / channel pair
            </DialogDescription>
          </DialogHeader>
          {viewInventory && (
            <InventoryDetailContent
              inv={viewInventory}
              onAdjust={i => {
                setViewInventory(null);
                openAdjustDialog(i);
              }}
              onTransfer={i => {
                setViewInventory(null);
                openTransferDialog(i);
              }}
              onEdit={i => {
                setViewInventory(null);
                openEditDialog(i);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Movement Detail Dialog ─────────────────────────────────────── */}
      <Dialog open={!!viewMovement} onOpenChange={() => setViewMovement(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Movement Detail</DialogTitle>
            <DialogDescription>
              Reference: {viewMovement?.reference_number}
            </DialogDescription>
          </DialogHeader>
          {viewMovement && (
            <MovementDetailContent
              mov={viewMovement}
              onComplete={m => {
                setViewMovement(null);
                openCompleteDialog(m);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Inventory Record ───────────────────────────────────────── */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Add Inventory Record
            </DialogTitle>
            <DialogDescription>
              Assign a product to a sales channel with initial stock level
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>
                Sales Channel <span className="text-destructive">*</span>
              </Label>
              <Select
                value={addForm.sales_channel}
                onValueChange={v =>
                  setAddForm({ ...addForm, sales_channel: v })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels
                    .filter(c => c.is_active)
                    .map(ch => (
                      <SelectItem key={ch.id} value={String(ch.id)}>
                        {ch.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                Product <span className="text-destructive">*</span>
              </Label>
              <Select
                value={addForm.product}
                onValueChange={v => setAddForm({ ...addForm, product: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} ({p.barcode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Initial Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  className="mt-1"
                  value={addForm.quantity}
                  onChange={e =>
                    setAddForm({ ...addForm, quantity: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Min Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  className="mt-1"
                  value={addForm.minimum_quantity}
                  onChange={e =>
                    setAddForm({ ...addForm, minimum_quantity: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  className="mt-1"
                  placeholder="Optional"
                  value={addForm.maximum_quantity}
                  onChange={e =>
                    setAddForm({ ...addForm, maximum_quantity: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Bin Location</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. A1-B2"
                  value={addForm.bin_location}
                  onChange={e =>
                    setAddForm({ ...addForm, bin_location: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddInventory}
              disabled={
                actionLoading || !addForm.sales_channel || !addForm.product
              }
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Add Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Adjust Stock Dialog ────────────────────────────────────────── */}
      <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5" /> Adjust Stock
            </DialogTitle>
            <DialogDescription>
              {adjustTarget
                ? `${adjustTarget.product_name} @ ${adjustTarget.sales_channel_name}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {adjustTarget && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">
                  Current Quantity
                </span>
                <span className="text-2xl font-bold">
                  {adjustTarget.quantity}
                </span>
              </div>
              <div>
                <Label>Adjustment Type</Label>
                <Select
                  value={adjustForm.movement_type}
                  onValueChange={v =>
                    setAdjustForm({
                      ...adjustForm,
                      movement_type: v as 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT',
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADJUSTMENT_IN">
                      <span className="flex items-center gap-2">
                        <PackagePlus className="h-4 w-4 text-green-600" /> Add
                        Stock (In)
                      </span>
                    </SelectItem>
                    <SelectItem value="ADJUSTMENT_OUT">
                      <span className="flex items-center gap-2">
                        <PackageMinus className="h-4 w-4 text-red-600" /> Remove
                        Stock (Out)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  Quantity <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  className="mt-1"
                  placeholder="Enter quantity to adjust"
                  value={adjustForm.quantity_change}
                  onChange={e =>
                    setAdjustForm({
                      ...adjustForm,
                      quantity_change: e.target.value,
                    })
                  }
                />
                {adjustForm.quantity_change && (
                  <p className="text-xs text-muted-foreground mt-1">
                    New quantity will be:{' '}
                    <span className="font-semibold">
                      {adjustForm.movement_type === 'ADJUSTMENT_IN'
                        ? adjustTarget.quantity +
                          Number(adjustForm.quantity_change)
                        : Math.max(
                            0,
                            adjustTarget.quantity -
                              Number(adjustForm.quantity_change)
                          )}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  className="mt-1"
                  placeholder="Reason for adjustment (optional)"
                  rows={2}
                  value={adjustForm.notes}
                  onChange={e =>
                    setAdjustForm({ ...adjustForm, notes: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAdjustDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdjustStock}
              disabled={
                actionLoading ||
                !adjustForm.quantity_change ||
                Number(adjustForm.quantity_change) <= 0
              }
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Inventory Dialog ──────────────────────────────────────── */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" /> Edit Inventory Settings
            </DialogTitle>
            <DialogDescription>
              {editTarget
                ? `${editTarget.product_name} @ ${editTarget.sales_channel_name}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Minimum Quantity (reorder point)</Label>
              <Input
                type="number"
                min="0"
                className="mt-1"
                value={editForm.minimum_quantity}
                onChange={e =>
                  setEditForm({ ...editForm, minimum_quantity: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Maximum Quantity</Label>
              <Input
                type="number"
                min="0"
                className="mt-1"
                placeholder="Optional"
                value={editForm.maximum_quantity}
                onChange={e =>
                  setEditForm({ ...editForm, maximum_quantity: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Bin Location</Label>
              <Input
                className="mt-1"
                placeholder="e.g. A1-B2"
                value={editForm.bin_location}
                onChange={e =>
                  setEditForm({ ...editForm, bin_location: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditInventory} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────────── */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the stock record for{' '}
              <span className="font-semibold">
                {deleteTarget?.product_name}
              </span>{' '}
              from{' '}
              <span className="font-semibold">
                {deleteTarget?.sales_channel_name}
              </span>
              .
              <br />
              <br />
              Current quantity:{' '}
              <span className="font-mono font-semibold">
                {deleteTarget?.quantity}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteInventory}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Transfer Dialog ────────────────────────────────────────────── */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" /> Transfer Stock
            </DialogTitle>
            <DialogDescription>
              Move stock from one channel to another
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>
                Source Channel <span className="text-destructive">*</span>
              </Label>
              <Select
                value={transferForm.source_channel}
                onValueChange={v =>
                  setTransferForm({ ...transferForm, source_channel: v })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="From channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels
                    .filter(c => c.is_active)
                    .map(ch => (
                      <SelectItem key={ch.id} value={String(ch.id)}>
                        {ch.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-center">
              <Send className="h-5 w-5 text-muted-foreground rotate-90" />
            </div>
            <div>
              <Label>
                Destination Channel <span className="text-destructive">*</span>
              </Label>
              <Select
                value={transferForm.destination_channel}
                onValueChange={v =>
                  setTransferForm({ ...transferForm, destination_channel: v })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="To channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels
                    .filter(
                      c =>
                        c.is_active &&
                        String(c.id) !== transferForm.source_channel
                    )
                    .map(ch => (
                      <SelectItem key={ch.id} value={String(ch.id)}>
                        {ch.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                Product <span className="text-destructive">*</span>
              </Label>
              <Select
                value={transferForm.product}
                onValueChange={v =>
                  setTransferForm({ ...transferForm, product: v })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} ({p.barcode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                className="mt-1"
                placeholder="Quantity to transfer"
                value={transferForm.quantity}
                onChange={e =>
                  setTransferForm({ ...transferForm, quantity: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                className="mt-1"
                placeholder="Optional notes"
                rows={2}
                value={transferForm.notes}
                onChange={e =>
                  setTransferForm({ ...transferForm, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setTransferDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={
                actionLoading ||
                !transferForm.source_channel ||
                !transferForm.destination_channel ||
                !transferForm.product ||
                !transferForm.quantity
              }
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-4 w-4 mr-1" />
              )}
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Record Movement Dialog ─────────────────────────────────────── */}
      <Dialog open={movementDialog} onOpenChange={setMovementDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" /> Record Movement
            </DialogTitle>
            <DialogDescription>
              Manually record a stock movement (purchase, sale, damage, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>
                Sales Channel <span className="text-destructive">*</span>
              </Label>
              <Select
                value={movementForm.sales_channel}
                onValueChange={v =>
                  setMovementForm({ ...movementForm, sales_channel: v })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels
                    .filter(c => c.is_active)
                    .map(ch => (
                      <SelectItem key={ch.id} value={String(ch.id)}>
                        {ch.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                Product <span className="text-destructive">*</span>
              </Label>
              <Select
                value={movementForm.product}
                onValueChange={v =>
                  setMovementForm({ ...movementForm, product: v })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} ({p.barcode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                Movement Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={movementForm.movement_type}
                onValueChange={v =>
                  setMovementForm({
                    ...movementForm,
                    movement_type: v as MovementType,
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PURCHASE">Purchase / Receipt</SelectItem>
                  <SelectItem value="SALE">Sale</SelectItem>
                  <SelectItem value="RETURN_IN">Customer Return</SelectItem>
                  <SelectItem value="RETURN_OUT">Return to Supplier</SelectItem>
                  <SelectItem value="ADJUSTMENT_IN">
                    Adjustment (Add)
                  </SelectItem>
                  <SelectItem value="ADJUSTMENT_OUT">
                    Adjustment (Remove)
                  </SelectItem>
                  <SelectItem value="DAMAGE">Damage / Expired</SelectItem>
                  <SelectItem value="INITIAL">Initial Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>
                  Quantity <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  className="mt-1"
                  value={movementForm.quantity}
                  onChange={e =>
                    setMovementForm({
                      ...movementForm,
                      quantity: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Unit Cost</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1"
                  placeholder="Optional"
                  value={movementForm.unit_cost}
                  onChange={e =>
                    setMovementForm({
                      ...movementForm,
                      unit_cost: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                className="mt-1"
                placeholder="Optional notes"
                rows={2}
                value={movementForm.notes}
                onChange={e =>
                  setMovementForm({ ...movementForm, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setMovementDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordMovement}
              disabled={
                actionLoading ||
                !movementForm.sales_channel ||
                !movementForm.product ||
                !movementForm.quantity
              }
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <ArrowUpDown className="h-4 w-4 mr-1" />
              )}
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Complete Movement Dialog ───────────────────────────────────── */}
      <Dialog open={completeDialog} onOpenChange={setCompleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" /> Complete
              Movement
            </DialogTitle>
            <DialogDescription>
              Mark{' '}
              <span className="font-mono">
                {completeTarget?.reference_number}
              </span>{' '}
              as completed?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {completeTarget && (
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Product:</span>{' '}
                  {completeTarget.product_name}
                </p>
                <p>
                  <span className="text-muted-foreground">Type:</span>{' '}
                  {completeTarget.movement_type.split('_').join(' ')}
                </p>
                <p>
                  <span className="text-muted-foreground">Quantity:</span>{' '}
                  {completeTarget.quantity}
                </p>
              </div>
            )}
            <div>
              <Label>Completion Notes</Label>
              <Textarea
                className="mt-1"
                placeholder="Optional notes"
                rows={2}
                value={completeNotes}
                onChange={e => setCompleteNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteMovement} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create BOM Dialog ─────────────────────────────────────────── */}
      <Dialog open={bomDialog} onOpenChange={setBomDialog}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-3xl lg:max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5" /> {editingBomId ? 'Update BOM' : 'Create BOM'}
            </DialogTitle>
            <DialogDescription>
              Link a finished product to packaging products needed to produce one unit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>
                  Finished product <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={bomForm.finished_product}
                  onValueChange={value => void handleBomFinishedProductChange(value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select resell product" />
                  </SelectTrigger>
                  <SelectContent>
                    {finishedProductOptions.map(product => (
                      <SelectItem key={product.id} value={String(product.id)}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>BOM name</Label>
                <Input
                  className="mt-1"
                  placeholder="Optional"
                  value={bomForm.name}
                  onChange={e => setBomForm({ ...bomForm, name: e.target.value })}
                />
              </div>
            </div>

            <div className="rounded-md border p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_0.7fr_auto] lg:items-end">
                <div>
                  <Label>New packaging product</Label>
                  <Input
                    className="mt-1"
                    placeholder="Bottle, cap, label..."
                    value={quickPackagingForm.name}
                    onChange={e =>
                      setQuickPackagingForm({
                        ...quickPackagingForm,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Barcode</Label>
                  <Input
                    className="mt-1"
                    placeholder="Optional"
                    value={quickPackagingForm.barcode}
                    onChange={e =>
                      setQuickPackagingForm({
                        ...quickPackagingForm,
                        barcode: e.target.value,
                      })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full lg:w-auto"
                  onClick={handleCreatePackagingComponent}
                  disabled={quickPackagingLoading || !quickPackagingForm.name.trim()}
                >
                  {quickPackagingLoading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1" />
                  )}
                  Add Packaging
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Components</Label>
                <Button type="button" variant="outline" size="sm" onClick={addBomItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Component
                </Button>
              </div>
              {bomForm.items.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_150px_auto] md:items-end"
                >
                  <div>
                    <Label className="text-xs">Packaging component</Label>
                    <Select
                      value={item.component}
                      onValueChange={value => updateBomItem(index, 'component', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Bottle, cap, label..." />
                      </SelectTrigger>
                      <SelectContent>
                        {componentProductOptions
                          .filter(product => String(product.id) !== bomForm.finished_product)
                          .map(product => (
                            <SelectItem key={product.id} value={String(product.id)}>
                              {product.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Qty / unit</Label>
                    <Input
                      type="number"
                      min="0.001"
                      step="0.001"
                      className="mt-1"
                      value={item.quantity_per_unit}
                      onChange={e => updateBomItem(index, 'quantity_per_unit', e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="justify-self-end"
                    onClick={() => removeBomItem(index)}
                    disabled={bomForm.items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={bomForm.notes}
                onChange={e => setBomForm({ ...bomForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="mt-5">
            <Button variant="outline" onClick={() => setBomDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveBom}
              disabled={
                actionLoading ||
                !bomForm.finished_product ||
                !bomForm.items.some(item => item.component && Number(item.quantity_per_unit) > 0)
              }
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <PackagePlus className="h-4 w-4 mr-1" />
              )}
              {editingBomId ? 'Update BOM' : 'Save BOM'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Production Order Dialog ───────────────────────────────── */}
      <Dialog open={sendFactoryDialog} onOpenChange={setSendFactoryDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-blue-600" /> New Production Order
            </DialogTitle>
            <DialogDescription>
              BOM components will be deducted from warehouse stock and tracked as factory/lab balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Warehouse / Channel <span className="text-destructive">*</span></Label>
                <Select
                  value={sendFactoryForm.sales_channel}
                  onValueChange={value => setSendFactoryForm({ ...sendFactoryForm, sales_channel: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.filter(ch => ch.is_active).map(ch => (
                      <SelectItem key={ch.id} value={String(ch.id)}>
                        {ch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity to produce <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min="1"
                  className="mt-1"
                  placeholder="e.g. 100"
                  value={sendFactoryForm.planned_quantity}
                  onChange={e => setSendFactoryForm({ ...sendFactoryForm, planned_quantity: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Finished product <span className="text-destructive">*</span></Label>
              <Select
                value={sendFactoryForm.finished_product}
                onValueChange={value => void handleSendProductChange(value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select product with active BOM" />
                </SelectTrigger>
                <SelectContent>
                  {boms.filter(bom => bom.is_active).map(bom => (
                    <SelectItem key={bom.id} value={String(bom.finished_product)}>
                      {bom.finished_product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Component preview */}
            {sendFactoryForm.finished_product && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <ChevronRight className="h-3 w-3" /> Components that will be sent to factory
                </p>
                {sendBomLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs py-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading BOM...
                  </div>
                ) : sendPreview?.length ? (
                  <div className="rounded border bg-background overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 font-medium text-muted-foreground">Component</th>
                          <th className="text-right p-2 font-medium text-muted-foreground">Qty to Send</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sendPreview.map((row, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="p-2">
                              <span className="font-medium">{row.name}</span>
                              {row.barcode && <span className="text-muted-foreground ml-1">({row.barcode})</span>}
                            </td>
                            <td className="p-2 text-right font-mono font-semibold text-blue-700">{row.required}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : sendBomDetail ? (
                  <p className="text-xs text-muted-foreground">BOM has no components configured.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Enter a quantity to see component breakdown.</p>
                )}
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea
                className="mt-1"
                rows={2}
                placeholder="Optional — order notes, destination details..."
                value={sendFactoryForm.notes}
                onChange={e => setSendFactoryForm({ ...sendFactoryForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSendFactoryDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendToFactory}
              disabled={
                actionLoading ||
                !sendFactoryForm.sales_channel ||
                !sendFactoryForm.finished_product ||
                !sendFactoryForm.planned_quantity
              }
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Send to Factory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Receive Finished Products Dialog ─────────────────────────── */}
      <Dialog open={receiveFactoryDialog} onOpenChange={setReceiveFactoryDialog}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-green-600" /> Receive Finished Products
            </DialogTitle>
            <DialogDescription>
              Finished product stock will increase. Components will be marked as consumed from the factory/lab balance.
            </DialogDescription>
          </DialogHeader>

          {receiveTarget && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
              <div className="font-semibold">{receiveTarget.finished_product_name}</div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Batch: <span className="font-mono">{receiveTarget.batch_number}</span></span>
                <span>Planned: <span className="font-semibold">{receiveTarget.planned_quantity}</span></span>
                <span>Already received: <span className="font-semibold text-green-600">{receiveTarget.received_quantity}</span></span>
                <span>Still at factory: <span className="font-semibold text-amber-600">{receiveTarget.in_factory_quantity}</span></span>
              </div>
            </div>
          )}

          <div className="space-y-4 mt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity to receive <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min="1"
                  max={receiveTarget?.in_factory_quantity}
                  className="mt-1"
                  placeholder={`Max ${receiveTarget?.in_factory_quantity ?? ''}`}
                  value={receiveFactoryForm.received_quantity}
                  onChange={e => setReceiveFactoryForm({ ...receiveFactoryForm, received_quantity: e.target.value })}
                />
                {receiveTarget && receiveFactoryForm.received_quantity &&
                  Number(receiveFactoryForm.received_quantity) > receiveTarget.in_factory_quantity && (
                  <p className="text-xs text-destructive mt-1">
                    Cannot exceed remaining quantity ({receiveTarget.in_factory_quantity}).
                  </p>
                )}
              </div>
              <div>
                <Label>Reason <span className="text-destructive">*</span></Label>
                <Select
                  value={receiveFactoryForm.reason}
                  onValueChange={value =>
                    setReceiveFactoryForm({
                      ...receiveFactoryForm,
                      reason: value as typeof receiveFactoryForm.reason,
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRODUCTION_RETURNED">Production order returned from factory</SelectItem>
                    <SelectItem value="LAB_RECEIVED">Received from laboratory</SelectItem>
                    <SelectItem value="PARTIAL_PRODUCTION_RETURNED">Partial production returned</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Live preview */}
            {receivePreview && receiveFactoryForm.received_quantity &&
              Number(receiveFactoryForm.received_quantity) > 0 &&
              Number(receiveFactoryForm.received_quantity) <= (receiveTarget?.in_factory_quantity ?? 0) && (
              <div className="rounded-md border bg-green-50 border-green-200 p-3 space-y-3">
                <p className="text-xs font-semibold text-green-800 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> What will happen when you confirm
                </p>

                <div className="flex items-center gap-2 text-sm">
                  <PackageCheck className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-green-800 font-medium">
                    Finished product stock: <span className="font-bold">+{receiveFactoryForm.received_quantity} units</span>
                  </span>
                </div>

                {receivePreview.length > 0 && (
                  <>
                    <Separator className="bg-green-200" />
                    <p className="text-xs font-medium text-green-700">Components consumed from factory/lab balance:</p>
                    <div className="rounded border border-green-200 bg-white overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-green-100/60">
                            <th className="text-left p-2 font-medium text-green-800">Component</th>
                            <th className="text-right p-2 font-medium text-green-800">Will Consume</th>
                            <th className="text-right p-2 font-medium text-green-800">Will Remain</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receivePreview.map((row, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="p-2 font-medium">
                                {row.component_name}
                                {row.component_barcode && (
                                  <span className="text-muted-foreground ml-1 font-normal">
                                    ({row.component_barcode})
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-right font-mono font-semibold text-orange-700">
                                -{row.willConsume}
                              </td>
                              <td className={`p-2 text-right font-mono font-semibold ${row.willRemain > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                {row.willRemain}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea
                className="mt-1"
                rows={2}
                placeholder="Optional notes about this receipt..."
                value={receiveFactoryForm.notes}
                onChange={e => setReceiveFactoryForm({ ...receiveFactoryForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setReceiveFactoryDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReceiveFromFactory}
              disabled={
                actionLoading ||
                !receiveFactoryForm.received_quantity ||
                Number(receiveFactoryForm.received_quantity) <= 0 ||
                Number(receiveFactoryForm.received_quantity) > (receiveTarget?.in_factory_quantity ?? 0)
              }
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <PackageCheck className="h-4 w-4 mr-1" />
              )}
              Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Production Order Detail Dialog ────────────────────────────── */}
      <Dialog open={!!viewProductionOrder} onOpenChange={() => setViewProductionOrder(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-blue-600" /> Production Order Detail
            </DialogTitle>
            <DialogDescription className="font-mono">
              {viewProductionOrder?.batch_number}
            </DialogDescription>
          </DialogHeader>
          {viewProductionOrder && (() => {
            const pct = viewProductionOrder.planned_quantity > 0
              ? Math.round((viewProductionOrder.received_quantity / viewProductionOrder.planned_quantity) * 100)
              : 0;
            return (
              <div className="space-y-5">
                {/* Status + summary */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-md border p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Status</p>
                    {productionBatchStatusBadge(viewProductionOrder.status)}
                  </div>
                  <div className="rounded-md border p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Planned Production</p>
                    <p className="text-xl font-bold">{viewProductionOrder.planned_quantity}</p>
                    <p className="text-xs text-muted-foreground">{viewProductionOrder.finished_product_name}</p>
                  </div>
                  <div className="rounded-md border bg-green-50 border-green-200 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Received to Warehouse</p>
                    <p className="text-xl font-bold text-green-700">{viewProductionOrder.received_quantity}</p>
                    <p className="text-xs text-green-600">Finished products in stock</p>
                  </div>
                  <div className="rounded-md border bg-amber-50 border-amber-200 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Still at Factory/Lab</p>
                    <p className="text-xl font-bold text-amber-700">{viewProductionOrder.in_factory_quantity}</p>
                    <p className="text-xs text-amber-600">Not yet returned</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Production progress</span>
                    <span className="font-mono font-semibold">{pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        viewProductionOrder.status === 'COMPLETED' ? 'bg-green-500' :
                        viewProductionOrder.status === 'CANCELLED' ? 'bg-red-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{viewProductionOrder.received_quantity} received</span>
                    <span>{viewProductionOrder.in_factory_quantity} remaining</span>
                  </div>
                </div>

                <Separator />

                {/* Components breakdown */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-orange-500" />
                    Component Tracking — Factory/Lab Balance
                  </h3>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead>Component</TableHead>
                          <TableHead className="text-right">Sent to Factory</TableHead>
                          <TableHead className="text-right text-orange-700">Consumed</TableHead>
                          <TableHead className="text-right text-amber-700">Still at Factory/Lab</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(viewProductionOrder.components ?? []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                              No component data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          (viewProductionOrder.components ?? []).map(component => (
                            <TableRow key={component.id}>
                              <TableCell>
                                <div className="font-medium text-sm">{component.component_name}</div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {component.component_barcode || '—'}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {component.quantity_sent}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm text-orange-700 font-semibold">
                                {component.quantity_consumed}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                <span className={`font-semibold ${component.in_factory_quantity > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                  {component.in_factory_quantity}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {(viewProductionOrder.components ?? []).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Consumption is calculated proportionally as finished products are received.
                    </p>
                  )}
                </div>

                <Separator />

                {/* Notes */}
                <div>
                  <Label>Order Notes</Label>
                  <Textarea
                    className="mt-1"
                    rows={3}
                    placeholder="Add notes about this production order..."
                    value={viewProductionOrder.notes}
                    onChange={e =>
                      setViewProductionOrder({
                        ...viewProductionOrder,
                        notes: e.target.value,
                      })
                    }
                  />
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setViewProductionOrder(null)}>
                    Close
                  </Button>
                  {viewProductionOrder.in_factory_quantity > 0 && (
                    <Button
                      variant="outline"
                      className="text-green-700 border-green-300 hover:bg-green-50"
                      onClick={() => {
                        setViewProductionOrder(null);
                        void openReceiveFactoryDialog(viewProductionOrder);
                      }}
                    >
                      <PackageCheck className="h-4 w-4 mr-1" /> Receive Products
                    </Button>
                  )}
                  <Button onClick={handleUpdateProductionNotes} disabled={actionLoading}>
                    {actionLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Save Notes
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Cancel Production Order Dialog ────────────────────────────── */}
      <AlertDialog
        open={!!cancelProductionTarget}
        onOpenChange={open => {
          if (!open) setCancelProductionTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" /> Cancel Production Order?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-1">
              <span className="block">
                This will cancel batch{' '}
                <span className="font-mono font-semibold">{cancelProductionTarget?.batch_number}</span>.
              </span>
              <span className="block text-amber-700 font-medium">
                All remaining components at the factory/lab will be returned to warehouse stock.
              </span>
              <span className="block text-xs text-muted-foreground mt-1">
                This action cannot be undone. Orders that have already received products cannot be cancelled.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2">
            <Label>Cancellation reason (optional)</Label>
            <Textarea
              className="mt-1"
              rows={2}
              placeholder="Why is this order being cancelled?"
              value={cancelProductionNotes}
              onChange={e => setCancelProductionNotes(e.target.value)}
            />
          </div>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={actionLoading}>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancelProductionOrder}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
              Yes, Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Success Dialog ─────────────────────────────────────────────── */}
      <AlertDialog open={successDialog} onOpenChange={setSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" /> Success
            </AlertDialogTitle>
            <AlertDialogDescription>{successMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Error Dialog ───────────────────────────────────────────────── */}
      <AlertDialog open={errorDialog} onOpenChange={setErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> Error
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
