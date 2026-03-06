"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import DistanceSellingContract from "@/components/contracts/DistanceSellingContract";

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

export default function CheckoutPage() {
  const router = useRouter();
  const { items: cartItems, cartTotal, clearCart } = useCart();

  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // SEPET AKORDEON DURUMU (Sadece sepet açılıp kapanabilir)
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Address book
  const [savedAddresses, setSavedAddresses] = useState<AddressRow[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  // Agreements & Payment
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer">("card");

  const [addressData, setAddressData] = useState<AddressForm>({
    email: "", firstName: "", lastName: "", phone: "",
    city: "", district: "", neighborhood: "", fullAddress: "", addressTitle: "",
  });

  // --- İL / İLÇE / MAHALLE API STATELERİ ---
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);

  const [showCitySelect, setShowCitySelect] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [showDistrictSelect, setShowDistrictSelect] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");
  const [showNeighborhoodSelect, setShowNeighborhoodSelect] = useState(false);
  const [neighborhoodSearch, setNeighborhoodSearch] = useState("");

  // Sepet boşsa checkout’a girilmesin
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) router.replace("/");
  }, [cartItems, router]);

  // Init checkout (session + addresses + API)
  useEffect(() => {
    const initCheckout = async () => {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setUser(session.user);
        setIsGuest(false);
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
      } else {
        setUser(null);
        setIsGuest(true);
      }

      // İlleri Çek
      try {
        const res = await fetch("https://turkiyeapi.dev/api/v1/provinces");
        const json = await res.json();
        if (json.status === "OK") {
          setCities(json.data.sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr')));
        }
      } catch (error) {
        console.error("Şehirler yüklenemedi:", error);
      }

      setLoading(false);
    };

    initCheckout();
  }, []);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setAddressData((prev) => ({ ...prev, [name]: value }));
  };

  // --- İL / İLÇE / MAHALLE SEÇİM MOTORU ---
  const handleCitySelect = (cityName: string) => {
    const selectedCity = cities.find((c) => c.name === cityName);
    if (selectedCity) { setDistricts(selectedCity.districts.sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr'))); } else { setDistricts([]); }
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
      if (json.status === "OK") { setNeighborhoods(json.data.sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr'))); }
    } catch (error) { console.error("Mahalleler yüklenemedi:", error); }
  };

  const handleNeighborhoodSelect = (neighborhoodName: string) => {
    setAddressData((prev) => ({ ...prev, neighborhood: neighborhoodName }));
    setShowNeighborhoodSelect(false);
    setNeighborhoodSearch("");
  };

  // POPUP'TAN ADRES KAYDETME MOTORU
  const handleSaveAddressModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!addressData.city || !addressData.district || !addressData.neighborhood) {
      return alert("Lütfen İl, İlçe ve Mahalle seçiniz!");
    }

    setIsSavingAddress(true);
    try {
      if (user) {
        const { data: inserted, error: insErr } = await supabase.from("addresses").insert([{
            user_id: user.id,
            title: addressData.addressTitle,
            first_name: addressData.firstName,
            last_name: addressData.lastName,
            phone: addressData.phone,
            city: addressData.city,
            district: addressData.district,
            neighborhood: addressData.neighborhood,
            full_address: addressData.fullAddress,
            is_default: savedAddresses.length === 0, 
        }]).select("*").single();

        if (insErr) throw insErr;
        if (inserted) {
          setSavedAddresses((prev) => [inserted as AddressRow, ...prev]);
          setSelectedAddressId(inserted.id);
        }
      } else {
        const dummyId = Math.floor(Math.random() * 1000000);
        const newGuestAddr: AddressRow = {
          id: dummyId,
          user_id: "guest",
          title: addressData.addressTitle,
          first_name: addressData.firstName,
          last_name: addressData.lastName,
          phone: addressData.phone,
          city: addressData.city,
          district: addressData.district,
          neighborhood: addressData.neighborhood,
          full_address: addressData.fullAddress,
        };
        setSavedAddresses([newGuestAddr]);
        setSelectedAddressId(dummyId);
      }
      setIsAddressModalOpen(false); 
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const selectedAddress = useMemo(() => {
    if (!selectedAddressId) return null;
    return savedAddresses.find((a) => a.id === selectedAddressId) || null;
  }, [savedAddresses, selectedAddressId]);

  const canProceedPaymentStep = useMemo(() => {
    if (isGuest && !addressData.email) return false;
    return !!selectedAddress;
  }, [isGuest, addressData.email, selectedAddress]);

  const validateBeforePay = () => {
    if (cartItems.length === 0) return "Sepet boş.";
    if (!canProceedPaymentStep) return "Lütfen teslimat adresi seçin/ekleyin.";
    if (isGuest && !addressData.email) return "Lütfen e-posta adresinizi giriniz.";
    if (!agreeTerms) return "Lütfen Mesafeli Satış ve Ön Bilgilendirme koşullarını onaylayın.";
    return null;
  };

  const handleCompleteOrder = async () => {
    const err = validateBeforePay();
    if (err) return alert(err);
    setIsProcessing(true);

    try {
      if (isGuest && addressData.email) {
        const { data: existingUserOrder } = await supabase.from("orders").select("id")
          .eq("user_email", addressData.email.toLowerCase()).not("user_id", "is", null).limit(1);
        if (existingUserOrder && existingUserOrder.length > 0) {
          alert("❌ Bu e-posta ile kayıtlı bir hesap var. Lütfen giriş yapınız.");
          router.push("/login");
          return;
        }
      }

      const shippingAddressObject = {
        email: addressData.email || "",
        firstName: selectedAddress?.first_name,
        lastName: selectedAddress?.last_name,
        phone: selectedAddress?.phone,
        city: selectedAddress?.city,
        district: selectedAddress?.district,
        neighborhood: selectedAddress?.neighborhood,
        fullAddress: selectedAddress?.full_address,
        addressTitle: selectedAddress?.title,
      };

      for (const item of cartItems) {
        const { data: pData } = await supabase.from("products").select("stock, name").eq("id", item.id).single();
        if (!pData || pData.stock < (item.quantity || 1)) throw new Error(`${item.name} stokta yetersiz!`);
      }

      const orderNo = `PRS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const { error: orderErr } = await supabase.from("orders").insert([{
          order_no: orderNo,
          user_id: user?.id || null,
          user_email: (addressData.email || "").toLowerCase(),
          items: cartItems,
          total_amount: cartTotal,
          shipping_address: shippingAddressObject,
          status: "Bekliyor",
          payment_method: paymentMethod,
      }]);

      if (orderErr) throw orderErr;

      for (const item of cartItems) {
        await supabase.rpc("decrement_stock", { row_id: item.id, amount: item.quantity || 1 });
      }

      alert(`Sipariş Alındı! No: ${orderNo}`);
      clearCart();
      router.push(user ? "/profile" : "/");
    } catch (e: any) {
      alert(e?.message || "Sipariş oluşturulamadı.");
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-400">Checkout hazırlanıyor...</div>;

  return (
    <div className="min-h-screen bg-[#fcfcfc] py-12 px-4 font-sans text-black pb-20">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10">
        
        {/* SOL KOLON: ADIMLAR */}
        <div className="flex-1 space-y-6">
          
          {/* BÖLÜM 1: SEPET ÖZETİ (Soft Akordeon) */}
          <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div 
              onClick={() => setIsCartOpen(!isCartOpen)}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">1</span>
                <h2 className="text-lg font-black uppercase tracking-tighter text-black">
                  Sepetimdeki Ürünler ({cartItems.length})
                </h2>
              </div>
              <div className="flex items-center gap-4">
                {!isCartOpen && (
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest hidden sm:block">
                    {cartTotal.toLocaleString("tr-TR")} ₺
                  </span>
                )}
                <div className={`w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-gray-100 transition-all duration-300 ${isCartOpen ? "rotate-180" : ""}`}>
                  ▼
                </div>
              </div>
            </div>

            {isCartOpen && (
              <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-gray-50 pt-6">
                <div className="space-y-4">
                  {cartItems.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-4 items-center">
                      <div className="w-14 h-14 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden flex-shrink-0">
                        <img src={item.images?.[0] || item.image || "/logo.jpeg"} className="w-full h-full object-cover mix-blend-multiply" alt="" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase leading-tight line-clamp-2">{item.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1">{item.quantity || 1} Adet</p>
                      </div>
                      <p className="text-xs font-black">{((Number(item.discount_price) > 0 ? Number(item.discount_price) : Number(item.price)) * (item.quantity || 1)).toLocaleString("tr-TR")} ₺</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* BÖLÜM 2: TESLİMAT ADRESİ (Hep Açık & Sabit) */}
          <section className="bg-white p-7 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-50">
              <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">2</span>
              <h2 className="text-lg font-black uppercase tracking-tighter text-black">
                Teslimat Adresi
              </h2>
            </div>

            {isGuest && (
               <div className="mb-6">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">E-Posta Adresiniz *</label>
                  <input type="email" name="email" value={addressData.email} onChange={handleInputChange} placeholder="Sipariş onayı için gerekli" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all" />
               </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedAddresses.map((addr) => {
                const active = selectedAddressId === addr.id;
                return (
                  <label key={addr.id} className={`flex gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${active ? "border-black bg-gray-50 shadow-md" : "border-gray-100 hover:border-gray-200"}`} onClick={() => setSelectedAddressId(addr.id)}>
                    <input type="radio" checked={active} onChange={() => {}} className="mt-1 accent-black w-4 h-4" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded">{addr.title}</span>
                        {addr.is_default && <span className="text-[9px] font-black text-green-600 uppercase bg-green-50 px-2 py-0.5 rounded">Varsayılan</span>}
                      </div>
                      <p className="text-sm font-bold">{addr.first_name} {addr.last_name}</p>
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{addr.full_address}</p>
                      <p className="text-[10px] font-black text-gray-400 mt-2 uppercase">{addr.district} / {addr.city}</p>
                    </div>
                  </label>
                );
              })}

              {/* KÜÇÜLTÜLMÜŞ YENİ ADRES EKLE BUTONU */}
              <button 
                onClick={() => setIsAddressModalOpen(true)}
                className="flex items-center justify-center gap-3 p-5 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 text-gray-500 hover:border-black hover:text-black transition-all min-h-[120px]"
              >
                <span className="text-2xl font-light leading-none mb-1">+</span>
                <span className="text-[11px] font-black uppercase tracking-widest">Yeni Adres Ekle</span>
              </button>
            </div>
          </section>

          {/* BÖLÜM 3: ÖDEME SEÇENEKLERİ (Hep Açık & Sabit) */}
          <section className="bg-white p-7 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-50">
              <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">3</span>
              <h2 className="text-lg font-black uppercase tracking-tighter text-black">
                Ödeme Seçenekleri
              </h2>
            </div>

            <div className="space-y-4">
              <label className={`flex gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === "card" ? "border-black bg-gray-50" : "border-gray-100 hover:border-gray-200"}`}>
                <input type="radio" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} className="accent-black w-4 h-4 mt-1" />
                <div className="flex-1"><p className="font-bold text-sm uppercase">Kart ile Öde</p><p className="text-[11px] text-gray-500 font-medium mt-1">Kredi/Banka kartı ile güvenli ödeme.</p></div>
              </label>

              <label className={`flex gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === "transfer" ? "border-black bg-gray-50" : "border-gray-100 hover:border-gray-200"}`}>
                <input type="radio" checked={paymentMethod === "transfer"} onChange={() => setPaymentMethod("transfer")} className="accent-black w-4 h-4 mt-1" />
                <div className="flex-1"><p className="font-bold text-sm uppercase">Havale / EFT</p><p className="text-[11px] text-gray-500 font-medium mt-1">IBAN ile ödeme (manuel onay gerektirir).</p></div>
              </label>
            </div>

            {paymentMethod === "card" && (
              <div className="mt-8 max-w-sm">
                <div className="bg-gray-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-8">Prestige Secure Payment</p>
                  <div className="space-y-6 opacity-60 pointer-events-none">
                    <div><label className="text-[8px] font-black uppercase text-gray-500 block mb-1">Kart Numarası</label><input disabled placeholder="**** **** **** ****" className="bg-transparent border-b border-white/20 w-full pb-1 text-sm outline-none font-mono" /></div>
                    <div className="flex gap-8">
                      <div className="flex-1"><label className="text-[8px] font-black uppercase text-gray-500 block mb-1">Son Kullanma</label><input disabled placeholder="AA/YY" className="bg-transparent border-b border-white/20 w-full pb-1 text-sm outline-none font-mono" /></div>
                      <div className="w-20"><label className="text-[8px] font-black uppercase text-gray-500 block mb-1">CVV</label><input disabled placeholder="***" className="bg-transparent border-b border-white/20 w-full pb-1 text-sm outline-none font-mono" /></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* SAĞ: STICKY SİPARİŞ ÖZETİ (Hiçbir yere gitmez, hep yanda) */}
        <div className="w-full lg:w-[400px]">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm sticky top-24">
            <h3 className="text-lg font-black uppercase tracking-tighter mb-6 pb-2 border-b border-gray-50">Sipariş Özeti</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-xs font-bold text-gray-400"><span>Ara Toplam</span><span>{cartTotal.toLocaleString("tr-TR")} ₺</span></div>
              <div className="flex justify-between text-xs font-bold text-green-600"><span>Kargo</span><span>ÜCRETSİZ</span></div>
              <div className="flex justify-between items-end pt-4 border-t border-gray-50"> <span className="text-sm font-black uppercase tracking-widest text-gray-400">Toplam</span> <span className="text-3xl font-black">{cartTotal.toLocaleString("tr-TR")} ₺</span> </div>
            </div>
            {/* Agreements */}
            <div className="mt-6 bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100">
              <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1 accent-black w-4 h-4 flex-shrink-0" />
              <span className="text-[10px] text-gray-500 font-medium leading-tight">
                <b>Ön Bilgilendirme Koşulları</b>'nı ve{" "}
                <button type="button" onClick={(e) => { e.preventDefault(); setIsContractModalOpen(true); }} className="text-black font-bold border-b border-black">
                  Mesafeli Satış Sözleşmesi
                </button>
                'ni okudum, onaylıyorum.
              </span>
            </label>
            </div>
            {/* TEK VE NİHAİ BUTON BURADA! */}
            <button onClick={handleCompleteOrder} disabled={isProcessing} className="w-full bg-black text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm" >
              {isProcessing ? "İşleniyor..." : "Siparişi Onayla"}
            </button>
          </div>
        </div>

      </div>

      {/* YENİ NESİL ADRES EKLEME POPUP (MODAL) - Aynen Korundu */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] flex flex-col relative z-10">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
              <h2 className="text-xl font-black uppercase tracking-tight">Yeni Adres Ekle</h2>
              <button onClick={() => setIsAddressModalOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full font-bold hover:bg-gray-200">✕</button>
            </div>
            
            <form onSubmit={handleSaveAddressModal} className="space-y-4 overflow-y-auto pr-2 pb-4 hide-scrollbar">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Adres Başlığı *</label>
                <input required name="addressTitle" value={addressData.addressTitle} onChange={handleInputChange} type="text" placeholder="Örn: Evim, İş Yerim" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Ad *</label>
                  <input required name="firstName" value={addressData.firstName} onChange={handleInputChange} type="text" placeholder="Adınız" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Soyad *</label>
                  <input required name="lastName" value={addressData.lastName} onChange={handleInputChange} type="text" placeholder="Soyadınız" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Telefon *</label>
                  <input required name="phone" value={addressData.phone} onChange={handleInputChange} type="tel" placeholder="0 (5__) ___ __ __" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all" />
                </div>
                
                {/* 1. İL SEÇİCİ */}
                <div className="relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">İl *</label>
                  <div onClick={() => { setShowCitySelect(!showCitySelect); setShowDistrictSelect(false); setShowNeighborhoodSelect(false); }} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium cursor-pointer flex justify-between items-center hover:border-black transition-all">
                    <span className={addressData.city ? "text-black" : "text-gray-400"}>{addressData.city || "İl Seçiniz"}</span>
                    <span className="text-[10px]">▼</span>
                  </div>
                  {showCitySelect && (
                    <>
                      <div className="fixed inset-0 z-[40]" onClick={() => setShowCitySelect(false)}></div>
                      <div className="absolute z-[50] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-2">
                        <input type="text" placeholder="İl Ara..." value={citySearch} onChange={(e) => setCitySearch(e.target.value)} className="p-3 border-b border-gray-100 outline-none text-sm font-bold bg-gray-50 text-black" autoFocus />
                        <div className="max-h-48 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                          {cities.filter(c => c.name.toLocaleLowerCase('tr-TR').includes(citySearch.toLocaleLowerCase('tr-TR'))).map(c => (
                            <div key={c.id} onClick={() => handleCitySelect(c.name)} className="p-3 text-sm font-medium hover:bg-gray-100 cursor-pointer border-b border-gray-50 last:border-0 transition-colors">{c.name}</div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* 2. İLÇE SEÇİCİ */}
                <div className="relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">İlçe *</label>
                  <div onClick={() => { if(addressData.city) { setShowDistrictSelect(!showDistrictSelect); setShowCitySelect(false); setShowNeighborhoodSelect(false); } }} className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium flex justify-between items-center transition-all ${!addressData.city ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-black"}`}>
                    <span className={addressData.district ? "text-black" : "text-gray-400"}>{addressData.district || "İlçe Seçiniz"}</span>
                    <span className="text-[10px]">▼</span>
                  </div>
                  {showDistrictSelect && (
                    <>
                      <div className="fixed inset-0 z-[40]" onClick={() => setShowDistrictSelect(false)}></div>
                      <div className="absolute z-[50] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-2">
                        <input type="text" placeholder="İlçe Ara..." value={districtSearch} onChange={(e) => setDistrictSearch(e.target.value)} className="p-3 border-b border-gray-100 outline-none text-sm font-bold bg-gray-50 text-black" autoFocus />
                        <div className="max-h-48 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                          {districts.filter(d => d.name.toLocaleLowerCase('tr-TR').includes(districtSearch.toLocaleLowerCase('tr-TR'))).map(d => (
                            <div key={d.id} onClick={() => handleDistrictSelect(d)} className="p-3 text-sm font-medium hover:bg-gray-100 cursor-pointer border-b border-gray-50 last:border-0 transition-colors">{d.name}</div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* 3. MAHALLE SEÇİCİ */}
                <div className="relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Mahalle *</label>
                  <div onClick={() => { if(addressData.district) { setShowNeighborhoodSelect(!showNeighborhoodSelect); setShowCitySelect(false); setShowDistrictSelect(false); } }} className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium flex justify-between items-center transition-all ${!addressData.district ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-black"}`}>
                    <span className={addressData.neighborhood ? "text-black line-clamp-1" : "text-gray-400"}>{addressData.neighborhood || "Mahalle Seçiniz"}</span>
                    <span className="text-[10px] ml-2">▼</span>
                  </div>
                  {showNeighborhoodSelect && (
                    <>
                      <div className="fixed inset-0 z-[40]" onClick={() => setShowNeighborhoodSelect(false)}></div>
                      <div className="absolute z-[50] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-2">
                        <input type="text" placeholder="Mahalle Ara..." value={neighborhoodSearch} onChange={(e) => setNeighborhoodSearch(e.target.value)} className="p-3 border-b border-gray-100 outline-none text-sm font-bold bg-gray-50 text-black" autoFocus />
                        <div className="max-h-48 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                          {neighborhoods.length === 0 ? (
                            <div className="p-3 text-xs font-bold text-gray-400 animate-pulse">Yükleniyor...</div>
                          ) : (
                            neighborhoods.filter(n => n.name.toLocaleLowerCase('tr-TR').includes(neighborhoodSearch.toLocaleLowerCase('tr-TR'))).map(n => (
                              <div key={n.id || n.name} onClick={() => handleNeighborhoodSelect(n.name)} className="p-3 text-sm font-medium hover:bg-gray-100 cursor-pointer border-b border-gray-50 last:border-0 transition-colors">{n.name}</div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Açık Adres *</label>
                <textarea required name="fullAddress" value={addressData.fullAddress} onChange={handleInputChange} rows={3} placeholder="Cadde, sokak, bina ve diğer bilgileri giriniz." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium resize-none outline-none focus:border-black transition-all" />
              </div>

              <button type="submit" disabled={isSavingAddress} className="w-full bg-black text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 shadow-md active:scale-95 transition-all mt-4">
                {isSavingAddress ? "Kaydediliyor..." : "Adresi Kaydet 📍"}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* SÖZLEŞME POPUP (MODAL) */}
      {isContractModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] flex flex-col relative z-10">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
              <h2 className="text-lg font-black uppercase tracking-tight">Mesafeli Satış Sözleşmesi</h2>
              <button onClick={() => setIsContractModalOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full font-bold hover:bg-gray-200">✕</button>
            </div>
            <div className="overflow-y-auto pr-2 custom-scrollbar">
              <DistanceSellingContract />
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end shrink-0">
              <button onClick={() => { setAgreeTerms(true); setIsContractModalOpen(false); }} className="bg-black text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md">
                Okudum, Onaylıyorum
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}