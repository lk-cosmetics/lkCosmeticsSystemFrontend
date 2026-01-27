import { useState, useEffect, useCallback } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Globe,
  Building2,
  Tag,
  Shield,
  Key,
  Save,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Pencil,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { userService } from '@/services/user.service';
import type { UserDetails, UpdateUserRequest } from '@/types';

// Tunisia cities constant
const TUNISIA_CITIES = [
  'Tunis', 'Sfax', 'Sousse', 'Kairouan', 'Bizerte', 'Gabès', 'Ariana', 
  'Gafsa', 'Monastir', 'Ben Arous', 'Kasserine', 'Médenine', 'Nabeul', 
  'Tataouine', 'Béja', 'Kef', 'Mahdia', 'Sidi Bouzid', 'Jendouba', 
  'Tozeur', 'Manouba', 'Siliana', 'Zaghouan', 'Kebili'
];

export default function SettingsPage() {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    birth_date: string;
    gender: 'M' | 'F' | '';
    nationality: string;
    city: string;
  }>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birth_date: '',
    gender: '',
    nationality: '',
    city: '',
  });

  // Password change states
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Dialog states
  const [successDialog, setSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorDialog, setErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch user data
  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userData = await userService.getCurrentUser();
      setUser(userData);
      // Initialize edit form data
      setEditFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone: userData.profile?.phone || '',
        birth_date: userData.profile?.birth_date || '',
        gender: userData.profile?.gender || '',
        nationality: userData.profile?.nationality || '',
        city: userData.profile?.city || '',
      });
    } catch (err) {
      console.error('Error fetching user:', err);
      setError('Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Extract error message
  const extractErrorMessage = (err: unknown): string => {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosError = err as { response?: { data?: { detail?: string; message?: string; error?: string } } };
      return axiosError.response?.data?.detail || 
             axiosError.response?.data?.message || 
             axiosError.response?.data?.error ||
             'An error occurred';
    }
    return 'An error occurred';
  };

  // Handle profile update
  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const updateData: UpdateUserRequest = {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        email: editFormData.email,
        profile: {
          phone: editFormData.phone || undefined,
          birth_date: editFormData.birth_date || undefined,
          gender: editFormData.gender as 'M' | 'F' || undefined,
          nationality: editFormData.nationality || undefined,
          city: editFormData.city || undefined,
        },
      };

      const updatedUser = await userService.updateUser(user.id, updateData);
      setUser(updatedUser);
      setIsEditingProfile(false);
      setSuccessMessage('Profile updated successfully!');
      setSuccessDialog(true);
    } catch (err) {
      console.error('Error updating profile:', err);
      setErrorMessage(extractErrorMessage(err));
      setErrorDialog(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!user) return;

    // Validate passwords
    if (!oldPassword) {
      setPasswordError('Current password is required');
      return;
    }
    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    setPasswordError(null);
    try {
      await userService.changePassword(user.id, {
        old_password: oldPassword,
        new_password: newPassword,
      });
      
      // Reset form and close dialog
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordDialog(false);
      setSuccessMessage('Password changed successfully!');
      setSuccessDialog(true);
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError(extractErrorMessage(err));
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    if (user) {
      setEditFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.profile?.phone || '',
        birth_date: user.profile?.birth_date || '',
        gender: user.profile?.gender || '',
        nationality: user.profile?.nationality || '',
        city: user.profile?.city || '',
      });
    }
    setIsEditingProfile(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="size-8 animate-spin text-accent-1" />
      </div>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="size-12 text-red-500" />
        <p className="text-l-text-2 dark:text-d-text-2">{error || 'Failed to load user data'}</p>
        <Button onClick={fetchUser}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-l-text-1 dark:text-d-text-1">Settings</h1>
          <p className="text-l-text-3 dark:text-d-text-3">Manage your profile and account settings</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-accent-1/10 flex items-center justify-center">
                <User className="size-8 text-accent-1" />
              </div>
              <div>
                <CardTitle className="text-xl">{user.full_name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{user.role_name}</Badge>
                  {user.is_active ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </CardDescription>
              </div>
            </div>
            {!isEditingProfile ? (
              <Button variant="outline" onClick={() => setIsEditingProfile(true)} className="gap-2">
                <Pencil className="size-4" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save
                </Button>
                <Button variant="outline" onClick={handleCancelEdit} className="gap-2">
                  <X className="size-4" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Completion */}
          {user.profile && (
            <div className="flex items-center gap-4 p-4 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-l-text-2 dark:text-d-text-2">
                    Profile Completion
                  </span>
                  <span className="text-sm font-bold text-accent-1">
                    {user.profile.completion_percentage}%
                  </span>
                </div>
                <div className="h-2 bg-l-bg-3 dark:bg-d-bg-3 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent-1 transition-all duration-300"
                    style={{ width: `${user.profile.completion_percentage}%` }}
                  />
                </div>
              </div>
              {user.profile.is_complete && (
                <CheckCircle2 className="size-6 text-green-500" />
              )}
            </div>
          )}

          <Separator />

          {/* Account Information */}
          <div>
            <h3 className="text-sm font-semibold text-l-text-1 dark:text-d-text-1 mb-4 flex items-center gap-2">
              <Shield className="size-4" />
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-l-text-3 dark:text-d-text-3 flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono">{user.matricule}</Badge>
                  Matricule
                </Label>
              </div>
              <div className="space-y-2">
                <Label className="text-l-text-3 dark:text-d-text-3">Member Since</Label>
                <p className="text-sm font-medium text-l-text-1 dark:text-d-text-1">
                  {new Date(user.date_joined).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-semibold text-l-text-1 dark:text-d-text-1 mb-4 flex items-center gap-2">
              <User className="size-4" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-l-text-3 dark:text-d-text-3">First Name</Label>
                {isEditingProfile ? (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                    <Input
                      id="first_name"
                      value={editFormData.first_name}
                      onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                ) : (
                  <p className="text-sm font-medium text-l-text-1 dark:text-d-text-1">
                    {user.first_name || '-'}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-l-text-3 dark:text-d-text-3">Last Name</Label>
                {isEditingProfile ? (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                    <Input
                      id="last_name"
                      value={editFormData.last_name}
                      onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                ) : (
                  <p className="text-sm font-medium text-l-text-1 dark:text-d-text-1">
                    {user.last_name || '-'}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-l-text-3 dark:text-d-text-3">Email</Label>
                {isEditingProfile ? (
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                    <Input
                      id="email"
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                ) : (
                  <p className="text-sm font-medium text-l-text-1 dark:text-d-text-1 flex items-center gap-2">
                    <Mail className="size-4 text-l-text-3 dark:text-d-text-3" />
                    {user.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-l-text-3 dark:text-d-text-3">Phone</Label>
                {isEditingProfile ? (
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                    <Input
                      id="phone"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="pl-10"
                      placeholder="+216 XX XXX XXX"
                    />
                  </div>
                ) : (
                  <p className="text-sm font-medium text-l-text-1 dark:text-d-text-1 flex items-center gap-2">
                    <Phone className="size-4 text-l-text-3 dark:text-d-text-3" />
                    {user.profile?.phone || '-'}
                  </p>
                )}
              </div>

              {/* Birth Date */}
              <div className="space-y-2">
                <Label htmlFor="birth_date" className="text-l-text-3 dark:text-d-text-3">Birth Date</Label>
                {isEditingProfile ? (
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                    <Input
                      id="birth_date"
                      type="date"
                      value={editFormData.birth_date}
                      onChange={(e) => setEditFormData({ ...editFormData, birth_date: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                ) : (
                  <p className="text-sm font-medium text-l-text-1 dark:text-d-text-1 flex items-center gap-2">
                    <Calendar className="size-4 text-l-text-3 dark:text-d-text-3" />
                    {user.profile?.birth_date ? new Date(user.profile.birth_date).toLocaleDateString() : '-'}
                  </p>
                )}
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-l-text-3 dark:text-d-text-3">Gender</Label>
                {isEditingProfile ? (
                  <Select
                    value={editFormData.gender}
                    onValueChange={(value) => setEditFormData({ ...editFormData, gender: value as 'M' | 'F' })}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium text-l-text-1 dark:text-d-text-1">
                    {user.profile?.gender === 'M' ? 'Male' : user.profile?.gender === 'F' ? 'Female' : '-'}
                  </p>
                )}
              </div>

              {/* Nationality */}
              <div className="space-y-2">
                <Label htmlFor="nationality" className="text-l-text-3 dark:text-d-text-3">Nationality</Label>
                {isEditingProfile ? (
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                    <Input
                      id="nationality"
                      value={editFormData.nationality}
                      onChange={(e) => setEditFormData({ ...editFormData, nationality: e.target.value })}
                      className="pl-10"
                      placeholder="e.g., Tunisian"
                    />
                  </div>
                ) : (
                  <p className="text-sm font-medium text-l-text-1 dark:text-d-text-1 flex items-center gap-2">
                    <Globe className="size-4 text-l-text-3 dark:text-d-text-3" />
                    {user.profile?.nationality || '-'}
                  </p>
                )}
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city" className="text-l-text-3 dark:text-d-text-3">City</Label>
                {isEditingProfile ? (
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3 z-10 pointer-events-none" />
                    <Select
                      value={editFormData.city}
                      onValueChange={(value) => setEditFormData({ ...editFormData, city: value })}
                    >
                      <SelectTrigger id="city" className="pl-10">
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        {TUNISIA_CITIES.map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-l-text-1 dark:text-d-text-1 flex items-center gap-2">
                    <MapPin className="size-4 text-l-text-3 dark:text-d-text-3" />
                    {user.profile?.city || '-'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Company & Brands */}
          <div>
            <h3 className="text-sm font-semibold text-l-text-1 dark:text-d-text-1 mb-4 flex items-center gap-2">
              <Building2 className="size-4" />
              Company & Brands
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-l-text-3 dark:text-d-text-3">Company</Label>
                <p className="text-sm font-medium text-l-text-1 dark:text-d-text-1 flex items-center gap-2">
                  <Building2 className="size-4 text-l-text-3 dark:text-d-text-3" />
                  {user.company_name || '-'}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-l-text-3 dark:text-d-text-3">Can Switch Brands</Label>
                <p className="text-sm font-medium text-l-text-1 dark:text-d-text-1">
                  {user.can_switch_brands ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Yes</Badge>
                  ) : (
                    <Badge variant="secondary">No</Badge>
                  )}
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-l-text-3 dark:text-d-text-3">Allowed Brands</Label>
                <div className="flex flex-wrap gap-2">
                  {user.allowed_brand_names && user.allowed_brand_names.length > 0 ? (
                    user.allowed_brand_names.map((brand, index) => (
                      <Badge key={index} variant="outline" className="gap-1">
                        <Tag className="size-3" />
                        {brand}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-l-text-3 dark:text-d-text-3">No brands assigned</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your password and security settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
            <div>
              <h4 className="font-medium text-l-text-1 dark:text-d-text-1">Password</h4>
              <p className="text-sm text-l-text-3 dark:text-d-text-3">
                Change your password to keep your account secure
              </p>
            </div>
            <Button variant="outline" onClick={() => setPasswordDialog(true)} className="gap-2">
              <Key className="size-4" />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="size-5" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {passwordError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="size-4" />
                  {passwordError}
                </p>
              </div>
            )}

            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="old_password">Current Password</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                <Input
                  id="old_password"
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Enter current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                >
                  {showOldPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                <Input
                  id="new_password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-l-text-3 dark:text-d-text-3">
                Password must be at least 8 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                <Input
                  id="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Confirm new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                onClick={handleChangePassword} 
                disabled={isChangingPassword}
                className="flex-1 gap-2"
              >
                {isChangingPassword ? <Loader2 className="size-4 animate-spin" /> : <Key className="size-4" />}
                Change Password
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPasswordDialog(false);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <AlertDialog open={successDialog} onOpenChange={setSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-600 dark:text-green-500 flex items-center gap-2">
              <CheckCircle2 className="size-5" />
              Success!
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
            <AlertDialogTitle className="text-red-600 dark:text-red-500 flex items-center gap-2">
              <AlertCircle className="size-5" />
              Error
            </AlertDialogTitle>
            <AlertDialogDescription>
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
