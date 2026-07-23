import crypto from "crypto";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatMoney } from "@/lib/utils";

type TrackingPageProps = {
  searchParams?: Promise<{ oid?: string; token?: string }>;
};

async function findOrder(oid: string, token: string) {
  if (!oid || !token) return null;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "order_no, merchant_oid, status, payment_status, total_amount, shipping_carrier, tracking_number, created_at",
    )
    .eq("merchant_oid", oid)
    .eq("tracking_token_hash", tokenHash)
    .in("payment_status", ["paid", "partially_refunded", "refunded"])
    .maybeSingle();
  return error ? null : data;
}

export default async function OrderTrackingPage({
  searchParams,
}: TrackingPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const oid = String(params?.oid || "").slice(0, 80);
  const token = String(params?.token || "").slice(0, 100);
  const order = await findOrder(oid, token);
  const attempted = Boolean(oid || token);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-16 text-black">
      <div className="mx-auto max-w-xl rounded-3xl border border-gray-100 bg-white p-7 shadow-sm md:p-10">
        <h1 className="text-2xl font-black uppercase tracking-tight">
          Misafir Sipariş Takibi
        </h1>
        <p className="mt-2 text-sm font-medium text-gray-500">
          Ödeme sonrası size verilen güvenli takip bağlantısıyla siparişinizi
          izleyebilirsiniz.
        </p>

        {order ? (
          <div className="mt-7 space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                Sipariş No
              </p>
              <p className="mt-1 break-all font-mono text-sm font-black">
                {order.order_no || order.merchant_oid}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-500">
                  Durum
                </p>
                <p className="mt-1 text-sm font-bold">{order.status}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-500">
                  Tutar
                </p>
                <p className="mt-1 text-sm font-bold">
                  {formatMoney(order.total_amount)} ₺
                </p>
              </div>
            </div>
            {order.tracking_number && (
              <div className="rounded-xl bg-white p-4">
                <p className="text-[10px] font-black uppercase text-gray-500">
                  Kargo Takibi
                </p>
                <p className="mt-1 text-sm font-bold">
                  {order.shipping_carrier || "Kargo"} · {order.tracking_number}
                </p>
              </div>
            )}
          </div>
        ) : attempted ? (
          <p className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            Sipariş bulunamadı. Bağlantının tamamını kopyaladığınızdan emin
            olun.
          </p>
        ) : null}

        <Link
          href="/"
          className="mt-7 inline-flex rounded-xl bg-black px-5 py-3 text-xs font-black uppercase tracking-widest text-white"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </main>
  );
}
