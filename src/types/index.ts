// Common TypeScript type definitions

// API Response Types
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  status: 'success' | 'error';
  timestamp?: string;
}

export interface ApiError {
  message: string;
  code: string | number;
  details?: Record<string, unknown>;
}

// Common UI Props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  'data-testid'?: string;
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system';

// Form Types
export interface FormFieldError {
  message: string;
  type: string;
}

export interface FormState {
  isSubmitting: boolean;
  isValid: boolean;
  errors: Record<string, FormFieldError>;
}

// Navigation Types
export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType;
  isActive?: boolean;
  isExternal?: boolean;
}

// Toast Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Storage Types
export interface StorageError {
  message: string;
  key: string;
  operation: 'read' | 'write' | 'delete';
}

export type StorageHookReturn<T> = [
  value: T,
  setValue: (value: T | ((prevValue: T) => T)) => void,
  removeValue: () => void,
];

export type SecureStorageHookReturn = [
  value: string,
  setValue: (value: string) => Promise<void>,
  removeValue: () => void,
  isLoading: boolean,
  error: Error | null,
];

// Generic utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Authentication Types
export interface User {
  id: number | string;
  matricule: string;
  email: string;
  full_name: string;
  role: string;
  roles: string[];
  can_switch_brands?: boolean;
  company_id?: number;
  allowed_brand_ids?: number[];
  permissions?: string[];
  // Computed properties for backwards compatibility
  firstName?: string;
  lastName?: string;
}

// User Profile Types
export interface UserProfile {
  phone: string | null;
  birth_date: string | null;
  gender: 'M' | 'F' | null;
  nationality: string | null;
  city: string | null;
  is_complete: boolean;
  completion_percentage: number;
}

export interface UserDetails {
  id: number;
  matricule: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: number;
  role_name: string;
  can_switch_brands: boolean;
  current_company: number | null;
  company_name: string | null;
  allowed_brands: number[];
  allowed_brand_names: string[];
  is_active: boolean;
  profile: UserProfile;
  date_joined: string;
}

export interface UpdateUserRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  profile?: Partial<{
    phone: string;
    birth_date: string;
    gender: 'M' | 'F';
    nationality: string;
    city: string;
  }>;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface LoginRequest {
  matricule: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

export interface TokenRefreshResponse {
  access: string;
}

// Company Types
export interface Company {
  id: number;
  name: string;
  legal_name: string;
  abbreviation: string;
  logo: string | null;
  email: string;
  phone: string;
  address?: string;
  city: string;
  matricule_fiscale?: string;
  registre_commerce?: string;
  activity_code?: string;
  bank_name?: string;
  rib?: string;
  is_active: boolean;
  brands_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyRequest {
  name: string;
  legal_name: string;
  abbreviation: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  matricule_fiscale?: string;
  registre_commerce?: string;
  activity_code?: string;
  bank_name?: string;
  rib?: string;
  is_active?: boolean;
  logo?: File | null;
}

// Paginated Response Type (Django REST Framework)
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// WooCommerce Config Type
export interface WooCommerceConfig {
  store_url: string;
  consumer_key?: string;
  consumer_secret?: string;
  webhook_token?: string;
}

// Sales Channel Types
export type ChannelType = 'WOOCOMMERCE' | 'POS';

export interface SalesChannel {
  id: number;
  brand: number;
  brand_name: string;
  company_id: number;
  company_name: string;
  name: string;
  channel_type: ChannelType;
  channel_type_display: string;
  is_active: boolean;
  woocommerce_config?: WooCommerceConfig | null;
  created_at: string;
  updated_at: string;
}

// Simplified SalesChannel for Brand response
export interface BrandSalesChannel {
  id: number;
  name: string;
  channel_type: ChannelType;
}

export interface CreateSalesChannelRequest {
  brand: number;
  name: string;
  channel_type: ChannelType;
  is_active?: boolean;
  woocommerce_config?: {
    store_url: string;
    consumer_key: string;
    consumer_secret: string;
  };
}

export interface GenerateCredentialsResponse {
  message: string;
  credentials: {
    webhook_token: string;
  };
  channel_id: number;
  channel_name: string;
}

// Brand Types
export interface Brand {
  id: number;
  company: number;
  company_name: string;
  name: string;
  logo: string | null;
  channels_count: number;
  sales_channels: BrandSalesChannel[];
  created_at: string;
  updated_at: string;
}

export interface CreateBrandRequest {
  company: number;
  name: string;
  logo?: File | null;
}

