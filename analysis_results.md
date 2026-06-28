# 🔍 PrestigeSO E-Ticaret Projesi — Kapsamlı Kod İnceleme Raporu

> **Tarih:** 2026-05-28  
> **İncelenen Dosya Sayısı:** 80+  
> **Toplam Bulgu:** 90+

---

## 📊 Genel Özet

| Kategori | 🔴 Kritik | 🟠 Yüksek | 🟡 Orta | 🔵 Düşük | Toplam |
|----------|-----------|-----------|---------|----------|--------|
| Güvenlik Açıkları | 8 | 6 | 5 | 2 | **21** |
| Hatalar / Buglar | 3 | 5 | 6 | 2 | **16** |
| Eksik / Yarım Özellikler | 2 | 5 | 8 | 3 | **18** |
| Performans Sorunları | 3 | 4 | 4 | 3 | **14** |
| Kod Kalitesi / Tip Güvenliği | 1 | 3 | 5 | 6 | **15** |
| İyileştirme Önerileri | — | — | — | — | **8** |
| **TOPLAM** | **17** | **23** | **28** | **16** | **92** |

---

## 🎯 Acil Müdahale Gerektiren İlk 10 Bulgu

| # | Bulgu | Ciddiyet | Dosya |
|---|-------|----------|-------|
| 1 | Middleware dosyası çalışmıyor — Admin panel herkese açık | 🔴 KRİTİK | `proxy.ts` |
| 2 | PayTR create-token'da userId doğrulaması yok | 🔴 KRİTİK | `api/paytr/create-token/route.ts` |
| 3 | Client-side fiyat hesaplama manipülasyona açık | 🔴 KRİTİK | `checkout/page.tsx` |
| 4 | Tüm kuponlar client'a indiriliyor | 🔴 KRİTİK | `checkout/page.tsx` |
| 5 | PayTR callback hash karşılaştırması timing-safe değil | 🔴 KRİTİK | `api/paytr/callback/route.ts` |
| 6 | Callback'te stok race condition | 🔴 KRİTİK | `api/paytr/callback/route.ts` |
| 7 | Admin DB operasyonları client-side yapılıyor | 🔴 KRİTİK | `AdminPanel.tsx` |
| 8 | Güvenlik başlıkları eksik (CSP, HSTS, X-Frame) | 🟠 YÜKSEK | `next.config.ts` |
| 9 | SEO metadata tamamen eksik | 🟠 YÜKSEK | Tüm sayfalar |
| 10 | Ödeme başarılı sayfasında IDOR açığı | 🟠 YÜKSEK | `odeme/basarili/page.tsx` |

---

# 🔴 BÖLÜM 1: GÜVENLİK AÇIKLARI

## SEC-01: Middleware Dosyası Çalışmıyor — Admin Panel Tamamen Açık 🔴 KRİTİK

**Dosya:** [proxy.ts](file:///c:/Users/beytu/Desktop/PrestigeSO/proxy.ts)

Next.js middleware dosyasının adı `middleware.ts` olmalıdır. Projede `proxy.ts` adında bir dosya var ama Next.js bu dosyayı **asla çalıştırmaz**. Sonuç olarak:

- `/admin` paneline herkes erişebilir
- `/api/admin/*` endpoint'leri korumasız
- Ürün silme, sipariş değiştirme, yorum silme gibi tüm admin operasyonları herkese açık

```diff
- // proxy.ts
- export async function proxy(req: NextRequest) { ... }
+ // middleware.ts  
+ export async function middleware(req: NextRequest) { ... }
```

> [!CAUTION]
> Bu projenin en kritik güvenlik açığıdır. `proxy.ts` dosyası `middleware.ts` olarak yeniden adlandırılmalı ve export edilen fonksiyon adı `middleware` olarak değiştirilmelidir.

---

## SEC-02: PayTR Create Token — userId Sunucuda Doğrulanmıyor 🔴 KRİTİK

**Dosya:** `app/api/paytr/create-token/route.ts` (Satır ~230)

`userId` doğrudan `body.userId` olarak client'tan alınıyor. Supabase auth token ile sunucu tarafında doğrulanmıyor.

**Risk:**
- Kötü niyetli kullanıcı başka birinin `userId`'sini gönderebilir
- Başka kullanıcının kuponlarını harcayabilir
- Başka kullanıcı adına sipariş oluşturabilir

**Çözüm:** Supabase auth header'ından kullanıcı kimliğini doğrulayın:
```ts
const { data: { user } } = await supabase.auth.getUser(token);
const userId = user?.id; // client'tan gelen değil, auth'tan gelen
```

---

## SEC-03: Client-Side Fiyat Hesaplama Manipülasyonu 🔴 KRİTİK

**Dosya:** [checkout/page.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/app/checkout/page.tsx) (Satır ~278)

`cartTotal`, `couponDiscount`, `shippingFee`, `finalTotal` hesaplamaları tamamen client-side yapılıp sunucuya gönderiliyor. Kullanıcı DevTools ile body'yi değiştirip çok düşük fiyata sipariş verebilir.

**Çözüm:** Tüm fiyat hesaplamalarını sunucu tarafında (`/api/paytr/create-token`) bağımsız olarak yapın. Client'tan gelen değerleri **asla güvenmeyin**.

---

## SEC-04: Tüm Kuponlar Client'a İndiriliyor 🔴 KRİTİK

**Dosya:** [checkout/page.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/app/checkout/page.tsx) (Satır ~113)

```ts
supabase.from("coupons").select("*")
```

TÜM kuponlar (aktif/inaktif, süresi geçmiş, gizli) client'a çekiliyor. RLS yoksa ciddi veri sızıntısı.

**Çözüm:** Kupon doğrulamasını server-side API endpoint'ine taşıyın. Client sadece kupon kodunu göndermeli, sunucu geçerliliği kontrol etmelidir.

---

## SEC-05: PayTR Callback — Hash Timing Attack'a Açık 🔴 KRİTİK

**Dosya:** `app/api/paytr/callback/route.ts` (Satır ~118)

```ts
if (hash !== checkHash) // ❌ Timing-safe değil
```

Sıradan string karşılaştırması kullanılıyor. Login route'ta `timingSafeStringEqual` doğru uygulanmış ama ödeme callback'inde unutulmuş.

**Çözüm:**
```ts
import { timingSafeEqual } from 'crypto';
const isValid = timingSafeEqual(Buffer.from(hash), Buffer.from(checkHash));
```

---

## SEC-06: PayTR Callback — Stok Race Condition 🔴 KRİTİK

**Dosya:** `app/api/paytr/callback/route.ts` (Satır ~168-197)

Stok güncelleme read-then-write pattern ile yapılıyor. İki eşzamanlı callback aynı stok değerini okuyup birisi diğerinin değişikliğini ezebilir (lost update).

**Çözüm:** Supabase RPC (stored procedure) ile atomik güncelleme yapın:
```sql
UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1
```

---

## SEC-07: Admin Panel — Client-Side DB Operasyonları 🔴 KRİTİK

**Dosya:** [AdminPanel.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/components/admin/AdminPanel.tsx) (15+ yerde)

Tüm admin CRUD operasyonları (insert, update, delete) doğrudan client-side Supabase (anon key) ile yapılıyor. RLS politikaları doğru değilse, tarayıcı konsolundan manipüle edilebilir.

**Çözüm:** Admin operasyonlarını server-side API route'lara taşıyın ve `supabaseAdmin` kullanın.

---

## SEC-08: Ödeme Başarılı Sayfasında IDOR Açığı 🔴 KRİTİK

**Dosya:** `app/odeme/basarili/page.tsx` (Satır ~62-66)

`merchant_oid` URL parametresiyle doğrudan DB sorgusu yapılıyor. Yetkilendirme kontrolü yok. Kullanıcı URL'deki `oid`'yi değiştirerek başka siparişlerin bilgilerini görebilir.

**Çözüm:** Sipariş sorgusuna `user_id` filtresi ekleyin.

---

## SEC-09: Güvenlik Başlıkları Eksik 🟠 YÜKSEK

**Dosya:** [next.config.ts](file:///c:/Users/beytu/Desktop/PrestigeSO/next.config.ts)

Eksik başlıklar:
- `X-Frame-Options: DENY` → Clickjacking koruması
- `Content-Security-Policy` → XSS koruması
- `Strict-Transport-Security` (HSTS) → HTTPS zorunluluğu

---

## SEC-10: Login Route — IP Spoofing ile Rate Limit Bypass 🟠 YÜKSEK

**Dosya:** `app/api/admin/login/route.ts` (Satır ~22-36)

`x-forwarded-for` header'ı client tarafından manipüle edilebilir. Ayrıca in-memory rate limiting serverless (Vercel) ortamında çalışmaz — her instance kendi Map'ine sahip olur.

**Çözüm:** Redis tabanlı rate limiting veya Vercel KV kullanın.

---

## SEC-11: OrdersModal — Client-Side Kargo Güncelleme 🟠 YÜKSEK

**Dosya:** [OrdersModal.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/components/admin/modals/OrdersModal.tsx) (Satır ~169-176)

Admin kargo bilgisi güncelleme, client-side `supabase` (anon key) üzerinden yapılıyor.

---

## SEC-12: E-posta ile Kullanıcı Varlığı Tespiti (User Enumeration) 🟠 YÜKSEK

**Dosya:** [login/page.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/app/login/page.tsx) (Satır ~145-154)

E-posta sorgusu sonucuna göre "LOGIN" veya "REGISTER" adımına yönlendiriliyor. Saldırgan hangi e-postaların kayıtlı olduğunu tespit edebilir.

---

## SEC-13: Adres Silme — user_id Kontrolü Yok 🟠 YÜKSEK

**Dosya:** [AddressesTab.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/components/profile/AddressesTab.tsx) (Satır ~259)

```ts
supabase.from("addresses").delete().eq("id", id) // user_id kontrolü yok!
```

---

## SEC-14: PayTR iFrame URL Doğrulanmıyor 🟠 YÜKSEK

**Dosya:** [CheckoutPaymentModal.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/components/checkout/CheckoutPaymentModal.tsx) (Satır ~47)

`iframeUrl` doğrudan `<iframe src>` olarak kullanılıyor, URL doğrulaması yok.

---

## SEC-15: supabaseAdmin Service Key Sızıntı Riski 🟡 ORTA

**Dosya:** [lib/supabaseAdmin.ts](file:///c:/Users/beytu/Desktop/PrestigeSO/lib/supabaseAdmin.ts)

`import 'server-only'` paketi eklenmemiş. Client bundle'a yanlışlıkla dahil edilirse service role key sızar.

---

## SEC-16: Login Hata Mesajlarında Konfigürasyon Sızıntısı 🟡 ORTA

**Dosya:** `app/api/admin/login/route.ts` (Satır ~139-157)

`"ADMIN_PASSWORD boş veya okunamadı"` gibi iç konfigürasyon bilgileri dışarıya sızdırılıyor.

---

## SEC-17: localStorage Verileri Doğrulanmıyor 🟡 ORTA

**Dosyalar:** `app/page.tsx:80`, `app/profile/page.tsx:142`, `app/product/[id]/page.tsx:155`

`localStorage` XSS ile zehirlenebilir, okunan veriler doğrulanmıyor.

---

## SEC-18: Image URL'leri Doğrulanmıyor 🟡 ORTA

Veritabanındaki resim URL'leri doğrulanmadan `<img src>` olarak kullanılıyor.

---

## SEC-19: page_views Tablosuna Sınırsız Insert 🟡 ORTA

**Dosya:** `app/page.tsx:112-114`

Herhangi biri (giriş yapmamış bile) `page_views` tablosuna kayıt ekleyebiliyor. Spam riski.

---

## SEC-20: Dosya Yükleme Sadece Client-Side Doğrulama 🔵 DÜŞÜK

**Dosya:** `app/product/[id]/page.tsx:474-500`

Dosya tipi/boyut kontrolü sadece client tarafında. Supabase Storage bucket'ında da kısıtlama yapılmalı.

---

## SEC-21: Slider Görseli Validasyonu Yok 🔵 DÜŞÜK

**Dosya:** [SettingsModal.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/components/admin/modals/SettingsModal.tsx) (Satır ~251)

Dosya boyutu, tip kontrolü ve maksimum dosya sayısı validasyonu yok. SVG/HTML yüklenebilir.

---

# 🐛 BÖLÜM 2: HATALAR VE BUGLAR

## BUG-01: `proxy.ts` Middleware Olarak Tanınmıyor 🔴 KRİTİK

*(SEC-01 ile aynı — yukarıda detaylı anlatıldı)*

---

## BUG-02: Sipariş Fiyat Hesaplama Hatası 🔴 KRİTİK

**Dosya:** [OrdersTab.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/components/profile/OrdersTab.tsx) (Satır ~35)

```ts
const price = Number(item.price || item.discount_price || 0) // ❌ YANLIŞ
```

`item.price` her zaman truthy olacağından `discount_price` asla kullanılmayacak.

```diff
- const price = Number(item.price || item.discount_price || 0)
+ const price = Number(item.discount_price || item.price || 0)
```

---

## BUG-03: Yıldız Gösterimi RangeError Riski 🔴 KRİTİK

**Dosyalar:** `app/page.tsx:746`, `app/product/[id]/page.tsx:648`, `app/profile/page.tsx:318`

```ts
"★".repeat(Math.round(avgRating)) + "☆".repeat(5 - Math.round(avgRating))
```

`avgRating = 5.5` → `Math.round()` = 6 → `"☆".repeat(5-6)` = `"☆".repeat(-1)` → **RangeError** 💥

```diff
- Math.round(avgRating)
+ Math.min(5, Math.max(0, Math.round(avgRating)))
```

---

## BUG-04: `supabase.ts` Non-null Assertion ile Sessiz Hata 🟠 YÜKSEK

**Dosya:** [lib/supabase.ts](file:///c:/Users/beytu/Desktop/PrestigeSO/lib/supabase.ts) (Satır ~3-4)

```ts
process.env.NEXT_PUBLIC_SUPABASE_URL! // ❌ env yoksa undefined geçer
```

`supabaseAdmin.ts`'deki gibi açık kontrol yapılmalı.

---

## BUG-05: Kampanya Tarih Karşılaştırması ISO String ile Yapılıyor 🟠 YÜKSEK

**Dosyalar:** `app/page.tsx:189`, `app/shop/page.tsx:57`, `app/product/[id]/page.tsx:134`, `context/CartContext.tsx:134`

ISO string karşılaştırması zaman dilimi farkları nedeniyle hatalı sonuç verebilir.

```diff
- nowIso >= c.start_date && nowIso <= c.end_date
+ new Date() >= new Date(c.start_date) && new Date() <= new Date(c.end_date)
```

---

## BUG-06: `nowIso` Tutarsızlığı — State vs Inline 🟠 YÜKSEK

**Dosya:** `app/page.tsx:42` vs `app/page.tsx:662`

Ana sayfada `nowIso` state olarak dondurulmuş ama `PrestigeCard` her render'da yeni `Date` oluşturuyor → aynı anda farklı kampanya sonuçları.

---

## BUG-07: Checkout — Boş Sepet Race Condition 🟠 YÜKSEK

**Dosya:** `app/checkout/page.tsx:87`

`cartItems.length === 0` ise `router.replace("/")` çağrılıyor ama async. Render devam ediyor.

---

## BUG-08: Kupon Atomik Olmayan used_count Artırımı 🟠 YÜKSEK

**Dosya:** `app/api/paytr/callback/route.ts` (Satır ~73-93)

Read-then-write pattern ile `used_count` artırılıyor. Atomik increment kullanılmalı:
```sql
UPDATE coupons SET used_count = used_count + 1 WHERE id = $1
```

---

## BUG-09: Stok Sıfırda Sepet Miktarı 1 Olarak Kalıyor 🟡 ORTA

**Dosya:** [CartContext.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/context/CartContext.tsx) (Satır ~155)

`fixedQuantity > 0 ? fixedQuantity : 1` — Stok 0 olduğunda miktar 1 olarak set ediliyor.

---

## BUG-10: Notice Toast Timer Memory Leak 🟡 ORTA

**Dosya:** `app/checkout/page.tsx:83`

`window.setTimeout` unmount'ta temizlenmiyor.

---

## BUG-11: Checkout Adres Formu Temizlenmiyor 🟡 ORTA

**Dosya:** `app/checkout/page.tsx:247`

Adres kaydedildikten sonra form alanları sıfırlanmıyor.

---

## BUG-12: Sipariş Stok Güncellemesi Atomik Değil 🟡 ORTA

**Dosya:** `app/api/paytr/callback/route.ts` (Satır ~176-192)

Loop'da sıralı güncelleme. Ortada hata → kısmi stok düşüşü. Transaction gerekli.

---

## BUG-13: `Math.random()` React Key Olarak Kullanılıyor 🟡 ORTA

**Dosya:** [OrdersTab.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/components/profile/OrdersTab.tsx) (Satır ~177)

```ts
key={order.id || Math.random()} // ❌ Her render'da yeni key
```

---

## BUG-14: Login Sonrası Redirect Race Condition 🟡 ORTA

**Dosya:** `app/login/page.tsx:181`

Supabase session yerleşmeden profil sayfasına yönlendirme yapılabiliyor.

---

## BUG-15: Kupon Bilgisi `shipping_address` İçinde Saklanıyor 🔵 DÜŞÜK

**Dosya:** `app/api/paytr/callback/route.ts` (Satır ~29-30)

Mimari olarak yanlış. Ayrı bir kolon/tablo olmalı.

---

## BUG-16: `checkoutCoupons.ts` — Yüzde Formatlama Tutarsızlığı 🔵 DÜŞÜK

**Dosya:** [checkoutCoupons.ts](file:///c:/Users/beytu/Desktop/PrestigeSO/lib/checkout/checkoutCoupons.ts) (Satır ~32)

`%10,5` gösteriliyor, `%10.5` bekleniyor olabilir.

---

# ⚠️ BÖLÜM 3: EKSİK / YARIM KALMIŞ ÖZELLİKLER

## FEAT-01: SEO Metadata Tamamen Eksik 🔴 KRİTİK

**Dosyalar:** Tüm sayfa dosyaları

- Hiçbir sayfada `metadata` export'u yok
- `<title>`, `<meta description>`, Open Graph tag'ları eksik
- Tüm sayfalar `"use client"` → Arama motorları içeriği indeksleyemez
- Sosyal medya paylaşımlarında önizleme görünmez

> [!IMPORTANT]
> E-ticaret sitesi için SEO kritik öneme sahiptir. `generateMetadata` fonksiyonları en azından ürün detay, ana sayfa ve kategori sayfalarına eklenmelidir.

---

## FEAT-02: Error Boundary / error.tsx Dosyaları Eksik 🔴 KRİTİK

Hiçbir sayfada React Error Boundary veya Next.js `error.tsx` yok. Bir bileşen hata fırlatırsa **tüm sayfa çöker**.

---

## FEAT-03: Şifremi Unuttum Özelliği Yok 🟠 YÜKSEK

**Dosya:** `app/login/page.tsx`

Parola sıfırlama akışı tamamen eksik. Supabase `resetPasswordForEmail` API'si kullanılabilir.

---

## FEAT-04: Adres Düzenleme Özelliği Yok 🟠 YÜKSEK

**Dosya:** [AddressesTab.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/components/profile/AddressesTab.tsx)

Sadece ekleme ve silme var. Var olan adresi güncelleme özelliği eksik.

---

## FEAT-05: Sayfalama (Pagination) Yok 🟠 YÜKSEK

**Dosyalar:** OrdersTab, CouponsTab, MessagesTab, QuestionsTab, ReviewsTab

Hiçbirinde pagination yok. Çok sayıda kayıt → performans sorunu.

---

## FEAT-06: İletişim Formu Yok 🟠 YÜKSEK

**Dosya:** `app/iletisim/page.tsx`

İletişim sayfasında sadece statik bilgiler var. Form yok.

---

## FEAT-07: Stok Kontrolü Sepete Eklemede Eksik 🟠 YÜKSEK

**Dosya:** `app/product/[id]/page.tsx:348`

Mevcut sepet miktarı + yeni miktar > stok kontrolü yapılmıyor.

---

## FEAT-08: Kupon Düzenleme UI'da Yok 🟡 ORTA

**Dosya:** [CouponsModal.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/components/admin/modals/CouponsModal.tsx)

API PATCH endpoint'i kupon güncelleme destekliyor ama UI'da sadece toggle ve silme var.

---

## FEAT-09: SKU Benzersizlik Kontrolü Yok 🟡 ORTA

**Dosya:** [AdminPanel.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/components/admin/AdminPanel.tsx) (Satır ~347)

Ürün eklerken/güncellerken aynı SKU ile birden fazla ürün oluşturulabilir.

---

## FEAT-10: Kampanya Tarih Doğrulaması Yetersiz 🟡 ORTA

Başlangıç < bitiş kontrolü yok. Geçmiş tarihli kampanya oluşturulabilir.

---

## FEAT-11: Profil Çıkışta State Temizlenmiyor 🟡 ORTA

**Dosya:** `app/profile/page.tsx:283`

`signOut()` sonrası sepet ve favori verileri tarayıcıda kalıyor.

---

## FEAT-12: Marquee Sadece localStorage'da 🟡 ORTA

**Dosya:** `AdminPanel.tsx:559`

Kayan yazı sadece `localStorage`'da. Başka cihazlardan/kullanıcılardan görülemez. Veritabanına taşınmalı.

---

## FEAT-13: Silme İşlemlerinde Onay Eksik 🟡 ORTA

**Dosyalar:** EditProductModal (satır 431), ReviewsModal (satır 129), CampaignModal

Bazı silme işlemlerinde `showConfirm` kullanılmıyor. Yanlışlıkla silme riski.

---

## FEAT-14: Misafir Kullanıcı Adres Kalıcılığı Yok 🟡 ORTA

**Dosya:** `checkout/page.tsx:243`

Misafir adresleri `Date.now()` dummy ID ile state'te tutuluyor. Sayfa yenilenince kaybolur.

---

## FEAT-15: Analiz Sayfası Tab URL Senkronizasyonu Tek Yönlü 🔵 DÜŞÜK

**Dosya:** `app/admin/analysis/page.tsx:317`

Geri/ileri tuşuyla URL değiştiğinde tab güncellenmez. `popstate` listener eksik.

---

## FEAT-16: Bildirimler Dropdown Dış Tıklamayla Kapanmıyor 🔵 DÜŞÜK

**Dosya:** [HeaderBar.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/components/admin/parts/HeaderBar.tsx)

---

## FEAT-17: AdminNav Klavye Erişilebilirliği Yok 🔵 DÜŞÜK

**Dosya:** [AdminNav.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/components/admin/parts/AdminNav.tsx)

Sadece `onMouseEnter`/`onMouseLeave`. ARIA attribute'ları ve klavye navigasyonu eksik.

---

## FEAT-18: `puppeteer` ve `cheerio` Kullanılmıyor 🔵 DÜŞÜK

**Dosya:** [package.json](file:///c:/Users/beytu/Desktop/PrestigeSO/package.json)

~350MB+ Chromium indiren `puppeteer` dependencies'de ama projede hiçbir yerde kullanılmıyor. Build ve deploy boyutunu gereksiz artırıyor.

---

# ⚡ BÖLÜM 4: PERFORMANS SORUNLARI

## PERF-01: Ana Sayfada TÜM Ürünler Çekiliyor 🔴 KRİTİK

**Dosya:** `app/page.tsx:129`

```ts
supabase.from("products").select("*") // TÜM ürünler, TÜM alanlar
```

**Çözüm:** Sadece gerekli alanları seçin + pagination ekleyin.

---

## PERF-02: TÜM Yorumlar Client'a Çekiliyor 🔴 KRİTİK

**Dosya:** `app/page.tsx:135`

Her ürün için ayrı ayrı client-side filtreleniyor. Binlerce yorum = sayfa felç.

**Çözüm:** Ürüne `rating_avg` ve `review_count` alanı ekleyin (DB trigger ile).

---

## PERF-03: Profil Sayfası Tüm Verileri Tek Seferde Yüklüyor 🔴 KRİTİK

**Dosya:** `app/profile/page.tsx:90-183`

Kullanıcı sadece "Siparişlerim"e baksa bile favoriler, mesajlar, yorumlar, adresler HEPSİ çekiliyor.

**Çözüm:** Tab değiştiğinde lazy loading.

---

## PERF-04: Next.js `<Image>` Kullanılmıyor 🟠 YÜKSEK

**Tüm Dosyalar**

Her yerde `<img>` tag'ı var. WebP/AVIF dönüşümü, lazy loading, blur placeholder gibi optimizasyonlar kayıp.

---

## PERF-05: PayTR Callback — N+1 Stok Sorgusu 🟠 YÜKSEK

**Dosya:** `app/api/paytr/callback/route.ts` (Satır ~168)

Her ürün için ayrı SELECT + UPDATE. 10 ürünlük sipariş = 20 DB sorgusu.

---

## PERF-06: Harici API Her Mount'ta Çağrılıyor 🟠 YÜKSEK

**Dosyalar:** `checkout/page.tsx:129`, `AddressesTab.tsx:74`

`turkiyeapi.dev/api/v1/provinces` — 81 ilin verisi her seferinde indiriliyor. Cache yok.

---

## PERF-07: `useAdminData` — Ardışık 11 Sorgu 🟠 YÜKSEK

**Dosya:** [useAdminData.ts](file:///c:/Users/beytu/Desktop/PrestigeSO/components/admin/hooks/useAdminData.ts) (Satır ~50-237)

11 sorgu sırayla `await` ile çalışıyor. `Promise.all()` ile paralel yapılmalı.

---

## PERF-08: Checkout Page — 30+ useState 🟡 ORTA

**Dosya:** `app/checkout/page.tsx:47-79`

Her state değişikliğinde tüm bileşen yeniden render. `useReducer` veya bileşen parçalama gerekli.

---

## PERF-09: `PrestigeCard` Her Render'da Yeni Date Oluşturuyor 🟡 ORTA

**Dosya:** `app/page.tsx:662`

50 ürün kartı = 50 Date objesi + 50 kampanya araması.

---

## PERF-10: Admin Favori/View Sayım Sorguları 🟡 ORTA

**Dosya:** `useAdminData.ts:225-233`

`.select("id")` yapılıp `.length` alınıyor. Supabase `{ count: "exact", head: true }` kullanılmalı.

---

## PERF-11: Kampanya Tablosu Filtresiz Çekiliyor 🟡 ORTA

**Dosyalar:** `CartContext.tsx:100`, `paytr/create-token/route.ts:260`

Süresi dolmuş kampanyalar dahil hepsi çekiliyor.

---

## PERF-12: `safeParseIds` Fonksiyonu 4 Dosyada Tekrar 🔵 DÜŞÜK

**Dosyalar:** `page.tsx`, `shop/page.tsx`, `product/[id]/page.tsx`, `CartContext.tsx`

Her kampanya kontrolünde JSON.parse çağrılıyor. Ortak utility'ye taşınmalı.

---

## PERF-13: Hero Slider Tüm Slide'ları DOM'da Tutuyor 🔵 DÜŞÜK

**Dosya:** `app/page.tsx:329-354`

Tüm slide'lar render ediliyor, sadece opacity ile gizleniyor.

---

## PERF-14: `CartContext` — İç İçe find() Çağrıları O(n²) 🔵 DÜŞÜK

**Dosya:** `context/CartContext.tsx:111, 122`

`Map` ile O(1) lookup yapılmalı.

---

# 🔧 BÖLÜM 5: KOD KALİTESİ VE TİP GÜVENLİĞİ

## QUAL-01: Yaygın `any` Kullanımı 🔴 KRİTİK

**Tüm dosyalarda** `any` tipi yaygın olarak kullanılıyor:
- `app/page.tsx`: `dbProducts: any[]`, `dbCampaigns: any[]`, `useSearch() as any`
- `app/product/[id]/page.tsx`: `product: any`, `currentUser: any`
- `AdminPanel.tsx`: `editingProduct: any`, 15+ `(prev: any)` callback
- `useAdminData.ts`: Tüm Supabase dönüşleri `as any` cast
- `checkout/page.tsx`: `user: any`, `event: any`

**Çözüm:** `supabase gen types typescript` ile otomatik tip oluşturun.

---

## QUAL-02: types/index.ts — Yetersiz Product Tipi 🟠 YÜKSEK

**Dosya:** [types/index.ts](file:///c:/Users/beytu/Desktop/PrestigeSO/types/index.ts)

Sadece 5 alan tanımlı. `stock`, `quantity`, `description`, `slug`, `images` gibi kullanılan alanlar eksik.

---

## QUAL-03: Masif Kod Tekrarı (DRY İhlali) 🟠 YÜKSEK

Aşağıdaki fonksiyonlar **birden fazla dosyada** copy-paste edilmiş:

| Fonksiyon | Tekrar Sayısı |
|-----------|---------------|
| `safeParseIds` | 4 dosya |
| `formatMoney` | 5+ dosya |
| `safeParseAddress` | 3 dosya |
| `getCouponInfo` | 3 dosya |
| `normalizeText/Phone` | 3 dosya |
| `isValidTurkishPhone` | 2 dosya |
| `getAdminErrorResponse` | 2 dosya |

**Çözüm:** `lib/utils.ts` oluşturup tüm ortak fonksiyonları tek yere taşıyın.

---

## QUAL-04: `AdminPanel.tsx` — 710 Satır, 27+ State 🟠 YÜKSEK

Tek bir bileşende 27+ state tanımı, 15+ handler fonksiyonu.

**Çözüm:** `useProductActions`, `useCampaignActions`, `useMessageActions` gibi custom hook'lara ayrıştırın.

---

## QUAL-05: ESLint Kuralları Bastırılıyor 🟡 ORTA

`// eslint-disable-next-line react-hooks/exhaustive-deps` birden fazla dosyada kullanılıyor.

---

## QUAL-06: `suppressHydrationWarning` Tutarsız Kullanımı 🟡 ORTA

OrdersTab'da kullanılmış, ReviewsModal ve MessagesModal'da unutulmuş.

---

## QUAL-07: Shop Sayfası Tip Tanımı Tutarsızlığı 🟡 ORTA

`shop/page.tsx`'te `Product` ve `Campaign` tipleri tanımlanmış ama diğer sayfalarda yok.

---

## QUAL-08: Sipariş Durumu Validasyonu Yok 🟡 ORTA

**Dosya:** `AdminPanel.tsx:459`

Herhangi bir string status kabul ediliyor. Whitelist ile doğrulama yapılmalı.

---

## QUAL-09: `global.d.ts` — Çok Geniş Modül Deklarasyonu 🔵 DÜŞÜK

```ts
declare module "*.css" // Tüm CSS importlarını any yapıyor
```

---

## QUAL-10: `tsconfig.json` — `jsx: "react-jsx"` 🔵 DÜŞÜK

Next.js varsayılan `"preserve"` ile tutarsız.

---

# 📋 BÖLÜM 6: YASAL TUTARSIZLIKLAR

## LAW-01: "Siteye üye olmayan kişilere satış yapılmaz" vs "Üye Olmadan Devam Et" ⚠️

**Dosyalar:** `guvenlik-ve-iade/page.tsx` (satır ~142) vs `checkout/page.tsx`

Güvenlik ve iade sayfası "üye olmayanlara satış yapılmaz" diyor ama checkout sayfasında misafir satın alma seçeneği var.

---

## LAW-02: Mesafeli Satış Sözleşmesi — Eski Kanun Referansı ⚠️

**Dosya:** [DistanceSellingContract.tsx](file:///c:/Users/beytu/Desktop/PrestigeSO/components/contracts/DistanceSellingContract.tsx) (Satır ~19)

"4077 Sayılı Kanun" referansı var. Bu kanun **2014'te yürürlükten kalkmıştır**, yerine **6502 sayılı TKHK** gelmiştir.

---

## LAW-03: Gizlilik Sayfaları Çelişkili ⚠️

**Dosyalar:** `gizlilik-ilkeleri` vs `gizlilik-politikasi`

- Birinde: "iletişim bilgileri üçüncü firmalarla paylaşılır"
- Diğerinde: "yalnızca belirli durumlarda paylaşılır"

---

# 💡 BÖLÜM 7: İYİLEŞTİRME ÖNERİLERİ

## 1. Supabase Tipleri Otomatik Oluşturun
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

## 2. Ortak Utility Modülü Oluşturun
`lib/utils.ts` dosyasına `formatMoney`, `safeParseIds`, `safeParseAddress`, `normalizePhone` vb. taşıyın.

## 3. Next.js Image Bileşenine Geçin
Tüm `<img>` tag'larını `next/image` ile değiştirin. `next.config.ts`'ye `remotePatterns` ekleyin.

## 4. Server Components Kullanın
Ürün listeleme, ürün detay gibi sayfalar server component olarak render edilebilir → SEO + performans.

## 5. Loading/Error Skeletonları Ekleyin
`loading.tsx` ve `error.tsx` dosyaları her route için eklenmelidir.

## 6. Ürün Tablosuna Rating Alanları Ekleyin
```sql
ALTER TABLE products ADD COLUMN rating_avg DECIMAL DEFAULT 0;
ALTER TABLE products ADD COLUMN review_count INTEGER DEFAULT 0;
```
Trigger ile otomatik güncelleme yapın → Ana sayfa sorgusundan `reviews` tablosu tamamen kaldırılır.

## 7. Admin İşlemlerini API Route'lara Taşıyın
Tüm admin CRUD operasyonları `/api/admin/*` endpoint'leri üzerinden `supabaseAdmin` ile yapılmalıdır.

## 8. Redis Tabanlı Rate Limiting
Vercel KV veya Upstash Redis ile tüm hassas endpoint'lere rate limiting ekleyin.

---

# 📈 ÖNCELİK MATRİSİ

```mermaid
quadrantChart
    title Öncelik Matrisi
    x-axis "Düşük Etki" --> "Yüksek Etki"
    y-axis "Düşük Çaba" --> "Yüksek Çaba"
    quadrant-1 "Planla"
    quadrant-2 "Hemen Yap"
    quadrant-3 "Düşün"
    quadrant-4 "Erken Başla"
    "proxy.ts → middleware.ts": [0.95, 0.10]
    "userId Doğrulama": [0.90, 0.20]
    "Hash Timing-safe": [0.85, 0.15]
    "Güvenlik Başlıkları": [0.75, 0.15]
    "SEO Metadata": [0.85, 0.45]
    "server-only Import": [0.70, 0.05]
    "Next/Image Geçişi": [0.65, 0.60]
    "Supabase Tipleri": [0.50, 0.40]
    "Fiyat Server-Side": [0.90, 0.55]
    "Admin API Routes": [0.80, 0.75]
    "Error Boundaries": [0.55, 0.25]
    "DB Rating Alanları": [0.60, 0.50]
    "Pagination": [0.50, 0.45]
    "Kupon Server-Side": [0.80, 0.40]
