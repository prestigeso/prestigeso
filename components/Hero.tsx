// components/Hero.tsx
import Link from "next/link";

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-gray-900 text-white">
      {/* Arka Plan Resmi (Karanlık filtreli) */}
      <div className="absolute inset-0">
        https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop
      </div>

      {/* İçerik */}
      <div className="relative mx-auto max-w-7xl px-4 py-32 sm:px-6 lg:flex lg:h-screen lg:items-center lg:px-8">
        <div className="max-w-3xl text-center sm:text-left">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Tarzını <span className="text-blue-500">Yeniden</span> Keşfet
          </h1>

          <p className="mt-4 text-xl text-gray-300">
            Sezonun en trend parçaları, özel koleksiyonlar ve sana özel fırsatlar PrestigeSO&apos;da.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
            /shop
              Alışverişe Başla
            </Link>

            /shop
              Koleksiyonlar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}