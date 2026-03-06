import Link from "next/link";

export default function MembershipAgreementPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] py-16 px-4 font-sans text-[#333]">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm">
        
        {/* Üst Kısım: Başlık ve Geri Dön Butonu */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 border-b border-gray-100 pb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-black">
            Üyelik Sözleşmesi ve Şartlar
          </h1>
          <Link 
            href="/" 
            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>
        
        {/* Metin İçeriği */}
        <div className="space-y-10 text-sm leading-relaxed text-gray-600 font-medium">

          <section>
            <h2 className="text-lg font-black text-black uppercase tracking-tight mb-3">Madde 1 - Taraflar</h2>
            <p>İşbu Üyelik Sözleşmesi (Kısaca "Sözleşme" olarak anılacaktır);</p>
            <p>Prestigeso adresinde mukim (Kısaca <strong>"prestigeso.com.tr"</strong> olarak anılacaktır) ile adresi ve adı/soyadı "Üye Bilgileri" sahasında beyan edilen kişi (Kısaca <strong>"Üye"</strong> olarak anılacaktır) arasında aşağıdaki hüküm ve şartlar kapsamında akdedilmektedir.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-black uppercase tracking-tight mb-3">Madde 2 - Sözleşmenin Amaç ve Konusu</h2>
            <p>İşbu Sözleşme, üyenin prestigeso.com.tr tarafından sunulacak hizmetlerden yararlanmasını sağlamak amacı ile akdedilmiş olup, tarafların hak ve yükümlülüklerini tespit etmektedir.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-black uppercase tracking-tight mb-3">Madde 3 - Tanımlar</h2>
            <p className="mb-2">Aşağıda yer alan terimler işbu sözleşme kapsamında tanımlandıkları anlamlarıyla kullanılmaktadırlar:</p>
            <ul className="space-y-2 pl-4 list-disc">
              <li><strong>Üye:</strong> prestigeso.com.tr iş bu sözleşmeyi kabul ederek üyelik başvurusu yapmış ve başvurusu kabul edilmiş, sunulacak ürün/servislerden faydalanacak kişiyi,</li>
              <li><strong>E-Posta Adresi:</strong> Üyenin bildirmiş olduğu ve üye hesabına tanımlı olan, kullanımı ve gizliliği üyenin sorumluluğunda bulunan elektronik posta adresini,</li>
              <li><strong>Şifre:</strong> Üyenin sistem tarafından tanınmasını sağlayan, güvenliğinden tamamen üyenin sorumlu olduğu 6 ila 16 hane arası ibareyi,</li>
              <li><strong>Üye Hesabı:</strong> Üyelerin çeşitli ürün veya servislerden yararlanmak amacıyla kullanabileceği hesabı,</li>
              <li><strong>Ürün/Hizmet:</strong> prestigeso.com.tr üzerinden satışı yapılan malları ve sunulan servisleri,</li>
              <li><strong>Kullanıcı:</strong> Üye olup olmadığına bakılmaksızın siteyi ziyaret eden gerçek kişiyi ifade eder.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-black uppercase tracking-tight mb-3">Madde 4 - Üyelik İle İlgili Şartlar</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-black mb-1">4.1 Üyelik Başvurusu</h3>
                <p>Kabul bildirimini tıklamak suretiyle üyelik başvurusu yapan herkes, işbu sözleşmenin tüm hükümlerini okuyup kabul ettiğini beyan eder. Başvuru sırasında verilen bilgilerin doğruluğu ve hukuka uygunluğu başvuranın sorumluluğundadır. Bilgilerin gerçeğe aykırı olduğunun saptanması halinde üyelik iptal edilebilir.</p>
              </div>
              <div>
                <h3 className="font-bold text-black mb-1">4.3 Üye Hesabının Kullanılması</h3>
                <p>Her üye sadece bir hesaba sahip olabilir. Üye, hizmetleri ve hesabını hukuka ve genel ahlaka aykırı biçimde veya ticari gelir elde etmek amacıyla kullanamaz. Birden fazla üyeliği tespit edilen kullanıcının hesapları bildirimsiz sonlandırılabilir.</p>
              </div>
              <div>
                <h3 className="font-bold text-black mb-1">4.4 E-posta Adresi ve Şifre</h3>
                <p>Şifreyi koruma mükellefiyeti ve kullanımla ilgili tüm sorumluluk üyeye aittir. Şifrenin üçüncü kişilerce kullanılması nedeniyle doğacak zararlardan prestigeso.com.tr sorumlu tutulamaz.</p>
              </div>
              <div>
                <h3 className="font-bold text-black mb-1">4.5 Üye'ye Ait Kişisel Bilgiler</h3>
                <p>Üye, vermiş olduğu bilgilerin istatistiksel raporlama veya pazarlama alanında kullanılmasına muvafakat ettiğini kabul eder. prestigeso.com.tr bu bilgileri üyenin kişilik haklarına zarar vermeksizin kullanacaktır.</p>
              </div>
              <div>
                <h3 className="font-bold text-black mb-1">4.6 Üyeliğin Sonlanması</h3>
                <p>Üye, dilediği zaman tek taraflı olarak üye hesabını kapatabilir. Aynı şekilde prestigeso.com.tr de gerekli gördüğü takdirde, herhangi bir gerekçe göstermeksizin üyeliği sona erdirebilir.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-black text-black uppercase tracking-tight mb-3">Madde 5 - Hizmet İle İlgili Şartlar</h2>
            <p className="mb-2">Üye, sipariş ettiği ürün/hizmet bedeli ile kargo giderlerinin bildirdiği kredi kartından/banka kartından tahsil edileceğini kabul eder. Üye hesabı üzerinden yapılan hatalı işlemlerden münhasıran üye sorumludur.</p>
            <p>prestigeso.com.tr, sunulan hizmetlere ilişkin koşulları her zaman değiştirebilir, iptal edebilir veya yenilerini ekleyebilir.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-black uppercase tracking-tight mb-3">Madde 6 - Ek Hizmetler</h2>
            <p>Üye, kampanya ve promosyonlardan belirlenen kullanım koşulları çerçevesinde yararlanabileceğini kabul eder. Kazanılan avantajlar (indirim, hediye çeki vb.) hiçbir biçimde nakde tahvil edilemez.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-black uppercase tracking-tight mb-3">Madde 7 - Sorumluluk</h2>
            <p>prestigeso.com.tr adresinde bulunan bütün yazılı, resimli, sesli materyallerin her türlü kullanım hakkı saklıdır. Üye, bu materyalleri yazılı izin olmaksızın kullanamaz, çoğaltamaz ve dağıtamaz.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-black uppercase tracking-tight mb-3">Madde 8 - Ortak Hükümler</h2>
            <ul className="space-y-2 pl-4 list-disc">
              <li>Üyelik başvuru talebinin yapılması ve kabulü ile sözleşme yürürlüğe girer.</li>
              <li>Üye, iş bu sözleşmeden doğan hak ve yükümlülüklerini üçüncü şahıslara devredemez.</li>
              <li>İhtilafların çözümünde Türkiye Cumhuriyeti Hukuku uygulanacak olup, yetkili yargı mercii <strong>Ankara Merkez Mahkemeleri ve İcra Daireleri</strong>dir.</li>
            </ul>
            <div className="mt-6 p-5 bg-gray-50 border border-gray-200 rounded-2xl">
              <p className="text-black font-bold text-center">
                İşbu Sözleşme 8 (sekiz) maddeden ibarettir. Üye olmak isteyen kişi işbu sözleşmenin tamamını okuduğunu, içeriğindeki tüm maddeleri kayıtsız şartsız kabul ettiğini ve onayladığını kabul, beyan ve taahhüt eder.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}