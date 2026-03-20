import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  Pencil,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  UserCheck,
  UserX,
  Mail,
  Shield,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  Key,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { userService, type UserFilters } from '@/services/user.service';
import { roleService } from '@/services/role.service';
import { companyService } from '@/services/company.service';
import type { UserListItem, Role, Company, PaginatedResponse } from '@/types';
import { useDebounce } from '@/hooks';
import { toast } from 'sonner';

export default function UsersPage() {
  const navigate = useNavigate();

  // Data states
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    hasNext: false,
    hasPrevious: false,
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  // Selected user states
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserListItem | null>(null);
  const [userToToggle, setUserToToggle] = useState<UserListItem | null>(null);
  const [userForPassword, setUserForPassword] = useState<UserListItem | null>(
    null
  );

  // Fetch users with filters
  const fetchUsers = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const filters: UserFilters = { page };

        if (debouncedSearch) filters.search = debouncedSearch;
        if (roleFilter !== 'all') filters.role = parseInt(roleFilter);
        if (statusFilter !== 'all')
          filters.is_active = statusFilter === 'active';
        if (companyFilter !== 'all')
          filters.current_company = parseInt(companyFilter);

        const response: PaginatedResponse<UserListItem> =
          await userService.getUsers(filters);

        setUsers(response.results ?? []);
        setPagination({
          count: response.count ?? 0,
          page,
          hasNext: !!response.next,
          hasPrevious: !!response.previous,
        });
      } catch (error) {
        console.error('Failed to fetch users:', error);
        toast.error('Failed to load users');
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, roleFilter, statusFilter, companyFilter]
  );

  // Fetch roles and companies for filters
  useEffect(() => {
    const fetchFiltersData = async () => {
      try {
        const [rolesData, companiesData] = await Promise.all([
          roleService.getAllRoles(),
          companyService.getAllCompanies(),
        ]);
        setRoles(rolesData);
        setCompanies(companiesData);
      } catch (error) {
        console.error('Failed to fetch filter data:', error);
      }
    };
    fetchFiltersData();
  }, []);

  // Fetch users when filters change
  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  // Action handlers
  const handleView = (user: UserListItem) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  const handleEdit = (user: UserListItem) => {
    navigate(`/dashboard/users/${user.id}/edit`);
  };

  const handleViewDetails = (user: UserListItem) => {
    navigate(`/dashboard/users/${user.id}`);
  };

  const handleDelete = (user: UserListItem) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    setIsActioning(true);
    try {
      await userService.deleteUser(userToDelete.id);
      toast.success(`User ${userToDelete.full_name} deleted successfully`);
      fetchUsers(pagination.page);
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    } finally {
      setIsActioning(false);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleToggleStatus = (user: UserListItem) => {
    setUserToToggle(user);
    setStatusDialogOpen(true);
  };

  const confirmToggleStatus = async () => {
    if (!userToToggle) return;

    setIsActioning(true);
    try {
      await userService.toggleUserStatus(
        userToToggle.id,
        userToToggle.is_active
      );
      const action = userToToggle.is_active ? 'deactivated' : 'activated';
      toast.success(`User ${userToToggle.full_name} ${action} successfully`);
      fetchUsers(pagination.page);
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setIsActioning(false);
      setStatusDialogOpen(false);
      setUserToToggle(null);
    }
  };

  const handleChangePassword = (user: UserListItem) => {
    setUserForPassword(user);
    setPasswordDialogOpen(true);
  };

  const getRoleBadgeVariant = (roleName: string) => {
    const name = roleName.toLowerCase();
    if (name.includes('admin') || name.includes('super')) return 'default';
    if (name.includes('manager')) return 'secondary';
    return 'outline';
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Users Management
            </h1>
            <p className="text-l-text-2 dark:text-d-text-2 mt-2">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/dashboard/add-user">
              <UserCheck className="size-4" />
              Add New User
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
              <Input
                placeholder="Search by name, email, or matricule..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="size-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="size-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Company Filter */}
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Building2 className="size-4 mr-2" />
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map(company => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-l-text-2 dark:text-d-text-2">
            <span>
              Showing {users.length} of {pagination.count} users
            </span>
          </div>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-5 animate-spin" />
                    <span>Loading users...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-l-text-2 dark:text-d-text-2"
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map(user => (
                <TableRow key={user.id}>
                  {/* User Info */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10">
                        <AvatarImage
                          src={user.avatar || undefined}
                          alt={user.full_name}
                        />
                        <AvatarFallback>
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-sm text-l-text-2 dark:text-d-text-2">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Matricule */}
                  <TableCell>
                    <code className="text-sm bg-l-bg-2 dark:bg-d-bg-2 px-2 py-1 rounded">
                      {user.matricule}
                    </code>
                  </TableCell>

                  {/* Role */}
                  <TableCell>
                    <Badge
                      variant={getRoleBadgeVariant(user.role_name)}
                      className="capitalize"
                    >
                      <Shield className="size-3 mr-1" />
                      {user.role_name}
                    </Badge>
                  </TableCell>

                  {/* Company */}
                  <TableCell>
                    {user.company_name ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="size-3 text-l-text-3 dark:text-d-text-3" />
                        <span>{user.company_name}</span>
                      </div>
                    ) : (
                      <span className="text-l-text-3 dark:text-d-text-3">
                        —
                      </span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'destructive'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>

                  {/* Joined Date */}
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-l-text-2 dark:text-d-text-2">
                      <Calendar className="size-3" />
                      {new Date(user.date_joined).toLocaleDateString()}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleView(user)}>
                          <Eye className="size-4 mr-2" />
                          Quick View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleViewDetails(user)}
                        >
                          <Eye className="size-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                          <Pencil className="size-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleChangePassword(user)}
                        >
                          <Key className="size-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.is_active ? (
                            <>
                              <UserX className="size-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="size-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(user)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="size-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {!isLoading && pagination.count > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-l-text-2 dark:text-d-text-2">
              Page {pagination.page} of {Math.ceil(pagination.count / 10)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchUsers(pagination.page - 1)}
                disabled={!pagination.hasPrevious}
              >
                <ChevronLeft className="size-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchUsers(pagination.page + 1)}
                disabled={!pagination.hasNext}
              >
                Next
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Quick View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Quick overview of user information
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* Avatar and Name */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="size-20">
                  <AvatarImage
                    src={selectedUser.avatar || undefined}
                    alt={selectedUser.full_name}
                  />
                  <AvatarFallback className="text-lg">
                    {getInitials(selectedUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-2xl font-semibold">
                    {selectedUser.full_name}
                  </h3>
                  <p className="text-sm text-l-text-2 dark:text-d-text-2">
                    {selectedUser.matricule}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant={getRoleBadgeVariant(selectedUser.role_name)}
                    >
                      {selectedUser.role_name}
                    </Badge>
                    <Badge
                      variant={
                        selectedUser.is_active ? 'default' : 'destructive'
                      }
                    >
                      {selectedUser.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* User Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-l-text-2 dark:text-d-text-2">
                    Email
                  </Label>
                  <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                    <Mail className="size-4 text-l-text-3 dark:text-d-text-3" />
                    <span className="text-sm">{selectedUser.email}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-l-text-2 dark:text-d-text-2">
                    Company
                  </Label>
                  <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                    <Building2 className="size-4 text-l-text-3 dark:text-d-text-3" />
                    <span className="text-sm">
                      {selectedUser.company_name || 'Not assigned'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-l-text-2 dark:text-d-text-2">
                    Brands Access
                  </Label>
                  <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                    <span className="text-sm">
                      {(selectedUser.allowed_brand_names?.length ?? 0) > 0
                        ? selectedUser.allowed_brand_names.join(', ')
                        : 'No brands assigned'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-l-text-2 dark:text-d-text-2">
                    Joined Date
                  </Label>
                  <div className="flex items-center gap-2 p-3 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                    <Calendar className="size-4 text-l-text-3 dark:text-d-text-3" />
                    <span className="text-sm">
                      {new Date(selectedUser.date_joined).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => handleViewDetails(selectedUser)}
                  className="flex-1 gap-2"
                >
                  <Eye className="size-4" />
                  View Full Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleEdit(selectedUser)}
                  className="flex-1 gap-2"
                >
                  <Pencil className="size-4" />
                  Edit User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{userToDelete?.full_name}</strong>? This action cannot be
              undone and will permanently remove the user account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isActioning}
              className="bg-red-600 hover:bg-red-700"
            >
              {isActioning ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Toggle Confirmation Dialog */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToToggle?.is_active ? 'Deactivate' : 'Activate'} User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to{' '}
              {userToToggle?.is_active ? 'deactivate' : 'activate'}{' '}
              <strong>{userToToggle?.full_name}</strong>?
              {userToToggle?.is_active
                ? ' This will prevent them from accessing their account.'
                : ' This will restore their account access.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggleStatus}
              disabled={isActioning}
            >
              {isActioning
                ? 'Updating...'
                : userToToggle?.is_active
                  ? 'Deactivate'
                  : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Modal */}
      {userForPassword && (
        <ChangePasswordModal
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
          userId={userForPassword.id}
          userName={userForPassword.full_name}
          isAdminReset={true}
          onSuccess={() => {
            toast.success(
              `Password updated successfully for ${userForPassword.full_name}`,
              {
                description:
                  'The user will need to use the new password on their next login.',
                duration: 5000,
              }
            );
          }}
        />
      )}
    </div>
  );
}
