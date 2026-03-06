import React from "react";

export default function DistanceSellingContract() {
  return (
    <div className="space-y-6 text-sm text-gray-700 leading-relaxed font-medium">
      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 1 - Taraflar</h3>
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p><strong className="text-black">1.1. SATICI:</strong> Prestigeso.com.tr</p>
          <p><strong className="text-black">Adı/Unvanı:</strong> Hıdır Şanlı</p>
          <p><strong className="text-black">Adresi:</strong> Göztepe mah 2346 sokak no 48 bağcılar İstanbul</p>
          <p><strong className="text-black">Telefon:</strong> 0553 683 49 97</p>
        </div>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 2 - Konu</h3>
        <p>
          İşbu sözleşmenin konusu, ALICI'nın SATICI'ya ait "prestigeso.com.tr" internet alışveriş sitesinden elektronik ortamda siparişini yaptığı aşağıda nitelikleri ve satış fiyatı belirtilen ürünün satışı ve teslimi ile ilgili olarak "4077 Sayılı Tüketicilerin Korunması Hakkındaki Kanun" ve "Mesafeli Sözleşmeler Uygulama Usul ve Esasları Hakkında Yönetmelik" hükümleri gereğince tarafların hak ve yükümlülüklerinin saptanmasıdır.
        </p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 3 - Ürünün Teslimi, İfa Yeri ve Teslim Şekli</h3>
        <p><strong className="text-black">3.2. Ödeme Şekli:</strong> Havale / EFT / Kredi Kartı ile Ödeme</p>
        <p className="mt-2">
          <strong className="text-black">3.3. Vadeli Satışlar:</strong> Vadeli satışların sadece bankalara ait kredi kartları ile yapılması nedeniyle, alıcı, ilgili faiz oranlarını ve temerrüt faizi ile ilgili bilgileri bankasından ayrıca teyit edeceğini, mevzuat hükümleri gereğince faiz hükümlerinin Banka ve alıcı arasındaki sözleşme kapsamında uygulanacağını kabul eder.
        </p>
        
        <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-xl">
          <h4 className="font-black text-orange-900 uppercase mb-2">Kredi Kartına İade Prosedürü</h4>
          <p className="text-orange-800 text-xs">
            Alıcının cayma hakkını kullandığı veya siparişe konu ürünün tedarik edilememesi durumlarında; alışveriş taksitli yapılmışsa, iade tutarları Banka tarafından yine taksitli olarak alıcının hesabına aktarılır. prestigeso.com.tr, Banka ile yapmış olduğu sözleşme gereği Müşteriye nakit para ile ödeme yapamaz.
          </p>
        </div>

        <p className="mt-4"><strong className="text-black">3.4. Teslimat Şekli:</strong> Teslimat kargo şirketi aracılığı ile Alıcının belirttiği adrese elden yapılacaktır. Teslim anında alıcının adresinde bulunmaması durumunda dahi SATICI edimini tam ve eksiksiz yerine getirmiş kabul edilecektir. Kargonun bekletilmesi veya geri dönmesinden doğacak masraflar ALICI'ya aittir.</p>
        <p className="mt-2 text-xs font-bold text-gray-500">* Kargo Ücreti sipariş toplam tutarına eklenmekte olup, ürün bedeline dahil değildir.</p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 4 - Genel Hükümler</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>ALICI, sözleşmeye konu ürünlerin temel nitelikleri, satış fiyatı ve ödeme şekli ile teslimata ilişkin tüm ön bilgileri okuyup elektronik ortamda teyit ettiğini beyan eder.</li>
          <li>Sözleşme konusu ürün, yasal 30 günlük süreyi aşmamak koşulu ile ALICI veya gösterdiği adresteki kişi/kuruluşa teslim edilir.</li>
          <li>Ürünün teslimatı için işbu sözleşmenin teyit edilmesi ve bedelinin ödenmiş olması şarttır. Herhangi bir nedenle ürün bedeli ödenmezse SATICI teslim yükümlülüğünden kurtulur.</li>
          <li>Arızalı (ayıplı) ürünler garanti şartları içinde onarım için SATICI'ya gönderilebilir, kargo giderleri SATICI tarafından karşılanır.</li>
        </ul>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 5 - Cayma Hakkı</h3>
        <p>
          ALICI, sözleşme konusu ürünün kendisine tesliminden itibaren <strong className="text-black">7 gün içinde cayma hakkına</strong> sahiptir. Cayma hakkının kullanılması için SATICI'ya bildirimde bulunulması ve ürünün 6. madde hükümleri çerçevesinde kullanılmamış olması şarttır.
        </p>
        <p className="mt-2">
          İade işlemlerinin yapılabilmesi için faturanın ilgili bölümlerinin doldurulup imzalanarak tarafımıza ürünle birlikte geri gönderilmesi gerekmektedir. KKTC ve yurtdışı gönderilerinde gümrükten teslim alınmayan ürünler için cayma hakkı kullanılamaz.
        </p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 6 - Cayma Hakkı Kullanılamayacak Ürünler</h3>
        <p>
          Niteliği itibarıyla iade edilemeyecek, tek kullanımlık, hızlı bozulan veya son kullanım tarihi geçen ürünlerde cayma hakkı kullanılamaz. Ayrıca ambalajının açılmamış ve ürünün kullanılmamış olması şarttır.
        </p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 7 - Temerrüt ve İptal Hükümleri</h3>
        <p>
          Siparişin imkansızlaşması (tedarik edilememesi) durumunda SATICI, bu durumu tüketiciye bildirmeyi ve ürün bedelini iade etmeyi taahhüt eder. Mücbir sebeplerle teslimatın yapılamaması durumunda ALICI siparişi iptal edebilir veya ertelenmesini talep edebilir. İptal halinde ödenen tutar 10 gün içinde iade edilir.
        </p>
      </section>

      <section>
        <h3 className="font-black text-black uppercase mb-2">Madde 8 - Yetkili Mahkeme</h3>
        <p>
          İşbu sözleşmenin uygulanmasında, Sanayi ve Ticaret Bakanlığınca ilan edilen değere kadar Tüketici Hakem Heyetleri ile ALICI'nın veya SATICI'nın yerleşim yerindeki Tüketici Mahkemeleri yetkilidir. Siparişin gerçekleşmesi durumunda ALICI işbu sözleşmenin tüm koşullarını kabul etmiş sayılır.
        </p>
      </section>
    </div>
  );
}