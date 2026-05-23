import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] py-16 px-4 font-sans text-[#333]">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 border-b border-gray-100 pb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-black">
            İletişim
          </h1>

          <Link
            href="/"
            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>

        <div className="space-y-10">
          <section>
            <p className="text-sm md:text-base text-gray-600 leading-relaxed font-medium">
              PrestigeSO ile ilgili soru, öneri, sipariş, teslimat, iade ve destek
              talepleriniz için aşağıdaki iletişim kanallarından bize ulaşabilirsiniz.
              En kısa sürede dönüş sağlamaya çalışırız.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-lg mb-4">
                📍
              </div>

              <h2 className="text-xs font-black uppercase tracking-widest text-black mb-2">
                Adres
              </h2>

              <p className="text-sm font-medium text-gray-600 leading-relaxed">
                Sultangazi / İstanbul
              </p>
            </div>

            <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-lg mb-4">
                📞
              </div>

              <h2 className="text-xs font-black uppercase tracking-widest text-black mb-2">
                Telefon
              </h2>

              <a
                href="tel:+905536834997"
                className="text-sm font-black text-black border-b border-black hover:text-gray-500 hover:border-gray-500 transition-colors"
              >
                0553 683 49 97
              </a>
            </div>

            <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-lg mb-4">
                ✉️
              </div>

              <h2 className="text-xs font-black uppercase tracking-widest text-black mb-2">
                E-posta
              </h2>

              <a
                href="mailto:info@prestigeso.com"
                className="text-sm font-black text-black border-b border-black hover:text-gray-500 hover:border-gray-500 transition-colors"
              >
                info@prestigeso.com
              </a>
            </div>

            <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-lg mb-4">
                🕒
              </div>

              <h2 className="text-xs font-black uppercase tracking-widest text-black mb-2">
                Destek Saatleri
              </h2>

              <p className="text-sm font-medium text-gray-600 leading-relaxed">
                Pazartesi - Cumartesi
                <br />
                09:00 - 18:00
              </p>
            </div>
          </section>

          <section className="bg-black text-white p-8 md:p-10 rounded-3xl relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>

            <div className="relative z-10 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">
                Sipariş ve Destek Talepleri
              </h2>

              <p className="text-sm md:text-base leading-relaxed font-medium opacity-90">
                Siparişleriniz, ürünler, teslimat, iade ve destek talepleriniz için
                profil sayfanızdaki “Satıcıya Mesaj Gönder” alanını da kullanabilirsiniz.
              </p>

              <Link
                href="/profile"
                className="inline-flex bg-white text-black px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all"
              >
                Profilime Git
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}