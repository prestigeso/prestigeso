import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center bg-gray-50 border border-gray-100 rounded-3xl p-8 shadow-sm">
        <div className="text-5xl mb-4">✅</div>

        <h1 className="text-2xl font-black uppercase tracking-tight text-black mb-3">
          Ödeme İşleminiz Alındı
        </h1>

        <p className="text-sm font-medium text-gray-600 leading-relaxed mb-6">
          Ödeme sonucunuz işleniyor. Sipariş durumunuzu profil sayfanızdan takip
          edebilirsiniz.
        </p>

        <Link
          href="/profile"
          className="inline-flex items-center justify-center bg-black text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all"
        >
          Siparişlerime Git
        </Link>
      </div>
    </div>
  );
}