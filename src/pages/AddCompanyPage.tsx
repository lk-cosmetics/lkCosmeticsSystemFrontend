import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Phone, MapPin, FileText, Camera, Ban, Briefcase } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useAuthStore } from '@/store/authStore';
import { hasRole } from '@/hooks/useAuth';
import { companyService } from '@/services/company.service';

// Tunisia Governorates (Cities)
const TUNISIA_CITIES = [
  'Tunis',
  'Ariana',
  'Ben Arous',
  'Manouba',
  'Nabeul',
  'Zaghouan',
  'Bizerte',
  'Béja',
  'Jendouba',
  'Kef',
  'Siliana',
  'Sousse',
  'Monastir',
  'Mahdia',
  'Sfax',
  'Kairouan',
  'Kasserine',
  'Sidi Bouzid',
  'Gabès',
  'Medenine',
  'Tataouine',
  'Gafsa',
  'Tozeur',
  'Kebili',
] as const;

// Zod validation schema
const companySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  legal_name: z.string().min(2, 'Legal name must be at least 2 characters'),
  abbreviation: z.string().min(2, 'Abbreviation must be at least 2 characters'),
  email: z.string().email({ message: 'Invalid email address' }),
  phone: z.string().min(8, 'Phone number must be at least 8 characters'),
  city: z.enum(TUNISIA_CITIES, { required_error: 'Please select a city' }),
  address: z.string().optional(),
  matricule_fiscale: z.string().optional(),
  registre_commerce: z.string().optional(),
  activity_code: z.string().optional(),
  bank_name: z.string().optional(),
  rib: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function AddCompanyPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingData, setPendingData] = useState<CompanyFormData | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Check if user is SuperAdmin
  const isSuperAdmin = hasRole(user, 'SuperAdmin');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
  });

  const selectedCity = watch('city');

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    setPendingData(data);
    setShowConfirmDialog(true);
  };

  const confirmAddCompany = async () => {
    if (!pendingData) return;

    try {
      const companyData = {
        ...pendingData,
        logo: logoFile,
        is_active: true,
      };

      await companyService.createCompany(companyData);

      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
      reset();
      setLogoFile(null);
      setLogoPreview('');
      setPendingData(null);
    } catch (error) {
      console.error('Error adding company:', error);
      setShowConfirmDialog(false);
      
      // Extract detailed error message
      let errorMsg = 'Failed to create company. Please try again.';
      
      if (error && typeof error === 'object') {
        const err = error as any;
        
        // Check for Axios error response
        if (err.response?.data) {
          const data = err.response.data;
          
          // Handle field-specific errors
          if (typeof data === 'object' && !Array.isArray(data)) {
            const fieldErrors: string[] = [];
            
            Object.entries(data).forEach(([field, messages]) => {
              const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              if (Array.isArray(messages)) {
                messages.forEach(msg => {
                  fieldErrors.push(`${fieldName}: ${msg}`);
                });
              } else if (typeof messages === 'string') {
                fieldErrors.push(`${fieldName}: ${messages}`);
              }
            });
            
            if (fieldErrors.length > 0) {
              errorMsg = 'Validation errors:\n\n' + fieldErrors.join('\n');
            }
          }
          // Handle string error message
          else if (typeof data === 'string') {
            errorMsg = data;
          }
          // Handle detail or message property
          else if (data.detail) {
            errorMsg = data.detail;
          } else if (data.message) {
            errorMsg = data.message;
          }
        }
        // Handle network errors
        else if (err.message) {
          if (err.message.includes('Network Error')) {
            errorMsg = 'Network error. Please check your connection and ensure the backend is running.';
          } else if (err.message.includes('timeout')) {
            errorMsg = 'Request timeout. Please try again.';
          } else {
            errorMsg = err.message;
          }
        }
      }
      
      setErrorMessage(errorMsg);
      setShowErrorDialog(true);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    navigate('/dashboard/companies');
  };

  // Access denied for non-SuperAdmin users
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <Ban className="size-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-l-text-2 dark:text-d-text-2">
            You need SuperAdmin privileges to access this page.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Company</h1>
          <p className="text-l-text-2 dark:text-d-text-2 mt-2">
            Create a new company profile
          </p>
        </div>
      </div>

      <Card className="max-w-3xl mx-auto w-full p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Logo Section */}
          <div className="flex flex-col items-center gap-4 pb-6 border-b">
            <Avatar className="size-24">
              <AvatarImage src={logoPreview} alt="Company logo" />
              <AvatarFallback>
                <Building2 className="size-12" />
              </AvatarFallback>
            </Avatar>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => logoInputRef.current?.click()}
              className="gap-2"
            >
              <Camera className="size-4" />
              Upload Logo
            </Button>
            <p className="text-xs text-l-text-3 dark:text-d-text-3">
              Optional company logo
            </p>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="size-5" />
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Company Inc."
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="legal_name">Legal Name *</Label>
                <Input
                  id="legal_name"
                  {...register('legal_name')}
                  placeholder="Company Inc. SARL"
                  className={errors.legal_name ? 'border-red-500' : ''}
                />
                {errors.legal_name && (
                  <p className="text-sm text-red-500">{errors.legal_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="abbreviation">Abbreviation *</Label>
                <Input
                  id="abbreviation"
                  {...register('abbreviation')}
                  placeholder="COMP"
                  className={errors.abbreviation ? 'border-red-500' : ''}
                />
                {errors.abbreviation && (
                  <p className="text-sm text-red-500">{errors.abbreviation.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Mail className="size-5" />
              Contact Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="contact@company.com"
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="+216 71 123 456"
                    className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3 z-10 pointer-events-none" />
                  <Select
                    value={selectedCity}
                    onValueChange={(value) => setValue('city', value as typeof TUNISIA_CITIES[number])}
                  >
                    <SelectTrigger 
                      id="city"
                      className={`pl-10 ${errors.city ? 'border-red-500' : ''}`}
                    >
                      <SelectValue placeholder="Select a city" />
                    </SelectTrigger>
                    <SelectContent>
                      {TUNISIA_CITIES.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {errors.city && (
                  <p className="text-sm text-red-500">{errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  {...register('address')}
                  placeholder="123 Business Street"
                />
              </div>
            </div>
          </div>

          {/* Legal & Banking Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="size-5" />
              Legal & Banking Information (Optional)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matricule_fiscale">Matricule Fiscale</Label>
                <Input
                  id="matricule_fiscale"
                  {...register('matricule_fiscale')}
                  placeholder="1234567ABC"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registre_commerce">Registre Commerce</Label>
                <Input
                  id="registre_commerce"
                  {...register('registre_commerce')}
                  placeholder="B123456789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity_code">Activity Code</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-l-text-3 dark:text-d-text-3" />
                  <Input
                    id="activity_code"
                    {...register('activity_code')}
                    placeholder="NAF/APE code"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  {...register('bank_name')}
                  placeholder="Bank of Tunisia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rib">RIB</Label>
                <Input
                  id="rib"
                  {...register('rib')}
                  placeholder="12345678901234567890"
                  maxLength={20}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-6 border-t">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Company'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/companies')}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Company Creation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to create this company?
              {pendingData && (
                <div className="mt-4 space-y-2 p-4 bg-l-bg-2 dark:bg-d-bg-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4" />
                    <span className="font-medium">{pendingData.name}</span>
                    <Badge variant="secondary">{pendingData.abbreviation}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-l-text-2 dark:text-d-text-2">
                    <Mail className="size-3" />
                    {pendingData.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-l-text-2 dark:text-d-text-2">
                    <MapPin className="size-3" />
                    {pendingData.city}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAddCompany}>
              Create Company
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-600 dark:text-green-500">
              ✓ Company Created Successfully!
            </AlertDialogTitle>
            <AlertDialogDescription>
              The company has been created and is now active. You can view and manage it in the companies list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleSuccessClose}>
              View Companies
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 dark:text-red-500">
              ✗ Error Creating Company
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowErrorDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
