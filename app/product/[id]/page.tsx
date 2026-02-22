import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";

// Supabase Bağlantısı
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  // Tıklanan ürünün ID'sini al ve Supabase'den o ürünü getir
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", params.id)
    .single();

  // Eğer ürün bulunamazsa veya silinmişse hata sayfası göster
  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Ürün Bulunamadı 😔</h1>
        <p className="text-gray-500 mb-6">Aradığınız ürün yayından kaldırılmış veya tükenmiş olabilir.</p>
        <Link href="/" className="bg-black text-white px-6 py-3 rounded-full hover:bg-gray-800 transition">
          Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-12">
          
          {/* Sol Taraf: Ürün Görseli */}
          <div className="w-full md:w-1/2 flex justify-center bg-gray-50 rounded-2xl p-8 border border-gray-100 relative group">
            <div className="relative w-full aspect-square">
              {product.image_url ? (
                <Image 
                  src={product.image_url} 
                  alt={product.name} 
                  fill 
                  className="object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">Görsel Yok</div>
              )}
            </div>
          </div>

          {/* Sağ Taraf: Ürün Bilgileri ve Satın Alma */}
          <div className="w-full md:w-1/2 flex flex-col justify-center">
            {/* Kategori / Etiketler (Opsiyonel) */}
            <div className="mb-4">
              {product.is_bestseller && (
                <span className="bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Çok Satan
                </span>
              )}
            </div>

            <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
              {product.name}
            </h1>
            
            <p className="text-3xl font-bold text-black mb-6">
              {product.price.toLocaleString('tr-TR')} ₺
            </p>

            {/* Stok Durumu */}
            <div className="mb-8">
              {product.stock > 10 ? (
                <span className="text-green-600 font-medium flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span> Stokta Var
                </span>
              ) : product.stock > 0 ? (
                <span className="text-orange-600 font-medium flex items-center gap-2">
                  <span className="w-3 h-3 bg-orange-500 rounded-full"></span> Son {product.stock} ürün!
                </span>
              ) : (
                <span className="text-red-600 font-medium flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span> Tükendi
                </span>
              )}
            </div>

            {/* Sepete Ekle Butonu */}
            <button 
              disabled={product.stock === 0}
              className={`w-full py-4 rounded-xl text-lg font-bold shadow-lg transition-all duration-300 ${
                product.stock === 0 
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                  : "bg-black text-white hover:bg-gray-800 hover:shadow-2xl active:scale-95"
              }`}
            >
              {product.stock === 0 ? "Stokta Yok" : "Sepete Ekle"}
            </button>

            {/* Teslimat Bilgisi */}
            <div className="mt-8 pt-6 border-t border-gray-100 text-sm text-gray-500 flex flex-col gap-2">
              <p>🚚 Bugün sipariş verirseniz <span className="font-semibold text-gray-800">yarın kargoda.</span></p>
              <p>🛡️ 14 gün içinde koşulsuz şartsız ücretsiz iade.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}