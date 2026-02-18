// components/Footer.tsx
export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Marka */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white">Prestige<span className="text-blue-600">SO</span></h3>
            <p className="text-sm">
              Kalite ve güvenin adresi. Arkadaşınızın hayalindeki mağaza deneyimi.
            </p>
          </div>

          {/* Linkler */}
          <div>
            <h4 className="text-white font-semibold mb-4">Kurumsal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-blue-500">Hakkımızda</a></li>
              <li><a href="#" className="hover:text-blue-500">Kariyer</a></li>
              <li><a href="#" className="hover:text-blue-500">İletişim</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Yardım</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-blue-500">Sipariş Takibi</a></li>
              <li><a href="#" className="hover:text-blue-500">İade ve Değişim</a></li>
              <li><a href="#" className="hover:text-blue-500">Sıkça Sorulan Sorular</a></li>
            </ul>
          </div>

          {/* Bülten */}
          <div>
            <h4 className="text-white font-semibold mb-4">Haberdar Ol</h4>
            <div className="flex flex-col gap-2">
              <input 
                type="email" 
                placeholder="E-posta adresiniz" 
                className="bg-gray-800 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
                Abone Ol
              </button>
            </div>
          </div>

        </div>
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-xs">
          &copy; 2026 PrestigeSO. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}