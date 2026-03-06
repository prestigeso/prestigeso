import Link from "next/link";

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] py-16 px-4 font-sans text-[#333]">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm">
        
        {/* Üst Kısım: Başlık ve Geri Dön Butonu */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 border-b border-gray-100 pb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-black">
            Hakkımızda
          </h1>
          <Link 
            href="/" 
            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>
        
        <div className="space-y-12">
          
          {/* VİZYON MANİFESTOSU */}
          <section>
            <p className="text-lg md:text-xl font-medium text-black leading-relaxed italic border-l-4 border-black pl-5 py-2">
              "Fason üretimin ve el emeği eksikliğinin piyasanın kalitesini düşürdüğü bu dönemin aksine; zanaatin öneminin, milli değerlerimizin, kültürel simgelerimizin sergilenmesinin öneminin farkında olan bir markayız."
            </p>
            <p className="text-sm md:text-base text-gray-600 leading-relaxed mt-6">
              İnsanlara sanatın ve doğal güzelliklerin günlük hayatta yer alabileceğini gösterip; aksesuar ve mobilya kategorilerinde ruhun daha çok imgelendiği, insanı düşünmeye ve bakarken bir şeyler hissetmeye iten bir dünya oluşturmak istiyoruz.
            </p>
          </section>

          {/* İLETİŞİM VE OPERASYON MERKEZİ (Grid Yapısı) */}
          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6">Operasyon & İletişim</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Merkez Depo */}
              <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-lg">📍</div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-black mb-1">Ana Depo / Merkez</h3>
                  <p className="text-sm font-medium text-gray-600">1395. Sokak No: 21<br/>Sultangazi / İstanbul</p>
                </div>
              </div>

              {/* İletişim */}
              <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-lg">📞</div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-black mb-1">Müşteri İlişkileri</h3>
                  <p className="text-sm font-medium text-gray-600 flex flex-col gap-1 mt-2">
                    <a href="tel:+905536834997" className="hover:text-black transition-colors font-bold text-black border-b border-gray-200 w-max pb-0.5">0553 683 49 97</a>
                    <a href="mailto:counselor@prestigeso.com" className="hover:text-black transition-colors">counselor@prestigeso.com</a>
                    <a href="mailto:qayzhera@gmail.com" className="hover:text-black transition-colors">qayzhera@gmail.com</a>
                  </p>
                </div>
              </div>

              {/* Lojistik Noktaları */}
              <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col gap-3 md:col-span-2">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-lg">🚚</div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-black mb-2">Kargo Çıkış Noktalarımız</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold text-gray-700">İstanbul, Bağcılar</span>
                    <span className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold text-gray-700">İstanbul, Sultangazi</span>
                    <span className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold text-gray-700">İstanbul, Eminönü</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* KALİTE VE MÜŞTERİ TAAHHÜDÜ */}
          <section className="bg-black text-white p-8 md:p-10 rounded-3xl relative overflow-hidden">
            {/* Şık arkaplan efekti */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 space-y-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Hizmet Taahhüdümüz</h2>
              <p className="text-sm md:text-base leading-relaxed font-medium opacity-90">
                Tecrübeli teknik kadromuz ile güvenilir ve verimli ekip olma anlayışıyla; müşteri memnuniyeti ve kalite ile birlikte zamanındalık ilkesinden ödün vermeden ülke ve dünya standartlarına uygun olarak hizmet sunmaktayız.
              </p>
              <p className="text-sm md:text-base leading-relaxed font-medium opacity-90">
                Hizmet kalitesi ve bunun ile bağlantılı olarak müşteri memnuniyetini arttırmaya yönelik çalışmalarımız sürekli olarak devam etmektedir. Teknolojinin katkıları ile siz değerli müşterilerimize her noktada sorunlarınızı gidermek ve destek olmak için durmaksızın çalışıyoruz.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}