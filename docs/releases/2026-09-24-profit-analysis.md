# Tahmini kâr analizi — yerel teslim

Finans → Kâr analizi: Tümü/Mağaza/Trendyol, 24 saat/48 saat/7/28/90/365 gün, hesaplanan ve inceleme bekleyen kayıtlar, sipariş/paket gider dökümü.

## Hesap sözleşmesi

- Tüm satış tutarları KDV dahil; indirim sonrası tutardan iç yüzde ile satış KDV'si ayrılır. TL tutarları kuruş, yüzdeler baz puan olarak hesaplanır.
- Platform bazında satış KDV oranı, toplam KDV dahil komisyon/ödeme kesintisi oranı, sabit kargo, paketleme, diğer gider ve reklam payı belirlenir. Hiçbir sembolik örnek gerçek ayar olarak atanmaz.
- Komisyon, diğer gider ve reklam oranının tabanı indirim sonrası KDV dahil satıştır. Kargo Trendyol'da paket, mağazada sipariş başınadır.
- Giderler KDV dahil düşülür; indirilecek alış KDV'si hesaplanmaz. Bu nedenle sonuç muhasebesel net kâr değil, belirtilen varsayımlar altında tahmini kalan tutardır. Kesin hakediş, gerçek reklam atfı ve vergi beyannamesi değildir.
- Deneme: 700 satış − 50 satıcı kuponu; %20 KDV iç payı 108,33; %15 komisyon 97,50; ürün 200; kargo 130; %10 diğer 65; paket/reklam açıkça 0 → 49,17 TL.

## Tarih ve eksik veri

- Ayarlar eklemeli sürümlerdir; service_role doğrudan update/delete yetkisine sahip değildir. İlk profilin geçmiş başlangıcı yönetici tarafından açıkça seçilebilir. Sonraki sürümler geçmişi yeniden yazmaz.
- Mağazada sipariş oluşurken alınan ürün maliyeti kopyası kullanılır. Trendyol'da satış tarihine kadar kaydedilmiş SKU eşlemesi ve maliyet geçmişi kullanılır. Güncel maliyet eski siparişe otomatik uygulanmaz.
- Maliyeti eksik, KDV hariç veya farklı para birimli ürünler hesaplanmaz. İadeli/iptal kayıtlar kâra eklenmez.
- Trendyol projection v2 satıcı/platform kupon ayrımını saklamıyor. İndirimi sıfır olarak doğrulanamayan paketler toplamdan çıkarılıp gerekçesi gösterilir. Finansal mutabakat entegrasyonu yapılmadan gerçek komisyon/kargo kesintisi iddia edilmez.
- Toptan satış kapsam dışıdır. Gerçek sipariş maliyet düzeltmeleri mevcut Sipariş katkısı aracında kalır; bu yeni bölüm ayar tabanlı tahmin raporudur.

## Kurulum

Supabase SQL Editor'de `supabase/migrations/20260924200000_profit_profiles.sql` çalıştırılmalı. Ardından iki platform için Finans → Kâr analizi → Platform gider ayarları bölümünden gerçek değerler onaylanmalı.

Canlı SQL çalıştırılmadı; commit/push/deploy yapılmadı. Yeni ortam değişkeni gerekmez. Sayfa yalnız aktif kâr görünümünde rapor okur; sağlayıcı API'sine doğrudan istek atmaz.

## Doğrulama

- 307/307 Node testi; kâra özel 8 test dahil.
- TypeScript ve değişen kod için ESLint başarılı.
- İzole sentetik production build: 86 route başarılı. Önceden mevcut workspace-root ve üretilen CSS uyarıları sürüyor.
- Yerel PostgreSQL: tekrar migration, idempotent istek, sürüm çakışması, geçmiş ayar koruması, oran doğrulaması, yetki kontrolleri başarılı. Canlı DB kullanılmadı.
- 3/3 Playwright: masaüstü Chrome, Android Chrome, iOS WebKit. Dolu/boş/hata, KDV dahil hesap, eksik maliyet, onay öncesi kapalı kayıt, kayıt payload'ı ve taşma kontrolü. API verileri sentetik; gerçek sipariş veya ayar değiştirilmedi.
- Masaüstü/Android ekran görüntüleri incelendi; mevcut beyaz ağırlıklı admin tasarım skill'i uygulandı.

## Referanslar

- GİB KDV iç yüzde yöntemi: https://cdn.gib.gov.tr/api/gibportal-file/file/getFile?objectKey=MEVZUAT_TEBLIGLER%2FUNIVERSAL%2F2026%2Fkdv_genteb.pdf
- Trendyol satıcı/platform indirim ayrımı: https://developers.trendyol.com/v2.0/docs/discount-representations-in-the-get-shipment-packages-service
- Kesin finansal hareketler için ayrı entegrasyon: https://developers.trendyol.com/docs/cari-hesap-ekstresi-entegrasyonu
