// components/Hero.tsx
import Link from 'next/link';

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-gray-900 text-white">
      {/* Arka Plan Resmi (Karanlık filtreli) */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop"
          alt="Alışveriş Vitrini"
          className="h-full w-full object-cover object-center opacity-40"
        />
      </div>

      {/* İçerik */}
      <div className="relative mx-auto max-w-7xl px-4 py-32 sm:px-6 lg:flex lg:h-screen lg:items-center lg:px-8">
        <div className="max-w-3xl text-center sm:text-left">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Tarzını <span className="text-blue-500">Yeniden</span> Keşfet
          </h1>
          <p className="mt-4 text-xl text-gray-300">
            Sezonun en trend parçaları, özel koleksiyonlar ve sana özel fırsatlar PrestigeSO'da.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="#"
              className="rounded-full bg-blue-600 px-8 py-3 text-lg font-semibold text-white transition hover:bg-blue-500"
            >
              Alışverişe Başla
            </Link>
            <Link
              href="#"
              className="rounded-full border border-white px-8 py-3 text-lg font-semibold text-white transition hover:bg-white hover:text-gray-900"
            >
              Koleksiyonlar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}