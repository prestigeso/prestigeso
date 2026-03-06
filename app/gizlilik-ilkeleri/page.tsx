import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] py-16 px-4 font-sans text-[#333]">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm">
        
        {/* Üst Kısım: Başlık ve Geri Dön Butonu */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 border-b border-gray-100 pb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-black">
            Gizlilik İlkeleri
          </h1>
          <Link 
            href="/" 
            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>
        
        {/* Metin İçeriği (Jilet Gibi Formatlanmış Hali) */}
        <div className="space-y-6 text-sm md:text-base leading-relaxed text-gray-600 font-medium">
          <p>
            Bu gizlilik ilkeleri web sitemizin gizlilik konusundaki sorumluluklarının tespiti için hazırlanmıştır. Aşağıdaki maddeler web sitemizin gizlilik ilkelerini ve web sitesi üzerindeki bilgi toplama ve dağıtımı işlemlerinin kurallarını içermektedir.
          </p>
          
          <p>
            IP adresiniz sunucularımızdaki sorunların giderilmesi, internet sitemizi yönetmek, alışveriş sepetinizi tanımak ve açık demografik bilgilerinizin toplanması için kullanılır.
          </p>
          
          <p>
            Sitemizde alışveriş sepetinizin takibi ve aynı reklamların art arda görülmesinin engellenmesi için cookielerden (çerezlerden) yararlanılmaktadır. Cookielerden size ilgi alanlarınız doğrultusunda içerik sunulması ve tekrar tekrar şifre girmemeniz için şifrenizin saklanması gibi konularda yararlanılmaktadır. 18 yaşından küçüklerin web sitemize, velileri veya vasilerinden izin almaksızın bilgi sunmalarından web sitemiz sorumlu tutulamaz.
          </p>
          
          <p>
            Sitemizin kayıt formunda, kullanıcılarımız iletişim bilgilerini (isim, adres, telefon, mail adresi vb.) girmelidir. Bu formda aldığımız iletişim bilgileri; üyelerimize, firmamız ve tarafımızca belirlenen firmalar hakkında bilgi, kampanya haberleri ve materyallerini göndermek için kullanılır. İletişim bilgileri ayrıca kullanıcılarımızla iletişime geçmemiz gerektiğinde kullanılır ve kullanıcımızla iletişime geçmek isteyen diğer firmalarla paylaşılır. 
          </p>
          
          <p>
            Kullanıcılarımız isteklerine bağlı olarak sistemimizden kayıtlarını sildirebilir. Alınan finansal bilgiler, satın alınan ürün ve hizmetlerin bedelinin tahsil edilmesinde ve diğer gerek duyulan durumlarda kullanılır. Kişiye özel bilgiler, kullanıcılarımızın sisteme girişlerinde ve diğer gerektiği durumlarda kişinin kimliğinin doğrulanmasında kullanılır. 
          </p>
          
          <p>
            İstatistiki bilgiler ve profil bilgileri ayrıca sitemizin içinde de toplanarak istenilen tüm durumlarda kullanılır. Bu bilgiler ziyaretçi hareketlerinin izlenmesi, kişiye özel içerik sağlanması durumlarında kullanılır.
          </p>

          {/* Müşteriye Güven Veren Vurgulu Kısım */}
          <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl mt-8">
            <p className="text-black font-bold text-center">
              🔒 Kullanıcı bilgileriniz gizli tutulup 3. şahıslarla paylaşımı yapılmayacaktır.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}