import React from "react";
import { BUSINESS_INFO } from "@/lib/businessInfo";

export default function DistanceSellingContract() {
  return (
    <div className="space-y-6 text-sm text-gray-700 leading-relaxed font-medium">
      <section>
        <h3 className="font-black text-black uppercase mb-2">
          Madde 1 - Taraflar
        </h3>
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p>
            <strong className="text-black">Satıcı:</strong>{" "}
            {BUSINESS_INFO.sellerName} ({BUSINESS_INFO.brand})
          </p>
          <p>
            <strong className="text-black">İnternet sitesi:</strong>{" "}
            {BUSINESS_INFO.website}
          </p>
          <p>
            <strong className="text-black">Adres:</strong>{" "}
            {BUSINESS_INFO.address}
          </p>
          <p>
            <strong className="text-black">Telefon:</strong>{" "}
            {BUSINESS_INFO.phoneDisplay}
          </p>
          <p>
            <strong className="text-black">E-posta:</strong>{" "}
            {BUSINESS_INFO.email}
          </p>
        </div>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 2 - Konu</h3>
        <p>
          Bu sözleşme; alıcının, {BUSINESS_INFO.website} üzerinden sipariş
          verdiği ve ön bilgilendirme formunda nitelikleri ile toplam fiyatı
          gösterilen ürünlerin satışı ve teslimine ilişkin tarafların hak ve
          yükümlülüklerini, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve
          Mesafeli Sözleşmeler Yönetmeliği kapsamında düzenler.
        </p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">
          Madde 3 - Ödeme ve Teslimat
        </h3>
        <p>
          <strong className="text-black">Ödeme şekli:</strong> PayTR güvenli
          ödeme altyapısı üzerinden banka veya kredi kartı ile ödemedir. Kart
          bilgileri satıcı sistemlerinde saklanmaz.
        </p>
        <p className="mt-2">
          Bankanın sunduğu taksit, faiz ve diğer kart koşulları alıcı ile ilgili
          banka arasındaki sözleşmeye tabidir.
        </p>
        <p className="mt-2">
          <strong className="text-black">Teslimat:</strong> Sipariş, ödeme
          onayından sonra alıcının belirttiği adrese kargo ile gönderilir.
          Siparişin en geç yasal azami süre içinde teslim edilmesi esastır.
          Siparişe ait kargo bedeli, ödeme öncesinde ön bilgilendirme formunda
          ayrıca gösterilir.
        </p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">
          Madde 4 - Genel Hükümler
        </h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Alıcı; ürünlerin temel niteliklerini, satış fiyatını, tüm vergiler
            dahil toplam bedeli, ödeme ve teslimat bilgilerini siparişten önce
            okuyup elektronik ortamda onayladığını kabul eder.
          </li>
          <li>
            Ürün bedeli herhangi bir nedenle ödenmez veya ödeme iptal edilirse
            satıcının teslim yükümlülüğü doğmaz.
          </li>
          <li>
            Siparişin ifasının imkânsızlaşması halinde alıcıya mevzuattaki süre
            içinde bilgi verilir ve tahsil edilen bedel iade edilir.
          </li>
          <li>
            Ayıplı mala ilişkin seçimlik haklar ve yasal garanti hakları saklıdır.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">
          Madde 5 - Cayma Hakkı
        </h3>
        <p>
          Alıcı, malı teslim aldığı tarihten itibaren{" "}
          <strong className="text-black">14 gün içinde</strong> herhangi bir
          gerekçe göstermeden ve cezai şart ödemeden cayma hakkını kullanabilir.
          Cayma bildirimi bu süre içinde satıcının e-posta veya diğer kalıcı
          veri saklayıcısı niteliğindeki iletişim kanalına gönderilmelidir.
        </p>
        <p className="mt-2">
          Alıcı, cayma bildiriminden itibaren 10 gün içinde ürünü satıcıya geri
          gönderir. İade yöntemi ve varsa satıcının karşıladığı gönderim
          seçeneği, talep sırasında alıcıya bildirilir.
        </p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">
          Madde 6 - Cayma Hakkının İstisnaları
        </h3>
        <p>
          Cayma hakkı, Mesafeli Sözleşmeler Yönetmeliği&apos;nde sayılan
          istisnalarda kullanılamaz. Bunlara; fiyatı finansal piyasa
          dalgalanmalarına bağlı ürünler, tüketicinin isteğine göre
          kişiselleştirilen ürünler, çabuk bozulabilen ürünler ve tesliminden
          sonra ambalajı açıldığı takdirde sağlık veya hijyen açısından iadesi
          uygun olmayan ürünler dahildir.
        </p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">
          Madde 7 - Bedel İadesi
        </h3>
        <p>
          Usulüne uygun cayma bildiriminin alınmasından sonra tahsil edilen
          ödemeler mevzuatta öngörülen süre içinde ve alıcının kullandığı ödeme
          aracına uygun biçimde iade edilir. Bankanın iadeyi hesaba yansıtma
          süresi satıcının kontrolü dışındadır.
        </p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">
          Madde 8 - Uyuşmazlıkların Çözümü
        </h3>
        <p>
          Uyuşmazlıklarda, yürürlükteki parasal sınırlar dahilinde alıcının
          yerleşim yerindeki veya işlemin yapıldığı yerdeki Tüketici Hakem
          Heyetleri ile Tüketici Mahkemeleri yetkilidir.
        </p>
      </section>
    </div>
  );
}
