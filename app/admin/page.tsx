"use client";

import { useEffect, useState, type FormEvent } from "react";
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
  // image intentionally omitted in list fetch
};

async function compressImageToDataUrl(file: File, maxW = 900, quality = 0.75): Promise<string> {
  const img = document.createElement("img");
  const url = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    img.onload = () => {
      try {
        const ratio = img.width / img.height;
        const w = Math.min(maxW, img.width);
        const h = Math.round(w / ratio);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context alınamadı");

        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Görsel okunamadı"));
    };

    img.src = url;
  });
}

export default function AdminPanel() {
  // --- ÜRÜNLER ---
  const [dbProducts, setDbProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Ürün ekleme resmi (sıkıştırılmış base64)
  // YENİ: Çoklu resim ve açıklama stateleri
  const [newProductFiles, setNewProductFiles] = useState<File[]>([]);
  const [newProductImages, setNewProductImages] = useState<string[]>([]); // Önizleme için
  // YENİ EKLEDİĞİMİZ SATIR: Asıl dosyayı tutacak state
  const [newProductFile, setNewProductFile] = useState<File | null>(null);
  // Menü ve Modallar
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Ürün Düzenleme (full product)
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);

  // --- YENİ EKLENEN SLIDER STATELERİ ---
  const [newSlideFiles, setNewSlideFiles] = useState<File[]>([]);
  const [newSlidePreviews, setNewSlidePreviews] = useState<string[]>([]);
  // Kampanya
  const [selectedCampaignProducts, setSelectedCampaignProducts] = useState<number[]>([]);
  const [campaignDates, setCampaignDates] = useState({ start: "", end: "" });

  // Ayarlar (marquee)
  const [pageSettings, setPageSettings] = useState({ marquee: "" });

  // --- HERO SLIDES ---
  const [dbSlides, setDbSlides] = useState<Slide[]>([]);
  const [slideLoading, setSlideLoading] = useState(false);
  const [newSlide, setNewSlide] = useState({ image_url: "", title: "", subtitle: "" });

  // --- HAFİF FETCH (ÜRÜN LİSTESİ) ---
  const fetchProductsList = async () => {
    setLoading(true);

    // ✅ DİKKAT: image alanını çekmiyoruz (base64 ağır)
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

  // --- TEK ÜRÜNÜ FULL ÇEK (image dahil) ---
  const openEditProduct = async (id: number) => {
    setEditLoading(true);
    setEditingProduct(null);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    setEditLoading(false);

    if (error) return alert("Ürün detayı çekilemedi: " + error.message);
    setEditingProduct(data);
  };

  // --- SLIDES ---
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
  }, []);

  // --- SETTINGS SAVE ---
  const handleSaveSettings = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem("prestigeso_campaign", pageSettings.marquee);
    alert("Sayfa ayarları kaydedildi ✅");
    setIsSettingsOpen(false);
  };

  // --- ÜRÜN SİL (OPTIMISTIC) ---
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

  // --- ÜRÜN GÜNCELLE (OPTIMISTIC) ---
  const handleUpdateProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const payload = {
      name: editingProduct.name,
      price: Number(editingProduct.price),
      category: editingProduct.category,
      stock: Number(editingProduct.stock ?? 0),
      is_bestseller: !!editingProduct.is_bestseller,
      discount_price: Number(editingProduct.discount_price ?? 0),
      image: editingProduct.image, // base64 kalabilir (şimdilik)
    };

    // listede image yok, ama diğer alanları update ediyoruz
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
              discount_price: payload.discount_price,
            }
          : p
      )
    );

    const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);

    if (error) {
      alert("Güncelleme hatası: " + error.message);
      // garanti olsun diye tekrar çek
      fetchProductsList();
      return;
    }

    alert("Ürün güncellendi ✅");
    setEditingProduct(null);
  };

  // --- ÜRÜN EKLE ---
  // --- ÜRÜN EKLE (ÇOKLU RESİM VE AÇIKLAMA) ---
  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;

    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const price = Number((form.elements.namedItem("price") as HTMLInputElement).value);
    const category = (form.elements.namedItem("category") as HTMLSelectElement).value;
    const stock = Number((form.elements.namedItem("stock") as HTMLInputElement).value);
    const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value; // YENİ EKLENDİ
    const is_bestseller = (form.elements.namedItem("is_bestseller") as HTMLInputElement).checked;

    if (newProductFiles.length === 0) return alert("Lütfen en az bir ürün görseli seçin!");

    try {
      const uploadedImageUrls: string[] = [];

      // Seçilen tüm dosyaları sırayla Storage'a yüklüyoruz
      for (const file of newProductFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`; 

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('products')
          .getPublicUrl(fileName);
        
        uploadedImageUrls.push(publicUrlData.publicUrl);
      }

      // Veritabanına diziyi (Array) ve açıklamayı kaydediyoruz
      const { data, error } = await supabase
        .from("products")
        .insert([{ 
          name, 
          price, 
          category, 
          stock, 
          is_bestseller, 
          description, // Yeni alan
          images: uploadedImageUrls // Yeni çoklu resim alanı
        }])
        .select("*")
        .single();

      if (error) throw error;

      setDbProducts((prev) => [data as any, ...prev]);
      setIsAddProductOpen(false);
      setNewProductImages([]);
      setNewProductFiles([]);
      alert("Ürün başarıyla eklendi! 🚀");
    } catch (err: any) {
      alert("Ürün eklenemedi: " + err.message);
    }
  };

  // --- SLIDE EKLE/SİL/KAYDET ---
 // --- SLIDE EKLE (ÇOKLU DOSYA YÜKLEME) ---
  const handleAddSlide = async () => {
    if (newSlideFiles.length === 0) return alert("Lütfen en az bir görsel seçin!");

    try {
      // 1. Seçilen tüm dosyaları Storage'a (products klasörüne) paralel yüklüyoruz
      const uploadPromises = newSlideFiles.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `hero_${Math.random()}.${fileExt}`; 

        const { error: uploadError } = await supabase.storage
          .from('products') // Resimleri aynı depoya atıyoruz, ekstra depo açmaya gerek yok
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('products')
          .getPublicUrl(fileName);
        
        return publicUrlData.publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      // 2. Yüklenen her resim için, kullanıcının girdiği ortak başlık ve alt yazıyla DB'ye kayıt açıyoruz
      const inserts = uploadedUrls.map(url => ({
        image_url: url,
        title: newSlide.title.trim(),
        subtitle: newSlide.subtitle.trim()
      }));

      const { error } = await supabase.from("hero_slides").insert(inserts);
      if (error) throw error;

      alert("Slide'lar başarıyla eklendi! 🚀");
      
      // Formu Temizle
      setNewSlide({ image_url: "", title: "", subtitle: "" });
      setNewSlideFiles([]);
      setNewSlidePreviews([]);
      fetchSlides();
    } catch (err: any) {
      alert("Slide eklenemedi: " + err.message);
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

    alert("Slide güncellendi ✅");
    fetchSlides();
  };

  // --- Kampanya tipi ---
  const toggleCampaignProduct = (id: number) => {
    if (selectedCampaignProducts.includes(id)) {
      setSelectedCampaignProducts((prev) => prev.filter((x) => x !== id));
    } else {
      if (selectedCampaignProducts.length >= 3) return alert("En fazla 3 ürün seçebilirsin!");
      setSelectedCampaignProducts((prev) => [...prev, id]);
    }
  };

  const getCampaignType = () => {
    if (selectedCampaignProducts.length === 1) return "📉 Fiyat İndirimi Kampanyası";
    if (selectedCampaignProducts.length > 1) return "🤝 Beraber Alım (Bundle) Kampanyası";
    return "Lütfen ürün seçin";
  };

  // --- filtre ---
  const filteredProducts = dbProducts.filter((p) =>
    (p.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        {/* İstatistik */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Bu Ayki Satışlar</p>
            <p className="text-2xl font-black text-green-600">0 ₺</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Sipariş Adedi</p>
            <p className="text-2xl font-black text-gray-900">0</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Site Ziyaretleri</p>
            <p className="text-2xl font-black text-blue-600">0</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Toplam Ürün</p>
            <p className="text-2xl font-black text-gray-900">{dbProducts.length}</p>
          </div>
        </div>

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
            <span>🏷️</span> Kampanya Oluştur
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
                  setIsAddProductOpen(false);
                  setNewProductImages([]); // Form kapanınca önizlemeleri temizle
                  setNewProductFiles([]);  // Form kapanınca seçili dosyaları temizle
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

              {/* YENİ: Açıklama Alanı */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Ürün Açıklaması</label>
                <textarea required name="description" rows={3} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium resize-none" placeholder="Ürünün detaylarını, boyutlarını, malzemesini buraya yazın..." />
              </div>

              {/* YENİ: Çoklu Görsel Yükleme Alanı */}
              <div className="bg-gray-50 p-3 border border-gray-200 rounded-xl">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Ürün Fotoğrafları</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    
                    setNewProductFiles(files);
                    
                    const previewUrls = files.map(file => URL.createObjectURL(file));
                    setNewProductImages(previewUrls);
                  }}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
                />

                {/* Yüklenen Resimlerin Önizleme Galerisi */}
                {newProductImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {newProductImages.map((url, index) => (
                      <div key={index} className="w-full h-20 rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white flex items-center justify-center relative">
                        <span className="absolute top-1 left-1 bg-black text-white text-[10px] px-1.5 py-0.5 rounded-md z-10">{index + 1}</span>
                        <img src={url} alt={`Önizleme ${index + 1}`} className="max-h-full object-contain" />
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

              <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold mt-4 shadow-lg hover:bg-gray-800 transition">
                🚀 Ürünü Ekle
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* ÜRÜN DÜZENLE MODALI */}
      {(editLoading || editingProduct) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black">Ürün Düzenle</h2>
              <button onClick={() => setEditingProduct(null)} className="w-8 h-8 bg-gray-100 rounded-full font-bold">✕</button>
            </div>

            {editLoading && <p className="text-center text-gray-400">Ürün detayı yükleniyor...</p>}

            {editingProduct && (
              <>
                {editingProduct.image && (
                  <img src={editingProduct.image} className="w-full h-40 object-cover rounded-xl border border-gray-200" alt="" />
                )}

                <form onSubmit={handleUpdateProduct} className="flex-1 overflow-y-auto space-y-4 pb-4">
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

                  <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold mt-4">
                    KAYDET
                  </button>
                </form>

                <div className="pt-4 border-t border-gray-100 mt-2">
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

      {/* KAMPANYA MODALI (şimdilik placeholder) */}
      {isCampaignOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-12 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
              <h2 className="text-xl font-black">🏷️ Kampanya Oluştur</h2>
              <button onClick={() => setIsCampaignOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full font-bold">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-6 flex-1 pr-2">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-800 font-bold uppercase tracking-widest mb-1">Kampanya Tipi</p>
                <p className="text-lg font-black text-blue-900">{getCampaignType()}</p>
                <p className="text-xs text-blue-600 mt-1">Sistem seçtiğiniz ürün sayısına göre kampanya tipini belirler.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Ürün Seçimi (Maks 3)</label>
                <div className="grid grid-cols-3 gap-2">
                  {dbProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => toggleCampaignProduct(p.id)}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        selectedCampaignProducts.includes(p.id) ? "border-blue-600 scale-95" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 p-2 text-center">
                        {p.name}
                      </div>
                      {selectedCampaignProducts.includes(p.id) && (
                        <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center backdrop-blur-sm">
                          <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">
                            ✓
                          </span>
                        </div>
                      )}
                    </div>
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
            </div>

            <button
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold uppercase mt-4 active:scale-95 shadow-lg"
              onClick={() => {
                alert("Kampanya DB tablosu açılınca bu işlem aktif olacak.");
                setIsCampaignOpen(false);
              }}
            >
              Kampanyayı Başlat
            </button>
          </div>
        </div>
      )}

      {/* ÖZEL PANEL (marquee + slides) */}
      {/* ÖZEL PANEL (marquee + slides) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-black">⚙️ Özel Sayfa Paneli</h2>
              <button 
                onClick={() => {
                  setIsSettingsOpen(false);
                  setNewSlideFiles([]);
                  setNewSlidePreviews([]);
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
                    
                    {/* YENİ: ÇOKLU DOSYA SEÇİCİ */}
                    <div className="bg-white border border-gray-200 rounded-xl p-2">
                      <input
                        type="file"
                        accept="image/*"
                        multiple // BİRDEN FAZLA SEÇMEYE YARAR
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length === 0) return;
                          
                          setNewSlideFiles(files);
                          setNewSlidePreviews(files.map(f => URL.createObjectURL(f)));
                        }}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
                      />
                      
                      {/* Önizleme Resimleri */}
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
                            onChange={(e) => setDbSlides((prev) => prev.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
                            placeholder="Başlık"
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium"
                          />
                          <input
                            type="text"
                            value={s.subtitle || ""}
                            onChange={(e) => setDbSlides((prev) => prev.map((x) => (x.id === s.id ? { ...x, subtitle: e.target.value } : x)))}
                            placeholder="Alt Yazı"
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium"
                          />
                          <input
                            type="text"
                            value={s.image_url || ""}
                            onChange={(e) => setDbSlides((prev) => prev.map((x) => (x.id === s.id ? { ...x, image_url: e.target.value } : x)))}
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