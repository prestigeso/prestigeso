export type EmailOrder = {
  id: number;
  order_no: string;
  user_email: string;
  shipping_address: unknown;
  payment_status: string;
  status: string;
};

export function getOrderRecipient(order: EmailOrder) {
  const email = typeof order.user_email === "string" ? order.user_email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || /[\r\n]/.test(email)) throw new Error("INVALID_ORDER_RECIPIENT");
  if (!order.order_no || order.order_no.length > 100 || /[\r\n]/.test(order.order_no)) throw new Error("INVALID_ORDER_NUMBER");
  let shipping: unknown = order.shipping_address;
  if (typeof shipping === "string") { try { shipping = JSON.parse(shipping); } catch { shipping = {}; } }
  const fields = shipping && typeof shipping === "object" && !Array.isArray(shipping) ? shipping as Record<string, unknown> : {};
  const customerName = [fields.firstName, fields.lastName].filter((part) => typeof part === "string").join(" ").trim().slice(0, 160) || "Müşterimiz";
  return { email, customerName, orderNumber: order.order_no };
}
