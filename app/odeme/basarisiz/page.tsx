import Link from "next/link";

type PaymentFailPageProps = {
  searchParams?: Promise<{
    oid?: string;
  }>;
};

export default async function PaymentFailPage({
  searchParams,
}: PaymentFailPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const oid = params?.oid || "";

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

        {oid && (
          <div className="bg-white border border-red-100 rounded-2xl p-4 mb-6">
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">
              Sipariş No
            </p>

            <p className="text-sm font-black text-red-700 font-mono break-all">
              {oid}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/checkout"
            className="inline-flex items-center justify-center bg-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all"
          >
            Tekrar Dene
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center bg-white text-red-700 border border-red-100 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all"
          >
            Ana Sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
