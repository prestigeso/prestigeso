"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import DistanceSellingContract from "@/components/contracts/DistanceSellingContract";

type CheckoutMode = "member" | "guest";
type NoticeType = "success" | "error" | "info";

type AddressRow = {
  id: number;
  user_id: string;
  title: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string;
  full_address: string;
  is_default?: boolean;
  created_at?: string;
};

type AddressForm = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string;
  fullAddress: string;
  addressTitle: string;
};

type SelectPopoverProps<T> = {
  search: string;
  setSearch: (value: string) => void;
  onClose: () => void;
  items: T[];
  getKey: (item: T) => string | number;
  getLabel: (item: T) => string;
  onPick: (item: T) => void;
  placeholder: string;
  emptyText?: string;
};

const MAX_NAME_LENGTH = 60;
const MAX_EMAIL_LENGTH = 120;
const MAX_PHONE_LENGTH = 20;
const MAX_ADDRESS_TITLE_LENGTH = 40;
const MAX_FULL_ADDRESS_LENGTH = 500;

function normalizeText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeEmail(value: string) {
  return normalizeText(value).toLowerCase();
}

function normalizePhone(value: string) {
  return String(value || "").replace(/[^0-9+]/g, "").slice(0, MAX_PHONE_LENGTH);
}

function isValidEmail(value: string) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= MAX_EMAIL_LENGTH;
}

function isValidTurkishPhone(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  return /^(05\d{9}|5\d{9}|90\d{10})$/.test(digits);
}

function validateAddressForm(data: AddressForm) {
  if (!isValidEmail(data.email)) {
    return "Lütfen geçerli bir e-posta adresi giriniz.";
  }

  if (!normalizeText(data.addressTitle)) {
    return "Adres başlığı zorunludur.";
  }

  if (normalizeText(data.addressTitle).length > MAX_ADDRESS_TITLE_LENGTH) {
    return `Adres başlığı en fazla ${MAX_ADDRESS_TITLE_LENGTH} karakter olabilir.`;
  }

  if (!normalizeText(data.firstName)) {
    return "Ad alanı zorunludur.";
  }

  if (normalizeText(data.firstName).length > MAX_NAME_LENGTH) {
    return `Ad en fazla ${MAX_NAME_LENGTH} karakter olabilir.`;
  }

  if (!normalizeText(data.lastName)) {
    return "Soyad alanı zorunludur.";
  }

  if (normalizeText(data.lastName).length > MAX_NAME_LENGTH) {
    return `Soyad en fazla ${MAX_NAME_LENGTH} karakter olabilir.`;
  }

  if (!isValidTurkishPhone(data.phone)) {
    return "Lütfen geçerli bir Türkiye telefon numarası giriniz. Örn: 05XXXXXXXXX";
  }

  if (!data.city || !data.district || !data.neighborhood) {
    return "Lütfen İl, İlçe ve Mahalle seçiniz.";
  }

  if (!normalizeText(data.fullAddress)) {
    return "Açık adres zorunludur.";
  }

  if (normalizeText(data.fullAddress).length < 10) {
    return "Açık adres en az 10 karakter olmalıdır.";
  }

  if (normalizeText(data.fullAddress).length > MAX_FULL_ADDRESS_LENGTH) {
    return `Açık adres en fazla ${MAX_FULL_ADDRESS_LENGTH} karakter olabilir.`;
  }

  return null;
}

function NoticeToast({ notice }: { notice: { type: NoticeType; message: string } }) {
  const tone =
    notice.type === "success"
      ? "bg-green-600 text-white"
      : notice.type === "error"
      ? "bg-black text-white"
      : "bg-gray-900 text-white";

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[1200] w-[calc(100%-2rem)] max-w-sm rounded-2xl px-5 py-4 shadow-2xl text-sm font-bold text-center ${tone}`}
    >
      {notice.message}
    </div>
  );
}

function SelectPopover<T>({
  search,
  setSearch,
  onClose,
  items,
  getKey,
  getLabel,
  onPick,
  placeholder,
  emptyText = "Sonuç yok",
}: SelectPopoverProps<T>) {
  return (
    <>
      <div className="fixed inset-0 z-[40]" onClick={onClose} />

      <div className="absolute z-[50] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-2">
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="p-3 border-b border-gray-100 outline-none text-sm font-bold bg-gray-50 text-black"
          autoFocus
        />

        <div className="max-h-48 overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <div className="p-3 text-xs font-bold text-gray-400">{emptyText}</div>
          ) : (
            items.map((item) => (
              <button
                type="button"
                key={getKey(item)}
                onClick={() => onPick(item)}
                className="w-full text-left p-3 text-sm font-medium hover:bg-gray-100 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
              >
                {getLabel(item)}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items: cartItems, cartTotal } = useCart();

  const [user, setUser] = useState<any>(null);
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode | null>(null);

  const isGuest = checkoutMode === "guest";
  const isMember = checkoutMode === "member";

  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState<{ type: NoticeType; message: string } | null>(null);

  const [paytrIframeUrl, setPaytrIframeUrl] = useState("");
  const [paytrMerchantOid, setPaytrMerchantOid] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [isCartOpen, setIsCartOpen] = useState(false);

  const [savedAddresses, setSavedAddresses] = useState<AddressRow[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  const [couponCode, setCouponCode] = useState("");

  const [addressData, setAddressData] = useState<AddressForm>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    city: "",
    district: "",
    neighborhood: "",
    fullAddress: "",
    addressTitle: "",
  });

  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);

  const [showCitySelect, setShowCitySelect] = useState(false);
  const [citySearch, setCitySearch] = useState("");

  const [showDistrictSelect, setShowDistrictSelect] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");

  const [showNeighborhoodSelect, setShowNeighborhoodSelect] = useState(false);
  const [neighborhoodSearch, setNeighborhoodSearch] = useState("");

  const showNotice = (message: string, type: NoticeType = "info") => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 3500);
  };

  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      router.replace("/");
    }
  }, [cartItems, router]);

  useEffect(() => {
    const initCheckout = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setUser(session.user);
        setCheckoutMode("member");

        setAddressData((prev) => ({
          ...prev,
          email: (session.user.email || "").toString(),
        }));

        const { data: addr, error: addrErr } = await supabase
          .from("addresses")
          .select("*")
          .eq("user_id", session.user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false });

        if (!addrErr && addr && addr.length > 0) {
          setSavedAddresses(addr as AddressRow[]);
          setSelectedAddressId((addr[0] as AddressRow).id);
        }
      } else {
        setUser(null);
        setCheckoutMode(null);
      }

      try {
        const res = await fetch("https://turkiyeapi.dev/api/v1/provinces");
        const json = await res.json();

        if (json.status === "OK") {
          setCities(
            json.data.sort((a: any, b: any) =>
              a.name.localeCompare(b.name, "tr")
            )
          );
        }
      } catch (error) {
        console.error("Şehirler yüklenemedi:", error);
      }

      setLoading(false);
    };

    initCheckout();
  }, []);

  const selectedAddress = useMemo(() => {
    if (!selectedAddressId) return null;

    return (
      savedAddresses.find((address) => address.id === selectedAddressId) || null
    );
  }, [savedAddresses, selectedAddressId]);

  const filteredCities = useMemo(() => {
    const query = citySearch.toLocaleLowerCase("tr-TR");
    return cities.filter((city: any) =>
      city.name.toLocaleLowerCase("tr-TR").includes(query)
    );
  }, [cities, citySearch]);

  const filteredDistricts = useMemo(() => {
    const query = districtSearch.toLocaleLowerCase("tr-TR");
    return districts.filter((district: any) =>
      district.name.toLocaleLowerCase("tr-TR").includes(query)
    );
  }, [districts, districtSearch]);

  const filteredNeighborhoods = useMemo(() => {
    const query = neighborhoodSearch.toLocaleLowerCase("tr-TR");
    return neighborhoods.filter((neighborhood: any) =>
      neighborhood.name.toLocaleLowerCase("tr-TR").includes(query)
    );
  }, [neighborhoods, neighborhoodSearch]);

  const handleInputChange = (event: any) => {
    const { name, value } = event.target;

    let nextValue = value;

    if (name === "email") nextValue = normalizeEmail(value).slice(0, MAX_EMAIL_LENGTH);
    if (name === "phone") nextValue = normalizePhone(value);
    if (name === "firstName" || name === "lastName") nextValue = value.slice(0, MAX_NAME_LENGTH);
    if (name === "addressTitle") nextValue = value.slice(0, MAX_ADDRESS_TITLE_LENGTH);
    if (name === "fullAddress") nextValue = value.slice(0, MAX_FULL_ADDRESS_LENGTH);

    setAddressData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handleCitySelect = (cityName: string) => {
    const selectedCity = cities.find((city) => city.name === cityName);

    if (selectedCity) {
      setDistricts(
        selectedCity.districts.sort((a: any, b: any) =>
          a.name.localeCompare(b.name, "tr")
        )
      );
    } else {
      setDistricts([]);
    }

    setAddressData((prev) => ({
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
    setAddressData((prev) => ({
      ...prev,
      district: district.name,
      neighborhood: "",
    }));

    setShowDistrictSelect(false);
    setDistrictSearch("");

    try {
      const res = await fetch(
        `https://turkiyeapi.dev/api/v1/neighborhoods?districtId=${district.id}&limit=1000`
      );

      const json = await res.json();

      if (json.status === "OK") {
        setNeighborhoods(
          json.data.sort((a: any, b: any) =>
            a.name.localeCompare(b.name, "tr")
          )
        );
      }
    } catch (error) {
      console.error("Mahalleler yüklenemedi:", error);
    }
  };

  const handleNeighborhoodSelect = (neighborhoodName: string) => {
    setAddressData((prev) => ({
      ...prev,
      neighborhood: neighborhoodName,
    }));

    setShowNeighborhoodSelect(false);
    setNeighborhoodSearch("");
  };

  const handleSaveAddressModal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateAddressForm(addressData);

    if (validationError) {
      showNotice(validationError, "error");
      return;
    }

    setIsSavingAddress(true);

    try {
      const cleanedAddress = {
        title: normalizeText(addressData.addressTitle),
        first_name: normalizeText(addressData.firstName),
        last_name: normalizeText(addressData.lastName),
        phone: normalizePhone(addressData.phone),
        city: addressData.city,
        district: addressData.district,
        neighborhood: addressData.neighborhood,
        full_address: normalizeText(addressData.fullAddress),
      };

      if (user) {
        const { data: inserted, error: insErr } = await supabase
          .from("addresses")
          .insert([
            {
              user_id: user.id,
              ...cleanedAddress,
              is_default: savedAddresses.length === 0,
            },
          ])
          .select("*")
          .single();

        if (insErr) throw insErr;

        if (inserted) {
          setSavedAddresses((prev) => [inserted as AddressRow, ...prev]);
          setSelectedAddressId(inserted.id);
        }
      } else {
        const dummyId = Date.now();

        const newGuestAddr: AddressRow = {
          id: dummyId,
          user_id: "guest",
          ...cleanedAddress,
        };

        setSavedAddresses([newGuestAddr]);
        setSelectedAddressId(dummyId);
      }

      setIsAddressModalOpen(false);
      showNotice("Adres kaydedildi.", "success");
    } catch (err: any) {
      showNotice("Adres kaydedilemedi: " + (err?.message || "Bilinmeyen hata"), "error");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const validateBeforePay = () => {
    if (!checkoutMode) return "Devam etmek için giriş yapın veya üye olmadan devam edin.";
    if (!cartItems || cartItems.length === 0) return "Sepet boş.";

    const email = normalizeEmail(addressData.email || user?.email || "");

    if (!isValidEmail(email)) {
      return "Lütfen geçerli bir e-posta adresi giriniz.";
    }

    if (!selectedAddress) {
      return "Lütfen teslimat adresi seçin/ekleyin.";
    }

    if (!isValidTurkishPhone(selectedAddress.phone)) {
      return "Seçili adresteki telefon numarası geçerli değil. Lütfen adresi güncelleyin.";
    }

    if (
      !selectedAddress.city ||
      !selectedAddress.district ||
      !selectedAddress.neighborhood ||
      !selectedAddress.full_address
    ) {
      return "Seçili teslimat adresi eksik. Lütfen yeni adres ekleyin.";
    }

    if (!agreeTerms) {
      return "Lütfen Mesafeli Satış ve Ön Bilgilendirme koşullarını onaylayın.";
    }

    return null;
  };

  const handleCompleteOrder = async () => {
    const err = validateBeforePay();

    if (err) {
      showNotice(err, "error");
      return;
    }

    setIsProcessing(true);

    try {
      if (isGuest && addressData.email) {
        const { data: existingUserOrder } = await supabase
          .from("orders")
          .select("id")
          .eq("user_email", normalizeEmail(addressData.email))
          .not("user_id", "is", null)
          .limit(1);

        if (existingUserOrder && existingUserOrder.length > 0) {
          showNotice("Bu e-posta ile kayıtlı bir hesap var. Lütfen giriş yapınız.", "error");
          router.push("/login");
          return;
        }
      }

      const shippingAddressObject = {
        email: normalizeEmail(addressData.email || user?.email || ""),
        firstName: selectedAddress?.first_name,
        lastName: selectedAddress?.last_name,
        phone: selectedAddress?.phone,
        city: selectedAddress?.city,
        district: selectedAddress?.district,
        neighborhood: selectedAddress?.neighborhood,
        fullAddress: selectedAddress?.full_address,
        addressTitle: selectedAddress?.title,
      };

      const response = await fetch("/api/paytr/create-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: isMember ? user?.id || null : null,
          userEmail: normalizeEmail(addressData.email || user?.email || ""),
          items: cartItems,
          shippingAddress: shippingAddressObject,
          checkoutMode,
          couponCode: isMember ? normalizeText(couponCode) : "",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "PayTR ödeme başlatılamadı.");
      }

      setPaytrIframeUrl(result.iframe_url);
      setPaytrMerchantOid(result.merchant_oid || "");
      setIsPaymentModalOpen(true);
    } catch (error: any) {
      showNotice(error?.message || "Ödeme başlatılamadı.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-400">
        Checkout hazırlanıyor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] py-6 md:py-12 px-4 font-sans text-black pb-28 md:pb-20">
      {notice && <NoticeToast notice={notice} />}

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-10">
        <div className="flex-1 space-y-5 md:space-y-6">
          <section className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-sm">
            <button
              type="button"
              onClick={() => setIsCartOpen(!isCartOpen)}
              className="w-full flex items-center justify-between cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3 md:gap-4">
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">
                  1
                </span>

                <h2 className="text-base md:text-lg font-black uppercase tracking-tighter text-black">
                  Sepetimdeki Ürünler ({cartItems.length})
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden sm:block text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  {cartTotal.toLocaleString("tr-TR")} ₺
                </span>

                <div
                  className={`w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-gray-100 transition-all duration-300 ${
                    isCartOpen ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </div>
              </div>
            </button>

            {isCartOpen && (
              <div className="mt-6 border-t border-gray-50 pt-6 space-y-4">
                {cartItems.map((item: any, index: number) => {
                  const displayImage = item.images?.[0] || item.image || "/logo.jpeg";
                  const itemPrice =
                    Number(item.discount_price) > 0
                      ? Number(item.discount_price)
                      : Number(item.price || 0);

                  return (
                    <div key={`${item.id}-${index}`} className="flex gap-4 items-center">
                      <div className="w-14 h-14 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden flex-shrink-0">
                        <img
                          src={displayImage}
                          className="w-full h-full object-cover mix-blend-multiply"
                          alt={item.name || "Ürün"}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase leading-tight line-clamp-2">
                          {item.name}
                        </p>

                        <p className="text-[10px] font-bold text-gray-400 mt-1">
                          {item.quantity || 1} Adet
                        </p>
                      </div>

                      <p className="text-xs font-black">
                        {(itemPrice * (item.quantity || 1)).toLocaleString("tr-TR")} ₺
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {!user && !checkoutMode && (
            <section className="bg-white p-5 md:p-7 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-5">
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">
                  2
                </span>

                <h2 className="text-base md:text-lg font-black uppercase tracking-tighter text-black">
                  Nasıl Devam Etmek İstersiniz?
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/login?redirect=/checkout")}
                  className="rounded-2xl bg-black text-white p-5 text-left active:scale-[0.98] transition-all"
                >
                  <p className="text-sm font-black uppercase tracking-widest">
                    Giriş Yap / Kaydol
                  </p>

                  <p className="text-xs font-medium text-white/70 mt-2">
                    Kuponlar, kayıtlı adresler ve sipariş takibi için önerilir.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCheckoutMode("guest")}
                  className="rounded-2xl bg-gray-50 border border-gray-200 text-black p-5 text-left active:scale-[0.98] transition-all"
                >
                  <p className="text-sm font-black uppercase tracking-widest">
                    Üye Olmadan Devam Et
                  </p>

                  <p className="text-xs font-medium text-gray-500 mt-2">
                    E-posta, telefon ve teslimat adresiyle hızlıca ödeme yapın.
                  </p>
                </button>
              </div>
            </section>
          )}

          {checkoutMode && (
            <>
              <section className="bg-white p-5 md:p-7 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-50">
                  <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">
                    {user ? 2 : 3}
                  </span>

                  <h2 className="text-base md:text-lg font-black uppercase tracking-tighter text-black">
                    Teslimat Adresi
                  </h2>
                </div>

                {isGuest && (
                  <div className="mb-6">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                      E-Posta Adresiniz *
                    </label>

                    <input
                      type="email"
                      name="email"
                      required
                      maxLength={MAX_EMAIL_LENGTH}
                      value={addressData.email}
                      onChange={handleInputChange}
                      placeholder="Sipariş bilgilendirmesi için gerekli"
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedAddresses.map((addr) => {
                    const active = selectedAddressId === addr.id;

                    return (
                      <label
                        key={addr.id}
                        className={`flex gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                          active
                            ? "border-black bg-gray-50 shadow-md"
                            : "border-gray-100 hover:border-gray-200"
                        }`}
                        onClick={() => setSelectedAddressId(addr.id)}
                      >
                        <input
                          type="radio"
                          checked={active}
                          onChange={() => {}}
                          className="mt-1 accent-black w-4 h-4"
                        />

                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded">
                            {addr.title}
                          </span>

                          <p className="text-sm font-bold mt-2">
                            {addr.first_name} {addr.last_name}
                          </p>

                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                            {addr.full_address}
                          </p>

                          <p className="text-[10px] font-black text-gray-400 mt-2 uppercase">
                            {addr.district} / {addr.city}
                          </p>
                        </div>
                      </label>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="flex items-center justify-center gap-3 p-5 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 text-gray-500 hover:border-black hover:text-black transition-all min-h-[120px]"
                  >
                    <span className="text-2xl font-light leading-none mb-1">+</span>

                    <span className="text-[11px] font-black uppercase tracking-widest">
                      Yeni Adres Ekle
                    </span>
                  </button>
                </div>
              </section>

              {isMember && (
                <section className="bg-white p-5 md:p-7 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h2 className="text-base md:text-lg font-black uppercase tracking-tighter text-black">
                      Kuponlarım
                    </h2>

                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Üyelere Özel
                    </span>
                  </div>

                  <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 mb-3">
                    <p className="text-xs font-bold text-gray-500">
                      Şu an kullanılabilir kayıtlı kupon bulunmuyor.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                      placeholder="Kupon kodu ekle"
                      className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold uppercase outline-none focus:border-black"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        showNotice("Kupon doğrulama altyapısı sonraki adımda bağlanacak.", "info")
                      }
                      className="bg-black text-white px-5 rounded-xl text-xs font-black uppercase tracking-widest"
                    >
                      Ekle
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <div className="w-full lg:w-[400px]">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm lg:sticky lg:top-24">
            <h3 className="text-lg font-black uppercase tracking-tighter mb-6 pb-2 border-b border-gray-50">
              Sipariş Özeti
            </h3>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>Ara Toplam</span>
                <span>{cartTotal.toLocaleString("tr-TR")} ₺</span>
              </div>

              <div className="flex justify-between text-xs font-bold text-green-600">
                <span>Kargo</span>
                <span>ÜCRETSİZ</span>
              </div>

              <div className="flex justify-between items-end pt-4 border-t border-gray-50">
                <span className="text-sm font-black uppercase tracking-widest text-gray-400">
                  Toplam
                </span>

                <span className="text-3xl font-black">
                  {cartTotal.toLocaleString("tr-TR")} ₺
                </span>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(event) => setAgreeTerms(event.target.checked)}
                className="mt-0.5 accent-black w-4 h-4 flex-shrink-0"
              />

              <span className="text-[10px] text-gray-500 font-medium leading-tight">
                <b>Ön Bilgilendirme Koşulları</b>'nı ve{" "}
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    setIsContractModalOpen(true);
                  }}
                  className="text-black font-bold border-b border-black"
                >
                  Mesafeli Satış Sözleşmesi
                </button>
                'ni okudum, onaylıyorum.
              </span>
            </label>

            <button
              type="button"
              onClick={handleCompleteOrder}
              disabled={isProcessing || !!paytrIframeUrl || !checkoutMode}
              className="w-full bg-black text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
            >
              {isProcessing
                ? "Ödeme Başlatılıyor..."
                : paytrIframeUrl
                ? "Ödeme Formu Açıldı"
                : "Ödemeye Geç 💳"}
            </button>
          </div>
        </div>
      </div>

      {isPaymentModalOpen && paytrIframeUrl && (
        <div className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full h-full md:h-[90vh] md:max-w-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100 shrink-0">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Güvenli Ödeme
                </p>

                <h2 className="text-lg font-black text-black">
                  PayTR Ödeme Formu
                </h2>

                <p className="text-[11px] font-bold text-gray-500 mt-1">
                  Sipariş No: {paytrMerchantOid}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-10 h-10 bg-gray-100 rounded-full font-black hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <iframe
              src={paytrIframeUrl}
              title="PayTR Ödeme Formu"
              className="w-full flex-1 bg-white"
              frameBorder="0"
              scrolling="yes"
            />
          </div>
        </div>
      )}

      {isContractModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl max-h-[90vh] flex flex-col relative z-10">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
              <h2 className="text-lg font-black uppercase tracking-tight">
                Mesafeli Satış Sözleşmesi
              </h2>

              <button
                type="button"
                onClick={() => setIsContractModalOpen(false)}
                className="w-8 h-8 bg-gray-100 rounded-full font-bold hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto pr-2 custom-scrollbar">
              <DistanceSellingContract />
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAgreeTerms(true);
                  setIsContractModalOpen(false);
                }}
                className="bg-black text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md"
              >
                Okudum, Onaylıyorum
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddressModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl max-h-[90vh] flex flex-col relative z-10">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
              <h2 className="text-xl font-black uppercase tracking-tight">
                Yeni Adres Ekle
              </h2>

              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="w-8 h-8 bg-gray-100 rounded-full font-bold hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSaveAddressModal}
              className="space-y-4 overflow-y-auto pr-2 pb-4 hide-scrollbar"
            >
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Adres Başlığı *
                </label>

                <input
                  required
                  name="addressTitle"
                  maxLength={MAX_ADDRESS_TITLE_LENGTH}
                  value={addressData.addressTitle}
                  onChange={handleInputChange}
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
                    name="firstName"
                    maxLength={MAX_NAME_LENGTH}
                    value={addressData.firstName}
                    onChange={handleInputChange}
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
                    name="lastName"
                    maxLength={MAX_NAME_LENGTH}
                    value={addressData.lastName}
                    onChange={handleInputChange}
                    type="text"
                    placeholder="Soyadınız"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Telefon *
                </label>

                <input
                  required
                  name="phone"
                  value={addressData.phone}
                  onChange={handleInputChange}
                  type="tel"
                  inputMode="tel"
                  maxLength={MAX_PHONE_LENGTH}
                  placeholder="05XXXXXXXXX"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium flex justify-between items-center text-left"
                  >
                    <span className={addressData.city ? "text-black" : "text-gray-400"}>
                      {addressData.city || "İl Seçiniz"}
                    </span>
                    <span className="text-[10px]">▼</span>
                  </button>

                  {showCitySelect && (
                    <SelectPopover
                      search={citySearch}
                      setSearch={setCitySearch}
                      onClose={() => setShowCitySelect(false)}
                      items={filteredCities}
                      getKey={(city: any) => city.id}
                      getLabel={(city: any) => city.name}
                      onPick={(city: any) => handleCitySelect(city.name)}
                      placeholder="İl Ara..."
                    />
                  )}
                </div>

                <div className="relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    İlçe *
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      if (addressData.city) {
                        setShowDistrictSelect(!showDistrictSelect);
                        setShowCitySelect(false);
                        setShowNeighborhoodSelect(false);
                      }
                    }}
                    className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium flex justify-between items-center text-left ${
                      !addressData.city ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <span className={addressData.district ? "text-black" : "text-gray-400"}>
                      {addressData.district || "İlçe Seçiniz"}
                    </span>
                    <span className="text-[10px]">▼</span>
                  </button>

                  {showDistrictSelect && (
                    <SelectPopover
                      search={districtSearch}
                      setSearch={setDistrictSearch}
                      onClose={() => setShowDistrictSelect(false)}
                      items={filteredDistricts}
                      getKey={(district: any) => district.id}
                      getLabel={(district: any) => district.name}
                      onPick={(district: any) => handleDistrictSelect(district)}
                      placeholder="İlçe Ara..."
                    />
                  )}
                </div>

                <div className="relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Mahalle *
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      if (addressData.district) {
                        setShowNeighborhoodSelect(!showNeighborhoodSelect);
                        setShowCitySelect(false);
                        setShowDistrictSelect(false);
                      }
                    }}
                    className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium flex justify-between items-center text-left ${
                      !addressData.district ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <span
                      className={
                        addressData.neighborhood
                          ? "text-black line-clamp-1"
                          : "text-gray-400"
                      }
                    >
                      {addressData.neighborhood || "Mahalle Seçiniz"}
                    </span>
                    <span className="text-[10px]">▼</span>
                  </button>

                  {showNeighborhoodSelect && (
                    <SelectPopover
                      search={neighborhoodSearch}
                      setSearch={setNeighborhoodSearch}
                      onClose={() => setShowNeighborhoodSelect(false)}
                      items={filteredNeighborhoods}
                      getKey={(neighborhood: any) => neighborhood.id || neighborhood.name}
                      getLabel={(neighborhood: any) => neighborhood.name}
                      onPick={(neighborhood: any) =>
                        handleNeighborhoodSelect(neighborhood.name)
                      }
                      placeholder="Mahalle Ara..."
                      emptyText={neighborhoods.length === 0 ? "Yükleniyor..." : "Sonuç yok"}
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Açık Adres *
                </label>

                <textarea
                  required
                  name="fullAddress"
                  maxLength={MAX_FULL_ADDRESS_LENGTH}
                  value={addressData.fullAddress}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Cadde, sokak, bina ve diğer bilgileri giriniz."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium resize-none outline-none focus:border-black transition-all"
                />
              </div>

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
