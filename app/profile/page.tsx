"use client";

import { useEffect, useState } from "react";

type Profile = {
  fullName: string;
  phone: string;
  city: string;
  address: string;
};

const KEY = "prestigeso_profile";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({
    fullName: "",
    phone: "",
    city: "",
    address: ""
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        setProfile(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const save = () => {
    localStorage.setItem(KEY, JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="min-h-screen bg-white px-4 py-10 mt-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black mb-2">Profilim</h1>
        <p className="text-gray-500 mb-8">Bilgilerini kaydet, sonraki siparişlerde hızlı kullan.</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Ad Soyad</label>
            <input
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl mt-1"
              placeholder="Örn: Beytullah Kamacı"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Telefon</label>
            <input
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl mt-1"
              placeholder="Örn: 05xx xxx xx xx"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Şehir</label>
            <input
              value={profile.city}
              onChange={(e) => setProfile({ ...profile, city: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl mt-1"
              placeholder="Örn: Konya"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Adres</label>
            <textarea
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl mt-1"
              rows={4}
              placeholder="Mahalle, sokak, kapı no..."
            />
          </div>

          <button
            onClick={save}
            className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 active:scale-95"
          >
            Bilgilerimi Kaydet
          </button>

          {saved && (
            <div className="text-green-600 font-bold text-sm text-center">
              ✅ Kaydedildi
            </div>
          )}
        </div>
      </div>
    </div>
  );
}