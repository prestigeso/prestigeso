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

export type { CouponRow, CouponUsageRow } from "@/types";

export type ShippingSettings = {
  shipping_fee: number;
  free_shipping_threshold: number;
  shipping_enabled: boolean;
};

export type LocationOption = {
  id: number;
  name: string;
};

export type ProvinceOption = LocationOption & {
  districts: LocationOption[];
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
