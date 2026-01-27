import { useCallback, useEffect, useState } from 'react';
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
  Power
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
import { salesChannelService } from '@/services/salesChannel.service';
import { brandService } from '@/services/brand.service';
import type { SalesChannel, Brand, ChannelType, GenerateCredentialsResponse } from '@/types';

export default function SalesChannelsPage() {
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<SalesChannel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [selectedChannel, setSelectedChannel] = useState<SalesChannel | null>(null);
  const [channelToDelete, setChannelToDelete] = useState<SalesChannel | null>(null);
  const [editFormData, setEditFormData] = useState<{ 
    id: number; 
    name: string; 
    brand: number; 
    channel_type: ChannelType;
    is_active: boolean;
    store_url?: string;
  } | null>(null);

  const [viewDialog, setViewDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [credentialsDialog, setCredentialsDialog] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Add channel form state
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelBrand, setNewChannelBrand] = useState<string>('');
  const [newChannelType, setNewChannelType] = useState<ChannelType>('WOOCOMMERCE');
  const [newChannelStoreUrl, setNewChannelStoreUrl] = useState('');
  const [newChannelConsumerKey, setNewChannelConsumerKey] = useState('');
  const [newChannelConsumerSecret, setNewChannelConsumerSecret] = useState('');

  // Credentials state
  const [credentials, setCredentials] = useState<GenerateCredentialsResponse | null>(null);
  const [newChannelCredentials, setNewChannelCredentials] = useState<SalesChannel | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isGeneratingCredentials, setIsGeneratingCredentials] = useState(false);

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
        const fieldErrors = Object.entries(data as Record<string, unknown>)
          .flatMap(([field, messages]) => {
            const fieldName = field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            if (Array.isArray(messages)) {
              return messages.map(msg => `${fieldName}: ${msg}`);
            }
            return typeof messages === 'string' ? [`${fieldName}: ${messages}`] : [];
          });
        
        if (fieldErrors.length > 0) {
          return 'Validation errors:\n\n' + fieldErrors.join('\n');
        }
        
        const dataObj = data as { detail?: string; message?: string };
        return dataObj.detail ?? dataObj.message ?? defaultMsg;
      }
      
      if (typeof data === 'string') return data;
    }
    
    if (err.message?.includes('Network Error')) return 'Network error. Please check your connection.';
    if (err.message?.includes('timeout')) return 'Request timeout. Please try again.';
    
    return err.message ?? defaultMsg;
  };

  // Fetch channels and brands on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [channelsData, brandsData] = await Promise.all([
        salesChannelService.getAllChannels(),
        brandService.getAllBrands()
      ]);
      setChannels(channelsData);
      setFilteredChannels(channelsData);
      setBrands(brandsData);
    } catch (err) {
      setError('Failed to load sales channels. Please try again.');
      console.error('Error fetching sales channels:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter channels
  useEffect(() => {
    let filtered = channels;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (channel) =>
          channel.name.toLowerCase().includes(query) ||
          channel.brand_name.toLowerCase().includes(query) ||
          channel.company_name.toLowerCase().includes(query)
      );
    }

    // Brand filter
    if (brandFilter !== 'all') {
      filtered = filtered.filter((channel) => channel.brand === Number(brandFilter));
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((channel) => channel.channel_type === typeFilter);
    }

    setFilteredChannels(filtered);
  }, [searchQuery, brandFilter, typeFilter, channels]);

  // Action handlers
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
      store_url: channel.woocommerce_config?.store_url || ''
    });
    setEditDialog(true);
  }, []);

  const handleSaveEdit = async () => {
    if (!editFormData) return;

    try {
      const updateData: Record<string, unknown> = {
        name: editFormData.name,
        brand: editFormData.brand,
        is_active: editFormData.is_active,
      };
      
      if (editFormData.channel_type === 'WOOCOMMERCE' && editFormData.store_url) {
        updateData.woocommerce_config = { store_url: editFormData.store_url };
      }
      
      await salesChannelService.partialUpdateChannel(editFormData.id, updateData);
      setSuccessMessage('Sales channel updated successfully!');
      setSuccessDialog(true);
      setEditDialog(false);
      fetchData();
    } catch (err) {
      console.error('Error updating channel:', err);
      setEditDialog(false);
      setErrorMessage(extractErrorMessage(err));
      setErrorDialog(true);
    }
  };

  const handleDelete = useCallback((channel: SalesChannel) => {
    setChannelToDelete(channel);
    setDeleteDialog(true);
  }, []);

  const confirmDelete = async () => {
    if (!channelToDelete) return;

    try {
      await salesChannelService.deleteChannel(channelToDelete.id);
      setSuccessMessage('Sales channel deleted successfully!');
      setSuccessDialog(true);
      setDeleteDialog(false);
      fetchData();
    } catch (err) {
      console.error('Error deleting channel:', err);
      setDeleteDialog(false);
      setErrorMessage(extractErrorMessage(err));
      setErrorDialog(true);
    }
  };

  const handleAddChannel = async () => {
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
        setErrorMessage('Consumer Key and Consumer Secret are required for WooCommerce channels.');
        setErrorDialog(true);
        return;
      }
    }

    try {
      const createData: {
        name: string;
        brand: number;
        channel_type: ChannelType;
        is_active: boolean;
        woocommerce_config?: { 
          store_url: string;
          consumer_key: string;
          consumer_secret: string;
        };
      } = {
        name: newChannelName.trim(),
        brand: Number(newChannelBrand),
        channel_type: newChannelType,
        is_active: true,
      };
      
      if (newChannelType === 'WOOCOMMERCE') {
        createData.woocommerce_config = { 
          store_url: newChannelStoreUrl.trim(),
          consumer_key: newChannelConsumerKey.trim(),
          consumer_secret: newChannelConsumerSecret.trim(),
        };
      }
      
      const createdChannel = await salesChannelService.createChannel(createData);
      setAddDialog(false);
      resetAddForm();
      
      // Show credentials dialog for WooCommerce channels (to show the auto-generated webhook_token)
      if (newChannelType === 'WOOCOMMERCE' && createdChannel.woocommerce_config?.webhook_token) {
        setNewChannelCredentials(createdChannel);
        setCredentialsDialog(true);
      } else {
        setSuccessMessage('Sales channel created successfully!');
        setSuccessDialog(true);
      }
      
      fetchData();
    } catch (err) {
      console.error('Error creating channel:', err);
      setAddDialog(false);
      setErrorMessage(extractErrorMessage(err));
      setErrorDialog(true);
    }
  };

  const resetAddForm = () => {
    setNewChannelName('');
    setNewChannelBrand('');
    setNewChannelType('WOOCOMMERCE');
    setNewChannelStoreUrl('');
    setNewChannelConsumerKey('');
    setNewChannelConsumerSecret('');
  };

  const handleRegenerateWebhook = async (channel: SalesChannel) => {
    setIsGeneratingCredentials(true);
    try {
      const result = await salesChannelService.regenerateWebhook(channel.id);
      setCredentials(result);
      setCredentialsDialog(true);
      fetchData();
    } catch (err) {
      console.error('Error regenerating webhook:', err);
      setErrorMessage(extractErrorMessage(err));
      setErrorDialog(true);
    } finally {
      setIsGeneratingCredentials(false);
    }
  };

  const handleToggleStatus = async (channel: SalesChannel) => {
    try {
      await salesChannelService.partialUpdateChannel(channel.id, {
        is_active: !channel.is_active
      });
      setSuccessMessage(`Channel ${channel.is_active ? 'deactivated' : 'activated'} successfully!`);
      setSuccessDialog(true);
      fetchData();
    } catch (err) {
      console.error('Error toggling status:', err);
      setErrorMessage(extractErrorMessage(err));
      setErrorDialog(true);
    }
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

  const getChannelTypeBadgeVariant = (type: ChannelType): 'default' | 'secondary' => {
    return type === 'WOOCOMMERCE' ? 'default' : 'secondary';
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-l-text-2 dark:text-d-text-2">Loading sales channels...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <p className="text-red-500">{error}</p>
          <Button onClick={fetchData} className="mt-4">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales Channels</h1>
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
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
              <Input
                placeholder="Search by channel, brand or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Brand Filter */}
            {brands.length > 0 && (
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Tag className="size-4 mr-2" />
                  <SelectValue placeholder="Filter by brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={String(brand.id)}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Type Filter */}
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
            <span>Showing {filteredChannels.length} of {channels.length} channels</span>
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
                <TableCell colSpan={6} className="text-center py-8 text-l-text-2 dark:text-d-text-2">
                  No sales channels found
                </TableCell>
              </TableRow>
            ) : (
              filteredChannels.map((channel) => (
                <TableRow 
                  key={channel.id}
                  className="cursor-pointer hover:bg-l-bg-2 dark:hover:bg-d-bg-2 transition-colors"
                  onClick={() => handleView(channel)}
                >
                  {/* Channel Info */}
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

                  {/* Brand */}
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Tag className="size-4 text-l-text-3 dark:text-d-text-3" />
                      <span className="text-l-text-2 dark:text-d-text-2">{channel.brand_name}</span>
                    </div>
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <Badge variant={getChannelTypeBadgeVariant(channel.channel_type)}>
                      {channel.channel_type_display}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant={channel.is_active ? 'default' : 'destructive'}
                      className="capitalize"
                    >
                      {channel.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>

                  {/* Created Date */}
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-l-text-2 dark:text-d-text-2">
                      <Calendar className="size-3" />
                      {new Date(channel.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                        <DropdownMenuItem onClick={() => handleToggleStatus(channel)}>
                          <Power className="size-4 mr-2" />
                          {channel.is_active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        {channel.channel_type === 'WOOCOMMERCE' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleRegenerateWebhook(channel)}
                              disabled={isGeneratingCredentials}
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
              {/* Header */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="size-16 rounded-lg overflow-hidden bg-l-bg-2 dark:bg-d-bg-2 flex items-center justify-center border-2 border-l-border dark:border-d-border">
                  {selectedChannel.channel_type === 'WOOCOMMERCE' ? (
                    <Globe className="size-8 text-purple-500" />
                  ) : (
                    <Store className="size-8 text-blue-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold">{selectedChannel.name}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant={getChannelTypeBadgeVariant(selectedChannel.channel_type)}>
                      {selectedChannel.channel_type_display}
                    </Badge>
                    <Badge variant={selectedChannel.is_active ? 'default' : 'destructive'}>
                      {selectedChannel.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Channel Information */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-l-text-2 dark:text-d-text-2 flex items-center gap-2">
                  <Store className="size-4" />
                  Channel Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">Brand</span>
                    <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                      <Tag className="size-4 text-accent-1" />
                      <span className="text-sm">{selectedChannel.brand_name}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">Company</span>
                    <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                      <Building2 className="size-4 text-accent-1" />
                      <span className="text-sm">{selectedChannel.company_name}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">Created</span>
                    <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                      <Calendar className="size-4 text-accent-1" />
                      <span className="text-sm">{new Date(selectedChannel.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">Last Updated</span>
                    <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                      <Calendar className="size-4 text-accent-1" />
                      <span className="text-sm">{new Date(selectedChannel.updated_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* WooCommerce Config */}
              {selectedChannel.channel_type === 'WOOCOMMERCE' && selectedChannel.woocommerce_config && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-l-text-2 dark:text-d-text-2 flex items-center gap-2">
                    <Globe className="size-4" />
                    WooCommerce Configuration
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">Store URL</span>
                      <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                        <Link2 className="size-4 text-accent-1" />
                        <span className="text-sm font-mono flex-1 truncate">
                          {selectedChannel.woocommerce_config.store_url}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => copyToClipboard(selectedChannel.woocommerce_config!.store_url, 'url')}
                        >
                          {copiedField === 'url' ? <Check className="size-3" /> : <Copy className="size-3" />}
                        </Button>
                      </div>
                    </div>

                    {selectedChannel.woocommerce_config.consumer_key && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">Consumer Key</span>
                        <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                          <Key className="size-4 text-accent-1" />
                          <span className="text-sm font-mono flex-1 truncate">
                            {selectedChannel.woocommerce_config.consumer_key}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() => copyToClipboard(selectedChannel.woocommerce_config!.consumer_key!, 'key')}
                          >
                            {copiedField === 'key' ? <Check className="size-3" /> : <Copy className="size-3" />}
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedChannel.woocommerce_config.consumer_secret && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">Consumer Secret</span>
                        <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                          <Key className="size-4 text-accent-1" />
                          <span className="text-sm font-mono flex-1 truncate">
                            {selectedChannel.woocommerce_config.consumer_secret}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() => copyToClipboard(selectedChannel.woocommerce_config!.consumer_secret!, 'secret')}
                          >
                            {copiedField === 'secret' ? <Check className="size-3" /> : <Copy className="size-3" />}
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedChannel.woocommerce_config.webhook_token && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">Webhook Token</span>
                        <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                          <Key className="size-4 text-accent-1" />
                          <span className="text-sm font-mono flex-1 truncate">
                            {selectedChannel.woocommerce_config.webhook_token}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() => copyToClipboard(selectedChannel.woocommerce_config!.webhook_token!, 'webhook')}
                          >
                            {copiedField === 'webhook' ? <Check className="size-3" /> : <Copy className="size-3" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={() => {
                  setViewDialog(false);
                  handleEdit(selectedChannel);
                }} className="flex-1 gap-2">
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
                    disabled={isGeneratingCredentials}
                  >
                    <RefreshCw className={`size-4 ${isGeneratingCredentials ? 'animate-spin' : ''}`} />
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
            <DialogDescription>
              Update channel information
            </DialogDescription>
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
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
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
                      onValueChange={(value) =>
                        setEditFormData({ ...editFormData, brand: Number(value) })
                      }
                    >
                      <SelectTrigger id="edit-brand" className="pl-10">
                        <SelectValue placeholder="Select a brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
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
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, is_active: value === 'active' })
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
                <div className="space-y-2">
                  <Label htmlFor="edit-store-url">Store URL</Label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                    <Input
                      id="edit-store-url"
                      value={editFormData.store_url || ''}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, store_url: e.target.value })
                      }
                      className="pl-10"
                      placeholder="https://store.example.com"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleSaveEdit} className="flex-1 gap-2">
                  <Pencil className="size-4" />
                  Save Changes
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
                  onChange={(e) => setNewChannelName(e.target.value)}
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
                      {brands.map((brand) => (
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
                onValueChange={(value) => setNewChannelType(value as ChannelType)}
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
                      onChange={(e) => setNewChannelStoreUrl(e.target.value)}
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
                      onChange={(e) => setNewChannelConsumerKey(e.target.value)}
                      className="pl-10 font-mono text-sm"
                      placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-consumer-secret">Consumer Secret *</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                    <Input
                      id="new-consumer-secret"
                      type="password"
                      value={newChannelConsumerSecret}
                      onChange={(e) => setNewChannelConsumerSecret(e.target.value)}
                      className="pl-10 font-mono text-sm"
                      placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                  </div>
                </div>

                <p className="text-xs text-l-text-3 dark:text-d-text-3">
                  Get credentials from WooCommerce → Settings → Advanced → REST API
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleAddChannel} className="flex-1 gap-2">
                <Plus className="size-4" />
                Create Channel
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
              {newChannelCredentials ? 'Channel Created Successfully' : 'Webhook Token Generated'}
            </DialogTitle>
            <DialogDescription>
              {newChannelCredentials 
                ? 'Your WooCommerce channel is ready. Save the webhook token below.'
                : 'Copy the webhook token now. It will not be shown again.'}
            </DialogDescription>
          </DialogHeader>

          {/* Show webhook token from newly created channel */}
          {newChannelCredentials?.woocommerce_config && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✅ Channel created! Use the webhook token below to configure webhooks in WooCommerce.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">Store URL</span>
                  <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                    <span className="text-sm font-mono flex-1 truncate">
                      {newChannelCredentials.woocommerce_config.store_url}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => copyToClipboard(newChannelCredentials.woocommerce_config!.store_url, 'new-url')}
                    >
                      {copiedField === 'new-url' ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>

                {newChannelCredentials.woocommerce_config.webhook_token && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">Webhook Token</span>
                    <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                      <span className="text-sm font-mono flex-1 truncate">
                        {newChannelCredentials.woocommerce_config.webhook_token}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => copyToClipboard(newChannelCredentials.woocommerce_config!.webhook_token!, 'created-webhook')}
                      >
                        {copiedField === 'created-webhook' ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-l-text-3 dark:text-d-text-3 mt-1">
                      Configure this in WooCommerce → Settings → Advanced → Webhooks
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

          {/* Show credentials from regenerate action */}
          {credentials?.credentials?.webhook_token && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✅ New webhook token generated! Configure it in WooCommerce webhooks.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-l-text-3 dark:text-d-text-3">Webhook Token</span>
                  <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                    <span className="text-sm font-mono flex-1 truncate">
                      {credentials.credentials.webhook_token}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => copyToClipboard(credentials.credentials.webhook_token, 'new-webhook')}
                    >
                      {copiedField === 'new-webhook' ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-l-text-3 dark:text-d-text-3 mt-1">
                    Configure this in WooCommerce → Settings → Advanced → Webhooks
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
              Are you sure you want to delete <strong>{channelToDelete?.name}</strong>?
              This action cannot be undone and will permanently remove the channel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Channel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={successDialog} onOpenChange={setSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-600 dark:text-green-500">
              ✓ Success!
            </AlertDialogTitle>
            <AlertDialogDescription>
              {successMessage}
            </AlertDialogDescription>
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
    </div>
  );
}
