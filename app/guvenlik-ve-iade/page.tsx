import Link from "next/link";

export default function SecurityAndReturnsPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] py-16 px-4 font-sans text-[#333]">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm">
        
        {/* Üst Kısım: Başlık ve Geri Dön Butonu */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 border-b border-gray-100 pb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-black">
            Güvenlik, İptal ve İade Şartları
          </h1>
          <Link 
            href="/" 
            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>
        
        {/* Metin İçeriği */}
        <div className="space-y-10 text-sm md:text-base leading-relaxed text-gray-600 font-medium">
          
          {/* 1. GÜVENLİK POLİTİKASI */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">1</span>
              <h2 className="text-lg font-black text-black uppercase tracking-tight">Güvenlik Politikası</h2>
            </div>
            <div className="space-y-4 pl-11">
              <p>
                Şirketimizin Güvenlik Politikası gereği; Müşterilerimizin güvenli bir şekilde, rahatça alışveriş yapabilmelerini sağlamak için en gelişmiş güvenlik sistemleri kullanılmaktadır. Sistemimizdeki <strong className="text-black">128 bit SSL</strong> sayesinde kredi kartı bilgileriniz üçüncü şahısların gözünden ve müdahalesinden korunmaktadır. 
              </p>
              <p>
                Sipariş işlemlerinin bütün aşamasında tüm bilgi alışverişi SSL güvencesi altındadır ve tüm veri akışı şifreli olarak yapılmaktadır. Bu, pratik olarak kırılması mümkün olmayan bir şifrelemedir. SSL güvenlik protokolü sayesinde sitemize verdiğiniz kredi kartı bilgileriniz şifrelenerek bankaya gönderilir ve bu işlem sırasında bu bilgilere bizlerin dahi ulaşabilmesi mümkün değildir.
              </p>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl mt-2">
                <p className="text-xs text-black font-bold flex items-start gap-2">
                  <span className="text-lg leading-none">💳</span> 
                  Web sitemiz hiçbir müşterisinin kredi kartı bilgilerini sisteminde saklamamaktadır. Bu sebepten dolayı kendi kredi kartı güvenliğiniz için, her sipariş oluşturma aşamasında kart bilgilerinizi tekrar girmeniz gerekmektedir.
                </p>
              </div>
            </div>
          </section>

          {/* 2. GARANTİ ŞARTLARI */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">2</span>
              <h2 className="text-lg font-black text-black uppercase tracking-tight">Garanti Şartları</h2>
            </div>
            <div className="space-y-4 pl-11">
              <p>
                Sitemizden satılan tüm ürünler üretici / ithalatçı firmaların garantisi altındadır. Satın alınan ürünü tahrip etmeden, kullanmadan ve ürünün tekrar satılabilirliğini bozmadan teslim tarihinden itibaren <strong className="text-black">yedi (7) günlük süre içinde</strong> neden göstererek iade edebilirsiniz. 
              </p>
              <p>
                Ancak ürünü teslim ederken ürünün faturası, iade formu, ürünün kutusu, ambalajı, varsa aksesuarları ile birlikte eksiksiz ve hasarsız olarak teslimi gerekmektedir. Bu kurallardan herhangi birinin eksik olması durumunda ürün iadesi kabul edilmez.
              </p>
              <p>
                Ürünün, iade şartlarına uygun şekilde iade edilmesi halinde ürün tutarı iade edilir. Yapılan iadenin hesabınıza yansıması ise çalıştığınız bankaya göre 1-3 hafta sürmektedir. Havale ile yapılan ödemeler ise en geç bir hafta içinde hesaba yansımaktadır.
              </p>
              <p>
                Ürünü göndermeden önce iade talebinizi web sitemizdeki "İletişim" altındaki "Konular" kısmından "İade Formu"nu seçin, gerekçenizi de belirterek bize ulaştırın. Akabinde, ürün iade formu e-posta adresinize gönderilecektir. Bu formu doldurarak bize göndermeniz gerekir. Bu form Teknik Servis Departmanı tarafından incelenerek tarafınıza onay verilecektir. Bu onayı aldıktan sonra ürünü iade ediniz.
              </p>
              <p className="text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                ⚠️ İade edilecek ürünleri onayı aldıktan hemen sonra Teknik Servis Departmanına gönderiniz. Anlaşmalı Kargo ile gönderilen iade ürünler için kargo ücreti alınmaz. Diğer kargo firmaları ile yapılacak karşı ödemeli gönderimler kabul edilmez, bu tip gönderimlerde kargo ücreti gönderene aittir.
              </p>
            </div>
          </section>

          {/* 3. İADE ŞARTLARI */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">3</span>
              <h2 className="text-lg font-black text-black uppercase tracking-tight">İade Şartları</h2>
            </div>
            <div className="space-y-4 pl-11">
              <p className="font-bold text-black border-l-2 border-black pl-3 py-1">
                Dikkat: Siparişinizle ilgili her tür iletişiminizde mutlaka sipariş numaranızı bildiriniz.
              </p>
              <p>Satılan ürünler aşağıdaki şartlar haricinde iade alınmaz:</p>
              <ol className="list-decimal pl-5 space-y-2 text-black font-semibold">
                <li>Satılan ürünün hatalı olması durumunda,</li>
                <li>Kargo şirketinden doğacak taşıma sırasında gönderinin zarar görmesi ve bu zararın tespit edilerek ürünün alıcı tarafından teslim alınmaması durumunda zarar tarafımızdan telafi edilir.</li>
              </ol>

              {/* Alt Koşul A: Hatalı Ürünler */}
              <div className="mt-6 bg-gray-50 p-5 rounded-2xl border border-gray-200">
                <h3 className="text-sm font-black text-black uppercase mb-3 border-b border-gray-200 pb-2">
                  A) Ürünle İlgili Sorunlarda (Teslimatta fark edilmeyen hatalar)
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-black mt-0.5">a)</span>
                    <span>Fatura adınıza kesilmişse ve vergi mükellefi değilseniz, tarafınıza kesilen fatura ve irsaliyemiz; eğer vergi mükellefiyseniz ya da sipariş faturanızı şirketinize kestirmişseniz, iade edeceğiniz ürün(ler)le ilgili fatura ve irsaliyeniz ürünlerle birlikte gönderilmelidir.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-black mt-0.5">b)</span>
                    <span>İade işlemi teslim tarihini takip eden iki gün içinde başlatılmış olmalıdır.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-black mt-0.5">c)</span>
                    <span>İade edilen ürünler teslimatta kullanılan firma ile geri gönderilmelidir.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-black mt-0.5">d)</span>
                    <span>İade gerekçesi değerlendirildikten sonra koşullara uygun olması durumunda sorunlu ürünler yenileriyle değiştirilecektir. Böyle bir durumda tüm kargo masrafları tarafımıza aittir. Aksi durumda masraflar müşteri tarafından karşılanır.</span>
                  </li>
                </ul>
              </div>

              {/* Alt Koşul B: Kargo Hasarı */}
              <div className="mt-4 bg-orange-50 p-5 rounded-2xl border border-orange-100">
                <h3 className="text-sm font-black text-orange-800 uppercase mb-3 border-b border-orange-200/50 pb-2">
                  B) Teslimatçı Firmadan Kaynaklanan Sorunlarda
                </h3>
                <p className="text-sm text-orange-900 leading-relaxed">
                  Zarar görmüş paketler teslim alınmayarak teslimatçı firmaya <strong className="font-black">tutanak tutturulmalıdır</strong>. Eğer kargo yetkilisi paketin hasarlı olmadığını düşünüyorsa, paketi açıp kontrol ettirme ve durumu tutanakla tespit ettirme hakkınız vardır. Paket teslim alındıktan sonra kargo firmasının görevini yaptığı kabul edilir. Tutanak tutulmuşsa, en kısa sürede bize bildirilmelidir; yeni teslimat tarafımızdan sağlanacaktır.
                </p>
              </div>
            </div>
          </section>

          {/* 4. TESLİMAT ŞARTLARI */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">4</span>
              <h2 className="text-lg font-black text-black uppercase tracking-tight">Teslimat Şartları</h2>
            </div>
            <div className="pl-11">
              <p>Sipariş verdiğiniz ürünler, onay tarihinden itibaren <strong className="text-black">3 iş günü içerisinde</strong> tedarik edilip kargoya verilecektir.</p>
            </div>
          </section>

          {/* 5. TÜKETİCİ HAKLARI */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">5</span>
              <h2 className="text-lg font-black text-black uppercase tracking-tight">Tüketici Hakları</h2>
            </div>
            <div className="pl-11 space-y-3">
              <p>Alışveriş yapmak için sitemize üye olmanız şarttır. Sitemize üyelik ücretsizdir. Siteye üye olmayan kişilere satış yapılmaz.</p>
              <p>Firmamız, 4822 sayılı kanun ile değişik, 4077 sayılı Tüketicinin Korunması hakkındaki kanun hükümlerine uygun hareket edeceğini peşinen kabul ve taahhüt eder.</p>
            </div>
          </section>

          {/* 6. SİPARİŞ İPTALİ */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">6</span>
              <h2 className="text-lg font-black text-black uppercase tracking-tight">Sipariş İptali</h2>
            </div>
            <div className="pl-11">
              <p>Siparişinizin iptali için müşteri temsilcinizle görüşebilir, iptal işlemini gerçekleştirebilirsiniz. İptal işlemi sonucunda ücret iadesi iptal talebini takiben <strong className="text-black">3 (üç) iş günü</strong> içerisinde gerçekleştirilecektir.</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}