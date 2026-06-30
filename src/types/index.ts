export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packing_assigned"
  | "packed"
  | "ready_to_ship"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancel_requested"
  | "cancellation_approved"
  | "cancelled"
  | "returned";

export type PaymentStatus = "pending" | "paid" | "refunded" | "refund_pending" | "failed";

export type ReturnStatus =
  | "return_requested"
  | "return_approved"
  | "pickup_scheduled"
  | "picked_up"
  | "returned"
  | "refund_pending"
  | "refunded";

export type ReturnReason =
  | "wrong_product"
  | "damaged_product"
  | "size_issue"
  | "quality_issue"
  | "other";

export type ReturnRequest = {
  id: string;
  order_id: string;
  user_id: string;
  reason: ReturnReason;
  notes?: string;
  image_url?: string;
  status: ReturnStatus;
  created_at: string;
  updated_at?: string;
};

export type ReviewStatus = "pending" | "approved" | "rejected";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  sort_order: number;
  is_active: boolean;
  show_in_navbar: boolean;
  navbar_position: number | null;
};

export type CategoryPageData = Category & {
  hero_subtitle?: string;
  banner_image_url?: string;
  cta_label?: string;
  theme?: string;
  product_count: number;
};

export type RelatedCategory = {
  id: string;
  name: string;
  slug: string;
  banner_image_url: string;
  product_count: number;
  product_count_label?: string;
};

export type SubCategory = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  category_name?: string | null;
};

export type ProductStatus = "draft" | "active" | "out_of_stock" | "archived";

export type ProductVariant = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  sku?: string;
  stock_quantity: number;
  price?: number;
  compare_price?: number;
};

export type ProductColorSwatch = {
  name: string;
  hex?: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  short_description?: string;
  detailed_description?: string;
  category_id?: string;
  sub_category_id?: string | null;
  category?: Category;
  price: number;
  compare_price?: number;
  sku?: string;
  stock_quantity?: number;
  variants?: ProductVariant[];
  fabric?: string;
  neck_type?: string;
  sleeve_type?: string;
  closure_type?: string;
  occasion?: string[];
  colors?: string[];
  color_swatches?: ProductColorSwatch[];
  sizes?: string[];
  images?: string[];
  tags?: string[];
  status?: ProductStatus;
  is_active: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  ai_size_enabled: boolean;
  ai_color_enabled: boolean;
  ai_style_enabled: boolean;
  seo_title?: string;
  seo_description?: string;
  rating?: number;
  review_count?: number;
};

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
  image: string;
  slug: string;
};

export type Order = {
  id: string;
  order_number: string;
  user_id?: string;
  guest_email?: string;
  items: CartItem[];
  subtotal: number;
  shipping_amount: number;
  discount_amount: number;
  total: number;
  status: OrderStatus;
  payment_method?: string;
  payment_status: PaymentStatus;
  shipping_address?: Record<string, string>;
  tracking_id?: string;
  tracking_number?: string;
  courier_name?: string;
  notes?: string;
  refund_amount?: number;
  refund_date?: string;
  refund_reference?: string;
  refund_notes?: string;
  refund_initiated_at?: string;
  expected_refund_date?: string;
  cancelled_at?: string;
  cancel_requested_at?: string;
  refund_status?: string;
  refund_completed_at?: string;
  cancellation_reason?: string;
  refund_method?: string;
  refund_upi_id?: string;
  refund_bank_holder_name?: string;
  refund_bank_account_number?: string;
  refund_bank_ifsc?: string;
  refund_bank_name?: string;
  refund_qr_image_url?: string;
  refunded_by?: string;
  delivery_confirmed_at?: string;
  otp_verified_at?: string;
  shipping_date?: string;
  delivery_otp?: string;
  courier_partner?: string;
  preferred_delivery_date?: string;
  estimated_delivery_date?: string;
  shipment_id?: string;
  delivery_status?: string;
  delivery_partner?: string;
  internal_notes?: string;
  packed_at?: string;
  tax_amount?: number;
  confirmed_at?: string;
  assigned_worker_id?: string;
  assigned_at?: string;
  created_at: string;
  updated_at?: string;
};

export type Customer = {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  bust_measurement?: number;
  waist_measurement?: number;
  shoulder_measurement?: number;
  underbust_measurement?: number;
  height_cm?: number;
  weight_kg?: number;
  preferred_size?: string;
  customer_group: "regular" | "vip" | "premium";
  total_orders: number;
  total_spent: number;
};

export type Address = {
  id: string;
  customer_id: string;
  label?: string;
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  is_default: boolean;
  created_at: string;
};

export type Review = {
  id: string;
  product_id: string;
  user_id?: string;
  rating: number;
  title?: string;
  body?: string;
  images?: string[];
  size_purchased?: string;
  color_purchased?: string;
  status: ReviewStatus;
  is_verified_purchase: boolean;
  created_at: string;
  customer_name?: string;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  featured_image?: string;
  category?: string;
  tags?: string[];
  seo_title?: string;
  seo_description?: string;
  published_at?: string;
  is_published: boolean;
};

export type AiFeature = "size_finder" | "color_matcher" | "style_assistant" | "smart_preview";

export type AiInteraction = {
  id: string;
  feature: AiFeature;
  user_id?: string;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  was_successful?: boolean;
  created_at: string;
};

export type FitPreference = "fitted" | "regular" | "loose";

export type SizeRecommendation = {
  recommendedSize: string;
  size: string;
  confidenceScore: number;
  confidence: number;
  fitPreference: FitPreference;
  fitType: string;
  confidenceLabel: string;
  showLowConfidenceWarning: boolean;
  spanningSizesNotice: string | null;
  explanations: string[];
  bustSize: number;
  blouseLength: string;
  shoulder: number;
  armhole: number;
  waist: number;
  shopSizeSlug: string;
};
