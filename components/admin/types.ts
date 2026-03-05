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

  // ✅ SKU (ZORUNLU) — DB kolon adı "SKU"
  "SKU": string;

  // barkod SKU'dan bağımsız (opsiyonel)
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
  user_email: string;
  message: string;
  answer: string | null;
  created_at: string;
  answered_at?: string | null;
};

export type QuestionRow = {
  id: number;
  product_id: string;
  question: string;
  answer: string | null;
  created_at: string;
  answered_at?: string | null;
  is_approved?: boolean;
  products?: { name: string; image: string; images?: string[] };
};

export type OrderRow = {
  id: number;
  user_email: string;
  items: any[];
  total_amount: number;
  shipping_address: string;
  status: string;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  images: string[] | null;
  is_approved: boolean;
  created_at: string;
  products?: { name: string; image: string; images?: string[] };
};

export type CampaignRow = {
  id: number;
  name: string;
  discount_percent: number;
  start_date: string;
  end_date: string;
  product_ids: number[];
  created_at: string;
};