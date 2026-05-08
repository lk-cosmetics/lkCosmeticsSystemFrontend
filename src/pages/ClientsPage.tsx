/**
 * ClientsPage – Full CRUD client management with KPI dashboard,
 * detail/edit dialogs, block/unblock, contact actions, and filtering.
 */
import { useMemo, useState, useCallback } from 'react';
import {
  Users, Search, RefreshCw, Plus, Eye, Pencil, Trash2,
  Phone, MessageCircleMore, Loader2, ShieldAlert, ShieldCheck,
  Mail, MapPin, Store, Hash, Calendar, FileText,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  useBrands, useClients, useCreateClient, useUpdateClient,
  useDeleteClient, useBlockClient,
} from '@/hooks/queries';
import type { Client, CreateClientRequest } from '@/types';

/* ═══════════════════════════════════════════════════════════════════════════ */
/* HELPERS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

const SOURCE_BADGE: Record<string, string> = {
  WOOCOMMERCE: 'bg-indigo-100 text-indigo-800',
  POS: 'bg-teal-100 text-teal-800',
  MANUAL: 'bg-gray-100 text-gray-700',
};

function SourceBadge({ source }: { source: string }) {
  return (
    <Badge variant="outline" className={`text-xs border-transparent ${SOURCE_BADGE[source] ?? ''}`}>
      {source}
    </Badge>
  );
}

function StatusBadge({ blocked }: { blocked: boolean }) {
  return blocked
    ? <Badge variant="destructive" className="text-xs">Blocked</Badge>
    : <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-800 border-transparent">Active</Badge>;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/* ═══════════════════════════════════════════════════════════════════════════ */
/* CLIENT DETAIL / EDIT DIALOG                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface ClientDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (client: Client) => void;
  onBlock: (id: number, blocked: boolean) => void;
  onDelete: (client: Client) => void;
  blockLoading?: boolean;
}

function ClientDetailDialog({
  client, open, onOpenChange, onEdit, onBlock, onDelete, blockLoading,
}: ClientDialogProps) {
  if (!client) return null;

  const phone = client.phone;
  const cleanPhone = phone?.replace(/[^0-9+]/g, '') ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5" /> {client.full_name || client.email}
          </DialogTitle>
          <DialogDescription>
            {client.source} client {client.brand_name ? `· ${client.brand_name}` : ''}
          </DialogDescription>
        </DialogHeader>

        {/* Contact actions */}
        {phone && (
          <div className="flex gap-2">
            <Button
              size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs"
              onClick={() => window.open(`tel:${cleanPhone}`, '_self')}
            >
              <Phone className="size-3" /> Call {phone}
            </Button>
            <Button
              size="sm" variant="outline"
              className="flex-1 gap-1.5 h-8 text-xs text-green-700 border-green-200 hover:bg-green-50"
              onClick={() => window.open(`https://wa.me/${cleanPhone}`, '_blank')}
            >
              <MessageCircleMore className="size-3" /> WhatsApp
            </Button>
          </div>
        )}

        <Separator />

        {/* Detail grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field icon={<Mail className="size-3.5" />} label="Email" value={client.email} />
          <Field icon={<Phone className="size-3.5" />} label="Phone" value={phone || '—'} />
          <Field icon={<Users className="size-3.5" />} label="Name" value={client.full_name} />
          <Field label="Source"><SourceBadge source={client.source} /></Field>
          <Field icon={<Store className="size-3.5" />} label="Brand" value={client.brand_name ?? '—'} />
          <Field label="Channel" value={client.sales_channel_name ?? '—'} />
          <Field label="Reseller" value={client.reseller_name ?? '—'} />
          <Field icon={<MapPin className="size-3.5" />} label="City" value={client.city || '—'} />
          <Field label="State" value={client.state || '—'} />
          <Field label="Postcode" value={client.postcode || '—'} />
          <Field label="Country" value={client.country || '—'} />
          <Field icon={<Hash className="size-3.5" />} label="WC ID" value={client.wc_customer_id != null ? String(client.wc_customer_id) : '—'} />
          <Field label="Points" value={String(client.points)} />
          <Field label="Orders" value={String(client.number_of_orders)} />
          <Field label="Returns" value={String(client.number_of_returns)} />
          <Field label="Status"><StatusBadge blocked={client.is_blocked} /></Field>
          <Field icon={<Calendar className="size-3.5" />} label="Created" value={fmtDate(client.created_at)} />
          <Field label="Updated" value={fmtDate(client.updated_at)} />
          <div className="col-span-2">
            <Field label="Address" value={client.address || '—'} />
          </div>
          <div className="col-span-2">
            <Field icon={<FileText className="size-3.5" />} label="Notes" value={client.notes || '—'} />
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end flex-wrap">
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => onEdit(client)}>
            <Pencil className="size-3" /> Edit
          </Button>
          <Button
            size="sm" variant="outline"
            className={`gap-1.5 h-8 text-xs ${client.is_blocked ? 'text-emerald-700 border-emerald-200 hover:bg-emerald-50' : 'text-amber-700 border-amber-200 hover:bg-amber-50'}`}
            onClick={() => onBlock(client.id, !client.is_blocked)}
            disabled={blockLoading}
          >
            {blockLoading ? <Loader2 className="size-3 animate-spin" /> : client.is_blocked ? <ShieldCheck className="size-3" /> : <ShieldAlert className="size-3" />}
            {client.is_blocked ? 'Unblock' : 'Block'}
          </Button>
          <Button
            size="sm" variant="outline"
            className="gap-1.5 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => onDelete(client)}
          >
            <Trash2 className="size-3" /> Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, icon, children }: {
  label: string; value?: string; icon?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <div>
      <span className="text-muted-foreground text-xs flex items-center gap-1">
        {icon}{label}
      </span>
      {children ?? <p className="font-medium text-sm mt-0.5">{value}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ADD / EDIT CLIENT DIALOG                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null; // null = create mode
  brands: { id: number; name: string }[];
  onSave: (data: Partial<CreateClientRequest>, id?: number) => Promise<void>;
  saving: boolean;
}

function ClientEditDialog({ open, onOpenChange, client, brands, onSave, saving }: EditDialogProps) {
  const isEdit = !!client;
  const [form, setForm] = useState<Partial<CreateClientRequest>>({});
  const [error, setError] = useState('');

  // Reset form when dialog opens
  const handleOpen = useCallback((v: boolean) => {
    if (v && client) {
      setForm({
        email: client.email,
        first_name: client.first_name ?? '',
        last_name: client.last_name ?? '',
        phone: client.phone ?? '',
        address: client.address ?? '',
        city: client.city ?? '',
        state: client.state ?? '',
        postcode: client.postcode ?? '',
        country: client.country ?? '',
        brand: client.brand,
        notes: client.notes ?? '',
        points: client.points,
      });
    } else if (v) {
      setForm({});
    }
    setError('');
    onOpenChange(v);
  }, [client, onOpenChange]);

  const handleSubmit = async () => {
    if (!form.email?.trim()) { setError('Email is required.'); return; }
    setError('');
    try {
      await onSave(form, client?.id);
      handleOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save.';
      if (msg.includes('phone')) setError('This phone number is already registered.');
      else if (msg.includes('email')) setError('This email is already registered.');
      else setError(msg);
    }
  };

  const set = (field: string, value: string | number | null) =>
    setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Client' : 'Add Client'}</DialogTitle>
          <DialogDescription>
            {isEdit ? `Update ${client.full_name || client.email}` : 'Register a new client'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs font-medium">Email *</Label>
            <Input
              value={form.email ?? ''}
              onChange={e => set('email', e.target.value)}
              placeholder="client@example.com"
              className="h-9 mt-1"
              type="email"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">First Name</Label>
            <Input
              value={form.first_name ?? ''}
              onChange={e => set('first_name', e.target.value)}
              placeholder="First name"
              className="h-9 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Last Name</Label>
            <Input
              value={form.last_name ?? ''}
              onChange={e => set('last_name', e.target.value)}
              placeholder="Last name"
              className="h-9 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Phone</Label>
            <Input
              value={form.phone ?? ''}
              onChange={e => set('phone', e.target.value)}
              placeholder="+216 XX XXX XXX"
              className="h-9 mt-1"
              type="tel"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">City</Label>
            <Input
              value={form.city ?? ''}
              onChange={e => set('city', e.target.value)}
              placeholder="City"
              className="h-9 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">State</Label>
            <Input
              value={form.state ?? ''}
              onChange={e => set('state', e.target.value)}
              placeholder="State"
              className="h-9 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Postcode</Label>
            <Input
              value={form.postcode ?? ''}
              onChange={e => set('postcode', e.target.value)}
              placeholder="Postcode"
              className="h-9 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Country</Label>
            <Input
              value={form.country ?? ''}
              onChange={e => set('country', e.target.value)}
              placeholder="TN"
              className="h-9 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Brand</Label>
            <Select
              value={form.brand != null ? String(form.brand) : ''}
              onValueChange={v => set('brand', v ? Number(v) : null)}
            >
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium">Points</Label>
            <Input
              type="number"
              value={form.points ?? 0}
              onChange={e => set('points', Number(e.target.value))}
              className="h-9 mt-1"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-medium">Address</Label>
            <Input
              value={form.address ?? ''}
              onChange={e => set('address', e.target.value)}
              placeholder="Full address"
              className="h-9 mt-1"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-medium">Notes</Label>
            <Textarea
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="Internal notes..."
              className="min-h-16 text-sm resize-none mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !form.email?.trim()} className="gap-1.5">
            {saving ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : isEdit ? 'Save Changes' : 'Add Client'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* MAIN PAGE                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [blockedFilter, setBlockedFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');

  // Detail dialog
  const [viewClient, setViewClient] = useState<Client | null>(null);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  // Query hooks
  const { data: brands = [] } = useBrands();
  const { data: clientsResponse, isLoading, error, refetch } = useClients({ page_size: 500 });
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const deleteMutation = useDeleteClient();
  const blockMutation = useBlockClient();

  const clients = useMemo(() => {
    if (!clientsResponse) return [];
    return Array.isArray(clientsResponse) ? clientsResponse : (clientsResponse.results ?? []);
  }, [clientsResponse]);

  const filtered = useMemo(() => {
    let items: Client[] = clients;
    if (sourceFilter !== 'all') items = items.filter(c => c.source === sourceFilter);
    if (blockedFilter === 'blocked') items = items.filter(c => c.is_blocked);
    else if (blockedFilter === 'active') items = items.filter(c => !c.is_blocked);
    if (brandFilter !== 'all') items = items.filter(c => String(c.brand) === brandFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(c =>
        c.email.toLowerCase().includes(q) ||
        c.full_name.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [clients, sourceFilter, blockedFilter, brandFilter, search]);

  const stats = useMemo(() => ({
    total: clients.length,
    wc: clients.filter(c => c.source === 'WOOCOMMERCE').length,
    pos: clients.filter(c => c.source === 'POS').length,
    manual: clients.filter(c => c.source === 'MANUAL').length,
    blocked: clients.filter(c => c.is_blocked).length,
  }), [clients]);

  /* ── handlers ── */

  const handleOpenEdit = (client: Client | null) => {
    setEditingClient(client);
    setEditDialogOpen(true);
    // Close detail dialog when opening edit
    if (client) setViewClient(null);
  };

  const handleSave = async (data: Partial<CreateClientRequest>, id?: number) => {
    if (id) {
      await updateMutation.mutateAsync({ id, payload: data });
    } else {
      await createMutation.mutateAsync(data as CreateClientRequest);
    }
  };

  const handleBlock = async (id: number, blocked: boolean) => {
    await blockMutation.mutateAsync({ id, is_blocked: blocked });
    // Update the detail view if open
    if (viewClient?.id === id) {
      setViewClient(prev => prev ? { ...prev, is_blocked: blocked } : null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      setViewClient(null);
    } catch (err) {
      console.error('Failed to delete client:', err);
    }
  };

  const handleDeleteFromDetail = (client: Client) => {
    setViewClient(null);
    setDeleteTarget(client);
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
            <Users className="size-6" /> Clients
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage customers from WooCommerce, POS, and manual entry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => handleOpenEdit(null)} className="gap-1.5">
            <Plus className="size-4" /> Add Client
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`size-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Failed to Load Clients</h3>
              <p className="text-sm text-red-700">{error instanceof Error ? error.message : String(error)}</p>
            </div>
            <Button size="sm" onClick={() => refetch()} disabled={isLoading}>
              {isLoading ? 'Retrying...' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="p-4 pb-1"><CardTitle className="text-xs text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-bold tabular-nums">{stats.total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1"><CardTitle className="text-xs text-indigo-600">WooCommerce</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-indigo-600 tabular-nums">{stats.wc}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1"><CardTitle className="text-xs text-teal-600">POS</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-teal-600 tabular-nums">{stats.pos}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1"><CardTitle className="text-xs text-gray-600">Manual</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-gray-600 tabular-nums">{stats.manual}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1"><CardTitle className="text-xs text-red-600">Blocked</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-red-600 tabular-nums">{stats.blocked}</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="WOOCOMMERCE">WooCommerce</SelectItem>
                <SelectItem value="POS">POS</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={blockedFilter} onValueChange={setBlockedFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {isLoading ? 'Loading...' : `${filtered.length} client${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="h-10 text-xs font-semibold">Name</TableHead>
                <TableHead className="h-10 text-xs font-semibold">Email</TableHead>
                <TableHead className="h-10 text-xs font-semibold hidden sm:table-cell">Phone</TableHead>
                <TableHead className="h-10 text-xs font-semibold hidden md:table-cell">Brand</TableHead>
                <TableHead className="h-10 text-xs font-semibold hidden lg:table-cell">City</TableHead>
                <TableHead className="h-10 text-xs font-semibold">Source</TableHead>
                <TableHead className="h-10 text-xs font-semibold">Status</TableHead>
                <TableHead className="h-10 text-xs font-semibold text-center hidden md:table-cell">Orders</TableHead>
                <TableHead className="h-10 text-xs font-semibold hidden lg:table-cell">Created</TableHead>
                <TableHead className="h-10 text-xs font-semibold w-24 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {error && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                    Unable to load clients. Check the error above.
                  </TableCell>
                </TableRow>
              )}
              {!error && isLoading && (
                <TableRow>
                  <TableCell colSpan={10} className="py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Loading clients...</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!error && !isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                    No clients found.
                  </TableCell>
                </TableRow>
              )}
              {!error && !isLoading && filtered.map(c => (
                <TableRow
                  key={c.id}
                  className={`group hover:bg-muted/30 cursor-pointer transition-colors ${c.is_blocked ? 'opacity-60' : ''}`}
                  onClick={() => setViewClient(c)}
                >
                  <TableCell className="font-medium text-sm truncate max-w-[140px]">{c.full_name || '—'}</TableCell>
                  <TableCell className="text-xs truncate max-w-[160px]">{c.email}</TableCell>
                  <TableCell className="text-xs hidden sm:table-cell font-mono">{c.phone || '—'}</TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{c.brand_name ?? '—'}</TableCell>
                  <TableCell className="text-xs hidden lg:table-cell">{c.city || '—'}</TableCell>
                  <TableCell><SourceBadge source={c.source} /></TableCell>
                  <TableCell><StatusBadge blocked={c.is_blocked} /></TableCell>
                  <TableCell className="text-xs text-center hidden md:table-cell tabular-nums">{c.number_of_orders}</TableCell>
                  <TableCell className="text-xs hidden lg:table-cell">{fmtDate(c.created_at)}</TableCell>
                  <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => setViewClient(c)}>
                        <Eye className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => handleOpenEdit(c)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => setDeleteTarget(c)}>
                        <Trash2 className="size-3.5 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detail dialog */}
      <ClientDetailDialog
        client={viewClient}
        open={!!viewClient}
        onOpenChange={() => setViewClient(null)}
        onEdit={handleOpenEdit}
        onBlock={handleBlock}
        onDelete={handleDeleteFromDetail}
        blockLoading={blockMutation.isPending}
      />

      {/* Edit / Add dialog */}
      <ClientEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={editingClient}
        brands={brands}
        onSave={handleSave}
        saving={saving}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
