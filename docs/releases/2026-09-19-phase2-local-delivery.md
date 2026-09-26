# Faz 2 — yerel finans ve raporlama teslimi

## Hazır

- `/admin/phase2`: kalıcı ürün maliyeti, sipariş maliyet düzeltmesi, gün/kampanya bazlı manuel reklam gideri, Trendyol SKU eşleme kaydı.
- İstek UUID'si ile tekrar güvenliği, beklenen sürümle çakışma reddi, değişiklik geçmişi. Belirsiz kaydetme yanıtında aynı istek kimliği korunur. Sonraki değişiklikten önce güncel sürüm yüklenir.
- KDV dahil/hariç kayıt seçimi; TRY kuruş tam sayıları; bilinmeyen maliyet ile sıfır ayrımı.
- Yeni siparişte maliyet kopyası; eski siparişlere bugünkü maliyet uygulanmaz. Varyant maliyeti bilinmeyen. Orijinal kopya güncellenmez; maliyet düzeltmeleri ayrı kayıt.
- Gerçek doğrulanmış site ödemesi üzerinden sipariş katkısı. KDV hariç maliyetler dahil gelirle karıştırılmaz. İadede geri kazanılmış maliyet varsayılmaz; reklam gideri otomatik dağıtılmaz. Net kâr/EBITDA iddiası yok.
- PrestigeSOMS arşivindeki ihtiyaçtan uyarlanan başa baş/hedef fiyat senaryosu; sabit platform/vergi oranı veya otomatik fiyat değişikliği yok.
- Search Console salt okunur OAuth adaptörü ve sorgu/sayfa/cihaz raporu. PT günleri, final veri, 100 satırlık sayfalama, top-row sınırı ve hata durumunda eski raporu temizleme.
- Önceden eklenen Trendyol salt okunur paket listesi korunur; gerçek sağlayıcıya yazma yok.

## Test kanıtı — 19 Eylül

- 271/271 Node testi geçti; yeni maliyet doğrulama/hesap ve Google sahte sağlayıcı testleri dahil.
- TypeScript, tam ESLint, git diff whitespace kontrolü başarılı.
- Son kaynakla Next.js 16.3.5 production build: 76 route/sayfa girdisi. Build yalnız sentetik Supabase fixture'a bağlandı, PayTR/Resend/Trendyol/GSC anahtarları kapalı/test değerleriyle geçersiz kılındı.
- Yeni Faz 2 hedefli tarayıcı paketi: 18/18 geçti.
- Genel paket: 122 geçti, 37 atlandı. Güvenlik opt-in'i gerektiren 36 test ayrıca etkinleştirilerek 36/36 geçti. Toplam 158 farklı senaryo geçti, yalnız masaüstünde uygulanmayan mobil test kaldı. Fiziksel telefon testi değil; Chrome/Pixel 7 profili/iPhone 14 WebKit.
- 16 migration temiz/eski tipli/yedekten döndürülmüş üç yeni yerel PostgreSQL veritabanında başarılı; 38 public tablonun tamamında RLS var. Dört mevcut finans/güvenlik SQL davranış paketi her üçünde geçti.
- `tests/sql/phase2-finance.sql` üç veritabanında geçti: tekrar isteği, sürüm çakışması, değişmez sipariş maliyeti, geçmiş sayısı, stok değişmemesi, rol yetkileri. Yeni migration tekrar uygulandı ve başarılı oldu.
- İlk build yerel test sertifikası süresi dolduğu için sitemap fixture'ına erişemedi; yalnız git dışı localhost sertifikası yenilendi. Son build başarılı. Canlı sertifikaya müdahale yok.
- İlk yeni SQL davranış testi mevcut sipariş durum constraint'ine uymayan sentetik `pending` durumunu kullandı; fixture `Ödeme Bekleniyor` olarak düzeltildi. Üretim constraint'i gevşetilmedi.

## Henüz tamamlanmayan Faz 2 kapsamı

Bu teslim tüm Faz 2 canlı kabulü tamamlandı demek değildir. Aşağıdaki ek teslim, kalıcı Trendyol aktarımını, GSC indeks denetimini ve gönderimsiz pazarlama hazırlığını ekler. Meta Pixel/CAPI göndericisi, reklam hesabı atfı, OAuth bağlantı kurulum ekranı ve Trendyol iptal/iade/fatura/durum/ortak stok yazmaları henüz yok. Gerçek maliyet verileri ve hesap erişimleriyle canlı kabul yapılmadı.

## Kullanıcı kontrolündeki yayın adımları

1. Önce değişiklikler gözden geçirilmeli; commit/push/deploy yapılmadı.
2. Onaylı yayın öncesi `supabase/migrations/20260919130000_phase2_finance_records.sql` production Supabase'e uygulanmalı. Bu çalışma production SQL çalıştırmadı.
3. GSC OAuth ve Trendyol server secret yapılandırmaları güvenli ortamda tamamlanmalı; anahtarlar sohbet/Git'e konmamalı. Varsayılan bağlantılar kapalı.
4. Gerçek hesap salt okunur verileriyle eşleşme kontrolü yapılmalı. Sağlayıcı yazma işlemleri için ayrıca kapsam ve operasyon onayı gerekir.

Arşivden çalıştırılabilir, oturum, anahtar veya sipariş kişisel verisi projeye alınmadı. Dosya envanteri ve seçili kaynak işlevleri incelendi; bütün arşiv güvenlik denetiminden geçmiş sayılmaz.

## API bağlantısı öncesi ek teslim — 19 Eylül akşamı

- Trendyol stream aktarımı: kayıtlı iş/cursor, sürüm kilidi, paket bazında tekrar güvenliği, eski güncellemenin yeni kaydı ezmesini engelleme, cursor döngüsü reddi ve elle devam ettirme. Her adım en fazla 50 paket; sağlayıcı isteği için 5 saniye sınırı. Henüz otomatik cron ve sağlayıcıya yazma yok. SKU eşlemeleri yerel paket listesinde görünür; eşleşmeyen kayıtlar stok veya maliyet işlemine dönüşmez.
- GSC URL Inspection: sadece mağazanın herkese açık HTTPS URL'leri; özel yol/token ve yabancı host reddi. Google'ın kayıtlı indeks durumu gösterilir, canlı tarama veya indeksleme isteği değildir.
- Meta hazırlığı: ayrı imzalı HttpOnly izin kimliği, doğrulanmış canlı site ödemesinden bir defalık held kayıt, aynı browser/server event kimliği için saf payload hazırlayıcısı. İzin geri çekilince payload temizlenir. Hiçbir Meta SDK'sı veya dış gönderim yok. Gönderici eklenmeden önce saklama/silme zamanlaması, gönderim anında yeniden izin kontrolü, gerçek dedup ve hesap kabul testleri zorunlu; mevcut hazırlık flag'i kapalı tutulmalı.
- Yeni tablolar RLS ile kapalı; public/anon/authenticated erişimi yok. Provider ve marketing hazırlık flag'leri varsayılan 0. Gerçek API/anahtar, production SQL, commit veya push işlemi yapılmadı.

### Ek test kanıtı

- 277/277 Node testi; ESLint ve production build başarılı (80 route/sayfa girdisi).
- 18 migration temiz, eski tipli ve pg_dump/restore ile döndürülmüş üç yerel veritabanında geçti; 43 public tablonun tamamında RLS var.
- phase2-finance.sql ve phase2-preparation.sql her üç veritabanında geçti. Mevcut dört ödeme/iade/audit/katalog SQL paketi de geçti.
- İlk genel browser koşusu: 161 geçti, 3 aynı yeni Origin test beklentisi hatası, 1 uygulanmayan masaüstü/mobil testi atlandı. Sentetik sunucunun canonical Origin'i testte düzeltildi; hedefli 24/24 geçti. Ardından güvenlik testleri açık tam paket tekrar çalıştırıldı: **164 geçti, 1 yalnız masaüstünde uygulanmayan mobil test atlandı, 0 hata**. Üretim güvenlik kontrolü değiştirilmedi.
- Testler sentetik veri ve loopback sunucularla yapıldı. Fiziksel telefon, gerçek tahsilat veya provider hesabı kabul testi değildir.

### Onaylı yayında migration sırası

1. `20260919130000_phase2_finance_records.sql`
2. `20260919160000_phase2_provider_preparation.sql`
3. `20260919163000_phase2_marketing_preparation.sql`

### İncelenen sağlayıcı sözleşmeleri

- [Trendyol stream](https://developers.trendyol.com/v2.0/docs/getshipmentpackagesstream)
- [Google URL Inspection](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect)
- [Meta resmi SDK event sözleşmesi](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/event.py): yalnız event kimliği/alan sözleşmesi için; tam CAPI gönderimi uygulanmadı.
