export type CheckoutMode = "member" | "guest";
export type NoticeType = "success" | "error" | "info";

export type AddressRow = {
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
  is_default?: boolean;
  created_at?: string;
};

export type AddressForm = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string;
  fullAddress: string;
  addressTitle: string;
};

export type CouponRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit_total?: number | null;
  usage_limit_per_user: number;
  used_count: number;
  is_active: boolean;
  is_member_only: boolean;
};

export type CouponUsageRow = {
  id: string;
  coupon_id: string;
  user_id: string;
  coupon_code: string;
  discount_amount: number;
  created_at?: string;
};

export type ShippingSettings = {
  shipping_fee: number;
  free_shipping_threshold: number;
  shipping_enabled: boolean;
};

export type SelectPopoverProps<T> = {
  search: string;
  setSearch: (value: string) => void;
  onClose: () => void;
  items: T[];
  getKey: (item: T) => string | number;
  getLabel: (item: T) => string;
  onPick: (item: T) => void;
  placeholder: string;
  emptyText?: string;
};

export const MAX_NAME_LENGTH = 60;
export const MAX_EMAIL_LENGTH = 120;
export const MAX_PHONE_LENGTH = 20;
export const MAX_ADDRESS_TITLE_LENGTH = 40;
export const MAX_FULL_ADDRESS_LENGTH = 500;
