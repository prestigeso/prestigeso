# Search Console — bağlantı kabulü ve panel tamamlama

## Kapsam

Yalnız Google Search Console. Trendyol veya Meta geliştirmesi/etkinleştirmesi bu teslim kapsamında değildir. Kullanıcının verdiği test yetkisiyle yerel sunucu anahtarları kullanılarak Google'a salt okunur istekler gönderildi; anahtar veya token çıktıya alınmadı.

## Gerçek bağlantı kanıtı — 20 Eylül 2026

- `sc-domain:prestigeso.com.tr` mülk erişimi: `siteOwner`, başarılı.
- 21 Ağustos–17 Eylül PT, final web raporu: 2 sorgu satırı, 18 sayfa satırı, 3 cihaz satırı. Bunlar Google'ın döndürdüğü satır sayılarıdır; trafik toplamı/tüm veri garantisi değildir.
- `https://www.prestigeso.com.tr/` indeks kaydı okundu. Google'ın 20 Eylül 05:50 UTC tarama kaydında hem bildirilen hem seçilen canonical `https://prestigeso.com.tr/`. www adresi alternatif sayfa olarak kayıtlı. Bu veri canlı HTML testi veya Google'a yeniden indeksleme talebi değildir.
- Bu turn öncesinde dört GSC değişkeni Vercel Production'a Sensitive olarak eklendi. Bu turn ortam değişikliği veya deployment yapmadı. Yerel adapter başarısı, Vercel deployment kabulü yerine geçmez.

## Kod

- Yetkili admin için bağlantı denetimi: sabit mülkü Google Sites API üzerinden kontrol eder, sadece erişim seviyesi/zaman döndürür. İstek bütçesi ve no-store; otomatik arka plan çağrısı yok.
- Token yenileme, mülk/API yetkisi, kota, bozuk yanıt ve erişim hatalarının güvenli sabit mesajları. Google yanıt gövdesi veya gizli bilgi hata metnine taşınmaz.
- 7/28/90 günlük PT tarih kısayolları. Son 3 gün konservatif olarak dışarıda; final veri garantisi verilmez. Boş/geçersiz sıralı tarih aralığında istemci isteği engellenir; sunucu aralık ve sayfalama kontrolü korunur.
- Bağlantı/rapor/indeks isteklerinde istemci timeout'u; eski başarılı sonuç yeni başarısız denemede temizlenir.
- İndeks alanlarına Türkçe başlıklar ve alternatif canonical açıklaması. Farklı canonical otomatik hata sayılmaz.

## Son kaynak test sonuçları

- 280/280 Node testi başarılı; sabit mülk denetimi, yetkisiz/yanlış mülk reddi, gizli bilgi içermeyen hata sınıfları ve yaz/kış saati geçişlerinde PT tarih aralıkları dahil.
- TypeScript ve ESLint başarılı.
- İzole production build başarılı: 81 route/sayfa girdisi. Build ve browser sunucularında gerçek sağlayıcı bilgileri sentetik değerlerle değiştirildi; Google bağlantısı bu ortamlarda kapalı.
- Güvenlik testleri etkin tam Playwright paketi: 167 başarılı, 1 masaüstüne uygulanmayan mobil senaryo atlandı, 0 başarısız. Chrome, Pixel 7 Chrome profili ve iPhone 14 WebKit; fiziksel cihaz testi değildir.
- Yeni bağlantı butonu, hatada eski başarının temizlenmesi, tarih kısayolları, yetkisiz API erişimi ve kapalı bağlantı davranışı üç profilde doğrulandı.
- Gerçek Google testleri ayrıca doğrudan server adapter üzerinden salt okunur yapıldı; Vercel üzerindeki admin oturumu/çalışma zamanı henüz doğrulanmadı.

## Yayın kapısı (güncel)

Yeni SQL yok. Commit/push/deploy yapılmadı. Onaylı deployment sonrası admin `/admin/phase2` içinde **Google bağlantısını kontrol et**, rapor ve indeks denetimi gerçek Vercel çalışma ortamında tekrar sınanmalı. GSC sunucu sırları NEXT_PUBLIC değişkenlerine taşınmamalı.

## Kaynaklar

- [Google Sites get](https://developers.google.com/webmaster-tools/v1/sites/get)
- [Search Analytics query, PT ve üst satır sınırları](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
- [URL Inspection, kayıtlı indeks sürümü](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect)
