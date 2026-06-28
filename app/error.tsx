"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Uygulama hatası:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcfcfc] px-4 font-sans text-center">
      <div className="bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm max-w-md w-full">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
          ⚠️
        </div>

        <h1 className="text-xl font-black uppercase tracking-tight text-black mb-3">
          Bir Hata Oluştu
        </h1>

        <p className="text-sm font-medium text-gray-500 mb-8 leading-relaxed">
          Beklenmeyen bir sorun meydana geldi. Lütfen tekrar deneyin veya ana
          sayfaya dönün.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex-1 bg-black text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-900 transition-all active:scale-95"
          >
            Tekrar Dene
          </button>

          <a
            href="/"
            className="flex-1 bg-gray-50 border border-gray-200 text-black py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95 text-center"
          >
            Ana Sayfa
          </a>
        </div>
      </div>
    </div>
  );
}
