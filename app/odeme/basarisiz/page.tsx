import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PaymentFailPageProps = {
  searchParams?: Promise<{
    oid?: string;
  }>;
};

function safeText(value: any) {
  return String(value || "").trim();
}

async function getFailedOrderSummary(oid: string) {
  if (!oid) return null;

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("order_no, merchant_oid, total_amount, payment_status, status, failed_reason")
    .eq("merchant_oid", oid)
    .maybeSingle();

  if (error || !data) return null;

  return {
    orderNo: data.order_no || data.merchant_oid || oid,
    totalAmount: Number(data.total_amount || 0),
    paymentStatus: safeText(data.payment_status),
    status: safeText(data.status),
    failedReason: safeText(data.failed_reason),
  };
}

function formatMoney(value: any) {
  return Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default async function PaymentFailPage({
  searchParams,
}: PaymentFailPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const oid = params?.oid || "";
  const orderSummary = await getFailedOrderSummary(oid);
  const displayOrderNo = orderSummary?.orderNo || oid;
  const failedReason = orderSummary?.failedReason || "Ödeme işlemi tamamlanamadı.";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-16 font-sans">
      <div className="max-w-md w-full text-center bg-red-50 border border-red-100 rounded-3xl p-8 shadow-sm">
        <div className="text-5xl mb-4">❌</div>

        <h1 className="text-2xl font-black uppercase tracking-tight text-red-700 mb-3">
          Ödeme Başarısız
        </h1>

        <p className="text-sm font-medium text-red-700 leading-relaxed mb-5">
          Ödeme işlemi tamamlanamadı. Lütfen tekrar deneyin veya farklı bir kart
          kullanın. Eğer hesabınızdan ücret çekildiğini düşünüyorsanız destek
          ekibimizle iletişime geçebilirsiniz.
        </p>

        {displayOrderNo && (
          <div className="bg-white border border-red-100 rounded-2xl p-4 mb-4">
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">
              Sipariş No
            </p>

            <p className="text-sm font-black text-red-700 font-mono break-all">
              {displayOrderNo}
            </p>
          </div>
        )}

        {orderSummary && (
          <div className="bg-white border border-red-100 rounded-2xl p-4 mb-4 text-left space-y-3">
            <div>
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">
                Hata Açıklaması
              </p>
              <p className="text-xs font-bold text-red-700 leading-relaxed">
                {failedReason}
              </p>
            </div>

            {orderSummary.totalAmount > 0 && (
              <div className="flex items-center justify-between gap-3 border-t border-red-100 pt-3">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                  Sipariş Tutarı
                </p>
                <p className="text-base font-black text-red-700">
                  {formatMoney(orderSummary.totalAmount)} ₺
                </p>
              </div>
            )}
          </div>
        )}

        <div className="bg-white/70 border border-red-100 rounded-2xl p-4 mb-6 text-left">
          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">
            Ne yapabilirsiniz?
          </p>
          <ul className="space-y-1 text-xs font-bold text-red-700 leading-relaxed list-disc list-inside">
            <li>Kart bilgilerinizi kontrol edip tekrar deneyebilirsiniz.</li>
            <li>Farklı bir kart veya ödeme yöntemi deneyebilirsiniz.</li>
            <li>Ücret çekildiğini düşünüyorsanız sipariş numarasıyla destek alabilirsiniz.</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/checkout"
            className="inline-flex items-center justify-center bg-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all"
          >
            Tekrar Dene
          </Link>

          <Link
            href="/iletisim"
            className="inline-flex items-center justify-center bg-white text-red-700 border border-red-100 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all"
          >
            Destek Al
          </Link>
        </div>

        <Link
          href="/"
          className="mt-3 inline-flex items-center justify-center w-full bg-white text-black border border-gray-200 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all"
        >
          Ana Sayfa
        </Link>
      </div>
    </div>
  );
}
