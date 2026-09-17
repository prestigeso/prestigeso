# Faz 1 — yerel teslim ve yayın kontrol listesi

Kullanıcı 18 Eylül'de ayrıntılı testlerden sonra commit/push onayı verdi. Canlı SQL'i kullanıcı çalıştırdı; bu çalışma canlıya test verisi yazmaz. Push, Vercel deploy'unun başarıyla tamamlandığı anlamına gelmez.

## SQL sonrası yayın öncesi ek kontrol

18 Eylül: kullanıcı SQL'i çalıştırdığını bildirdi ve testler sonrasında push onayı verdi. Yapılandırılmış Supabase üzerinde veri içeriği indirmeyen HEAD sorgularında dört analitik tablo service-role ile 200, anonim anahtarla 401 döndü. Bu, tabloların erişilebilirliğini ve anonim erişim reddini doğrular; canlı RPC/cron çalışma ve authenticated rol kontrollerinin tamamının yerine geçmez. Canlıya test kaydı eklenmedi.

Bağımlılık taramasında bulunan uyarılar için Next.js ve eslint-config-next 16.3.5'e, sharp alt sınırı 0.35.4'e yükseltildi. Kaynaklar: [Next.js Windows duyurusu](https://github.com/advisories/GHSA-p293-qw3h-jr36), [görsel işleme duyurusu](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4), [sharp duyurusu](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c). Geliştirme bağımlılığındaki js-yaml uyarısı da 4.3.2 uyumlu lockfile güncellemesiyle giderildi. Tüm bağımlılıklarda `npm audit` sonucu: 0 bilinen açık. Son sürümler üzerinde bütün testler tekrar çalıştırılır.

Depodaki Vercel maintenance zamanlaması günlük `02:00 UTC`; gerçek zamanlayıcı çalışması bu kontrol sırasında tetiklenmedi veya doğrulanmadı. Dolayısıyla fiziksel veri silme 30 günlük eşikten sonraki günlük çalışmada gerçekleşebilir.

## Yayına alma sırası

1. Faz 0 migration zincirinin uygulanmış olduğunu doğrulayın; veritabanı yedeğini alın.
2. `supabase/migrations/20260917180000_phase1_analytics.sql` dosyasını Supabase SQL Editor'da tek parça çalıştırın. Dosya transaction içerir.
3. `docs/releases/2026-09-18-phase1-verify.sql` salt okunur kontrolünü çalıştırın: dört tablo mevcut ve RLS açık; anon/authenticated okuma ve RPC çalıştırma yetkileri kapalı; service_role RPC yetkisi açık olmalı.
4. Mevcut `RATE_LIMIT_SECRET` en az 32 karakter olmalı. Yeni bir dış analitik servisi veya API anahtarı gerekmiyor. Secret'ı paylaşmayın.
5. Yetkilendirilmiş `/api/maintenance` zamanlanmış çağrısının çalıştığını doğrulayın. Bu görev `analytics_purge` çalıştırır; hata durumunda görev başarısız döner. 30 günden eski verinin fiziksel silinmesi görev sıklığına bağlıdır; rapor penceresi ise her zaman son 30 gündür. Faz 0 outbox gereksinimiyle birlikte saatlik çalışma tercih edilir. Zamanlayıcı ayarı ayrıca onaylanmalıdır.
6. Onaydan sonra gerçek production ortam değişkenleriyle yeniden build/deploy edin. Yerel sentetik `.next` derlemesini yayınlamayın.
7. Admin panelindeki analiz bağlantısından `/admin/analytics` sayfasına girip aşağıdaki kabul kontrollerini yapın.

## Eklenen ekranlar ve kabul kontrolleri

- **Genel:** ziyaret → ürün → sepet → ödeme → doğrulanmış satış hunisi; yüzde yanında pay/payda. Sıfır payda “veri yok” olmalı. Finansal toplamların davranış filtresinden bağımsızlığı açıklanır.
- **Ürün & keşif:** ürün görüntüleme/tıklama/liste gösterimi, ilk 3/5 keşif sırası, tekrar inceleme, kategori derinliği, sonuçsuz aramalar, filtre kullanımı. Ürün adı/SKU varsa gösterilir.
- **Ana sayfa:** giriş yapan oturumların ilerlemesi; hero, kategori ve ürün bloklarının gösterim/tıklama verileri.
- **Sepet & ödeme:** açık, boş, ödeme bekleyen, 24 saatlik eşik sonrası terk edilmiş ve ödenmiş sepet; son ödeme adımı ve sınıflandırılmış hata. Bekleyen ödeme doğrudan terk sayılmaz.
- **Yolculuklar:** takma ziyaretçi bazında gözlenen oturum sırası, farklı ürün/kategori, ilk beş ürün, tekrar inceleme, ürün→sepet ve sepet→ödeme oranları, zaman çizelgesi.
- **Veri kalitesi:** personel/bot ayrımı, veri tazeliği, kapsam ve önceki dönem eksikleri.
- Tarih, cihaz, kaynak, trafik ve yeni/geri dönen filtreleri; tablo, oturum ve zaman çizelgesi sayfalaması. Boş/hatalı API yanıtında sahte değer gösterilmemeli.

## İzin ve saklama

- Çerez izin sürümü `2026-09-17`; önceki izin yeni ölçüm kapsamı için otomatik kabul edilmez.
- 30 dakika hareketsizlik sonrası yeni oturum; 24 saatlik terk penceresi; 30 günlük ham veri saklama.
- İzin yoksa davranış olayları gönderilmez. İptalde kuyruk ve istekler durur; ziyaretçinin analitik oturum/olay/sipariş bağlantıları silinir. Finansal sipariş silinmez.
- İptal işareti 30 gün tutulur; geç gelen isteklerin tekrar veri oluşturması engellenir. Başarısız silme bir sonraki ziyaret/yeniden izin sırasında tekrar denenir.
- Normal tarayıcı depolamasında izin değişikliği açık sekmelere yayılır. Depolama engelliyse sayfa ömrü boyunca bellek kimliği kullanılır; kalıcı ziyaretçi devamlılığı garanti edilmez.
- Serbest URL, arama metni, e-posta, telefon, adres, kart bilgisi veya istemciden gelir/paid olayı alınmaz. Fingerprint ve oturum videosu yoktur.
- Satış gerçeği sunucudaki ödeme durumu ve `paid_at` kaydıdır. Analitik ilişkilendirme opsiyoneldir; başarısızlığı tahsilat akışını bozmaz.

## Ölçüm sınırları

- Takma ziyaretçi gerçek kişi değildir. İzin reddi, reklam engelleyici, çevrimdışı kullanım, tarayıcı/cihaz değişimi ölçüm kaybı yaratır; yüzde yüz kullanıcı takibi iddia edilmez.
- Ziyaret sırası ve yeni/geri dönen ayrımı yalnızca saklanan 30 günlük gözleme dayanır; hayat boyu ilk ziyaret anlamına gelmez.
- Süreler yaklaşık değerlerdir. Aktif zaman yalnızca görünür/etkileşimli sayfada 15 saniyelik parçalarla ölçülür; kısa ziyaretler eksik kalabilir. Sunucuya ulaşma ve paketleme gecikmeleri vardır.
- Her veri kaynağında 20.000 kayıt koruma sınırı vardır. Aşılırsa eksik veriyle rapor üretmek yerine kapasite hatası gösterilir. Daha yüksek hacim için SQL toplulaştırma gerekir. Ad/SKU zenginleştirmesi en çok 1.000 üründür; kalanlarda ürün kimliği gösterilir.
- 30 günlük raporun önceki 30 günlük karşılaştırması 30 günlük saklamayla tam değildir; panel bunu açıkça belirtir. Geçmiş sayaçlardan yolculuk üretilmez. Uzun vadeli anonim özetler için ayrı saklama kararı gerekir.
- Meta Pixel/CAPI, reklam harcaması/ROAS, Trendyol ve diğer Faz 2 işleri eklenmedi.

## Yerel doğrulama

`npm test`, `npm run typecheck`, `npm run lint`; sentetik servislerle `node scripts/phase0-local.mjs build|start`; loopback HTTPS üzerinde Playwright matrisi.

Veritabanı: `PHASE0_DB_TESTS=1` ile `node scripts/test-phase0-migrations.mjs`; yeni/legacy/restore sentetik PostgreSQL doğrulaması. `tests/sql/analytics.sql` RLS, tekilleştirme, oturum sahipliği, izin iptali, finansal kayıt korunması ve saklama kontrollerini içerir. `scripts/test-phase1-concurrency.mjs`, açıkça seçilmiş loopback test veritabanında eşzamanlı sekme/tekrar/iptal yarışlarını sınar.

Son test sayıları [uygulama durumunda](../plans/2026-09-17-faz-1-uygulama.md) tutulur. Fiziksel telefon, gerçek kart, canlı PayTR veya canlı Supabase ile işlem yapılmadı.
