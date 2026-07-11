"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 md:p-6 shadow-2xl z-50 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex-1 text-[11px] md:text-sm text-gray-600">
        <p>
          Sizlere daha iyi bir alışveriş deneyimi sunabilmek için sitemizde çerezler (cookies) kullanıyoruz. 
          Sitemizi kullanmaya devam ederek çerez kullanımını kabul etmiş sayılırsınız. 
          Detaylı bilgi için <Link href="/kvkk" className="underline font-medium text-black">Aydınlatma Metni</Link>'ni inceleyebilirsiniz.
        </p>
      </div>
      <div className="w-full md:w-auto flex-shrink-0">
        <button
          onClick={handleAccept}
          className="w-full md:w-auto px-6 py-2.5 bg-black text-white text-xs md:text-sm font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors"
        >
          Anladım ve Kabul Ediyorum
        </button>
      </div>
    </div>
  );
}
