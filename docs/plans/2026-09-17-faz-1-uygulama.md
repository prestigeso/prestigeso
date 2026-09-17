# Faz 1 uygulama durumu — 18 Eylül 2026

Faz 1 yerel uygulaması tamamlandı. Kullanıcı 18 Eylül'de SQL'i çalıştırdığını bildirdi ve ayrıntılı testlerden sonra push onayı verdi. Başlangıç commit'i `7277b73`; canlıya test kaydı eklenmedi, production SQL bu ajan tarafından çalıştırılmadı.

## 1A — Ölçüm omurgası

- Kapalı/sürümlü olay sözlüğü, imzalı HttpOnly takma ziyaretçi, oturum, sepet, ödeme girişimi ve sunucu sipariş bağlantısı.
- Ürün/kategori/liste gösterimi ve tıklaması; arama sonuç sayısı, filtre kullanımı; sepet ekleme/çıkarma/miktar değişimi; checkout adımı ve sınıflandırılmış hata; görünür/aktif süre örnekleri.
- Origin, gövde boyutu, alan listesi, kimlik sahipliği, ürün/kategori geçerliliği, rate-limit; RLS kapalı erişim ve yalnız service-role RPC yetkisi.
- Sunucu olay sırası, atomik tekilleştirme, çoklu sekmede ortak oturum, izin iptaliyle eşzamanlı gönderim koruması.
- Satış yalnız doğrulanmış ödeme durumu ve `paid_at` üzerinden sayılır. Analitik bağlantı hatası tahsilatı engellemez; izin iptalinde finansal sipariş korunur.

## 1B — Yönetici ekranları

`/admin/analytics`: Genel, Ürün & keşif, Ana sayfa, Sepet & ödeme, Yolculuklar, Veri kalitesi.

- Sıralı oturum hunisi, önceki dönem, finans ve davranış kapsamının ayrımı, pay/payda ve veri-yok gösterimi.
- Farklı ürün/kategori derinliği, tekrar inceleme, ilk beş farklı görüntüleme ve ilk tıklamalar ayrı, sıra bazında sonradan sepete ekleme ve ürün geçişleri.
- Takma ziyaretçi bazında ürün→sepet, sepet→ödeme, ilk bakış→ekleme süresi; gözlenen oturum sırası ve zaman çizelgesi.
- Açık/boş/terk/ödeme bekleyen/ödenmiş sepetler, son checkout adımı, bilinmeyen ödeme sonucu ve hata sınıfları.
- Dönem/cihaz/kaynak/trafik/yeni-geri dönen filtreleri, ürün adı/SKU zenginleştirme, sayfalama, boş/hata ekranları.
- Eski analizdeki sipariş/ziyaret sayacı gerçek huni diye sunulmuyor; yeni analiz bağlantısı eklendi.

## 1C — İzin, maliyet ve saklama

- 30 dakika hareketsizlik oturumu, 24 saat terk eşiği, 30 gün ham veri; politika ve çerez izin sürümü `2026-09-17`.
- İzin reddi/geri alma, sekmeler arası iptal, depolama engelliyken bellek yedeği; sınırlı kuyruk ve iptal edilebilir gönderim. Kalıcı offline olay kuyruğu yok.
- Maintenance üzerinden eski veri silme; fiziksel silme zamanlayıcı sıklığına bağlı. Serbest arama metni/URL veya kişisel iletişim/ödeme alanları tutulmuyor.
- Kaynak başına 20.000 kayıt rapor bütçesi aşılırsa eksik rapor yerine açık kapasite hatası. Yüksek hacim için SQL toplulaştırma ayrı ölçekleme gerektirir.
- Meta/Pixel/CAPI/ROAS/Trendyol Faz 2'de rafta; fingerprint/session replay ve uzun vadeli anonim özet eklenmedi.

## Doğrulama

- 248/248 Node testi; TypeScript, ESLint, `git diff --check` başarılı. A → B → A → ekle/çıkar → checkout → başarı sayfası yenileme kabul senaryosu da dahil.
- Yerel sentetik production build başarılı; 71 sayfa derlendi.
- 15 migration içeren yeni/legacy/yedekten restore denemesi başarılı. Son Faz 1 SQL'i üç veritabanında tekrar uygulanıp RLS/izin/sahiplik/tekilleştirme/saklama ve finansal kayıt koruma testlerinden geçti.
- Üç eşzamanlılık kontrolü başarılı: iki sekme ortak oturum; tekrar olay tek kayıt; izin iptali geç gelen olaya üstün.
- SQL sonrası tekrar: 15 migration, 35/35 RLS tablo, yeni/legacy/yedekten restore senaryoları ve her birinde dört finansal/katalog SQL paketi geçti. İade paketi 100 sentetik siparişte 783 sıralı kısmi iade ile kuruş ve stok korunmasını da doğruladı. Faz 1 SQL paketi ayrıca üç veritabanında geçti.
- Next.js 16.3.5, sharp 0.35.4, eslint-config-next 16.3.5 ve js-yaml 4.3.2 güvenlik yamaları uygulandı. Tüm bağımlılıkları kapsayan `npm audit`: 0 bilinen açık. Yamalı sürümde 248 Node testi, lint, typecheck, 71 sayfalık build ve HTTP E2E tekrar geçti.
- Yapılandırılmış Supabase üzerinde salt okunur, veri içeriği indirmeyen sorgular: dört analitik tablo service-role 200, anonim 401; raporun oturum sütunları mevcut. Canlı RPC, authenticated rol ve cron çalışma durumu bu HEAD kontrolüyle doğrulanmış sayılmaz.
- Son 141 senaryolu Chrome/Android Chrome/iOS WebKit turu, güvenlik yamalı Next.js 16.3.5 üzerinde tekrarlandı: 140 başarılı, 1 bilinçli atlama (yalnız mobil gezinme kontrolünün masaüstü profili). Hata yok; süre 3,6 dakika. Yeni analitik senaryolarının 18/18'i geçti. Üç profilin admin ekran görüntüleri de incelendi.

Tarayıcı testlerinde dış servisler sentetik; gerçek PostgreSQL testleri loopback üzerinde. Fiziksel telefon, gerçek kart/PayTR veya production Supabase testi yapılmadı. Test başarısı tüm olası hataların yokluğu garantisi değildir.

Kurulum sırası, metrik sınırları ve özellik kontrol listesi: [Faz 1 yayın notu](../releases/2026-09-18-phase1-release.md). Migration: `supabase/migrations/20260917180000_phase1_analytics.sql`. Salt okunur SQL kontrolü: `docs/releases/2026-09-18-phase1-verify.sql`.
