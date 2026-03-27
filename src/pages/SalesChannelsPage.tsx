import { useCallback, useMemo, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Eye,
  Pencil,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  Building2,
  Tag,
  Calendar,
  Store,
  Plus,
  Globe,
  Key,
  Copy,
  Check,
  RefreshCw,
  Link2,
  Power,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
import {
  useSalesChannels,
  useCreateSalesChannel,
  usePartialUpdateSalesChannel,
  useDeleteSalesChannel,
  useRegenerateWebhook,
  salesChannelsKeys,
} from '@/hooks/queries/useSalesChannels';
import { useBrands } from '@/hooks/queries/useBrands';
import { useWebSocket } from '@/hooks/useWebSocket';
import type {
  SalesChannel,
  ChannelType,
  CreateSalesChannelRequest,
  GenerateCredentialsResponse,
} from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractErrorMessage(error: unknown): string {
  const defaultMsg = 'An error occurred. Please try again.';

  if (!error || typeof error !== 'object') return defaultMsg;

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
        if (Array.isArray(messages))
          return messages.map(msg => `${fieldName}: ${msg}`);
        return typeof messages === 'string'
          ? [`${fieldName}: ${messages}`]
          : [];
      });

      if (fieldErrors.length > 0)
        return 'Validation errors:\n\n' + fieldErrors.join('\n');

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
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WsEvent {
  event: 'created' | 'updated' | 'deleted';
  channel_id: number;
}

interface EditFormData {
  id: number;
  name: string;
  brand: number;
  channel_type: ChannelType;
  is_active: boolean;
  wc_store_url?: string;
  wc_consumer_key?: string;
  wc_consumer_secret?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SalesChannelsPage() {
  // ---- React Query --------------------------------------------------------
  const queryClient = useQueryClient();
  const { data: channels = [], isLoading, error: queryError } = useSalesChannels();
  const { data: brands = [] } = useBrands();

  const createMutation = useCreateSalesChannel();
  const updateMutation = usePartialUpdateSalesChannel();
  const deleteMutation = useDeleteSalesChannel();
  const regenerateMutation = useRegenerateWebhook();

  // Track whether WS events were triggered by local mutations
  const localMutationRef = useRef(false);

  // ---- WebSocket: real-time cache invalidation ----------------------------
  useWebSocket({
    path: '/ws/sales-channels/',
    onMessage: (raw: unknown) => {
      const data = raw as WsEvent;
      queryClient.invalidateQueries({ queryKey: salesChannelsKeys.lists() });

      // Only toast if another user triggered the change
      if (localMutationRef.current) {
        localMutationRef.current = false;
        return;
      }

      const messages: Record<WsEvent['event'], string> = {
        created: 'A new sales channel was added',
        updated: 'A sales channel was updated',
        deleted: 'A sales channel was removed',
      };

      if (data.event && messages[data.event]) {
        toast.info(messages[data.event], {
          description: 'Data refreshed automatically.',
          duration: 3000,
        });
      }
    },
  });

  // ---- Filters (local UI state) -------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredChannels = useMemo(() => {
    let result = channels;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        ch =>
          ch.name.toLowerCase().includes(q) ||
          ch.brand_name.toLowerCase().includes(q) ||
          ch.company_name.toLowerCase().includes(q)
      );
    }

    if (brandFilter !== 'all')
      result = result.filter(ch => ch.brand === Number(brandFilter));

    if (typeFilter !== 'all')
      result = result.filter(ch => ch.channel_type === typeFilter);

    return result;
  }, [channels, searchQuery, brandFilter, typeFilter]);

  // ---- Dialog state -------------------------------------------------------
  const [selectedChannel, setSelectedChannel] = useState<SalesChannel | null>(null);
  const [channelToDelete, setChannelToDelete] = useState<SalesChannel | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null);

  const [viewDialog, setViewDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [credentialsDialog, setCredentialsDialog] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Add channel form
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelBrand, setNewChannelBrand] = useState('');
  const [newChannelType, setNewChannelType] = useState<ChannelType>('WOOCOMMERCE');
  const [newChannelStoreUrl, setNewChannelStoreUrl] = useState('');
  const [newChannelConsumerKey, setNewChannelConsumerKey] = useState('');
  const [newChannelConsumerSecret, setNewChannelConsumerSecret] = useState('');

  // Credentials state
  const [credentials, setCredentials] = useState<GenerateCredentialsResponse | null>(null);
  const [newChannelCredentials, setNewChannelCredentials] = useState<SalesChannel | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // ---- Edit form helpers --------------------------------------------------
  const updateEditField = <K extends keyof EditFormData>(
    field: K,
    value: EditFormData[K]
  ) => {
    setEditFormData(prev => (prev ? { ...prev, [field]: value } : prev));
  };

  // ---- Feedback helpers ---------------------------------------------------
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setSuccessDialog(true);
  };

  const showError = (err: unknown) => {
    setErrorMessage(extractErrorMessage(err));
    setErrorDialog(true);
  };

  // ---- Action handlers ----------------------------------------------------
  const handleView = useCallback((channel: SalesChannel) => {
    setSelectedChannel(channel);
    setViewDialog(true);
  }, []);

  const handleEdit = useCallback((channel: SalesChannel) => {
    setEditFormData({
      id: channel.id,
      name: channel.name,
      brand: channel.brand,
      channel_type: channel.channel_type,
      is_active: channel.is_active,
      wc_store_url: channel.wc_store_url || '',
      wc_consumer_key: channel.wc_consumer_key || '',
      wc_consumer_secret: channel.wc_consumer_secret || '',
    });
    setEditDialog(true);
  }, []);

  const handleSaveEdit = () => {
    if (!editFormData) return;
    const isWoo = editFormData.channel_type === 'WOOCOMMERCE';

    localMutationRef.current = true;
    updateMutation.mutate(
      {
        id: editFormData.id,
        data: {
          name: editFormData.name,
          brand: editFormData.brand,
          is_active: editFormData.is_active,
          ...(isWoo && {
            wc_store_url: editFormData.wc_store_url,
            wc_consumer_key: editFormData.wc_consumer_key,
            wc_consumer_secret: editFormData.wc_consumer_secret,
          }),
        },
      },
      {
        onSuccess: () => {
          setEditDialog(false);
          showSuccess('Sales channel updated successfully!');
        },
        onError: err => {
          localMutationRef.current = false;
          setEditDialog(false);
          showError(err);
        },
      }
    );
  };

  const handleDelete = useCallback((channel: SalesChannel) => {
    setChannelToDelete(channel);
    setDeleteDialog(true);
  }, []);

  const confirmDelete = () => {
    if (!channelToDelete) return;

    localMutationRef.current = true;
    deleteMutation.mutate(channelToDelete.id, {
      onSuccess: () => {
        setDeleteDialog(false);
        showSuccess('Sales channel deleted successfully!');
      },
      onError: err => {
        localMutationRef.current = false;
        setDeleteDialog(false);
        showError(err);
      },
    });
  };

  const handleAddChannel = () => {
    if (!newChannelName.trim() || !newChannelBrand) {
      setErrorMessage('Please fill in all required fields.');
      setErrorDialog(true);
      return;
    }

    if (newChannelType === 'WOOCOMMERCE') {
      if (!newChannelStoreUrl.trim()) {
        setErrorMessage('Store URL is required for WooCommerce channels.');
        setErrorDialog(true);
        return;
      }
      if (!newChannelConsumerKey.trim() || !newChannelConsumerSecret.trim()) {
        setErrorMessage(
          'Consumer Key and Consumer Secret are required for WooCommerce channels.'
        );
        setErrorDialog(true);
        return;
      }
    }

    const createData: CreateSalesChannelRequest = {
      name: newChannelName.trim(),
      brand: Number(newChannelBrand),
      channel_type: newChannelType,
      is_active: true,
    };

    if (newChannelType === 'WOOCOMMERCE') {
      createData.wc_store_url = newChannelStoreUrl.trim();
      createData.wc_consumer_key = newChannelConsumerKey.trim();
      createData.wc_consumer_secret = newChannelConsumerSecret.trim();
    }

    localMutationRef.current = true;
    createMutation.mutate(createData, {
      onSuccess: createdChannel => {
        setAddDialog(false);
        resetAddForm();

        if (
          newChannelType === 'WOOCOMMERCE' &&
          createdChannel.wc_webhook_token
        ) {
          setNewChannelCredentials(createdChannel);
          setCredentialsDialog(true);
        } else {
          showSuccess('Sales channel created successfully!');
        }
      },
      onError: err => {
        localMutationRef.current = false;
        setAddDialog(false);
        showError(err);
      },
    });
  };

  const resetAddForm = () => {
    setNewChannelName('');
    setNewChannelBrand('');
    setNewChannelType('WOOCOMMERCE');
    setNewChannelStoreUrl('');
    setNewChannelConsumerKey('');
    setNewChannelConsumerSecret('');
  };

  const handleRegenerateWebhook = (channel: SalesChannel) => {
    localMutationRef.current = true;
    regenerateMutation.mutate(channel.id, {
      onSuccess: result => {
        setCredentials(result);
        setCredentialsDialog(true);
      },
      onError: err => showError(err),
    });
  };

  const handleRegenerateFromEdit = () => {
    if (!editFormData) return;

    localMutationRef.current = true;
    regenerateMutation.mutate(editFormData.id, {
      onSuccess: result => {
        setCredentials(result);
        showSuccess('Webhook token regenerated successfully!');
      },
      onError: err => showError(err),
    });
  };

  const handleToggleStatus = (channel: SalesChannel) => {
    localMutationRef.current = true;
    updateMutation.mutate(
      { id: channel.id, data: { is_active: !channel.is_active } },
      {
        onSuccess: () =>
          showSuccess(
            `Channel ${channel.is_active ? 'deactivated' : 'activated'} successfully!`
          ),
        onError: err => showError(err),
      }
    );
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getChannelTypeBadgeVariant = (
    type: ChannelType
  ): 'default' | 'secondary' => {
    return type === 'WOOCOMMERCE' ? 'default' : 'secondary';
  };

  // ---- Loading / Error states ---------------------------------------------
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-l-text-2 dark:text-d-text-2">
            Loading sales channels...
          </p>
        </div>
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <p className="text-red-500">
            Failed to load sales channels. Please try again.
          </p>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: salesChannelsKeys.lists(),
              })
            }
            className="mt-4"
          >
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  // ---- Render -------------------------------------------------------------
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Sales Channels
            </h1>
            <p className="text-l-text-2 dark:text-d-text-2 mt-2">
              Manage WooCommerce and POS sales channels
            </p>
          </div>
          <Button onClick={() => setAddDialog(true)} className="gap-2">
            <Plus className="size-4" />
            Add Channel
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
              <Input
                placeholder="Search by channel, brand or company..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {brands.length > 0 && (
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Tag className="size-4 mr-2" />
                  <SelectValue placeholder="Filter by brand" />
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

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="size-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="WOOCOMMERCE">WooCommerce</SelectItem>
                <SelectItem value="POS">POS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-l-text-2 dark:text-d-text-2">
            <span>
              Showing {filteredChannels.length} of {channels.length} channels
            </span>
          </div>
        </Card>
      </div>

      {/* Channels Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredChannels.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-l-text-2 dark:text-d-text-2"
                >
                  No sales channels found
                </TableCell>
              </TableRow>
            ) : (
              filteredChannels.map(channel => (
                <TableRow
                  key={channel.id}
                  className="cursor-pointer hover:bg-l-bg-2 dark:hover:bg-d-bg-2 transition-colors"
                  onClick={() => handleView(channel)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg overflow-hidden bg-l-bg-2 dark:bg-d-bg-2 flex items-center justify-center border border-l-border dark:border-d-border">
                        {channel.channel_type === 'WOOCOMMERCE' ? (
                          <Globe className="size-5 text-purple-500" />
                        ) : (
                          <Store className="size-5 text-blue-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{channel.name}</p>
                        <p className="text-xs text-l-text-3 dark:text-d-text-3">
                          {channel.company_name}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Tag className="size-4 text-l-text-3 dark:text-d-text-3" />
                      <span className="text-l-text-2 dark:text-d-text-2">
                        {channel.brand_name}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={getChannelTypeBadgeVariant(channel.channel_type)}
                    >
                      {channel.channel_type_display}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={channel.is_active ? 'default' : 'destructive'}
                      className="capitalize"
                    >
                      {channel.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-l-text-2 dark:text-d-text-2">
                      <Calendar className="size-3" />
                      {new Date(channel.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>

                  <TableCell
                    className="text-right"
                    onClick={e => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleView(channel)}>
                          <Eye className="size-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(channel)}>
                          <Pencil className="size-4 mr-2" />
                          Edit Channel
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(channel)}
                        >
                          <Power className="size-4 mr-2" />
                          {channel.is_active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        {channel.channel_type === 'WOOCOMMERCE' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRegenerateWebhook(channel)}
                              disabled={regenerateMutation.isPending}
                            >
                              <Key className="size-4 mr-2" />
                              Regenerate Webhook Token
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(channel)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="size-4 mr-2" />
                          Delete Channel
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

      {/* View Channel Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Channel Details</DialogTitle>
            <DialogDescription>
              Complete information about the sales channel
            </DialogDescription>
          </DialogHeader>

          {selectedChannel && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="size-16 rounded-lg overflow-hidden bg-l-bg-2 dark:bg-d-bg-2 flex items-center justify-center border-2 border-l-border dark:border-d-border">
                  {selectedChannel.channel_type === 'WOOCOMMERCE' ? (
                    <Globe className="size-8 text-purple-500" />
                  ) : (
                    <Store className="size-8 text-blue-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold">
                    {selectedChannel.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge
                      variant={getChannelTypeBadgeVariant(
                        selectedChannel.channel_type
                      )}
                    >
                      {selectedChannel.channel_type_display}
                    </Badge>
                    <Badge
                      variant={
                        selectedChannel.is_active ? 'default' : 'destructive'
                      }
                    >
                      {selectedChannel.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-l-text-2 dark:text-d-text-2 flex items-center gap-2">
                  <Store className="size-4" />
                  Channel Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">
                      Brand
                    </span>
                    <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                      <Tag className="size-4 text-accent-1" />
                      <span className="text-sm">
                        {selectedChannel.brand_name}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">
                      Company
                    </span>
                    <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                      <Building2 className="size-4 text-accent-1" />
                      <span className="text-sm">
                        {selectedChannel.company_name}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">
                      Created
                    </span>
                    <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                      <Calendar className="size-4 text-accent-1" />
                      <span className="text-sm">
                        {new Date(selectedChannel.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">
                      Last Updated
                    </span>
                    <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                      <Calendar className="size-4 text-accent-1" />
                      <span className="text-sm">
                        {new Date(selectedChannel.updated_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedChannel.channel_type === 'WOOCOMMERCE' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-l-text-2 dark:text-d-text-2 flex items-center gap-2">
                    <Globe className="size-4" />
                    WooCommerce Configuration
                  </h4>
                  <div className="space-y-3">
                    {selectedChannel.wc_store_url && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">
                          Store URL
                        </span>
                        <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                          <Link2 className="size-4 text-accent-1" />
                          <span className="text-sm font-mono flex-1 truncate">
                            {selectedChannel.wc_store_url}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() =>
                              copyToClipboard(
                                selectedChannel.wc_store_url,
                                'url'
                              )
                            }
                          >
                            {copiedField === 'url' ? (
                              <Check className="size-3" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedChannel.wc_consumer_key && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">
                          Consumer Key
                        </span>
                        <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                          <Key className="size-4 text-accent-1" />
                          <span className="text-sm font-mono flex-1 truncate">
                            {selectedChannel.wc_consumer_key}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() =>
                              copyToClipboard(
                                selectedChannel.wc_consumer_key,
                                'key'
                              )
                            }
                          >
                            {copiedField === 'key' ? (
                              <Check className="size-3" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedChannel.wc_consumer_secret && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">
                          Consumer Secret
                        </span>
                        <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                          <Key className="size-4 text-accent-1" />
                          <span className="text-sm font-mono flex-1 truncate">
                            {selectedChannel.wc_consumer_secret}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() =>
                              copyToClipboard(
                                selectedChannel.wc_consumer_secret,
                                'secret'
                              )
                            }
                          >
                            {copiedField === 'secret' ? (
                              <Check className="size-3" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedChannel.wc_webhook_token && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">
                          Webhook Token
                        </span>
                        <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                          <Key className="size-4 text-accent-1" />
                          <span className="text-sm font-mono flex-1 truncate">
                            {selectedChannel.wc_webhook_token}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() =>
                              copyToClipboard(
                                selectedChannel.wc_webhook_token,
                                'webhook'
                              )
                            }
                          >
                            {copiedField === 'webhook' ? (
                              <Check className="size-3" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => {
                    setViewDialog(false);
                    handleEdit(selectedChannel);
                  }}
                  className="flex-1 gap-2"
                >
                  <Pencil className="size-4" />
                  Edit Channel
                </Button>
                {selectedChannel.channel_type === 'WOOCOMMERCE' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewDialog(false);
                      handleRegenerateWebhook(selectedChannel);
                    }}
                    className="flex-1 gap-2"
                    disabled={regenerateMutation.isPending}
                  >
                    <RefreshCw
                      className={`size-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`}
                    />
                    Regenerate Webhook Token
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Channel Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Sales Channel</DialogTitle>
            <DialogDescription>Update channel information</DialogDescription>
          </DialogHeader>

          {editFormData && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Channel Name *</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                  <Input
                    id="edit-name"
                    value={editFormData.name}
                    onChange={e => updateEditField('name', e.target.value)}
                    className="pl-10"
                    placeholder="Channel name"
                  />
                </div>
              </div>

              {brands.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="edit-brand">Brand *</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3 z-10 pointer-events-none" />
                    <Select
                      value={String(editFormData.brand)}
                      onValueChange={v => updateEditField('brand', Number(v))}
                    >
                      <SelectTrigger id="edit-brand" className="pl-10">
                        <SelectValue placeholder="Select a brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map(brand => (
                          <SelectItem key={brand.id} value={String(brand.id)}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-active">Status</Label>
                <Select
                  value={editFormData.is_active ? 'active' : 'inactive'}
                  onValueChange={v =>
                    updateEditField('is_active', v === 'active')
                  }
                >
                  <SelectTrigger id="edit-active">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editFormData.channel_type === 'WOOCOMMERCE' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-store-url">Store URL</Label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                      <Input
                        id="edit-store-url"
                        value={editFormData.wc_store_url ?? ''}
                        onChange={e =>
                          updateEditField('wc_store_url', e.target.value)
                        }
                        className="pl-10"
                        placeholder="https://store.example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-consumer-key">Consumer Key</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                      <Input
                        id="edit-consumer-key"
                        value={editFormData.wc_consumer_key ?? ''}
                        onChange={e =>
                          updateEditField('wc_consumer_key', e.target.value)
                        }
                        className="pl-10"
                        placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxx"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-consumer-secret">
                      Consumer Secret
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                      <Input
                        id="edit-consumer-secret"
                        type="password"
                        value={editFormData.wc_consumer_secret ?? ''}
                        onChange={e =>
                          updateEditField('wc_consumer_secret', e.target.value)
                        }
                        className="pl-10"
                        placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxx"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook Token</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={
                          channels.find(c => c.id === editFormData.id)
                            ?.wc_webhook_token ?? 'No token generated'
                        }
                        className="flex-1 font-mono text-xs bg-muted"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={regenerateMutation.isPending}
                        onClick={handleRegenerateFromEdit}
                        className="gap-1 shrink-0"
                      >
                        <RefreshCw
                          className={`size-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`}
                        />
                        Regenerate
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Used by WooCommerce to authenticate webhook requests.
                      Regenerating will invalidate the current token.
                    </p>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending}
                  className="flex-1 gap-2"
                >
                  <Pencil className="size-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Channel Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Sales Channel</DialogTitle>
            <DialogDescription>
              Create a new WooCommerce or POS channel
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Channel Name *</Label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                <Input
                  id="new-name"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  className="pl-10"
                  placeholder="Enter channel name"
                />
              </div>
            </div>

            {brands.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="new-brand">Brand *</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3 z-10 pointer-events-none" />
                  <Select
                    value={newChannelBrand}
                    onValueChange={setNewChannelBrand}
                  >
                    <SelectTrigger id="new-brand" className="pl-10">
                      <SelectValue placeholder="Select a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(brand => (
                        <SelectItem key={brand.id} value={String(brand.id)}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-type">Channel Type *</Label>
              <Select
                value={newChannelType}
                onValueChange={value =>
                  setNewChannelType(value as ChannelType)
                }
              >
                <SelectTrigger id="new-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WOOCOMMERCE">
                    <div className="flex items-center gap-2">
                      <Globe className="size-4 text-purple-500" />
                      WooCommerce
                    </div>
                  </SelectItem>
                  <SelectItem value="POS">
                    <div className="flex items-center gap-2">
                      <Store className="size-4 text-blue-500" />
                      POS
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newChannelType === 'WOOCOMMERCE' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-store-url">Store URL *</Label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                    <Input
                      id="new-store-url"
                      value={newChannelStoreUrl}
                      onChange={e => setNewChannelStoreUrl(e.target.value)}
                      className="pl-10"
                      placeholder="https://store.example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-consumer-key">Consumer Key *</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                    <Input
                      id="new-consumer-key"
                      value={newChannelConsumerKey}
                      onChange={e => setNewChannelConsumerKey(e.target.value)}
                      className="pl-10 font-mono text-sm"
                      placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-consumer-secret">
                    Consumer Secret *
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                    <Input
                      id="new-consumer-secret"
                      type="password"
                      value={newChannelConsumerSecret}
                      onChange={e =>
                        setNewChannelConsumerSecret(e.target.value)
                      }
                      className="pl-10 font-mono text-sm"
                      placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                  </div>
                </div>

                <p className="text-xs text-l-text-3 dark:text-d-text-3">
                  Get credentials from WooCommerce &rarr; Settings &rarr;
                  Advanced &rarr; REST API
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleAddChannel}
                disabled={createMutation.isPending}
                className="flex-1 gap-2"
              >
                <Plus className="size-4" />
                {createMutation.isPending ? 'Creating...' : 'Create Channel'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAddDialog(false);
                  resetAddForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={credentialsDialog} onOpenChange={setCredentialsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-500">
              <Key className="size-5" />
              {newChannelCredentials
                ? 'Channel Created Successfully'
                : 'Webhook Token Generated'}
            </DialogTitle>
            <DialogDescription>
              {newChannelCredentials
                ? 'Your WooCommerce channel is ready. Save the webhook token below.'
                : 'Copy the webhook token now. It will not be shown again.'}
            </DialogDescription>
          </DialogHeader>

          {newChannelCredentials && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  Channel created! Use the webhook token below to configure
                  webhooks in WooCommerce.
                </p>
              </div>

              <div className="space-y-3">
                {newChannelCredentials.wc_store_url && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">
                      Store URL
                    </span>
                    <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                      <span className="text-sm font-mono flex-1 truncate">
                        {newChannelCredentials.wc_store_url}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() =>
                          copyToClipboard(
                            newChannelCredentials.wc_store_url,
                            'new-url'
                          )
                        }
                      >
                        {copiedField === 'new-url' ? (
                          <Check className="size-4 text-green-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {newChannelCredentials.wc_webhook_token && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">
                      Webhook Token
                    </span>
                    <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                      <span className="text-sm font-mono flex-1 truncate">
                        {newChannelCredentials.wc_webhook_token}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() =>
                          copyToClipboard(
                            newChannelCredentials.wc_webhook_token,
                            'created-webhook'
                          )
                        }
                      >
                        {copiedField === 'created-webhook' ? (
                          <Check className="size-4 text-green-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-l-text-3 dark:text-d-text-3 mt-1">
                      Configure this in WooCommerce &rarr; Settings &rarr;
                      Advanced &rarr; Webhooks
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={() => {
                  setCredentialsDialog(false);
                  setNewChannelCredentials(null);
                }}
                className="w-full"
              >
                Done
              </Button>
            </div>
          )}

          {credentials?.webhook_token && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  New webhook token generated! Configure it in WooCommerce
                  webhooks.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">
                    Webhook Token
                  </span>
                  <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                    <span className="text-sm font-mono flex-1 truncate">
                      {credentials.webhook_token}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() =>
                        copyToClipboard(
                          credentials.webhook_token,
                          'new-webhook'
                        )
                      }
                    >
                      {copiedField === 'new-webhook' ? (
                        <Check className="size-4 text-green-500" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-l-text-3 dark:text-d-text-3 mt-1">
                    Configure this in WooCommerce &rarr; Settings &rarr;
                    Advanced &rarr; Webhooks
                  </p>
                </div>
              </div>

              <Button
                onClick={() => {
                  setCredentialsDialog(false);
                  setCredentials(null);
                }}
                className="w-full"
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sales Channel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{channelToDelete?.name}</strong>? This action cannot be
              undone and will permanently remove the channel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Channel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={successDialog} onOpenChange={setSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-600 dark:text-green-500">
              Success!
            </AlertDialogTitle>
            <AlertDialogDescription>{successMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSuccessDialog(false)}>
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
              Error
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
    </div>
  );
}
