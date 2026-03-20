import { useCallback, useEffect, useState, useMemo, memo } from 'react';
import {
  Eye,
  Pencil,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  Package,
  Tag,
  Calendar,
  Store,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Barcode,
  Plus,
  RefreshCw,
  Globe,
  FolderTree,
  Loader2,
  Check,
  Percent,
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
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/store/authStore';
import { hasRole } from '@/hooks/useAuth';
import { promotionService } from '@/services/promotion.service';
import { getMediaUrl } from '@/utils/helpers';
import {
  useProducts,
  useSalesChannels,
  useBrands,
  useCategories,
  useDeleteProduct,
  useBulkDeleteProducts,
  useCreateProduct,
  usePartialUpdateProduct,
  useSyncProductsFromWooCommerce,
  usePreviewProductsFromWooCommerce,
  useSyncSelectedProductsFromWooCommerce,
} from '@/hooks/queries';

import type {
  ProductListItem,
  SalesChannel,
  InventoryStatus,
  ProductStatus,
  ProductType,
  DiscountType,
  PromotionChannelRuleInput,
} from '@/types';

// Memoized Product Row Component to prevent unnecessary re-renders
interface ProductRowProps {
  product: ProductListItem;
  isSelected: boolean;
  selectionMode: boolean;
  onToggleSelection: (id: number) => void;
  onView: (product: ProductListItem) => void;
  onEdit: (product: ProductListItem) => void;
  onDelete: (product: ProductListItem) => void;
  getProductStatusBadge: (status: ProductStatus) => React.ReactNode;
  getInventoryStatusBadge: (status: InventoryStatus) => React.ReactNode;
  formatPrice: (price: string | number | null | undefined) => string;
}

const ProductRow = memo(function ProductRow({
  product,
  isSelected,
  selectionMode,
  onToggleSelection,
  onView,
  onEdit,
  onDelete,
  getProductStatusBadge,
  getInventoryStatusBadge,
  formatPrice,
}: ProductRowProps) {
  const handleRowClick = useCallback(
    (e: React.MouseEvent<HTMLTableRowElement>) => {
      // Check if click is on interactive elements
      const target = e.target as HTMLElement;
      const isCheckbox = target.closest('[role="checkbox"]');
      const isButton = target.closest('button');
      const isDropdown = target.closest('[role="menu"]');

      // Always ignore clicks on interactive elements
      if (isCheckbox || isButton || isDropdown) return;

      // Samsung Gallery-style: In selection mode, toggle selection; otherwise, view details
      if (selectionMode) {
        onToggleSelection(product.id);
      } else {
        onView(product);
      }
    },
    [selectionMode, product, onToggleSelection, onView]
  );

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleCheckboxChange = useCallback(() => {
    onToggleSelection(product.id);
  }, [product.id, onToggleSelection]);

  return (
    <TableRow
      className={`group cursor-pointer hover:bg-l-bg-2/50 dark:hover:bg-d-bg-2/50 transition-all duration-150 ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
      onClick={handleRowClick}
    >
      <TableCell className="w-12" onClick={handleCheckboxClick}>
        <div className="flex items-center justify-center p-1 -m-1 rounded hover:bg-l-bg-3 dark:hover:bg-d-bg-3 transition-colors">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
          />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-lg overflow-hidden bg-l-bg-2 dark:bg-d-bg-2 flex items-center justify-center border border-l-border dark:border-d-border flex-shrink-0 group-hover:border-primary/30 transition-colors">
            {product.image_url ? (
              <img
                src={getMediaUrl(product.image_url)}
                alt={product.name}
                className="size-full object-cover"
                onError={e => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove(
                    'hidden'
                  );
                }}
              />
            ) : null}
            <Package
              className={`size-5 text-l-text-3 dark:text-d-text-3 ${product.image_url ? 'hidden' : ''}`}
            />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate max-w-[200px] group-hover:text-primary transition-colors">
              {product.name}
            </p>
            {product.brand_name && (
              <p className="text-xs text-l-text-3 dark:text-d-text-3">
                {product.brand_name}
              </p>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2 text-sm">
          <Barcode className="size-4 text-l-text-3 dark:text-d-text-3" />
          <span className="text-l-text-2 dark:text-d-text-2 font-mono">
            {product.barcode || '-'}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2 text-sm">
          <Store className="size-4 text-l-text-3 dark:text-d-text-3" />
          <span className="text-l-text-2 dark:text-d-text-2">
            {product.sales_channel_name}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">
            {formatPrice(product.sales_price)}
          </span>
          {product.promotion_price && (
            <span className="text-xs text-green-600">
              {formatPrice(product.promotion_price)}
            </span>
          )}
        </div>
      </TableCell>

      <TableCell>
        <div className="flex flex-col gap-1">
          {getInventoryStatusBadge(product.inventory_status)}
          {product.manage_stock && product.stock_quantity !== null && (
            <span className="text-xs text-l-text-3 dark:text-d-text-3">
              Qty: {product.stock_quantity}
            </span>
          )}
        </div>
      </TableCell>

      <TableCell>{getProductStatusBadge(product.status)}</TableCell>

      <TableCell className="text-right" onClick={handleCheckboxClick}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onView(product)} className="gap-2">
              <Eye className="size-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(product)} className="gap-2">
              <Pencil className="size-4" />
              Edit Product
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(product)}
              className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

interface ProductFormData {
  id?: number;
  name: string;
  barcode: string;
  description: string;
  short_description: string;
  sales_channel: string;
  brand: string;
  product_type: string;
  status: string;
  purchase_price: string;
  sales_price: string;
  promotion_price: string;
  inventory_status: string;
  stock_quantity: string;
  manage_stock: boolean;
  image_url: string;
  categories: number[];
}

const getProductDedupeKey = (product: ProductListItem): string => {
  if (!product.brand) {
    return `id:${product.id}`;
  }

  const wcKey = product.wc_product_id > 0 ? `wc:${product.wc_product_id}` : '';
  const barcodeKey = product.barcode?.trim().toLowerCase()
    ? `barcode:${product.barcode.trim().toLowerCase()}`
    : '';
  const nameKey = `name:${product.name.trim().toLowerCase()}`;

  return `brand:${product.brand}|${wcKey || barcodeKey || nameKey}`;
};

const dedupeProductsByBrandIdentity = (
  items: ProductListItem[]
): ProductListItem[] => {
  const map = new Map<string, ProductListItem>();

  items.forEach(item => {
    const key = getProductDedupeKey(item);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      return;
    }

    const existingUpdatedAt = Date.parse(existing.updated_at);
    const itemUpdatedAt = Date.parse(item.updated_at);
    if (Number.isNaN(existingUpdatedAt) || Number.isNaN(itemUpdatedAt)) {
      if (item.id > existing.id) {
        map.set(key, item);
      }
      return;
    }

    if (itemUpdatedAt >= existingUpdatedAt) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
};

const initialFormData: ProductFormData = {
  name: '',
  barcode: '',
  description: '',
  short_description: '',
  sales_channel: '',
  brand: '',
  product_type: 'simple',
  status: 'draft',
  purchase_price: '0.00',
  sales_price: '0.00',
  promotion_price: '',
  inventory_status: 'instock',
  stock_quantity: '',
  manage_stock: false,
  image_url: '',
  categories: [],
};

// Discount Type Options for Promotion
const DISCOUNT_TYPE_OPTIONS: { value: DiscountType; label: string }[] = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed Amount (TND)' },
];

// Channel Rule Builder Component for Promotion
interface ChannelRuleBuilderProps {
  readonly channels: SalesChannel[];
  readonly rules: PromotionChannelRuleInput[];
  readonly onChange: (rules: PromotionChannelRuleInput[]) => void;
  readonly discountType: DiscountType;
}

function ChannelRuleBuilder({
  channels,
  rules,
  onChange,
  discountType,
}: ChannelRuleBuilderProps) {
  const handleAddChannel = (channelId: number) => {
    onChange([
      ...rules,
      {
        sales_channel: channelId,
        discount_value: 0,
        is_enabled: true,
        channel_priority: 0,
      },
    ]);
  };

  const handleRemoveChannel = (channelId: number) => {
    onChange(rules.filter(r => r.sales_channel !== channelId));
  };

  const handleUpdateRule = (
    channelId: number,
    field: keyof PromotionChannelRuleInput,
    value: unknown
  ) => {
    onChange(
      rules.map(r =>
        r.sales_channel === channelId ? { ...r, [field]: value } : r
      )
    );
  };

  const ruleMap = useMemo(() => {
    return new Map(rules.map(r => [r.sales_channel, r]));
  }, [rules]);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Sales Channel Discounts</Label>
      <div className="border border-l-border dark:border-d-border rounded-lg divide-y divide-l-border dark:divide-d-border max-h-[200px] overflow-y-auto">
        {channels.length === 0 ? (
          <div className="p-4 text-center text-l-text-2 dark:text-d-text-2">
            No sales channels available
          </div>
        ) : (
          channels.map(channel => {
            const rule = ruleMap.get(channel.id);
            const isEnabled = !!rule;

            return (
              <div
                key={channel.id}
                className={`p-3 transition-colors ${isEnabled ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Checkbox
                      checked={isEnabled}
                      onCheckedChange={checked => {
                        if (checked) {
                          handleAddChannel(channel.id);
                        } else {
                          handleRemoveChannel(channel.id);
                        }
                      }}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {channel.name}
                      </p>
                    </div>
                  </div>

                  {isEnabled && (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max={discountType === 'percentage' ? 100 : undefined}
                          step="0.01"
                          value={rule?.discount_value || ''}
                          onChange={e =>
                            handleUpdateRule(
                              channel.id,
                              'discount_value',
                              Number.parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-20 pr-6 h-8 text-sm"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-l-text-2 dark:text-d-text-2 text-xs">
                          {discountType === 'percentage' ? '%' : 'TND'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { user } = useAuthStore();

  // React Query - Fetch data with caching
  const {
    data: products = [],
    isLoading,
    error: fetchError,
    refetch,
  } = useProducts();
  const { data: salesChannels = [] } = useSalesChannels();
  const { data: brands = [] } = useBrands();
  const { data: categories = [] } = useCategories();

  // React Query - Mutations
  const deleteProductMutation = useDeleteProduct();
  const bulkDeleteMutation = useBulkDeleteProducts();
  const createProductMutation = useCreateProduct();
  const partialUpdateProductMutation = usePartialUpdateProduct();
  const syncMutation = useSyncProductsFromWooCommerce();
  const previewMutation = usePreviewProductsFromWooCommerce();
  const syncSelectedMutation = useSyncSelectedProductsFromWooCommerce();

  // Local UI state (not server state)
  const [filteredProducts, setFilteredProducts] = useState<ProductListItem[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [salesChannelFilter, setSalesChannelFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');

  // Dialog states
  const [selectedProduct, setSelectedProduct] =
    useState<ProductListItem | null>(null);
  const [productToDelete, setProductToDelete] =
    useState<ProductListItem | null>(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [imageUploadFile, setImageUploadFile] = useState<File | null>(null);
  const [imageUploadPreview, setImageUploadPreview] = useState('');

  // Bulk selection state
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);

  // Promotion creation state
  const [promotionDialog, setPromotionDialog] = useState(false);
  const [isCreatingPromotion, setIsCreatingPromotion] = useState(false);
  const [promotionFormData, setPromotionFormData] = useState<{
    name: string;
    description: string;
    discount_type: DiscountType;
    default_discount_value: string;
    start_date: string;
    end_date: string;
    channel_rules: PromotionChannelRuleInput[];
  }>({
    name: '',
    description: '',
    discount_type: 'percentage',
    default_discount_value: '',
    start_date: '',
    end_date: '',
    channel_rules: [],
  });

  // Selection mode: Samsung Gallery-style (when items are selected, clicking rows toggles selection)
  const selectionMode = useMemo(
    () => selectedProducts.length > 0,
    [selectedProducts.length]
  );

  // Filter categories by brand (categories belong to sales channels which have a brand)
  const filteredCategories = useMemo(() => {
    if (!formData.brand || formData.brand === 'none') {
      return categories;
    }
    const brandId = Number(formData.brand);
    // Get sales channels for this brand as a Set for efficient lookup
    const brandChannelIds = new Set(
      salesChannels.filter(ch => ch.brand === brandId).map(ch => ch.id)
    );
    // Filter categories to those from brand's sales channels
    return categories.filter(cat => brandChannelIds.has(cat.sales_channel));
  }, [categories, salesChannels, formData.brand]);

  // Sync dialog state
  const [syncDialog, setSyncDialog] = useState(false);
  const [selectedSyncChannel, setSelectedSyncChannel] = useState<string>('');

  // WooCommerce Preview dialog state
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewData, setPreviewData] = useState<{
    sales_channel: number;
    sales_channel_name: string;
    total_count: number;
    existing_count: number;
    new_count: number;
    products: Array<{
      wc_id: number;
      name: string;
      sku: string;
      price: string;
      sale_price: string;
      status: string;
      stock_status: string;
      stock_quantity: number | null;
      type: string;
      image: string;
      categories: string[];
      exists_locally: boolean;
    }>;
  } | null>(null);
  const [selectedWcProducts, setSelectedWcProducts] = useState<number[]>([]);

  // Check if user is SuperAdmin
  const isSuperAdmin = hasRole(user, 'SuperAdmin');

  // Helper function to extract error messages
  const extractErrorMessage = (error: unknown): string => {
    const defaultMsg = 'An error occurred. Please try again.';

    if (!error || typeof error !== 'object') {
      return defaultMsg;
    }

    const err = error as { response?: { data?: unknown }; message?: string };

    if (err.response?.data) {
      const data = err.response.data;

      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const fieldErrors = Object.entries(
          data as Record<string, unknown>
        ).flatMap(([field, messages]) => {
          const fieldName = field
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          if (Array.isArray(messages)) {
            return messages.map(msg => `${fieldName}: ${msg}`);
          }
          return typeof messages === 'string'
            ? [`${fieldName}: ${messages}`]
            : [];
        });

        if (fieldErrors.length > 0) {
          return 'Validation errors:\n\n' + fieldErrors.join('\n');
        }

        const dataObj = data as { detail?: string; message?: string };
        return dataObj.detail ?? dataObj.message ?? defaultMsg;
      }

      if (typeof data === 'string') return data;
    }

    if (err.message?.includes('Network Error'))
      return 'Network error. Please check your connection.';
    if (err.message?.includes('timeout'))
      return 'Request timeout. Please try again.';

    return err.message ?? defaultMsg;
  };

  // Filter products based on search and filters
  useEffect(() => {
    let filtered = products;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        product =>
          product.name.toLowerCase().includes(query) ||
          product.barcode.toLowerCase().includes(query) ||
          product.sales_channel_name.toLowerCase().includes(query) ||
          product.brand_name?.toLowerCase().includes(query)
      );
    }

    // Sales channel filter
    if (salesChannelFilter !== 'all') {
      filtered = filtered.filter(
        product => product.sales_channel === Number(salesChannelFilter)
      );
    }

    // Brand filter
    if (brandFilter !== 'all') {
      filtered = filtered.filter(
        product => product.brand === Number(brandFilter)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(product => product.status === statusFilter);
    }

    // Stock filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(
        product => product.inventory_status === stockFilter
      );
    }

    setFilteredProducts(dedupeProductsByBrandIdentity(filtered));
  }, [
    searchQuery,
    salesChannelFilter,
    brandFilter,
    statusFilter,
    stockFilter,
    products,
  ]);

  // Action handlers
  const handleView = useCallback((product: ProductListItem) => {
    setSelectedProduct(product);
    setViewDialog(true);
  }, []);

  const resetImageUploadState = useCallback((previewUrl: string = '') => {
    setImageUploadFile(null);
    setImageUploadPreview(previousPreview => {
      if (previousPreview.startsWith('blob:')) {
        URL.revokeObjectURL(previousPreview);
      }
      return previewUrl;
    });
  }, []);

  const handleAdd = useCallback(() => {
    setFormData(initialFormData);
    resetImageUploadState();
    setAddDialog(true);
  }, [resetImageUploadState]);

  const handleEdit = useCallback(
    (product: ProductListItem) => {
      setFormData({
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        description: '',
        short_description: '',
        sales_channel: String(product.sales_channel),
        brand: product.brand ? String(product.brand) : '',
        product_type: product.product_type,
        status: product.status,
        purchase_price: product.purchase_price,
        sales_price: product.sales_price,
        promotion_price: product.promotion_price || '',
        inventory_status: product.inventory_status,
        stock_quantity:
          product.stock_quantity === null ? '' : String(product.stock_quantity),
        manage_stock: product.manage_stock,
        image_url: product.image_url,
        categories: product.categories || [],
      });
      resetImageUploadState(getMediaUrl(product.image_url));
      setEditDialog(true);
    },
    [resetImageUploadState]
  );

  const handleDelete = useCallback((product: ProductListItem) => {
    setProductToDelete(product);
    setDeleteDialog(true);
  }, []);

  const handleFormChange = (
    field: keyof ProductFormData,
    value: string | boolean | number[]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddProduct = async () => {
    if (!formData.name.trim() || !formData.sales_channel) {
      setErrorMessage(
        'Please fill in all required fields (Name, Sales Channel).'
      );
      setErrorDialog(true);
      return;
    }

    try {
      await createProductMutation.mutateAsync({
        wc_product_id: 0,
        sales_channel: Number(formData.sales_channel),
        name: formData.name.trim(),
        barcode: formData.barcode,
        description: formData.description,
        short_description: formData.short_description,
        product_type: formData.product_type as ProductType,
        status: formData.status as ProductStatus,
        brand:
          formData.brand && formData.brand !== 'none'
            ? Number(formData.brand)
            : undefined,
        categories: formData.categories,
        purchase_price: formData.purchase_price,
        sales_price: formData.sales_price,
        promotion_price: formData.promotion_price || null,
        inventory_status: formData.inventory_status as InventoryStatus,
        stock_quantity: formData.stock_quantity
          ? Number(formData.stock_quantity)
          : null,
        manage_stock: formData.manage_stock,
        image_url: formData.image_url,
        image_upload: imageUploadFile,
      });
      setSuccessMessage('Product created successfully!');
      setSuccessDialog(true);
      setAddDialog(false);
      setFormData(initialFormData);
      resetImageUploadState();
    } catch (err) {
      console.error('Error creating product:', err);
      setAddDialog(false);
      setErrorMessage(extractErrorMessage(err));
      setErrorDialog(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!formData.id || !formData.name.trim()) {
      setErrorMessage('Please fill in all required fields.');
      setErrorDialog(true);
      return;
    }

    try {
      await partialUpdateProductMutation.mutateAsync({
        id: formData.id,
        data: {
          name: formData.name.trim(),
          barcode: formData.barcode,
          description: formData.description,
          short_description: formData.short_description,
          product_type: formData.product_type as ProductType,
          status: formData.status as ProductStatus,
          brand:
            formData.brand && formData.brand !== 'none'
              ? Number(formData.brand)
              : null,
          categories: formData.categories,
          purchase_price: formData.purchase_price,
          sales_price: formData.sales_price,
          promotion_price: formData.promotion_price || null,
          inventory_status: formData.inventory_status as InventoryStatus,
          stock_quantity: formData.stock_quantity
            ? Number(formData.stock_quantity)
            : null,
          manage_stock: formData.manage_stock,
          image_url: formData.image_url,
          image_upload: imageUploadFile,
        },
      });
      setSuccessMessage('Product updated successfully!');
      setSuccessDialog(true);
      setEditDialog(false);
      resetImageUploadState();
    } catch (err) {
      console.error('Error updating product:', err);
      setEditDialog(false);
      setErrorMessage(extractErrorMessage(err));
      setErrorDialog(true);
    }
  };

  useEffect(() => {
    return () => {
      if (imageUploadPreview.startsWith('blob:')) {
        URL.revokeObjectURL(imageUploadPreview);
      }
    };
  }, [imageUploadPreview]);

  const confirmDelete = async () => {
    if (!productToDelete) return;

    try {
      await deleteProductMutation.mutateAsync(productToDelete.id);
      setSuccessMessage('Product deleted successfully!');
      setSuccessDialog(true);
      setDeleteDialog(false);
    } catch (err) {
      console.error('Error deleting product:', err);
      setDeleteDialog(false);
      setErrorMessage(extractErrorMessage(err));
      setErrorDialog(true);
    }
  };

  // Bulk selection handlers - optimized with useCallback for memoized row components
  const toggleProductSelection = useCallback((productId: number) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const selectAllProducts = useCallback(() => {
    setSelectedProducts(filteredProducts.map(p => p.id));
  }, [filteredProducts]);

  const deselectAllProducts = useCallback(() => {
    setSelectedProducts([]);
  }, []);

  // Memoized set of selected product IDs for O(1) lookup
  const selectedProductsSet = useMemo(
    () => new Set(selectedProducts),
    [selectedProducts]
  );

  const handleBulkDelete = () => {
    if (selectedProducts.length === 0) return;
    setBulkDeleteDialog(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedProducts.length === 0) return;

    try {
      const result = await bulkDeleteMutation.mutateAsync(selectedProducts);

      setBulkDeleteDialog(false);
      setSelectedProducts([]);

      if (result.errorCount > 0) {
        setSuccessMessage(
          `Deleted ${result.successCount} products. ${result.errorCount} failed.`
        );
      } else {
        setSuccessMessage(
          `Successfully deleted ${result.successCount} products!`
        );
      }
      setSuccessDialog(true);
    } catch (err) {
      console.error('Error during bulk delete:', err);
      setBulkDeleteDialog(false);
      setErrorMessage(extractErrorMessage(err));
      setErrorDialog(true);
    }
  };

  // Promotion creation handlers
  const handleOpenPromotionDialog = () => {
    if (selectedProducts.length === 0) return;
    // Reset form data
    setPromotionFormData({
      name: '',
      description: '',
      discount_type: 'percentage',
      default_discount_value: '',
      start_date: '',
      end_date: '',
      channel_rules: [],
    });
    setPromotionDialog(true);
  };

  const handleCreatePromotions = async () => {
    if (selectedProducts.length === 0) return;
    if (promotionFormData.channel_rules.length === 0) {
      setErrorMessage('Please select at least one sales channel.');
      setErrorDialog(true);
      return;
    }
    if (!promotionFormData.name.trim()) {
      setErrorMessage('Please enter a promotion name.');
      setErrorDialog(true);
      return;
    }

    setIsCreatingPromotion(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      // Get selected product details
      const selectedProductDetails = products.filter(p =>
        selectedProducts.includes(p.id)
      );

      for (const product of selectedProductDetails) {
        try {
          await promotionService.createPromotion({
            name: `${promotionFormData.name} - ${product.name}`,
            description: promotionFormData.description || undefined,
            product: product.id,
            brand: product.brand || undefined,
            discount_type: promotionFormData.discount_type,
            default_discount_value:
              Number.parseFloat(promotionFormData.default_discount_value) || 0,
            start_date: promotionFormData.start_date || undefined,
            end_date: promotionFormData.end_date || undefined,
            status: 'draft',
            is_active: false,
            channel_rules: promotionFormData.channel_rules,
          });
          successCount++;
        } catch (err) {
          console.error(
            `Error creating promotion for product ${product.id}:`,
            err
          );
          errorCount++;
        }
      }

      setPromotionDialog(false);
      setSelectedProducts([]);

      if (errorCount > 0) {
        setSuccessMessage(
          `Created ${successCount} promotions. ${errorCount} failed.`
        );
      } else {
        setSuccessMessage(`Successfully created ${successCount} promotions!`);
      }
      setSuccessDialog(true);
    } catch (err) {
      console.error('Error creating promotions:', err);
      setErrorMessage(extractErrorMessage(err));
      setErrorDialog(true);
    } finally {
      setIsCreatingPromotion(false);
    }
  };

  const handleSync = async () => {
    // Open sync dialog to let user select a channel
    setSyncDialog(true);
  };

  const handleConfirmSync = async () => {
    if (!selectedSyncChannel) {
      setErrorMessage('Please select a sales channel to sync from.');
      setErrorDialog(true);
      return;
    }

    try {
      await syncMutation.mutateAsync(Number(selectedSyncChannel));
      setSuccessMessage('Products synchronized successfully from WooCommerce!');
      setSuccessDialog(true);
      setSyncDialog(false);
      setSelectedSyncChannel('');
    } catch (err) {
      console.error('Error syncing products:', err);
      setSyncDialog(false);
      setErrorMessage(extractErrorMessage(err));
      setErrorDialog(true);
    }
  };

  // Preview products from WooCommerce (without saving)
  const handlePreviewProducts = async () => {
    if (!selectedSyncChannel) {
      setErrorMessage('Please select a sales channel first.');
      setErrorDialog(true);
      return;
    }

    try {
      const data = await previewMutation.mutateAsync(
        Number(selectedSyncChannel)
      );
      setPreviewData(data);
      setSelectedWcProducts([]);
      setSyncDialog(false);
      setPreviewDialog(true);
    } catch (err) {
      console.error('Error fetching WooCommerce products:', err);
      setErrorMessage(extractErrorMessage(err));
      setErrorDialog(true);
    }
  };

  // Toggle product selection for sync
  const toggleWcProductSelection = (wcId: number) => {
    setSelectedWcProducts(prev =>
      prev.includes(wcId) ? prev.filter(id => id !== wcId) : [...prev, wcId]
    );
  };

  // Select all products
  const selectAllWcProducts = () => {
    if (previewData) {
      setSelectedWcProducts(previewData.products.map(p => p.wc_id));
    }
  };

  // Deselect all products
  const deselectAllWcProducts = () => {
    setSelectedWcProducts([]);
  };

  // Sync selected products only
  const handleSyncSelected = async () => {
    if (!previewData || selectedWcProducts.length === 0) {
      setErrorMessage('Please select at least one product to sync.');
      setErrorDialog(true);
      return;
    }

    try {
      const result = await syncSelectedMutation.mutateAsync({
        salesChannelId: previewData.sales_channel,
        wcProductIds: selectedWcProducts,
      });
      setSuccessMessage(
        `Sync complete! Created: ${result.created || 0}, Updated: ${result.updated || 0}`
      );
      setSuccessDialog(true);
      setPreviewDialog(false);
      setPreviewData(null);
      setSelectedWcProducts([]);
    } catch (err) {
      console.error('Error syncing selected products:', err);
      setErrorMessage(extractErrorMessage(err));
      setErrorDialog(true);
    }
  };

  // Sync all products from preview
  const handleSyncAllFromPreview = async () => {
    if (!previewData) return;

    try {
      await syncMutation.mutateAsync(previewData.sales_channel);
      setSuccessMessage('All products synchronized successfully!');
      setSuccessDialog(true);
      setPreviewDialog(false);
      setPreviewData(null);
      setSelectedWcProducts([]);
    } catch (err) {
      console.error('Error syncing all products:', err);
      setErrorMessage(extractErrorMessage(err));
      setErrorDialog(true);
    }
  };

  // Get WooCommerce channels only
  const wooCommerceChannels = salesChannels.filter(
    ch => ch.channel_type === 'WOOCOMMERCE'
  );

  const getInventoryStatusBadge = (status: InventoryStatus) => {
    switch (status) {
      case 'instock':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="size-3 mr-1" />
            In Stock
          </Badge>
        );
      case 'outofstock':
        return (
          <Badge variant="destructive">
            <XCircle className="size-3 mr-1" />
            Out of Stock
          </Badge>
        );
      case 'onbackorder':
        return (
          <Badge variant="secondary">
            <AlertTriangle className="size-3 mr-1" />
            Backorder
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProductStatusBadge = (status: ProductStatus) => {
    switch (status) {
      case 'publish':
        return <Badge variant="default">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'private':
        return <Badge variant="outline">Private</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPrice = (price: string | number | null | undefined): string => {
    if (price === null || price === undefined || price === '') return '-';
    const num = typeof price === 'number' ? price : Number.parseFloat(price);
    if (Number.isNaN(num)) return '-';
    return `${num.toFixed(2)} TND`;
  };

  const renderProductForm = (isEdit = false) => (
    <div className="space-y-4 pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <div className="relative">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
            <Input
              id="name"
              value={formData.name}
              onChange={e => handleFormChange('name', e.target.value)}
              className="pl-10"
              placeholder="Enter product name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="barcode">SKU / Barcode</Label>
          <div className="relative">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
            <Input
              id="barcode"
              value={formData.barcode}
              onChange={e => handleFormChange('barcode', e.target.value)}
              className="pl-10"
              placeholder="SKU-001"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="image_url">Image URL</Label>
          <Input
            id="image_url"
            value={formData.image_url}
            onChange={e => handleFormChange('image_url', e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-2 col-span-2">
          <Label htmlFor="image_upload">Upload Image from PC</Label>
          <Input
            id="image_upload"
            type="file"
            accept="image/*"
            onChange={e => {
              const file = e.target.files?.[0] ?? null;
              setImageUploadFile(file);
              setImageUploadPreview(previousPreview => {
                if (previousPreview.startsWith('blob:')) {
                  URL.revokeObjectURL(previousPreview);
                }
                return file ? URL.createObjectURL(file) : '';
              });
            }}
          />
          {(imageUploadPreview || formData.image_url) && (
            <div className="mt-2 flex items-center gap-3">
              <img
                src={imageUploadPreview || getMediaUrl(formData.image_url)}
                alt="Product preview"
                className="h-16 w-16 rounded-md object-cover border"
                onError={e => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {imageUploadFile && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImageUploadFile(null);
                    setImageUploadPreview(previousPreview => {
                      if (previousPreview.startsWith('blob:')) {
                        URL.revokeObjectURL(previousPreview);
                      }
                      return formData.image_url
                        ? (getMediaUrl(formData.image_url) ?? '')
                        : '';
                    });
                  }}
                >
                  Remove uploaded file
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {!isEdit && (
          <div className="space-y-2">
            <Label>Sales Channel *</Label>
            <Select
              value={formData.sales_channel}
              onValueChange={v => handleFormChange('sales_channel', v)}
            >
              <SelectTrigger>
                <Store className="size-4 mr-2" />
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {salesChannels.map(ch => (
                  <SelectItem key={ch.id} value={String(ch.id)}>
                    {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Brand</Label>
          <Select
            value={formData.brand}
            onValueChange={v => handleFormChange('brand', v)}
          >
            <SelectTrigger>
              <Tag className="size-4 mr-2" />
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Brand</SelectItem>
              {brands.map(b => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Product Type</Label>
          <Select
            value={formData.product_type}
            onValueChange={v => handleFormChange('product_type', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simple</SelectItem>
              <SelectItem value="variable">Variable</SelectItem>
              <SelectItem value="grouped">Grouped</SelectItem>
              <SelectItem value="external">External</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={v => handleFormChange('status', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="publish">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t pt-4">
        <Label className="text-l-text-3 dark:text-d-text-3 mb-3 block">
          Pricing
        </Label>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="purchase_price">Purchase Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-l-text-3 dark:text-d-text-3">
                TND
              </span>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                value={formData.purchase_price}
                onChange={e =>
                  handleFormChange('purchase_price', e.target.value)
                }
                className="pl-12"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sales_price">Sales Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-l-text-3 dark:text-d-text-3">
                TND
              </span>
              <Input
                id="sales_price"
                type="number"
                step="0.01"
                value={formData.sales_price}
                onChange={e => handleFormChange('sales_price', e.target.value)}
                className="pl-12"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="promotion_price">Promotion Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-l-text-3 dark:text-d-text-3">
                TND
              </span>
              <Input
                id="promotion_price"
                type="number"
                step="0.01"
                value={formData.promotion_price}
                onChange={e =>
                  handleFormChange('promotion_price', e.target.value)
                }
                className="pl-12"
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <Label className="text-l-text-3 dark:text-d-text-3 mb-3 block">
          Inventory
        </Label>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Stock Status</Label>
            <Select
              value={formData.inventory_status}
              onValueChange={v => handleFormChange('inventory_status', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instock">In Stock</SelectItem>
                <SelectItem value="outofstock">Out of Stock</SelectItem>
                <SelectItem value="onbackorder">On Backorder</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock_quantity">Stock Quantity</Label>
            <Input
              id="stock_quantity"
              type="number"
              value={formData.stock_quantity}
              onChange={e => handleFormChange('stock_quantity', e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2 flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.manage_stock}
                onChange={e =>
                  handleFormChange('manage_stock', e.target.checked)
                }
                className="rounded"
              />
              <span className="text-sm">Manage Stock</span>
            </label>
          </div>
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="short_description">Short Description</Label>
          <Textarea
            id="short_description"
            value={formData.short_description}
            onChange={e =>
              handleFormChange('short_description', e.target.value)
            }
            placeholder="Brief product description..."
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Full Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={e => handleFormChange('description', e.target.value)}
            placeholder="Detailed product description..."
            rows={3}
          />
        </div>
      </div>

      {/* Categories Section - filtered by brand */}
      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-l-text-3 dark:text-d-text-3 flex items-center gap-2">
            <FolderTree className="size-4" />
            Categories
            {formData.brand && formData.brand !== 'none' && (
              <span className="text-xs font-normal text-l-text-3 dark:text-d-text-3">
                (filtered by selected brand)
              </span>
            )}
          </Label>
          {formData.categories.length > 0 && (
            <Badge variant="secondary">
              {formData.categories.length} selected
            </Badge>
          )}
        </div>
        {filteredCategories.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
            {filteredCategories.map(cat => (
              <label
                key={cat.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-l-bg-2 dark:hover:bg-d-bg-2 p-1.5 rounded"
              >
                <input
                  type="checkbox"
                  checked={formData.categories.includes(cat.id)}
                  onChange={e => {
                    if (e.target.checked) {
                      handleFormChange('categories', [
                        ...formData.categories,
                        cat.id,
                      ]);
                    } else {
                      handleFormChange(
                        'categories',
                        formData.categories.filter(id => id !== cat.id)
                      );
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm truncate" title={cat.name}>
                  {cat.name}
                </span>
                <span className="text-xs text-l-text-3 dark:text-d-text-3 ml-auto">
                  ({cat.products_count})
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-l-text-3 dark:text-d-text-3 italic">
            {formData.brand && formData.brand !== 'none'
              ? 'No categories found for the selected brand. Sync categories from WooCommerce.'
              : 'Select a brand to see available categories.'}
          </p>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-l-text-2 dark:text-d-text-2">
            Loading products...
          </p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <p className="text-red-500">
            {fetchError instanceof Error
              ? fetchError.message
              : 'Failed to load products'}
          </p>
          <Button onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Products Manager
            </h1>
            <p className="text-l-text-2 dark:text-d-text-2 mt-2">
              Manage products synced from WooCommerce
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="size-4" />
              Add Product
            </Button>
            <Button onClick={handleSync} variant="outline" className="gap-2">
              <RefreshCw className="size-4" />
              Sync with WooCommerce
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                <Input
                  placeholder="Search by name, barcode, or channel..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {isSuperAdmin && salesChannels.length > 0 && (
                <Select
                  value={salesChannelFilter}
                  onValueChange={setSalesChannelFilter}
                >
                  <SelectTrigger className="w-full md:w-[200px]">
                    <Store className="size-4 mr-2" />
                    <SelectValue placeholder="Sales Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    {salesChannels.map(channel => (
                      <SelectItem key={channel.id} value={String(channel.id)}>
                        {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {isSuperAdmin && brands.length > 0 && (
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <Tag className="size-4 mr-2" />
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={String(brand.id)}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[160px]">
                  <Filter className="size-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="publish">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>

              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Layers className="size-4 mr-2" />
                  <SelectValue placeholder="Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Status</SelectItem>
                  <SelectItem value="instock">In Stock</SelectItem>
                  <SelectItem value="outofstock">Out of Stock</SelectItem>
                  <SelectItem value="onbackorder">On Backorder</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1" />

              <div className="flex items-center gap-2 text-sm text-l-text-2 dark:text-d-text-2">
                <span>
                  Showing {filteredProducts.length} of {products.length}{' '}
                  products
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Bulk Action Bar - Animated slide in */}
        <div
          className={`overflow-hidden transition-all duration-200 ease-out ${selectedProducts.length > 0 ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <Card className="p-3 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-8 rounded-full bg-primary/10">
                  <span className="text-sm font-bold text-primary">
                    {selectedProducts.length}
                  </span>
                </div>
                <span className="font-medium text-sm">
                  product{selectedProducts.length > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAllProducts}
                  className="text-l-text-2 dark:text-d-text-2 hover:text-l-text-1 dark:hover:text-d-text-1"
                >
                  Clear selection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenPromotionDialog}
                  className="gap-2 shadow-sm border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Percent className="size-4" />
                  Create Promotion
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="gap-2 shadow-sm"
                >
                  <Trash2 className="size-4" />
                  Delete ({selectedProducts.length})
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-l-bg-2/50 dark:bg-d-bg-2/50">
              <TableHead className="w-12">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={
                      selectedProducts.length === filteredProducts.length &&
                      filteredProducts.length > 0
                    }
                    onCheckedChange={checked => {
                      if (checked) selectAllProducts();
                      else deselectAllProducts();
                    }}
                  />
                </div>
              </TableHead>
              <TableHead className="font-semibold">Product</TableHead>
              <TableHead className="font-semibold">SKU</TableHead>
              <TableHead className="font-semibold">Channel</TableHead>
              <TableHead className="font-semibold">Price</TableHead>
              <TableHead className="font-semibold">Stock</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-l-text-2 dark:text-d-text-2"
                >
                  <div className="flex flex-col items-center gap-3">
                    <Package className="size-10 text-l-text-3 dark:text-d-text-3" />
                    <p>No products found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map(product => (
                <ProductRow
                  key={product.id}
                  product={product}
                  isSelected={selectedProductsSet.has(product.id)}
                  selectionMode={selectionMode}
                  onToggleSelection={toggleProductSelection}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  getProductStatusBadge={getProductStatusBadge}
                  getInventoryStatusBadge={getInventoryStatusBadge}
                  formatPrice={formatPrice}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* View Product Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="w-[70vw] h-[70vh] max-w-none flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Package className="size-5 text-primary" />
              Product Details
            </DialogTitle>
            <DialogDescription>
              View complete product information
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-2">
              {/* Hero Section */}
              <div className="flex gap-6 p-4 bg-gradient-to-r from-l-bg-2 to-transparent dark:from-d-bg-2 dark:to-transparent rounded-xl">
                <div className="size-28 rounded-xl overflow-hidden bg-white dark:bg-d-bg-3 flex items-center justify-center border-2 border-l-border dark:border-d-border flex-shrink-0 shadow-sm">
                  {selectedProduct.image_url ? (
                    <img
                      src={getMediaUrl(selectedProduct.image_url)}
                      alt={selectedProduct.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Package className="size-10 text-l-text-3 dark:text-d-text-3" />
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-xl font-bold leading-tight">
                    {selectedProduct.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {getProductStatusBadge(selectedProduct.status)}
                    {getInventoryStatusBadge(selectedProduct.inventory_status)}
                    <Badge variant="outline" className="gap-1">
                      <Store className="size-3" />
                      {selectedProduct.sales_channel_name}
                    </Badge>
                  </div>
                  {selectedProduct.brand_name && (
                    <div className="flex items-center gap-2 text-sm text-l-text-2 dark:text-d-text-2">
                      <Tag className="size-4" />
                      <span>{selectedProduct.brand_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-l-bg-2/50 dark:bg-d-bg-2/50 space-y-1">
                  <p className="text-xs text-l-text-3 dark:text-d-text-3 uppercase tracking-wide">
                    WC ID
                  </p>
                  <p className="font-semibold text-primary">
                    #{selectedProduct.wc_product_id}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-l-bg-2/50 dark:bg-d-bg-2/50 space-y-1">
                  <p className="text-xs text-l-text-3 dark:text-d-text-3 uppercase tracking-wide">
                    SKU
                  </p>
                  <p className="font-mono font-medium truncate">
                    {selectedProduct.barcode || '-'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-l-bg-2/50 dark:bg-d-bg-2/50 space-y-1">
                  <p className="text-xs text-l-text-3 dark:text-d-text-3 uppercase tracking-wide">
                    Type
                  </p>
                  <p className="font-medium capitalize">
                    {selectedProduct.product_type}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-l-bg-2/50 dark:bg-d-bg-2/50 space-y-1">
                  <p className="text-xs text-l-text-3 dark:text-d-text-3 uppercase tracking-wide">
                    Stock
                  </p>
                  <p className="font-medium">
                    {selectedProduct.stock_quantity ?? 'N/A'}
                  </p>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-sm text-l-text-2 dark:text-d-text-2">
                  <span className="text-xs font-bold">TND</span>
                  Pricing
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-l-bg-2 dark:bg-d-bg-2 rounded-xl text-center border border-l-border dark:border-d-border">
                    <p className="text-xs text-l-text-3 dark:text-d-text-3 mb-1">
                      Purchase
                    </p>
                    <p className="text-lg font-bold">
                      {formatPrice(selectedProduct.purchase_price)}
                    </p>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-xl text-center border border-primary/20">
                    <p className="text-xs text-l-text-3 dark:text-d-text-3 mb-1">
                      Sales
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {formatPrice(selectedProduct.sales_price)}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-xl text-center border border-green-200 dark:border-green-800">
                    <p className="text-xs text-l-text-3 dark:text-d-text-3 mb-1">
                      Promo
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      {formatPrice(selectedProduct.promotion_price) || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Inventory Section */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-sm text-l-text-2 dark:text-d-text-2">
                  <Layers className="size-4" />
                  Inventory
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-l-bg-2/50 dark:bg-d-bg-2/50 flex items-center justify-between">
                    <span className="text-sm text-l-text-2 dark:text-d-text-2">
                      Stock Management
                    </span>
                    <Badge
                      variant={
                        selectedProduct.manage_stock ? 'default' : 'secondary'
                      }
                    >
                      {selectedProduct.manage_stock ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-l-bg-2/50 dark:bg-d-bg-2/50 flex items-center justify-between">
                    <span className="text-sm text-l-text-2 dark:text-d-text-2">
                      Quantity
                    </span>
                    <span className="font-bold">
                      {selectedProduct.stock_quantity ?? '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Categories */}
              {selectedProduct.category_names &&
                selectedProduct.category_names.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2 text-sm text-l-text-2 dark:text-d-text-2">
                      <FolderTree className="size-4" />
                      Categories
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.category_names.map((cat, idx) => (
                        <Badge
                          key={`${selectedProduct.id}-cat-${idx}`}
                          variant="secondary"
                          className="px-3 py-1"
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {/* Timestamps */}
              <div className="flex items-center justify-between text-xs text-l-text-3 dark:text-d-text-3 pt-4 border-t">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  <span>
                    Created:{' '}
                    {new Date(selectedProduct.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  <span>
                    Updated:{' '}
                    {new Date(selectedProduct.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          {selectedProduct && (
            <div className="flex gap-3 pt-4 border-t mt-auto">
              <Button
                onClick={() => {
                  setViewDialog(false);
                  handleEdit(selectedProduct);
                }}
                className="flex-1 gap-2"
              >
                <Pencil className="size-4" />
                Edit Product
              </Button>
              <Button
                variant="outline"
                onClick={() => setViewDialog(false)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog
        open={addDialog}
        onOpenChange={open => {
          setAddDialog(open);
          if (!open) {
            setFormData(initialFormData);
            resetImageUploadState();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              Add New Product
            </DialogTitle>
            <DialogDescription>
              Create a new product in the system
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">{renderProductForm()}</div>
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleAddProduct}
              disabled={createProductMutation.isPending}
              className="flex-1 gap-2"
            >
              <Plus className="size-4" />
              {createProductMutation.isPending
                ? 'Creating...'
                : 'Create Product'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setAddDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog
        open={editDialog}
        onOpenChange={open => {
          setEditDialog(open);
          if (!open) {
            resetImageUploadState();
          }
        }}
      >
        <DialogContent className="w-[70vw] h-[70vh] max-w-none flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-primary" />
              Edit Product
            </DialogTitle>
            <DialogDescription>Update product information</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 pr-2">
            {renderProductForm(true)}
          </div>
          <div className="flex gap-3 pt-4 border-t mt-auto">
            <Button
              onClick={handleSaveEdit}
              disabled={partialUpdateProductMutation.isPending}
              className="flex-1 gap-2"
            >
              <Pencil className="size-4" />
              {partialUpdateProductMutation.isPending
                ? 'Saving...'
                : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="size-5" />
              Delete Product
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              Are you sure you want to delete{' '}
              <strong className="text-foreground">
                {productToDelete?.name}
              </strong>
              ?
              <br />
              <span className="text-red-500 text-sm">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 gap-2"
            >
              <Trash2 className="size-4" />
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="size-5" />
              Delete {selectedProducts.length} Products
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              Are you sure you want to delete{' '}
              <strong className="text-foreground">
                {selectedProducts.length}
              </strong>{' '}
              selected products?
              <br />
              <span className="text-red-500 text-sm">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-red-600 hover:bg-red-700 gap-2"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete {selectedProducts.length} Products
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Promotion Dialog */}
      <Dialog open={promotionDialog} onOpenChange={setPromotionDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="size-5 text-primary" />
              Create Promotion for {selectedProducts.length} Product
              {selectedProducts.length > 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Set up a promotion that will be applied to all selected products.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Promotion Name */}
            <div className="space-y-2">
              <Label htmlFor="promo-name">Promotion Name *</Label>
              <Input
                id="promo-name"
                value={promotionFormData.name}
                onChange={e =>
                  setPromotionFormData(prev => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="e.g., Summer Sale, Black Friday"
              />
              <p className="text-xs text-l-text-3 dark:text-d-text-3">
                Product name will be appended automatically
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="promo-desc">Description</Label>
              <Textarea
                id="promo-desc"
                value={promotionFormData.description}
                onChange={e =>
                  setPromotionFormData(prev => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            {/* Discount Type */}
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={promotionFormData.discount_type}
                onValueChange={val =>
                  setPromotionFormData(prev => ({
                    ...prev,
                    discount_type: val as DiscountType,
                    channel_rules: prev.channel_rules.map(r => ({
                      ...r,
                      discount_value: 0,
                    })),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Default Discount Value */}
            <div className="space-y-2">
              <Label htmlFor="promo-discount">Default Discount Value</Label>
              <div className="relative">
                <Input
                  id="promo-discount"
                  type="number"
                  min="0"
                  max={
                    promotionFormData.discount_type === 'percentage'
                      ? 100
                      : undefined
                  }
                  step="0.01"
                  value={promotionFormData.default_discount_value}
                  onChange={e =>
                    setPromotionFormData(prev => ({
                      ...prev,
                      default_discount_value: e.target.value,
                    }))
                  }
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-l-text-2 dark:text-d-text-2">
                  {promotionFormData.discount_type === 'percentage'
                    ? '%'
                    : 'TND'}
                </span>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="promo-start">Start Date</Label>
                <Input
                  id="promo-start"
                  type="date"
                  value={promotionFormData.start_date}
                  onChange={e =>
                    setPromotionFormData(prev => ({
                      ...prev,
                      start_date: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-end">End Date</Label>
                <Input
                  id="promo-end"
                  type="date"
                  value={promotionFormData.end_date}
                  onChange={e =>
                    setPromotionFormData(prev => ({
                      ...prev,
                      end_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Channel Rules */}
            <ChannelRuleBuilder
              channels={salesChannels}
              rules={promotionFormData.channel_rules}
              onChange={rules =>
                setPromotionFormData(prev => ({
                  ...prev,
                  channel_rules: rules,
                }))
              }
              discountType={promotionFormData.discount_type}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setPromotionDialog(false)}
              disabled={isCreatingPromotion}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePromotions}
              disabled={isCreatingPromotion}
              className="gap-2"
            >
              {isCreatingPromotion ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Percent className="size-4" />
                  Create {selectedProducts.length} Promotion
                  {selectedProducts.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <AlertDialog open={successDialog} onOpenChange={setSuccessDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="mx-auto size-14 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mb-3">
              <Check className="size-7 text-green-600" />
            </div>
            <AlertDialogTitle className="text-center text-green-600 dark:text-green-500">
              Success!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {successMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center sm:justify-center">
            <AlertDialogAction
              onClick={() => setSuccessDialog(false)}
              className="min-w-24"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialog} onOpenChange={setErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 dark:text-red-500">
              ✗ Error
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sync with WooCommerce Dialog */}
      <Dialog open={syncDialog} onOpenChange={setSyncDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="size-5" />
              Sync Products from WooCommerce
            </DialogTitle>
            <DialogDescription>
              Select the WooCommerce sales channel to sync products from
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {wooCommerceChannels.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="size-12 mx-auto text-l-text-3 dark:text-d-text-3 mb-4" />
                <p className="text-l-text-2 dark:text-d-text-2">
                  No WooCommerce channels available
                </p>
                <p className="text-sm text-l-text-3 dark:text-d-text-3 mt-2">
                  Please create a WooCommerce sales channel first
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Select WooCommerce Store</Label>
                  <Select
                    value={selectedSyncChannel}
                    onValueChange={setSelectedSyncChannel}
                  >
                    <SelectTrigger>
                      <Store className="size-4 mr-2" />
                      <SelectValue placeholder="Select a store to sync from" />
                    </SelectTrigger>
                    <SelectContent>
                      {wooCommerceChannels.map(channel => (
                        <SelectItem key={channel.id} value={String(channel.id)}>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {channel.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {channel.brand_name}
                              </Badge>
                            </div>
                            {channel.woocommerce_config?.store_url && (
                              <span className="text-xs text-l-text-3 dark:text-d-text-3">
                                {channel.woocommerce_config.store_url}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedSyncChannel && (
                  <div className="p-4 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Tag className="size-4 text-primary" />
                      <span className="text-sm font-medium">Brand:</span>
                      <Badge>
                        {
                          wooCommerceChannels.find(
                            ch => String(ch.id) === selectedSyncChannel
                          )?.brand_name
                        }
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Store className="size-4 text-primary" />
                      <span className="text-sm font-medium">Store:</span>
                      <span className="text-sm">
                        {
                          wooCommerceChannels.find(
                            ch => String(ch.id) === selectedSyncChannel
                          )?.name
                        }
                      </span>
                    </div>
                    {wooCommerceChannels.find(
                      ch => String(ch.id) === selectedSyncChannel
                    )?.woocommerce_config?.store_url && (
                      <div className="flex items-center gap-2">
                        <Globe className="size-4 text-primary" />
                        <span className="text-sm font-medium">URL:</span>
                        <span className="text-xs text-l-text-3 dark:text-d-text-3">
                          {
                            wooCommerceChannels.find(
                              ch => String(ch.id) === selectedSyncChannel
                            )?.woocommerce_config?.store_url
                          }
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex flex-col gap-3 pt-2 border-t">
            <div className="flex gap-3">
              <Button
                onClick={handlePreviewProducts}
                disabled={
                  previewMutation.isPending ||
                  !selectedSyncChannel ||
                  wooCommerceChannels.length === 0
                }
                variant="outline"
                className="flex-1 gap-2"
              >
                <Eye
                  className={`size-4 ${previewMutation.isPending ? 'animate-pulse' : ''}`}
                />
                {previewMutation.isPending ? 'Loading...' : 'Preview & Select'}
              </Button>
              <Button
                onClick={handleConfirmSync}
                disabled={
                  syncMutation.isPending ||
                  !selectedSyncChannel ||
                  wooCommerceChannels.length === 0
                }
                className="flex-1 gap-2"
              >
                <RefreshCw
                  className={`size-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
                />
                {syncMutation.isPending ? 'Syncing...' : 'Sync All'}
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setSyncDialog(false);
                setSelectedSyncChannel('');
              }}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* WooCommerce Products Preview Dialog */}
      <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="size-5" />
              WooCommerce Products - {previewData?.sales_channel_name}
            </DialogTitle>
            <DialogDescription>
              Select products to sync from WooCommerce. Products marked "Exists"
              will be updated.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <>
              {/* Stats */}
              <div className="flex gap-4 py-2">
                <Badge variant="outline" className="gap-1">
                  Total: {previewData.total_count}
                </Badge>
                <Badge variant="default" className="gap-1 bg-green-600">
                  New: {previewData.new_count}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  Existing: {previewData.existing_count}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  Selected: {selectedWcProducts.length}
                </Badge>
              </div>

              {/* Selection controls */}
              <div className="flex gap-2 pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllWcProducts}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAllWcProducts}
                >
                  Deselect All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedWcProducts(
                      previewData.products
                        .filter(p => !p.exists_locally)
                        .map(p => p.wc_id)
                    )
                  }
                >
                  Select New Only
                </Button>
              </div>

              {/* Products list */}
              <div className="max-h-[40vh] overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedWcProducts.length ===
                            previewData.products.length
                          }
                          onCheckedChange={checked => {
                            if (checked) selectAllWcProducts();
                            else deselectAllWcProducts();
                          }}
                        />
                      </TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.products.map(product => (
                      <TableRow
                        key={product.wc_id}
                        className={
                          selectedWcProducts.includes(product.wc_id)
                            ? 'bg-primary/10'
                            : ''
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedWcProducts.includes(product.wc_id)}
                            onCheckedChange={() =>
                              toggleWcProductSelection(product.wc_id)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="size-10 object-cover rounded"
                              />
                            ) : (
                              <div className="size-10 bg-l-bg-2 dark:bg-d-bg-2 rounded flex items-center justify-center">
                                <Package className="size-5 text-l-text-3 dark:text-d-text-3" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <div className="flex gap-1">
                                {product.exists_locally ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Exists
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="default"
                                    className="text-xs bg-green-600"
                                  >
                                    New
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {product.type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-l-text-2 dark:text-d-text-2">
                          {product.sku || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>${product.price || '0'}</p>
                            {product.sale_price && (
                              <p className="text-green-600 text-xs">
                                Sale: ${product.sale_price}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              product.stock_status === 'instock'
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {product.stock_status}
                          </Badge>
                          {product.stock_quantity !== null && (
                            <span className="ml-1 text-xs">
                              ({product.stock_quantity})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              product.status === 'publish'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {product.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleSyncSelected}
                  disabled={
                    syncSelectedMutation.isPending ||
                    selectedWcProducts.length === 0
                  }
                  className="flex-1 gap-2"
                >
                  <RefreshCw
                    className={`size-4 ${syncSelectedMutation.isPending ? 'animate-spin' : ''}`}
                  />
                  {syncSelectedMutation.isPending
                    ? 'Syncing...'
                    : `Sync Selected (${selectedWcProducts.length})`}
                </Button>
                <Button
                  onClick={handleSyncAllFromPreview}
                  disabled={syncMutation.isPending}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <RefreshCw
                    className={`size-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
                  />
                  Sync All ({previewData.total_count})
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPreviewDialog(false);
                    setPreviewData(null);
                    setSelectedWcProducts([]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
