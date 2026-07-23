# PrestigeSO

PrestigeSO, Next.js App Router ve Supabase ile geliştirilen bir e-ticaret uygulamasıdır. Ürün vitrini, kampanyalar, favoriler, kuponlar, adresler, sipariş yönetimi, PayTR ödeme/iade akışı ve yönetim paneli içerir.

## Gereksinimler

- Node.js 20+
- npm
- Bir Supabase projesi
- Ödeme için PayTR hesabı
- E-posta gönderimi için Resend hesabı

## Kurulum

```bash
npm install
```

`.env.local` dosyasını oluşturup aşağıdaki değişkenleri tanımlayın. Gerçek anahtarları repoya eklemeyin.

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ADMIN_PASSWORD=
ADMIN_COOKIE_SECRET=
RATE_LIMIT_SECRET=
OTP_PROOF_SECRET=

PAYTR_MERCHANT_ID=
PAYTR_MERCHANT_KEY=
PAYTR_MERCHANT_SALT=
PAYTR_TEST_MODE=1

RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

Veritabanı tabloları, constraint'ler, indeksler, RLS politikaları, ödeme/stok RPC'leri ve raporlama view'ları `supabase/migrations` altında sürümlenir. Yeni bir ortamda dosyaları ad sırasıyla Supabase CLI veya SQL Editor üzerinden uygulayın.

Şema değişikliklerinden sonra `types/database.generated.ts` dosyasını bağlı
Supabase projesinden yenileyin:

```bash
npx supabase gen types typescript --project-id <project-id> > types/database.generated.ts
```

## Geliştirme

```bash
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

## Kalite kontrolleri

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Tüm kontrolleri sırasıyla çalıştırmak için:

```bash
npm run check
```

Testler; sepet miktarı birleştirme, kupon/teslimat hesapları ve kritik ödeme-stok migration sözleşmelerini kapsar.

## Üretim notları

- `PAYTR_TEST_MODE=0` yalnızca canlı PayTR bilgileri doğrulandıktan sonra kullanılmalıdır.
- `ADMIN_COOKIE_SECRET`, `RATE_LIMIT_SECRET` ve `OTP_PROOF_SECRET` güçlü ve birbirinden bağımsız değerler olmalıdır.
- `SUPABASE_SERVICE_ROLE_KEY` yalnızca sunucu ortamında tutulmalıdır.
- Yeni migration'lar üretime alınmadan önce yedekli bir staging veritabanında denenmelidir.
