
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppAlert } from "@/context/AppAlertContext";

type Props = {
  user: any;
  setUser?: (user: any) => void;
  customerProfile?: any;
  setCustomerProfile?: (profile: any) => void;
};

function getProfileValue(customerProfile: any, metadata: any, snakeKey: string, camelKey?: string) {
  return (
    customerProfile?.[snakeKey] ||
    metadata?.[snakeKey] ||
    (camelKey ? metadata?.[camelKey] : "") ||
    ""
  ).toString();
}

function getDisplayName(firstName: string, lastName: string, fallback = "Müşteri") {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || fallback;
}

export default function SettingsTab({ user, setUser, customerProfile, setCustomerProfile }: Props) {
  const { showToast } = useAppAlert();
  const metadata = useMemo(() => user?.user_metadata || {}, [user]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");

  useEffect(() => {
    const nextFirstName = getProfileValue(customerProfile, metadata, "first_name", "firstName");
    const nextLastName = getProfileValue(customerProfile, metadata, "last_name", "lastName");
    const nextPhone = getProfileValue(customerProfile, metadata, "phone");

    setFirstName(nextFirstName);
    setLastName(nextLastName);
    setPhone(nextPhone);
    setEditFirstName(nextFirstName);
    setEditLastName(nextLastName);
  }, [customerProfile, metadata]);

  const openEditModal = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    const cleanFirstName = editFirstName.trim().replace(/\s+/g, " ");
    const cleanLastName = editLastName.trim().replace(/\s+/g, " ");
    const fullName = getDisplayName(cleanFirstName, cleanLastName, "");

    if (!cleanFirstName) {
      showToast("Lütfen adınızı girin.", "warning");
      return;
    }

    if (!cleanLastName) {
      showToast("Lütfen soyadınızı girin.", "warning");
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...metadata,
          first_name: cleanFirstName,
          last_name: cleanLastName,
          firstName: cleanFirstName,
          lastName: cleanLastName,
          full_name: fullName,
          phone: phone || null,
        },
      });

      if (error) throw error;

      const { data: updatedCustomer, error: customerError } = await supabase
        .from("customers")
        .upsert(
          [
            {
              id: user.id,
              email: user.email,
              first_name: cleanFirstName,
              last_name: cleanLastName,
              full_name: fullName,
            },
          ],
          { onConflict: "id" }
        )
        .select("id, email, first_name, last_name, full_name, phone, gender, birth_date")
        .single();

      if (customerError) throw customerError;

      if (data?.user) setUser?.(data.user);
      if (updatedCustomer) setCustomerProfile?.(updatedCustomer);

      setFirstName(cleanFirstName);
      setLastName(cleanLastName);
      setIsEditOpen(false);
      showToast("Kişisel bilgileriniz güncellendi.", "success");
    } catch (err: any) {
      showToast("Bilgiler güncellenemedi: " + (err?.message || "Bilinmeyen hata"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">Hesap Ayarlarım</h3>

      <div className="max-w-2xl space-y-6">
        <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">E-Posta Adresi</p>
          <div className="p-4 bg-white rounded-2xl border border-gray-100 text-sm font-bold text-gray-500 cursor-not-allowed break-all">{user?.email || "E-posta bilgisi yok"}</div>
          <p className="text-[10px] font-bold text-gray-400 mt-2 leading-relaxed">E-posta adresi hesap güvenliği için buradan değiştirilemez. Gerekirse destek ile iletişime geçebilirsiniz.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ad</p>
            <p className="text-sm font-black text-black uppercase">{firstName || "Belirtilmemiş"}</p>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Soyad</p>
            <p className="text-sm font-black text-black uppercase">{lastName || "Belirtilmemiş"}</p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Telefon</p>
          <div className="p-4 bg-white rounded-2xl border border-gray-100 text-sm font-bold text-gray-500 cursor-not-allowed break-all">{phone || "Telefon bilgisi yok"}</div>
          <p className="text-[10px] font-bold text-gray-400 mt-2 leading-relaxed">Telefon numarası hesap güvenliği için buradan değiştirilemez. Numara değişikliği için destek ile iletişime geçebilirsiniz.</p>
        </div>

        <button type="button" onClick={openEditModal} className="bg-black text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all w-full md:w-auto shadow-md active:scale-95">Bilgilerimi Güncelle</button>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-black">Bilgilerimi Güncelle</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Ad ve soyad bilgilerinizi düzenleyin</p>
              </div>
              <button type="button" onClick={() => setIsEditOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full font-bold hover:bg-gray-200 transition-colors">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Ad</label>
                <input value={editFirstName} onChange={(event) => setEditFirstName(event.target.value)} maxLength={40} placeholder="Adınız" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-black outline-none focus:border-black focus:bg-white transition-all" />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Soyad</label>
                <input value={editLastName} onChange={(event) => setEditLastName(event.target.value)} maxLength={40} placeholder="Soyadınız" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-black outline-none focus:border-black focus:bg-white transition-all" />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Telefon</label>
                <div className="w-full p-4 bg-gray-100 border border-gray-100 rounded-2xl text-sm font-bold text-gray-500 cursor-not-allowed">{phone || "Telefon bilgisi yok"}</div>
                <p className="text-[10px] font-bold text-gray-400 mt-2 leading-relaxed">Telefon numarası bu ekrandan değiştirilemez.</p>
              </div>

              <button type="button" onClick={handleSave} disabled={saving} className="w-full bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 shadow-xl active:scale-95 transition-all">
                {saving ? "Güncelleniyor..." : "Değişiklikleri Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
