// components/ui/ProductCard.tsx
"use client";

import { useCart } from "@/context/CartContext";
import { useState } from "react";

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
}

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false); // Eklendi animasyonu için state

  const handleAddToCart = () => {
    addToCart(product);
    setIsAdded(true); // "Eklendi" moduna geç
    
    // 2 saniye sonra eski haline dön
    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  return (
    <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col h-full">
      
      {/* Resim Alanı */}
      <div className="relative h-72 w-full bg-gray-100 overflow-hidden">
        <span className="absolute top-3 left-3 bg-black/80 text-white text-xs font-bold px-3 py-1 rounded-full z-10 backdrop-blur-sm">
          {product.category || "Genel"}
        </span>
        
        {/* Next/Image yerine standart img kullanarak hatayı çözüyoruz */}
        <img 
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
        />

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
      </div>

      {/* İçerik Alanı */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
          {product.name}
        </h3>
        
        <div className="flex items-center gap-2 mb-4">
           <span className="text-sm text-gray-400 line-through">
             {(product.price * 1.2).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
           </span>
           <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
             %20 İndirim
           </span>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <p className="text-xl font-black text-blue-600">
            {product.price.toLocaleString('tr-TR')} ₺
          </p>
          
          {/* Buton - Animasyonlu */}
          <button 
            onClick={handleAddToCart}
            disabled={isAdded} // Eklendi yazarken tekrar basılmasın
            className={`
              p-3 rounded-xl transition-all shadow-lg flex items-center justify-center min-w-[50px]
              ${isAdded 
                ? "bg-green-500 text-white shadow-green-200 scale-105" 
                : "bg-gray-900 text-white hover:bg-blue-600 active:scale-95 shadow-gray-200 group-hover:shadow-blue-200"
              }
            `}
          >
            {isAdded ? (
              <span className="text-sm font-bold flex items-center gap-1">
                 ✅
              </span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}