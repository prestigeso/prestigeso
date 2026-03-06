import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#0a0a0a] text-white pt-16 pb-8 border-t border-gray-900 mt-20">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Üst Kısım: Menüler */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          
          {/* 1. Marka ve İletişim */}
          <div className="space-y-4">
            <h2 className="text-2xl font-black tracking-tighter uppercase mb-6">PRESTIGESO</h2>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              Zanaatin, milli değerlerin ve kültürel simgelerin modern dünyayla buluştuğu nokta. Ruhun imgelendiği aksesuarlar ve mobilyalar.
            </p>
            <div className="pt-4 space-y-2 text-xs font-medium text-gray-300">
              <p className="flex items-center gap-2"><span>📍</span> Sultangazi / İstanbul</p>
              <p className="flex items-center gap-2"><span>📞</span> <a href="tel:+905536834997" className="hover:text-white transition-colors">0553 683 49 97</a></p>
              <p className="flex items-center gap-2"><span>✉️</span> <a href="mailto:info@prestigeso.com" className="hover:text-white transition-colors">info@prestigeso.com</a></p>
            </div>
          </div>

          {/* 2. Kurumsal */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-6 text-gray-200">Kurumsal</h3>
            <ul className="space-y-3 text-xs font-medium text-gray-400">
              <li><Link href="/hakkimizda" className="hover:text-white hover:pl-1 transition-all">Hakkımızda</Link></li>
              <li><Link href="/teslimat-bilgileri" className="hover:text-white hover:pl-1 transition-all">Teslimat Bilgileri</Link></li>
              <li><Link href="/iletisim" className="hover:text-white hover:pl-1 transition-all">İletişim</Link></li>
            </ul>
          </div>

          {/* 3. Sözleşmeler ve Politikalar */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-6 text-gray-200">Müşteri İlişkileri</h3>
            <ul className="space-y-3 text-xs font-medium text-gray-400">
              <li><Link href="/mesafeli-satis-sozlesmesi" className="hover:text-white hover:pl-1 transition-all">Mesafeli Satış Sözleşmesi</Link></li>
              <li><Link href="/uyelik-sozlesmesi" className="hover:text-white hover:pl-1 transition-all">Üyelik Sözleşmesi</Link></li>
              <li><Link href="/guvenlik-ve-iade" className="hover:text-white hover:pl-1 transition-all">İptal ve İade Şartları</Link></li>
              <li><Link href="/gizlilik-politikasi" className="hover:text-white hover:pl-1 transition-all">Gizlilik Politikası</Link></li>
              <li><Link href="/gizlilik-ilkeleri" className="hover:text-white hover:pl-1 transition-all">Gizlilik İlkeleri</Link></li>
            </ul>
          </div>

          {/* 4. Güvenli Alışveriş */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-6 text-gray-200">Güvenli Alışveriş</h3>
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔒</span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-white">256-Bit SSL</p>
                  <p className="text-[10px] text-gray-400">Şifreli Güvenli Ödeme</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-white/10">
                 {/* Kart Logoları Temsili */}
                 <div className="w-10 h-6 bg-white/10 rounded flex items-center justify-center text-[8px] font-black">VISA</div>
                 <div className="w-10 h-6 bg-white/10 rounded flex items-center justify-center text-[8px] font-black">MASTER</div>
              </div>
            </div>
          </div>

        </div>

        {/* Alt Kısım: Telif Hakkı */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">
            © {new Date().getFullYear()} PRESTIGESO. Tüm Hakları Saklıdır.
          </p>
          <div className="flex gap-4 text-gray-500">
             <Link href="https://instagram.com" target="_blank" className="hover:text-white transition-colors">Instagram</Link>
             <Link href="https://twitter.com" target="_blank" className="hover:text-white transition-colors">Twitter</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}