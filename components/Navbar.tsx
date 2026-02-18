// components/Navbar.tsx
"use client";

import Link from 'next/link';
import { useCart } from "@/context/CartContext"; // Sepet bağlantısı

export default function Navbar() {
  const { toggleCart, cartCount } = useCart(); // Sepet verilerini çek

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-2xl font-black text-gray-900 tracking-tighter">
              Prestige<span className="text-blue-600">SO</span>
            </Link>
          </div>

          {/* Orta Menü */}
          <div className="hidden md:flex space-x-8">
            <Link href="#" className="text-gray-600 hover:text-black transition-colors">Yeni Gelenler</Link>
            <Link href="#" className="text-gray-600 hover:text-black transition-colors">Koleksiyonlar</Link>
            <Link href="#" className="text-gray-600 hover:text-black transition-colors">İndirim</Link>
          </div>

          {/* Sağ İkonlar */}
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
            
            {/* Sepet Butonu */}
            <button 
              onClick={toggleCart} // Tıklayınca sepeti aç
              className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
              
              {/* Ürün Sayısı Baloncuğu */}
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}