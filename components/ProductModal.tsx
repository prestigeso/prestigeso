// components/ProductModal.tsx
"use client";

import { useCart } from "@/context/CartContext";

type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  category?: string;
};

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const { addToCart } = useCart();

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Arka Planı Karart */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Kutusu */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row animate-scale-up">
        
        {/* Kapat Butonu */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 rounded-full hover:bg-gray-100 transition-colors"
        >
          ✕
        </button>

        {/* Sol Taraf: Büyük Resim */}
        <div className="w-full md:w-1/2 bg-gray-100 relative h-64 md:h-auto">
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Sağ Taraf: Detaylar */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
          <span className="text-sm text-blue-600 font-bold uppercase tracking-wider mb-2">
            {product.category || "Özel Koleksiyon"}
          </span>
          
          <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">
            {product.name}
          </h2>

          <p className="text-gray-600 mb-6 leading-relaxed">
            Bu özel parça, stilinizi tamamlamak için özenle seçildi. 
            PrestigeSO kalitesiyle şimdi stoklarda. Sınırlı sayıda üretim.
          </p>

          <div className="flex items-center gap-4 mb-8">
            <span className="text-3xl font-bold text-gray-900">
              {product.price.toLocaleString('tr-TR')} ₺
            </span>
            <span className="text-lg text-gray-400 line-through">
              {(product.price * 1.3).toLocaleString('tr-TR', {maximumFractionDigits: 0})} ₺
            </span>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => {
                addToCart(product);
                onClose(); // Ekleyince kapat
              }}
              className="flex-1 bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-transform active:scale-95"
            >
              Sepete Ekle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}