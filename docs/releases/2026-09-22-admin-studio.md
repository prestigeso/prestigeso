# Admin Studio — yerel uygulama ve bağlantı notları

## Uygulanan tasarım

- `/admin?view=...`: Genel bakış, Ürünler, Siparişler, Müşteriler, Mağaza performansı, Pazarlama, Finans, Ayarlar.
- PrestigeSO admin tasarım skill'i: beyaz ağırlıklı nötr yüzeyler, siyah eylemler, kapsüllenmiş CSS, mobil menü ve görünür klavye odağı. Müşteri vitrin tasarımı değiştirilmedi.
- Genel bakış: aylık ciro, sayfa ziyaretleri (tekil kişi değil), ödenen siparişler, tekilleştirilmiş müdahale gerektiren ödemeler; günlük ciro/ziyaret/sipariş grafiği.
- Ürünler: sunucu taraflı arama, kategori/stock/sıralama, sayfalama, anlık fiyat/stok kaydı, hata halinde önceki değere dönüş, toplu fiyat/stok değişikliğinden önce önizleme, eksik bilgi uyarısı, mevcut varyant editörü ve mağaza bağlantısı.
- Siparişler: varsayılan Tümü / Mağaza / Trendyol kanal filtresi ve ortak liste. Görsel solda, kaynak sağda. Mağaza detayında mevcut güvenli iade/iptal/fatura/kargo akışı korundu. Trendyol yalnız okuma; kişisel veri uydurulmaz, iptal düğmesi yok. Son 7 gün paketleri kullanıcı isteğiyle getirilir; yüklenen iki kaynak sayfası tarihe göre birleşir. Kaynakların bağımsız sayfaları ve tarih kapsamı belirtilir; bu görünüm bütün tarihçenin küresel sayfalaması değildir.
- Müşteriler: toplulaştırılmış ilk ödeme grafiği; 48 saat, 7/28/90/365 gün. Mesajlar, ürün soruları ve yorumlar mevcut işlemlere bağlı.
- Pazarlama/Finans/Ayarlar: mevcut Google, reklam hazırlığı, maliyet, fiyat senaryosu ve Trendyol araçları görev bazında ayrıldı. Bu bölümlerde form taslakları menü geçişinde korunur.
- Kargo: yeni sürümlü ayarda boş alt limit `null` (her siparişte ücret), `0` (her siparişte ücretsiz), pozitif limit (indirim sonrası ürün toplamı). Eski sürümsüz `0` davranışı değiştirilmez. Sunucu ve ödeme hesabı aynı normalizasyonu kullanır. Ayar yüklenmeden düzenleme/kaydetme engellenir.

## Veritabanı

Supabase SQL Editor'de `supabase/migrations/20260921120000_admin_studio_customer_growth.sql` çalıştırılmalı. Canlı veritabanına bu çalışma sırasında uygulanmadı.

Fonksiyon yalnız service_role tarafından çalıştırılır; müşteri kimlikleri tarayıcıya dönmez. Üye kullanıcı ID'si, misafir normalize e-posta üzerinden ilk doğrulanmış ödeme sayılır. Bu iki kimlik kesin bir kişi eşleştirmesi değildir. Trendyol dahil değildir.

## Trendyol — sunucu ortam değişkenleri

Vercel'de ilgili proje → Settings → Environment Variables. Yerel çalışmada `.env.local`. Anahtarları kaynak koduna, sohbete veya `NEXT_PUBLIC_` değişkenine yazmayın.

```dotenv
TRENDYOL_SELLER_ID=<Satıcı ID / tedarikçi numarası>
TRENDYOL_API_KEY=<API Key>
TRENDYOL_API_SECRET=<API Secret>
TRENDYOL_ENVIRONMENT=production
TRENDYOL_READ_ONLY_ENABLED=1
TRENDYOL_SYNC_ENABLED=0
```

Gerçek satıcı hesabı için production; Trendyol test hesabı için stage. Production anahtarlarını paylaşılan Preview ortamlarına otomatik eklemeyin. Yerelde değişiklikten sonra sunucuyu yeniden başlatın. Vercel'de yeni değişkenlerin geçmesi için ayrı onaylı yeni deployment gerekir; bu çalışma deploy/push yapmadı.

İlk kabul: Siparişler → Trendyol → Son 7 günü getir. Sağlayıcı sonucu ve satıcı hesabı doğrulandıktan, önceki Phase2 SQL'leri uygulandıktan sonra kalıcı okuma senkronizasyonu için `TRENDYOL_SYNC_ENABLED=1` düşünülebilir. Bu bayrak stok/fiyat yazma veya Trendyol sipariş iptali açmaz.

## Test kanıtı / sınırlar

- 283 Node testi geçti; TypeScript ve lint geçti.
- İzole üretim derlemesi: 82 rota.
- Admin Studio + eski Phase2 + analiz regresyonları: 60 Playwright testi (masaüstü Chromium, Android Chromium, iPhone WebKit). Son görsel düzeltmeden sonra Studio'nun 12 testi tekrar geçti.
- Yerel PostgreSQL: müşteri tekilleştirme, dönem filtresi, geçersiz dönem reddi, tekrar migration ve anon/authenticated/service_role yetkileri doğrulandı (`scripts/test-admin-studio-db.mjs`).
- Tarayıcı testleri sentetik fixture/route mock kullanır; canlı Trendyol/Google veya gerçek müşteri verisiyle kabul testi yapılmadı. Görsel test sayıları temsili verilerdir, üretim KPI'sı değildir.
- Bu teslim yeni admin yerleşimi ve mevcut işlemlerin bağlanmasıdır. Tam otomatik tüm gider/KDV/komisyon/reklam dağıtımı, tüm pazaryerlerini birleştiren muhasebesel net kâr raporu ve yeni pazaryerlerine yazma işlemleri tamamlandı diye sunulmaz; mevcut finance kayıt ve katkı hesapları korunur. Ürün karşılaştırmaları mevcut ölçüm pencereleriyle sınırlıdır.
- Commit, push ve deploy yapılmadı. Önceden bulunan Phase2/SEO değişiklikleri korunmuştur.

## Kullanılabilirlik düzeltmesi — 22 Eylül

- Beyaz ağırlıklı yumuşak kartlar, kapsül kanal seçimi, çizgi menü ikonları ve sistem sans-serif yazı ailesi.
- Genel bakış, müşteri ve günlük analiz grafiklerinde sayısal eksen, hizalı kılavuz çizgileri, sütun değerleri; fare/klavye/dokunma ile seçilen değerin büyük gösterimi. Yoğun grafik yalnız kendi içinde yatay kayar. Büyük tutarlar sütunda kısaltılır, seçilen değer tam gösterilir. Sıfır değer için yapay sütun yüksekliği yoktur.
- Siparişlerde 401 yanıtı anlaşılır yeniden giriş bağlantısıyla gösterilir. Bu, geçersiz oturumun sunucuda kabul edilmesini sağlamaz; yeniden giriş gerekir.
- Mobilde sipariş satırları kart düzenindedir; satış kanalı ve tutar yatay kaydırmadan görülebilir.
- Sentetik ortamda birleşik liste, kanal/durum filtreleri, sağlayıcı hatası sırasında mağaza verisinin korunması, oturum hatası ve seçilebilir grafik kontrolleri eklendi. Canlı Trendyol hesabı bu görsel testlerde kullanılmadı.
- Son düzeltme doğrulaması: TypeScript ve değişen dosyalarda ESLint başarılı; 82 rota üretim derlemesi başarılı; HTTPS fixture üzerinde 21 Playwright kontrolü geçti (Chromium masaüstü, Android ve iPhone WebKit). Mobil kartlar, 28 günlük yüksek değerli grafik, sıfır sütunu ve ekran görüntüleri kontrol edildi. İç içe fixture kopyasının derlemesinde workspace-root ve taranan yardımcı çıktılardan gelen CSS uyarıları görüldü; ana çalışma alanındaki derleme bunları üretmedi.
