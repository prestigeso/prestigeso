"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import NoticeToast from "@/components/checkout/NoticeToast";
import SelectPopover from "@/components/checkout/SelectPopover";
import CheckoutPaymentModal from "@/components/checkout/CheckoutPaymentModal";
import CheckoutContractModal from "@/components/checkout/CheckoutContractModal";
import CheckoutSummary from "@/components/checkout/CheckoutSummary";
import {
  MAX_ADDRESS_TITLE_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_FULL_ADDRESS_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PHONE_LENGTH,
  type AddressForm,
  type AddressRow,
  type CheckoutMode,
  type CouponRow,
  type CouponUsageRow,
  type NoticeType,
} from "@/lib/checkout/checkoutTypes";
import {
  formatMoney,
  isValidEmail,
  isValidTurkishPhone,
  normalizeCouponCode,
  normalizeEmail,
  normalizePhone,
  normalizeText,
} from "@/lib/checkout/checkoutFormatters";
import { validateAddressForm } from "@/lib/checkout/checkoutValidators";
import {
  calculateRemainingForFreeShipping,
  calculateShippingFee,
  DEFAULT_SHIPPING_SETTINGS,
  normalizeShippingSettings,
} from "@/lib/checkout/checkoutShipping";
import { calculateCouponDiscount, getCouponLabel } from "@/lib/checkout/checkoutCoupons";

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
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [couponUsages, setCouponUsages] = useState<CouponUsageRow[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<CouponRow | null>(null);
  const [isCouponsLoading, setIsCouponsLoading] = useState(false);
  const [shippingSettings, setShippingSettings] = useState(DEFAULT_SHIPPING_SETTINGS);

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
    if (!cartItems || cartItems.length === 0) router.replace("/");
  }, [cartItems, router]);

  useEffect(() => {
    const initCheckout = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      try {
        const settingsResponse = await fetch("/api/site-settings", {
          method: "GET",
          credentials: "include",
        });
        const settingsJson = await settingsResponse.json();
        setShippingSettings(normalizeShippingSettings(settingsJson?.shipping));
      } catch (error) {
        console.error("Kargo ayarları yüklenemedi:", error);
      }

      if (session) {
        setUser(session.user);
        setCheckoutMode("member");
        setAddressData((prev) => ({ ...prev, email: (session.user.email || "").toString() }));

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

        setIsCouponsLoading(true);
        const { data: couponsData, error: couponsError } = await supabase
          .from("coupons")
          .select("*")
          .order("created_at", { ascending: false });
        if (!couponsError && couponsData) setCoupons(couponsData as CouponRow[]);

        const { data: usageData } = await supabase
          .from("coupon_usages")
          .select("*")
          .eq("user_id", session.user.id);
        if (usageData) setCouponUsages(usageData as CouponUsageRow[]);
        setIsCouponsLoading(false);
      } else {
        setUser(null);
        setCheckoutMode(null);
        setCoupons([]);
        setCouponUsages([]);
        setSelectedCoupon(null);
        setCouponCode("");
      }

      try {
        const res = await fetch("https://turkiyeapi.dev/api/v1/provinces");
        const json = await res.json();
        if (json.status === "OK") {
          setCities(json.data.sort((a: any, b: any) => a.name.localeCompare(b.name, "tr")));
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
    return savedAddresses.find((address) => address.id === selectedAddressId) || null;
  }, [savedAddresses, selectedAddressId]);

  const usageCountsByCouponId = useMemo(() => {
    return couponUsages.reduce((acc: Record<string, number>, usage) => {
      acc[usage.coupon_id] = (acc[usage.coupon_id] || 0) + 1;
      return acc;
    }, {});
  }, [couponUsages]);

  const getCouponProblem = (coupon: CouponRow) => {
    if (!isMember) return "Kuponlar sadece üyeler için geçerlidir.";

    if (Number(cartTotal || 0) < Number(coupon.min_order_amount || 0)) {
      return `Bu kupon için sepet tutarı en az ${formatMoney(coupon.min_order_amount)} ₺ olmalıdır.`;
    }

    if (
      coupon.usage_limit_total !== null &&
      coupon.usage_limit_total !== undefined &&
      Number(coupon.used_count || 0) >= Number(coupon.usage_limit_total)
    ) {
      return "Bu kuponun toplam kullanım hakkı dolmuştur.";
    }

    const userUsageCount = usageCountsByCouponId[coupon.id] || 0;
    if (userUsageCount >= Number(coupon.usage_limit_per_user || 1)) {
      return "Bu kuponu daha önce kullandınız.";
    }

    return null;
  };

  const couponDiscount = useMemo(() => {
    const problem = selectedCoupon ? getCouponProblem(selectedCoupon) : null;
    if (problem) return 0;
    return calculateCouponDiscount(selectedCoupon, Number(cartTotal || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoupon, cartTotal, isMember, usageCountsByCouponId]);

  const subtotalAfterCoupon = useMemo(() => Math.max(0, Number(cartTotal || 0) - couponDiscount), [cartTotal, couponDiscount]);
  const shippingFee = useMemo(() => calculateShippingFee(shippingSettings, subtotalAfterCoupon), [shippingSettings, subtotalAfterCoupon]);
  const remainingForFreeShipping = useMemo(
    () => calculateRemainingForFreeShipping(shippingSettings, subtotalAfterCoupon, shippingFee),
    [shippingSettings, subtotalAfterCoupon, shippingFee]
  );
  const finalTotal = useMemo(() => Math.max(0, subtotalAfterCoupon + shippingFee), [subtotalAfterCoupon, shippingFee]);

  useEffect(() => {
    if (!selectedCoupon) return;
    const problem = getCouponProblem(selectedCoupon);
    if (problem) {
      setSelectedCoupon(null);
      showNotice(problem, "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartTotal]);

  const filteredCities = useMemo(() => {
    const query = citySearch.toLocaleLowerCase("tr-TR");
    return cities.filter((city: any) => city.name.toLocaleLowerCase("tr-TR").includes(query));
  }, [cities, citySearch]);

  const filteredDistricts = useMemo(() => {
    const query = districtSearch.toLocaleLowerCase("tr-TR");
    return districts.filter((district: any) => district.name.toLocaleLowerCase("tr-TR").includes(query));
  }, [districts, districtSearch]);

  const filteredNeighborhoods = useMemo(() => {
    const query = neighborhoodSearch.toLocaleLowerCase("tr-TR");
    return neighborhoods.filter((neighborhood: any) => neighborhood.name.toLocaleLowerCase("tr-TR").includes(query));
  }, [neighborhoods, neighborhoodSearch]);

  const handleInputChange = (event: any) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === "email") nextValue = normalizeEmail(value).slice(0, MAX_EMAIL_LENGTH);
    if (name === "phone") nextValue = normalizePhone(value);
    if (name === "firstName" || name === "lastName") nextValue = value.slice(0, MAX_NAME_LENGTH);
    if (name === "addressTitle") nextValue = value.slice(0, MAX_ADDRESS_TITLE_LENGTH);
    if (name === "fullAddress") nextValue = value.slice(0, MAX_FULL_ADDRESS_LENGTH);

    setAddressData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleCitySelect = (cityName: string) => {
    const selectedCity = cities.find((city) => city.name === cityName);
    if (selectedCity) {
      setDistricts(selectedCity.districts.sort((a: any, b: any) => a.name.localeCompare(b.name, "tr")));
    } else {
      setDistricts([]);
    }

    setAddressData((prev) => ({ ...prev, city: cityName, district: "", neighborhood: "" }));
    setNeighborhoods([]);
    setShowCitySelect(false);
    setCitySearch("");
  };

  const handleDistrictSelect = async (district: any) => {
    setAddressData((prev) => ({ ...prev, district: district.name, neighborhood: "" }));
    setShowDistrictSelect(false);
    setDistrictSearch("");

    try {
      const res = await fetch(`https://turkiyeapi.dev/api/v1/neighborhoods?districtId=${district.id}&limit=1000`);
      const json = await res.json();
      if (json.status === "OK") {
        setNeighborhoods(json.data.sort((a: any, b: any) => a.name.localeCompare(b.name, "tr")));
      }
    } catch (error) {
      console.error("Mahalleler yüklenemedi:", error);
    }
  };

  const handleNeighborhoodSelect = (neighborhoodName: string) => {
    setAddressData((prev) => ({ ...prev, neighborhood: neighborhoodName }));
    setShowNeighborhoodSelect(false);
    setNeighborhoodSearch("");
  };

  const applyCoupon = (coupon: CouponRow) => {
    const problem = getCouponProblem(coupon);
    if (problem) {
      showNotice(problem, "error");
      return;
    }

    const discount = calculateCouponDiscount(coupon, Number(cartTotal || 0));
    if (discount <= 0) {
      showNotice("Bu kupon mevcut sepet için indirim oluşturmuyor.", "error");
      return;
    }

    setSelectedCoupon(coupon);
    setCouponCode(coupon.code);
    showNotice(`${coupon.code} kuponu uygulandı.`, "success");
  };

  const handleApplyCouponCode = () => {
    const code = normalizeCouponCode(couponCode);

    if (!isMember) {
      showNotice("Kupon kullanmak için giriş yapmalısınız.", "error");
      return;
    }

    if (!code) {
      showNotice("Lütfen kupon kodu girin.", "error");
      return;
    }

    const foundCoupon = coupons.find((coupon) => coupon.code === code);
    if (!foundCoupon) {
      showNotice("Kupon bulunamadı veya aktif değil.", "error");
      return;
    }

    applyCoupon(foundCoupon);
  };

  const removeCoupon = () => {
    setSelectedCoupon(null);
    setCouponCode("");
    showNotice("Kupon kaldırıldı.", "info");
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
          .insert([{ user_id: user.id, ...cleanedAddress, is_default: savedAddresses.length === 0 }])
          .select("*")
          .single();

        if (insErr) throw insErr;

        if (inserted) {
          setSavedAddresses((prev) => [inserted as AddressRow, ...prev]);
          setSelectedAddressId(inserted.id);
        }
      } else {
        const dummyId = Date.now();
        const newGuestAddr: AddressRow = { id: dummyId, user_id: "guest", ...cleanedAddress };
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
    if (!isValidEmail(email)) return "Lütfen geçerli bir e-posta adresi giriniz.";
    if (!selectedAddress) return "Lütfen teslimat adresi seçin/ekleyin.";
    if (!isValidTurkishPhone(selectedAddress.phone)) return "Seçili adresteki telefon numarası geçerli değil. Lütfen adresi güncelleyin.";

    if (!selectedAddress.city || !selectedAddress.district || !selectedAddress.neighborhood || !selectedAddress.full_address) {
      return "Seçili teslimat adresi eksik. Lütfen yeni adres ekleyin.";
    }

    if (!agreeTerms) return "Lütfen Mesafeli Satış ve Ön Bilgilendirme koşullarını onaylayın.";
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

      const activeCouponCode = isMember && selectedCoupon && couponDiscount > 0 ? selectedCoupon.code : "";

      const response = await fetch("/api/paytr/create-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: isMember ? user?.id || null : null,
          userEmail: normalizeEmail(addressData.email || user?.email || ""),
          items: cartItems,
          shippingAddress: shippingAddressObject,
          checkoutMode,
          couponCode: activeCouponCode,
          couponDiscountPreview: couponDiscount,
          cartSubtotal: Number(cartTotal || 0),
          cartTotalAfterCoupon: subtotalAfterCoupon,
          shippingFeePreview: shippingFee,
          freeShippingThresholdPreview: shippingSettings.free_shipping_threshold,
          finalTotalPreview: finalTotal,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "PayTR ödeme başlatılamadı.");

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
            <button type="button" onClick={() => setIsCartOpen(!isCartOpen)} className="w-full flex items-center justify-between cursor-pointer group text-left">
              <div className="flex items-center gap-3 md:gap-4">
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">1</span>
                <h2 className="text-base md:text-lg font-black uppercase tracking-tighter text-black">Sepetimdeki Ürünler ({cartItems.length})</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:block text-[11px] font-black text-gray-400 uppercase tracking-widest">{formatMoney(cartTotal)} ₺</span>
                <div className={`w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-gray-100 transition-all duration-300 ${isCartOpen ? "rotate-180" : ""}`}>▼</div>
              </div>
            </button>

            {isCartOpen && (
              <div className="mt-6 border-t border-gray-50 pt-6 space-y-4">
                {cartItems.map((item: any, index: number) => {
                  const displayImage = item.images?.[0] || item.image || "/logo.jpeg";
                  const itemPrice = Number(item.discount_price) > 0 ? Number(item.discount_price) : Number(item.price || 0);
                  return (
                    <div key={`${item.id}-${index}`} className="flex gap-4 items-center">
                      <div className="w-14 h-14 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden flex-shrink-0">
                        <img src={displayImage} className="w-full h-full object-cover mix-blend-multiply" alt={item.name || "Ürün"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase leading-tight line-clamp-2">{item.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1">{item.quantity || 1} Adet</p>
                      </div>
                      <p className="text-xs font-black">{formatMoney(itemPrice * (item.quantity || 1))} ₺</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {!user && !checkoutMode && (
            <section className="bg-white p-5 md:p-7 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-5">
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">2</span>
                <h2 className="text-base md:text-lg font-black uppercase tracking-tighter text-black">Nasıl Devam Etmek İstersiniz?</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => router.push("/login?redirect=/checkout")} className="rounded-2xl bg-black text-white p-5 text-left active:scale-[0.98] transition-all">
                  <p className="text-sm font-black uppercase tracking-widest">Giriş Yap / Kaydol</p>
                  <p className="text-xs font-medium text-white/70 mt-2">Kuponlar, kayıtlı adresler ve sipariş takibi için önerilir.</p>
                </button>
                <button type="button" onClick={() => setCheckoutMode("guest")} className="rounded-2xl bg-gray-50 border border-gray-200 text-black p-5 text-left active:scale-[0.98] transition-all">
                  <p className="text-sm font-black uppercase tracking-widest">Üye Olmadan Devam Et</p>
                  <p className="text-xs font-medium text-gray-500 mt-2">E-posta, telefon ve teslimat adresiyle hızlıca ödeme yapın.</p>
                </button>
              </div>
            </section>
          )}

          {checkoutMode && (
            <>
              <section className="bg-white p-5 md:p-7 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-50">
                  <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">{user ? 2 : 3}</span>
                  <h2 className="text-base md:text-lg font-black uppercase tracking-tighter text-black">Teslimat Adresi</h2>
                </div>

                {isGuest && (
                  <div className="mb-6">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">E-Posta Adresiniz *</label>
                    <input type="email" name="email" required maxLength={MAX_EMAIL_LENGTH} value={addressData.email} onChange={handleInputChange} placeholder="Sipariş bilgilendirmesi için gerekli" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all" />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedAddresses.map((addr) => {
                    const active = selectedAddressId === addr.id;
                    return (
                      <label key={addr.id} className={`flex gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${active ? "border-black bg-gray-50 shadow-md" : "border-gray-100 hover:border-gray-200"}`} onClick={() => setSelectedAddressId(addr.id)}>
                        <input type="radio" checked={active} onChange={() => {}} className="mt-1 accent-black w-4 h-4" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded">{addr.title}</span>
                          <p className="text-sm font-bold mt-2">{addr.first_name} {addr.last_name}</p>
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{addr.full_address}</p>
                          <p className="text-[10px] font-black text-gray-400 mt-2 uppercase">{addr.district} / {addr.city}</p>
                        </div>
                      </label>
                    );
                  })}

                  <button type="button" onClick={() => setIsAddressModalOpen(true)} className="flex items-center justify-center gap-3 p-5 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 text-gray-500 hover:border-black hover:text-black transition-all min-h-[120px]">
                    <span className="text-2xl font-light leading-none mb-1">+</span>
                    <span className="text-[11px] font-black uppercase tracking-widest">Yeni Adres Ekle</span>
                  </button>
                </div>
              </section>

              {isMember && (
                <section className="bg-white p-5 md:p-7 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-base md:text-lg font-black uppercase tracking-tighter text-black">Kuponlarım</h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Sadece üyelere özel</p>
                    </div>
                    {selectedCoupon && <button type="button" onClick={removeCoupon} className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">Kuponu Kaldır</button>}
                  </div>

                  {isCouponsLoading ? (
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 mb-3"><p className="text-xs font-bold text-gray-400 animate-pulse">Kuponlar yükleniyor...</p></div>
                  ) : coupons.length === 0 ? (
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 mb-3"><p className="text-xs font-bold text-gray-500">Şu an kullanılabilir kayıtlı kupon bulunmuyor.</p></div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {coupons.map((coupon) => {
                        const problem = getCouponProblem(coupon);
                        const active = selectedCoupon?.id === coupon.id;
                        const discount = calculateCouponDiscount(coupon, Number(cartTotal || 0));
                        return (
                          <button key={coupon.id} type="button" onClick={() => applyCoupon(coupon)} className={`text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98] ${active ? "border-black bg-black text-white shadow-lg" : problem ? "border-gray-100 bg-gray-50 text-gray-400" : "border-gray-200 bg-white text-black hover:border-black"}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div><p className="text-[10px] font-black uppercase tracking-widest opacity-70">{coupon.code}</p><p className="text-sm font-black mt-1">{coupon.name}</p></div>
                              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${active ? "bg-white text-black" : "bg-black text-white"}`}>{getCouponLabel(coupon)}</span>
                            </div>
                            {coupon.description && <p className={`text-[11px] font-medium mt-2 leading-relaxed ${active ? "text-white/70" : "text-gray-500"}`}>{coupon.description}</p>}
                            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-current/10">
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Min. {formatMoney(coupon.min_order_amount)} ₺</p>
                              {problem ? <p className="text-[10px] font-black text-right">Uygun değil</p> : <p className="text-[10px] font-black text-right">-{formatMoney(discount)} ₺</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input value={couponCode} onChange={(event) => setCouponCode(normalizeCouponCode(event.target.value))} placeholder="Kupon kodu ekle" className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold uppercase outline-none focus:border-black" />
                    <button type="button" onClick={handleApplyCouponCode} className="bg-black text-white px-5 rounded-xl text-xs font-black uppercase tracking-widest">Uygula</button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <CheckoutSummary
          cartTotal={Number(cartTotal || 0)}
          couponDiscount={couponDiscount}
          selectedCoupon={selectedCoupon}
          shippingFee={shippingFee}
          remainingForFreeShipping={remainingForFreeShipping}
          finalTotal={finalTotal}
          agreeTerms={agreeTerms}
          setAgreeTerms={setAgreeTerms}
          setIsContractModalOpen={setIsContractModalOpen}
          handleCompleteOrder={handleCompleteOrder}
          isProcessing={isProcessing}
          paytrIframeUrl={paytrIframeUrl}
          checkoutMode={checkoutMode}
        />
      </div>

      <CheckoutPaymentModal isOpen={isPaymentModalOpen} iframeUrl={paytrIframeUrl} merchantOid={paytrMerchantOid} onClose={() => setIsPaymentModalOpen(false)} />
      <CheckoutContractModal isOpen={isContractModalOpen} onClose={() => setIsContractModalOpen(false)} onApprove={() => { setAgreeTerms(true); setIsContractModalOpen(false); }} />

      {isAddressModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl max-h-[90vh] flex flex-col relative z-10">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
              <h2 className="text-xl font-black uppercase tracking-tight">Yeni Adres Ekle</h2>
              <button type="button" onClick={() => setIsAddressModalOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full font-bold hover:bg-gray-200">✕</button>
            </div>
            <form onSubmit={handleSaveAddressModal} className="space-y-4 overflow-y-auto pr-2 pb-4 hide-scrollbar">
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Adres Başlığı *</label><input required name="addressTitle" maxLength={MAX_ADDRESS_TITLE_LENGTH} value={addressData.addressTitle} onChange={handleInputChange} type="text" placeholder="Örn: Evim, İş Yerim" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Ad *</label><input required name="firstName" maxLength={MAX_NAME_LENGTH} value={addressData.firstName} onChange={handleInputChange} type="text" placeholder="Adınız" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all" /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Soyad *</label><input required name="lastName" maxLength={MAX_NAME_LENGTH} value={addressData.lastName} onChange={handleInputChange} type="text" placeholder="Soyadınız" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all" /></div>
              </div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Telefon *</label><input required name="phone" value={addressData.phone} onChange={handleInputChange} type="tel" inputMode="tel" maxLength={MAX_PHONE_LENGTH} placeholder="05XXXXXXXXX" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all" /></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">İl *</label><button type="button" onClick={() => { setShowCitySelect(!showCitySelect); setShowDistrictSelect(false); setShowNeighborhoodSelect(false); }} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium flex justify-between items-center text-left"><span className={addressData.city ? "text-black" : "text-gray-400"}>{addressData.city || "İl Seçiniz"}</span><span className="text-[10px]">▼</span></button>{showCitySelect && <SelectPopover search={citySearch} setSearch={setCitySearch} onClose={() => setShowCitySelect(false)} items={filteredCities} getKey={(city: any) => city.id} getLabel={(city: any) => city.name} onPick={(city: any) => handleCitySelect(city.name)} placeholder="İl Ara..." />}</div>
                <div className="relative"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">İlçe *</label><button type="button" onClick={() => { if (addressData.city) { setShowDistrictSelect(!showDistrictSelect); setShowCitySelect(false); setShowNeighborhoodSelect(false); } }} className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium flex justify-between items-center text-left ${!addressData.city ? "opacity-50 cursor-not-allowed" : ""}`}><span className={addressData.district ? "text-black" : "text-gray-400"}>{addressData.district || "İlçe Seçiniz"}</span><span className="text-[10px]">▼</span></button>{showDistrictSelect && <SelectPopover search={districtSearch} setSearch={setDistrictSearch} onClose={() => setShowDistrictSelect(false)} items={filteredDistricts} getKey={(district: any) => district.id} getLabel={(district: any) => district.name} onPick={(district: any) => handleDistrictSelect(district)} placeholder="İlçe Ara..." />}</div>
                <div className="relative"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Mahalle *</label><button type="button" onClick={() => { if (addressData.district) { setShowNeighborhoodSelect(!showNeighborhoodSelect); setShowCitySelect(false); setShowDistrictSelect(false); } }} className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium flex justify-between items-center text-left ${!addressData.district ? "opacity-50 cursor-not-allowed" : ""}`}><span className={addressData.neighborhood ? "text-black line-clamp-1" : "text-gray-400"}>{addressData.neighborhood || "Mahalle Seçiniz"}</span><span className="text-[10px]">▼</span></button>{showNeighborhoodSelect && <SelectPopover search={neighborhoodSearch} setSearch={setNeighborhoodSearch} onClose={() => setShowNeighborhoodSelect(false)} items={filteredNeighborhoods} getKey={(neighborhood: any) => neighborhood.id || neighborhood.name} getLabel={(neighborhood: any) => neighborhood.name} onPick={(neighborhood: any) => handleNeighborhoodSelect(neighborhood.name)} placeholder="Mahalle Ara..." emptyText={neighborhoods.length === 0 ? "Yükleniyor..." : "Sonuç yok"} />}</div>
              </div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Açık Adres *</label><textarea required name="fullAddress" maxLength={MAX_FULL_ADDRESS_LENGTH} value={addressData.fullAddress} onChange={handleInputChange} rows={3} placeholder="Cadde, sokak, bina ve diğer bilgileri giriniz." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium resize-none outline-none focus:border-black transition-all" /></div>
              <button type="submit" disabled={isSavingAddress} className="w-full bg-black text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 shadow-md active:scale-95 transition-all mt-4">{isSavingAddress ? "Kaydediliyor..." : "Adresi Kaydet 📍"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
