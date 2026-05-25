
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppAlert } from "@/context/AppAlertContext";

type Props = {
  user: any;
  addresses: any[];
  setAddresses: (val: any[]) => void;
};

type AddressFormState = {
  title: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string;
  full_address: string;
  is_default: boolean;
};

const emptyAddressForm: AddressFormState = {
  title: "",
  first_name: "",
  last_name: "",
  phone: "",
  city: "",
  district: "",
  neighborhood: "",
  full_address: "",
  is_default: false,
};

function normalizeText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizePhone(value: string) {
  return String(value || "").replace(/[^0-9+]/g, "").slice(0, 20);
}

function isValidTurkishPhone(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  return /^(05\d{9}|5\d{9}|90\d{10})$/.test(digits);
}

export default function AddressesTab({ user, addresses, setAddresses }: Props) {
  const { showToast, showConfirm } = useAppAlert();

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressFormState>(emptyAddressForm);

  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);

  const [showCitySelect, setShowCitySelect] = useState(false);
  const [citySearch, setCitySearch] = useState("");

  const [showDistrictSelect, setShowDistrictSelect] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");

  const [showNeighborhoodSelect, setShowNeighborhoodSelect] = useState(false);
  const [neighborhoodSearch, setNeighborhoodSearch] = useState("");

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch("https://turkiyeapi.dev/api/v1/provinces");
        const json = await res.json();

        if (json.status === "OK") {
          const sorted = json.data.sort((a: any, b: any) =>
            a.name.localeCompare(b.name, "tr")
          );
          setCities(sorted);
        }
      } catch (error) {
        console.error("Şehirler yüklenemedi:", error);
        showToast("Şehir listesi yüklenemedi. Lütfen tekrar deneyin.", "error");
      }
    };

    fetchCities();
  }, [showToast]);

  const handleAddressInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    const checked = event.target instanceof HTMLInputElement ? event.target.checked : false;

    let nextValue = value;
    if (name === "phone") nextValue = normalizePhone(value);

    setAddressForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : nextValue,
    }));
  };

  const handleCitySelect = (cityName: string) => {
    const selectedCity = cities.find((city) => city.name === cityName);

    if (selectedCity) {
      const sortedDistricts = selectedCity.districts.sort((a: any, b: any) =>
        a.name.localeCompare(b.name, "tr")
      );
      setDistricts(sortedDistricts);
    } else {
      setDistricts([]);
    }

    setAddressForm((prev) => ({
      ...prev,
      city: cityName,
      district: "",
      neighborhood: "",
    }));

    setNeighborhoods([]);
    setShowCitySelect(false);
    setCitySearch("");
  };

  const handleDistrictSelect = async (district: any) => {
    setAddressForm((prev) => ({
      ...prev,
      district: district.name,
      neighborhood: "",
    }));

    setShowDistrictSelect(false);
    setDistrictSearch("");
    setNeighborhoods([]);

    try {
      const res = await fetch(
        `https://turkiyeapi.dev/api/v1/neighborhoods?districtId=${district.id}&limit=1000`
      );
      const json = await res.json();

      if (json.status === "OK") {
        const sortedNeighborhoods = json.data.sort((a: any, b: any) =>
          a.name.localeCompare(b.name, "tr")
        );
        setNeighborhoods(sortedNeighborhoods);
      }
    } catch (error) {
      console.error("Mahalleler yüklenemedi:", error);
      showToast("Mahalle listesi yüklenemedi. Lütfen tekrar deneyin.", "error");
    }
  };

  const handleNeighborhoodSelect = (neighborhoodName: string) => {
    setAddressForm((prev) => ({ ...prev, neighborhood: neighborhoodName }));
    setShowNeighborhoodSelect(false);
    setNeighborhoodSearch("");
  };

  const validateAddressForm = () => {
    if (!normalizeText(addressForm.title)) return "Adres başlığı zorunludur.";
    if (!normalizeText(addressForm.first_name)) return "Ad alanı zorunludur.";
    if (!normalizeText(addressForm.last_name)) return "Soyad alanı zorunludur.";
    if (!isValidTurkishPhone(addressForm.phone)) {
      return "Lütfen geçerli bir Türkiye telefon numarası giriniz. Örn: 05XXXXXXXXX";
    }
    if (!addressForm.city || !addressForm.district || !addressForm.neighborhood) {
      return "Lütfen İl, İlçe ve Mahalle seçiminizi yapınız.";
    }
    if (!normalizeText(addressForm.full_address)) return "Açık adres zorunludur.";
    if (normalizeText(addressForm.full_address).length < 10) {
      return "Açık adres en az 10 karakter olmalıdır.";
    }

    return null;
  };

  const refreshAddresses = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) setAddresses(data);
  };

  const handleSaveAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const validationError = validateAddressForm();
    if (validationError) {
      showToast(validationError, "warning");
      return;
    }

    setIsSavingAddress(true);

    try {
      if (addressForm.is_default) {
        await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      const cleanedAddress = {
        title: normalizeText(addressForm.title),
        first_name: normalizeText(addressForm.first_name),
        last_name: normalizeText(addressForm.last_name),
        phone: normalizePhone(addressForm.phone),
        city: addressForm.city,
        district: addressForm.district,
        neighborhood: addressForm.neighborhood,
        full_address: normalizeText(addressForm.full_address),
        is_default: addressForm.is_default,
        user_id: user.id,
      };

      const { error } = await supabase.from("addresses").insert([cleanedAddress]);
      if (error) throw error;

      showToast("Adres başarıyla eklendi.", "success");
      setIsAddressModalOpen(false);
      setAddressForm(emptyAddressForm);
      setDistricts([]);
      setNeighborhoods([]);
      setCitySearch("");
      setDistrictSearch("");
      setNeighborhoodSearch("");

      await refreshAddresses();
    } catch (err: any) {
      showToast("Hata: " + (err?.message || "Adres kaydedilemedi."), "error");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: number) => {
    const ok = await showConfirm({
      title: "Adres silinsin mi?",
      message: "Bu adresi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      confirmText: "Sil",
      cancelText: "Vazgeç",
      tone: "danger",
    });

    if (!ok) return;

    const { error } = await supabase.from("addresses").delete().eq("id", id);

    if (error) {
      showToast("Adres silinemedi: " + error.message, "error");
      return;
    }

    setAddresses(addresses.filter((address) => address.id !== id));
    showToast("Adres başarıyla silindi.", "success");
  };

  const filteredCities = useMemo(() => {
    const query = citySearch.toLocaleLowerCase("tr-TR");
    return cities.filter((city) =>
      city.name.toLocaleLowerCase("tr-TR").includes(query)
    );
  }, [cities, citySearch]);

  const filteredDistricts = useMemo(() => {
    const query = districtSearch.toLocaleLowerCase("tr-TR");
    return districts.filter((district) =>
      district.name.toLocaleLowerCase("tr-TR").includes(query)
    );
  }, [districts, districtSearch]);

  const filteredNeighborhoods = useMemo(() => {
    const query = neighborhoodSearch.toLocaleLowerCase("tr-TR");
    return neighborhoods.filter((neighborhood) =>
      neighborhood.name.toLocaleLowerCase("tr-TR").includes(query)
    );
  }, [neighborhoods, neighborhoodSearch]);

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6 border-b-2 border-gray-100 pb-4">
        <h3 className="text-xl font-black uppercase tracking-tight text-black">
          Kayıtlı Adreslerim
        </h3>
        <button
          type="button"
          onClick={() => setIsAddressModalOpen(true)}
          className="text-[10px] font-black uppercase tracking-widest text-black border-b border-black hover:text-gray-500 hover:border-gray-500 transition-colors"
        >
          + Yeni Adres Ekle
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <span className="text-4xl mb-4 opacity-50">📍</span>
          <p className="text-gray-400 font-black uppercase tracking-widest text-xs mb-4">
            Henüz kayıtlı bir adresiniz yok.
          </p>
          <button
            type="button"
            onClick={() => setIsAddressModalOpen(true)}
            className="bg-black text-white px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md active:scale-95"
          >
            Hemen Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="bg-white border border-gray-200 rounded-2xl p-5 relative shadow-sm hover:border-black transition-all group flex flex-col"
            >
              {addr.is_default && (
                <span className="absolute top-4 right-4 bg-black text-white text-[9px] px-2 py-1 rounded-md font-black uppercase tracking-widest">
                  Varsayılan
                </span>
              )}
              <h4 className="font-black text-sm uppercase text-black mb-3 pr-20">
                {addr.title}
              </h4>
              <div className="space-y-1 mb-4 flex-1">
                <p className="text-xs font-bold text-gray-800">
                  {addr.first_name} {addr.last_name}
                </p>
                <p className="text-xs font-medium text-gray-500">{addr.phone}</p>
                <p className="text-xs font-medium text-gray-500">
                  {addr.neighborhood} - {addr.district} / {addr.city}
                </p>
                <p className="text-[11px] font-medium text-gray-400 line-clamp-2 mt-2 leading-relaxed">
                  {addr.full_address}
                </p>
              </div>
              <div className="flex justify-end border-t border-gray-50 pt-3">
                <button
                  type="button"
                  onClick={() => handleDeleteAddress(addr.id)}
                  className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-widest flex items-center gap-1"
                >
                  <span>🗑️</span> Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddressModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] flex flex-col relative z-10">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
              <h2 className="text-xl font-black uppercase tracking-tight">Yeni Adres Ekle</h2>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="w-8 h-8 bg-gray-100 rounded-full font-bold hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4 overflow-y-auto pr-2 pb-4 hide-scrollbar">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Adres Başlığı *
                </label>
                <input
                  required
                  name="title"
                  value={addressForm.title}
                  onChange={handleAddressInputChange}
                  type="text"
                  placeholder="Örn: Evim, İş Yerim"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Ad *
                  </label>
                  <input
                    required
                    name="first_name"
                    value={addressForm.first_name}
                    onChange={handleAddressInputChange}
                    type="text"
                    placeholder="Adınız"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Soyad *
                  </label>
                  <input
                    required
                    name="last_name"
                    value={addressForm.last_name}
                    onChange={handleAddressInputChange}
                    type="text"
                    placeholder="Soyadınız"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Telefon *
                  </label>
                  <input
                    required
                    name="phone"
                    value={addressForm.phone}
                    onChange={handleAddressInputChange}
                    type="tel"
                    inputMode="tel"
                    maxLength={20}
                    placeholder="05XXXXXXXXX"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
                  />
                </div>

                <div className="relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    İl *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCitySelect(!showCitySelect);
                      setShowDistrictSelect(false);
                      setShowNeighborhoodSelect(false);
                    }}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium cursor-pointer flex justify-between items-center hover:border-black transition-all text-left"
                  >
                    <span className={addressForm.city ? "text-black" : "text-gray-400"}>
                      {addressForm.city || "İl Seçiniz"}
                    </span>
                    <span className="text-[10px]">▼</span>
                  </button>
                  {showCitySelect && (
                    <>
                      <div className="fixed inset-0 z-[40]" onClick={() => setShowCitySelect(false)} />
                      <div className="absolute z-[50] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-2">
                        <input
                          type="text"
                          placeholder="İl Ara..."
                          value={citySearch}
                          onChange={(event) => setCitySearch(event.target.value)}
                          className="p-3 border-b border-gray-100 outline-none text-sm font-bold bg-gray-50 text-black"
                          autoFocus
                        />
                        <div className="max-h-48 overflow-y-auto overscroll-contain" onWheel={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()}>
                          {filteredCities.map((city) => (
                            <button
                              type="button"
                              key={city.id}
                              onClick={() => handleCitySelect(city.name)}
                              className="w-full text-left p-3 text-sm font-medium hover:bg-gray-100 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                            >
                              {city.name}
                            </button>
                          ))}
                          {filteredCities.length === 0 && (
                            <div className="p-3 text-xs font-bold text-gray-400">Sonuç bulunamadı.</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    İlçe *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (addressForm.city) {
                        setShowDistrictSelect(!showDistrictSelect);
                        setShowCitySelect(false);
                        setShowNeighborhoodSelect(false);
                      }
                    }}
                    className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium flex justify-between items-center transition-all text-left ${
                      !addressForm.city ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-black"
                    }`}
                  >
                    <span className={addressForm.district ? "text-black" : "text-gray-400"}>
                      {addressForm.district || "İlçe Seçiniz"}
                    </span>
                    <span className="text-[10px]">▼</span>
                  </button>
                  {showDistrictSelect && (
                    <>
                      <div className="fixed inset-0 z-[40]" onClick={() => setShowDistrictSelect(false)} />
                      <div className="absolute z-[50] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-2">
                        <input
                          type="text"
                          placeholder="İlçe Ara..."
                          value={districtSearch}
                          onChange={(event) => setDistrictSearch(event.target.value)}
                          className="p-3 border-b border-gray-100 outline-none text-sm font-bold bg-gray-50 text-black"
                          autoFocus
                        />
                        <div className="max-h-48 overflow-y-auto overscroll-contain" onWheel={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()}>
                          {filteredDistricts.map((district) => (
                            <button
                              type="button"
                              key={district.id}
                              onClick={() => handleDistrictSelect(district)}
                              className="w-full text-left p-3 text-sm font-medium hover:bg-gray-100 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                            >
                              {district.name}
                            </button>
                          ))}
                          {filteredDistricts.length === 0 && (
                            <div className="p-3 text-xs font-bold text-gray-400">Sonuç bulunamadı.</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Mahalle *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (addressForm.district) {
                        setShowNeighborhoodSelect(!showNeighborhoodSelect);
                        setShowCitySelect(false);
                        setShowDistrictSelect(false);
                      }
                    }}
                    className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium flex justify-between items-center transition-all text-left ${
                      !addressForm.district ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-black"
                    }`}
                  >
                    <span className={addressForm.neighborhood ? "text-black line-clamp-1" : "text-gray-400"}>
                      {addressForm.neighborhood || "Mahalle Seçiniz"}
                    </span>
                    <span className="text-[10px] ml-2">▼</span>
                  </button>
                  {showNeighborhoodSelect && (
                    <>
                      <div className="fixed inset-0 z-[40]" onClick={() => setShowNeighborhoodSelect(false)} />
                      <div className="absolute z-[50] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-2">
                        <input
                          type="text"
                          placeholder="Mahalle Ara..."
                          value={neighborhoodSearch}
                          onChange={(event) => setNeighborhoodSearch(event.target.value)}
                          className="p-3 border-b border-gray-100 outline-none text-sm font-bold bg-gray-50 text-black"
                          autoFocus
                        />
                        <div className="max-h-48 overflow-y-auto overscroll-contain" onWheel={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()}>
                          {neighborhoods.length === 0 ? (
                            <div className="p-3 text-xs font-bold text-gray-400 animate-pulse">Yükleniyor...</div>
                          ) : filteredNeighborhoods.length > 0 ? (
                            filteredNeighborhoods.map((neighborhood) => (
                              <button
                                type="button"
                                key={neighborhood.id || neighborhood.name}
                                onClick={() => handleNeighborhoodSelect(neighborhood.name)}
                                className="w-full text-left p-3 text-sm font-medium hover:bg-gray-100 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                              >
                                {neighborhood.name}
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-xs font-bold text-gray-400">Sonuç bulunamadı.</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Açık Adres *
                </label>
                <textarea
                  required
                  name="full_address"
                  value={addressForm.full_address}
                  onChange={handleAddressInputChange}
                  rows={3}
                  placeholder="Cadde, sokak, bina ve diğer bilgileri giriniz."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium resize-none outline-none focus:border-black transition-all"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl bg-gray-50">
                <input
                  type="checkbox"
                  name="is_default"
                  checked={addressForm.is_default}
                  onChange={handleAddressInputChange}
                  className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                />
                <div>
                  <span className="font-bold text-sm block text-gray-900">Varsayılan Adres Olarak Kaydet</span>
                  <span className="text-[10px] text-gray-500">Sonraki siparişlerinizde otomatik seçilir.</span>
                </div>
              </label>

              <button
                type="submit"
                disabled={isSavingAddress}
                className="w-full bg-black text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 shadow-md active:scale-95 transition-all mt-4"
              >
                {isSavingAddress ? "Kaydediliyor..." : "Adresi Kaydet 📍"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
