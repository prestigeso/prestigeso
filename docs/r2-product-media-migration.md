# Product media to Cloudflare R2

This moves **product and hero-slide images only**. Review photos and private
return evidence stay in Supabase. The copy/cutover commands never delete source
objects; the separately gated prune command below does.

## Prepare Cloudflare

1. Create one R2 Standard bucket for public product media. Do not use the
   `r2.dev` development URL for production.
2. Connect a dedicated HTTPS custom domain (for example,
   `media.prestigeso.com.tr`) to the bucket and verify it serves a test image.
   Configure suitable Cloudflare caching for public, versioned images.
3. Create a bucket-scoped R2 API token with object read/write permissions.
   Keep its access key and secret server-side; never put them in `NEXT_PUBLIC_`
   variables or commit them.
4. Set `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, and `R2_PUBLIC_BASE_URL` locally and in Vercel.
   Deploy **with `PRODUCT_MEDIA_BACKEND=supabase` first** so Next/Image already
   accepts the new image domain before database URLs change.

## Copy and cut over

From the repository root, with a service-role key for the intended Supabase
project and R2 variables available to the relevant command:

```powershell
node --env-file=.env.local scripts/migrate-product-media-to-r2.mjs --save-plan
node --env-file=.env.local scripts/migrate-product-media-to-r2.mjs --copy
node --env-file=.env.local scripts/migrate-product-media-to-r2.mjs --verify
node --env-file=.env.local scripts/migrate-product-media-to-r2.mjs --switch-db
node --env-file=.env.local scripts/migrate-product-media-to-r2.mjs --audit-switch
```

`--save-plan` is read-only against Supabase and writes a local snapshot under
`output/r2-product-media/`, which is gitignored. A plain run (without flags)
is also read-only and prints counts. `--copy` transfers only referenced
product/hero objects, checks every source SHA-256 against an R2 GET, and writes
a verified manifest. It is resumable. `--verify` checks that every public HTTPS
URL returns an image of the verified byte length, then compares the full
SHA-256 for five distributed public samples. It makes no database writes.
Redirects and non-image public responses are rejected. On Windows, a temporary
`R2_PUBLIC_IPV4` environment value may work around an unstable local DNS
resolver; HTTPS still uses the media hostname and validates its certificate.
Do not set that value in Vercel. `--switch-db` repeats these checks before
changing image URLs in the product and hero-slide rows. Product writes use an
`updated_at` check to stop on concurrent edits. A non-image product edit after
planning is allowed if the image fields still match; an image edit stops the
cutover rather than overwriting it. `--audit-switch` reports whether every
planned row has reached its target without changing the database.

After cutover, inspect multiple product pages and slides on the production
domain, then set `PRODUCT_MEDIA_BACKEND=r2` in Vercel and redeploy. New admin
product/hero uploads then go directly to R2. The admin image-delete endpoint
continues to recognize both providers, but does **not** delete legacy Supabase
objects while R2 mode is on. Do not remove legacy objects until a separate
backup, URL inventory, and rollback window have been verified.

Before source cleanup, a rollback could set `PRODUCT_MEDIA_BACKEND=supabase`
and run `node --env-file=.env.local
scripts/migrate-product-media-to-r2.mjs --rollback-db`. **After source
cleanup this rollback is unavailable:** the original Supabase object URLs no
longer resolve. The rollback command now checks that every source object exists
before writing any database row. If a future rollback is required, restore
and verify the source objects first; do not merely change the environment flag.

## Cost and availability checks

- Check R2 Standard storage, Class A/B operations, and public-domain cache
  status. The free tier is not a guarantee if storage exceeds 10 GB or reads
  exceed 10 million per month.
- Check Supabase database size and egress after moving media; R2 does not
  replace the relational database.
- Check Vercel Fast Data Transfer, Image Optimization, and function metrics.
  Existing `next/image` product photos still pass through Vercel. Future videos
  must use direct R2 media URLs; do not proxy video bytes through a Vercel route.
- Keep R2 media URLs as absolute HTTPS URLs in product records. Do not expose
  the R2 S3 endpoint or credentials to browsers.

## Current setup and remaining gates

- Bucket: `prestigeso-product-media` (Standard).
- Intended public domain: `media.prestigeso.com.tr`; do not activate uploads
  or change database URLs until DNS and HTTPS are verified.
- A bucket-scoped replacement token was saved as Secret in Vercel Production;
  the original token was revoked. Local migration credentials still need to be
  provisioned securely; do not copy values into this document or chat.
- On 2026-09-29, the 11 Hostinger DNS records were compared against Cloudflare;
  the missing `hostingermail1._domainkey` TXT record was added and all names,
  types and values matched. With user approval, Hostinger nameservers were set
  to `emma.ns.cloudflare.com` and `jeremy.ns.cloudflare.com`. On 2026-09-30,
  Google and Cloudflare DNS resolvers returned those Cloudflare nameservers.
  `media.prestigeso.com.tr` was attached to the bucket with minimum TLS 1.2;
  Cloudflare shows its custom-domain status as Active and its HTTPS endpoint
  answers through Cloudflare.
- On 2026-10-02, all 956 referenced objects were copied with source/R2
  SHA-256 equality. All 956 public HTTPS URLs returned the expected image type
  and byte length, and five distributed public URLs matched full SHA-256.
  The saved plan covers 232 products and 6 hero slides. The database cutover
  updated 200 product rows and 6 slides; all 232 products and 6 slides now
  match their planned R2 targets. No Supabase source object was deleted at that
  stage.
- On 2026-10-02, Vercel Production `PRODUCT_MEDIA_BACKEND` was changed to `r2`
  and the R2-capable deployment was redeployed. The production deployment is
  Ready and aliased to `www.prestigeso.com.tr`. A live authenticated admin
  upload returned a `media.prestigeso.com.tr` URL; the public image returned
  HTTP 200 with image content, and the disposable test object was deleted.
  The homepage and a sampled product page returned HTTP 200, and a sampled
  product R2 image returned HTTP 200. A fresh read-only database audit found
  232/232 product rows and 6/6 hero slides at their R2 targets, with no
  originals or divergences.
- New product/hero uploads now use R2. The environment validator rejects
  typos, invalid credentials and development/S3 public URLs.
- On 2026-10-02, after explicit user approval, all 956 migrated public R2
  images were rechecked (HTTP HEAD and five full SHA-256 samples), the 232
  products and 6 slides were audited, and every available public table was
  scanned for legacy product-bucket URLs. No references remained. The exact
  956 verified Supabase source objects (509,060,026 bytes, about 485.5 MiB)
  were deleted. A fresh bucket inventory found zero migrated source objects;
  the other 520 objects, including review media, were untouched. Public R2
  verification and the database target audit passed again after deletion.
  Supabase usage figures may update later; other buckets and unrelated product
  objects are outside this cleanup.
