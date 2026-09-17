# Faz 0 yayın paketi

Kod ve SQL yerel olarak hazırlanmıştır. Bu dosya production işlemlerinin yapılmış olduğu anlamına gelmez. Kullanıcının açık onayı olmadan commit/push/deploy veya production SQL çalıştırılmayacak.

## Yayın sırası

1. Supabase veritabanı yedeğini ve Storage ürün/yorum görsellerinin ayrı yedeğini doğrula. Yerel sentetik dump/restore testi gerçek production yedeğinin kanıtı değildir.
2. Mevcut production şemasında 20260823154000_legal_consent_records.sql dahil önceki migration'ların uygulanmış olduğunu doğrula. Yeni paket önceki migration'ların yerine geçmez.
3. Supabase SQL Editor'de **2026-09-17-phase0.sql** dosyasının tamamını çalıştır. Dört migration tek transaction içindedir; bir hata olursa hepsi geri alınır. Paket stok/fiyat verisi tohumlamaz, parola değiştirmez. Sonradan SQL dosyasını düzenlersen migration kaynaklarıyla eşleşmesini yeniden kontrol et.
4. **2026-09-17-phase0-verify.sql** salt okunur kontrolünü çalıştır. Beklentiler sorguların altına yazılmıştır. Hata veya eksik nesne varsa uygulamayı yayınlama.
5. Production yapılandırmasını doğrula: ADMIN_PASSWORD güçlü parola, ADMIN_TOTP_SECRET Authenticator ile aynı anahtar, ADMIN_COOKIE_SECRET/RATE_LIMIT_SECRET/OTP_PROOF_SECRET/CRON_SECRET yeterli uzunlukta; RESEND_FROM_EMAIL doğrulanmış düz e-posta adresi. Anahtar değerleri rapora veya Git'e yazılmaz. PayTR modu mevcut işletme kararıyla korunur.
6. Kullanıcı yayın onayından sonra commit/push ve deployment. Şema uygulama kodundan önce hazır olmalı. Yerel .next çıktısı sentetik backend ile test edildi; Vercel gerçek Production değişkenleriyle yeniden build etmelidir.
7. Anonim sayfa/ürün/sepet/SEO/ikon smoke testi; admin girişi ve operasyon kuyruğunu kontrol et. Canlı ödeme ve iade denemesi için tutar/sipariş ayrıca onaylanmalı.

## Zamanlayıcı ve e-posta operasyonu

Mevcut vercel.json bakım görevini günde bir kez çalıştırıyor. Bu sıklık 23 saatlik belirsiz e-posta tekrar penceresini kaçırabilir. Ücretli plan veya yeni dış servis sessizce etkinleştirilmedi.

Yayın öncesi mevcut hosting planının desteklediği bir zamanlayıcıdan en az saatlik GET /api/maintenance çağrısı ayarlanmalı. Header: Authorization: Bearer <CRON_SECRET>. Secret URL'ye, izleme ekranına veya herkese açık yapılandırmaya yazılmamalı. Endpoint çalışması stok süresi dolması, mutabakat ve outbox işlemleri yapar; yalnız sağlık kontrolü değildir. Sadece 2xx almak yeterli değildir: cevap içindeki reconciliationFailures ve emails.attention da izlenmeli.

HTTP 503 başarısız bakım veya mutabakat anlamına gelir. Belirsiz e-postalar aynı kayıtla en fazla 5 kez ve ilk denemeden itibaren 23 saat içinde denenir; pencere dışındaki kayıt için yeni mail olayı oluşturma, sağlayıcı sonucunu elle doğrula. `sent`, sağlayıcının kabulüdür; alıcının gelen kutusuna teslim edildiği iddiası değildir. Resend alan adı/DNS ve teslim kayıtları ayrıca kontrol edilir.

## Geri dönüş

Uygulama geri alınacaksa önceki deployment geri yüklenebilir; yeni SQL tabloları ve finansal kayıtlar silinmez. Şema değişikliklerini kör DROP CASCADE ile geri alma. Yeni sürümde işlenen kısmi iade ve geç ödeme kayıtları nedeniyle eski sürüme dönüşte mali operasyonları durdurup uyumluluğu kontrol et. Migration paketi, otomatik down migration içermez.

## Doğrulama sınırları

PostgreSQL 15 yerel testleri gerçek transaction/kilit/RLS/rol kontrolleri yapar; Supabase Auth/Storage servislerinin tamamını taklit etmez. Browser testleri sentetik Supabase ve sahte dış servis yanıtları kullanır. Fiziksel telefon, gerçek banka 3D Secure, production mail DNS/teslimatı ve gerçek müşteri verisiyle restore bu yerel koşumun kapsamına girmez.
