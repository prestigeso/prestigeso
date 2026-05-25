
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppAlert } from "@/context/AppAlertContext";

type Props = {
  user: any;
  setUser?: (user: any) => void;
};

function normalizePhone(value: string) {
  return value.replace(/[^0-9+ ]/g, "").slice(0, 20);
}

export default function SettingsTab({ user, setUser }: Props) {
  const { showToast } = useAppAlert();

  const metadata = useMemo(() => user?.user_metadata || {}, [user]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFirstName((metadata.firstName || "").toString());
    setLastName((metadata.lastName || "").toString());
    setPhone((metadata.phone || "").toString());
  }, [metadata]);

  const handleSave = async () => {
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanPhone = normalizePhone(phone).trim();

    if (!cleanFirstName) {
      showToast("Lütfen adınızı girin.", "warning");
      return;
    }

    if (!cleanLastName) {
      showToast("Lütfen soyadınızı girin.", "warning");
      return;
    }

    if (cleanPhone && cleanPhone.replace(/[^0-9]/g, "").length < 10) {
      showToast("Telefon numarası en az 10 rakam içermelidir.", "warning");
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...metadata,
          firstName: cleanFirstName,
          lastName: cleanLastName,
          phone: cleanPhone || null,
        },
      });

      if (error) throw error;

      if (data?.user) {
        setUser?.(data.user);
      }

      showToast("Kişisel bilgileriniz güncellendi.", "success");
    } catch (err: any) {
      showToast(
        "Bilgiler güncellenemedi: " + (err?.message || "Bilinmeyen hata"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">
        Hesap Ayarlarım
      </h3>

      <div className="max-w-2xl space-y-6">
        <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
            E-Posta Adresi
          </p>

          <div className="p-4 bg-white rounded-2xl border border-gray-100 text-sm font-bold text-gray-500 cursor-not-allowed break-all">
            {user?.email || "E-posta bilgisi yok"}
          </div>

          <p className="text-[10px] font-bold text-gray-400 mt-2 leading-relaxed">
            E-posta adresi hesap güvenliği için buradan değiştirilemez. Gerekirse destek ile iletişime geçebilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
              Ad
            </label>
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              maxLength={40}
              placeholder="Adınız"
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-black outline-none focus:border-black focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
              Soyad
            </label>
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              maxLength={40}
              placeholder="Soyadınız"
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-black outline-none focus:border-black focus:bg-white transition-all"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
            Telefon
          </label>
          <input
            value={phone}
            onChange={(event) => setPhone(normalizePhone(event.target.value))}
            maxLength={20}
            placeholder="05xx xxx xx xx"
            inputMode="tel"
            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-black outline-none focus:border-black focus:bg-white transition-all"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-black text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all w-full md:w-auto shadow-md disabled:opacity-50 active:scale-95"
        >
          {saving ? "Güncelleniyor..." : "Bilgileri Güncelle"}
        </button>
      </div>
    </div>
  );
}
