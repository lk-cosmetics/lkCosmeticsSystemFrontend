/**
 * ClientsPage – Lists all auto-registered and manually added clients.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  IconUsers,
  IconSearch,
  IconRefresh,
  IconPlus,
  IconEye,
} from '@tabler/icons-react';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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

import { clientService } from '@/services/client.service';
import type { Client, CreateClientRequest } from '@/types';

/* ─── helpers ─── */

const SOURCE_BADGE: Record<string, string> = {
  WOOCOMMERCE: 'bg-indigo-100 text-indigo-800',
  POS: 'bg-teal-100 text-teal-800',
  MANUAL: 'bg-gray-100 text-gray-700',
};

function SourceBadge({ source }: Readonly<{ source: string }>) {
  return (
    <Badge
      variant="outline"
      className={`text-xs ${SOURCE_BADGE[source] ?? ''}`}
    >
      {source}
    </Badge>
  );
}

/* ─── detail extracted ─── */

function ClientDetailContent({ client }: Readonly<{ client: Client }>) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mt-2">
      <div>
        <span className="text-muted-foreground block text-xs">Email</span>
        <p className="font-medium">{client.email}</p>
      </div>
      <div>
        <span className="text-muted-foreground block text-xs">Phone</span>
        <p>{client.phone || '—'}</p>
      </div>
      <div>
        <span className="text-muted-foreground block text-xs">Name</span>
        <p>{client.full_name}</p>
      </div>
      <div>
        <span className="text-muted-foreground block text-xs">Source</span>
        <SourceBadge source={client.source} />
      </div>
      <div>
        <span className="text-muted-foreground block text-xs">City</span>
        <p>{client.city || '—'}</p>
      </div>
      <div>
        <span className="text-muted-foreground block text-xs">Country</span>
        <p>{client.country || '—'}</p>
      </div>
      <div>
        <span className="text-muted-foreground block text-xs">Channel</span>
        <p>{client.sales_channel_name ?? '—'}</p>
      </div>
      <div>
        <span className="text-muted-foreground block text-xs">WC ID</span>
        <p>{client.wc_customer_id ?? '—'}</p>
      </div>
      <div className="col-span-2">
        <span className="text-muted-foreground block text-xs">Address</span>
        <p>{client.address || '—'}</p>
      </div>
      <div className="col-span-2">
        <span className="text-muted-foreground block text-xs">Notes</span>
        <p>{client.notes || '—'}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [viewClient, setViewClient] = useState<Client | null>(null);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<Partial<CreateClientRequest>>({});
  const [addLoading, setAddLoading] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clientService.getAll({ page_size: 500 });
      setClients(res.results ?? res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    let items = clients;
    if (sourceFilter !== 'all')
      items = items.filter(c => c.source === sourceFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        c =>
          c.email.toLowerCase().includes(q) ||
          c.full_name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
      );
    }
    return items;
  }, [clients, sourceFilter, search]);

  const handleAdd = async () => {
    if (!addForm.email || !addForm.company) return;
    setAddLoading(true);
    try {
      await clientService.create(addForm as CreateClientRequest);
      setAddOpen(false);
      setAddForm({});
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await clientService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IconUsers className="h-6 w-6" /> Clients
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Customers auto-registered from orders or added manually
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <IconPlus className="h-4 w-4 mr-1" /> Add Client
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <IconRefresh
              className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`}
            />{' '}
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs text-muted-foreground">
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">{clients.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs text-indigo-600">
              WooCommerce
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-indigo-600">
              {clients.filter(c => c.source === 'WOOCOMMERCE').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs text-teal-600">POS</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-teal-600">
              {clients.filter(c => c.source === 'POS').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs text-gray-600">Manual</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-gray-600">
              {clients.filter(c => c.source === 'MANUAL').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="WOOCOMMERCE">WooCommerce</SelectItem>
            <SelectItem value="POS">POS</SelectItem>
            <SelectItem value="MANUAL">Manual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-10 text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-10 text-muted-foreground"
                >
                  No clients found.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.email}</TableCell>
                  <TableCell>{c.full_name}</TableCell>
                  <TableCell className="text-xs">{c.phone || '—'}</TableCell>
                  <TableCell className="text-xs">{c.city || '—'}</TableCell>
                  <TableCell>
                    <SourceBadge source={c.source} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewClient(c)}
                    >
                      <IconEye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(c)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      {/* view detail dialog */}
      <Dialog open={!!viewClient} onOpenChange={() => setViewClient(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Client Detail</DialogTitle>
            <DialogDescription>{viewClient?.email}</DialogDescription>
          </DialogHeader>
          {viewClient && <ClientDetailContent client={viewClient} />}
        </DialogContent>
      </Dialog>

      {/* add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
            <DialogDescription>
              Manually register a new client
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Email *</Label>
              <Input
                value={addForm.email ?? ''}
                onChange={e =>
                  setAddForm({ ...addForm, email: e.target.value })
                }
              />
            </div>
            <div>
              <Label>First Name</Label>
              <Input
                value={addForm.first_name ?? ''}
                onChange={e =>
                  setAddForm({ ...addForm, first_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input
                value={addForm.last_name ?? ''}
                onChange={e =>
                  setAddForm({ ...addForm, last_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={addForm.phone ?? ''}
                onChange={e =>
                  setAddForm({ ...addForm, phone: e.target.value })
                }
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={addForm.city ?? ''}
                onChange={e => setAddForm({ ...addForm, city: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={addLoading || !addForm.email}>
              {addLoading ? 'Saving…' : 'Save Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {deleteTarget?.full_name}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
