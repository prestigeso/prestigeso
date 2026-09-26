# Ürünler: tek akış ve çok alanlı toplu düzenleme

- Önceki/Sonraki sayfa kontrolü kaldırıldı. Ürünler 25'lik isteklerle aşağı kaydırıldıkça aynı listeye eklenir. Alt kısımda elle yükleme ve hata sonrası tekrar deneme de vardır. Filtre veya sıralama değişince akış baştan kurulur. Eşit tarihler/fiyatlarda ID ikincil sıralama alanıdır.
- Seçim yüklenen ürünler arasında korunur; kaynak istek ve maliyet yazma sınırları nedeniyle tek toplu işlemde en fazla 25 ürün seçilebilir.
- Kategori, KDV dahil birim maliyet, fiyat, stok ve çok satan işareti aynı önizlemede birlikte seçilebilir. Ürün tablosuna ait alanlar ürün başına tek güncelleme isteğiyle yazılır. Maliyet mevcut sürümlü finans kaydına ayrıca yazılır.
- KDV hariç ve serbest açıklama girişleri kaldırıldı. Maliyet geçmişinde denetlenebilir sabit açıklama `Toplu ürün maliyeti güncellemesi` kullanılır. Eski maliyet kayıtları korunur.
- Bir üründe ürün alanları kaydedilip maliyet başarısız olursa ürün seçili kalır ve kısmi durum açıkça gösterilir. Yeniden önizleme güncel maliyet sürümünü okur. Silme ayrı ve yazılı onay isteyen işlemdir.
- Duplicate SKU seçimi maliyet önizlemesini engeller. Liste sayfası tekrarlı veri döndürürse otomatik yükleme durur.
- Sentetik masaüstü, Android ve iOS testleri ile typecheck, ESLint ve izole build yapıldı. Gerçek ürünler değiştirilmedi; push/deploy yok.
