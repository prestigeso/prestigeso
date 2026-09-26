# Trendyol: admin girişinde tek seferlik güncelleme

Kullanıcı kararı: sürekli tarama/cron yok; yalnızca admin paneline girişte güncelleme, isteğe bağlı manuel kontrol. Vercel Hobby için yeni servis veya ücretli plan açılmadı.

## Davranış

- Senkronizasyon AdminPanel seviyesinde başlar; menü, filtre ve arama değişiklikleri yeni sağlayıcı aktarımı başlatmaz.
- Başarılı kontrol aynı sekmede 5 dakika hatırlanır. Manuel buton bu istemci beklemesini atlar; sunucu tazelik ve kota kontrolü korunur.
- Veritabanındaki otomatik iş/cursor üzerinden devam eder. Sayfalar arasında en az 5,5 saniye; işlem tamamlanınca durur. Bir çalıştırma en fazla 20 başarılı sayfa; geçici HTTP hataları sayfa başına en fazla iki tekrar.
- Gizli sekmede/çevrimdışıyken sonraki adım atılmaz; panelden çıkınca istemci isteği ve zamanlayıcı iptal edilir. Başlamış sunucu işlemi güvenli kontrol noktasını kaydedebilir.
- Arşiv güncellenince sipariş listesi ve açık genel bakış raporu yenilenir. Eski kayıtlar hata durumunda korunur.
- Sağlayıcıya yalnız GET; ödeme, stok veya Trendyol sipariş durumuna yazma yapılmaz.

## Etkinleştirme ve test

Yerel `.env.local` içinde TRENDYOL_SYNC_ENABLED=1 yapıldı. Vercel ayarları bu değişiklikte değiştirilmedi; push/deploy yok. Canlı kullanıcı akışı, yeni build ve tarayıcı E2E bu teslimde çalıştırılmadı.

299/299 Node testi, TypeScript ve hedefli ESLint başarılı. Yeni sentetik testler: kapalı/eksik yapılandırma, kota, taze arşivde sağlayıcı isteği olmaması, kontrol noktası yazma sırası, geçmiş/sayfalama, sağlayıcı/DB hatalarında gizli bilgi sızıntısı olmaması; giriş döngüsünün tamamlanınca durması, yakın zamanda kontrolün atlanması, gizli sekme/çıkış, sınırlı tekrar ve 20 sayfa sınırı.

Yeni SQL migration veya cron gerekmez. Daha önceki Trendyol arşiv ve müşteri migration'ları gereklidir. Yerel etkinleştirme, canlı ortamda başarı kanıtı değildir.
