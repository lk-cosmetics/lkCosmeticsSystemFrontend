import { useCallback, useEffect, useState } from 'react';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
import { roleService } from '@/services/role.service';
import type { Role, CreateRoleRequest } from '@/types';
import { useDebounce } from '@/hooks';
import { toast } from 'sonner';

export default function RolesPage() {
  // Data states
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState<CreateRoleRequest>({
    name: '',
    description: '',
    can_switch_brands: false,
    is_admin: false,
  });
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await roleService.getRoles({
        search: debouncedSearch || undefined,
      });
      setRoles(response.results);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Handlers
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    setIsActioning(true);
    try {
      await roleService.createRole(formData);
      toast.success('Role created successfully');
      setCreateDialogOpen(false);
      resetForm();
      fetchRoles();
    } catch (error) {
      console.error('Failed to create role:', error);
      toast.error('Failed to create role');
    } finally {
      setIsActioning(false);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      can_switch_brands: role.can_switch_brands,
      is_admin: role.is_admin,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRole || !formData.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    setIsActioning(true);
    try {
      await roleService.updateRole(editingRole.id, formData);
      toast.success('Role updated successfully');
      setEditDialogOpen(false);
      resetForm();
      fetchRoles();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    } finally {
      setIsActioning(false);
    }
  };

  const handleDelete = (role: Role) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;

    // Check if role has users
    if (roleToDelete.users_count && roleToDelete.users_count > 0) {
      toast.error(
        `Cannot delete role with ${roleToDelete.users_count} assigned users`
      );
      setDeleteDialogOpen(false);
      return;
    }

    setIsActioning(true);
    try {
      await roleService.deleteRole(roleToDelete.id);
      toast.success('Role deleted successfully');
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      fetchRoles();
    } catch (error) {
      console.error('Failed to delete role:', error);
      toast.error(
        'Failed to delete role. Make sure no users are assigned to this role.'
      );
    } finally {
      setIsActioning(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      can_switch_brands: false,
      is_admin: false,
    });
    setEditingRole(null);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Roles Management
            </h1>
            <p className="text-l-text-2 dark:text-d-text-2 mt-2">
              Manage user roles and permissions
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Add New Role
          </Button>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
              <Input
                placeholder="Search roles..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="mt-4 text-sm text-l-text-2 dark:text-d-text-2">
            {roles.length} role(s) found
          </div>
        </Card>
      </div>

      {/* Roles Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Can Switch Brands</TableHead>
              <TableHead>Is Admin</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-5 animate-spin" />
                    <span>Loading roles...</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!isLoading && roles.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-l-text-2 dark:text-d-text-2"
                >
                  No roles found
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              roles.length > 0 &&
              roles.map(role => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="size-4 text-primary" />
                      <span className="font-medium">{role.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-l-text-2 dark:text-d-text-2">
                      {role.description || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {role.can_switch_brands ? (
                      <CheckCircle2 className="size-5 text-green-600" />
                    ) : (
                      <XCircle className="size-5 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    {role.is_admin ? (
                      <Badge variant="default">Admin</Badge>
                    ) : (
                      <Badge variant="outline">Regular</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-muted-foreground" />
                      <span>{role.users_count ?? 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-l-text-2 dark:text-d-text-2">
                      {new Date(role.created_at).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(role)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(role)}
                        disabled={!!role.users_count && role.users_count > 0}
                      >
                        <Trash2 className="size-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>Add a new role to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the role's responsibilities..."
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Can Switch Brands</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users with this role to switch between brands
                </p>
              </div>
              <Switch
                checked={formData.can_switch_brands}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, can_switch_brands: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Is Admin</Label>
                <p className="text-sm text-muted-foreground">
                  Grant administrative privileges
                </p>
              </div>
              <Switch
                checked={formData.is_admin}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, is_admin: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isActioning}>
              {isActioning ? 'Creating...' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Update role information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Role Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the role's responsibilities..."
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Can Switch Brands</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users with this role to switch between brands
                </p>
              </div>
              <Switch
                checked={formData.can_switch_brands}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, can_switch_brands: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Is Admin</Label>
                <p className="text-sm text-muted-foreground">
                  Grant administrative privileges
                </p>
              </div>
              <Switch
                checked={formData.is_admin}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, is_admin: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isActioning}>
              {isActioning ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role{' '}
              <strong>{roleToDelete?.name}</strong>?
              {roleToDelete?.users_count && roleToDelete.users_count > 0 ? (
                <span className="block mt-2 text-red-500">
                  This role has {roleToDelete.users_count} assigned user(s) and
                  cannot be deleted.
                </span>
              ) : (
                ' This action cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={
                isActioning ||
                (!!roleToDelete?.users_count && roleToDelete.users_count > 0)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              {isActioning ? 'Deleting...' : 'Delete Role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
