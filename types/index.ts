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
  image?: string;
  images?: string[];
  category?: string;
  stock?: number;
  SKU?: string;
}

/* ─── Kupon ─── */
export interface CouponRow {
  id: number;
  code: string;
  discount_type: "fixed" | "percent";
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  usage_limit?: number;
  used_count?: number;
  is_active?: boolean;
  starts_at?: string;
  ends_at?: string;
}

/* ─── Sipariş ─── */
export interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  images?: string[];
  SKU?: string;
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
}

/* ─── Müşteri Profili ─── */
export interface CustomerProfile {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  gender?: string;
  birth_date?: string;
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