/**
 * Ortak tip tanımlamaları.
 * Proje genelinde kullanılan veri modellerinin tek kaynağı.
 * QUAL-01: any kullanımını ortadan kaldırmak için merkezi tip sistemi.
 */

/* ─── Ürün ─── */
export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  images?: string[];
  category: string;
  stock: number;
  SKU: string;
  barcode?: string;
  description?: string;
  is_bestseller?: boolean;
  discount_price?: number;
  campaign_start_date?: string;
  campaign_end_date?: string;
  created_at?: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string;
  barcode?: string | null;
  option_values: Record<string, string>;
  price?: number | null;
  stock: number;
  is_active: boolean;
}

/* ─── Kampanya ─── */
export interface Campaign {
  id: number;
  name: string;
  discount_percent: number;
  product_ids: number[] | string;
  start_date: string;
  end_date: string;
  created_at?: string;
}

/* ─── Sepet ─── */
export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  images?: string[];
  category?: string;
  stock?: number;
  SKU?: string;
  discount_price?: number;
  variant_id?: number;
  variant_label?: string;
  variant_options?: Record<string, string>;
}

/* ─── Kupon ─── */
export interface CouponRow {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  discount_type: "fixed" | "percent";
  discount_value: number | string;
  min_order_amount: number | string;
  max_discount_amount?: number | string | null;
  usage_limit_total?: number | null;
  usage_limit_per_user: number;
  used_count: number | string;
  is_active: boolean;
  is_member_only: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string;
}

export interface CouponUsageRow {
  id: number;
  coupon_id: number;
  order_id: number;
  user_id: string;
  coupon_code: string;
  discount_amount: number | string;
  reserved_at?: string | null;
  consumed_at?: string | null;
  released_at?: string | null;
  created_at?: string;
}

/* ─── Sipariş ─── */
export interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  discount_price?: number | string;
  image?: string;
  images?: string[];
  SKU?: string;
  variant_id?: number;
  variant_sku?: string;
  variant_options?: Record<string, string>;
}

export interface Order {
  id: number;
  order_no: string;
  merchant_oid?: string;
  user_id?: string | null;
  user_email?: string;
  items: OrderItem[] | string;
  total_amount: number;
  shipping_address: string | Record<string, unknown>;
  status: string;
  payment_provider?: string;
  payment_status?: string;
  paytr_total_amount?: number;
  coupon_code?: string | null;
  coupon_discount_amount?: number | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  created_at?: string;
}

/* ─── Adres ─── */
export interface Address {
  id: number;
  user_id: string;
  title: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string;
  full_address: string;
  is_default: boolean;
  created_at?: string;
}

/* ─── Yorum ─── */
export interface Review {
  id: number;
  user_id: string;
  product_id: number;
  rating: number;
  comment?: string;
  user_name?: string;
  images?: string[];
  is_approved?: boolean;
  created_at?: string;
  products?: Product;
}

/* ─── Soru ─── */
export interface Question {
  id: number;
  user_id: string;
  product_id: number;
  question: string;
  user_name?: string;
  answer?: string | null;
  is_approved?: boolean;
  answered_at?: string | null;
  created_at?: string;
  products?: Product;
}

/* ─── Mesaj ─── */
export interface Message {
  id: number;
  user_id: string;
  subject?: string;
  message: string;
  answer?: string | null;
  answered_at?: string | null;
  is_read?: boolean;
  created_at?: string;
}

/* ─── Hero Slider ─── */
export interface HeroSlide {
  id: number;
  title?: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  sort_order?: number;
  is_active?: boolean;
  category_slug?: string;
}

/* ─── Müşteri Profili ─── */
export interface CustomerProfile {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  phone?: string | null;
  gender?: string | null;
  birth_date?: string | null;
}

/* ─── Favori (join ile) ─── */
export interface FavoriteProduct extends Product {
  ratingAvg?: number;
  reviewCount?: number;
}

/* ─── Supabase Auth User (minimal) ─── */
export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, string>;
}
