"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAppAlert } from "@/context/AppAlertContext";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { showToast } = useAppAlert();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        showToast("Şifre yenileme oturumu bulunamadı.", "error");
        router.push("/login");
      } else {
        setSessionChecked(true);
      }
    });
  }, [router, showToast]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      showToast("Şifre en az 8 karakter olmalıdır.", "error");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      showToast("Şifre güncellenemedi: " + error.message, "error");
    } else {
      showToast("Şifreniz başarıyla güncellendi!", "success");
      router.push("/profile");
    }
    setLoading(false);
  };

  if (!sessionChecked) return null;

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#fcfcfc] px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-black uppercase tracking-tight text-center mb-6">
          Yeni Şifre Belirle
        </h2>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
              Yeni Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 8 karakter"
              required
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "Güncelleniyor..." : "Şifreyi Kaydet"}
          </button>
        </form>
      </div>
    </div>
  );
}
