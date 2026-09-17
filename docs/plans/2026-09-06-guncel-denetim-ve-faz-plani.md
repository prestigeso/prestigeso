# PrestigeSO
## Güncel denetim ve uygulanabilir gelişim planı

6 Eylül 2026 | Canlı mağaza + mevcut kaynak kod | Karar raporu

### Ana sonuç

Mağazanın temel alışveriş arayüzü çalışıyor; ancak tasarım büyütülmeden önce kapatılması gereken işlem riskleri var. Özellikle aynı iade talebinin tekrar işlenmesi, sağlayıcı cevabı belirsizken yeniden para iadesi ve admin onayında İptal seçiminin işlemi durdurmaması Faz 0'ın ilk işleri olmalı. Testlerin geçmesi bu iş mantığı sorunlarının bulunmadığı anlamına gelmiyor.

Bu rapor uygulama onayı değil, mevcut duruma dayalı teslimat planıdır. Bu incelemede uygulama kodu, sipariş/stok verileri, ödeme modu veya admin parolası değiştirilmedi; commit, push ve deploy yapılmadı. Yerelde önceden bulunan ikon çalışması ve diğer değişiklikler korundu.

### Korunan kararlar

- Önce Faz 0: hata, güvenlik ve işlem güvenilirliği. Sonra Faz 1: ayrıntılı işletmeci analitiği.
- Faz 2 rafta: Meta, reklam atfı, finans/maliyet, Search Console panel entegrasyonu ve aynı adminden Trendyol sipariş yönetimi. Şimdilik entegrasyon yapılmayacak.
- Faz 3 genel mağaza ve mevcut işlem e-postaları; Faz 4 premium kategori ve ürün pilotu; Faz 5 admin ile sürdürülebilir içerik yönetimi; Faz 6 kontrollü yaygınlaştırma.
- Ek Faz ana işler tamamlandıktan sonra değerlendirilecek. Yedek, ödeme güvenliği ve temel erişim kontrolleri isteğe bağlı ek özelliklere bırakılmayacak.
- Sunucu satın alma/taşıma, kargo API'si ve yeni otomatik müşteri pazarlama bildirimleri kapsam dışı. Mevcut OTP, sipariş, teslim ve PDF fatura e-postalarının iyileştirilmesi kapsamda.

### Rapor nasıl okunmalı?

Kritik: mali işlem veya önemli operasyon kaybı riski. Orta: sepet, veri doğruluğu, gizlilik tercihi, erişilebilirlik veya keşif sorunu. Düşük: işlevi engellemeyen sunum iyileştirmesi. Kod bulgusu, canlı gözlem ve henüz doğrulanmamış kontrol birbirinden ayrılmıştır. Bir kod yolu için olası etki göstermek, canlıda o kaybın yaşandığını iddia etmek değildir.

Sürüm notu: Bu belge önceki 4 Eylül araştırma planının güncel faz sırasının yerini alır. Eski araştırma ve video notları tarihsel başvuru olarak kalır; bu turda bütün Instagram videoları yeniden izlenmiş gibi bir iddia yoktur.

<!-- PAGE -->

# 01 / Bugün ne doğrulandı?
## Çalışan temel, sınırları belli testler

### Yerel kod kontrolü

- npm test: 50/50 test geçti. Bunların önemli bölümü kaynak sözleşmesi/regresyon testidir; canlı veritabanı ve PayTR işlemlerini uçtan uca çalıştırmaz.
- TypeScript kontrolü, ESLint ve production build geçti. Build çıktısında 66 route üretimi tamamlandı; bunların hepsi statik sayfa değildir.
- npm audit --omit=dev: tarama anında üretim bağımlılıklarında bilinen açık raporlanmadı. Bu sonuç özel iş mantığı, konfigürasyon veya sıfır-gün açığı garantisi değildir.
- İncelenen checkout: main, HEAD fd9f3e7. Yerel ikon/manifest/layout ve rapor dosyaları commit edilmemiş durumda.

### Canlı tarayıcı matrisi

Masaüstü Chromium, Android Pixel 7 profili ve iPhone 14/WebKit profili ile sekizer sayfa kontrol edildi: ana sayfa, Erkek Kolye listesi, ürün 377, boş ödeme, giriş, sipariş takip, iletişim ve hakkımızda. 24 sayfa kontrolü HTTP 200 verdi; örneklenen görünümde yatay taşma, yüklenmiş görsellerde kırık görsel veya yakalanan JavaScript hatası yoktu. Üç profilde de ürün sepete eklendi ve ödeme özetinde bir ürün satırı görüldü.

Bu test fiziksel Android/iPhone testi değildir. WebKit motoru kullanıldı; cihazın gerçek Safari uygulaması, banka uygulamasına geçiş veya mobil klavye senaryolarının tümü denenmedi. Görsel kontrol bütün katalogdaki bütün resimleri kapsamaz.

### İşlem oluşturmadan yapılan otomatik kontroller

Otomatik test tarayıcısındaki GET dışı istekler engellendi; sayaç istekleri yerel yanıtla bastırıldı. Sepet yalnız test tarayıcısında tutuldu. OTP, kart girişi, ödeme token'ı, canlı sipariş, iade veya müşteriye e-posta oluşturulmadı. Ayrı normal görsel gezintinin olağan ziyaret sayacına yansıması mümkündür. Admin dashboard, analysis, returns ve account endpoint'leri anonim GET isteklerini 401 ile reddetti. Bu dört kontrol bütün yetki matrisi testi değildir.

robots.txt ve sitemap.xml erişilebilir; sitemap örneğinde 211 URL var. Bu, URL'lerin Google'da indekslendiğini kanıtlamaz. PayTR/Supabase/Resend hesap ayarları, canlı RLS/migration durumu, DNS e-posta kayıtları, yedekten dönüş ve gerçek finans mutabakatı bu turda doğrulanmadı.

Kanıt: [Tarayıcı kontrol kaydı](C:/Users/beytu/Desktop/PrestigeSO/tmp/audit-20260906/live-results.json), [HTTP kontrol kaydı](C:/Users/beytu/Desktop/PrestigeSO/tmp/audit-20260906/http-results.json). Bunlar 6 Eylül anlık görüntüsüdür; sonraki deploy sonuçları değiştirebilir.

<!-- PAGE -->

# 02 / Canlı tasarımın durumu
## Çalışıyor, fakat premium his tutarlı değil

![Canlı masaüstü ürün sayfası](C:/Users/beytu/Desktop/PrestigeSO/tmp/audit-20260906/desktop-product.png)

### Gözlenen deneyim

Siyah-beyaz marka dili ve ürün fotoğrafları iyi bir başlangıç. Buna karşılık uzun ürün adı masaüstünde büyük harflerle çok satır kaplıyor. Kart adları, açıklama, teknik özellik ve SEO başlığı aynı uzun metne yüklenmiş. Görsel başlık ile arama motoru başlığını ayırmak; malzeme, ölçü ve zincir uzunluğunu ayrı kısa bilgi alanlarına taşımak daha okunur olur. Bu bir tasarım önerisidir, satış artışı garantisi değildir.

Mobil kategoride başlık, arama ve açık filtre paneli ilk ekranın büyük bölümünü kaplıyor; WebKit örneğinde ürün kartları ilk görünümün dışında kalıyor. Kompakt kategori başlığı, aktif filtre özeti ve açılır filtre paneli Faz 3'e alınmalı. Kategori seçili olmasına rağmen görünen başlık ve sayfa başlığı Tüm Ürünler kalıyor; kategori kimliği güçlendirilmeli.

### Orta / P0-UI: Ürün geri düğmesi ile menü örtüşüyor

iOS/WebKit görüntüsünde sol üstte geri düğmesi hamburgerin üzerine geliyor. Ürün geri düğmesi absolute top-4/left-4/z-50; global Navbar da sticky top-0/z-50. Görsel bulgu ile kaynak yerleşimi uyumlu. Önce tek, erişilebilir mobil başlık alanı ve doğru tıklama hedefi; kapsamlı tasarım daha sonra.

Kabul: 390-412 px aralığında geri ve menü eylemleri birbirini örtmez; doğru öğe dokunmayı alır; klavye odağı görünür; ürün ve kategori arasında geri dönüş çalışır.

Kod: [ProductDetailClient.tsx:414](C:/Users/beytu/Desktop/PrestigeSO/components/product/ProductDetailClient.tsx:414), [ProductDetailClient.tsx:418](C:/Users/beytu/Desktop/PrestigeSO/components/product/ProductDetailClient.tsx:418), [Navbar.tsx:102](C:/Users/beytu/Desktop/PrestigeSO/components/Navbar.tsx:102). Canlı referans: [Ürün 377](https://www.prestigeso.com.tr/product/377).

<!-- PAGE -->

# 03 / Faz 0 - Para iadesi
## Önce finansal eylemler güvenilir olmalı

### Kritik / P0-01: Aynı talep tekrar para iadesi oluşturabilir

İki admin PATCH isteği aynı pending iade talebini okuyabilir. pending → approved güncellemesinin etkilenen satır sayısı kontrol edilmediği için sıfır satır güncelleyen istek de refundOrder'a geçer. Sipariş seviyesinde kilit mevcut; fakat talep kimliği bazında tamamlanmış finansal işlem kontrolü yok. İkinci yürütme ilk kısmi iadenin kilidi açıldıktan sonra ilerlerse kalan tutar elverdiği ölçüde aynı talep tekrar iade edilebilir. Kaybeden isteğin talebi pending'e geri açması da kazananı etkileyebilir.

Çözüm: talep/finansal işlem bazlı tekil kimlik ve kalıcı durum makinesi; yalnız atomik claim kazananının sağlayıcıya gitmesi; aynı talep tekrarında önceki sonucun dönmesi. Stok iadesi zaten talep bazında tekilleştiriliyor; bu koruma para iadesinin yerine geçmez.

Kabul: aynı talebe eşzamanlı ve ardışık tekrarlar tek sağlayıcı işlemi üretir; kilit yarışını kaybeden başka işlemin durumunu değiştirmez. Sağlayıcı çağrısı kontrollü sahte servisle sayılır.

Kod: [returns/route.ts:104](C:/Users/beytu/Desktop/PrestigeSO/app/api/admin/returns/route.ts:104), [returns/route.ts:116](C:/Users/beytu/Desktop/PrestigeSO/app/api/admin/returns/route.ts:116), [refundOrder.ts:96](C:/Users/beytu/Desktop/PrestigeSO/lib/paytr/refundOrder.ts:96).

### Kritik / P0-02: Belirsiz sağlayıcı cevabında tehlikeli tekrar

Bağlantı/cevap okuma/JSON ayrıştırma hatasında refund_started_at temizleniyor. PayTR işlemi uygulamış, yalnız yanıt kaybolmuş olabilir. Bu dalda talep yeniden açılıp tekrar iade gönderilebilir. Başarılı cevap sonrası DB kayıt hatasında kilidi koruyan mevcut davranış, belirsiz cevap dalında da güvenli bir durumla tamamlanmalı.

Çözüm: unknown/reconciliation_required durumu; sağlayıcı doğrulanmadan otomatik tekrar yok. İşlem referansı ve sonuç kaydı eklenmeli. PayTR reference_no alanı izlenebilirlik sunuyor; resmî belgede tek başına idempotency garantisi verilmediğinden otomatik çift-iade önleyici olarak varsayılmamalı.

Kabul: sağlayıcı iadeyi uygular ama cevap kaybolursa ikinci POST gönderilmez; operatöre tutar ve belirsizlik görünür. Kod: [refundOrder.ts:137](C:/Users/beytu/Desktop/PrestigeSO/lib/paytr/refundOrder.ts:137), [refundOrder.ts:145](C:/Users/beytu/Desktop/PrestigeSO/lib/paytr/refundOrder.ts:145), [returns/route.ts:133](C:/Users/beytu/Desktop/PrestigeSO/app/api/admin/returns/route.ts:133). Kaynak: [PayTR İade API](https://dev.paytr.com/iade-api).

### Kritik / P0-03: İptal seçimi onayı durdurmuyor

İki prompt çağrısındaki null değeri boş metne çevriliyor; onReturnDecision approve çağrısı yine çalışıyor. İptal ederek vazgeçtiğini düşünen yönetici finansal işlem başlatabilir. Her iptal dalında çıkılmalı; sipariş, satır, miktar, tutar ve stok sonucu gösteren son onay kullanılmalı.

Kabul: her iki adımda İptal / Escape sıfır finansal istek üretir. Kod: [OrdersModal.tsx:437](C:/Users/beytu/Desktop/PrestigeSO/components/admin/modals/OrdersModal.tsx:437).

<!-- PAGE -->

# 04 / Faz 0 - Ödeme sürekliliği
## Başarı, belirsizlik ve kısmi işlem ayrı durumlar

### Kritik operasyon riski / P0-04: Geç başarılı ödeme çözümsüz kalabilir

Doğrulanmış başarılı callback, siparişte stock_released_at varsa 409 ile reddediliyor. Rezervasyon süresi dolan pending sipariş failed yapılırken maintenance mutabakat seçimi paid/partially_refunded/refunded ile sınırlı. Böyle bir geç ödeme gelirse mevcut otomatik yol kaydı toparlamıyor. Bu turda canlıda böyle bir ödeme yaşandığı doğrulanmadı.

Çözüm: süresi dolan fakat sonucu henüz kesin olmayan girişimleri de kapsayan mutabakat; geç başarılı ödeme istisna kuyruğu; stok yeniden ayrılabiliyorsa kontrollü tamamlama, ayrılamıyorsa operatörün kontrollü çözümü. Stok yokken sessizce paid yapmak veya otomatik ikinci ödeme başlatmak çözüm değildir.

Kabul: rezervasyon bırakıldıktan sonra geç/tekrarlı başarı bildirimi para kaydını kaybetmez, stok eksiye düşmez; admin çözüm bekleyen işlemi görür. Normal callback ve imza/tutar kontrolleri bozulmaz.

Kod: [callback/route.ts:234](C:/Users/beytu/Desktop/PrestigeSO/app/api/paytr/callback/route.ts:234), [maintenance/route.ts:35](C:/Users/beytu/Desktop/PrestigeSO/app/api/maintenance/route.ts:35), [order_payment_integrity.sql:173](C:/Users/beytu/Desktop/PrestigeSO/supabase/migrations/20260713180000_order_payment_integrity.sql:173).

### Orta / P0-05: İlk kısmi iade sonrası kalan satırlar kilitleniyor

İade kodu siparişi partially_refunded / Kısmi İade yapıyor. Yeni müşteri talebi ise yalnız paid ve teslim edilmiş sipariş kabul ediyor; DB fonksiyonu önceki talep varlığını da engel kabul ediyor. Genel iade yolu kayıtlı talep isterken admin karar yolu yalnız pending talepleri kabul ediyor. Böylece kalan ürünler için tamamlanabilir normal akış kalmıyor.

Çözüm: satır ve varyant bazında alınan, önceki taleplere ayrılan, iade edilmiş ve hâlâ iade edilebilir miktarların tek sözleşmesi. Bir sipariş altında birden fazla ayrı talep; toplam para ve stok sınırları korunmalı. Kupon, kargo ve kısmi iade tutarı dağıtımı açık işletme kuralına bağlanmalı.

Kabul: iki ürünlü siparişte önce bir ürün, sonra diğeri iade edilebilir; aynı birim iki talebe ayrılamaz; toplam iade tahsilatı aşmaz.

Kod: [refundOrder.ts:54](C:/Users/beytu/Desktop/PrestigeSO/lib/paytr/refundOrder.ts:54), [refundOrder.ts:174](C:/Users/beytu/Desktop/PrestigeSO/lib/paytr/refundOrder.ts:174), [orders/action/route.ts:94](C:/Users/beytu/Desktop/PrestigeSO/app/api/orders/action/route.ts:94), [privacy_hardening.sql:528](C:/Users/beytu/Desktop/PrestigeSO/supabase/migrations/20260823143000_api_db_privacy_hardening.sql:528), [privacy_hardening.sql:556](C:/Users/beytu/Desktop/PrestigeSO/supabase/migrations/20260823143000_api_db_privacy_hardening.sql:556).

### Zaten bulunan korumalar korunacak

Admin doğrulaması ve güvenilir mutation origin kontrolü, sipariş iade kilidi, tutar üst sınırı, tam iade tekrar koruması, callback imza/tutar kontrolü ve stok iadesi tekilleştirmesi mevcut. Bulgu listesi herkesin iade yapabildiği veya stoğun kesin iki kez arttığı şeklinde okunmamalı. Manuel mutabakat ekranı da mevcut; ihtiyaç, istisnaların güvenli çözümünü tamamlamak.

<!-- PAGE -->

# 05 / Faz 0 - Sepet ve katalog
## Ağ hatası ürün yokluğu gibi davranmamalı

### Orta / P0-06: Geçici varyant sorgusu hatası sepet satırını silebilir

CartContext varyant sorgusunun hatasını kontrol etmeden boş veriyle devam ediyor. Varyant bulunamadığında satır kaldırılıyor ve yeni sepet kalıcı olarak kaydediliyor. Servis kesintisi gerçek ürün kaldırılmasıyla karıştırılıyor.

Çözüm: veri doğrulanamadı durumunda son sepeti koru; satın alma öncesi yeniden doğrulama iste. Gerçek pasif/silinmiş varyant ile ağ/izin/sunucu hatasını ayır. Kabul: tek geçici sorgu hatası ve sayfa yenilemesi ürün satırını silmez; tekrar deneme iyileşir; gerçekten kaldırılmış ürün açıklanır.

Kod: [CartContext.tsx:147](C:/Users/beytu/Desktop/PrestigeSO/context/CartContext.tsx:147), [CartContext.tsx:168](C:/Users/beytu/Desktop/PrestigeSO/context/CartContext.tsx:168), [CartContext.tsx:238](C:/Users/beytu/Desktop/PrestigeSO/context/CartContext.tsx:238).

### Orta / P0-07: Varyant yükleme ile satın alma arayüzü yarışıyor

Ön yüklenmiş ürün varken varyantlar başlangıçta boş; varyant sorgusu bitmeden varyantsız ürün gibi sepete ekleme yolu açılabilir. Sunucu varyantı zorunlu tuttuğu için ödeme API'si bunu reddeder; bu bir doğrulama atlama açığı değil, sonradan reddedilen hatalı sepet deneyimidir. Ayrıca varyant seçilmeden stok sıfır hesaplanıp TÜKENDİ yazısı gösterilebiliyor.

Çözüm: varyant bilgisi yükleniyor / hata / seçilmeli / tükendi durumları ayrı. Kabul: geciktirilmiş varyant cevabında yanlış satır eklenmez; stoklu seçenek varken seçim öncesi tükendi denmez; API koruması aynen kalır.

Kod: [useProductDetailData.ts:52](C:/Users/beytu/Desktop/PrestigeSO/hooks/useProductDetailData.ts:52), [useProductDetailData.ts:101](C:/Users/beytu/Desktop/PrestigeSO/hooks/useProductDetailData.ts:101), [ProductDetailClient.tsx:185](C:/Users/beytu/Desktop/PrestigeSO/components/product/ProductDetailClient.tsx:185), [ProductDetailClient.tsx:618](C:/Users/beytu/Desktop/PrestigeSO/components/product/ProductDetailClient.tsx:618), [create-token/route.ts:835](C:/Users/beytu/Desktop/PrestigeSO/app/api/paytr/create-token/route.ts:835).

### Orta / P0-08: Fiyat filtresi ve sıralaması görünen fiyatla uyuşmuyor

Liste sorgusu temel price alanını kullanırken kartta etkin indirimli fiyat gösteriliyor. İndirimli ürün fiyat aralığından yanlış elenebilir veya sıralamada yanlış konumda olabilir. Bu, geçmişte düzeltilen ödeme indirimi sorununun hâlâ var olduğu iddiası değildir; sorun listeleme sözleşmesidir.

Çözüm: kampanya tarihleri ve varyant fiyatını dikkate alan ortak etkin fiyat tanımı. Filtre, sıra, kart, detay, sepet, ödeme ve JSON-LD aynı kurala dayanmalı. Kabul: normal, aktif, gelecekteki ve bitmiş indirim örnekleriyle sıralama ve aralık sonuçları doğrulanır.

Kod: [shop/page.tsx:119](C:/Users/beytu/Desktop/PrestigeSO/app/shop/page.tsx:119), [ShopClient.tsx:410](C:/Users/beytu/Desktop/PrestigeSO/components/storefront/ShopClient.tsx:410).

<!-- PAGE -->

# 06 / Faz 0 - Hata ve izin davranışı
## Kullanıcıya doğru durum gösterimi

### Orta / P0-09: Katalog hatası boş mağaza gibi gösteriliyor

Ürün sorgusu başarısız olduğunda hata yerine boş ürün listesi/sıfır sonuç yolu kullanılıyor. Kullanıcı bulunamadı ile yüklenemedi ayrımını göremiyor. Gerçek satış kaybı ölçülmedi; hata dalının yanlış temsil edilmesi kaynakta görülüyor.

Çözüm: son başarılı sonuç mümkünse korunsun; ayrı hata mesajı, tekrar deneme ve anonim hata kimliği olsun. Kabul: Supabase hata cevabında Ürün bulunamadı yazılmaz; veri düzelince URL filtreleri kaybolmadan yüklenir. Kod: [shop/page.tsx:163](C:/Users/beytu/Desktop/PrestigeSO/app/shop/page.tsx:163), [ShopClient.tsx:343](C:/Users/beytu/Desktop/PrestigeSO/components/storefront/ShopClient.tsx:343).

### Orta / P0-10: Mahalle isteğinde yarış ve kurtarma eksik

İlçe değiştikçe yapılan asenkron mahalle isteğinde eski cevabı dışlama/iptal ve belirgin hata-tekrar deneme yolu eksik. Hızlı ilçe değişiminde önceki ilçenin daha geç gelen sonucu ekrana taşınabilir; servis arızası boş seçenek gibi kalabilir.

Çözüm: seçili il/ilçeye bağlı istek kimliği veya iptal; alt alanları sıfırla; boş sonuç ile servis hatasını ayır. Kabul: ters sırada dönen iki cevapta yalnız son seçimin mahalleleri görünür. Kod: [checkout/page.tsx:458](C:/Users/beytu/Desktop/PrestigeSO/app/checkout/page.tsx:458), [CheckoutAddressModal.tsx:220](C:/Users/beytu/Desktop/PrestigeSO/components/checkout/CheckoutAddressModal.tsx:220).

### Orta / P0-11: Sayaçlar analitik tercihiyle tutarlı değil

Çerez arayüzü analitik/pazarlama için açık onay anlatıyor; ana sayfa ve ürün sayacı tetikleyicileri analitik tercihini kontrol etmiyor. API'nin yalnız zaman/ürün sayması davranış sözleşmesi tutarsızlığını ortadan kaldırmaz. Bu rapor mevcut tüm veri işlemlerini hukuken sınıflandırmaz; yeni takip için açık ve doğrulanmış izin sözleşmesi gerekir.

Çözüm: veri kategorileri, amaç, saklama, izin reddi/geri alma ve anonim güvenlik telemetrisi ayrımı. Gereksiz veriyi toplama; IP'yi kalıcı kişi kimliği yapma. Kabul: red, kabul ve geri alma senaryolarında ağ kaydı beklenen davranışı gösterir; tercih yokken yeni davranış olayları gönderilmez.

Kod: [HomeClient.tsx:106](C:/Users/beytu/Desktop/PrestigeSO/components/storefront/HomeClient.tsx:106), [useProductDetailData.ts:33](C:/Users/beytu/Desktop/PrestigeSO/hooks/useProductDetailData.ts:33), [consent.ts:9](C:/Users/beytu/Desktop/PrestigeSO/lib/legal/consent.ts:9).

### Orta / P0-12: Ödeme diyaloglarında erişilebilirlik borcu

Adres, sözleşme ve OTP diyalogları için adlandırılmış dialog semantiği, başlangıç odağı, odak sınırı ve kapanınca odağı geri verme tek sözleşmeyle tamamlanmalı. Görselde açılmaları klavye/ekran okuyucu akışını kanıtlamaz. Kabul: yalnız klavye ile aç-kullan-kapat; odağın arka sayfaya kaçmaması; mobil klavyede ana eylemin erişilebilir kalması.

Kod: [checkout/page.tsx:1175](C:/Users/beytu/Desktop/PrestigeSO/app/checkout/page.tsx:1175), [CheckoutAddressModal.tsx:87](C:/Users/beytu/Desktop/PrestigeSO/components/checkout/CheckoutAddressModal.tsx:87), [CheckoutContractModal.tsx:35](C:/Users/beytu/Desktop/PrestigeSO/components/checkout/CheckoutContractModal.tsx:35). Fiziksel cihaz/ekran okuyucu doğrulaması uygulama sonrasının çıkış koşuludur.

<!-- PAGE -->

# 07 / Faz 0 - SEO ve marka
## Temel teknik SEO, ertelenen panel entegrasyonundan ayrı

### Orta / P0-13: Canonical ve indeksleme politikası karışıyor

Canlıda iletişim, hakkımızda, sipariş takip ve birçok bilgilendirme sayfası ana sayfa canonical'ını miras alıyor. /shop?page=2 ise /shop'a canonical veriyor. Erkek Kolye filtresi ayrı kategori başlığı/metadata üretmiyor. Ödeme sonuç ve parola güncelleme gibi fayda sayfalarının indeksleme politikası da açıklaştırılmalı. Giriş için noindex gözlendi; bütün sayfalar aynı durumda değildir.

Çözüm: indekslenmesi istenen her gerçek içerik sayfasına doğru kendi URL'si; kategori landing sayfaları ve filtre/arama varyasyonları için ayrı strateji; ödeme, hesap, takip sonucu ve token içeren yüzeylerde uygun noindex/referrer yaklaşımı. www / çıplak alan adı yönlendirme ve canonical birlikte doğrulanmalı; sırf www farklı diye tek başına hata denmemeli.

Kabul: rota matrisi için başlık, canonical, robots ve sitemap beklentisi test edilir; sayfalama URL'leri gerçekten farklı sayfaysa ilk sayfaya canonical verilmez. Google'ın sayfalama rehberi de her sayfanın kendi canonical URL'sini önerir.

Kod: [layout.tsx:14](C:/Users/beytu/Desktop/PrestigeSO/app/layout.tsx:14), [shop/layout.tsx:3](C:/Users/beytu/Desktop/PrestigeSO/app/shop/layout.tsx:3). Kaynak: [Google sayfalama rehberi](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading).

### Orta / P0-14: Yapısal veri etkin fiyat sözleşmesini izlemiyor

Ürün JSON-LD ortak fiyat yardımcısını kullanıyor, fakat ona yalnız ana ürün fiyatını ve sabit indirimi iletiyor; aktif kampanya ve varyant verisini getirmiyor. Seçilen canlı ürün 377'de 1.000 TL ekran ve JSON-LD uyumlu; sorun bu örnekte yanlış fiyat görüldüğü değil, kampanyalı/varyantlı durumlarda farklılaşabilecek kod yoludur.

Çözüm ve kabul: sunucu tarafında aynı fiyat/stok projeksiyonu; bitmiş/gelecek kampanya ve varyant örneklerinde ekrandaki satın alınabilir teklif ile JSON-LD tutarlı. Kod: [product/layout.tsx:82](C:/Users/beytu/Desktop/PrestigeSO/app/product/[id]/layout.tsx:82).

### Orta / P0-15: Yeni marka ikonları henüz canlı değil

Canlı favicon dosyası 25.931 bayt ve SHA-256 özeti Git HEAD'deki eski dosyayla birebir aynı; yerel yeni dosyayla farklı. Canlı manifest de hâlâ /logo.jpeg için sizes:any kullanıyor. Bu nedenle sorun yalnız Google önbelleği diye açıklanamaz: önce hazırlanan dosyaların doğru deployment'a çıkması gerekir.

Kabul: onaylı yayın sonrası canlı favicon/Apple/manifest dosyaları yeni sürümle eşleşir; ardından arama motorunun yeniden taraması beklenir. Google görünümünün anında değişmesi veya mutlaka ikon göstermesi garanti değildir. Kod: [favicon.ico](C:/Users/beytu/Desktop/PrestigeSO/app/favicon.ico), [manifest.json](C:/Users/beytu/Desktop/PrestigeSO/public/manifest.json), [brand-icons.test.ts](C:/Users/beytu/Desktop/PrestigeSO/tests/brand-icons.test.ts). Kaynak: [Google favicon rehberi](https://developers.google.com/search/docs/appearance/favicon-in-search?hl=en).

<!-- PAGE -->

# 08 / Faz 0 - Mail ve operasyon
## Tasarımdan önce doğru kişiye, doğru işlem

### Orta / P0-16: Fatura alıcısı siparişten doğrulanmıyor

Admin fatura endpoint'i istekten gelen orderId, email ve customerName ile mail gönderiyor; sunucuda sipariş-alıcı eşleşmesini sorgulamıyor. Admin doğrulaması, PDF tür/boyut ve imza kontrolü var; bu anonim açık mail servisi değildir. Ancak yanlış veya değiştirilmiş alanlar yanlış sipariş/faturanın yanlış alıcıya gönderilmesine izin verebilir.

Çözüm: siparişi sunucuda getir; alıcı ve görünen sipariş numarasını güvenilir kayıttan türet; değiştirme gerekiyorsa ayrı yetkili ve kaydedilen onay; PDF'yi siparişe bağla; gönderim kimliği/sonucu tut. Kabul: başka alıcı/metin gönderilerek varsayılan alıcı değiştirilemez; yanlış sipariş/PDF eşleşmesi yöneticiye açıkça gösterilir; tekrar tıklama kontrolsüz çift mail oluşturmaz.

Kod: [invoice/route.ts:24](C:/Users/beytu/Desktop/PrestigeSO/app/api/admin/orders/invoice/route.ts:24), [invoice/route.ts:62](C:/Users/beytu/Desktop/PrestigeSO/app/api/admin/orders/invoice/route.ts:62). Mail görseli: [InvoiceEmail.tsx:8](C:/Users/beytu/Desktop/PrestigeSO/components/emails/InvoiceEmail.tsx:8).

### Güvenilirlik işi: İşlem e-postasını finansal kayıttan ayır

Ödeme callback'inde gönderim ve işlem tamamlama aynı yürütme içinde. Normal mail hatasında hata kaydı ve callback tekrar yolu var; hiç retry yok demek yanlış olur. Buna rağmen süreç çökmesi, belirsiz teslim, eksik mail konfigürasyonu ve yeniden çalışma senaryoları bağımsız gönderim kaydıyla güvenceye alınmalı.

Teslimat: kalıcı gönderim kuyruğu/kaydı, sipariş-olay-alıcı bazlı tekilleştirme, pending/sent/failed/unknown sonuçları, kontrollü yeniden deneme. Mail veya analitik arızası doğrulanmış tahsilatı geri almamalı. Ödeme sağlayıcısı callback'inin başarı cevabı ile müşteri mailinin teslimi aynı başarı ölçütü olmamalı.

Kod: [callback/route.ts:88](C:/Users/beytu/Desktop/PrestigeSO/app/api/paytr/callback/route.ts:88), [callback/route.ts:261](C:/Users/beytu/Desktop/PrestigeSO/app/api/paytr/callback/route.ts:261), [callback/route.ts:278](C:/Users/beytu/Desktop/PrestigeSO/app/api/paytr/callback/route.ts:278).

### Kontrol gerektirenler: Açık tespiti değil, yayın kapısı

Canlı migration/RLS ve rol matrisi, cron çalışması, Resend alan adı/DNS teslim edilebilirliği, yedeklerin geri yüklenebilirliği ve hassas log içeriği kontrol edilmeli. Bu turda doğrulanmadığı için yok veya bozuk denmiyor. DB yedeği ile ürün görselleri ayrı korunmalı; Supabase DB yedeği Storage dosyalarını kapsamaz.

Yüksek riskli admin eylemlerinde aktör, nesne, zaman, gerekçe ve sonuç tutulmalı; parola, anahtar, kart, OTP veya gereksiz kişisel veri loglanmamalı. Temel işlem izleri Faz 0; gelişmiş rol ekranı ve denetim arayüzü Ek Faz olabilir. Kaynak: [Supabase yedekleme dokümanı](https://supabase.com/docs/guides/platform/backups).

<!-- PAGE -->

# 09 / Faz 0 teslimat sırası
## Bir büyük deploy yerine kanıtlı küçük paketler

### 0A - Finansal doğruluk

P0-01, 02, 03, 04 ve 05: iade işlem kimliği/durumları, gerçek onay, belirsiz sonuç yönetimi, geç ödeme istisnası, birden fazla kısmi iade. Önce izole test veritabanı ve sahte PayTR adaptörü; sonra test mağazası senaryosu. Canlı mali işlem ayrıca açık onay ve kontrollü tutar gerektirir.

### 0B - Sepet, veri ve gizlilik

P0-06, 07, 08, 09, 10, 11: geçici hata sepeti silmesin; varyant yükleme; etkin fiyat; katalog/adres kurtarma; izin davranışı. Analitik yeniden yazılmadan önce mevcut yanlış yorumlanan sayılar etiketlenmeli. Eski sayaçlar geçmiş kullanıcı yolculuğu gibi sunulmamalı.

### 0C - Kullanım ve görünürlük

P0-UI, 12, 13, 14, 15, 16: mobil başlık/odak, metadata/JSON-LD, marka ikonlarının yayını, sipariş-alıcı-fatura eşleşmesi. Mail kuyruğu ve temel operasyon kayıtları da bu güvenilirlik paketine bağlanır. Geniş görsel redesign bu paketin içine sıkıştırılmaz.

### Her paketin çıkış koşulu

- İlgili bulgu için önce hatayı gösteren, sonra düzeltmeyi kanıtlayan regresyon testi. Regex sözleşmesi yanında davranış ve DB bütünlük testleri.
- Migration'ın temiz ve önceki şemadan yükseltilmiş test DB'de çalışması; tip, constraint, view bağımlılığı, trigger, grant ve RLS doğrulaması. Kör DROP CASCADE veya production verisini ezme yok.
- Unit, TypeScript, lint, build; Chromium/Android profili/WebKit alışveriş testi; kritik mobil ve odak hataları için gerçek cihaz kontrolü.
- Önizleme, küçük yayın, canlı anonim smoke test, işlem hata oranı/mutabakat kontrolü ve sürüm kaydı. Uygulama rollback'i veritabanını kendiliğinden geri almaz; şema için uyumlu ileri düzeltme/geri dönüş planı ayrıca yazılır.
- DB ve medya yedeği, geri yükleme tatbikatı ve müdahale sorumlusu. Secret veya müşteri bilgisi rapora/test ekranına alınmaz.

### Faz 1'e geçiş kapısı

Kritik mali akış riskleri kapanmış; para, stok ve gönderim sonuçları ayrıştırılmış; yayınlanan sürüm ile test edilen sürüm eşleşmiş olmalı. Fiziksel telefon/gerçek banka uçtan uca testi yapılmadıysa açık test eksiği olarak kalır. Bu inceleme mağazayı otomatik olarak durdurmadı; mevcut bulgular bilinmeden satış/reklam ölçeğini artırmak önerilmiyor.

<!-- PAGE -->

# 10 / Tam faz haritası
## Faz 0 + altı ana faz + iş bittikten sonra Ek Faz

### Uygulama yolu

Faz 0 → Faz 1 → Faz 3 → Faz 4 → Faz 5 → Faz 6 → Ek Faz

Faz 2 ayrı ve rafta. Diğer fazlar onu beklemez; Faz 2'nin ertelenmesi temel teknik SEO, ödeme mutabakatı veya birinci taraf mağaza hunisinin ertelenmesi anlamına gelmez.

- Faz 0 / Sağlamlaştırma: mevcut hataları ve işlem risklerini kapat. Çıktı: güvenilir finansal durumlar, sepet, izin, teknik SEO ve yayın kontrolü.
- Faz 1 / Yönetici takibi: ziyaretçi-oturum-ürün-sepet-sipariş ilişkisi ve açıklanabilir metrikler. Çıktı: mağaza sahibi hangi adımda ne olduğunu görebilir.
- Faz 2 / Rafta: Meta, finans ve reklam maliyeti/atıf, Search Console paneli, Trendyol siparişleri. Çıktı şimdi yalnız kapsam notu; kod/hesap bağlantısı yok.
- Faz 3 / Genel deneyim: ana sayfa, menü, standart kategori/ürün, sepet/checkout ve işlem mail tasarımı. Çıktı: bütün mağazada ortak, okunabilir marka dili.
- Faz 4 / Premium pilot: ayrı premium koleksiyon yüzeyi ve bir ürün detayı; tekrar kullanılabilir içerik sözleşmesi. Çıktı: gerçek içerikle onaylanan, performansı ölçülen örnek.
- Faz 5 / Sürdürülebilir admin: desteklenen şablonları kod yazmadan doldur, önizle, yayınla ve geri al; medya ve mail operasyonu. Çıktı: yeni premium ürün başına yeni deploy gerektirmeyen iş akışı.
- Faz 6 / Yaygınlaştırma: onaylanan şablonları kontrollü yay, içerik SEO'su ve ölçülen iyileştirmeler. Çıktı: veriyle ve görev testleriyle doğrulanmış ilerleme.
- Ek Faz / Sonraki seviye: ana teslimatları geciktirmeyen daha gelişmiş rapor, operasyon ve isteğe bağlı deneyim araçları.

### Birbirine bağımlı işler

Faz 1 tasarım öncesi başlangıç ölçümünü sağlar. Faz 3 ortak bileşenleri belirler. Faz 4 bu bileşenlerle ürün sunumu şemasını doğrular; tamamen tek kullanımlık bir demo yapılmaz. Faz 5 doğrulanmış şemayı admin editörüne açar. Faz 6 yaygınlaştırır. Ayrı premium sayfa ikinci bir fiyat/stok/sipariş sistemi doğurmaz.

### Planlama büyüklüğü

İşler gün tahminiyle değil küçük teslimat ve kabul testleriyle bölündü. Canlı DB geçmişi, mail ayarları ve premium medya hazır olmadan kesin süre vermek yanıltıcı olur. Özellikle 3D içerik üretimi ile web geliştirme ayrı iş yükleridir. Her fazın başında kapsam ve örnek içerik sabitlenerek süre tahmini yapılmalı.

<!-- PAGE -->

# 11 / Faz 1 - Ölçüm sözleşmesi
## Kullanıcı ne yaptı sorusunun doğru paydası

### Mevcut durum

Admin analiz ekranındaki dönüşüm, dönem sipariş sayısının ziyaret sayacına bölünmesi. Ana sayfa sayacı ve ürün sayacı ortak ziyaretçi/oturum yolculuğu saklamıyor. Doğrudan ürüne gelen satış ile ana sayfa sayacı aynı evren değil. Bu oran gerçek mağaza hunisi olarak adlandırılmamalı. Eski veriden sonradan ilk beş ürün veya sepet terk geçmişi üretilemez.

Kod: [analysis/page.tsx:382](C:/Users/beytu/Desktop/PrestigeSO/app/admin/analysis/page.tsx:382), [page_views/route.ts:23](C:/Users/beytu/Desktop/PrestigeSO/app/api/page_views/route.ts:23), [product-views/route.ts:11](C:/Users/beytu/Desktop/PrestigeSO/app/api/product-views/route.ts:11).

### Temel kimlikler

İzinli takma ziyaretçi kimliği, oturum kimliği, mantıksal sepet kimliği, ödeme girişimi kimliği ve sunucudaki sipariş kimliği ayrı tutulur. Takma ziyaretçi gerçek kişi demek değildir; çerez silinmesi, izin reddi ve farklı cihazlar nedeniyle eksik kapsama olur. Parmak iziyle izleme yapılmaz; IP kişi kimliği değildir. Oturum süresi ve gözlem pencereleri sürümlü ayarlardır; keyfî süreler gerçek davranış gibi sunulmaz.

### İstenen metriklerin kesin anlamı

- Kategori derinliği: uygun ziyaretçi veya oturum başına farklı kategori sayısı. Hiç kategori açmayanların dahil olup olmadığı açık; ikisi gerekiyorsa ayrı gösterilir.
- Ürün derinliği: toplam inceleme ve farklı ürün sayısı ayrı. A → B → A akışı 3 inceleme, 2 farklı ürün, A için tekrar incelemedir.
- İlk 3/5 ürün: kronolojik ilk farklı ürün görüntülemeleri; ilk kart tıklamaları ayrı rapor. Reklamdan doğrudan ürün açmak görüntüleme, kart tıklaması değildir. Üçten az inceleyenler kaybolmaz; her sıra için kapsanan ziyaretçi sayısı görünür.
- Liste konumu: kartın sayfada kaçıncı sırada gösterildiği ile ziyaretçinin kaçıncı tıklaması olduğu ayrı alanlardır.
- Ziyaretçi bazında ürün→sepet: 8 farklı ürün inceleyip 2'sini ekleyen için 2/8 = %25. Mağaza genelindeki ekleyen ziyaretçi / inceleyen ziyaretçi oranı bunun ortalamasıyla karıştırılmaz.
- Sepet→checkout, sepet→ödenmiş sipariş ve checkout→ödenmiş sipariş ayrı oranlar. Adet ile farklı SKU sayısı ayrılır; tekrar ödeme girişimi ikinci satış sayılmaz.
- Kaçıncı ziyarette aldı: ilk gözlenebilen satın alma oturumu sırası. Tüm yaşam boyu ziyaret geçmişi iddiası değil. Ürünü ilk görmeden eklemeye/ödemeye süre, pencere ve eksik veriyle raporlanır.
- Süre: görünür ve aktif bölüm süresi; arka planda açık sekme okuma sayılmaz. Süre, anlama veya memnuniyet kanıtı değildir.

<!-- PAGE -->

# 12 / Faz 1 - Yönetici ekranları
## Grafik değil, soruya cevap veren çalışma alanı

### 1A - Veri omurgası ve kalite

Sürümlü olay sözlüğü: page/category/product view, list impression, product click, search/filter, add/remove/update cart, begin checkout, adım hatası, payment attempt ve sunucudan paid sonucu. Event id ile tekrarları ayır; izin/ölçüm sürümü, route, ürün/SKU, sepet ve zaman bağlamını sakla. Adres, e-posta, telefon, OTP, kart veya ödeme token'ı analitik gövdesine konmaz.

Sunucu tahsilatı kaynak gerçektir; başarı sayfasını yeniden açmak satış üretmez. Analitik kaydı hata verirse ödeme engellenmez. Finans toplamları bütün doğrulanmış siparişleri, davranış hunisi ise ölçülebilen izinli kapsamı gösterir; farklı paydalar birbirine bölünmez. Ölçüm kapsamı ve ölçümsüz sipariş sayısı görünür.

### 1B - Günlük mağaza ekranları

- Genel görünüm: ölçülebilen oturum, ürün inceleyen, ekleyen, checkout'a geçen, doğrulanmış satış; önceki dönem ve veri güncelliği.
- Ana sayfa: gerçekten ana sayfadan başlayan oturumlar; hero/kategori/ürün blokları gösterim→tıklama→sepet. Doğrudan ürün girişleri ayrı.
- Keşif: ortalama kategori/ürün derinliği; ilk 3/5 farklı ürün ve sıra bazlı sepete geçiş; aynı ürünü tekrar inceleme; ürünler arası geçiş.
- Ziyaretçi yolculuğu: yetkili, takma kimlikli zaman çizelgesi; görülen ürünler, ekleme/çıkarma, oturum ve ödeme sonucu. Gerçek kişiyi izliyormuş gibi etiketlenmez.
- Sepet: dönüşmüş, hâlâ açık, ödeme bekleyen ve tanımlı pencere sonunda terk edilmiş. Bugün açılan sepeti anında kayıp satış sayma.
- Checkout teşhisi: son doğrulanan adım; sağlayıcı reddi, teknik hata, sonuç bekliyor, başarılı veya nedeni bilinmeyen ayrılma. Bilinmeyen nedeni fiyat yüksek ya da kullanıcı vazgeçti diye uydurma.
- Cihaz/kalite: Android, iOS/WebKit, masaüstü; yeni/geri dönen; gözlenen giriş kaynağı; test/personel/şüpheli trafik, tekrarlar, eksik olaylar ve filtrelenmemiş toplam.

### 1C - Maliyet ve gizlilik sınırı

Alan/olay boyutu sınırı, istek bütçesi, bot gürültüsü, saklama-silme-özetleme planı ve yetkili erişim. Serbest arama metninde kişisel veri temizliği. Öneri taslağı: kısa süreli ham olaylar, daha uzun anonim özetler; kesin süre uygulama öncesi onaylanır. Isı haritası/session replay ilk fazın zorunlu parçası değildir.

### Kabul testi

A → B → A → A'yı sepete ekle → çıkar → B'yi ekle → checkout → tek ödeme; ardından sayfayı yenile. Beklenen ürün, olay, sepet ve satış sayıları önceden yazılır. İzin reddi/geri alma, doğrudan ürün girişi, kısa oturum, tekrar callback, birden fazla sekme ve tarayıcı yenilemesi ayrıca denenir. Her kartta metrik tanımı, pay/payda, pencere ve kapsam bulunur.

<!-- PAGE -->

# 13 / Faz 2 - Rafta
## Meta, finans, Search Console ve Trendyol

Bu faz şimdi yalnız gelecek kapsam notudur. Kod, migration, reklam hesabı, Pixel/CAPI, API anahtarı veya Trendyol bağlantısı oluşturulmayacak. Faz 1'in olay sözlüğü ileride buna zemin sağlar; ertelenen entegrasyon gizlice Faz 1'e taşınmaz.

### Yeniden açıldığında kapsam

- Meta: izinli Pixel + sunucu olaylarının event_id ile tekilleştirilmesi; doğrulanmış satın alma; ürün kataloğu kimliği; test/personel ayrımı; gözlenen UTM/kaynak bilgisi ve Meta'nın atfettiği satışın ayrı gösterimi.
- Reklam başarısı: gerçek tahsilat, sitenin gözlediği kaynak, Meta raporu ve bilinmeyen kaynak ayrı. Platformların atfettiği satışlar toplanıp mağazanın gerçek satışına eklenmez. Atıf tek başına reklamın ek satış yarattığının kanıtı değildir.
- Finans: ürün maliyeti, ödeme kesintisi, paketleme, mağazanın karşıladığı gönderim, iadeler ve reklam gideri. Sipariş anındaki maliyet değerleri korunur; eksik maliyet sıfır sayılmaz. Vergi ve genel giderler kapsamlı değilse sonuç net kâr değil katkı payıdır.
- Search Console: mevcut site için sorgu/sayfa, gösterim/tıklama ve indeksleme raporu. Temel metadata ve favicon düzeltmeleri Faz 0'da zaten yapılacak; bu faz yalnız panel/hesap entegrasyonu.
- Trendyol: aynı admin içinde kaynağı açıkça ayrılan siparişler; ayrı provider kimlikleri, mükerrer kayıt kontrolü, durum/kalem eşleme, yetkili eylemler ve tutarlı stok etkisi. İptal/iade/fatura/durum yetenekleri güncel API sözleşmesi doğrulanarak belirlenir.

### Açılma koşulları

Senin açık devam kararı; ilgili hesap yetkileri; para birimi/saat dilimi/atıf penceresi; mevcut otomatik olaylar; gerçek maliyet kalemleri; veri işleme/izin kararı ve Trendyol API kapsamı. Secret bilgileri sohbetten istemek yerine güvenli yapılandırma kullanılır.

### Önceki araştırmadan alınan, şimdi de geçerli tasarım kararları

Mağazacıların sepet terki nedenini görememesi Faz 1 checkout teşhisine; bot/test gürültüsü veri kalitesine; ölçü ve malzeme belirsizliği Faz 3-4 ürün bilgisine; sıfır sonuçlu aramalar Faz 6 talep raporuna bağlandı. Forum paylaşımları ihtiyaç sinyalidir, PrestigeSO'da aynı sorunun yaşandığının veya yaygınlığının kanıtı değildir.

Kaynak: [4 Eylül araştırma ve forum kaynakları](C:/Users/beytu/Desktop/PrestigeSO/docs/plans/2026-09-04-admin-analytics-meta-seo.md). Kaynakların eski erişim tarihleri korunur; bu belge hepsinin bugün yeniden doğrulandığını iddia etmez.

<!-- PAGE -->

# 14 / Faz 3 - Genel mağaza ve mail
## Premium hissin günlük alışverişe yayılması

### Mağaza teslimatları

Ortak tipografi, renk, boşluk, buton, ikon ve hata/yükleme durumları. Marka dilinden kopan emoji ağırlıklı gezinme yerine tutarlı ikon sistemi; okunur metin boyutları ve kontrast. Amaç bütün metni büyütmek değil, başlık-bilgi-eylem sırasını netleştirmek.

Ana sayfa: tek net ana mesaj, kategori/ürün keşfine kısa yol, gerçek koleksiyon anlatısı; hero ve hareketli bant satış akışını gölgelememeli. Menü ve kategori adları tek kaynakla tutarlı yüklenmeli; yüklenme anında farklı kategori isimleri gösteren fallback geçişi iyileştirilmeli.

Standart kategori: seçili kategori başlığı ve kısa açıklama; kompakt arama/filtre; aktif filtreler ve temizleme; doğru fiyat/stock filtreleri; tutarlı geri dönüş/sayfalama. Gerçek sıfır sonuç ile yükleme hatası ayrı.

Standart ürün: kısa görünen ad, fiyat/indirim, seçim/stok, zincir/ölçü/malzeme özeti ve satın alma eylemi; galeri/zoom, hikâye ve bakım ayrı bloklar. Uzun açıklama korunur ama taranabilir başlıklara ayrılır. Sekiz görsel aynı bilgiyi tekrarlamak yerine farklı detay sunmalı.

Sepet/checkout: miktar, toplam, indirim ve gönderim koşulu açıklığı; hata sonrası alanları kaybetmeme; misafir akışında süreli ve açıkça temizlenebilir taslak kurtarma. OTP, kart veya ödeme token'ı taslağa kaydedilmez; kişisel veri kalıcılığı asgari tutulur.

### İşlem e-postası tasarım paketi

- OTP: büyük ve kopyalanabilir kod, geçerlilik metni, istenmeyen talep açıklaması; süs kodu gölgelememeli.
- Sipariş: müşterinin bildiği sipariş numarası, ürünler/miktar/tutar, doğru takip bağlantısı; henüz uygulanmayan bildirimlerin vaadi yok.
- Teslim: yalnız doğrulanmış işletme durumuna uygun metin; doğru siparişe bağlı aksiyon.
- Fatura: doğru sipariş/alıcı ve PDF özeti; güvenilir ek adı, açık indirme/gönderim bilgisi. Mevcut sistem işletmenin yüklediği PDF'yi gönderiyor; bu otomatik e-fatura üretim entegrasyonu değildir.

Ortak mobil kabuk, preheader, görseller kapalıyken anlaşılır içerik, düz metin alternatif ve e-posta istemcilerine uygun yerleşim. Sitedeki CSS'nin e-postada aynen çalışacağı varsayılmaz. SPF/DKIM/DMARC ve gönderici doğruluğu ayrı operasyon kontrolüdür; güzel tasarım teslimi garanti etmez.

Kabul: gerçek içerikle Android/masaüstü ve fiziksel iOS görev testi; klavye/odak/kontrast; Gmail, Outlook ve Apple Mail hedeflerinde OTP ve sipariş/fatura okunabilirliği. Yeni otomatik kampanya veya pazarlama maili eklenmez.

Kod tabanı: [emails klasörü](C:/Users/beytu/Desktop/PrestigeSO/components/emails), [ShopClient.tsx](C:/Users/beytu/Desktop/PrestigeSO/components/storefront/ShopClient.tsx), [ProductDetailClient.tsx](C:/Users/beytu/Desktop/PrestigeSO/components/product/ProductDetailClient.tsx).

<!-- PAGE -->

# 15 / Faz 4 - Premium pilot
## Ayrı bir deneyim, aynı ticaret altyapısı

### Birlikte teslim edilecek iki yüzey

Bir premium kategori/koleksiyon sayfası ve bir premium ürün detayı. Sadece tek ürün demosu yapıp kategori deneyimini boş bırakmak yok. Erkek Kolye, mevcut içerik miktarı nedeniyle pilot için uygun aday; kesin ürün, doğru ölçü ve medya hazır oluşuna göre seninle seçilir.

Premium koleksiyon: güçlü ama hafif giriş, koleksiyon hikâyesi, seçili ürünler, malzeme/tema anlatısı ve alışverişe açık geçiş. Normal katalogdan kopuk ikinci bir mağaza değil. Premium, ürünün sunum/koleksiyon niteliği olabilir; mevcut Erkek Kolye gibi taksonomiyle aynı alanı zorunlu paylaşmamalı. Ücretli müşteri üyeliği bu planın parçası değil.

Premium ürün akışı: kısa ürün kimliği ve satın alma özeti → gerçek görsellerle galeri → detay/malzeme/ölçü → hikâye/kullanım → bakım/teslim-iade özeti → satın alma. Kritik fiyat, stok ve seçim için animasyon bitmesini bekleme yok.

### Sürdürülebilir mimari

Tek ürün ve SKU kaydı; tek fiyat/stok/sepet/PayTR kaynağı. Sunum kaydı bu ürüne bağlanır: şablon kimliği/sürümü, kısa başlık, tema, medya, teknik özellikler ve desteklenen bloklar. Normal ve premium URL varsa canonical/yönlendirme kararıyla kopya içerik önlenir; stok için ikinci ürün yaratılmaz.

İlk pilotta içerik sözleşmesi ve yeniden kullanılabilir bileşen sınırları hazırlanır. Faz 5 bunun admin editörünü açar. Aynı şablondaki yeni ürün veri girişiyle yayınlanır; tamamen yeni bir etkileşim veya bileşen yine geliştirme gerektirebilir.

### Görsel ve hareket kalite kapısı

Ürün geometrisi ve zincir devamlılığı gerçek örnekle eşleşmeli; ölçü abartılmamalı. Ürün başına kararlaştırılan sekiz final görsel; model yüzü gösterilmez, en fazla çene sınırı. Gerçek ölçü/malzeme bilinmiyorsa tahmin ürün gerçeği gibi yazılmaz. Otomatik içerik kontrolü insan onayının yerini tutmaz.

Hafif geçişler varsayılan. Video, 360 foto dizi ve gerçek 3D model farklı varlıklardır; sıradan sekiz fotoğraf 360 deneyim sayılmaz. WebGL/3D yalnız uygun varlık ve performans bütçesi varsa; destek yoksa veya azaltılmış hareket seçiliyse statik alternatif. Scroll ele geçirme ve satın almayı bekleten sahneler yok.

Kabul: gerçek içerikle görsel onay; normal/premium fiyat-stok eşitliği; mobil dokunma, klavye ve reduce-motion; 3D/medya hatasında alışverişin devamı. Ağ yükü ve etkileşim gecikmesi eski sayfayla karşılaştırılır. Core Web Vitals hedefleri alan verisinde ayrı değerlendirilir; tek laboratuvar ölçümü satış başarısını kanıtlamaz.

<!-- PAGE -->

# 16 / Faz 5 - Admin sürdürülebilirliği
## Ürün eklemek için her seferinde kod yazılmayacak

### İçerik editörü

Desteklenen şablon/tema seçimi; hero, galeri, hikâye, malzeme, teknik özellik, bakım ve ilgili ürün blokları. Zorunlu alan doğrulaması; blokları aç-kapat ve sınırlandırılmış sıralama. Serbest JavaScript/HTML çalıştıran bir editör değil, güvenli yapılandırılmış içerik.

Taslak → mobil/masaüstü önizleme → yayın → sürüm geçmişi → önceki içerik sürümüne dönüş. Yayına alınmamış içerik anonim API üzerinden sızmamalı. Eşzamanlı iki admin düzenlemesinde kayıp güncelleme uyarısı; şablon yükseltmesinde toplu değişiklik önizlemesi.

### Katalog ve medya

SKU tabanlı tekrar önleme; toplu girişte dry-run, satır hatası raporu ve yalnız onaylanan kayıtları uygulama. SKU'yu rastgele değiştirme; fiyat, stok ve kategori için güvenilir doğrulama. Medya rolü, alternatif metin, çözünürlük/format/sıkıştırma, kullanım yeri ve bozuk bağlantı denetimi. Silinen dosyanın canlı üründe kullanılması önlenir; toplu silme açık onay ister.

### Stok ve sipariş operasyonu

Stok hareket defteri ve benzersiz SKU kısıtları zaten var. Bunları sıfırdan yapılmamış gibi saymak yerine admin görünümü, neden/aktör ilişkisi, ürün-varyant hareketleri ve sipariş/iade bağlantısı geliştirilir. Mevcut operasyon uyarıları ve mutabakat alanı genişletilir; ikinci, çelişen stok sayacı kurulmaz.

Kod: [security_and_operations.sql:228](C:/Users/beytu/Desktop/PrestigeSO/supabase/migrations/20260714100000_security_and_operations.sql:228), [security_and_operations.sql:300](C:/Users/beytu/Desktop/PrestigeSO/supabase/migrations/20260714100000_security_and_operations.sql:300), [AdminDashboardAlerts.tsx:41](C:/Users/beytu/Desktop/PrestigeSO/components/admin/parts/AdminDashboardAlerts.tsx:41).

### Aynı adminden işlem e-postası ve PDF

Sipariş/alıcı özeti, şablon önizleme, yöneticiye kontrollü test gönderimi, PDF yükleme/eşleştirme, final onay ve gönderim geçmişi. Aynı olayın mükerrer gönderimi engellenir; başarısız/belirsiz sonuçlar ayrı; gerekçeli yeniden gönderim görünür. İzin verilmemiş müşterilere toplu kampanya gönderimi eklenmez.

### Kabul

Mevcut şablonla yeni premium ürün yalnız admin verisiyle yayınlanır; yeni deploy gerekmez. Taslak gizlidir; önizleme gerçek yayına karşılık gelir; yanlış SKU, bozuk medya ve eksik teknik alanlar raporlanır. İçerik geri alma fiyat/stoğu geçmişe çevirmemeli. Yönetici hangi sipariş için kime hangi belgeyi gönderdiğini görebilmeli.

<!-- PAGE -->

# 17 / Faz 6 ve Ek Faz
## Kontrollü yaygınlaştırma, sonra ileri yetenekler

### Faz 6 - Ana işin tamamlanması

Pilot onayından sonra küçük ürün/kategori gruplarıyla yaygınlaştırma; her grupta içerik, medya, SEO, cihaz ve satın alma regresyonu. Özgün kategori metinleri, ölçü/bakım rehberleri ve doğru iç bağlantılar. Otomatik üretilmiş uzun metin veya kelime tekrarı tek başına SEO başarısı değildir.

Sonuçsuz arama, sonuç var ama tıklama yok, stokta ürün yok ve filtre sonrası boş sonuç ayrı raporlanır. Çok incelenip eklenmeyen ürünlerde teknik sorun, bilgi eksikliği, fiyat veya ilgi farklılığı hipotez olarak ele alınır; kesin neden uydurulmaz. İade nedenleri, tekrar alışveriş ve tamamlayıcı ürünler ölçülen veriyle geliştirilir; yeni müşteri bildirimleri zorunlu değildir.

Yeterli trafik varsa önceden belirlenmiş başarı metriği ve koruma metrikleriyle deney. Düşük trafikte görev bazlı kullanıcı testi; birkaç satışla kesin kazanan ilan edilmez. Başarı yalnız sayfada kalma süresi değil: ürün bulma, doğru seçim, ödeme tamamlama ve teknik hata oranıyla değerlendirilir.

### Ek Faz - Ana teslimatlar bittikten sonra

- Gelişmiş raporlama: kayıtlı görünümler, karşılaştırmalar, yetkili CSV dışa aktarma ve grafikte fiyat/kampanya/deploy değişiklik notları. Temel Faz 1 ekranlarının yerine değil üzerine gelir.
- Ayrıntılı rol ve denetim arayüzü: iade, stok, içerik yayını ve mail için daha dar roller; gelişmiş arama/inceleme. Temel authentication ve finansal izler zaten Faz 0 kapısıdır.
- Operasyon merkezi: tekrar eden olayların ilişkilendirilmesi, eğilim ve müdahale rehberleri; ilk ödeme/mail hata görünürlüğü daha önce tamamlanır.
- İleri stok/iade analizi: satılabilir/hasarlı/incelemede sonuçlar, tedarik önerileri, ürün kalitesi örüntüleri. Güvenli miktar ve stok hareketi ana fazlarda kalır.
- İsteğe bağlı ısı haritası/session replay: amaç, maliyet ve uygun izin kararı sonrasında; hesap, adres, OTP, takip, admin ve ödeme alanları kayda alınmaz. İzinli vitrin kayıtlarında da kişisel alanlar maskelenir. Her kullanıcıyı tanıyan sınırsız izleme hedefi yok.
- Gelişmiş medya deneyleri: yalnız kanıtlanan ihtiyaçta 3D/360 ve farklı sunum şablonları. İçerik doğruluğu, mobil performans ve erişilebilirlik zorunlu kalır.

### Bir sonraki uygulama kararları

Başlangıç önerisi Faz 0A. Önce iade talebi durumları ve kabul senaryoları sabitlenmeli. Faz 1 öncesi izin/saklama ve terk pencereleri; Faz 3 öncesi marka yönü ve mail örnekleri; Faz 4 öncesi pilot ürün ve doğrulanmış medya seçilmeli. Faz 2 kendi açık devam kararını beklemeli.

Son not: Bugün hazırlanan çıktı denetim ve plandır. Bulgular henüz düzeltilmiş sayılmaz. Sonraki uygulama turlarında her bulguya değişiklik, test ve yayın kanıtı eklendiğinde kapanmış olarak işaretlenecek.
