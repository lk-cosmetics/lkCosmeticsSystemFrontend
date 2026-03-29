/**
 * POSAddClientDialog – Quick inline client creation for POS flow.
 * Minimal fields: first_name, last_name, phone, email.
 * Fast submit → returns the newly created Client.
 */
import { useState, useCallback, useEffect } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { clientService } from '@/services/client.service';
import type { Client, SalesChannel } from '@/types';

interface POSAddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: SalesChannel | undefined;
  editingClient?: Client | null;
  onClientCreated: (client: Client) => void;
}

export function POSAddClientDialog({
  open,
  onOpenChange,
  channel,
  editingClient,
  onClientCreated,
}: POSAddClientDialogProps) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resetForm = useCallback(() => {
    setForm({ first_name: '', last_name: '', phone: '', email: '' });
    setError('');
  }, []);

  const isEditing = !!editingClient;

  const populateFromClient = useCallback((client: Client | null | undefined) => {
    if (!client) {
      resetForm();
      return;
    }
    setForm({
      first_name: client.first_name ?? '',
      last_name: client.last_name ?? '',
      phone: client.phone ?? '',
      email: client.email ?? '',
    });
    setError('');
  }, [resetForm]);

  const handleClose = useCallback(
    (v: boolean) => {
      if (!v) resetForm();
      onOpenChange(v);
    },
    [onOpenChange, resetForm],
  );

  // Sync form with the selected client when opening in edit mode.
  useEffect(() => {
    if (open) {
      populateFromClient(editingClient);
    }
  }, [open, editingClient, populateFromClient]);

  const handleSubmit = useCallback(async () => {
    // ── Validation ──────────────────────────────────────────────────
    if (!form.first_name.trim() && !form.phone.trim()) {
      setError('At least a name or phone number is required.');
      return;
    }
    if (!channel) {
      setError('No sales channel selected.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // ── Pre-check: if phone exists, return the existing client ────
      // This avoids a 400 error and gives a better UX: the cashier
      // doesn't need to close the dialog and manually search.
      if (!editingClient && form.phone.trim()) {
        const existing = await clientService.getAll({
          search: form.phone.trim(),
          page_size: 5,
        });
        const results = Array.isArray(existing) ? existing : existing.results;
        const match = Array.isArray(results)
          ? results.find((c: Client) => c.phone === form.phone.trim())
          : null;
        if (match) {
          // Phone already registered — select that client directly
          onClientCreated(match);
          handleClose(false);
          return;
        }
      }

      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || `pos_${Date.now()}@placeholder.local`,
        source: 'POS' as const,
        brand: channel.brand,
      };

      const saved = editingClient
        ? await clientService.update(editingClient.id, payload)
        : await clientService.create(payload);

      onClientCreated(saved);
      handleClose(false);
    } catch (err: unknown) {
      // Handle API error responses with field-specific errors
      if (err instanceof Error) {
        const message = err.message;
        if (message.includes('phone') || message.includes('A client with this phone already exists')) {
          setError('This phone number is already registered. Please use a different phone number or select an existing client.');
        } else if (message.includes('email') || message.includes('A client with this email already exists')) {
          setError('This email is already registered. Please use a different email.');
        } else {
          setError(message);
        }
      } else {
        setError('Failed to create or update client');
      }
    } finally {
      setSaving(false);
    }
  }, [form, channel, editingClient, onClientCreated, handleClose]);

  const updateField = (field: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4" />
            {isEditing ? 'Edit Client' : 'Add New Client'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update client details for faster checkout.'
              : 'Quick client registration for this order.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div>
            <Label className="text-xs">First Name</Label>
            <Input
              value={form.first_name}
              onChange={e => updateField('first_name', e.target.value)}
              placeholder="First name"
              className="h-9 mt-1"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div>
            <Label className="text-xs">Last Name</Label>
            <Input
              value={form.last_name}
              onChange={e => updateField('last_name', e.target.value)}
              placeholder="Last name"
              className="h-9 mt-1"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input
              value={form.phone}
              onChange={e => updateField('phone', e.target.value)}
              placeholder="+216 XX XXX XXX"
              className="h-9 mt-1"
              type="tel"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div>
            <Label className="text-xs">Email (optional)</Label>
            <Input
              value={form.email}
              onChange={e => updateField('email', e.target.value)}
              placeholder="email@example.com"
              className="h-9 mt-1"
              type="email"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-1.5">
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <UserPlus className="size-4" />
                {isEditing ? 'Save Changes' : 'Add Client'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

