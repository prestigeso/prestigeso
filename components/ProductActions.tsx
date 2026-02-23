"use client";

import { useCart } from "@/context/CartContext";

type ProductLike = {
  id: number | string;
  name: string;
  price: number;
  image: string;
};

export default function ProductActions({ product }: { product: ProductLike }) {
  const { addToCart, setIsCartOpen } = useCart();

  const handleAdd = () => {
    addToCart({ ...product, quantity: 1 });
    setIsCartOpen(true);
  };

  const handleBuyNowWhatsApp = () => {
    const phoneNumber = "905525280105";
    const message =
      `Merhaba PrestigeSO! 👋\n` +
      `Bu ürünü sipariş etmek istiyorum:\n\n` +
      `📦 *${product.name}*\n` +
      `Fiyat: ${product.price.toLocaleString("tr-TR")} ₺\n` +
      `Ürün ID: ${product.id}\n\n` +
      `Teşekkürler.`;

    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleAdd}
        className="w-full py-4 rounded-xl text-lg font-bold shadow-lg bg-black text-white hover:bg-gray-800 active:scale-95"
      >
        Sepete Ekle
      </button>

      <button
        onClick={handleBuyNowWhatsApp}
        className="w-full py-4 rounded-xl text-lg font-bold shadow-lg bg-green-600 text-white hover:bg-green-700 active:scale-95"
      >
        Şimdi Sipariş Ver
      </button>
    </div>
  );
}