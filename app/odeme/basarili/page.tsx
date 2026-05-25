import Link from "next/link";
import ClearCartOnSuccess from "@/components/payment/ClearCartOnSuccess";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PaymentSuccessPageProps = {
  searchParams?: Promise<{
    oid?: string;
  }>;
};

function safeParseAddress(address: any): any {
  try {
    if (!address) return null;
    if (typeof address === "string") return JSON.parse(address);
    if (typeof address === "object") return address;
    return null;
  } catch {
    return null;
  }
}

function formatMoney(value: any) {
  return Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getCouponInfo(address: any) {
  if (!address || typeof address !== "object") return null;

  const coupon = address.coupon;

  if (!coupon || typeof coupon !== "object") return null;

  const discountAmount = Number(coupon.discount_amount || 0);

  if (!Number.isFinite(discountAmount) || discountAmount <= 0) return null;

  return {
    code: String(coupon.code || "").toUpperCase(),
    discountType: coupon.discount_type || null,
    discountValue: Number(coupon.discount_value || 0),
    discountAmount,
    subtotalAmount: Number(coupon.subtotal_amount || 0),
    totalAfterDiscount: Number(coupon.total_after_discount || 0),
  };
}

function getCouponDiscountLabel(couponInfo: ReturnType<typeof getCouponInfo>) {
  if (!couponInfo) return "";

  if (couponInfo.discountType === "percent") {
    return `%${formatMoney(couponInfo.discountValue)} indirim`;
  }

  return `${formatMoney(couponInfo.discountValue)} TL indirim`;
}

async function getOrderSummary(oid: string) {
  if (!oid) return null;

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("order_no, merchant_oid, total_amount, shipping_address, payment_status, status")
    .eq("merchant_oid", oid)
    .maybeSingle();

  if (error || !data) return null;

  const parsedAddress = safeParseAddress(data.shipping_address);
  const couponInfo = getCouponInfo(parsedAddress);

  return {
    orderNo: data.order_no || data.merchant_oid || oid,
    totalAmount: Number(data.total_amount || couponInfo?.totalAfterDiscount || 0),
    paymentStatus: data.payment_status || "",
    status: data.status || "",
    couponInfo,
  };
}

export default async function PaymentSuccessPage({
  searchParams,
}: PaymentSuccessPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const oid = params?.oid || "";
  const orderSummary = await getOrderSummary(oid);
  const couponInfo = orderSummary?.couponInfo || null;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-16 font-sans">
      <ClearCartOnSuccess />

      <div className="max-w-md w-full text-center bg-gray-50 border border-gray-100 rounded-3xl p-8 shadow-sm">
        <div className="text-5xl mb-4">✅</div>

        <h1 className="text-2xl font-black uppercase tracking-tight text-black mb-3">
          Ödeme Başarılı
        </h1>

        <p className="text-sm font-medium text-gray-600 leading-relaxed mb-5">
          Ödemeniz başarıyla alınmıştır. Siparişiniz hazırlık sürecine
          alınacaktır. Sipariş durumunuzu profil sayfanızdan takip
          edebilirsiniz.
        </p>

        {(orderSummary || oid) && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 text-left">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center">
              Sipariş No
            </p>

            <p className="text-sm font-black text-black font-mono break-all text-center">
              {orderSummary?.orderNo || oid}
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
            href="/profile"
            className="inline-flex items-center justify-center bg-black text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all"
          >
            Siparişlerime Git
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center bg-white text-black border border-gray-200 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all"
          >
            Ana Sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
