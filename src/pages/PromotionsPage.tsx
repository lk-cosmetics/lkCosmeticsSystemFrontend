/**
 * Promotions Page
 * Multi-Channel Promotion Engine with "Promotion Builder" form
 */

import { useCallback, useState, useMemo, memo } from 'react';
import { 
  Eye, 
  Pencil,
  Trash2, 
  Search, 
  MoreVertical,
  Tag,
  Store,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  DollarSign,
  RefreshCw,
  Loader2,
  Check,
  Percent,
  Copy,
  Play,
  Pause,
  Package,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/store/authStore';
import { hasRole } from '@/hooks/useAuth';
import { promotionService } from '@/services/promotion.service';
import {
  usePromotions,
  useProducts,
  useSalesChannels,
  useBrands,
  useCompanies,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
  useActivatePromotion,
  useDeactivatePromotion,
  useDuplicatePromotion,
  useBulkActivatePromotions,
  useBulkDeactivatePromotions,
} from '@/hooks/queries';

import type { 
  PromotionListItem, 
  Promotion,
  PromotionStatus,
  DiscountType,
  CreatePromotionRequest,
  UpdatePromotionRequest,
  PromotionChannelRuleInput,
  SalesChannel, 
} from '@/types';
import { getMediaUrl } from '@/utils/helpers';

// =============================================================================
// CONSTANTS
// =============================================================================

const PROMOTION_STATUS_OPTIONS: { value: PromotionStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

const DISCOUNT_TYPE_OPTIONS: { value: DiscountType; label: string }[] = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed Amount (TND)' },
];

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface PromotionRowProps {
  promotion: PromotionListItem;
  isSelected: boolean;
  selectionMode: boolean;
  onToggleSelection: (id: number) => void;
  onView: (promotion: PromotionListItem) => void;
  onEdit: (promotion: PromotionListItem) => void;
  onDelete: (promotion: PromotionListItem) => void;
  onActivate: (promotion: PromotionListItem) => void;
  onDeactivate: (promotion: PromotionListItem) => void;
  onDuplicate: (promotion: PromotionListItem) => void;
  getStatusBadge: (status: PromotionStatus, isActive: boolean, isCurrentlyActive: boolean) => React.ReactNode;
  formatDiscountValue: (value: string, type: DiscountType) => string;
  formatDate: (date: string) => string;
}

const PromotionRow = memo(function PromotionRow({
  promotion,
  isSelected,
  selectionMode,
  onToggleSelection,
  onView,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onDuplicate,
  getStatusBadge,
  formatDiscountValue,
  formatDate,
}: PromotionRowProps) {
  const handleRowClick = useCallback((e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    const isCheckbox = target.closest('[role="checkbox"]');
    const isButton = target.closest('button');
    const isDropdown = target.closest('[role="menu"]');
    
    if (isCheckbox || isButton || isDropdown) return;
    
    if (selectionMode) {
      onToggleSelection(promotion.id);
    } else {
      onView(promotion);
    }
  }, [selectionMode, promotion, onToggleSelection, onView]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleCheckboxChange = useCallback(() => {
    onToggleSelection(promotion.id);
  }, [promotion.id, onToggleSelection]);

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
          <div className="size-10 rounded-lg overflow-hidden bg-l-bg-2 dark:bg-d-bg-2 flex items-center justify-center border border-l-border dark:border-d-border flex-shrink-0">
            {promotion.product_image ? (
              <img 
                src={getMediaUrl(promotion.product_image) || ''}
                alt={promotion.product_name}
                className="size-full object-cover"
              />
            ) : (
              <Package className="size-5 text-l-txt-2 dark:text-d-txt-2" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-l-txt dark:text-d-txt truncate">{promotion.name}</p>
            <p className="text-xs text-l-txt-2 dark:text-d-txt-2">{promotion.product_name}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {promotion.discount_type === 'percentage' ? (
            <Percent className="size-4 text-green-500" />
          ) : (
            <DollarSign className="size-4 text-blue-500" />
          )}
          <span className="font-semibold">
            {formatDiscountValue(promotion.default_discount_value, promotion.discount_type)}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="gap-1">
          <Store className="size-3" />
          {promotion.channel_count}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <p className="text-l-txt dark:text-d-txt">{formatDate(promotion.start_date)}</p>
          <p className="text-l-txt-2 dark:text-d-txt-2 text-xs">to {formatDate(promotion.end_date)}</p>
        </div>
      </TableCell>
      <TableCell>
        {getStatusBadge(promotion.status, promotion.is_active, promotion.is_currently_active)}
      </TableCell>
      <TableCell>
        {promotion.max_usage ? (
          <span className="text-sm">
            {promotion.current_usage} / {promotion.max_usage}
          </span>
        ) : (
          <span className="text-sm text-l-txt-2 dark:text-d-txt-2">Unlimited</span>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onView(promotion)}>
              <Eye className="size-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(promotion)}>
              <Pencil className="size-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(promotion)}>
              <Copy className="size-4 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {promotion.is_active ? (
              <DropdownMenuItem onClick={() => onDeactivate(promotion)}>
                <Pause className="size-4 mr-2" /> Deactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onActivate(promotion)}>
                <Play className="size-4 mr-2" /> Activate
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(promotion)}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="size-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

// =============================================================================
// CHANNEL RULE BUILDER
// =============================================================================

interface ChannelRuleBuilderProps {
  readonly channels: SalesChannel[];
  readonly rules: PromotionChannelRuleInput[];
  readonly onChange: (rules: PromotionChannelRuleInput[]) => void;
  readonly discountType: DiscountType;
}

function ChannelRuleBuilder({ channels, rules, onChange, discountType }: ChannelRuleBuilderProps) {
  const handleAddChannel = (channelId: number) => {
    onChange([...rules, { 
      sales_channel: channelId, 
      discount_value: 0, 
      is_enabled: true,
      channel_priority: 0,
    }]);
  };

  const handleRemoveChannel = (channelId: number) => {
    onChange(rules.filter(r => r.sales_channel !== channelId));
  };

  const handleUpdateRule = (channelId: number, field: keyof PromotionChannelRuleInput, value: unknown) => {
    onChange(rules.map(r => 
      r.sales_channel === channelId ? { ...r, [field]: value } : r
    ));
  };

  const ruleMap = useMemo(() => {
    return new Map(rules.map(r => [r.sales_channel, r]));
  }, [rules]);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Sales Channel Discounts</Label>
      <div className="border border-l-border dark:border-d-border rounded-lg divide-y divide-l-border dark:divide-d-border">
        {channels.length === 0 ? (
          <div className="p-4 text-center text-l-txt-2 dark:text-d-txt-2">
            No sales channels available
          </div>
        ) : (
          channels.map(channel => {
            const rule = ruleMap.get(channel.id);
            const isEnabled = !!rule;

            return (
              <div 
                key={channel.id} 
                className={`p-4 transition-colors ${isEnabled ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Checkbox
                      checked={isEnabled}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleAddChannel(channel.id);
                        } else {
                          handleRemoveChannel(channel.id);
                        }
                      }}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-l-txt dark:text-d-txt truncate">
                        {channel.name}
                      </p>
                      <p className="text-xs text-l-txt-2 dark:text-d-txt-2">
                        {channel.channel_type}
                      </p>
                    </div>
                  </div>

                  {isEnabled && (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-l-txt-2 dark:text-d-txt-2">Discount:</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max={discountType === 'percentage' ? 100 : undefined}
                            step="0.01"
                            value={rule?.discount_value || ''}
                            onChange={(e) => handleUpdateRule(
                              channel.id, 
                              'discount_value', 
                              Number.parseFloat(e.target.value) || 0
                            )}
                            className="w-24 pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-l-txt-2 dark:text-d-txt-2 text-sm">
                            {discountType === 'percentage' ? '%' : 'TND'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-l-txt-2 dark:text-d-txt-2">Priority:</Label>
                        <Input
                          type="number"
                          min="0"
                          value={rule?.channel_priority || 0}
                          onChange={(e) => handleUpdateRule(
                            channel.id, 
                            'channel_priority', 
                            Number.parseInt(e.target.value, 10) || 0
                          )}
                          className="w-16"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <p className="text-xs text-l-txt-2 dark:text-d-txt-2">
        Select channels and set individual discount values. Higher priority values take precedence.
      </p>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function PromotionsPage() {
  // React Query Hooks
  const { data: promotions = [], isLoading, error, refetch } = usePromotions();
  const { data: products = [] } = useProducts();
  const { data: channels = [] } = useSalesChannels();
  const { data: brands = [] } = useBrands();
  useCompanies();

  // Mutation Hooks
  const createPromotionMutation = useCreatePromotion();
  const updatePromotionMutation = useUpdatePromotion();
  const deletePromotionMutation = useDeletePromotion();
  const activatePromotionMutation = useActivatePromotion();
  const deactivatePromotionMutation = useDeactivatePromotion();
  const duplicatePromotionMutation = useDuplicatePromotion();
  const bulkActivateMutation = useBulkActivatePromotions();
  const bulkDeactivateMutation = useBulkDeactivatePromotions();
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  // Removed unused filter state
  
  // Dialog State  
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<PromotionListItem | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    code: string;
    product: number | null;
    brand: number | null;
    discount_type: DiscountType;
    default_discount_value: string;
    start_date: string;
    end_date: string;
    status: PromotionStatus;
    is_active: boolean;
    max_usage: string;
    priority: string;
    is_stackable: boolean;
    channel_rules: PromotionChannelRuleInput[];
  }>({
    name: '',
    description: '',
    code: '',
    product: null,
    brand: null,
    discount_type: 'percentage',
    default_discount_value: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    is_active: false,
    max_usage: '',
    priority: '0',
    is_stackable: false,
    channel_rules: [],
  });

  const { user } = useAuthStore();
  const canManage = hasRole(user, 'SuperAdmin') || hasRole(user, 'Manager') || hasRole(user, 'CEO');

  // Selection mode for Samsung Gallery-style behavior
  const selectionMode = useMemo(() => selectedItems.length > 0, [selectedItems.length]);
  const selectedSet = useMemo(() => new Set(selectedItems), [selectedItems]);

  // ==========================================================================
  // Filtering
  // ==========================================================================

  const filteredPromotions = useMemo(() => {
    return promotions.filter(promo => {
      const matchesSearch = !searchQuery || 
        promo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        promo.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        promo.code?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || promo.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [promotions, searchQuery, statusFilter]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleToggleSelection = useCallback((id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedItems.length === filteredPromotions.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredPromotions.map(p => p.id));
    }
  }, [selectedItems.length, filteredPromotions]);

  const handleView = useCallback(async (promo: PromotionListItem) => {
    try {
      const fullPromotion = await promotionService.getPromotionById(promo.id);
      setSelectedPromotion(fullPromotion);
      setIsViewDialogOpen(true);
    } catch (err) {
      console.error('Error fetching promotion details:', err);
    }
  }, []);

  const handleEdit = useCallback(async (promo: PromotionListItem) => {
    try {
      const fullPromotion = await promotionService.getPromotionById(promo.id);
      setSelectedPromotion(fullPromotion);
      
      // Populate form
      setFormData({
        name: fullPromotion.name,
        description: fullPromotion.description || '',
        code: fullPromotion.code || '',
        product: fullPromotion.product,
        brand: fullPromotion.brand,
        discount_type: fullPromotion.discount_type,
        default_discount_value: fullPromotion.default_discount_value,
        start_date: fullPromotion.start_date.split('T')[0],
        end_date: fullPromotion.end_date.split('T')[0],
        status: fullPromotion.status,
        is_active: fullPromotion.is_active,
        max_usage: fullPromotion.max_usage?.toString() || '',
        priority: fullPromotion.priority.toString(),
        is_stackable: fullPromotion.is_stackable,
        channel_rules: fullPromotion.channel_rules.map((r: any) => ({
          sales_channel: r.sales_channel,
          discount_value: Number.parseFloat(r.discount_value),
          is_enabled: r.is_enabled,
          channel_priority: r.channel_priority,
          channel_max_usage: r.channel_max_usage,
        })),
      });
      
      setIsEditDialogOpen(true);
    } catch (err) {
      console.error('Error fetching promotion details:', err);
    }
  }, []);

  const handleDelete = useCallback((promo: PromotionListItem) => {
    setPromotionToDelete(promo);
    setIsDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!promotionToDelete) return;
    
    try {
      await deletePromotionMutation.mutateAsync(promotionToDelete.id);
      setIsDeleteDialogOpen(false);
      setPromotionToDelete(null);
    } catch (err) {
      console.error('Error deleting promotion:', err);
    }
  }, [promotionToDelete, deletePromotionMutation]);

  const handleActivate = useCallback(async (promo: PromotionListItem) => {
    try {
      await activatePromotionMutation.mutateAsync(promo.id);
    } catch (err) {
      console.error('Error activating promotion:', err);
    }
  }, [activatePromotionMutation]);

  const handleDeactivate = useCallback(async (promo: PromotionListItem) => {
    try {
      await deactivatePromotionMutation.mutateAsync(promo.id);
    } catch (err) {
      console.error('Error deactivating promotion:', err);
    }
  }, [deactivatePromotionMutation]);

  const handleDuplicate = useCallback(async (promo: PromotionListItem) => {
    try {
      await duplicatePromotionMutation.mutateAsync(promo.id);
    } catch (err) {
      console.error('Error duplicating promotion:', err);
    }
  }, [duplicatePromotionMutation]);

  const handleBulkActivate = useCallback(async () => {
    try {
      await bulkActivateMutation.mutateAsync(selectedItems);
      setSelectedItems([]);
    } catch (err) {
      console.error('Error bulk activating:', err);
    }
  }, [selectedItems, bulkActivateMutation]);

  const handleBulkDeactivate = useCallback(async () => {
    try {
      await bulkDeactivateMutation.mutateAsync(selectedItems);
      setSelectedItems([]);
    } catch (err) {
      console.error('Error bulk deactivating:', err);
    }
  }, [selectedItems, bulkDeactivateMutation]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      code: '',
      product: null,
      brand: null,
      discount_type: 'percentage',
      default_discount_value: '',
      start_date: '',
      end_date: '',
      status: 'draft',
      is_active: false,
      max_usage: '',
      priority: '0',
      is_stackable: false,
      channel_rules: [],
    });
  }, []);

  const handleOpenCreate = useCallback(() => {
    resetForm();
    setIsCreateDialogOpen(true);
  }, [resetForm]);

  const handleCreate = useCallback(async () => {
    if (!formData.product || !formData.brand || formData.channel_rules.length === 0) {
      return;
    }

    try {
      const request: CreatePromotionRequest = {
        name: formData.name,
        description: formData.description || undefined,
        code: formData.code || undefined,
        product: formData.product,
        brand: formData.brand || undefined,
        discount_type: formData.discount_type,
        default_discount_value: Number.parseFloat(formData.default_discount_value),
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status,
        is_active: formData.is_active,
        max_usage: formData.max_usage ? Number.parseInt(formData.max_usage, 10) : undefined,
        priority: Number.parseInt(formData.priority, 10) || 0,
        is_stackable: formData.is_stackable,
        channel_rules: formData.channel_rules,
      };

      await createPromotionMutation.mutateAsync(request);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error creating promotion:', err);
    }
  }, [formData, createPromotionMutation, resetForm]);

  const handleUpdate = useCallback(async () => {
    if (!selectedPromotion) return;

    try {
      const request: UpdatePromotionRequest = {
        name: formData.name,
        description: formData.description || undefined,
        code: formData.code || undefined,
        product: formData.product || undefined,
        brand: formData.brand || undefined,
        discount_type: formData.discount_type,
        default_discount_value: Number.parseFloat(formData.default_discount_value),
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status,
        is_active: formData.is_active,
        max_usage: formData.max_usage ? Number.parseInt(formData.max_usage, 10) : undefined,
        priority: Number.parseInt(formData.priority, 10) || 0,
        is_stackable: formData.is_stackable,
        channel_rules: formData.channel_rules,
      };

      await updatePromotionMutation.mutateAsync({ id: selectedPromotion.id, data: request });
      setIsEditDialogOpen(false);
      setSelectedPromotion(null);
      resetForm();
    } catch (err) {
      console.error('Error updating promotion:', err);
    }
  }, [selectedPromotion, formData, updatePromotionMutation, resetForm]);

  // ==========================================================================
  // Render Helpers
  // ==========================================================================

  const getStatusBadge = useCallback((status: PromotionStatus, isActive: boolean, isCurrentlyActive: boolean) => {
    if (isCurrentlyActive) {
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
          <CheckCircle2 className="size-3" /> Live
        </Badge>
      );
    }

    const variants: Record<PromotionStatus, { class: string; icon: React.ReactNode; label: string }> = {
      draft: { class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: <Clock className="size-3" />, label: 'Draft' },
      scheduled: { class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Clock className="size-3" />, label: 'Scheduled' },
      active: { class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Play className="size-3" />, label: isActive ? 'Scheduled' : 'Paused' },
      paused: { class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Pause className="size-3" />, label: 'Paused' },
      expired: { class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="size-3" />, label: 'Expired' },
      cancelled: { class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: <XCircle className="size-3" />, label: 'Cancelled' },
    };

    const variant = variants[status] || variants.draft;

    return (
      <Badge className={`${variant.class} gap-1`}>
        {variant.icon} {variant.label}
      </Badge>
    );
  }, []);

  const formatDiscountValue = useCallback((value: string, type: DiscountType) => {
    const numValue = Number.parseFloat(value);
    if (type === 'percentage') {
      return `${numValue}%`;
    }
    return `${numValue.toFixed(2)} TND`;
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // ==========================================================================
  // Render
  // ==========================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-l-txt dark:text-d-txt flex items-center gap-2">
            <Tag className="size-6" />
            Promotions
          </h1>
          <p className="text-l-txt-2 dark:text-d-txt-2 mt-1">
            Manage multi-channel promotions and discounts
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`size-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {canManage && (
            <Button onClick={handleOpenCreate}>
              <Plus className="size-4 mr-2" />
              Create Promotion
            </Button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-txt-2 dark:text-d-txt-2" />
            <Input
              placeholder="Search promotions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {PROMOTION_STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectionMode && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="font-medium text-primary">
              {selectedItems.length} promotion(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleBulkActivate}>
                <Play className="size-4 mr-1" /> Activate
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkDeactivate}>
                <Pause className="size-4 mr-1" /> Deactivate
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="size-5" />
              <span>{error instanceof Error ? error.message : 'Failed to load promotions. Please try again.'}</span>
            </div>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="text-red-600 dark:text-red-400"
            >
              <RefreshCw className="size-4 mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={filteredPromotions.length > 0 && selectedItems.length === filteredPromotions.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Promotion / Product</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPromotions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-l-txt-2 dark:text-d-txt-2">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'No promotions match your search criteria'
                    : 'No promotions yet. Create your first promotion!'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPromotions.map(promo => (
                <PromotionRow
                  key={promo.id}
                  promotion={promo}
                  isSelected={selectedSet.has(promo.id)}
                  selectionMode={selectionMode}
                  onToggleSelection={handleToggleSelection}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onActivate={handleActivate}
                  onDeactivate={handleDeactivate}
                  onDuplicate={handleDuplicate}
                  getStatusBadge={getStatusBadge}
                  formatDiscountValue={formatDiscountValue}
                  formatDate={formatDate}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="size-5" />
              {selectedPromotion?.name}
            </DialogTitle>
            <DialogDescription>
              Promotion details and channel configurations
            </DialogDescription>
          </DialogHeader>
          
          {selectedPromotion && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-l-txt-2 dark:text-d-txt-2">Product</Label>
                  <p className="font-medium">{selectedPromotion.product_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-l-txt-2 dark:text-d-txt-2">Code</Label>
                  <p className="font-medium">{selectedPromotion.code || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-l-txt-2 dark:text-d-txt-2">Discount</Label>
                  <p className="font-medium">
                    {formatDiscountValue(selectedPromotion.default_discount_value, selectedPromotion.discount_type)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-l-txt-2 dark:text-d-txt-2">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedPromotion.status, selectedPromotion.is_active, selectedPromotion.is_currently_active)}
                  </div>
                </div>
              </div>

              {/* Channel Rules */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Channel-Specific Discounts</Label>
                <div className="border border-l-border dark:border-d-border rounded-lg divide-y divide-l-border dark:divide-d-border">
                  {selectedPromotion.channel_rules.map(rule => (
                    <div key={rule.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store className="size-4 text-l-txt-2 dark:text-d-txt-2" />
                        <span className="font-medium">{rule.sales_channel_name}</span>
                        <Badge variant="outline" className="text-xs">{rule.sales_channel_type}</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {formatDiscountValue(rule.discount_value, selectedPromotion.discount_type)}
                        </span>
                        {!rule.is_enabled && (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog - Promotion Builder */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Promotion Builder
            </DialogTitle>
            <DialogDescription>
              Create a new promotion with channel-specific discounts
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Promotion Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Summer Sale 2024"
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Promotional campaign description..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="code">Promo Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="SUMMER20"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as PromotionStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMOTION_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product & Brand */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Product *</Label>
                <Select 
                  value={formData.product?.toString() || ''} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, product: Number.parseInt(v, 10) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Brand *</Label>
                <Select 
                  value={formData.brand?.toString() || ''} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, brand: Number.parseInt(v, 10) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(b => (
                      <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Discount Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Type *</Label>
                <Select 
                  value={formData.discount_type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, discount_type: v as DiscountType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="default_discount">Default Discount *</Label>
                <div className="relative">
                  <Input
                    id="default_discount"
                    type="number"
                    min="0"
                    max={formData.discount_type === 'percentage' ? 100 : undefined}
                    step="0.01"
                    value={formData.default_discount_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, default_discount_value: e.target.value }))}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-l-txt-2 dark:text-d-txt-2">
                    {formData.discount_type === 'percentage' ? '%' : 'TND'}
                  </span>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Advanced Options */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="max_usage">Max Usage (optional)</Label>
                <Input
                  id="max_usage"
                  type="number"
                  min="0"
                  value={formData.max_usage}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_usage: e.target.value }))}
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                />
              </div>
              <div className="flex items-end gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_stackable"
                    checked={formData.is_stackable}
                    onCheckedChange={(c) => setFormData(prev => ({ ...prev, is_stackable: c }))}
                  />
                  <Label htmlFor="is_stackable" className="cursor-pointer">Stackable</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(c) => setFormData(prev => ({ ...prev, is_active: c }))}
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
                </div>
              </div>
            </div>

            {/* Channel Rules Builder */}
            <ChannelRuleBuilder
              channels={channels}
              rules={formData.channel_rules}
              onChange={(rules) => setFormData(prev => ({ ...prev, channel_rules: rules }))}
              discountType={formData.discount_type}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={createPromotionMutation.isPending || !formData.name || !formData.product || !formData.brand || formData.channel_rules.length === 0}
            >
              {createPromotionMutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
              Create Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5" />
              Edit Promotion
            </DialogTitle>
            <DialogDescription>
              Update promotion settings and channel discounts
            </DialogDescription>
          </DialogHeader>
          
          {/* Same form content as Create */}
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="edit-name">Promotion Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="edit-code">Promo Code</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as PromotionStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMOTION_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Discount Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Type *</Label>
                <Select 
                  value={formData.discount_type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, discount_type: v as DiscountType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-default_discount">Default Discount *</Label>
                <div className="relative">
                  <Input
                    id="edit-default_discount"
                    type="number"
                    min="0"
                    max={formData.discount_type === 'percentage' ? 100 : undefined}
                    step="0.01"
                    value={formData.default_discount_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, default_discount_value: e.target.value }))}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-l-txt-2 dark:text-d-txt-2">
                    {formData.discount_type === 'percentage' ? '%' : 'TND'}
                  </span>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-start_date">Start Date *</Label>
                <Input
                  id="edit-start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-end_date">End Date *</Label>
                <Input
                  id="edit-end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Advanced Options */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-max_usage">Max Usage</Label>
                <Input
                  id="edit-max_usage"
                  type="number"
                  min="0"
                  value={formData.max_usage}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_usage: e.target.value }))}
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Input
                  id="edit-priority"
                  type="number"
                  min="0"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                />
              </div>
              <div className="flex items-end gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="edit-is_stackable"
                    checked={formData.is_stackable}
                    onCheckedChange={(c) => setFormData(prev => ({ ...prev, is_stackable: c }))}
                  />
                  <Label htmlFor="edit-is_stackable" className="cursor-pointer">Stackable</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="edit-is_active"
                    checked={formData.is_active}
                    onCheckedChange={(c) => setFormData(prev => ({ ...prev, is_active: c }))}
                  />
                  <Label htmlFor="edit-is_active" className="cursor-pointer">Active</Label>
                </div>
              </div>
            </div>

            {/* Channel Rules Builder */}
            <ChannelRuleBuilder
              channels={channels}
              rules={formData.channel_rules}
              onChange={(rules) => setFormData(prev => ({ ...prev, channel_rules: rules }))}
              discountType={formData.discount_type}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={updatePromotionMutation.isPending || !formData.name || formData.channel_rules.length === 0}
            >
              {updatePromotionMutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promotion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{promotionToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
