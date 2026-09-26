# Ürün toplu işlemleri

Seçili sayfadaki en fazla 25 ürün için kategori, birim maliyet, fiyat, stok, çok satan işaretini ekleme/kaldırma ve kalıcı silme. Her çalıştırma bir alanı değiştirir; önizleme ürün/önce/sonra gösterir. Seçim veya girdi değişikliği önizlemeyi geçersiz kılar.

Maliyet mevcut phase2 product_cost kayıtlarını kullanır: SKU, mevcut sürüm, yeni UUID, vergi esası ve gerekçe. Geçmiş sipariş maliyetlerine dokunmaz. Diğer işlemler mevcut yetkili admin/db API üzerinden ürün bazında uygulanır. Toplu işlem tek atomik transaction değildir; başarısız/doğrulanamayan ürünler seçili kalır. Silme ayrıca SİL metni ister; paylaşılan görselleri riske atmamak için storage dosyaları silinmez. Varyant fiyat/stokları değiştirilmez.

Admin tasarım skill'ine uygun mevcut sınıflar korundu; mobilde önce/sonra tablosu alt alta kartlara dönüşür.

Doğrulama: TypeScript, hedefli ESLint, izole sentetik production build ve 9 Playwright testi (desktop Chrome / Android Chrome / iOS WebKit) başarılı. Kategori/çok satan/fiyat/stok payloadları, önizlemeden önce yazma olmaması, maliyet sürümü, silme onayı, geçersiz stok, kısmi hata seçimi sınandı. Masaüstü ve mobil ekran görüntüleri incelendi. Build'de mevcut workspace-root ve üretilmiş CSS uyarıları var. API yanıtları tarayıcı testlerinde sentetiktir; gerçek ürünlerde düzenleme veya silme denenmedi.

Yeni SQL yok. Push/deploy yok.
