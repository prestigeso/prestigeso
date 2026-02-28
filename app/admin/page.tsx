"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Slide = {
  id: number;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  created_at?: string;
};

type ProductRow = {
  id: number;
  name: string;
  price: number;
  category: string | null;
  stock: number;
  is_bestseller: boolean;
  discount_price: number;
  campaign_start_date: string | null;
  campaign_end_date: string | null;
  created_at?: string;
};
type MessageRow = {
  id: number;
  user_email: string;
  message: string;
  answer: string | null;
  created_at: string;
};
type QuestionRow = {
  id: number;
  product_id: string;
  question: string;
  answer: string | null;
  created_at: string;
  is_approved?: boolean; // YENİ EKLENEN SATIR
  products?: { name: string; image: string; images?: string[] };
};
type OrderRow = {
  id: number;
  user_email: string;
  items: any[];
  total_amount: number;
  shipping_address: string;
  status: string;
  created_at: string;
};
type ReviewRow = {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  images: string[] | null;
  is_approved: boolean;
  created_at: string;
  products?: { name: string; image: string; images?: string[] };
};
const STORAGE_BUCKET = "products";

function revokeUrls(urls: string[]) {
  urls.forEach((u) => {
    try { URL.revokeObjectURL(u); } catch {}
  });
}

async function uploadToStorageAndGetPublicUrl(file: File, prefix: string) {
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, file);
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

export default function AdminPanel() {
  const activeMonth = new Date().toLocaleString("tr-TR", { month: "long" }).toUpperCase();

  const [loading, setLoading] = useState(true);
  const [dbProducts, setDbProducts] = useState<ProductRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockTab, setStockTab] = useState<"all" | "in" | "out">("all");

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalVisits, setTotalVisits] = useState(0);

  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeNavMenu, setActiveNavMenu] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newProductFiles, setNewProductFiles] = useState<File[]>([]);
  const [newProductPreviews, setNewProductPreviews] = useState<string[]>([]);
  const [dbMessages, setDbMessages] = useState<MessageRow[]>([]);
const [isMessagesOpen, setIsMessagesOpen] = useState(false);
const [replyingTo, setReplyingTo] = useState<number | null>(null);
const [replyText, setReplyText] = useState("");
const [dbQuestions, setDbQuestions] = useState<QuestionRow[]>([]);
const [isQuestionsOpen, setIsQuestionsOpen] = useState(false);
const [replyingToQ, setReplyingToQ] = useState<number | null>(null);
const [qReplyText, setQReplyText] = useState("");
const [dbOrders, setDbOrders] = useState<OrderRow[]>([]);
const [isOrdersOpen, setIsOrdersOpen] = useState(false);
// YORUM YÖNETİMİ STATELERİ
  const [dbReviews, setDbReviews] = useState<ReviewRow[]>([]);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const pendingReviewsCount = dbReviews.filter(r => !r.is_approved).length;
// Bekleyen sipariş sayısını bulalım (Menüdeki rozet için)
const pendingOrdersCount = dbOrders.filter(o => o.status === 'Bekliyor').length;
  const moveNewImage = (index: number, direction: "left" | "right") => {
    const files = [...newProductFiles];
    const previews = [...newProductPreviews];
    if (direction === "left" && index > 0) {
      [files[index], files[index - 1]] = [files[index - 1], files[index]];
      [previews[index], previews[index - 1]] = [previews[index - 1], previews[index]];
    }
    if (direction === "right" && index < files.length - 1) {
      [files[index], files[index + 1]] = [files[index + 1], files[index]];
      [previews[index], previews[index + 1]] = [previews[index + 1], previews[index]];
    }
    setNewProductFiles(files);
    setNewProductPreviews(previews);
  };

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editAddFiles, setEditAddFiles] = useState<File[]>([]);
  const [editAddPreviews, setEditAddPreviews] = useState<string[]>([]);
  const [editAddUploading, setEditAddUploading] = useState(false);

  const moveEditImage = (index: number, direction: "left" | "right") => {
    if (!editingProduct) return;
    const images: string[] = Array.isArray(editingProduct.images) ? [...editingProduct.images] : [];
    if (direction === "left" && index > 0) {
      [images[index], images[index - 1]] = [images[index - 1], images[index]];
    }
    if (direction === "right" && index < images.length - 1) {
      [images[index], images[index + 1]] = [images[index + 1], images[index]];
    }
    setEditingProduct((prev: any) => ({ ...prev, images, image: images[0] || "" }));
  };

  const removeImageFromGallery = (url: string) => {
    if (!editingProduct) return;
    const images: string[] = Array.isArray(editingProduct.images) ? editingProduct.images : [];
    const next = images.filter((x) => x !== url);
    setEditingProduct((prev: any) => ({ ...prev, images: next, image: next[0] || "" }));
  };

  const [dbSlides, setDbSlides] = useState<Slide[]>([]);
  const [newSlideFiles, setNewSlideFiles] = useState<File[]>([]);
  const [newSlidePreviews, setNewSlidePreviews] = useState<string[]>([]);
  const [newSlide, setNewSlide] = useState({ title: "", subtitle: "" });
  const [pageSettings, setPageSettings] = useState({ marquee: "" });

  const [selectedCampaignProducts, setSelectedCampaignProducts] = useState<number[]>([]);
  const [campaignDates, setCampaignDates] = useState({ start: "", end: "" });
  const [discountPercent, setDiscountPercent] = useState<number>(20);

  const toggleCampaignProduct = (id: number) => {
    setSelectedCampaignProducts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const { data: pData, error: pErr } = await supabase
        .from("products")
        .select("id,name,price,category,stock,is_bestseller,discount_price,campaign_start_date,campaign_end_date,created_at")
        .order("created_at", { ascending: false });
      if (pErr) alert("Ürünler çekilemedi: " + pErr.message);
      else setDbProducts((pData as any) || []);

      const { data: sData } = await supabase.from("hero_slides").select("*").order("created_at", { ascending: false });
      if (sData) setDbSlides((sData as any) || []);

      // ---------------------------------------------------------
      // YENİ MUHASEBE MOTORU: SADECE BULUNDUĞUMUZ AYIN VERİLERİ
      // ---------------------------------------------------------
      const now = new Date();
      // İçinde bulunduğumuz ayın 1. gününü bul (Örn: 1 Mart 00:00)
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // CİRO VE SİPARİŞ SAYISI (Sadece bu aydan sonrasını getir)
      const { data: oDataDb } = await supabase
        .from("orders")
        .select("total_amount")
        .gte("created_at", firstDayOfMonth); // Sihirli kelime bu: gte (büyük eşittir)

      if (oDataDb) {
        setTotalOrders(oDataDb.length);
        setTotalRevenue(oDataDb.reduce((acc: number, o: any) => acc + Number(o.total_amount || 0), 0));
      } else {
        setTotalOrders(0); setTotalRevenue(0);
      }

      // ZİYARETÇİ SAYISI (Sadece bu aydan sonrasını getir)
      const { data: vData } = await supabase
        .from("page_views")
        .select("id")
        .gte("created_at", firstDayOfMonth); // Sihirli kelime

      if (vData) setTotalVisits(vData.length); else setTotalVisits(0);
      // ---------------------------------------------------------

      // Mesajlar, Yorumlar ve Sorular (Tümü)
      const { data: mData } = await supabase.from("messages").select("*").order("created_at", { ascending: false });
      if (mData) setDbMessages(mData as any[]);

      const { data: rData } = await supabase.from("reviews").select("*, products(name, image, images)").order("created_at", { ascending: false });
      if (rData) setDbReviews(rData as any[]);

    } catch (e: any) {
      console.error("loadAllData beklenmedik hata:", e);
    } finally {
      setLoading(false);
    }
    
    // Alt kısımdaki Soru ve Sipariş detay çekimleri aynen kalıyor...
    const { data: qData } = await supabase.from("questions").select("*, products(name, image, images)").order("created_at", { ascending: false });
    if (qData) setDbQuestions(qData as any[]);
    
    // (Siparişler modalı için tüm zamanların siparişleri gelmeye devam etmeli, o yüzden buna dokunmuyoruz)
    const { data: oData } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (oData) setDbOrders(oData as any[]);
  };

  useEffect(() => {
    loadAllData();
    setPageSettings({ marquee: localStorage.getItem("prestigeso_campaign") || "" });
    return () => { revokeUrls(newProductPreviews); revokeUrls(newSlidePreviews); revokeUrls(editAddPreviews); };
  }, []);

  const handleSaveSettings = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem("prestigeso_campaign", pageSettings.marquee);
    alert("Sayfa ayarları kaydedildi ✅");
    setIsSettingsOpen(false);
  };

  const openEditProduct = async (id: number) => {
    setEditLoading(true); setEditingProduct(null);
    revokeUrls(editAddPreviews); setEditAddFiles([]); setEditAddPreviews([]);

    const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
    setEditLoading(false);
    if (error) return alert("Ürün detayı çekilemedi: " + error.message);

    const row: any = data;
    const arr = Array.isArray(row.images) ? row.images : [];
    const normalizedImages = arr.length > 0 ? arr : (row.image ? [row.image] : []);
    setEditingProduct({ ...row, images: normalizedImages, image: normalizedImages[0] || "" });
  };

  const handleUpdateProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSaving(true);
    const images: string[] = Array.isArray(editingProduct.images) ? editingProduct.images : [];
    const payload: any = {
      name: editingProduct.name, price: Number(editingProduct.price), category: editingProduct.category,
      stock: Number(editingProduct.stock ?? 0), is_bestseller: !!editingProduct.is_bestseller,
      description: editingProduct.description ?? "", images, image: images[0] || "",
    };
    const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
    setSaving(false);
    if (error) return alert("KAYDET HATASI: " + error.message);
    alert("Kaydedildi ✅");
    setEditingProduct(null);
    loadAllData();
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm("Bu ürünü KALICI olarak silmek istiyor musun?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return alert("Silinemedi: " + error.message);
    setEditingProduct(null); loadAllData();
  };
  const handleSendReply = async (id: number) => {
  if (!replyText.trim()) return alert("Lütfen bir cevap yazın!");
  
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from("messages")
    .update({ answer: replyText, answered_at: now })
    .eq("id", id);

  if (error) return alert("Cevap gönderilemedi: " + error.message);
  
  alert("Cevap müşteriye asilce iletildi! ✅");
  
  // İŞTE SİHİRLİ DOKUNUŞ: Ekranı anında (sayfa yenilemeden) güncelliyoruz!
  setDbMessages((prev) => 
    prev.map((msg) => 
      msg.id === id ? { ...msg, answer: replyText, answered_at: now } : msg
    )
  );

  setReplyingTo(null);
  setReplyText("");
};

// Okunmamış mesaj sayısını bulalım (Üstteki kırmızı bildirim noktası için)
const unreadMessagesCount = dbMessages.filter(m => !m.answer).length;
const unansweredQuestionsCount = dbQuestions.filter(q => !q.answer).length;
  const addMoreImagesToProduct = async () => {
    if (!editingProduct) return;
    if (editAddFiles.length === 0) return alert("Eklemek için en az 1 fotoğraf seç!");
    setEditAddUploading(true);
    try {
      const urls: string[] = [];
      for (const f of editAddFiles) { const u = await uploadToStorageAndGetPublicUrl(f, "product_extra"); urls.push(u); }
      const images: string[] = Array.isArray(editingProduct.images) ? editingProduct.images : [];
      const next = [...images, ...urls];
      setEditingProduct((prev: any) => ({ ...prev, images: next, image: next[0] || "" }));
      revokeUrls(editAddPreviews); setEditAddFiles([]); setEditAddPreviews([]);
      alert("Fotoğraflar eklendi ✅ (Sonra Kaydet'e bas)");
    } catch (e: any) { alert("Fotoğraf eklenemedi: " + e.message); } finally { setEditAddUploading(false); }
  };

  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const price = Number((form.elements.namedItem("price") as HTMLInputElement).value);
    const category = (form.elements.namedItem("category") as HTMLSelectElement).value;
    const stock = Number((form.elements.namedItem("stock") as HTMLInputElement).value);
    const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value;
    const is_bestseller = (form.elements.namedItem("is_bestseller") as HTMLInputElement).checked;

    if (newProductFiles.length === 0) return alert("Lütfen en az bir ürün görseli seçin!");
    setCreating(true);
    try {
      const urls: string[] = [];
      for (const f of newProductFiles) { const u = await uploadToStorageAndGetPublicUrl(f, "product"); urls.push(u); }
      const { error } = await supabase.from("products").insert([{
          name, price, category, stock, is_bestseller, description, images: urls, image: urls[0] || "", discount_price: 0,
      }]);
      if (error) throw error;
      revokeUrls(newProductPreviews); setNewProductPreviews([]); setNewProductFiles([]); setIsAddProductOpen(false);
      alert("Ürün eklendi ✅"); loadAllData();
    } catch (e: any) { alert("Ürün eklenemedi: " + e.message); } finally { setCreating(false); }
  };

  const handleAddSlide = async () => {
    if (newSlideFiles.length === 0) return alert("Lütfen en az bir görsel seçin!");
    try {
      const urls = await Promise.all(newSlideFiles.map((f) => uploadToStorageAndGetPublicUrl(f, "hero")));
      const inserts = urls.map((url) => ({ image_url: url, title: newSlide.title.trim(), subtitle: newSlide.subtitle.trim() }));
      const { error } = await supabase.from("hero_slides").insert(inserts);
      if (error) throw error;
      alert("Slide'lar eklendi ✅");
      revokeUrls(newSlidePreviews); setNewSlidePreviews([]); setNewSlideFiles([]); setNewSlide({ title: "", subtitle: "" });
      loadAllData();
    } catch (e: any) { alert("Slide eklenemedi: " + e.message); }
  };

  const handleDeleteSlide = async (id: number) => {
    if (!window.confirm("Bu slide'ı silmek istediğine emin misin?")) return;
    await supabase.from("hero_slides").delete().eq("id", id); loadAllData();
  };

  const handleUpdateSlide = async (slide: Slide) => {
    const { error } = await supabase.from("hero_slides").update({ image_url: slide.image_url, title: slide.title, subtitle: slide.subtitle }).eq("id", slide.id);
    if (error) return alert("Slide güncellenemedi: " + error.message);
    alert("Slide kaydedildi ✅"); loadAllData();
  };

  const applyDiscountCampaign = async () => {
    if (selectedCampaignProducts.length === 0) return alert("İndirim için ürün seç!");
    if (!campaignDates.start || !campaignDates.end) return alert("Lütfen kampanya başlangıç ve bitiş tarihlerini seçin!");
    if (discountPercent <= 0 || discountPercent >= 90) return alert("İndirim yüzdesi 1-89 arası olsun.");

    const startIso = new Date(campaignDates.start).toISOString();
    const endIso = new Date(campaignDates.end + "T23:59:59").toISOString();

    try {
      const { data, error } = await supabase.from("products").select("id,price").in("id", selectedCampaignProducts);
      if (error) throw error;

      for (const p of (data as any[]) || []) {
        const newDiscount = Number(p.price) * (1 - discountPercent / 100);
        await supabase.from("products").update({ 
          discount_price: newDiscount,
          campaign_start_date: startIso,
          campaign_end_date: endIso
        }).eq("id", p.id);
      }
      alert("Otomatik Zamanlı Kampanya Başarıyla Kuruldu! 🚀");
      setSelectedCampaignProducts([]); setCampaignDates({ start: "", end: "" }); setIsCampaignOpen(false); loadAllData();
    } catch (e: any) { alert("İndirim uygulanamadı: " + e.message); }
  };

  const removeDiscountCampaign = async () => {
    if (selectedCampaignProducts.length === 0) return alert("İndirimi kaldırmak için ürün seç!");
    const { error } = await supabase.from("products").update({ discount_price: 0, campaign_start_date: null, campaign_end_date: null }).in("id", selectedCampaignProducts);
    if (error) return alert("İndirim kaldırılamadı: " + error.message);
    alert("Kampanya İptal Edildi ✅");
    setSelectedCampaignProducts([]); setIsCampaignOpen(false); loadAllData();
  };

  const outOfStockCount = dbProducts.filter((p) => Number(p.stock) <= 0).length;

  const filteredProducts = useMemo(() => {
    let result = dbProducts;
    if (stockTab === "in") result = result.filter((p) => Number(p.stock) > 0);
    if (stockTab === "out") result = result.filter((p) => Number(p.stock) <= 0);
    if (searchTerm) result = result.filter((p) => (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()));
    return result;
  }, [dbProducts, searchTerm, stockTab]);
  // SİPARİŞ DURUMU GÜNCELLEME
const handleUpdateOrderStatus = async (id: number, newStatus: string) => {
  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) return alert("Hata: " + error.message);
  
  alert(`Sipariş durumu "${newStatus}" olarak güncellendi! 📦`);
  
  // Ekranı anında güncelle
  setDbOrders((prev) => 
    prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
  );
};
// YORUM ONAYLAMA MOTORU
  const handleApproveReview = async (id: string) => {
    const { error } = await supabase.from("reviews").update({ is_approved: true }).eq("id", id);
    if (!error) {
      alert("Yorum asilce yayına alındı! ✅");
      setDbReviews((prev) => prev.map(r => r.id === id ? { ...r, is_approved: true } : r));
    } else {
      alert("Hata: " + error.message);
    }
  };

  // YORUM SİLME MOTORU
  const handleDeleteReview = async (id: string) => {
    if (!window.confirm("Bu yorumu tamamen silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (!error) {
      setDbReviews((prev) => prev.filter(r => r.id !== id));
    } else {
      alert("Hata: " + error.message);
    }
  };
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-black pb-32">
      {/* HEADER */}
      <div className="bg-white px-6 py-4 flex items-center justify-between relative z-50 border-b border-gray-100">
        <button onClick={() => setIsMessagesOpen(true)} className="text-2xl hover:scale-110 transition-transform relative" title="Müşteri Mesajları">
  ✉️
  {unreadMessagesCount > 0 && (
    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[8px] font-black text-white">
      {unreadMessagesCount}
    </span>
  )}
</button>
        <h1 className="text-xl font-black text-gray-900 tracking-widest uppercase">PRESTİGESO YÖNETİM PANELİ</h1>
        <div className="flex items-center gap-5">
          <button className="text-2xl hover:scale-110 transition-transform relative" title="Bildirimler">
            🔔<span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
          </button>
          <div className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md cursor-pointer hover:scale-105 transition-transform">A</div>
        </div>
      </div>

      {/* NAV */}
      <nav className="bg-white shadow-sm mb-6 flex justify-center gap-10 relative z-40">
        <div className="relative" onMouseEnter={() => setActiveNavMenu("musteri")} onMouseLeave={() => setActiveNavMenu(null)}>
          <button className="py-4 text-xs font-black text-gray-500 hover:text-black uppercase tracking-widest flex items-center gap-1 transition-colors">Müşteri ▾</button>
          {activeNavMenu === "musteri" && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white border border-gray-100 shadow-xl rounded-xl py-2 w-48 flex flex-col z-50">
              {/* Admin Sol Menüsündeki Ürün Soruları Butonunu Şöyle Güncelle: */}
<button 
  onClick={() => { 
    // Varsa menü state'ini kapatır, yoksa sadece isQuestionsOpen(true) çalışır
    setIsQuestionsOpen(true); 
  }} 
  className="w-full px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest flex justify-between items-center"
>
  <span>Ürün Soruları</span>
  {/* İçeride cevaplanmamış soru varsa yanına asil bir turuncu bildirim atar */}
  {unansweredQuestionsCount > 0 && (
    <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-[9px]">
      {unansweredQuestionsCount}
    </span>
  )}
</button>
<button 
                onClick={() => { setActiveNavMenu(null); setIsReviewsOpen(true); }} 
                className="w-full px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest flex justify-between items-center"
              >
                <span>⭐ Değerlendirmeler</span>
                {pendingReviewsCount > 0 && (
                  <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-[9px]">
                    {pendingReviewsCount} ONAY
                  </span>
                )}
              </button>
              <button onClick={() => { setActiveNavMenu(null); setIsMessagesOpen(true); }} className="w-full px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest flex justify-between">
  Müşteri Mesajları {unreadMessagesCount > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unreadMessagesCount}</span>}
</button>
            </div>
          )}
        </div>
        <button 
  onClick={() => setIsOrdersOpen(true)} 
  className="py-4 text-xs font-black text-gray-500 hover:text-black uppercase tracking-widest flex items-center gap-2 transition-colors relative"
>
  Siparişler
  {pendingOrdersCount > 0 && (
    <span className="bg-green-500 text-white px-1.5 py-0.5 rounded-full text-[9px] animate-pulse shadow-sm">
      {pendingOrdersCount} YENİ
    </span>
  )}
</button>
        <div className="relative" onMouseEnter={() => setActiveNavMenu("performans")} onMouseLeave={() => setActiveNavMenu(null)}>
          <button className="py-4 text-xs font-black text-gray-500 hover:text-black uppercase tracking-widest flex items-center gap-1 transition-colors">Performans ▾</button>
          {activeNavMenu === "performans" && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white border border-gray-100 shadow-xl rounded-xl py-2 w-56 flex flex-col z-50">
              <button className="px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest border-b border-gray-50">Favori İstatistikleri</button>
              <button className="px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest border-b border-gray-50">Görüntülenme İstatistikleri</button>
              <button className="px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest">Değerlendirme İstatistikleri</button>
            </div>
          )}
        </div>
        <div className="relative" onMouseEnter={() => setActiveNavMenu("analiz")} onMouseLeave={() => setActiveNavMenu(null)}>
          <button className="py-4 text-xs font-black text-gray-500 hover:text-black uppercase tracking-widest flex items-center gap-1 transition-colors">Analiz ▾</button>
          {activeNavMenu === "analiz" && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white border border-gray-100 shadow-xl rounded-xl py-2 w-56 flex flex-col z-50">
              <button className="px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest border-b border-gray-50">Tüm Zamanlar Cirosu</button>
              <button className="px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest border-b border-gray-50">Tüm Zamanlar Siparişi</button>
              <button className="px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest">Tüm Zamanlar Ziyareti</button>
            </div>
          )}
        </div>
      </nav>

      <div className="px-6 max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-green-200 hover:shadow-md transition-all">
            <span className="text-3xl mb-2">💸</span>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{activeMonth} CİROSU</p>
            <p className="text-3xl font-black text-green-600">{totalRevenue.toLocaleString("tr-TR")} ₺</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-black hover:shadow-md transition-all">
            <span className="text-3xl mb-2">📦</span>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{activeMonth} SİPARİŞİ</p>
            <p className="text-3xl font-black text-black">{totalOrders}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-blue-200 hover:shadow-md transition-all">
            <span className="text-3xl mb-2">👁️</span>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{activeMonth} ZİYARETİ</p>
            <p className="text-3xl font-black text-blue-600">{totalVisits}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-black hover:shadow-md transition-all">
            <span className="text-3xl mb-2">🛍️</span>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">TOPLAM ÜRÜN</p>
            <p className="text-3xl font-black text-black">{dbProducts.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-1 overflow-x-auto">
          <button onClick={() => setStockTab("all")} className={`text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full transition-all ${stockTab === "all" ? "bg-black text-white shadow-md" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>Tümü</button>
          <button onClick={() => setStockTab("in")} className={`text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full transition-all ${stockTab === "in" ? "bg-green-600 text-white shadow-md" : "bg-white border border-gray-200 text-green-700 hover:bg-green-50"}`}>Stokta Olanlar</button>
          <button onClick={() => setStockTab("out")} className={`text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full transition-all ${stockTab === "out" ? "bg-red-600 text-white shadow-md" : "bg-white border border-gray-200 text-red-600 hover:bg-red-50"}`}>Stoğu Bitenler ({outOfStockCount})</button>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 px-1 gap-3">
            <h2 className="font-bold text-sm uppercase tracking-widest text-gray-500">Ürün Envanteri</h2>
            <div className="relative w-full sm:w-72">
              <input type="text" placeholder="Envanterde ürün ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black shadow-sm" />
              <span className="absolute left-3 top-2.5 text-gray-400 text-lg">🔍</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <p className="p-6 text-center text-gray-400">Yükleniyor...</p>
            ) : filteredProducts.length === 0 ? (
              <p className="p-6 text-center text-gray-400">Aramanıza uygun ürün bulunamadı.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredProducts.map((p) => {
                  const now = new Date().toISOString();
                  let campaignStatus = "none";
                  
                  if (p.discount_price > 0 && p.campaign_start_date && p.campaign_end_date) {
                    if (now < p.campaign_start_date) campaignStatus = "waiting";
                    else if (now >= p.campaign_start_date && now <= p.campaign_end_date) campaignStatus = "active";
                    else if (now > p.campaign_end_date) campaignStatus = "expired";
                  } else if (p.discount_price > 0) {
                    campaignStatus = "active_manual";
                  }

                  return (
                    <div key={p.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div>
                        <h3 className="font-bold text-sm text-gray-900">{p.name}</h3>
                        <p className="text-xs text-blue-600 font-black">{p.price} ₺</p>
                        <p className="text-[10px] text-gray-400">
                          {p.category || "Kategori yok"} 
                          {Number(p.stock) <= 0 && <span className="ml-2 text-red-600 font-bold">(STOK BİTTİ)</span>}
                        </p>
                        {campaignStatus === "active" && <p className="text-[10px] font-bold text-green-600 mt-1">🟢 Aktif İndirim: {Number(p.discount_price).toFixed(0)} ₺</p>}
                        {campaignStatus === "waiting" && <p className="text-[10px] font-bold text-orange-500 mt-1">⏳ Bekleyen Kampanya: {new Date(p.campaign_start_date!).toLocaleDateString('tr-TR')}</p>}
                        {campaignStatus === "expired" && <p className="text-[10px] font-bold text-gray-400 line-through mt-1">Süresi Biten İndirim: {Number(p.discount_price).toFixed(0)} ₺</p>}
                        {campaignStatus === "active_manual" && <p className="text-[10px] font-bold text-green-600 mt-1">🟢 Aktif İndirim (Süresiz): {Number(p.discount_price).toFixed(0)} ₺</p>}
                      </div>
                      <button onClick={() => openEditProduct(p.id)} className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold active:scale-95 transition-transform">Düzenle</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="pt-3">
            <button onClick={loadAllData} className="text-xs font-bold text-gray-500 hover:text-black border border-gray-200 px-4 py-2 rounded-full">↻ Listeyi Yenile</button>
          </div>
        </div>
      </div>

      {/* SOL ALT - ÖZEL PANEL */}
      <div className="fixed bottom-6 left-6 z-40">
        <button onClick={() => setIsSettingsOpen(true)} className="bg-white text-black border border-gray-200 shadow-xl px-5 py-3.5 rounded-full font-bold flex items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all text-sm"><span>⚙️</span> Özel Panel</button>
      </div>

      {/* SAĞ ALT - FAB */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        <div className={`flex flex-col items-end gap-3 transition-all duration-300 origin-bottom ${isFabOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-50 translate-y-10 pointer-events-none"}`}>
          <button onClick={() => { setIsFabOpen(false); setIsAddProductOpen(true); }} className="bg-white text-black border border-gray-200 shadow-lg px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 hover:bg-gray-50 w-max"><span>📦</span> Yeni Ürün Ekle</button>
          <button onClick={() => { setIsFabOpen(false); setIsCampaignOpen(true); }} className="bg-blue-600 text-white shadow-lg px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 hover:bg-blue-700 w-max"><span>🏷️</span> Kampanya / İndirim</button>
        </div>
        <button onClick={() => setIsFabOpen(!isFabOpen)} className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl font-light transition-all duration-300 z-50 ${isFabOpen ? "bg-red-500 text-white rotate-45" : "bg-black text-white rotate-0 hover:scale-105"}`}>+</button>
      </div>

      {/* YENİ ÜRÜN EKLE MODALI (KOLYELER EKLENDİ) */}
      {isAddProductOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-black">Yeni Ürün Ekle</h2>
              <button onClick={() => { revokeUrls(newProductPreviews); setNewProductPreviews([]); setNewProductFiles([]); setIsAddProductOpen(false); }} className="w-8 h-8 bg-gray-100 rounded-full font-bold">✕</button>
            </div>
            <form onSubmit={handleAddProduct} className="flex-1 overflow-y-auto space-y-4 pb-4 pr-2">
              <div><label className="text-xs font-bold text-gray-500 uppercase">Ürün Adı</label><input required name="name" type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-500 uppercase">Fiyat (₺)</label><input required name="price" type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium" /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase">Stok</label><input required name="stock" type="number" defaultValue="1" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium" /></div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Kategori</label>
                <select required name="category" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium text-black outline-none focus:ring-2 focus:ring-black">
                  <option value="Kolyeler">Kolyeler</option>
                  <option value="Yüzükler">Yüzükler</option>
                  <option value="Bilezikler">Bilezikler</option>
                  <option value="Küpeler">Küpeler</option>
                  <option value="Setler">Setler</option>
                  <option value="Masa Süsleri">Masa Süsleri</option>
                </select>
              </div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Açıklama</label><textarea required name="description" rows={3} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium resize-none" /></div>
              <div className="bg-gray-50 p-3 border border-gray-200 rounded-xl">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Fotoğraflar</label>
                <input type="file" accept="image/*" multiple onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length === 0) return; revokeUrls(newProductPreviews); setNewProductFiles(files); setNewProductPreviews(files.map((f) => URL.createObjectURL(f))); }} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-black file:text-white" />
                {newProductPreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {newProductPreviews.map((url, i) => (
                      <div key={i} className="w-full h-20 rounded-lg overflow-hidden border border-gray-200 bg-white relative group">
                        <span className="absolute top-1 left-1 bg-black text-white text-[10px] px-1.5 py-0.5 rounded-md z-10">{i + 1} {i === 0 && "(Kapak)"}</span>
                        <img src={url} className="w-full h-20 object-cover" alt="" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between px-1">
                          <button type="button" onClick={() => moveNewImage(i, "left")} disabled={i === 0} className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs">◀</button>
                          <button type="button" onClick={() => moveNewImage(i, "right")} disabled={i === newProductPreviews.length - 1} className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs">▶</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl"><input type="checkbox" name="is_bestseller" className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black" /><div><span className="font-bold text-sm block text-gray-900">Çok Satan</span></div></label>
              <button type="submit" disabled={creating} className="w-full bg-black text-white py-4 rounded-xl font-bold mt-4 shadow-lg disabled:opacity-60">{creating ? "Ekleniyor..." : "🚀 Ürünü Ekle"}</button>
            </form>
          </div>
        </div>
      )}

      {/* ÜRÜN DÜZENLE MODALI */}
      {(editLoading || editingProduct) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black">Ürün Düzenle</h2>
              <button onClick={() => { revokeUrls(editAddPreviews); setEditAddPreviews([]); setEditAddFiles([]); setEditingProduct(null); }} className="w-8 h-8 bg-gray-100 rounded-full font-bold">✕</button>
            </div>
            {editLoading && <p className="text-center text-gray-400">Yükleniyor...</p>}
            {editingProduct && (
              <>
                <div className="mt-2">
                  <p className="text-xs font-black text-gray-700 mb-2">📸 Fotoğrafları Sırala</p>
                  {Array.isArray(editingProduct.images) && editingProduct.images.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {editingProduct.images.map((url: string, idx: number) => (
                        <div key={idx} className="relative border border-gray-200 rounded-xl overflow-hidden bg-gray-50 group">
                          <img src={url} className="w-full h-20 object-cover" alt="" />
                          {idx === 0 && <span className="absolute top-1 left-1 bg-black text-white text-[10px] px-2 py-0.5 rounded z-10">Kapak</span>}
                          <button type="button" onClick={() => removeImageFromGallery(url)} className="absolute top-1 right-1 bg-white/90 text-red-600 text-xs font-black w-6 h-6 rounded-full z-10 shadow-sm" title="Sil">✕</button>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between px-1">
                            <button type="button" onClick={() => moveEditImage(idx, "left")} disabled={idx === 0} className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs shadow-md disabled:opacity-30">◀</button>
                            <button type="button" onClick={() => moveEditImage(idx, "right")} disabled={idx === editingProduct.images.length - 1} className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs shadow-md disabled:opacity-30">▶</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-400">Fotoğraf yok.</p>}
                </div>
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-3">
                  <p className="text-xs font-black mb-2">➕ Galeriye Fotoğraf Ekle</p>
                  <input type="file" accept="image/*" multiple onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length === 0) return; revokeUrls(editAddPreviews); setEditAddFiles(files); setEditAddPreviews(files.map((f) => URL.createObjectURL(f))); }} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-black file:text-white" />
                  {editAddPreviews.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto mt-3 pb-2">
                      {editAddPreviews.map((u, i) => <img key={i} src={u} className="w-16 h-16 object-cover rounded-lg border border-gray-200" alt="" />)}
                    </div>
                  )}
                  <button type="button" disabled={editAddUploading} onClick={addMoreImagesToProduct} className="w-full mt-2 bg-blue-600 text-white py-2 rounded-xl font-bold text-sm disabled:opacity-60">{editAddUploading ? "Yükleniyor..." : "Ekle (Sonra Kaydet)"}</button>
                </div>
                <form onSubmit={handleUpdateProduct} className="space-y-4 mt-5">
                  <div><label className="text-xs font-bold text-gray-500 uppercase">Başlık</label><input required type="text" value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium" /></div>
                  <div><label className="text-xs font-bold text-gray-500 uppercase">Fiyat (₺)</label><input required type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium" /></div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Kategori</label>
                    <select value={editingProduct.category || "Kolyeler"} onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium text-black focus:ring-2 focus:ring-black outline-none transition-all">
                      <option value="Kolyeler">Kolyeler</option>
                      <option value="Yüzükler">Yüzükler</option>
                      <option value="Bilezikler">Bilezikler</option>
                      <option value="Küpeler">Küpeler</option>
                      <option value="Setler">Setler</option>
                      <option value="Masa Süsleri">Masa Süsleri</option>
                    </select>
                  </div>
                  <div><label className="text-xs font-bold text-gray-500 uppercase">Stok</label><input type="number" value={editingProduct.stock ?? 0} onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium" /></div>
                  <div><label className="text-xs font-bold text-gray-500 uppercase">Açıklama</label><textarea rows={3} value={editingProduct.description ?? ""} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium resize-none" /></div>
                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl"><input type="checkbox" checked={!!editingProduct.is_bestseller} onChange={(e) => setEditingProduct({ ...editingProduct, is_bestseller: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black" /><div><span className="font-bold text-sm block text-gray-900">Çok Satan</span></div></label>
                  <button type="submit" disabled={saving} className="w-full bg-black text-white py-4 rounded-xl font-bold mt-2 disabled:opacity-60">{saving ? "Kaydediliyor..." : "KAYDET"}</button>
                </form>
                <div className="pt-4 border-t border-gray-100 mt-4">
                  <button onClick={() => handleDeleteProduct(editingProduct.id)} className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold text-sm border border-red-100">🗑️ Ürünü Kaldır</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* KAMPANYA / İNDİRİM MODALI */}
      {isCampaignOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
              <h2 className="text-xl font-black">🏷️ Zaman Ayarlı Kampanya</h2>
              <button onClick={() => setIsCampaignOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full font-bold">✕</button>
            </div>
            <div className="overflow-y-auto space-y-5 flex-1 pr-2">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">İndirim Yüzdesi (%)</label>
                <input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} className="w-full p-3 bg-white border border-gray-200 rounded-xl font-medium" min={1} max={89} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Başlangıç Tarihi</label>
                  <input type="date" required value={campaignDates.start} onChange={(e) => setCampaignDates({ ...campaignDates, start: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 text-sm font-medium" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Bitiş Tarihi</label>
                  <input type="date" required value={campaignDates.end} onChange={(e) => setCampaignDates({ ...campaignDates, end: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 text-sm font-medium" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Ürün Seçimi</label>
                <div className="grid grid-cols-2 gap-2">
                  {dbProducts.map((p) => (
                    <button key={p.id} type="button" onClick={() => toggleCampaignProduct(p.id)} className={`p-3 rounded-xl border text-left transition ${selectedCampaignProducts.includes(p.id) ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"}`}>
                      <p className="font-bold text-sm truncate">{p.name}</p>
                      <p className="text-[11px] text-gray-500">{p.price} ₺</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={applyDiscountCampaign} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black shadow-lg">🚀 Otomatik Kur</button>
                <button type="button" onClick={removeDiscountCampaign} className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-black border border-red-100">Kaldır</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ÖZEL PANEL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-black">⚙️ Özel Sayfa Paneli</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Kayan Yazı</label>
                <input type="text" value={pageSettings.marquee} onChange={(e) => setPageSettings({ marquee: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium" />
              </div>
              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-sm font-black mb-3">🖼️ Slider Yönetimi</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-5">
                  <input type="file" accept="image/*" multiple onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length === 0) return; revokeUrls(newSlidePreviews); setNewSlideFiles(files); setNewSlidePreviews(files.map((f) => URL.createObjectURL(f))); }} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-black file:text-white" />
                  {newSlidePreviews.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto mt-3 pb-2"><img src={newSlidePreviews[0]} className="w-16 h-16 object-cover rounded-lg border border-gray-200" alt="" /></div>
                  )}
                  <input type="text" placeholder="Başlık" value={newSlide.title} onChange={(e) => setNewSlide((p) => ({ ...p, title: e.target.value }))} className="w-full p-3 bg-white border border-gray-200 rounded-xl font-medium text-sm mt-3" />
                  <input type="text" placeholder="Alt Yazı" value={newSlide.subtitle} onChange={(e) => setNewSlide((p) => ({ ...p, subtitle: e.target.value }))} className="w-full p-3 bg-white border border-gray-200 rounded-xl font-medium text-sm mt-3" />
                  <button type="button" onClick={handleAddSlide} className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm mt-3">+ Ekle</button>
                </div>
                <div className="space-y-3">
                  {dbSlides.map((s) => (
                    <div key={s.id} className="bg-white border border-gray-200 rounded-2xl p-3 flex gap-3">
                      <img src={s.image_url} alt="slide" className="w-16 h-16 rounded-xl object-cover" />
                      <div className="flex-1 space-y-2">
                        <input type="text" value={s.title || ""} onChange={(e) => setDbSlides((prev) => prev.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))} placeholder="Başlık" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium" />
                        <input type="text" value={s.subtitle || ""} onChange={(e) => setDbSlides((prev) => prev.map((x) => (x.id === s.id ? { ...x, subtitle: e.target.value } : x)))} placeholder="Alt Yazı" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium" />
                        <div className="flex gap-2 mt-2">
                          <button type="button" onClick={() => handleUpdateSlide(s)} className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-xs font-bold">Kaydet</button>
                          <button type="button" onClick={() => handleDeleteSlide(s.id)} className="flex-1 bg-red-50 text-red-600 py-1.5 rounded-lg text-xs font-bold border border-red-100">Sil</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold mt-2 shadow-xl">Kaydet</button>
            </form>
          </div>
        </div>
      )}
      {/* MÜŞTERİ MESAJLARI MODALI */}
{isMessagesOpen && (
  <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
    <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
      <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
          <span>✉️</span> Müşteri Mesajları
        </h2>
        <button onClick={() => { setIsMessagesOpen(false); setReplyingTo(null); }} className="w-8 h-8 bg-gray-100 rounded-full font-bold hover:bg-gray-200">✕</button>
      </div>

      <div className="overflow-y-auto space-y-4 flex-1 pr-2">
        {dbMessages.length === 0 ? (
          <p className="text-center text-gray-400 font-bold py-10 uppercase tracking-widest text-xs">Henüz mesaj yok.</p>
        ) : (
          dbMessages.map((msg) => (
            <div key={msg.id} className={`p-4 rounded-2xl border ${msg.answer ? "bg-gray-50 border-gray-100" : "bg-white border-blue-200 shadow-sm"}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{msg.user_email}</p>
                  <p className="text-[9px] font-bold text-gray-400">{new Date(msg.created_at).toLocaleString("tr-TR")}</p>
                </div>
                {!msg.answer && <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded text-[9px] font-black uppercase">Cevap Bekliyor</span>}
              </div>
              <p className="text-sm font-medium text-black mt-2 bg-gray-100/50 p-3 rounded-xl">{msg.message}</p>

              {msg.answer ? (
                <div className="mt-4 pl-4 border-l-2 border-black bg-white p-3 rounded-r-xl">
                  <p className="text-[9px] font-black uppercase text-green-600 tracking-widest mb-1">Cevabınız:</p>
                  <p className="text-sm text-gray-700 font-medium">{msg.answer}</p>
                </div>
              ) : (
                <div className="mt-4">
                  {replyingTo === msg.id ? (
                    <div className="space-y-2 animate-in fade-in">
                      <textarea 
                        rows={3} 
                        value={replyText} 
                        onChange={(e) => setReplyText(e.target.value)} 
                        placeholder="Müşteriye cevabınızı yazın..."
                        className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-black resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSendReply(msg.id)} className="flex-1 bg-black text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest">Gönder 🚀</button>
                        <button onClick={() => setReplyingTo(null)} className="px-4 bg-gray-100 text-gray-500 rounded-xl text-xs font-black uppercase">İptal</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setReplyingTo(msg.id); setReplyText(""); }} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-colors">
                      Cevapla ↩
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  </div>
)}

{/* ÜRÜN SORULARI MODALI */}
{isQuestionsOpen && (
  <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
    <div className="bg-white w-full max-w-3xl rounded-3xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
      <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
          <span>💬</span> Ürün Soruları
        </h2>
        <button onClick={() => { setIsQuestionsOpen(false); setReplyingToQ(null); }} className="w-8 h-8 bg-gray-100 rounded-full font-bold hover:bg-gray-200">✕</button>
      </div>

      <div className="overflow-y-auto space-y-4 flex-1 pr-2">
        {dbQuestions.length === 0 ? (
          <p className="text-center text-gray-400 font-bold py-10 uppercase tracking-widest text-xs">Henüz soru yok.</p>
        ) : (
          dbQuestions.map((q) => {
            const displayImage = q.products?.images?.[0] || q.products?.image || "/logo.jpeg";
            
            // ÜRÜN SORULARINA CEVAP GÖNDERME MOTORU
const handleSendQReply = async (id: number) => {
  if (!qReplyText.trim()) return alert("Lütfen bir cevap yazın!");
  
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from("questions")
    .update({ answer: qReplyText, answered_at: now })
    .eq("id", id);

  if (error) return alert("Cevap gönderilemedi: " + error.message);
  
  alert("Ürün sorusu asilce cevaplandı! ✅");
  
  // Ekranı sayfayı yenilemeden anında güncelle
  setDbQuestions((prev) => 
    prev.map((q) => 
      q.id === id ? { ...q, answer: qReplyText, answered_at: now } : q
    )
  );

  setReplyingToQ(null);
  setQReplyText("");
};

// SORUYU YAYINLA / GİZLE MOTORU
const handleToggleQuestionApproval = async (id: number, currentStatus: boolean) => {
  const newStatus = !currentStatus;
  
  const { error } = await supabase
    .from("questions")
    .update({ is_approved: newStatus })
    .eq("id", id);

  if (error) return alert("Durum güncellenemedi: " + error.message);
  
  // Ekranı anında güncelle
  setDbQuestions((prev) => 
    prev.map((q) => 
      q.id === id ? { ...q, is_approved: newStatus } : q
    )
  );
};

            return (
              <div key={q.id} className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-4 ${q.answer ? "bg-gray-50 border-gray-100" : "bg-white border-orange-200 shadow-sm"}`}>
                
                {/* Ürün Görseli ve Adı */}
                <div className="w-full md:w-24 flex-shrink-0 flex flex-col items-center gap-2">
                  <div className="w-20 h-20 bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <img src={displayImage} alt="" className="w-full h-full object-cover mix-blend-multiply" />
                  </div>
                  <p className="text-[9px] font-black uppercase text-center truncate w-full text-gray-500">{q.products?.name || "Bilinmeyen"}</p>
                </div>

                {/* Soru ve Cevap Alanı */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
  <p className="text-[9px] font-bold text-gray-400 mt-1">{new Date(q.created_at).toLocaleString("tr-TR")}</p>
  
  <div className="flex items-center gap-2">
    {/* YENİ: YAYINLA / GİZLE BUTONU */}
    {q.answer && (
      <button 
        onClick={() => handleToggleQuestionApproval(q.id, !!q.is_approved)}
        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
          q.is_approved 
            ? "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200" 
            : "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200"
        }`}
      >
        {q.is_approved ? "👁️ Yayında" : "👁️‍🗨️ Gizli"}
      </button>
    )}
    
    {!q.answer && <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase border border-orange-200">Cevap Bekliyor</span>}
  </div>
</div>
                  
                  <p className="text-sm font-bold text-black bg-gray-100/50 p-3 rounded-xl border-l-4 border-black">
                    <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Müşteri Sorusu:</span>
                    {q.question}
                  </p>

                  {q.answer ? (
                    <div className="mt-3 pl-4 border-l-4 border-green-500 bg-green-50/50 p-3 rounded-r-xl">
                      <p className="text-[9px] font-black uppercase text-green-700 tracking-widest mb-1">Satıcı Cevabı:</p>
                      <p className="text-sm text-gray-700 font-medium">{q.answer}</p>
                    </div>
                  ) : (
                    <div className="mt-4">
                      {replyingToQ === q.id ? (
                        <div className="space-y-2 animate-in fade-in">
                          <textarea 
                            rows={3} 
                            value={qReplyText} 
                            onChange={(e) => setQReplyText(e.target.value)} 
                            placeholder="Müşteriye asil cevabınızı yazın..."
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-black resize-none"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleSendQReply(q.id)} className="flex-1 bg-black text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800">Gönder 🚀</button>
                            <button onClick={() => setReplyingToQ(null)} className="px-4 bg-gray-100 text-gray-500 rounded-xl text-xs font-black uppercase hover:bg-gray-200">İptal</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setReplyingToQ(q.id); setQReplyText(""); }} className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-100 transition-colors">
                          Soruya Cevap Ver ↩
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  </div>
)}
{/* SİPARİŞ YÖNETİMİ MODALI */}
{isOrdersOpen && (
  <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
    <div className="bg-white w-full max-w-4xl rounded-3xl p-8 shadow-2xl max-h-[90vh] flex flex-col">
      <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
          <span>📦</span> Sipariş Yönetimi
        </h2>
        <button onClick={() => setIsOrdersOpen(false)} className="w-10 h-10 bg-gray-100 rounded-full font-bold hover:bg-gray-200 transition-colors">✕</button>
      </div>

      <div className="overflow-y-auto space-y-6 flex-1 pr-2">
        {dbOrders.length === 0 ? (
          <p className="text-center text-gray-400 font-bold py-20 uppercase tracking-widest text-sm">Sistemde henüz sipariş yok.</p>
        ) : (
          dbOrders.map((order) => (
            <div key={order.id} className="p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 bg-white">
              
              {/* Sol Kısım: Müşteri ve Adres */}
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Müşteri Email</p>
                    <p className="font-bold text-sm text-black">{order.user_email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tarih</p>
                    <p className="text-xs font-bold text-gray-600">{new Date(order.created_at).toLocaleString("tr-TR")}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200 pb-2">Teslimat Detayları</p>
  
  {(() => {
    try {
      const addr = JSON.parse(order.shipping_address);
      return (
        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase">Alıcı Kişi</p>
            <p className="text-xs font-black text-black">{addr.firstName} {addr.lastName}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase">Telefon</p>
            <p className="text-xs font-black text-blue-600">{addr.phone}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase">İl / İlçe</p>
            <p className="text-xs font-bold text-gray-800">{addr.city} / {addr.district}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase">Adres Başlığı</p>
            <p className="text-xs font-bold text-gray-800 bg-gray-200 px-2 py-0.5 rounded w-max">{addr.addressTitle}</p>
          </div>
          <div className="col-span-2 bg-white p-3 rounded-lg border border-gray-200 mt-1">
            <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Açık Adres ({addr.neighborhood})</p>
            <p className="text-xs font-medium text-gray-700 leading-relaxed">{addr.fullAddress}</p>
          </div>
        </div>
      );
    } catch (e) {
      // Eski sistemden kalan düz metin adresler için çökmemesi adına yedek plan
      return <p className="text-sm font-medium text-black leading-relaxed">{order.shipping_address}</p>;
    }
  })()}
</div>

                {/* Aksiyon Alanı */}
                <div className="flex items-center gap-4 pt-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sipariş Durumu:</p>
                  <select 
                    value={order.status}
                    onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                    className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg border outline-none cursor-pointer transition-colors
                      ${order.status === 'Bekliyor' ? 'bg-orange-50 text-orange-600 border-orange-200' : 
                        order.status === 'Hazırlanıyor' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                        'bg-green-50 text-green-600 border-green-200'}`}
                  >
                    <option value="Bekliyor">⏳ Bekliyor</option>
                    <option value="Hazırlanıyor">📦 Hazırlanıyor</option>
                    <option value="Kargolandı">🚀 Kargolandı</option>
                  </select>
                </div>
              </div>

              {/* Sağ Kısım: Sepet İçeriği ve Tutar */}
              <div className="w-full md:w-1/3 bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200 pb-2">Sipariş Özeti</p>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-40">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <img src={item.images?.[0] || item.image || "/logo.jpeg"} className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-white" alt="" />
                      <div className="flex-1">
                        <p className="text-[9px] font-bold uppercase truncate text-black">{item.name}</p>
                        <p className="text-[9px] font-black text-gray-500">{item.quantity} Adet</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t border-gray-200 pt-3 flex justify-between items-end">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ödenen Tutar</span>
                  <span className="text-lg font-black text-black">{order.total_amount.toLocaleString("tr-TR")} ₺</span>
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  </div>
)}
{/* YORUM YÖNETİMİ MODALI */}
      {isReviewsOpen && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-3xl p-8 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                <span>⭐</span> Yorum & Değerlendirme Yönetimi
              </h2>
              <button onClick={() => setIsReviewsOpen(false)} className="w-10 h-10 bg-gray-100 rounded-full font-bold hover:bg-gray-200 transition-colors">✕</button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 pr-2">
              {dbReviews.length === 0 ? (
                <p className="text-center text-gray-400 font-bold py-20 uppercase tracking-widest text-sm">Dükkanda henüz hiç yorum yok.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dbReviews.map((rev) => {
                    const product = rev.products;
                    const productImage = product?.images?.[0] || product?.image || "/logo.jpeg";

                    return (
                      <div key={rev.id} className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-all flex flex-col ${rev.is_approved ? 'border-gray-100' : 'border-orange-300'}`}>
                        
                        <div className="flex justify-between items-start mb-3">
                          {rev.is_approved ? (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1">✅ Yayında</span>
                          ) : (
                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 animate-pulse">⏳ Onay Bekliyor</span>
                          )}
                          <span className="text-[9px] font-bold text-gray-400">{new Date(rev.created_at).toLocaleDateString("tr-TR")}</span>
                        </div>

                        <div className="flex items-center gap-3 mb-4 bg-gray-50 p-2 rounded-xl">
                          <img src={productImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          <div className="flex-1 truncate">
                            <p className="text-[10px] font-bold text-black truncate">{product?.name || "Bilinmeyen Ürün"}</p>
                          </div>
                        </div>

                        <div className="mb-4 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{rev.user_name}</p>
                            <span className="text-yellow-400 text-xs">{"★".repeat(rev.rating)}{"☆".repeat(5-rev.rating)}</span>
                          </div>
                          <p className="text-sm text-gray-700 font-medium italic">"{rev.comment}"</p>
                        </div>

                        {rev.images && rev.images.length > 0 && (
                          <div className="flex gap-2 mb-4 overflow-x-auto">
                            {rev.images.map((img: string, i: number) => (
                              <a href={img} target="_blank" rel="noreferrer" key={i}><img src={img} className="w-12 h-12 rounded-lg object-cover border" alt="" /></a>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                          {!rev.is_approved && (
                            <button onClick={() => handleApproveReview(rev.id)} className="flex-1 bg-black text-white py-2 rounded-lg font-black text-[10px] uppercase">Yayına Al</button>
                          )}
                          <button onClick={() => handleDeleteReview(rev.id)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-black text-[10px] uppercase border border-red-100">Sil</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}