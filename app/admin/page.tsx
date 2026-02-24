"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";

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
  created_at?: string;
};

const STORAGE_BUCKET = "products";

function revokeUrls(urls: string[]) {
  urls.forEach((u) => {
    try {
      URL.revokeObjectURL(u);
    } catch {}
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
  // --- ÜRÜNLER (LİSTE - HAFİF) ---
  const [dbProducts, setDbProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- MODALLAR ---
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- YENİ ÜRÜN ---
  const [newProductFiles, setNewProductFiles] = useState<File[]>([]);
  const [newProductPreviews, setNewProductPreviews] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // --- ÜRÜN DÜZENLE (FULL) ---
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // edit: yeni foto ekleme
  const [editAddFiles, setEditAddFiles] = useState<File[]>([]);
  const [editAddPreviews, setEditAddPreviews] = useState<string[]>([]);
  const [editAddUploading, setEditAddUploading] = useState(false);

  // --- SLIDES ---
  const [dbSlides, setDbSlides] = useState<Slide[]>([]);
  const [slideLoading, setSlideLoading] = useState(false);
  const [newSlideFiles, setNewSlideFiles] = useState<File[]>([]);
  const [newSlidePreviews, setNewSlidePreviews] = useState<string[]>([]);
  const [newSlide, setNewSlide] = useState({ title: "", subtitle: "" });

  // --- AYARLAR ---
  const [pageSettings, setPageSettings] = useState({ marquee: "" });

  // --- KAMPANYA / İNDİRİM ---
  const [selectedCampaignProducts, setSelectedCampaignProducts] = useState<number[]>([]);
  const [campaignDates, setCampaignDates] = useState({ start: "", end: "" });
  const [discountPercent, setDiscountPercent] = useState<number>(20);

  // ---------------------------------------
  // FETCH: ÜRÜN LİSTESİ (image çekmiyoruz)
  // ---------------------------------------
  const fetchProductsList = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id,name,price,category,stock,is_bestseller,discount_price,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      alert("HATA VAR KRAL: " + error.message);
      setLoading(false);
      return;
    }
    setDbProducts((data as any) || []);
    setLoading(false);
  };

  // ---------------------------------------
  // FETCH: SLIDES
  // ---------------------------------------
  const fetchSlides = async () => {
    setSlideLoading(true);
    const { data, error } = await supabase
      .from("hero_slides")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) alert("SLIDE HATA: " + error.message);
    setDbSlides((data as any) || []);
    setSlideLoading(false);
  };

  useEffect(() => {
    fetchProductsList();
    fetchSlides();

    const savedMarquee = localStorage.getItem("prestigeso_campaign") || "";
    setPageSettings({ marquee: savedMarquee });

    return () => {
      revokeUrls(newProductPreviews);
      revokeUrls(newSlidePreviews);
      revokeUrls(editAddPreviews);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------
  // SETTINGS SAVE
  // ---------------------------------------
  const handleSaveSettings = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem("prestigeso_campaign", pageSettings.marquee);
    alert("Sayfa ayarları kaydedildi ✅");
    setIsSettingsOpen(false);
  };

  // ---------------------------------------
  // ÜRÜN: EDIT AÇ (FULL)
  // Kapak = images[0]
  // DB'de image kolonu varsa, onu da images[0] ile senkron tutacağız.
  // ---------------------------------------
  const openEditProduct = async (id: number) => {
    setEditLoading(true);
    setEditingProduct(null);

    // edit file state temizle
    revokeUrls(editAddPreviews);
    setEditAddFiles([]);
    setEditAddPreviews([]);

    const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
    setEditLoading(false);

    if (error) {
      alert("Ürün detayı çekilemedi: " + error.message);
      return;
    }

    const row: any = data;
    const arr = Array.isArray(row.images) ? row.images : [];
    // Eğer eski kayıtlarda images boş ama image varsa, images = [image] olarak normalize et
    const normalizedImages = arr.length > 0 ? arr : (row.image ? [row.image] : []);

    setEditingProduct({
      ...row,
      images: normalizedImages, // kapak = images[0]
      // image alanını da senkron tutuyoruz (müşteri tarafı bozulmasın)
      image: normalizedImages[0] || "",
    });
  };

  // ---------------------------------------
  // ÜRÜN: SİL
  // ---------------------------------------
  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm("Bu ürünü KALICI olarak silmek istiyor musun?")) return;

    const old = dbProducts;
    setDbProducts((prev) => prev.filter((p) => p.id !== id));

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      alert("Silinemedi: " + error.message);
      setDbProducts(old);
      return;
    }
    setEditingProduct(null);
  };

  // ---------------------------------------
  // ÜRÜN: KAYDET (UPDATE)
  // En kritik nokta: images[0] kapaktır.
  // Ayrıca DB'de image kolonu varsa image=images[0] senkron.
  // ---------------------------------------
  const handleUpdateProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setSaving(true);

    // images normalize + cover
    const images: string[] = Array.isArray(editingProduct.images) ? editingProduct.images : [];
    const cover = images[0] || "";

    const payload: any = {
      name: editingProduct.name,
      price: Number(editingProduct.price),
      category: editingProduct.category,
      stock: Number(editingProduct.stock ?? 0),
      is_bestseller: !!editingProduct.is_bestseller,
      description: editingProduct.description ?? "",
      images,
      image: cover, // müşteri tarafı uyumluluk için (asıl kapak images[0])
      // discount_price ELLE DEĞİŞTİRİLMEZ -> kampanyadan yönetilecek
    };

    const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);

    setSaving(false);

    if (error) {
      // Burada net hata göreceksin (RLS update policy yoksa burası patlar)
      alert("KAYDET HATASI: " + error.message);
      return;
    }

    // listeyi tazele (hafif)
    setDbProducts((prev) =>
      prev.map((p) =>
        p.id === editingProduct.id
          ? {
              ...p,
              name: payload.name,
              price: payload.price,
              category: payload.category,
              stock: payload.stock,
              is_bestseller: payload.is_bestseller,
              // discount_price listede aynen kalır, kampanya değiştirir
            }
          : p
      )
    );

    alert("Kaydedildi ✅");
    setEditingProduct(null);
  };

  // ---------------------------------------
  // ÜRÜN: KAPAK SEÇ (images[0] yap)
  // Seçilen url'yi dizinin başına taşıyoruz.
  // ---------------------------------------
  const setCoverFromExisting = (url: string) => {
    if (!editingProduct) return;
    const images: string[] = Array.isArray(editingProduct.images) ? editingProduct.images : [];
    const next = [url, ...images.filter((x) => x !== url)];
    setEditingProduct((prev: any) => ({ ...prev, images: next, image: next[0] || "" }));
  };

  // ---------------------------------------
  // ÜRÜN: FOTO SİL (images içinden kaldır)
  // Kapak silinirse yeni kapak images[0] olur.
  // ---------------------------------------
  const removeImageFromGallery = (url: string) => {
    if (!editingProduct) return;
    const images: string[] = Array.isArray(editingProduct.images) ? editingProduct.images : [];
    const next = images.filter((x) => x !== url);
    setEditingProduct((prev: any) => ({ ...prev, images: next, image: next[0] || "" }));
  };

  // ---------------------------------------
  // ÜRÜN: GALERİYE FOTO EKLE (Storage upload)
  // Eklediklerimiz dizi sonuna eklenir, kapak değişmez (kapak = images[0])
  // ---------------------------------------
  const addMoreImagesToProduct = async () => {
    if (!editingProduct) return;
    if (editAddFiles.length === 0) return alert("Eklemek için en az 1 fotoğraf seç!");

    setEditAddUploading(true);
    try {
      const urls: string[] = [];
      for (const f of editAddFiles) {
        const u = await uploadToStorageAndGetPublicUrl(f, "product_extra");
        urls.push(u);
      }

      const images: string[] = Array.isArray(editingProduct.images) ? editingProduct.images : [];
      const next = [...images, ...urls];

      setEditingProduct((prev: any) => ({ ...prev, images: next, image: next[0] || "" }));

      revokeUrls(editAddPreviews);
      setEditAddFiles([]);
      setEditAddPreviews([]);

      alert("Fotoğraflar eklendi ✅ (Kaydet'e basmayı unutma)");
    } catch (e: any) {
      alert("Fotoğraf eklenemedi: " + e.message);
    } finally {
      setEditAddUploading(false);
    }
  };

  // ---------------------------------------
  // ÜRÜN: EKLE (Storage)
  // Kapak = images[0] ve image = images[0] senkron
  // discount_price her zaman 0 başlar (elle yok)
  // ---------------------------------------
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
      for (const f of newProductFiles) {
        const u = await uploadToStorageAndGetPublicUrl(f, "product");
        urls.push(u);
      }

      const cover = urls[0] || "";

      const { data, error } = await supabase
        .from("products")
        .insert([
          {
            name,
            price,
            category,
            stock,
            is_bestseller,
            description,
            images: urls,     // ✅ kapak = images[0]
            image: cover,     // ✅ uyumluluk için senkron
            discount_price: 0 // ✅ elle girilmez
          },
        ])
        .select("id,name,price,category,stock,is_bestseller,discount_price,created_at")
        .single();

      if (error) throw error;

      setDbProducts((prev) => [data as any, ...prev]);

      revokeUrls(newProductPreviews);
      setNewProductPreviews([]);
      setNewProductFiles([]);
      setIsAddProductOpen(false);

      alert("Ürün eklendi ✅");
    } catch (e: any) {
      alert("Ürün eklenemedi: " + e.message);
    } finally {
      setCreating(false);
    }
  };

  // ---------------------------------------
  // SLIDE: EKLE (ÇOKLU)
  // ---------------------------------------
  const handleAddSlide = async () => {
    if (newSlideFiles.length === 0) return alert("Lütfen en az bir görsel seçin!");

    try {
      const urls = await Promise.all(newSlideFiles.map((f) => uploadToStorageAndGetPublicUrl(f, "hero")));
      const inserts = urls.map((url) => ({
        image_url: url,
        title: newSlide.title.trim(),
        subtitle: newSlide.subtitle.trim(),
      }));

      const { error } = await supabase.from("hero_slides").insert(inserts);
      if (error) throw error;

      alert("Slide'lar eklendi ✅");

      revokeUrls(newSlidePreviews);
      setNewSlidePreviews([]);
      setNewSlideFiles([]);
      setNewSlide({ title: "", subtitle: "" });
      fetchSlides();
    } catch (e: any) {
      alert("Slide eklenemedi: " + e.message);
    }
  };

  const handleDeleteSlide = async (id: number) => {
    if (!window.confirm("Bu slide'ı silmek istediğine emin misin?")) return;
    const { error } = await supabase.from("hero_slides").delete().eq("id", id);
    if (error) return alert("Slide silinemedi: " + error.message);
    fetchSlides();
  };

  const handleUpdateSlide = async (slide: Slide) => {
    const { error } = await supabase
      .from("hero_slides")
      .update({ image_url: slide.image_url, title: slide.title, subtitle: slide.subtitle })
      .eq("id", slide.id);

    if (error) return alert("Slide güncellenemedi: " + error.message);
    alert("Slide kaydedildi ✅");
    fetchSlides();
  };

  // ---------------------------------------
  // KAMPANYA/İNDİRİM (OTOMATİK)
  // ---------------------------------------
  const toggleCampaignProduct = (id: number) => {
    setSelectedCampaignProducts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const applyDiscountCampaign = async () => {
    if (selectedCampaignProducts.length === 0) return alert("İndirim için ürün seç!");
    if (discountPercent <= 0 || discountPercent >= 90) return alert("İndirim yüzdesi 1-89 arası olsun.");

    try {
      const { data, error } = await supabase
        .from("products")
        .select("id,price")
        .in("id", selectedCampaignProducts);

      if (error) throw error;

      for (const p of (data as any[]) || []) {
        const newDiscount = Number(p.price) * (1 - discountPercent / 100);
        const { error: upErr } = await supabase.from("products").update({ discount_price: newDiscount }).eq("id", p.id);
        if (upErr) throw upErr;
      }

      alert("İndirim uygulandı ✅");
      setSelectedCampaignProducts([]);
      fetchProductsList();
      setIsCampaignOpen(false);
    } catch (e: any) {
      alert("İndirim uygulanamadı: " + e.message);
    }
  };

  const removeDiscountCampaign = async () => {
    if (selectedCampaignProducts.length === 0) return alert("İndirimi kaldırmak için ürün seç!");
    const { error } = await supabase.from("products").update({ discount_price: 0 }).in("id", selectedCampaignProducts);
    if (error) return alert("İndirim kaldırılamadı: " + error.message);

    alert("İndirim kaldırıldı ✅");
    setSelectedCampaignProducts([]);
    fetchProductsList();
    setIsCampaignOpen(false);
  };

  // ---------------------------------------
  // Filtre
  // ---------------------------------------
  const filteredProducts = useMemo(() => {
    return dbProducts.filter((p) => (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()));
  }, [dbProducts, searchTerm]);

  // ---------------------------------------
  // UI
  // ---------------------------------------
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-black pb-32">
      {/* HEADER */}
      <div className="bg-white px-6 py-5 shadow-sm flex items-center justify-center relative mb-6">
        <h1 className="text-xl font-black text-gray-900 tracking-widest uppercase">PRESTİGESO YÖNETİM PANELİ</h1>
        <div className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm absolute right-6 shadow-md">
          A
        </div>
      </div>

      <div className="px-6 max-w-6xl mx-auto space-y-6">
        {/* Ürün listesi + arama */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 px-1 gap-3">
            <h2 className="font-bold text-sm uppercase tracking-widest text-gray-500">Ürün Envanteri</h2>
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Envanterde ürün ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black shadow-sm"
              />
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
                {filteredProducts.map((p) => (
                  <div key={p.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{p.name}</h3>
                      <p className="text-xs text-blue-600 font-black">{p.price} ₺</p>
                      <p className="text-[10px] text-gray-400">{p.category || "Kategori yok"}</p>

                      {/* indirim sadece bilgi */}
                      {Number(p.discount_price) > 0 ? (
                        <p className="text-[10px] font-bold text-red-600 mt-1">
                          İndirimli: {Number(p.discount_price).toFixed(0)} ₺
                        </p>
                      ) : (
                        <p className="text-[10px] font-bold text-gray-400 mt-1">İndirim: Yok</p>
                      )}
                    </div>

                    <button
                      onClick={() => openEditProduct(p.id)}
                      className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold active:scale-95 transition-transform"
                    >
                      Düzenle
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3">
            <button
              onClick={fetchProductsList}
              className="text-xs font-bold text-gray-500 hover:text-black border border-gray-200 px-4 py-2 rounded-full"
            >
              ↻ Listeyi Yenile
            </button>
          </div>
        </div>
      </div>

      {/* SOL ALT - ÖZEL PANEL */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="bg-white text-black border border-gray-200 shadow-xl px-5 py-3.5 rounded-full font-bold flex items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all text-sm"
        >
          <span>⚙️</span> Özel Panel
        </button>
      </div>

      {/* SAĞ ALT - FAB */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        <div
          className={`flex flex-col items-end gap-3 transition-all duration-300 origin-bottom ${
            isFabOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-50 translate-y-10 pointer-events-none"
          }`}
        >
          <button
            onClick={() => {
              setIsFabOpen(false);
              setIsAddProductOpen(true);
            }}
            className="bg-white text-black border border-gray-200 shadow-lg px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 hover:bg-gray-50 w-max"
          >
            <span>📦</span> Yeni Ürün Ekle
          </button>

          <button
            onClick={() => {
              setIsFabOpen(false);
              setIsCampaignOpen(true);
            }}
            className="bg-blue-600 text-white shadow-lg px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 hover:bg-blue-700 w-max"
          >
            <span>🏷️</span> Kampanya / İndirim
          </button>
        </div>

        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl font-light transition-all duration-300 z-50 ${
            isFabOpen ? "bg-red-500 text-white rotate-45" : "bg-black text-white rotate-0 hover:scale-105"
          }`}
        >
          +
        </button>
      </div>

      {/* ÜRÜN EKLE MODALI */}
      {isAddProductOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-black">Yeni Ürün Ekle</h2>
              <button
                onClick={() => {
                  revokeUrls(newProductPreviews);
                  setNewProductPreviews([]);
                  setNewProductFiles([]);
                  setIsAddProductOpen(false);
                }}
                className="w-8 h-8 bg-gray-100 rounded-full font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="flex-1 overflow-y-auto space-y-4 pb-4 pr-2">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Ürün Adı</label>
                <input required name="name" type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Fiyat (₺)</label>
                  <input required name="price" type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Stok</label>
                  <input required name="stock" type="number" defaultValue="1" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Kategori</label>
                <select required name="category" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium">
                  <option value="Masa Süsleri">Masa Süsleri</option>
                  <option value="Yüzükler">Yüzükler</option>
                  <option value="Setler">Setler</option>
                  <option value="Bilezikler">Bilezikler</option>
                  <option value="Küpeler">Küpeler</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Ürün Açıklaması</label>
                <textarea required name="description" rows={3} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium resize-none" placeholder="Ürünün detaylarını buraya yazın..." />
              </div>

              <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-xl text-xs text-yellow-700 font-bold">
                İndirimli fiyat burada girilmez. Kampanya/İndirim panelinden uygulanır.
              </div>

              <div className="bg-gray-50 p-3 border border-gray-200 rounded-xl">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Ürün Fotoğrafları</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;

                    revokeUrls(newProductPreviews);
                    setNewProductFiles(files);
                    setNewProductPreviews(files.map((f) => URL.createObjectURL(f)));
                  }}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
                />

                {newProductPreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {newProductPreviews.map((url, i) => (
                      <div key={i} className="w-full h-20 rounded-lg overflow-hidden border border-gray-200 bg-white relative">
                        <span className="absolute top-1 left-1 bg-black text-white text-[10px] px-1.5 py-0.5 rounded-md">{i + 1}</span>
                        <img src={url} className="w-full h-20 object-cover" alt="" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                  <input type="checkbox" name="is_bestseller" className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black" />
                  <div>
                    <span className="font-bold text-sm block text-gray-900">Çok Satan Ürün</span>
                    <span className="text-[10px] text-gray-500 block">Ana vitrinde görünür.</span>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-black text-white py-4 rounded-xl font-bold mt-4 shadow-lg hover:bg-gray-800 transition disabled:opacity-60"
              >
                {creating ? "Ekleniyor..." : "🚀 Ürünü Ekle"}
              </button>
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
              <button
                onClick={() => {
                  revokeUrls(editAddPreviews);
                  setEditAddPreviews([]);
                  setEditAddFiles([]);
                  setEditingProduct(null);
                }}
                className="w-8 h-8 bg-gray-100 rounded-full font-bold"
              >
                ✕
              </button>
            </div>

            {editLoading && <p className="text-center text-gray-400">Ürün detayı yükleniyor...</p>}

            {editingProduct && (
              <>
                {/* Kapak = images[0] */}
                {Array.isArray(editingProduct.images) && editingProduct.images[0] && (
                  <img src={editingProduct.images[0]} className="w-full h-40 object-cover rounded-xl border border-gray-200" alt="" />
                )}

                {/* Galeri */}
                <div className="mt-4">
                  <p className="text-xs font-black text-gray-700 mb-2">📸 Fotoğraflar (Tıkla: Kapak yap)</p>

                  {Array.isArray(editingProduct.images) && editingProduct.images.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {editingProduct.images.map((url: string, idx: number) => (
                        <div key={idx} className="relative border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                          <button
                            type="button"
                            onClick={() => setCoverFromExisting(url)}
                            className="w-full h-20"
                            title="Kapak yap"
                          >
                            <img src={url} className="w-full h-20 object-cover" alt="" />
                          </button>

                          {idx === 0 && (
                            <span className="absolute top-1 left-1 bg-black text-white text-[10px] px-2 py-0.5 rounded">
                              Kapak
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => removeImageFromGallery(url)}
                            className="absolute top-1 right-1 bg-white/90 text-red-600 text-xs font-black w-6 h-6 rounded-full"
                            title="Sil"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Galeride fotoğraf yok.</p>
                  )}
                </div>

                {/* Galeriye yeni foto ekle */}
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-3">
                  <p className="text-xs font-black mb-2">➕ Galeriye Fotoğraf Ekle</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;

                      revokeUrls(editAddPreviews);
                      setEditAddFiles(files);
                      setEditAddPreviews(files.map((f) => URL.createObjectURL(f)));
                    }}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
                  />

                  {editAddPreviews.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto mt-3 pb-2">
                      {editAddPreviews.map((u, i) => (
                        <img key={i} src={u} className="w-16 h-16 object-cover rounded-lg border border-gray-200" alt="" />
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={editAddUploading}
                    onClick={addMoreImagesToProduct}
                    className="w-full mt-2 bg-blue-600 text-white py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition disabled:opacity-60"
                  >
                    {editAddUploading ? "Yükleniyor..." : "Fotoğrafları Ekle (Kaydet gerektirir)"}
                  </button>
                </div>

                {/* İndirim sadece bilgi */}
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">İndirim Durumu</p>
                  {Number(editingProduct.discount_price) > 0 ? (
                    <p className="text-sm font-black text-red-600">
                      İndirimli Fiyat: {Number(editingProduct.discount_price).toFixed(0)} ₺
                    </p>
                  ) : (
                    <p className="text-sm font-black text-gray-500">İndirim Yok</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">İndirim burada düzenlenmez, kampanyadan yönetilir.</p>
                </div>

                {/* Form */}
                <form onSubmit={handleUpdateProduct} className="space-y-4 mt-5">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Başlık</label>
                    <input
                      required
                      type="text"
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Fiyat (₺)</label>
                    <input
                      required
                      type="number"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Kategori</label>
                    <select
                      value={editingProduct.category || "Masa Süsleri"}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium"
                    >
                      <option value="Masa Süsleri">Masa Süsleri</option>
                      <option value="Yüzükler">Yüzükler</option>
                      <option value="Setler">Setler</option>
                      <option value="Bilezikler">Bilezikler</option>
                      <option value="Küpeler">Küpeler</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Stok</label>
                    <input
                      type="number"
                      value={editingProduct.stock ?? 0}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Açıklama</label>
                    <textarea
                      rows={3}
                      value={editingProduct.description ?? ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                      <input
                        type="checkbox"
                        checked={!!editingProduct.is_bestseller}
                        onChange={(e) => setEditingProduct({ ...editingProduct, is_bestseller: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                      />
                      <div>
                        <span className="font-bold text-sm block text-gray-900">Çok Satan Ürün</span>
                        <span className="text-[10px] text-gray-500 block">Ana vitrinde görünür.</span>
                      </div>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-black text-white py-4 rounded-xl font-bold mt-2 disabled:opacity-60"
                  >
                    {saving ? "Kaydediliyor..." : "KAYDET"}
                  </button>
                </form>

                <div className="pt-4 border-t border-gray-100 mt-4">
                  <button
                    onClick={() => handleDeleteProduct(editingProduct.id)}
                    className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold text-sm border border-red-100"
                  >
                    🗑️ Ürünü Kaldır
                  </button>
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
              <h2 className="text-xl font-black">🏷️ Kampanya / İndirim</h2>
              <button onClick={() => setIsCampaignOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full font-bold">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-5 flex-1 pr-2">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">İndirim Yüzdesi (%)</label>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl font-medium"
                  min={1}
                  max={89}
                />
                <p className="text-[10px] text-gray-400 mt-2">
                  Seçili ürünlerin discount_price alanı otomatik hesaplanır.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Ürün Seçimi</label>
                <div className="grid grid-cols-2 gap-2">
                  {dbProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleCampaignProduct(p.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        selectedCampaignProducts.includes(p.id)
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <p className="font-bold text-sm">{p.name}</p>
                      <p className="text-[11px] text-gray-500">{p.price} ₺</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Başlangıç</label>
                  <input
                    type="date"
                    value={campaignDates.start}
                    onChange={(e) => setCampaignDates({ ...campaignDates, start: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Bitiş</label>
                  <input
                    type="date"
                    value={campaignDates.end}
                    onChange={(e) => setCampaignDates({ ...campaignDates, end: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={applyDiscountCampaign}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black hover:bg-green-700 active:scale-95"
                >
                  İndirim Uygula
                </button>
                <button
                  type="button"
                  onClick={removeDiscountCampaign}
                  className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-black border border-red-100 hover:bg-red-100 active:scale-95"
                >
                  İndirimi Kaldır
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ÖZEL PANEL (marquee + slides) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-black">⚙️ Özel Sayfa Paneli</h2>
              <button
                onClick={() => {
                  revokeUrls(newSlidePreviews);
                  setNewSlidePreviews([]);
                  setNewSlideFiles([]);
                  setIsSettingsOpen(false);
                }}
                className="w-8 h-8 bg-gray-100 rounded-full font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Kayan Yazı (Kampanya Bandı)</label>
                <input
                  type="text"
                  value={pageSettings.marquee}
                  onChange={(e) => setPageSettings({ marquee: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                />
              </div>

              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-sm font-black mb-3">🖼️ Büyük Slider (Hero) Yönetimi</h3>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-5">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Yeni Slide(lar) Ekle</p>

                  <div className="space-y-3">
                    <div className="bg-white border border-gray-200 rounded-xl p-2">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length === 0) return;

                          revokeUrls(newSlidePreviews);
                          setNewSlideFiles(files);
                          setNewSlidePreviews(files.map((f) => URL.createObjectURL(f)));
                        }}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
                      />

                      {newSlidePreviews.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto mt-3 pb-2 snap-x">
                          {newSlidePreviews.map((url, i) => (
                            <img key={i} src={url} className="w-16 h-16 object-cover rounded-lg border border-gray-200 snap-center shrink-0" alt={`Önizleme ${i}`} />
                          ))}
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Ortak Başlık (title)"
                      value={newSlide.title}
                      onChange={(e) => setNewSlide((p) => ({ ...p, title: e.target.value }))}
                      className="w-full p-3 bg-white border border-gray-200 rounded-xl font-medium text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Ortak Alt Yazı (subtitle)"
                      value={newSlide.subtitle}
                      onChange={(e) => setNewSlide((p) => ({ ...p, subtitle: e.target.value }))}
                      className="w-full p-3 bg-white border border-gray-200 rounded-xl font-medium text-sm"
                    />

                    <button
                      type="button"
                      onClick={handleAddSlide}
                      className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition"
                    >
                      + Slide(ları) Ekle
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Mevcut Slider Resimleri</p>

                  {slideLoading ? (
                    <p className="text-sm text-gray-400">Slide’lar yükleniyor...</p>
                  ) : dbSlides.length === 0 ? (
                    <p className="text-sm text-gray-400">Henüz slide yok.</p>
                  ) : (
                    dbSlides.map((s) => (
                      <div key={s.id} className="bg-white border border-gray-200 rounded-2xl p-3 flex gap-3">
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
                          <img src={s.image_url} alt="slide" className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={s.title || ""}
                            onChange={(e) =>
                              setDbSlides((prev) => prev.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))
                            }
                            placeholder="Başlık"
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium"
                          />
                          <input
                            type="text"
                            value={s.subtitle || ""}
                            onChange={(e) =>
                              setDbSlides((prev) => prev.map((x) => (x.id === s.id ? { ...x, subtitle: e.target.value } : x)))
                            }
                            placeholder="Alt Yazı"
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium"
                          />
                          <input
                            type="text"
                            value={s.image_url || ""}
                            onChange={(e) =>
                              setDbSlides((prev) => prev.map((x) => (x.id === s.id ? { ...x, image_url: e.target.value } : x)))
                            }
                            placeholder="Görsel URL"
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium"
                          />

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateSlide(s)}
                              className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-bold text-xs hover:bg-blue-700 transition"
                            >
                              Kaydet
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSlide(s.id)}
                              className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl font-bold text-xs border border-red-100 hover:bg-red-100 transition"
                            >
                              Sil
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest mt-2 shadow-xl">
                Tüm Ayarları Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
