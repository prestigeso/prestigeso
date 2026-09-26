# Faz 2 — aktif geliştirme, ilk adım

## 20 Eylül Search Console güncellemesi

Google OAuth bağlantısı gerçek mülkte salt okunur olarak doğrulandı. Sorgu/sayfa/cihaz raporu, indeks kaydı ve siteOwner erişimi başarılı. Admin bağlantı tanılama, güvenli hata sınıfları, PT tarih kısayolları ve indeks açıklamaları eklendi. Google kimlik bilgileri kullanıcı onayıyla Vercel Production'a kaydedildi; yeni deployment henüz yapılmadığından Vercel çalışma zamanı kabulü bekliyor. Bu bölüm aşağıdaki tarihsel GSC “bağlantı yok” notlarının yerini alır. Ayrıntılar: `docs/releases/2026-09-20-search-console.md`. Trendyol/Meta eksikleri değişmedi.

## 19 Eylül güncel teslim (önceki bölümler tarihsel)

Yerel uygulama genişletildi: kalıcı ürün/sipariş maliyetleri, tarih/kampanya anahtarlı manuel reklam gideri, Trendyol SKU eşleme kaydı, sürüm kontrolü ve idempotent kaydetme, değişiklik geçmişi, yeni siparişte maliyet snapshot'ı, gerçek site tahsilatı üzerinden sipariş katkısı, başa baş/hedef fiyat senaryosu, salt okunur OAuth refresh-token kullanan Search Console sorgu/sayfa/cihaz raporu.

KDV dahil/hariç kayıt esası kullanıcı tarafından seçilir. Gerçek tahsilatla karşılaştırmada hariç maliyetler karıştırılmaz; rapor eksik kalır. İade olmuş siparişte geri kazanılan ürün maliyeti varsayılmaz; net goods düzeltmesi gerekir. Geçmiş siparişlere bugünkü maliyet uygulanmaz, reklam gideri siparişlere otomatik dağıtılmaz. Varyant maliyeti ürün maliyetinden türetilmez; bilinmeyen tutulur.

Bu teslim **tüm özgün Faz 2 kapsamı tamamlandı** anlamına gelmez: Meta Pixel/CAPI ve platform reklam atfı ertelenmiş; Trendyol paketlerinin kalıcı senkronizasyonu, SKU eşlemesini kullanan operasyon akışı ve canlı iptal/iade/fatura/ortak stok yönetimi henüz yok. Search Console URL Inspection paneli ve OAuth hesabı kurulum akışı da bu teslimde yok; mevcut güvenli sunucu OAuth bilgileriyle salt okunur rapor alınabilir. Bağlantılar gerçek hesaplarla doğrulanmadı. Bu kapılar kapanmadan tüm Faz 2 tamamlandı denmeyecek.

### PrestigeSOMS arşivi

Kullanıcının `PrestigeSOMS kopyası.zip` arşivi yalnız okunarak incelendi. Dosya envanteri ve calculators.py/main_gui.py/web/script.js işlevleri; başa baş fiyat, maliyet/gelir-gider günlüğü ve Trendyol sipariş akışını gösteriyor. Başa baş senaryosu bu ihtiyaçtan uyarlandı; sabit komisyon/KDV/kur/ceza varsayımları aktarılmadı. Tarayıcı profilleri, oturumlar, API ayarları ve sipariş dökümleri projeye kopyalanmadı veya çalıştırılmadı. Arşivin tüm kodu denetlenmiş sayılmaz.

### Kurulum ve yetki kapıları

- SQL: `supabase/migrations/20260919130000_phase2_finance_records.sql`. Yalnız yerel sentetik veritabanlarına uygulandı; canlıya uygulanmadı.
- GSC sunucu değişkenleri `.env.example` içinde: `GSC_READ_ONLY_ENABLED=0`, `GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, `GSC_REFRESH_TOKEN`. Refresh token yetkili Google hesabından `https://www.googleapis.com/auth/webmasters.readonly` kapsamıyla elde edilmeli; yalnız server secret store'a konmalı. Property sabit `sc-domain:prestigeso.com.tr`; yeniden DNS mülkü açılmaz. Kurulum ve erişim kontrolünden sonra flag 1 yapılabilir. Bu kod OAuth onay ekranını/credential oluşturmayı yapmaz.
- Search Analytics günleri PT, veri `final`, 100 satır/sayfa, en fazla 25.000 gösterim satırı; Google top-row kapsamını garanti etmez. Bu sayı arama gösterimi değil, rapor satırı sınırıdır. Hata/iptal/eski token boş trafik sayılmaz. İndeksleme ayrı URL Inspection gerektirir.
- Meta gönderimi yok. Trendyol sadece hazır read-only adapter üzerinden istek; eşleme kayıtları site stoklarına dokunmaz.
- Push/deploy/Production ortam değişikliği yapılmadı.

Resmi Google sözleşmeleri 19 Eylül tekrar okundu: https://developers.google.com/webmaster-tools/v1/searchanalytics/query ve https://developers.google.com/identity/protocols/oauth2/web-server .

18 Eylül 2026: kullanıcı Faz 2'yi açıkça yeniden açtı. Önceki raporlardaki “rafta” notu tarihsel karardır; bu dosya yeni durumu belirtir. Yeni push/deploy/production SQL onayı yoktur.

## Sıra ve kabul kapıları

Kullanıcının son önceliği: Trendyol satıcı API hazır; Meta reklam hesabı var fakat entegrasyon sonraya bırakıldı. Search Console için önce mülk hazırlığı yapılacak. Bu nedenle ilk canlı bağlantı adayı Trendyol salt okunur paket listesi.

1. **Finans temeli (başlandı):** kuruş hassasiyetli katkı hesabı; boş maliyet bilinmeyen, sıfırdan farklı. `/admin/phase2` manuel senaryo alanı. Şu an canlı sipariş okumaz, kaydetmez; net kâr veya Meta ROAS iddiası yok.
2. **Finans kayıtları:** gerçek maliyet kalemleri ve vergi esası netleştikten sonra ürün maliyetleri, sipariş anı değişmez maliyet kopyası, yetkili düzeltme geçmişi, manuel reklam gideri. Geçmiş siparişe güncel ürün maliyeti otomatik uygulanmayacak. Eksik kayıtlar raporda ayrı kalacak.
3. **Meta:** mevcut Pixel/dataset ve otomatik olay envanteri; pazarlama izni; kaynak/atıf sözleşmesi; doğrulanmış ödeme sonrası outbox, ortak event_id, retry ve geri alma. Hesap API sürümü/para birimi/saat dilimi/atıf penceresi doğrulanmadan canlı gönderim yok. Önce Test Events ve tekilleştirme.
4. **Search Console:** yetkili property ve salt okunur OAuth kapsamı; sayfa/sorgu/cihaz raporu; veri tazeliği, pagination, eksik/top satır açıklaması; indeksleme durumu ayrı URL Inspection kaynağı. Query API tüm satırları garanti etmez. Günler sağlayıcının PT takvimine aittir; Türkiye günü diye etiketlenmeyecek.
5. **Trendyol:** satıcı/API kapsamı; sipariş paketi kimliğiyle bağımsız kaynak kaydı ve tekilleştirme; önce salt okunur paket listesi ve SKU eşleme. Site sipariş tablosuna doğrudan kopyalayıp ikinci stok düşümü yok. İptal/iade/fatura/durum yazmaları gerçek yetki ve sözleşme onayı sonrası, idempotency ve denetim iziyle.
6. **Bütünleşik kabul:** sahte başarılı bağlantı yok; expired/revoked token, 429/timeout, retry, eksik sayfa, kur/atıf/pencere uyuşmazlığı, aynı sipariş/paket tekrarları, izin geri çekme, stok/para etkisi testleri. Canlı gönderim ve yayın ayrı onay kapılarıdır.

## Kullanıcıdan gerekenler

Anahtar/parola sohbetten istenmez. Hazır hesapların isim/tür bilgisi; Meta dataset/reklam hesabı ve mevcut otomatik olay durumu; Search Console property türü; Trendyol satıcı API erişim durumu. Güvenli yapılandırma ayrıca hazırlanacak. Gerçek maliyetler, dahil/hariç vergi esası ve reklam raporu saat dilimi/para birimi/atıf penceresi kullanıcıyla netleşmeden varsayılmaz.

## 18 Eylül resmi kaynak kontrolü

- [Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query): salt okunur scope, PT tarihleri, final/fresh veri, 25.000 satır istek limiti ve top-satır kapsam sınırı.
- [Trendyol getShipmentPackages](https://developers.trendyol.com/v2.0/docs/get-order-packages-getshipmentpackages) ve [değişiklik günlüğü](https://developers.trendyol.com/changelog/changelog): paket ve servis sınırları entegrasyon anında yeniden kontrol edilecek.
- [Meta tekilleştirme dokümanı](https://developers.facebook.com/documentation/ads-commerce/conversions-api/deduplicate-pixel-and-server-events) bu oturumda HTTP 429 döndü; içeriği bugün doğrulanmış sayılmadı. Üçüncü taraf açıklamalar güncel resmi API sözleşmesi yerine kullanılmadı.

## İlk teslimin sınırı

Hesap motoru ve admin senaryo arayüzü hazırlandı. Trendyol için sunucu taraflı, sabit prod/stage alan adına giden GET adaptörü ve yetkili admin paket listesi eklendi; bağlantı varsayılan kapalı. Sadece listeleme; kalıcı senkronizasyon, stok, iptal, iade veya fatura yazması yok. 14 günlük sorgu penceresi, 50 paketlik sayfalar, 10.000 üzeri sonuçta daraltma uyarısı, sınırlandırılmış cevap boyutu, timeout, yönlendirme reddi ve istek bütçesi var. Müşteri adı/adres/telefon/vergi numarası projeksiyona alınmaz. Paket kimliği sipariş numarasından ayrı tutulur.

Sipariş maliyet snapshot'ı, kalıcı maliyet/gider kaydı, canlı ROAS, Search Console senkronizasyonu ve Trendyol yönetim eylemleri henüz tamamlanmadı. Bu belge tüm Faz 2 tamamlandı anlamına gelmez.

## Güvenli Trendyol hazırlığı

`.env.local` içinde `TRENDYOL_SELLER_ID`, `TRENDYOL_API_KEY`, `TRENDYOL_API_SECRET`; ortama uygun `TRENDYOL_ENVIRONMENT=production` veya `stage`. Açmak için `TRENDYOL_READ_ONLY_ENABLED=1`. Anahtarlar sohbet, ekran görüntüsü veya Git'e konmaz; `.env.example` yalnız boş şablon içerir. Prod ve stage anahtarları farklıdır. Sunucu yeniden başlatıldıktan sonra admin `/admin/phase2` içindeki buton bağlantıyı dener. Bu çalışma gerçek Trendyol hesabına istek göndermedi. Yayın için yeni push onayı gerekir.

Kaynak: [Trendyol kimlik doğrulama](https://developers.trendyol.com/docs/2-authorization). Search Console: Google hesabıyla alan adı mülkü `prestigeso.com.tr`, DNS TXT doğrulaması; [resmi doğrulama rehberi](https://support.google.com/webmasters/answer/9008080?hl=tr). DNS değişikliği bu işte otomatik yapılmadı.

## İlk adım test kanıtı

- 258/258 Node testi: on yeni finans/Trendyol testi dahil; küsurat/eksik maliyet/sıfır payda, güvenli sabit host, GET-only, kişisel veri projeksiyonu, 401/403/429/500 hata sınıfları, şema/kimlik/boyut/kayıt penceresi sınırları. Gerçek sağlayıcı timeout davranışı canlı bağlantı kabulünde ayrıca sınanacak.
- Next.js 16.3.5 production build: 73 sayfa başarılı; TypeScript ve ESLint başarılı.
- Yeni ekran için masaüstü Chrome, Android Chrome profili ve iOS/WebKit'te 9/9 hedefli test başarılı. Manuel hesap, tutar doğrulama, kullanıcı isteğiyle paket getirme, hata sonrası eski listenin temizlenmesi, yetkisiz erişim ve testte dış bağlantının kapalı olması.
- İlk test turunda yetkili test isteğinin farklı çerez bağlamında çalışması nedeniyle 401 alındı; test aynı admin tarayıcı bağlamı ve Origin ile düzeltildi, güvenlik kontrolü gevşetilmedi.
- Tam eski tarayıcı regresyon paketi bu artımlı adımda tekrar çalıştırılmadı. Gerçek Trendyol anahtarları kullanılmadı; dış cevaplar sentetik. Fiziksel telefon veya canlı sipariş eşleşmesi henüz doğrulanmadı. Commit/push/deploy/SQL uygulanmadı.

## 19 Eylül sonraki teslim — güncel durum

Yukarıdaki ilk adım eksiklerinin bir kısmı tamamlandı: kalıcı maliyet/gider/eşleme kayıtları, sipariş maliyet snapshot'ı, sipariş katkısı, GSC raporu ve indeks kaydı denetimi, kalıcı Trendyol stream aktarımı ve gönderimsiz Meta Purchase hazırlığı mevcut. Güncel test ve kalan kabul sınırları için `docs/releases/2026-09-19-phase2-local-delivery.md` esas alınmalıdır.

API'ler kapalı tutulur. Meta gönderici/atıf ve Trendyol iptal-iade-fatura/ortak stok yazmaları hazır kabul edilmez; gerçek hesap kabulü ve sonraki operasyon geliştirmesi gerekir. Kullanıcının onayı olmadan yayın yapılmaz.
