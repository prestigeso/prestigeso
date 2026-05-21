export type Slide = {
  id: number;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  created_at?: string;
};

export type ProductRow = {
  id: number;
  name: string;
  price: number;
  category: string | null;
  stock: number;

  // DB kolon adı büyük harfli: "SKU"
  "SKU": string;

  // Barkod SKU'dan bağımsız ve opsiyonel
  barcode?: string | null;

  is_bestseller: boolean;
  discount_price: number;
  campaign_start_date: string | null;
  campaign_end_date: string | null;
  created_at?: string;

  images?: string[] | null;
  image?: string | null;
  description?: string | null;
};

export type MessageRow = {
  id: number;
  user_id?: string | null;
  user_email: string;
  message: string;
  answer: string | null;
  created_at: string;
  answered_at?: string | null;
};

export type QuestionRow = {
  id: number;
  product_id: string | number;
  user_id?: string | null;
  user_name?: string | null;
  question: string;
  answer: string | null;
  created_at: string;
  answered_at?: string | null;
  is_approved?: boolean;

  products?: {
    name: string;
    image?: string | null;
    images?: string[] | null;
  } | null;
};

export type OrderRow = {
  id: number;
  order_no?: string | null;
  user_id?: string | null;
  user_email: string;

  // Supabase JSONB bazen array, eski kayıtlar bazen string dönebilir
  items: any[] | string;

  total_amount: number;

  // Supabase JSONB bazen object, eski kayıtlar bazen string dönebilir
  shipping_address: string | Record<string, any> | null;

  status: string;
  created_at: string;

  // Admin kargo yönetimi alanları
  shipping_carrier?: string | null;
  tracking_number?: string | null;
};

export type ReviewRow = {
  id: string;
  product_id: string | number;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  images: string[] | null;
  is_approved: boolean;
  created_at: string;

  products?: {
    name: string;
    image?: string | null;
    images?: string[] | null;
  } | null;
};

export type CampaignRow = {
  id: number;
  name: string;
  discount_percent: number;
  start_date: string;
  end_date: string;

  // Supabase JSONB array dönebilir; bazı durumlarda JSON string de gelebilir
  product_ids: number[] | string;

  created_at: string;
};