import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { releaseOrderStock } from "@/lib/orderInventory";
import { runRefundWorkflow, type RefundInput, type RefundRepository, type RefundOrderRow } from "./refundWorkflow";

export { RefundError } from "./refundError";

const orderColumns = "id, user_id, merchant_oid, total_amount, refunded_amount, payment_status, status, refund_started_at";

const repository: RefundRepository = {
  async getOrder(id, userId) {
    let query = supabaseAdmin.from("orders").select(orderColumns).eq("id", id);
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data as RefundOrderRow | null;
  },
  async claimOrder(order, startedAt) {
    let query = supabaseAdmin.from("orders")
      .update({ refund_started_at: startedAt })
      .eq("id", order.id)
      .eq("payment_status", order.payment_status)
      .eq("status", order.status)
      .eq("total_amount", order.total_amount)
      .is("refund_started_at", null);
    query = order.refunded_amount == null
      ? query.is("refunded_amount", null)
      : query.eq("refunded_amount", order.refunded_amount);
    const { data, error } = await query.select("id").maybeSingle();
    if (error) throw error;
    return Boolean(data);
  },
  async releaseClaim(id, startedAt) {
    const { data, error } = await supabaseAdmin.from("orders")
      .update({ refund_started_at: null })
      .eq("id", id).eq("refund_started_at", startedAt)
      .select("id").maybeSingle();
    if (error) throw error;
    return Boolean(data);
  },
  async saveRefund(order, startedAt, update) {
    const { data, error } = await supabaseAdmin.from("orders")
      .update(update).eq("id", order.id).eq("refund_started_at", startedAt)
      .select("id").maybeSingle();
    if (error) throw error;
    return Boolean(data);
  },
  async markStockReleased(id, at) {
    const { data, error } = await supabaseAdmin.from("orders")
      .update({ stock_released_at: at }).eq("id", id)
      .select("id").maybeSingle();
    if (error || !data) throw error || new Error("Order missing");
  },
};

export async function refundOrder(input: RefundInput) {
  return runRefundWorkflow(input, {
    repository,
    credentials: {
      merchantId: process.env.PAYTR_MERCHANT_ID,
      merchantKey: process.env.PAYTR_MERCHANT_KEY,
      merchantSalt: process.env.PAYTR_MERCHANT_SALT,
    },
    fetch,
    now: () => new Date().toISOString(),
    releaseOrderStock,
    releaseReturnStock: async (requestId) => {
      const { error } = await supabaseAdmin.rpc("release_return_request_stock", { p_return_request_id: requestId });
      if (error) throw error;
    },
  });
}
