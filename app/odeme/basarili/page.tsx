import Link from "next/link";

type PaymentSuccessPageProps = {
  searchParams?: Promise<{
    oid?: string;
  }>;
};

export default async function PaymentSuccessPage({
  searchParams,
}: PaymentSuccessPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const oid = params?.oid || "";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-16 font-sans">
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

        {oid && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              Sipariş No
            </p>

            <p className="text-sm font-black text-black font-mono break-all">
              {oid}
            </p>
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
