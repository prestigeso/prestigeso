import ClearCartOnSuccess from "@/components/payment/ClearCartOnSuccess";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatMoney, safeParseAddress } from "@/lib/utils";
import crypto from "crypto";
import Link from "next/link";

type PaymentSuccessPageProps = {
  searchParams?: Promise<{
    oid?: string;
    token?: string;
  }>;
};

function getCouponInfo(address: unknown) {
  if (!address || typeof address !== "object") return null;

  const coupon = (address as Record<string, unknown>).coupon;

  if (!coupon || typeof coupon !== "object") return null;
  const couponData = coupon as Record<string, unknown>;

  const discountAmount = Number(couponData.discount_amount || 0);

  if (!Number.isFinite(discountAmount) || discountAmount <= 0) return null;

  return {
    code: String(couponData.code || "").toUpperCase(),
    discountType: couponData.discount_type || null,
    discountValue: Number(couponData.discount_value || 0),
    discountAmount,
    subtotalAmount: Number(couponData.subtotal_amount || 0),
    totalAfterDiscount: Number(couponData.total_after_discount || 0),
  };
}

function getCouponDiscountLabel(couponInfo: ReturnType<typeof getCouponInfo>) {
  if (!couponInfo) return "";

  if (couponInfo.discountType === "percent") {
    return `%${formatMoney(couponInfo.discountValue)} indirim`;
  }

  return `${formatMoney(couponInfo.discountValue)} TL indirim`;
}

async function getOrderSummary(oid: string, token: string) {
  if (!oid || !token) return null;
  const trackingTokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // GÜVENLİK: Sadece ödeme tamamlanmış siparişleri göster.
  // merchant_oid tahmin edilmesi çok zor (rastgele) ama hassas bilgi yüzeyini minimize ediyoruz.
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "order_no, merchant_oid, user_id, total_amount, shipping_address, payment_status, status",
    )
    .eq("merchant_oid", oid)
    .eq("tracking_token_hash", trackingTokenHash)
    .eq("payment_status", "paid")
    .maybeSingle();

  if (error || !data) return null;

  const parsedAddress = safeParseAddress(data.shipping_address);
  const couponInfo = getCouponInfo(parsedAddress);

  return {
    orderNo: data.order_no || data.merchant_oid || oid,
    totalAmount: Number(
      data.total_amount || couponInfo?.totalAfterDiscount || 0,
    ),
    paymentStatus: data.payment_status || "",
    status: data.status || "",
    isGuest: !data.user_id,
    couponInfo,
  };
}

export default async function PaymentSuccessPage({
  searchParams,
}: PaymentSuccessPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const oid = params?.oid || "";
  const token = params?.token || "";
  const orderSummary = await getOrderSummary(oid, token);
  const couponInfo = orderSummary?.couponInfo || null;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-16 font-sans relative z-0">
      <ClearCartOnSuccess confirmed={Boolean(orderSummary)} />

      <div className="max-w-md w-full text-center bg-gray-50 border border-gray-100 rounded-3xl p-8 shadow-sm relative z-10">
        <div className="text-5xl mb-4">{orderSummary ? "✅" : "⏳"}</div>

        <h1 className="text-2xl font-black uppercase tracking-tight text-black mb-3">
          {orderSummary ? "Ödeme Başarılı" : "Ödeme Henüz Doğrulanmadı"}
        </h1>

        <p className="text-sm font-medium text-gray-600 leading-relaxed mb-5">
          {orderSummary
            ? "Ödemeniz başarıyla alındı. Siparişiniz hazırlık sürecine alınacaktır."
            : "PayTR bildirimi henüz tamamlanmamış veya bu bağlantı geçersiz. Sepetiniz silinmedi; lütfen kısa bir süre sonra tekrar deneyin."}
        </p>

        {orderSummary && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 text-left">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center">
              Sipariş No
            </p>

            <p className="text-sm font-black text-black font-mono break-all text-center">
              {orderSummary.orderNo}
            </p>
          </div>
        )}

        {orderSummary && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 text-left space-y-3">
            {couponInfo && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                    Kupon Kullanıldı
                  </p>
                  <p className="text-xs font-black text-black mt-1">
                    {couponInfo.code || "Kupon"}
                  </p>
                  <p className="text-[9px] font-bold text-emerald-700 mt-1">
                    {getCouponDiscountLabel(couponInfo)}
                  </p>
                </div>

                <p className="text-sm font-black text-emerald-700 shrink-0">
                  -{formatMoney(couponInfo.discountAmount)} ₺
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Ödenen Tutar
              </p>
              <p className="text-xl font-black text-black">
                {formatMoney(orderSummary.totalAmount)} ₺
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href={
              orderSummary?.isGuest
                ? `/siparis-takip?oid=${encodeURIComponent(oid)}&token=${encodeURIComponent(token)}`
                : "/profile"
            }
            className="inline-flex items-center justify-center bg-black text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all relative z-20"
          >
            {orderSummary?.isGuest ? "Siparişi Takip Et" : "Siparişlerime Git"}
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center bg-white text-black border border-gray-200 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all relative z-20"
          >
            Ana Sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
