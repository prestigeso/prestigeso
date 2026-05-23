import Link from "next/link";

export default function PaymentFailPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center bg-red-50 border border-red-100 rounded-3xl p-8 shadow-sm">
        <div className="text-5xl mb-4">❌</div>

        <h1 className="text-2xl font-black uppercase tracking-tight text-red-700 mb-3">
          Ödeme Başarısız
        </h1>

        <p className="text-sm font-medium text-red-700 leading-relaxed mb-6">
          Ödeme işlemi tamamlanamadı. Lütfen tekrar deneyin veya farklı bir kart
          kullanın.
        </p>

        <Link
          href="/checkout"
          className="inline-flex items-center justify-center bg-red-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all"
        >
          Tekrar Dene
        </Link>
      </div>
    </div>
  );
}