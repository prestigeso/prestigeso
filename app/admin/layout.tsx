"use client";

import { useState, useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const auth = localStorage.getItem("prestigeso_admin_auth");
    if (auth === "true") setIsAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem("prestigeso_admin_auth", "true");
    } else {
      setError("❌ Hatalı şifre! Lütfen tekrar deneyin.");
    }
  };

  if (!mounted) return null;

  // EĞER GİRİŞ YAPILMADIYSA ŞİFRE EKRANINI GÖSTER
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans text-black">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-100 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6 shadow-lg">🔒</div>
          <h1 className="text-2xl font-black text-center mb-2 tracking-tight">Yönetim Paneli</h1>
          <p className="text-xs text-center text-gray-400 font-bold uppercase tracking-widest mb-8">Yetkisiz Giriş Yasaktır</p>
          
          <input 
            type="password" 
            placeholder="Şifrenizi girin..." 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-black outline-none transition-all font-medium"
          />
          {error && <p className="text-red-500 text-xs mb-4 font-bold text-center bg-red-50 p-2 rounded-lg">{error}</p>}
          
          <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest active:scale-95 transition-transform shadow-xl">
            Giriş Yap
          </button>
        </form>
      </div>
    );
  }

  // ŞİFRE DOĞRUYSA ADMİN SAYFASINI GÖSTER
  return <>{children}</>;
}