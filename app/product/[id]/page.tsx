"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { addToCart, setIsCartOpen } = useCart();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");
        const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
        if (error) {
          setErr(error.message);
          setProduct(null);
        } else {
          setProduct(data);
        }
      } catch (e: any) {
        setErr(e?.message || "Fetch failed");
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    if (id) run();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500 font-bold uppercase tracking-widest">Yükleniyor...</div>;
  if (!product || err) return <div className="min-h-screen flex items-center justify-center text-black font-black text-xl uppercase">Ürün Bulunamadı.</div>;

  const imageList = product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : ["/logo.jpeg"]);

  const nextImage = () => setCurrentImgIndex((prev) => (prev + 1) % imageList.length);
  const prevImage = () => setCurrentImgIndex((prev) => (prev - 1 + imageList.length) % imageList.length);

  const handleAdd = () => {
    addToCart({ id: product.id, name: product.name, price: Number(product.price), image: imageList[currentImgIndex], quantity: 1 });
    setIsCartOpen(true);
  };

  const handleBuyNowWhatsApp = () => {
    const message = `Merhaba!\nŞu ürünü hemen almak istiyorum:\n📦 ${product.name}\nFiyat: ${Number(product.price)} ₺\nLink: ${window.location.href}`;
    window.open(`https://wa.me/905525280105?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-white py-6 px-4 md:px-10 mt-16 font-sans text-black pb-32">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-16">
        
        {/* SOL TARAF: GALERİ */}
        <div className="w-full lg:w-[45%] flex flex-col gap-4">
          <div className="relative w-full aspect-[3/4] bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center group overflow-hidden">
            {imageList.length > 1 && (
              <>
                <button onClick={prevImage} className="absolute left-4 w-12 h-12 bg-white border border-gray-200 text-black rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-10 opacity-0 group-hover:opacity-100">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button onClick={nextImage} className="absolute right-4 w-12 h-12 bg-white border border-gray-200 text-black rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-10 opacity-0 group-hover:opacity-100">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </>
            )}
            <img src={imageList[currentImgIndex]} alt={product.name} className="w-full h-full object-contain p-2 mix-blend-multiply" />
          </div>

          {/* Küçük Resimler */}
          {imageList.length > 1 && (
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {imageList.map((img: string, idx: number) => (
                <button key={idx} onClick={() => setCurrentImgIndex(idx)} className={`w-16 h-20 flex-shrink-0 rounded-xl border-2 p-1 overflow-hidden transition-all ${currentImgIndex === idx ? 'border-black opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                  <img src={img} className="w-full h-full object-cover rounded-lg" alt="thumbnail" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SAĞ TARAF: DETAYLAR VE BUTONLAR */}
        <div className="w-full lg:w-[55%] flex flex-col">
          
          {/* Başlık (Sadece kocaman ürün adı) */}
          <div className="mb-2">
            <h1 className="text-3xl md:text-4xl font-black text-black leading-tight tracking-tight uppercase">
              {product.name}
            </h1>
          </div>

          {/* Fiyat */}
          <div className="my-6">
            <p className="text-4xl md:text-5xl font-black text-black tracking-tighter">{Number(product.price).toLocaleString("tr-TR")} ₺</p>
            {Number(product.discount_price) > 0 && (
              <p className="text-lg text-gray-400 line-through mt-1 font-bold">
                {Number(product.discount_price).toLocaleString("tr-TR")} ₺
              </p>
            )}
          </div>

          {/* Satın Alma Butonları */}
          <div className="flex items-center gap-3 my-4">
            <button onClick={handleBuyNowWhatsApp} className="flex-1 py-4 bg-white border-2 border-black text-black rounded-2xl font-black text-sm md:text-base uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all">
              Şimdi Al
            </button>
            <button onClick={handleAdd} className="flex-1 py-4 bg-black border-2 border-black text-white rounded-2xl font-black text-sm md:text-base uppercase tracking-widest hover:bg-gray-900 active:scale-95 transition-all shadow-xl">
              Sepete Ekle
            </button>
            <button onClick={() => setIsFav(!isFav)} className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-2xl border-2 border-gray-200 text-gray-400 hover:text-black hover:border-black transition-all bg-white active:scale-95">
              <svg viewBox="0 0 24 24" fill={isFav ? "black" : "none"} stroke={isFav ? "black" : "currentColor"} strokeWidth="2" className="w-6 h-6 transition-all">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>

          {/* Kargo Bilgisi (Sadece kargoya teslimat) */}
          <div className="bg-gray-50 rounded-2xl p-5 mt-4 border border-gray-100 flex flex-col gap-4 text-sm">
            <div className="flex items-start gap-4">
              <span className="text-black text-xl mt-0.5">📦</span>
              <div>
                <span className="font-black text-black uppercase tracking-wider text-xs block mb-1">Tahmini Kargoya Teslim</span>
                <span className="text-gray-500 font-medium">2 gün içinde kargoda</span>
              </div>
            </div>
          </div>

          {/* Öne Çıkan Özellikler & Açıklama (Çerçeveli Kutu) */}
          {product.description && (
            <div className="bg-gray-50 rounded-2xl p-5 mt-4 border border-gray-100">
              <h3 className="font-black text-black uppercase tracking-widest border-b-2 border-black inline-block pb-1 mb-6">Öne Çıkan Özellikler</h3>
              
              <div className="relative">
                {/* break-words class'ı eklendi: Uzun kelimeleri kırar, taşmayı önler */}
                <div className={`text-sm text-gray-600 font-medium leading-loose whitespace-pre-wrap break-words transition-all duration-300 ${isDescExpanded ? 'pb-8' : 'h-36 overflow-hidden'}`}>
                  <ul className="list-disc pl-5 space-y-2 mb-4 break-words">
                    <li>Bu ürün <strong className="text-black font-black">PRESTİGESO</strong> garantisi ile gönderilecektir.</li>
                    <li>Siparişleriniz özenle paketlenir ve aynı gün işleme alınır.</li>
                    <li className="break-words">{product.description}</li>
                  </ul>
                </div>
                
                {/* Alt kısmın sisi, kutunun gri rengiyle (gray-50) uyumlu yapıldı */}
                {!isDescExpanded && (
                  <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none"></div>
                )}
              </div>

              <div className="mt-2 text-center border-t border-gray-200 pt-6">
                <button 
                  onClick={() => setIsDescExpanded(!isDescExpanded)} 
                  className="bg-white hover:bg-black hover:text-white border-2 border-black text-black font-black text-xs px-8 py-4 rounded-2xl uppercase tracking-[0.2em] transition-all"
                >
                  ÜRÜNÜN TÜM ÖZELLİKLERİ {isDescExpanded ? '▲' : '▼'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}