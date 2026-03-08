import React from "react";

export default function MembershipAgreement() {
  return (
    <div className="space-y-6 text-sm text-gray-700 leading-relaxed font-medium">
      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 1 - Taraflar</h3>
        <p>İşbu Üyelik Sözleşmesi (Kısaca "Sözleşme" olarak anılacaktır);</p>
        <p>Prestigeso adresinde mukim (Kısaca "prestigeso.com.tr" olarak anılacaktır) ile Adresi ve adı/soyadı "Üye Bilgileri" sahasında beyan edilen kişi (Kısaca Üye olarak anılacaktır) arasında aşağıdaki hüküm ve şartlar kapsamında akdedilmektedir.</p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 2 - Sözleşmenin Amaç ve Konusu</h3>
        <p>İşbu Sözleşme, üyenin prestigeso.com.tr tarafından sunulacak hizmetlerden yararlanmasını sağlamak amacı ile akdedilmiş olup, tarafların hak ve yükümlülüklerini tespit etmektedir.</p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 3 - Tanımlar</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Üye:</strong> prestigeso.com.tr iş bu sözleşmeyi kabul ederek üyelik başvurusu yapmış ve başvurusu kabul edilmiş kişiyi,</li>
          <li><strong>E-Posta Adresi:</strong> Üyenin bildirmiş olduğu ve üye hesabına tanımlı olan elektronik posta adresini,</li>
          <li><strong>Şifre:</strong> Üyenin sistem tarafından tanınmasını sağlayan 6 ila 16 hane arası ibareyi,</li>
          <li><strong>Üye Hesabı:</strong> Üyelerin çeşitli ürün veya servislerden yararlanmak amacıyla kullanabileceği hesabı,</li>
          <li><strong>Ürün/Hizmet:</strong> prestigeso.com.tr üzerinden satışı yapılan malları,</li>
          <li><strong>Kullanıcı:</strong> Üye olup olmadığına bakılmaksızın siteyi ziyaret eden gerçek kişiyi ifade eder.</li>
        </ul>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 4 - Üyelik İle İlgili Şartlar</h3>
        <div className="space-y-4">
          <p><strong>4.1 Üyelik Başvurusu:</strong> İlgili kabul bildirimini tıklamak suretiyle üyelik başvurusu yapan herkes, işbu sözleşmenin tüm hükümlerini okuyup kabul ettiğini beyan eder. Verilen bilgilerin hukuka ve gerçeğe aykırı olduğunun saptanması halinde üyelik iptal edilebilir.</p>
          <p><strong>4.2 Üyelik Başlangıcı:</strong> Üyeliği başlatılan kullanıcıya teyit bildirimi gönderilir.</p>
          <p><strong>4.3 Üye Hesabının Kullanılması:</strong> Her üye sadece bir üye hesabına sahip olabilir. Üye, hesabı hukuka aykırı, başkalarını rahatsız edici veya ticari gelir elde etmek amaçlarıyla kullanamaz.</p>
          <p><strong>4.4 E-posta adresi ve şifre:</strong> Şifreyi koruma mükellefiyeti üyeye aittir. Üçüncü şahıslarca kullanımından doğacak zararlardan prestigeso.com.tr sorumlu değildir.</p>
          <p><strong>4.5 Kişisel Bilgiler:</strong> Üye, vermiş olduğu bilgilerin istatistiksel raporlama veya pazarlama alanında kullanılmasına muvafakat ettiğini kabul eder.</p>
          <p><strong>4.6 Üyeliğin Sonlanması:</strong> Üye, dilediği zaman hesabını kapatabilir. prestigeso.com.tr gerekli gördüğü takdirde üyeliği sona erdirebilir.</p>
        </div>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 5 - Hizmet İle İlgili Şartlar</h3>
        <p>Üye, sipariş ettiği ürün/hizmet bedeli ile kargo giderlerinin bildirdiği kredi kartından tahsil edileceğini kabul eder. Hatalı işlem yapılması halinde prestigeso.com.tr'nin hukuki sorumluluğu yoktur.</p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 6 - Ek Hizmetler</h3>
        <p>Üye, kampanya ve promosyonlardan yararlanabileceğini kabul eder. Kazanılan avantajlar hiçbir biçimde nakde tahvil edilemez.</p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 7 - Sorumluluk</h3>
        <p>prestigeso.com.tr adresinde bulunan bütün materyallerin kullanım hakkı saklıdır. Üye, bu materyalleri yazılı izin olmaksızın kullanamaz, dağıtamaz.</p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 8 - Ortak Hükümler</h3>
        <p>Taraflar işbu sözleşmenin tatbikinden doğacak ihtilafların çözümünde Türkiye Cumhuriyeti Hukuku'nun uygulanacağını, yetkili merciin Ankara Merkez Mahkemeleri ve İcra Daireleri olduğunu kabul ederler.</p>
        <p className="mt-4 font-bold text-black border-t border-gray-200 pt-4">İşbu Sözleşme 8 (sekiz) maddeden ibarettir. Üye olmak isteyen kişi işbu sözleşmenin tamamını okuduğunu, kayıtsız şartsız kabul ettiğini beyan ve taahhüt eder.</p>
      </section>
    </div>
  );
}