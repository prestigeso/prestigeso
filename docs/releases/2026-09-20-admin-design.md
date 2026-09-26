# Admin tasarımı — ilk yerel sürüm

## Kapsam

Müşteri vitrininin `Navbar.tsx` ve `HomeClient.tsx` bileşenlerinden alınan siyah/beyaz, güçlü sans-serif başlık ve yuvarlatılmış yüzey yaklaşımı admin raporlarına uyarlandı. Müşteri arayüzü bu tasarım çalışmasında değiştirilmedi.

- Analiz ve entegrasyon sayfaları için ortak üst menü: satış analizi, müşteri yolculuğu, finans ve bağlantılar; ana panele dönüş korunur.
- Phase2 çalışma alanı: genel bakış, finans, Trendyol, Google ve Meta bölümleri. Finans araçları ayrı alt menüde; bölüm değişirken form durumu korunur.
- Önceki yeşil tema kaldırıldı; nötr yüzeyler, siyah birincil butonlar, görünür klavye odağı, mobil kaydırılabilir menüler ve tablo düzeni eklendi.
- Müşteri yolculuğu: filtre kartı, bölüm menüsü ve beş metrik kartı. Eski satış analizine ortak navigasyon ve rapor stilleri uygulandı; mevcut hesaplamalar korundu.
- Tasarım rehberi: `C:/Users/beytu/.codex/skills/prestigeso-admin-design/SKILL.md`. Yerel skill, uygulama dağıtımının parçası değildir.

## Doğrulama

20 Eylül 2026, sentetik yerel üretim derlemesi:

- Skill doğrulaması başarılı.
- TypeScript, ESLint, `git diff --check` başarılı (Git CRLF bilgilendirmeleri mevcut).
- 81 rotalı izole üretim derlemesi başarılı.
- 280/280 Node testi başarılı.
- `phase2-workspace.spec.ts` ve `analytics-phase1.spec.ts`: 48/48 tarayıcı testi başarılı; Desktop Chrome, Pixel 7 Chrome ve iPhone 14 WebKit.
- Boş/dolu/hata raporları, rıza davranışı, yetkisiz erişim, idempotent kayıt, manuel sağlayıcı çağrısı, takvim aralığı, görünür navigasyon, mobil taşma ve form korunması denetlendi.
- İlk koşularda Next.js'in görünmeyen alan kopyaları tarih/kayıt seçicilerini çoğalttı; testler görünür kontrolleri hedefleyecek şekilde güncellendi. Son tam koşu 48/48 geçti.
- Masaüstü genel bakış, dolu müşteri yolculuğu; mobil Google, finans ve ziyaretçi tabloları ekran görüntüleri görsel olarak incelendi.

Önizlemeler (yerel test verileri, canlı rapor değildir): `tmp/admin-design-workspace-desktop.png`, `tmp/admin-design-google-mobile.png`, `tmp/admin-design-overview-desktop-chrome.png`.

## Sınırlar

Bu çalışma yeni API bağlantısı veya üretim kabul testi değildir. Yeni SQL gerekmez. Mevcut kimlik doğrulama, sağlayıcı bayrakları, hesaplamalar ve istek mantığı değiştirilmedi. Önceki Phase2/SEO değişiklikleri korunmuştur. Commit, push veya deploy yapılmadı. Kullanıcının görsel değerlendirmesi ve ayrı yayın onayı beklenir.
