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
  /** RBAC permission codenames (e.g. 'manage_products', 'use_pos'). */
  permissions: string[];
  // Computed properties for backwards compatibility
  firstName?: string;
  lastName?: string;
}

// User Profile Types
export interface UserProfile {
  id?: number;
  phone: string | null;
  birth_date: string | null;
  gender: 'M' | 'F' | null;
  gender_display?: string | null;
  nationality: string | null;
  city: string | null;
  address?: string | null;
  cin_number?: string | null;
  cin_front?: string | null;
  cin_back?: string | null;
  passport_number?: string | null;
  passport_image?: string | null;
  emergency_phone?: string | null;
  avatar?: string | null;
  education_level?: string | null;
  education_level_display?: string | null;
  diploma_title?: string | null;
  diploma_file?: string | null;
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
  is_staff?: boolean;
  is_superuser?: boolean;
  profile: UserProfile | null;
  date_joined: string;
  last_login?: string | null;
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
  new_password_confirm: string;
}

export interface ChangePasswordResponse {
  detail: string;
  changed_by: 'self' | 'superadmin' | 'ceo' | 'manager';
  email_notification_sent: boolean;
}

export interface LoginRequest {
  matricule: string;
  password: string;
}

// Password Reset Types
export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  detail?: string;
}

export interface ValidateResetTokenRequest {
  token: string;
  email: string;
}

export interface ValidateResetTokenResponse {
  valid: boolean;
  email?: string;
  message?: string;
}

export interface ResetPasswordRequest {
  token: string;
  email: string;
  new_password: string;
  new_password_confirm: string;
}

export interface ResetPasswordResponse {
  message: string;
  detail?: string;
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
  refresh?: string; // Some backends return new refresh token with each refresh
}

// Company Types
/**
 * Lightweight company data returned by the list endpoint
 * (GET /api/v1/company/) via CompanyListSerializer.
 */
export interface CompanyListItem {
  id: number;
  name: string;
  abbreviation: string;
  logo: string | null;
  city: string;
  is_active: boolean;
  brands_count?: number;
}

/**
 * Full company data returned by detail/create/update endpoints
 * (GET /api/v1/company/{id}/) via CompanyDetailSerializer.
 */
export interface Company extends CompanyListItem {
  legal_name: string;
  email: string;
  phone: string;
  address?: string;
  matricule_fiscale?: string;
  registre_commerce?: string;
  activity_code?: string;
  bank_name?: string;
  rib?: string;
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
  code: string | null;
  channel_type: ChannelType;
  channel_type_display: string;
  store_type: StoreType;
  store_type_display?: string;
  is_active: boolean;
  is_default: boolean;
  address: string;
  city: string;
  phone: string;
  email: string;
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
  code?: string | null;
  channel_type: ChannelType;
  store_type?: StoreType;
  is_active?: boolean;
  is_default?: boolean;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
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

// Role Types
export interface Role {
  id: number;
  name: string;
  description: string;
  can_switch_brands: boolean;
  is_admin: boolean;
  permissions_count: number;
  users_count?: number;
  created_at: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  can_switch_brands?: boolean;
  is_admin?: boolean;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  can_switch_brands?: boolean;
  is_admin?: boolean;
}

// Extended User Profile Types
export interface UserProfileFull {
  id: number;
  user: number;
  phone: string | null;
  emergency_phone: string | null;
  birth_date: string | null;
  gender: 'M' | 'F' | 'O' | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  cin_number: string | null;
  cin_front: string | null;
  cin_back: string | null;
  passport_number: string | null;
  passport_image: string | null;
  avatar: string | null;
  education_level: EducationLevel | null;
  diploma_title: string | null;
  diploma_file: string | null;
  is_complete: boolean;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
}

export type EducationLevel =
  | 'NONE'
  | 'PRIMARY'
  | 'SECONDARY'
  | 'BAC'
  | 'LICENSE'
  | 'MASTER'
  | 'DOCTORATE'
  | 'OTHER';

export const EDUCATION_LEVELS: { value: EducationLevel; label: string }[] = [
  { value: 'NONE', label: 'No Formal Education' },
  { value: 'PRIMARY', label: 'Primary School' },
  { value: 'SECONDARY', label: 'Secondary School' },
  { value: 'BAC', label: 'Baccalaureate' },
  { value: 'LICENSE', label: 'License (Bachelor)' },
  { value: 'MASTER', label: "Master's Degree" },
  { value: 'DOCTORATE', label: 'Doctorate (PhD)' },
  { value: 'OTHER', label: 'Other' },
];

export interface UpdateProfileRequest {
  phone?: string;
  emergency_phone?: string;
  birth_date?: string;
  gender?: 'M' | 'F' | 'O';
  nationality?: string;
  address?: string;
  city?: string;
  cin_number?: string;
  passport_number?: string;
  education_level?: EducationLevel;
  diploma_title?: string;
}

// User with full details for listing/management
export interface UserListItem {
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
  avatar: string | null;
  date_joined: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  // Optional fields
  current_company?: number;
  role?: number;
  allowed_brands?: number[];
  // Profile fields
  cin_number?: string;
  phone?: string;
  emergency_phone?: string;
  birth_date?: string;
  gender?: 'M' | 'F' | 'O';
  nationality?: string;
  city?: string;
  address?: string;
  education_level?: EducationLevel;
  diploma_title?: string;
}

export interface UpdateUserFullRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: number;
  current_company?: number | null;
  allowed_brands?: number[];
  can_switch_brands?: boolean;
  is_active?: boolean;
}

export interface AdminChangePasswordRequest {
  new_password: string;
  new_password_confirm: string;
}

// =============================================================================
// PRODUCT TYPES
// =============================================================================

export type InventoryStatus = 'instock' | 'outofstock' | 'onbackorder';
export type ProductType = 'simple' | 'variable' | 'grouped' | 'external';
export type ProductStatus = 'publish' | 'draft' | 'pending' | 'private';

export interface ProductListItem {
  id: number;
  wc_product_id: number;
  sales_channel: number;
  sales_channel_name: string;
  brand: number | null;
  brand_name: string | null;
  name: string;
  slug: string;
  barcode: string;
  product_type: ProductType;
  status: ProductStatus;
  inventory_status: InventoryStatus;
  purchase_price: string;
  sales_price: string;
  promotion_price: string | null;
  stock_quantity: number | null;
  manage_stock: boolean;
  image_url: string;
  categories: number[];
  category_names: string[];
  created_at: string;
  updated_at: string;
}

export interface Product extends ProductListItem {
  description: string;
  short_description: string;
  weight: string | null;
  dimensions: {
    length?: string;
    width?: string;
    height?: string;
  } | null;
  gallery_images: string[];
  attributes: Record<string, unknown>[];
  variations: number[];
  wc_created_at: string | null;
  wc_updated_at: string | null;
  last_synced_at: string;
  created_by: number | null;
  updated_by: number | null;
}

export interface CreateProductRequest {
  wc_product_id: number;
  sales_channel: number;
  name: string;
  slug?: string;
  barcode?: string;
  description?: string;
  short_description?: string;
  product_type?: ProductType;
  status?: ProductStatus;
  brand?: number;
  categories?: number[];
  purchase_price?: string;
  sales_price?: string;
  promotion_price?: string | null;
  inventory_status?: InventoryStatus;
  stock_quantity?: number | null;
  manage_stock?: boolean;
  image_url?: string;
  image_upload?: File | null;
  gallery_images?: string[];
  weight?: string;
  dimensions?: {
    length?: string;
    width?: string;
    height?: string;
  };
}

export interface UpdateProductRequest {
  name?: string;
  slug?: string;
  barcode?: string;
  description?: string;
  short_description?: string;
  product_type?: ProductType;
  status?: ProductStatus;
  brand?: number | null;
  categories?: number[];
  purchase_price?: string;
  sales_price?: string;
  promotion_price?: string | null;
  inventory_status?: InventoryStatus;
  stock_quantity?: number | null;
  manage_stock?: boolean;
  image_url?: string;
  image_upload?: File | null;
  gallery_images?: string[];
  weight?: string;
  dimensions?: {
    length?: string;
    width?: string;
    height?: string;
  };
}

// =============================================================================
// CATEGORY TYPES
// =============================================================================

export interface CategoryListItem {
  id: number;
  wc_category_id: number;
  sales_channel: number;
  sales_channel_name: string;
  brand_name: string;
  company_name: string;
  name: string;
  slug: string;
  description: string;
  parent: number | null;
  parent_name: string | null;
  image_url: string;
  display_order: number;
  children_count: number;
  products_count: number;
  created_at: string;
  updated_at: string;
}

export interface Category extends CategoryListItem {
  wc_parent_id: number | null;
  last_synced_at: string;
  created_by: number | null;
  updated_by: number | null;
}

export interface CategoryTree extends CategoryListItem {
  children: CategoryTree[];
}

export interface CreateCategoryRequest {
  wc_category_id: number;
  sales_channel: number;
  name: string;
  slug?: string;
  description?: string;
  parent?: number | null;
  wc_parent_id?: number | null;
  image_url?: string;
  display_order?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  parent?: number | null;
  image_url?: string;
  display_order?: number;
}

// =============================================================================
// PROMOTION TYPES
// =============================================================================

export type PromotionStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'expired'
  | 'cancelled';
export type DiscountType = 'percentage' | 'fixed';

export interface PromotionChannelRule {
  id: number;
  sales_channel: number;
  sales_channel_name: string;
  sales_channel_type: string;
  discount_value: string;
  is_enabled: boolean;
  channel_priority: number;
  channel_max_usage: number | null;
  channel_current_usage: number;
  created_at: string;
  updated_at: string;
}

export interface PromotionChannelRuleInput {
  sales_channel: number;
  discount_value: number | string;
  is_enabled?: boolean;
  channel_priority?: number;
  channel_max_usage?: number | null;
}

export interface PromotionListItem {
  id: number;
  name: string;
  code: string | null;
  product: number;
  product_name: string;
  product_image: string | null;
  brand: number | null;
  brand_name: string | null;
  company_id: number | null;
  company_name: string | null;
  discount_type: DiscountType;
  discount_type_display: string;
  default_discount_value: string;
  start_date: string;
  end_date: string;
  status: PromotionStatus;
  status_display: string;
  is_active: boolean;
  is_currently_active: boolean;
  channel_count: number;
  priority: number;
  current_usage: number;
  max_usage: number | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Promotion extends PromotionListItem {
  description: string;
  product_sales_price: string;
  is_within_usage_limit: boolean;
  is_stackable: boolean;
  channel_rules: PromotionChannelRule[];
  updated_by: number | null;
  updated_by_name: string | null;
  // company_id / company_name already inherited from PromotionListItem
}

export interface CreatePromotionRequest {
  name: string;
  description?: string;
  code?: string | null;
  product: number;
  brand?: number | null;
  discount_type: DiscountType;
  default_discount_value: number | string;
  start_date?: string;
  end_date?: string;
  status?: PromotionStatus;
  is_active?: boolean;
  max_usage?: number | null;
  priority?: number;
  is_stackable?: boolean;
  channel_rules: PromotionChannelRuleInput[];
}

export interface UpdatePromotionRequest {
  name?: string;
  description?: string;
  code?: string | null;
  product?: number;
  brand?: number | null;
  discount_type?: DiscountType;
  default_discount_value?: number | string;
  start_date?: string;
  end_date?: string;
  status?: PromotionStatus;
  is_active?: boolean;
  max_usage?: number | null;
  priority?: number;
  is_stackable?: boolean;
  channel_rules?: PromotionChannelRuleInput[];
}

export interface DiscountCalculationRequest {
  product_id: number;
  sales_channel_id: number;
  original_price?: number | string;
}

export interface DiscountCalculationResult {
  product_id: number;
  product_name: string;
  sales_channel_id: number;
  sales_channel_name: string;
  original_price: string;
  discount_value: string;
  discount_type: string;
  discounted_price: string;
  savings: string;
  promotion_id: number;
  promotion_name: string;
}

export interface PromotionAnalytics {
  total_promotions: number;
  active_promotions: number;
  draft_promotions: number;
  expired_promotions: number;
  scheduled_promotions: number;
  total_usage: number;
  by_discount_type: Array<{ discount_type: DiscountType; count: number }>;
  by_status: Array<{ status: PromotionStatus; count: number }>;
}

// =============================================================================
// INVENTORY TYPES
// =============================================================================

// Sales Channel Store Type (Warehouse/Retail Location)
export type StoreType = 'WAREHOUSE' | 'RETAIL' | 'DISTRIBUTION';

// Sales Channel Inventory
export interface SalesChannelInventory {
  id: number;
  sales_channel: number;
  sales_channel_name: string;
  sales_channel_code: string | null;
  product: number;
  product_name: string;
  product_barcode: string;
  product_image: string | null;
  company_id: number;
  company_name: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  minimum_quantity: number;
  maximum_quantity: number | null;
  bin_location: string;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  last_counted_at: string | null;
  created_at: string;
  updated_at: string;
  recent_movements?: InventoryMovement[];
}

export interface CreateSalesChannelInventoryRequest {
  sales_channel: number;
  product: number;
  quantity?: number;
  reserved_quantity?: number;
  minimum_quantity?: number;
  maximum_quantity?: number | null;
  bin_location?: string;
}

export interface UpdateSalesChannelInventoryRequest {
  quantity?: number;
  reserved_quantity?: number;
  minimum_quantity?: number;
  maximum_quantity?: number | null;
  bin_location?: string;
}

export interface AdjustSalesChannelInventoryRequest {
  quantity_change: number;
  movement_type?: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  notes?: string;
}

// Inventory Movement
export type MovementType =
  | 'PURCHASE'
  | 'RETURN_IN'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT_IN'
  | 'INITIAL'
  | 'SALE'
  | 'RETURN_OUT'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT_OUT'
  | 'DAMAGE';

export type MovementStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface InventoryMovement {
  id: number;
  reference_number: string;
  sales_channel: number;
  sales_channel_name: string;
  sales_channel_code: string | null;
  product: number;
  product_name: string;
  product_barcode: string;
  movement_type: MovementType;
  movement_type_display: string;
  status: MovementStatus;
  status_display: string;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  unit_cost: string | null;
  total_cost: string | null;
  destination_channel: number | null;
  destination_channel_name: string | null;
  external_reference: string;
  notes: string;
  is_stock_in: boolean;
  is_stock_out: boolean;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  completed_at: string | null;
  related_movement_ref?: string | null;
}

export interface CreateInventoryMovementRequest {
  sales_channel: number;
  product: number;
  movement_type: MovementType;
  quantity: number;
  unit_cost?: number | string;
  destination_channel?: number;
  external_reference?: string;
  notes?: string;
}

export interface CreateTransferRequest {
  source_channel: number;
  destination_channel: number;
  product: number;
  quantity: number;
  notes?: string;
}

export interface ProductInventorySummary {
  product_id: number;
  product_name: string;
  product_barcode: string;
  total_quantity: number;
  total_reserved: number;
  total_available: number;
  channels_count: number;
  channel_breakdown: SalesChannelInventory[];
}

export interface MovementSummary {
  total_movements: number;
  by_type: Array<{
    movement_type: MovementType;
    count: number;
    total_quantity: number;
  }>;
}

// ═════════════════════════════════════════════════════════════════════════════
// CLIENT TYPES
// ═════════════════════════════════════════════════════════════════════════════

export interface Client {
  id: number;
  company: number;
  company_name: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  source: 'WOOCOMMERCE' | 'POS' | 'MANUAL';
  sales_channel: number | null;
  sales_channel_name: string | null;
  wc_customer_id: number | null;
  notes: string;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClientRequest {
  company: number;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  source?: 'WOOCOMMERCE' | 'POS' | 'MANUAL';
  sales_channel?: number | null;
  wc_customer_id?: number | null;
  notes?: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// ORDER TYPES
// ═════════════════════════════════════════════════════════════════════════════

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'FAILED';

export type OrderSource = 'WOOCOMMERCE' | 'POS' | 'MANUAL';

export type PaymentStatus = 'UNPAID' | 'PAID' | 'PARTIAL' | 'REFUNDED';

export interface OrderLine {
  id: number;
  product: number | null;
  wc_product_id: number | null;
  product_name: string;
  barcode: string;
  product_image: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
  tax: string;
  total: string;
}

export interface OrderListItem {
  id: number;
  order_number: string;
  external_order_id: string;
  company: number;
  company_name: string;
  sales_channel: number;
  sales_channel_name: string;
  client: number | null;
  client_email: string | null;
  client_name: string | null;
  status: OrderStatus;
  source: OrderSource;
  payment_status: PaymentStatus;
  payment_method: string;
  currency: string;
  subtotal: string;
  tax_total: string;
  shipping_total: string;
  discount_total: string;
  total: string;
  line_count: number;
  created_at: string;
  updated_at: string;
}

export interface OrderDetail extends OrderListItem {
  lines: OrderLine[];
  billing_address: Record<string, string>;
  shipping_address: Record<string, string>;
  customer_note: string;
  internal_note: string;
  wc_status: string;
  wc_date_created: string | null;
  wc_date_modified: string | null;
  created_by: number | null;
  created_by_name: string | null;
}

export interface POSLineItemInput {
  product_id?: number;
  local_product_id?: number;
  sku?: string;
  name?: string;
  quantity: number;
  price: string;
  subtotal?: string;
  total_tax?: string;
  total?: string;
}

export interface POSOrderCreateRequest {
  sales_channel: number;
  billing?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address_1?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  line_items: POSLineItemInput[];
  payment_method?: string;
  payment_method_title?: string;
  customer_note?: string;
  status?: 'pending' | 'processing' | 'completed';
  subtotal?: string;
  total_tax?: string;
  shipping_total?: string;
  discount_total?: string;
  total?: string;
}

export interface OrderSummary {
  total_orders: number;
  pending: number;
  processing: number;
  completed: number;
  cancelled: number;
  revenue: string;
  woocommerce_count: number;
  pos_count: number;
  manual_count: number;
}
