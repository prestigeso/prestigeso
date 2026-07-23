/** Supabase schema types synchronized with /supabase/migrations. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type SystemColumn = "id" | "created_at" | "updated_at";
type NullableKeys<Row> = {
  [Key in keyof Row]-?: null extends Row[Key] ? Key : never;
}[keyof Row];
type RequiredInsertKeys<Row> = Exclude<
  keyof Row,
  SystemColumn | NullableKeys<Row>
>;
type DefaultInsert<Row> = Partial<Row> & Pick<Row, RequiredInsertKeys<Row>>;

type Table<Row, Insert = DefaultInsert<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};
type Identity = { id: number };
type Timestamped = { created_at: string };

export type Database = {
  public: {
    Tables: {
      categories: Table<
        Identity & Timestamped & { name: string; slug: string }
      >;
      products: Table<
        Identity &
          Timestamped & {
            SKU: string;
            name: string;
            description: string;
            price: number;
            discount_price: number;
            category: string | null;
            stock: number;
            barcode: string | null;
            image: string | null;
            images: Json;
            is_bestseller: boolean;
            campaign_start_date: string | null;
            campaign_end_date: string | null;
            updated_at: string;
          }
      >;
      hero_slides: Table<
        Identity &
          Timestamped & {
            image_url: string;
            title: string | null;
            subtitle: string | null;
            category_slug: string | null;
          }
      >;
      campaigns: Table<
        Identity &
          Timestamped & {
            name: string;
            discount_percent: number;
            start_date: string;
            end_date: string;
            product_ids: Json;
          }
      >;
      customers: Table<
        Timestamped & {
          id: string;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          full_name: string | null;
          phone: string | null;
          gender: string | null;
          birth_date: string | null;
          updated_at: string;
        }
      >;
      addresses: Table<
        Identity &
          Timestamped & {
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
            updated_at: string;
          }
      >;
      orders: Table<
        Identity &
          Timestamped & {
            order_no: string;
            merchant_oid: string;
            user_id: string | null;
            user_email: string;
            items: Json;
            total_amount: number;
            shipping_address: Json;
            status: string;
            payment_provider: string;
            payment_status: string;
            paytr_total_amount: number;
            paid_at: string | null;
            failed_reason: string | null;
            shipping_carrier: string | null;
            tracking_number: string | null;
            coupon_code: string | null;
            coupon_discount_amount: number | null;
            stock_reserved_at: string | null;
            stock_released_at: string | null;
            reservation_expires_at: string | null;
            post_payment_processing_at: string | null;
            post_payment_processed_at: string | null;
            refund_started_at: string | null;
            refunded_at: string | null;
            refunded_amount: number;
            last_reconciled_at: string | null;
            reconciliation_status: "matched" | "mismatch" | "error" | null;
            reconciliation_detail: Json;
            tracking_token_hash: string | null;
            delivered_at: string | null;
            updated_at: string;
          }
      >;
      reviews: Table<
        Identity &
          Timestamped & {
            product_id: number;
            user_id: string;
            user_name: string;
            rating: number;
            comment: string;
            images: Json;
            is_approved: boolean;
          }
      >;
      questions: Table<
        Identity &
          Timestamped & {
            product_id: number;
            user_id: string;
            user_name: string;
            question: string;
            answer: string | null;
            is_approved: boolean;
            answered_at: string | null;
          }
      >;
      messages: Table<
        Identity &
          Timestamped & {
            user_id: string;
            user_email: string;
            message: string;
            answer: string | null;
            answered_at: string | null;
          }
      >;
      favorites: Table<
        Identity & Timestamped & { user_id: string; product_id: number }
      >;
      product_views: Table<Identity & Timestamped & { product_id: number }>;
      page_views: Table<Identity & Timestamped>;
      coupons: Table<
        Identity &
          Timestamped & {
            code: string;
            name: string;
            description: string | null;
            discount_type: string;
            discount_value: number;
            min_order_amount: number;
            max_discount_amount: number | null;
            starts_at: string | null;
            ends_at: string | null;
            usage_limit_total: number | null;
            usage_limit_per_user: number;
            used_count: number;
            is_active: boolean;
            is_member_only: boolean;
          }
      >;
      coupon_usages: Table<
        Identity &
          Timestamped & {
            coupon_id: number;
            user_id: string;
            order_id: number;
            coupon_code: string;
            discount_amount: number;
            reserved_at: string | null;
            consumed_at: string | null;
            released_at: string | null;
          }
      >;
      site_settings: Table<{ key: string; value: Json; updated_at: string }>;
      otp_verifications: Table<
        Identity &
          Timestamped & {
            email: string;
            code: string;
            expires_at: string;
            is_used: boolean;
            purpose: string;
            attempt_count: number;
            verified_at: string | null;
          }
      >;
      otp_proof_consumptions: Table<{
        token_hash: string;
        expires_at: string;
        consumed_at: string;
      }>;
      contact_messages: Table<
        Identity &
          Timestamped & {
            name: string;
            email: string;
            subject: string | null;
            message: string;
          }
      >;
      inventory_movements: Table<
        Identity &
          Timestamped & {
            product_id: number;
            delta: number;
            stock_before: number;
            stock_after: number;
            source: string;
          }
      >;
      product_variants: Table<
        Identity &
          Timestamped & {
            product_id: number;
            sku: string;
            barcode: string | null;
            option_values: Json;
            price: number | null;
            stock: number;
            is_active: boolean;
            updated_at: string;
          }
      >;
      variant_inventory_movements: Table<
        Identity &
          Timestamped & {
            variant_id: number;
            delta: number;
            stock_before: number;
            stock_after: number;
            source: string;
          }
      >;
      campaign_products: Table<{
        campaign_id: number;
        product_id: number;
        created_at: string;
      }>;
      return_requests: Table<
        Identity &
          Timestamped & {
            order_id: number;
            user_id: string;
            reason: string;
            items: Json;
            evidence_urls: Json;
            original_order_status: string;
            status: "pending" | "approved" | "rejected" | "completed";
            admin_note: string | null;
            decided_at: string | null;
            return_shipping_code: string | null;
            refund_amount: number | null;
            updated_at: string;
          }
      >;
      return_inventory_releases: Table<{
        return_request_id: number;
        released_at: string;
      }>;
      api_rate_limits: Table<{
        bucket: string;
        identifier_hash: string;
        window_started_at: string;
        request_count: number;
      }>;
    };
    Views: {
      product_review_stats: {
        Row: {
          product_id: number | null;
          rating_avg: number | null;
          review_count: number | null;
        };
        Relationships: [];
      };
      product_engagement_stats: {
        Row: {
          product_id: number | null;
          favorite_count: number | null;
          view_count: number | null;
          rating_avg: number | null;
          review_count: number | null;
        };
        Relationships: [];
      };
      admin_daily_order_stats: {
        Row: {
          day: string | null;
          order_count: number | null;
          revenue: number | null;
        };
        Relationships: [];
      };
      admin_daily_visit_stats: {
        Row: { day: string | null; visit_count: number | null };
        Relationships: [];
      };
    };
    Functions: {
      reserve_order_stock: { Args: { p_order_id: number }; Returns: undefined };
      release_order_stock: { Args: { p_order_id: number }; Returns: undefined };
      release_expired_stock_reservations: { Args: never; Returns: number };
      prune_operational_data: { Args: never; Returns: undefined };
      release_return_request_stock: {
        Args: { p_return_request_id: number };
        Returns: boolean;
      };
      claim_order_post_payment: {
        Args: { p_order_id: number };
        Returns: boolean;
      };
      finish_order_post_payment: {
        Args: { p_order_id: number; p_success: boolean };
        Returns: undefined;
      };
      register_order_coupon_usage: {
        Args: {
          p_coupon_id: string;
          p_user_id: string;
          p_order_id: number;
          p_coupon_code: string;
          p_discount_amount: number;
        };
        Returns: boolean;
      };
      reserve_order_coupon: {
        Args: {
          p_coupon_id: string;
          p_user_id: string;
          p_order_id: number;
          p_coupon_code: string;
          p_discount_amount: number;
        };
        Returns: boolean;
      };
      release_order_coupon_reservation: {
        Args: { p_order_id: number };
        Returns: boolean;
      };
      consume_otp_proof: {
        Args: { p_token_hash: string; p_expires_at: string };
        Returns: boolean;
      };
      save_my_address: {
        Args: { p_address_id: number | null; p_address: Json };
        Returns: Json;
      };
      consume_api_rate_limit: {
        Args: {
          p_bucket: string;
          p_identifier_hash: string;
          p_max_requests: number;
          p_window_seconds: number;
        };
        Returns: { allowed: boolean; retry_after_seconds: number }[];
      };
      verify_otp_code: {
        Args: {
          p_email: string;
          p_purpose: string;
          p_code_hash: string;
          p_max_attempts?: number;
        };
        Returns: boolean;
      };
      get_admin_dashboard_totals: {
        Args: never;
        Returns: {
          monthly_order_count: number;
          monthly_revenue: number;
          all_time_order_count: number;
          all_time_revenue: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<Name extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][Name]["Row"];
export type TablesInsert<Name extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][Name]["Insert"];
export type TablesUpdate<Name extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][Name]["Update"];
