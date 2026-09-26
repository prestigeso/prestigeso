# Faz 2 — Meta Ads dışındaki kabul durumu

## Uygulananlar

- Kullanıcının uyguladığı `20260925130000_trendyol_finance_mirror.sql` canlı şemada doğrulandı.
- Yerel operatör aktarımı, Trendyol'a yalnız GET kullanarak 8 adet 14 günlük iade/cari hesap penceresini özel arşive kaydetti. Son kontrolde 9 iade talebi, 7 Return cari hesap satırı ve 8 tamamlanmış pencere vardı. İkinci çalıştırma sağlayıcıya yeniden gitmeden 0 pencere ile tamamlandı.
- Son 28 gün salt okunur karşılaştırmasında sağlayıcıdaki 2 Return satırı, arşivde de 2 satır ve toplam 998 TL borç-alacak farkı olarak görüldü. Bu tutar **net zarar değildir**.
- Trendyol sipariş detayı arşivdeki iade talebi ve finansal iade hareketlerini salt okunur gösterir. Sipariş, stok, ödeme veya Trendyol durumuna yazmaz.
- Kâr ekranı eksik gider profillerini açıkça gösterir. 365 gün gibi sipariş arşivini aşan dönemlerde Trendyol kârını hesaplamaz; genel satış ekranları kısmi kapsam uyarısı verir.
- Meta API beklenirken Kâr ayarları sekmesine tarih aralığı, toplam tutar ve açık kanal atamasıyla manuel Meta reklam harcaması eklendi. Özel finans kayıtlarının mevcut sürümlü yazma fonksiyonunu kullanır; bu kayıtlar için yeni SQL gerekmez. Harcama seçili döneme zaman oranlı paylaştırılır, düzeltme geçmişi korunur. Kanalı dağıtılmamış kayıt yalnız Tümü görünümünde düşülür.
- Mağaza ve Trendyol için ayrı, sürümlü Kâr ayarları sekmesi eklendi. KDV, komisyon/ödeme kesintisi, diğer ve reklam gideri yalnız yüzde; kargo, paketleme, lojistik, hediye eşiği ve hediye gideri yalnız TL olarak girilir. Alanlara örnek rakam otomatik doldurulmaz. Kullanıcı geçmiş bir geçerlilik günü seçerek yeni sürüm kaydedebilir: o tarihten sonraki siparişlerin tahmini, son geçerli ayar sürümüyle yeniden hesaplanır; sipariş kayıtları değiştirilmez. Sürüm geçmişi ve satış öncesi hesaplama denemesi aynı sekmededir.
- Eksik sipariş/maliyet/iade arşivi veya yüzde bazlı reklam gideri ile olası çifte sayım varsa manuel harcama sonrası toplam hesaplanmış gibi sunulmaz; harcama ayrı gösterilir. Dönem/kanal için kayıt yoksa reklam gideri sıfır varsayılmaz. Kayıtlı giderlerden sonra kalan, bütün reklam harcamalarının kaydedildiğinin kanıtı değildir. Bu veri Meta-atıflı satış veya ROAS değildir.

## Kabul ve sınırlar

- Gönderilen `PrestigeSOMS kopyası.zip` içindeki `calculators.py` ve arayüz varsayılanları incelendi. Ürün, kargo, lojistik, kutu, pazarlama, komisyon, KDV ve görünmeyen gider kalemleri bir hesaplama taslağıdır; 140 TL kargo, 20 TL lojistik, 10 TL kutu, %22 komisyon, %20 reklam ve %3 diğer gider gibi değerler kodda sabit örnek olarak durur. Güncel sözleşme/fatura kanıtı olmadığından gerçek platform profiline aktarılmadı.
- Eski `calculate_dynamic_ebitda`, KDV dahil perakende satış tutarından KDV'yi düz yüzdeyle (`satış × oran`) düşer ve sonucu “EBITDA” diye adlandırır. Yeni hesaplayıcı KDV dahil bedelde iç yüzde kullanır ve sonucu muhasebesel net kâr/EBITDA değil, tahmini kalan tutar olarak gösterir. Kullanıcı ZIP'teki 500 TL üstü 22,50 TL hediye ve 20 TL lojistik değerlerinin örnek olduğunu doğruladı; otomatik kâr profiline kopyalanmadı.

- Kod: ESLint, TypeScript, 318 birim testi ve Next production build geçti. Yeni profil SQL'i izole yerel PostgreSQL üzerinde iki kez uygulanıp geriye tarihli sürüm, aynı gün düzeltmesi, idempotensi ve yetki sınırları doğrulandı. Önceki sipariş detayı/kâr koşusu masaüstü Chrome ve Android Chrome'da 4/4 geçti. Son ayar/kâr/manuel Meta senaryosu yerel sentetik API yanıtlarıyla masaüstü Chrome, Android Chrome ve iOS WebKit'te 3/3 geçti; Android ayar ekran görüntüsü incelendi. Sipariş detayı için önceki `next start` iOS ortamında JS/CSS yüklenememesi nedeniyle **iOS sipariş detayı kabulü hâlâ tamamlanmadı**.
- Canlı admin API/UI bu değişikliklerle yayınlanmadı; push/deploy yapılmadı. Sağlayıcıdan arşive veri aktarımı ve arşivdeki 28 günlük iade satırlarının sayısal eşleşmesi doğrulandı; gerçek tarayıcıda kâr ekranı canlı veriyle kabul edilmedi.
- Yeni tarihli ayarlar için `supabase/migrations/20260925170000_profit_profile_periods.sql` üretim Supabase SQL Editor'da henüz çalıştırılmadı. Bu migration uygulanmadan yeni profil kaydedilemez. Canlı platform gider profili yok. Gerçek KDV/komisyon/ödeme kesintisi/kargo/paketleme/lojistik/hediye/diğer gider değerleri kullanıcıda henüz net değil; sıfır atanmadı. SKU eşlemesi 0, ürün maliyeti kaydı 5. Geçmiş siparişlere bugünkü maliyet geriye dönük uygulanmaz.
- Trendyol geçmiş sipariş API kapsamı sınırlıdır. 365 günlük arşiv ancak önceden biriktirilmiş kayıtlar veya doğrulanmış dışa aktarım ile tam olabilir; şu an eksik dönemler sıfır kabul edilmez.
- Muhasebesel net kâr için gerçek hakediş ve iade/kupon/komisyon/kargo mahsupları ayrıca mutabık olmalı. Tahmini kâr ile kesin net kâr ayrı tutulur.

## Sonraki kullanıcı girdileri

Gerçek platform gider oranları ve tutarları, Trendyol SKU–site SKU eşlemesi ve eksik ürün maliyetleri doğrulanmalı. Bunlar olmadan kâr raporu bilerek hesap dışı bırakır. Kodun yayınlanması ve üretim ortamı tarayıcı kabulü ayrı onay gerektirir.
