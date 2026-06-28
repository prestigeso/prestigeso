import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcfcfc] px-4 font-sans text-center">
      <div className="bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm max-w-md w-full">
        <p className="text-7xl font-black text-gray-100 mb-4">404</p>

        <h1 className="text-xl font-black uppercase tracking-tight text-black mb-3">
          Sayfa Bulunamadı
        </h1>

        <p className="text-sm font-medium text-gray-500 mb-8 leading-relaxed">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>

        <Link
          href="/"
          className="inline-block bg-black text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-900 transition-all active:scale-95"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
