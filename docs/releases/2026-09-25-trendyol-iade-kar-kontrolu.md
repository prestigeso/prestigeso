# Trendyol iade ve kâr kontrolü

## Yeni migration

`supabase/migrations/20260925130000_trendyol_finance_mirror.sql` önceki kâr profili SQL'inden ayrıdır. Üretim veritabanında ayrıca uygulanmalıdır. Bu teslimatta üretim SQL'i çalıştırılmadı.

## Akış

- Admin paneline girişte önce sipariş arşivi, ardından iade talepleri ve `Return` cari hesap satırları kontrol edilir. Panel kapalıyken tarama yoktur.
- İlk kontrolde en fazla son 89 gün, sabit 14 günlük pencerelerle taranır; her istek bir pencere için en fazla iki Trendyol servisinden sayfalı okuma yapar. Güncel pencereler altı saat dolmadan yeniden çağrılmaz.
- İade ve finans satırları kimlik/iletişim alanları olmadan ayrı tablolarda tutulur. Bir pencerenin iki kaynağı da yazılmadan “tamamlandı” işaretlenmez.
- Kâr analizinde kabul edilmiş veya açık iade talebi bulunan siparişler ve cari hesapta iadesi görünen siparişler toplamdan çıkarılır. Bölünmüş/kısmi paketlerde yanlış kâr üretmemek için sipariş düzeyinde muhafazakâr dışlama uygulanır.
- Seçili dönem arşivi eksikse iade tutarı bilinmiyor gösterilir; ilgili satışın tarihinden bugüne arşiv eksikse Trendyol kârı hesaplanmaz. İade borcu net zarar değildir; kupon, komisyon ve gider mutabakatı ayrıca gerekir.

## Doğrulama

- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`
- Sentetik yerel PostgreSQL: `PHASE0_DB_TESTS=1 node scripts/test-trendyol-finance-db.mjs`
- Gerçek sağlayıcı ile salt-okunur teşhis: `node --env-file=.env.local scripts/inspect-trendyol-returns.mjs` (çıktı sipariş numarasının yalnızca son dört hanesini içerir). Bu teşhis komutu veritabanına veya sağlayıcıya yazmaz.

## Kalan finansal girdiler

Kâr profilleri ve ürün maliyetleri admin tarafından doğrulanıp girilmeden gerçek kâr rakamı oluşmaz. Kabul edilmiş iadelerin geri alınan ürün maliyeti, ek kargo ve kupon/komisyon mahsupları otomatik net zarar sayılmaz.
