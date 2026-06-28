/**
 * Ortak tip tanımlamaları.
 * Proje genelinde kullanılan veri modellerinin tek kaynağı.
 */

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

export interface Campaign {
  id: number;
  name: string;
  discount_percent: number;
  product_ids: number[] | string;
  start_date: string;
  end_date: string;
  created_at?: string;
}

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