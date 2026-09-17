# PrestigeSO: Admin analitik, Meta ve SEO geliştirme planı

> 6 Eylül 2026 güncellemesi: Bu dosya 4 Eylül araştırmasının tarihsel kaydıdır. Güncel canlı denetim, kabul testleri ve bağlayıcı faz sırası [Güncel denetim ve faz planı](C:/Users/beytu/Desktop/PrestigeSO/docs/plans/2026-09-06-guncel-denetim-ve-faz-plani.md) içindedir. Önce Faz 0 hata/işlem güvenliği, sonra Faz 1 analitik; Faz 2 rafta; Ek Faz ana işler bittikten sonradır. Aşağıdaki eski süre, kapsam ve sıra ifadeleri yeni planla çeliştiğinde yeni plan esas alınır. Buradaki uygulanmış ikon çalışması yereldir; 6 Eylül canlı dosya kontrolü yeni ikonların henüz yayında olmadığını gösterdi.

Araştırma: 4 Eylül 2026. Durum: planlama; yalnız marka ikonları bu turda uygulandı. Analitik/Pixel/CAPI, reklam hesabı, Search Console ve canlı veritabanı üzerinde değişiklik yapılmadı. Faz 2 içindeki Meta, finans, Search Console ve aynı panelden Trendyol sipariş yönetimi sonraya ertelendi; bu başlıklarda entegrasyon çalışması başlatılmayacak. Donanım/self-hosting, kargo API'si, pazarlama e-postaları ve yeni otomatik müşteri bildirimleri kapsam dışı. Mevcut işlem e-postalarının — doğrulama kodu, sipariş onayı, teslim bilgisi ve adminin yüklediği PDF fatura — doğruluk, güvenilirlik ve tasarım yenilemesi bu plana dahildir. Manuel gönderim maliyeti kaydı bu kapsam dışı kararla çelişmez.

## 1. Karar özeti

Ölçümleme, Premium tasarım sonrasına bırakılmamalı. İlk fazda mevcut güvenlik/işlem sorunlarıyla birlikte ölçüm altyapısı ve temel admin ekranları hazırlanmalı; böylece yeni tasarımın öncesi/sonrası için başlangıç verisi olur. Hedef, sadece çok sayıda grafik değil: **hangi sorun, hangi adımda, ne kadar kullanıcı/sipariş etkiledi, kanıtı ne ve nereden kontrol edilir?**

Mağaza sahibinin günlük soruları:

- Ana sayfadan başlayan oturumların kaçı kategoriye, ürüne, sepete ve ödemeye geçti?
- Hangi ürün sepete ekleniyor fakat belirlenen sürede satın alınmıyor?
- Satın almama, teknik başarısızlık mı, henüz sonuçlanmamış ödeme mi, yoksa nedeni bilinmeyen ayrılma mı?
- Hangi reklam gerçek ödenmiş siparişle ilişkilendirilebiliyor? Meta hangi satışları kendisine atfediyor?
- Ürün/ödeme/paketleme/gönderim/iade/reklam giderleri dikkate alındığında ne kalıyor?
- Google'da hangi sayfalar ve sorgular görünürlük getiriyor; hangi teknik sinyaller hatalı?

## 2. Mevcut kod neyi ölçüyor?

| Bulgu | Kanıt | Sonuç |
|---|---|---|
| Dönüşüm, dönem sipariş toplamının ziyaret sayacına bölünmesi | [analysis/page.tsx:373](C:/Users/beytu/Desktop/PrestigeSO/app/admin/analysis/page.tsx:373), [reporting_views.sql:67](C:/Users/beytu/Desktop/PrestigeSO/supabase/migrations/20260713190000_reporting_views.sql:67) | Aynı kullanıcı/oturumun adımları eşleştirilmiyor; gerçek huni değil. |
| Ziyaret tetikleyicisi ana sayfada; tabloya yalnız zaman yazılıyor | [HomeClient.tsx:106](C:/Users/beytu/Desktop/PrestigeSO/components/storefront/HomeClient.tsx:106), [page_views/route.ts:23](C:/Users/beytu/Desktop/PrestigeSO/app/api/page_views/route.ts:23) | Ürüne doğrudan gelen kişinin siparişi sayılabilir, ziyareti sayılmayabilir. Yol/kampanya bilgisi yok. |
| Ürün sayacı IP+ürün/24 saat limitli, kalıcı kayıt ürün ve zaman | [product-views/route.ts:11](C:/Users/beytu/Desktop/PrestigeSO/app/api/product-views/route.ts:11) | Tekil kişi sayısı veya ana sayfa→ürün yolculuğu değildir; IP kimlik kabul edilemez. |
| Sepet durum olarak tarayıcıda; kalıcı ekleme/çıkarma olay geçmişi yok | [CartContext.tsx:264](C:/Users/beytu/Desktop/PrestigeSO/context/CartContext.tsx:264), [CartContext.tsx:280](C:/Users/beytu/Desktop/PrestigeSO/context/CartContext.tsx:280) | Geçmiş sepet terkini güvenilir biçimde geriye dönük üretemeyiz. Yeni ölçümün başlangıç tarihi açık olmalı. |
| Ödeme doğrulaması sunucu callback'inde mevcut | [callback/route.ts:158](C:/Users/beytu/Desktop/PrestigeSO/app/api/paytr/callback/route.ts:158), [callback/route.ts:243](C:/Users/beytu/Desktop/PrestigeSO/app/api/paytr/callback/route.ts:243) | Satış için esas kayıt bu; teşekkür sayfasının açılması değil. |
| Temel PayTR durum mutabakatı ve istemci render hata bildirimi zaten var | [reconciliation/route.ts:8](C:/Users/beytu/Desktop/PrestigeSO/app/api/admin/reconciliation/route.ts:8), [client-error/route.ts:5](C:/Users/beytu/Desktop/PrestigeSO/app/api/telemetry/client-error/route.ts:5) | Bunları yeniden icat etmek yerine admin'deki teşhis ve raporlama kapsamı genişletilmeli. |

Analitik/pazarlama izin tercihleri mevcut: [consent.ts:9](C:/Users/beytu/Desktop/PrestigeSO/lib/legal/consent.ts:9). Buna karşılık mevcut ana sayfa ve ürün sayaçlarının tetikleyicilerinde analitik izni kontrol edilmiyor. Yeni davranış ölçümü bu tercihlerle tutarlı tasarlanmalı. Bu gözlem, mevcut bütün veri işlemlerinin hukuki sınıflandırması hakkında sonuç değildir.

## 3. Mağazacı deneyimlerinden gelen ihtiyaçlar

Forum örnekleri sorunun varlığına ilişkin sinyal; yaygınlık ölçümü, kesin neden veya PrestigeSO'da aynı hatanın olduğunun kanıtı değildir. Reklam/tanıtım yorumları teknik kanıt kabul edilmedi.

### A. Terk nedenini görememe → checkout teşhis masası

Kişiselleştirilebilir takı satan bir mağaza, ABD tarafındaki terklerde ödeme olayı göremediğini, ücretsiz kargoya rağmen sorunu açıklayamadığını anlatıyor. Küçük hacimli tek mağaza beyanıdır; tartışmadaki para birimi/ödeme hipotezleri doğrulanmış çözüm sayılmamalı. [Reddit, 2 Nisan 2025](https://www.reddit.com/r/shopify/comments/1jq3isw/help_diagnose_90_us_abandoned_cart_rate_on/)

Öneri: son doğrulanmış adım + cihaz/tarayıcı + kampanya + ürün + teknik hata sınıfı. Durumlar ayrı: ödeme girişimi yok, sağlayıcı reddi, teknik hata, sonuç bekleniyor, tamamlandı, nedeni bilinmiyor. PayTR'ın hata kodu 6 bile hem zaman aşımı hem sayfayı kapatma içerebilir; kesin psikolojik terk nedeni değildir. [PayTR bildirim sözleşmesi](https://dev.paytr.com/iframe-api/iframe-api-2-adim)

### B. Ciro var ama kazanç belirsiz → maliyet kapsamlı katkı payı

Bir mağazacı iade, ücret, gönderim gideri ve test siparişlerini ayıran finansal rapor istiyor. [Shopify Community, 11 Kasım 2025](https://community.shopify.com/t/custom-financial-reporting/575050)

Öneri: indirim/iade sonrası satıştan ürün maliyeti, ödeme kesintisi, paketleme, mağazanın üstlendiği gönderim ve iade giderlerini düşen katkı payı. Reklam giderini ayrıca göster. Maliyetler sipariş anındaki değerleriyle saklanmalı; ürünün bugünkü maliyeti eski siparişleri değiştirmemeli. Eksik maliyeti sıfır kabul etme. Vergi/genel giderler tam dahil değilse buna net kâr deme. İade ürünü satılabilir stok olarak geri dönmediyse ürün maliyetini otomatik geri kazanılmış sayma.

### C. Sipariş, sağlayıcı ve banka farklı → mutabakat istisnaları

Toplulukta ücretler, kısmi iadeler ve ödeme günü nedeniyle sipariş–ödeme eşleştirmesi soruluyor. Kaynak, ihtiyaç tartışmasıdır; doğrulanmış büyük ölçekli vaka değildir. [Shopify Community, 26 Aralık 2025](https://community.shopify.com/t/how-do-you-reconcile-shopify-orders-with-stripe-payouts-without-losing-your-mind/580987)

Mevcut PayTR sorgusunu temel alarak tutar farkı, geciken sonuç, iade farkı ve beklenen aktarım ayrı listelenmeli. PayTR işlem dökümü satış/iade, kesinti/net tutar ve sipariş numarası sağlar; tek sorgu aralığı en fazla üç gündür. Bankaya geçti bilgisi için ayrıca banka kaydı gerekir; ilk aşamada manuel/CSV eşleştirme yeterli olabilir. [PayTR işlem dökümü](https://dev.paytr.com/islem-dokumu), [ödeme detayı](https://dev.paytr.com/odeme-rapor-servisi/odeme-detayi)

### D. Editörde düzgün, gerçek telefonda bozuk → cihaz bazlı mağaza sağlığı

Mağazacı, editörün mobil önizlemesinde görünmeyen menü ve ürün yerleşimi sorunlarını gerçek iPhone'da bildiriyor; çözüm sonucu doğrulanmış değil. [Shopify Community, 16 Ağustos 2025](https://community.shopify.com/t/mobile-layout-broken-on-live-site-menus-too-small-desktop-view-showing/557849)

Öneri: cihaz/tarayıcı kırılımında sepete ekleme ve ödeme geçişi, gruplanmış JavaScript/render hataları, görsel yükleme hataları, son yayın zamanı ve gerçek cihaz kontrol kaydı. Sadece Lighthouse skoru, alışveriş butonunun çalıştığını kanıtlamaz. Alan performansında mobil/masaüstü p75 LCP, INP ve CLS izlenmeli. Hata ile dönüşüm düşüşünün aynı anda olması tek başına neden-sonuç kanıtı değildir. [Google Web Vitals](https://web.dev/articles/vitals)

### E. Bot/test trafiği raporu bozuyor → veri kalitesi ekranı

Satıcı sahte checkout girişimlerinin terk ve reklam raporunu kirlettiğini bildiriyor. [Reddit, 27 Aralık 2025](https://www.reddit.com/r/shopify/comments/1pwnald/shopify_checkout_bots_anyone_else_dealing_with/). Sorun sınıfı ayrıca Shopify'ın bot gürültüsünü azaltan resmî değişikliğinde görülüyor. [Shopify, 16 Haziran 2026](https://changelog.shopify.com/posts/reduced-bot-noise-in-abandoned-checkouts)

Öneri: test/personel/şüpheli otomasyon ayrımı, yinelenen olaylar, ölçüm kaydı bulunmayan siparişler, filtreleme gerekçeleri ve ham/temizlenmiş toplamlar. Şüpheli davranış kesin bot veya dolandırıcı etiketi olmamalı. Rastgele olay yağmuruna karşı gövde/alan sınırları, IP/global bütçe, kritik olmayan olaylarda kontrollü örnekleme ve saklama süresi gerekir.

### F. Aranan ürün görünmüyor → kaçırılan talep ve stok görünümü

Sonuçsuz arama ile sonuç bulunup tıklanmaması farklı sorunlardır; Shopify'ın resmî arama analitiği bu ayrımı destekliyor. Bu başlık için yeterince güçlü yeni ilk el satıcı örneği bulunmadığından forum bulgusu gibi sunulmuyor. [Search & Discovery analitiği](https://help.shopify.com/en/manual/online-store/storefront-search/search-and-discovery-analytics)

Öneri: sonuçsuz sorgular, stokta sıfır sonuç, filtre sonrası sıfır sonuç, çok görüntülenen tükenmiş ürünler, arama→ürün→sepet geçişleri. Serbest arama metinlerinde kişisel veri temizliği; öneri araması ile tamamlanmış arama ayrı olay. Bunlardan kesin kayıp satış tutarı türetilemez.

### G. Takıda ölçü/malzeme belirsizliği → bilgi kalitesi ve iade nedenleri

Takı satıcısı, ölçü rehberi olmasına rağmen yanlış bileklik ölçüsü siparişlerinin sürdüğünü belirtiyor. Bu eski ama doğrudan sektörel bir örnektir; yorumlardaki hukuki tavsiyeler kullanılmadı. [Reddit, Şubat 2024](https://www.reddit.com/r/shopify/comments/1az4edr/exchanges_wrong_size/). Baymard'ın kullanıcı araştırması da görselden ölçek yorumlama güçlüğünü gösteriyor. [Baymard, 30 Mayıs 2017](https://baymard.com/blog/in-scale-product-images)

Öneri: uzunluk/çap/ölçü, gerçek malzeme/kaplama, bakım, ölçek fotoğrafı eksikleri; ürün-varyant düzeyinde iade/değişim nedenleri. Sekiz görselin sayısı yanında doğruluğu kontrol edilmeli. Kılavuzu açmak, anladığını veya bu nedenle satın aldığını kanıtlamaz.

### H. Reklam panelleri anlaşmıyor → atıf şeffaflığı

Satıcı Meta ve mağaza raporundaki satın alma sayılarını farklı gördüğünü soruyor. Örnek sayı ve neden bağımsız doğrulanmadı. [Reddit, 13 Haziran 2026](https://www.reddit.com/r/FacebookAds/comments/1u4vls6/shopify_dashboard_vs_meta_ads_manager_always/)

Öneri: gerçek ödenmiş sipariş, sitenin gözlediği kaynak ve platformun kendisine atfettiği satış yan yana; farklı platform satışlarını toplayıp toplam satış üretme. Bilinmeyen kaynağı zorla reklama bağlama. Atıf reklamın ek satış yarattığını tek başına kanıtlamaz.

## 4. Önerilen admin ekranları (faz ayrımı güncellendi)

| Ekran | Cevaplayacağı sorular |
|---|---|
| Genel görünüm | Ölçülen oturum, ürün inceleyen, sepete ekleyen, ödeme başlatan, doğrulanmış satış; önceki dönem ve veri kapsamı |
| Ana sayfa performansı | Giriş sayfası ana sayfa olan oturumların sonraki adımları; kategori/hero/ürün bloklarının görünmesi ve tıklanması |
| Ürün ve sepet | Ürün/SKU bazlı inceleme→ekleme→satın alma; çıkarma/miktar değişimi; dönüşmüş, açık/bekleyen ve tanıma göre terk edilmiş sepet |
| Keşif ve ziyaretçi yolculukları | Kategori/ürün inceleme derinliği, ilk 3/5 farklı ürün, tekrar inceleme ve ziyaret sırası; izinli takma kimlikle tek yolculuk detayı |
| Ödeme teşhisi | Adres/OTP/kuponda hata, PayTR'a geçiş, sağlayıcı sonucu, callback gecikmesi; mevcut mutabakat istisnaları |
| Meta reklamları - Faz 2 / rafta | Harcama, gösterim, bağlantı tıklaması, açılış, kampanya bazlı gözlenen satış ve Meta atfı; CPA/ROAS ve tanımları |
| Katkı payı - Faz 2 / rafta | Sipariş/ürün maliyeti, indirim, iade, kesinti, gönderim/paketleme; reklam sonrası katkı ve maliyeti eksik siparişler |
| SEO / Google Arama paneli - Faz 2 / rafta | Gösterim, tıklama, CTR, ortalama konum; sorgu/sayfa/cihaz; indeksleme ve veri güncelliği. Temel teknik SEO Faz 0'dadır. |
| Veri kalitesi ve sağlık | Tekrarlı/eksik olay, test filtreleri, izin kapsamı, cihaz hataları, son yayın ve senkronizasyon hataları |

Her yüzde yanında pay/payda gösterilmeli. Her kartta dönem, saat dilimi, tanım, kaynağın güncelliği ve ilgili olay/sipariş kayıtlarına güvenli erişim bulunmalı. Az verili değişimlere otomatik kazanan/başarısız etiketi konmamalı.

### Ölçüm sözleşmesi: yanıltıcı sonuç üretmeme kuralları

1. Sayfa görüntüleme, oturum ve kişi aynı değildir. İlk sürümde oturum esaslı oranlar daha açıklanabilir; rastgele ziyaretçi/oturum kimlikleri yalnız uygun izin ve saklama politikası içinde kullanılmalı. Cihazlar arası kesin kişi sayısı vaat edilmez.
2. Ana sayfadan başlayanlar ile yolculuk içinde ana sayfaya uğrayanlar ayrı segment. Instagram'dan ürüne doğrudan gelenler mağaza geneli hunisine girer; ana sayfa hunisine zorlanmaz.
3. Hero tıklama oranında payda gerçekten hero'yu gören oturumlar olmalı. Sayfanın altına inmeyen biri, alt blokta tıklamadı diye değerlendirilmemeli.
4. Adım dönüşümü = önceki adımı tamamlayan aynı ölçüm grubundan sonraki adıma geçenler / önceki adımı tamamlayanlar. Dönüşüm penceresi gösterilmeli; bağımsız işlem yüzdeleri birbirini dışlamadığı için toplamları %100 olmayabilir. [Zaman pencereli huni yaklaşımı](https://docs.mixpanel.com/docs/reports/funnels/funnels-overview)
5. Sepet terki için örneğin 24 saatlik bir ilk pencere seçilebilir; bu öneridir, sektör standardı iddiası değildir. Penceresi dolmamış sepet bekliyor olarak kalmalı. Sonradan alınırsa sonuç güncellenmeli. Tarayıcı kapanış olayı güvenilir kesin terk sinyali sayılmamalı.
6. Ürün bazında, sepete eklenen aynı ürün/varyantın alınması ölçülmeli. Başka ürün satın almak ilk ürünün dönüşümü değildir. Başarıyla sepet değiştikten sonra olay gönderilmeli; yalnız buton tıklaması yeterli değil.
7. Siparişin oluşması, ödenmesi, iade edilmesi ve bankaya geçmesi ayrı zaman ve durumlar. Satış raporunda paid_at; sipariş oluşturma raporunda created_at kullanılmalı. İade ile orijinal satın alma geçmişini silmek aynı şey değildir.
8. Sepetteki tutar kesin kaçırılmış ciro değildir. Eksik izin/cihaz değişimi/engellenen ölçüm nedeniyle bilinmeyenler açık gösterilmeli. Davranış hunisinin pay ve paydası aynı uygun ölçüm grubundan gelmeli; tüm finansal satışlarla kısmi ziyaret sayısı bölünmemeli.

### Ayrıntılı keşif ve ziyaretçi metrikleri — kapsam genişletmesi

Bu bölüm, ziyaretçi bazlı ürün/kategori keşfi ve ilk 3/5 ürün isteğini ilk faza dahil eder. Bunlar uygulanmış veya geçmiş veriden hesaplanmış metrikler değildir.

**Üç ayrı bakış olmalı:** mağaza geneli, kategori/ürün karşılaştırması ve tek gözlenen ziyaretçinin yolculuğu. Ziyaretçi burada izin kapsamında rastgele tarayıcı kimliğiyle ilişkilendirilen kayıttır; kesin gerçek kişi değildir. Çerez silinmesi/cihaz değişimi ve eksik geçmiş nedeniyle kimlik bölünebilir. Parmak iziyle takip veya izinsiz cihazlar arası birleştirme yapılmamalı. Ödeme-kimlik bağlantısı bulunamayan siparişler tahminen bir ziyaretçiye atanmamalı.

#### Keşif ve karar verme kataloğu

| Metrik | Tanım / yöneticiye vereceği bilgi |
|---|---|
| Ziyaretçi başına farklı kategori | Dönemde her ziyaretçinin gördüğü farklı kategori sayılarının toplamı / ölçülen ziyaretçi sayısı; hiç kategori açmayanlar sıfır olarak dahil. Kategori inceleyenlerle sınırlı görünüm ayrıca etiketli. |
| Oturum başına kategori derinliği | Aynı hesap oturum düzeyinde; tekrar kategoriye geliş ve kategori→kategori geçişi farklı ölçüler. |
| Kategoride aktif süre ve ürün geçişi | Görünür/aktif sekmedeki süre, ürün açılışı, filtre/sıralama kullanımı. Arka planda açık sekmenin süresi ilgi sayılmaz; sayfada olmak okumak demek değildir. |
| Farklı ürün / toplam ürün görüntüleme | A→B→A, iki farklı ürün ve üç geçerli görüntülemedir. Ortalama yanında medyan ve dağılım; 0, 1, 2, 3–5, 6+ ürün grupları başlangıç önerisi. |
| İlk ürün | İlk görüntülenen ürün ve ilk kart tıklaması ayrı. Reklamdan ürüne doğrudan açılış, kart tıklaması sayılmaz. |
| İlk 3 / ilk 5 farklı ürün | Ziyaretçi veya oturum başlangıcından itibaren sıralı farklı ürün listesi. Aynı ürüne dönüş sıralamayı ilerletmez. Rapor dönemi içindeki sıra ile kayıtlı geçmişteki sıra ayrılır. |
| Kaçıncı sıradaki ürün sepete gidiyor? | Ürünün ilk keşif sırası, ilk başarılı eklemeye kadar kaç farklı ürün incelendiği; ilk 3/5 içindeki ürünlerin sonradan eklenmesi ve satın alınması. |
| Ürüne tekrar bakma | Aynı ürünü açma sayısı, farklı oturumda geri dönme, ilk/son inceleme ve ardından ekleme/satın alma. Yenilenen veya iki kez iletilen aynı olay tekrar ilgi sayılmamalı. |
| Kaçıncı ziyarette satın alındı? | İlk gözlenen doğrulanmış siparişin gerçekleştiği oturum sırası; oturum 1, 2, 3+ dağılımı. Eksik geçmişte gerçek ilk ziyaret/satın alma iddiası yok. |
| Karara kadar süre | İlk gözlenen ürün incelemesinden eklemeye ve ödenmeye süre; yalnız tamamlayanların süresi ile henüz tamamlamayanlar ayrı. |
| Geçiş ve birlikte değerlendirme | A'dan sonra en sık incelenen B; beraber incelenen, beraber sepete eklenen ve beraber satın alınan ürünler ayrı listeler. Birlikte inceleme birlikte satın alma değildir. |
| Kaynak ve cihaz farkı | Aynı tanımlarla Meta/organik/doğrudan, mobil/masaüstü, tarayıcı ve yeni/geri dönen gözlenen ziyaretçi karşılaştırması. Kaynağı bilinmeyenler korunur. |

İlk-K raporunda 3 veya 5 ürüne ulaşmamış ziyaretçiler kaybolmamalı: mevcut liste uzunluğu, her sıraya ulaşan kişi/oturum sayısı ve kapsama oranı gösterilmeli. Yalnız beş ürüne ulaşanların satın alma oranını bütün mağazanın oranı diye sunmak daha ilgili ziyaretçileri seçerek sonucu yanıltır. Kartın listede gösterildiği konum ile ziyaretçinin tıklama sırası ayrı alanlardır; öne yerleştirme etkisi ürünün doğal çekiciliği gibi yorumlanmamalı.

#### “Her kullanıcı için oran” ne demek?

| Bakış | Hesap |
|---|---|
| Mağazanın ziyaretçi sepete ekleme oranı | En az bir başarılı eklemesi olan farklı ziyaretçi / aynı kapsamdaki ölçülen farklı ziyaretçi. |
| Tek ziyaretçinin ürün ekleme oranı | İncelediği ürünler arasından sonradan sepete eklediği farklı ürün / incelediği farklı ürün. Örneğin 8 ürünün 2'si: %25; bu sadece açıklayıcı örnek. |
| Tek ziyaretçinin oturum bazlı ekleme oranı | En az bir başarılı ekleme yaptığı oturum / ölçülen oturumları. Bu, ürün bazlı oranla aynı değildir. |
| Ürün inceleme→ekleme oranı | Aynı ürünü görüntüledikten sonra ekleyen ziyaretçi / o ürünü görüntüleyen ziyaretçi. Detaya girmeden hızlı ekleme ayrı sayılır; bu paydaya sessizce eklenmez. |
| Sepet→ödeme başlatma | Belirlenen pencerede checkout başlatılan uygun farklı sepet / ürün içeren uygun farklı sepet. Tekrarlı eklemeler yeni sepet sayılmaz. |
| Sepet→tamamlanan satın alma | Aynı pencerede doğrulanmış ödemeye dönüşen uygun farklı sepet / uygun farklı sepet. Henüz penceresi dolmayanlar ayrıca bekliyor. |
| Ödeme başlangıcı→başarı | Ödenmiş mantıksal checkout girişimi / başlatılmış mantıksal checkout girişimi. Teknik retry/çift tıklama aynı girişimi çoğaltmamalı. |
| Eklenen ürün→satın alınan ürün | Eklenen ürün/SKU'lardan sonradan satın alınanlar / eklenenler. Bu oran sepet tamamlama oranı değildir; adet ve farklı SKU ayrı gösterilir. |

Sepet/checkout oranları tek ziyaretçi için de aynı tanımlarla, yalnız o kimliğin ilişkilendirilebilen kayıtları üzerinden hesaplanabilir. Bir sepetin oturumlar arasında korunması gerekir; satın alma sonrası yeni alışverişe yeni sepet döngüsü verilir. Sıfır paydada %0 değil “veri yok / —” gösterilir. Tek tek ziyaretçi yüzdelerinin basit ortalaması, mağazanın toplam pay/toplam payda oranının yerine geçmez.

İlk-K ve tekrar ziyaret dönüşümleri için eşit takip penceresi/sonuçlanma durumu gerekir. Geçen ay incelenen ürünle bugün inceleneni aynı olgunlukta saymamalı. Dönem sonrasında gerçekleşen satın almanın nasıl sayılacağı rapor tanımında bulunmalı. Bu ilişkiler tek başına nedensellik veya reklamın ek satış etkisi değildir.

#### Admin'de iki tamamlayıcı görünüm

- **Özet ve karşılaştırma:** kategori/ürün derinliği, ilk tıklama sırası matrisi, ilk 3/5 listelerinin dönüşümü, ziyaret sırası dağılımı, aynı ürünlere geri dönüş, adım bazlı kayıp; her hücreden ilgili izinli kayıt listesine geçiş.
- **Ziyaretçi yolculuk kartı:** takma kimlik, ölçülebilen ilk/son geliş, oturumlar, kaynak, sırayla incelenen kategori/ürünler, aynı ürüne dönüş, ekleme/çıkarma/miktar değişimleri, checkout sonucu. Varsayılan görünüm isim/e-posta/telefon göstermez; operasyonel müşteri kaydına geçiş ayrı yetki ve gerekçeyle değerlendirilir.

Panel, “kaçıncı inceleme / hangi ziyarette?” sorusuna gözlenen olaylarla cevap vermeli; müşterinin zihnini okuyor gibi neden uydurmamalı. Yalnız rapor için saklanacak ham veri, saklama süresi ve erişim yetkileri sınırlı olmalı. Ziyaretçi ayrıntısı, otomatik müşteri mesajı gönderme yetkisi değildir.

### Teknik tasarım önerisi

Tipli, sürümlü ve sınırlı iç olaylar: page_view, category_view, section_view, select_item, cta_click, view_item, add_to_cart, remove_from_cart, cart_quantity_changed, begin_checkout, checkout_error, otp_verified, payment_redirected ve sunucuda purchase/refund. Pazarlama sağlayıcısı isimleri iç sözleşmeden adaptörle ayrılmalı. Liste/kategori kimliği, kartın görünen konumu, sunum sürümü, olayın oluşma sırası ve sepet/checkout kimliği; ilk-K ve tekrar ziyaret hesaplarını destekleyecek sınırlı alanlar olarak tasarlanmalı. Görüntüleme ile tıklama, otomatik görünürlük ile kullanıcı eylemi aynı olay sayılmamalı.

Ürün/SKU, olay kimliği, zaman, izin durumu/sürümü, temizlenmiş sayfa ve izinli kampanya alanları yeterli olmalı; bütün DOM/tıklama/form içeriği toplanmamalı. Temel işlem akışı telemetri arızasından etkilenmemeli. Satın alma için kalıcı gönderim kuyruğu ve aynı event_id ile tekrar deneme; raporlar için özet tablolar. Ham olayları sınırsız tutan veya her dashboard açılışında tamamını tarayan yapı kurulmamalı. Bu bir uygulama taslağıdır; SQL/veri modeli henüz uygulanmadı.

## 5. Meta reklam ölçümü

### Olaylar ve gerçek satış

İlk pazarlama olayları ViewContent, AddToCart, InitiateCheckout, Purchase. Kaynaklar: [Meta resmî olay/consent şablonu](https://github.com/facebook/GoogleTagManager-WebTemplate-For-FacebookPixel/blob/main/template.tpl), [Meta Pixel+CAPI duyurusu, 15 Nisan 2026](https://about.fb.com/ltam/news/2026/04/eliminar-barreras-tecnicas-para-ayudar-a-empresas-de-todos-los-tamanos-a-aprovechar-mas-sus-anuncios/).

Önerilen Purchase akışı: doğrulanmış PayTR success → tek atomik paid geçişi → gönderim kuyruğu → izin uygunsa CAPI. Callback cevabı analitik servisini beklememeli. Tarayıcı Purchase de kullanılacaksa aynı backend-doğrulanmış satışa ve aynı event_name/event_id çiftine dayanmalı; yenileme/tekrarlı bildirim ikinci satış oluşturmamalı. [Meta Event SDK](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/event.py)

PayTR tutarları kuruş cinsindedir; sağlayıcının toplam tahsilatı taksit farkı içerebilir. Siparişin ticari tutarı, gönderim/vergi dahil tanımı ve tahsilat ayrı alanlarda açık olmalı. Meta için para birimi TRY ve uygun ana birim dönüşümü test edilmeli. [PayTR](https://dev.paytr.com/iframe-api/iframe-api-2-adim), [Meta CustomData](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/custom_data.py)

### Atıf ve reklam harcaması

- İlk/son gözlenen UTM kaynağı, kampanya/reklam kimlikleri, açılış sayfası ve zaman; kişisel veri içermeyen izinli biçimde tutulmalı. _fbc/_fbp ayrı Meta eşleştirme alanlarıdır; gerçek fbclid yokken uydurulmamalı. İzinli kaynak bilgisi ödeme öncesi siparişe bağlanmalı; callback'te ziyaretçinin tarayıcı oturumu yoktur. [Meta UserData SDK](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/user_data.py)
- Admin üç ayrı satış değeri göstermeli: gerçek tahsilatla doğrulanan satış, kendi gözlenen kaynak kurallarımıza göre kampanya satışı, Meta'nın atfettiği satış. Model/pencere farklılıkları gizlenmemeli.
- Meta, 3 Mart 2026 duyurusunda web/mağaza click-through dönüşümlerini bağlantı tıklamalarıyla sınırlandırıp diğer sosyal etkileşimleri engage-through altında ayıracağını belirtti. Hesaplara geçiş zamanı farklı olabileceği için eski atıf varsayımları sabit kodlanmamalı. Aktif hesap ayarı, tarih, saat dilimi, para birimi ve API sürümü raporla tutulmalı. [Meta resmî duyuru](https://about.fb.com/br/news/2026/03/simplificando-a-mensuracao-de-anuncios-para-um-mundo-social-first/)
- Harcama için başlangıçta CSV/manual giriş; ardından reklam hesabı yetkileriyle salt okunur Marketing API senkronizasyonu. Reklam açma/değiştirme izni otomatik talep edilmemeli. [Meta resmî API koleksiyonu](https://www.postman.com/meta/facebook-marketing-api/collection/0zr4mes/facebook-marketing-api-mapi)
- ROAS = açıkça tanımlanmış atfedilen ciro / reklam harcaması; kâr değildir. CPA için hangi satın alma tanımının kullanıldığı belirtilmeli; yeni müşteri CAC'i için gerçekten ilk sipariş olduğuna dair kayıt gerekir. Reklama atıf, reklamsız olmayacak ek satışın kanıtı değildir.

### İzin, hassas veri ve kabul testi

Pixel/CAPI izin akışının iki kolu olmalı; sunucu gönderimi izinleri atlama yolu değildir. Pazarlama ile ürün analitiği tercihleri ayrı uygulanmalı. Reddetme/geri çekme, kuyruktaki gönderimler dahil tasarlanmalı. Kart, OTP, adres, e-posta/telefon, ödeme token'ı serbest olay özellikleri/URL/loglara konmamalı. Sağlayıcının izinli eşleştirme alanları ayrıca değerlendirilir; hash tek başına veriyi anonim veya izinsiz işlenebilir yapmaz. [Meta şablonu](https://github.com/facebook/GoogleTagManager-WebTemplate-For-FacebookPixel/blob/main/template.tpl), [KVKK çerez rehberi](https://www.kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber)

Isı haritası/replay istenirse ilk sürümde yalnız uygun izinli vitrin sayfalarında sınırlı kullanım; admin, hesap, adres, OTP ve ödeme ekranlarında kapalı. Web replay araçlarında inputların maskelenmesi bütün DOM metninin/URL'nin maskelendiği anlamına gelmez. [PostHog mahremiyet kontrolleri](https://posthog.com/docs/session-replay/privacy), [veri toplamayı kontrol etme](https://posthog.com/docs/privacy/data-collection)

Canlı reklamdan önce: Events Manager Test Events; doğru olay sırası; değer/TRY/ürün kimliği; Pixel+CAPI tekilleştirme; yenileme/callback retry; başarısız/test ödeme; rıza reddi ve geri çekme; mobil Safari; gönderim hatasında checkout'un çalışması. [Meta test_event_code](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/event_request.py). Bu kabul testleri henüz yapılmadı; gerçek hesap bağlanmadı.

## 6. SEO: önce mevcut sinyallerin doğruluğu

Ürün metadata'sı, Product JSON-LD, sitemap, robots ve taranabilir sayfalama mevcut. Aşağıdakiler kod incelemesi bulgularıdır; canlı Google indeks durumu bu çalışmada doğrulanmadı.

| Öncelik | Bulgu ve kanıt | Yapılacak iş |
|---|---|---|
| İlk faz | Root canonical '/' diğer içerik sayfalarına miras kalabiliyor: [layout.tsx:24](C:/Users/beytu/Desktop/PrestigeSO/app/layout.tsx:24) | Hakkımızda/iletişim ve indekslenecek gerçek sayfalara uygun self-canonical; kök mirasını düzenleme. |
| İlk faz | /shop canonical'ı kategori ve sayfa parametrelerine rağmen sabit: [shop/layout.tsx:7](C:/Users/beytu/Desktop/PrestigeSO/app/shop/layout.tsx:7) | Sayfalama için ayrı canonical; kategori açılışları ile arama/sıralama/çoklu filtreleri ayrı indeksleme politikasıyla ele alma. |
| İlk faz | Product JSON-LD ana fiyat/indirim/stok üzerinden; kampanya ve varyant farklılaşabilir: [product/layout.tsx:62](C:/Users/beytu/Desktop/PrestigeSO/app/product/[id]/layout.tsx:62) | Görünür gerçek teklifle ortak fiyat/stok kaynağı; mutlak site URL'si; gerçek varyantlar için uygun şema; örnek Rich Results testleri. |
| İlk faz | Sitemap statiklerde now, ürünlerde created_at; yalnız stock>0: [sitemap.ts:10](C:/Users/beytu/Desktop/PrestigeSO/app/sitemap.ts:10), [sitemap.ts:82](C:/Users/beytu/Desktop/PrestigeSO/app/sitemap.ts:82) | Gerçek değişiklik tarihi; geçici tükenmiş/kalıcı kaldırılmış ürün politikası; sorgu hatasını görünür kılma. |
| İlk faz | Başarı/başarısız ödeme, şifre yenileme ve sipariş takibi için ayrı noindex eksik | İşlemsel sayfa sınıflarını noindex; Google'ın etiketi okuyabilmesini sağlama. Robots engeli tek başına noindex değildir. |
| İlk faz | WebSite/Organization/OnlineStore marka şeması yok | Yalnız doğrulanmış mevcut marka/URL/logo bilgileriyle ekleme; gerçek olmayan işçilik/sertifika/puan eklememe. |
| İlk faz ölçüm | Admin'de Search Console entegrasyonu yok | Doğrulanmış property'den sorgu/sayfa/cihaz raporu; önce tarihli dışa aktarım, sonra read-only API. Dışarıda hesap olmadığı iddia edilmiyor. |

Kaynaklar: [Google canonical](https://developers.google.com/search/docs/crawling-indexing/canonicalization), [sayfalama](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading), [filtreli gezinme](https://developers.google.com/crawling/docs/faceted-navigation), [structured data doğruluğu](https://developers.google.com/search/docs/appearance/structured-data/sd-policies), [ürün varyantları](https://developers.google.com/search/docs/appearance/structured-data/product-variants), [sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing), [Organization](https://developers.google.com/search/docs/appearance/structured-data/organization), [site adı](https://developers.google.com/search/docs/appearance/site-names).

SEO ekranında son tamamlanmış dönem/önceki dönem için gösterim, tıklama, CTR, ortalama konum; marka/marka dışı sorgular, açılış sayfaları, cihaz ve ülke olmalı. Search Console tıklaması oturum veya kişi değildir; sorgu verisi tek bir siparişe bağlanamaz. Güncellik ve eksik/anonimleştirilmiş sorgular hesaba katılmalı. [Google metrikleri](https://support.google.com/webmasters/answer/7042828?hl=en)

Sonraki içerik aşaması: arama niyetine uygun gerçek kategori metinleri, özgün ürün açıklamaları, doğrulanmış ölçü/malzeme özetleri, bakım/ölçü rehberleri ve alakalı iç bağlantılar. Anahtar kelime doldurma veya otomatik yüzlerce düşük değerli sayfa yerine mevcut ürün bilgisi eksikleri kapatılmalı. Premium sayfada önemli ürün bilgisi animasyon sonrasına saklanmamalı. Hiçbir teknik düzenleme birinci sıra, yıldız veya indeks garantisi değildir.

## 7. İşlem e-postaları ve fatura gönderimi

Mevcut kodda dört e-posta yüzeyi var: [OtpEmail.tsx:7](C:/Users/beytu/Desktop/PrestigeSO/components/emails/OtpEmail.tsx:7), [OrderConfirmation.tsx:15](C:/Users/beytu/Desktop/PrestigeSO/components/emails/OrderConfirmation.tsx:15), [OrderDelivered.tsx:8](C:/Users/beytu/Desktop/PrestigeSO/components/emails/OrderDelivered.tsx:8) ve [InvoiceEmail.tsx:8](C:/Users/beytu/Desktop/PrestigeSO/components/emails/InvoiceEmail.tsx:8). Bunlar ayrı, basit inline stiller kullanıyor; ortak bir marka/e-posta tasarım kabuğu bulunmuyor.

Fatura işlevinin sınırı açık tutulmalı: mevcut sistem e-fatura oluşturmaz. Yönetici sipariş ekranından hazır PDF yükler; sunucu bu dosyayı e-posta eki olarak gönderir: [OrdersModal.tsx:550](C:/Users/beytu/Desktop/PrestigeSO/components/admin/modals/OrdersModal.tsx:550), [invoice/route.ts:28](C:/Users/beytu/Desktop/PrestigeSO/app/api/admin/orders/invoice/route.ts:28), [invoice/route.ts:62](C:/Users/beytu/Desktop/PrestigeSO/app/api/admin/orders/invoice/route.ts:62). Resmî e-fatura oluşturma/entegratör bağlantısı istenirse bu ayrı kapsam ve hukuki/teknik doğrulama gerektirir.

Önerilen ortak e-posta sistemi:

- **Ortak marka kabuğu:** gerçek PrestigeSO logosu, tutarlı renk/yazı/boşluk, erişilebilir başlıklar, mobil uyum ve e-posta istemcilerinin desteklediği güvenli HTML/CSS. Koyu modda okunabilirlik ve görsel yüklenmediğinde anlamlı alternatif metin.
- **Doğrulama kodu:** kod ve geçerlilik süresi en belirgin içerik; kodun neden gönderildiği, paylaşılmaması ve işlem kullanıcıya ait değilse ne yapılacağı. E-postanın tasarımı güvenlik kontrolünü veya mevcut süre/deneme sınırlarını değiştirmemeli.
- **Sipariş onayı:** doğru sipariş numarası, ürün/adet/tutar özeti, ödeme durumu ve güvenli takip bağlantısı. E-posta yalnız sunucuda doğrulanmış ödeme kaydından üretilmeli; sayfa yenileme veya callback tekrarı mükerrer mail oluşturmamalı.
- **Teslim bilgisi:** sipariş kimliği, gerçekten kayıtlı teslim durumu ve uygun destek/takip yolu. Yeni otomatik durum kampanyaları bu tasarım işinin parçası değildir.
- **PDF fatura:** doğru sipariş, doğru alıcı, dosya adı/türü/boyutu ve fatura gönderim kaydı; gönderimden önce yöneticiye alıcı ve sipariş özeti. PDF içeriğinin gerçek fatura doğruluğu dosyayı yükleyen işletmenin sorumluluğundadır.
- **Teslim edilebilirlik ve kalite:** HTML yanında anlaşılır düz metin içerik, konu/gönderen tutarlılığı, SPF/DKIM/DMARC alan adı kontrolü, Gmail/Outlook/Apple Mail ve mobil önizleme. Testler gerçek müşteriye mail göndermeyen yakalama ortamında yapılmalı.
- **Operasyon kaydı:** mail türü, sipariş, alıcı, sağlayıcı mesaj kimliği, deneme ve sonuç durumu; hassas doğrulama kodu, ödeme verisi veya anahtarlar loglanmamalı. Başarısız mail ödeme/sipariş kaydını geri almamalı; güvenli yeniden deneme ayrı çalışmalı.

E-posta kapsamı fazlara bölünür: Faz 1'de veri doğruluğu, sipariş/alıcı eşleşmesi, tekilleştirme ve gönderim hatasının temel işlemi bozmaması; Faz 3'te ortak premium görsel sistem ve istemci uyumluluğu; Faz 5'te admin önizleme, alıcı özeti, gönderim/geçmiş/yeniden deneme ve PDF fatura iş akışı. Mevcut işlem e-postalarını iyileştirmek, izinsiz pazarlama e-postası veya yeni otomatik müşteri kampanyası ekleme yetkisi değildir.

## 8. Bu turda uygulanan logo düzeltmesi

`app/favicon.ico` Vercel'in beyaz üçgen/siyah zemin ikonuydu. Yerine mevcut siyah-beyaz serif marka dilinde P simgesi eklendi; tam PrestigeSO yazı logosu `public/logo.jpeg` değiştirilmedi.

- Düzenlenebilir, font bağımsız kaynak: [brand-icon.svg](C:/Users/beytu/Desktop/PrestigeSO/public/brand-icon.svg).
- 16/32/48/64/128/256 px favicon; 96 px arama ikonu; 180 px Apple; 192/512 px manifest ikonları.
- Manifest root metadata'ya bağlandı; eski JPEG için yanlış sizes:any tanımı kaldırıldı.
- Üretim script'i ve 3 regresyon testi eklendi; HTTP testi ana sayfa head etiketlerini ve sunulan dosyaları doğruluyor. Bu test istemciyi çalıştırmadığı için ziyaret sayacı yazmıyor.

Doğrulama: 50/50 unit/regresyon testi; TypeScript; değişen kod/test dosyalarında ESLint; production build; 1 HTTP entegrasyon testi başarılı. İkonlar görsel olarak da kontrol edildi. Fiziksel telefon, Google taraması veya canlı deploy testi yapılmadı. Henüz commit/push/deploy yok.

Google favicon'u yeniden tarayıp işlemek için günler veya haftalar alabilir; uygun dosya ve link olması görünümü garanti etmez. Deploy sonrası ana sayfa için Search Console URL denetimiyle yeniden tarama istenebilir. [Google favicon rehberi, 28 Ağustos 2026 güncellemesi](https://developers.google.com/search/docs/appearance/favicon-in-search)

## 9. Tarihsel uygulama sırası (yeni planla değiştirildi)

Bu bölüm eski altı fazın araştırma kaydıdır; uygulama listesi olarak kullanılmamalı. 6 Eylül planı ayrı Faz 0 ekler, buradaki Faz 1'in hata/güvenilirlik işlerini Faz 0'a taşır ve Ek Faz'ı ana işlerden sonraya alır. Güncel kabul koşulları yeni belgededir. Fazlar tek ve uzun bir deploy değildir; her biri küçük, geri alınabilir teslimatlara bölünür.

1. **Faz 1 - Sağlam altyapı ve gelişmiş işletmeci analitiği (aktif öncelik):** mevcut iade/işlem riskleri, hata kurtarma, izin sözleşmesi, olay/oturum/sepet tanımları, tekilleştirme, maliyet sınırları ve temel teknik SEO. İşlem e-postalarında sipariş/alıcı eşleşmesi, mükerrer gönderim koruması, gönderim sonucunun kaydı ve mail hatasının ödeme/sipariş işlemini geri almaması bu güvenilirlik paketine dahildir. Ardından ana sayfa ve mağaza hunileri; kategori/ürün keşif derinliği; ilk 3/5 farklı ürün; tekrar inceleme ve ziyaret; izinli ziyaretçi yolculukları; ürün/sepet oranları, ödeme teşhisi, cihaz hataları ve veri kalitesi. Çıkış: kontrollü senaryolardaki olaylar doğru ve mükerrer değil; her sayı tanımı, payı/paydası ve kaynağıyla açıklanabilir; doğrulama, sipariş ve fatura e-postası testleri yanlış alıcıya/iki kez gönderim üretmez; bilinmeyen veya henüz ölçülmeyen sonuçlar açık etiketlidir.
2. **Faz 2 - Meta, finans, SEO takibi ve Trendyol sipariş yönetimi (ERTELENDİ / RAFTA):** ileride Meta Pixel/CAPI, izinli reklam atfı, harcama ve katkı payı, Search Console görünürlüğü ile Trendyol siparişlerinin mevcut PrestigeSO admin panelinden görüntülenip yönetilmesi ele alınacak. Trendyol ve site siparişleri tek ekranda kaynakları karıştırılmadan ayrılacak; çift kayıt, sipariş/durum eşleme, yetkili eylemler ve stok etkisi gerçek Trendyol API sözleşmesine göre ayrıca tasarlanacak. Bu faz yalnız gelecek kapsam notudur: şimdilik kod, veritabanı migration'ı, harici hesap bağlantısı veya entegrasyon çalışması yapılmayacak.
3. **Faz 3 - Genel mağaza ve işlem e-postası tasarımı:** ortak marka/görsel sistem; ana sayfa, menü, standart kategori, ürün kartları ve standart ürün detayı; tutarlı URL gezinmesi, arama/filtre/sıralama, galeri, ölçü/malzeme özeti, sepet/checkout, hata durumları, mobil kullanım ve erişilebilirlik. Aynı tasarım diliyle doğrulama kodu, sipariş onayı, teslim bilgisi ve PDF fatura için ortak, mobil uyumlu e-posta kabuğu hazırlanır; güvenlik kodunun görünürlüğü ve sipariş/fatura bilgisinin okunabilirliği görsel süsten önce gelir. Çıkış: gerçek içerikli mobil/masaüstü site tasarımı onaylanmış; ürün bulma, inceleme, sepete ekleme ve ödeme başlatma görevleri hedef cihazlarda tamamlanmış; mail şablonları Gmail/Outlook/Apple Mail hedeflerinde okunabilir ve görselsiz/düz metin durumda anlaşılır olmalı.
4. **Faz 4 - Premium kategori ve premium ürün pilotu:** ortak tasarım sistemiyle bir premium kategori/koleksiyon ve seçilmiş bir premium ürün detayı birlikte hazırlanır. Mevcut SKU, stok, fiyat, sepet ve ödeme altyapısı korunur; koleksiyon anlatımı, galeri, gerçek ürün bilgileri ve kontrollü hareket katmanı eklenir. Çıkış: görünüm onaylanmış; premium sunum mobil/masaüstünde performansı, erişilebilirliği veya satın alma işlevlerini bozmamış olmalı.
5. **Faz 5 - Admin içerik, e-posta ve katalog operasyonu:** ürün/kategori sunum şablonu, tekrar kullanılabilir bloklar, ürün bazlı sunum seçimi, taslak/önizleme/yayın/geri alma, medya ve teknik özellik doğrulaması, SKU tabanlı güvenli ürün girişi ve stok hareketi takibi. Aynı admin panelinde işlem e-postası önizleme, sipariş/alıcı özeti, kontrollü gönderim/yeniden deneme ve gönderim geçmişi; PDF faturanın doğru siparişe yüklenip gönderilmesi yer alır. Çıkış: desteklenen şablonlarla yeni premium ürün yayınlamak için ürün başına kod veya deploy gerekmemeli; yönetici kime, hangi sipariş için, hangi mail/faturayı gönderdiğini görebilmeli; tamamen yeni davranış/bileşen yine geliştirme gerektirebilir.
6. **Faz 6 - Yaygınlaştırma ve ölçülen büyüme:** onaylanan şablonları diğer ürün/kategorilere taşıma; özgün kategori içerikleri, ölçü/bakım rehberleri, sonuçsuz arama ve stok talebi, tekrar alışveriş ve kontrollü tamamlayıcı ürün önerileri. Yeterli veri varsa deneyler; düşük trafikte görev bazlı kullanılabilirlik gözlemleri. Çıkış: yaygınlaştırılan yüzeyler test edilmiş; az veriyle kesin kazanan, kayıp satış veya nedensellik iddiası üretilmemiş olmalı.

### Ek Faz - Operasyonel olgunluk ve sürekli kalite

Bu eski envanter artık Ek Faz uygulama sırası değildir. Yeni planda yedek/geri dönüş/ödeme sürekliliği/temel yetki izi Faz 0'a; veri yaşam döngüsü Faz 1'e; medya doğruluğu ve mail işleri ilgili ana fazlara taşındı. Gerçek Ek Faz yalnız ana işler bittikten sonra gelir. Ertelenen Faz 2 yeniden açılmaz; kapsam dışı işler içeri alınmaz.

| Öncelik | Ek Faz konusu | Kapsam / tamamlanma ölçütü |
|---|---|---|
| Kritik | Yedek ve geri yükleme tatbikatı | Supabase veritabanı ile Storage nesneleri ayrı korunur; saklama aralığı, kabul edilebilir veri kaybı ve geri dönüş süresi yazılır; üretimi ezmeden bir geri yükleme denemesi kanıtlanır. Supabase veritabanı yedeği Storage nesnelerini içermez: [Supabase backup dokümanı](https://supabase.com/docs/guides/platform/backups). |
| Kritik | Güvenli yayın, migration ve geri alma | Her yayın için önizleme, migration sırası, kritik smoke testleri, canlı sağlık kontrolü ve uygulama geri alma adımları. Vercel deployment rollback veritabanını kendiliğinden eski hâle getirmez; şema/veri değişikliklerinin ileri düzeltme veya geri alma yolu ayrıca hazırlanır. [Vercel rollback dokümanı](https://vercel.com/docs/deployments/rollback-production-deployment) |
| Kritik | Yönetici rolü ve denetim geçmişi | Yüksek riskli admin işlemlerinde kim, ne zaman, hangi nesneye, hangi sonucu üretti; mümkünse önceki/sonraki değer ve gerekçe. İade, stok, ürün yayını, fatura/mail ve ileride Trendyol işlemleri ayrı yetkilere bölünebilir. Gizli anahtar, parola, OTP, ödeme veya gereksiz kişisel veri loglanmaz. OWASP uygulama loglarında zaman/yer/aktör/eylem-sonuç bağlamını ve hassas alanların dışlanmasını önerir: [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html). |
| Kritik | Operasyon ve müdahale merkezi | PayTR callback/mutabakat sorunu, e-posta hatası, katalog/konum servisi hatası, görsel 404, olağandışı API yükü, düşük stok ve maliyet eşiği aynı yönetici sağlık alanında önem derecesiyle görünür. Alarm sonrası kısıtlama PayTR callback'ini kesmemeli; yeniden açma ve mutabakat adımları yazılmalı. Bu müşteri bildirimi değildir. |
| Orta | Rapor dışa aktarma ve değişiklik notları | Yetkili CSV dışa aktarma; kayıt sayısı/kapsam/zaman dilimi; kayıtlı filtreler ve metrik sözlüğü. Fiyat, stok, kampanya, tasarım veya deploy değişiklikleri grafiklere işaretlenir; böylece değişimlerin öncesi/sonrası bağlamı kaybolmaz. Her dışa aktarma denetim geçmişine girer. |
| Orta | Veri yaşam döngüsü ve araç kararı | Ölçüm başlangıç tarihi, olay sürümü, saklama/silme/özetleme, takma kimlik ve erişim kuralları. Analytics/replay aracı soru, maliyet ve veri yerleşimine göre seçilir; birden fazla araç gerekçesiz kurulmaz. Replay olursa yalnız uygun izinli vitrin yüzeyleri; admin, hesap, adres, OTP, sipariş takip ve ödeme kapalıdır. |
| Orta | Ürün ve medya doğruluk kapısı | Her görselin ayrı bilgi vermesi; ürün geometrisi, zincir devamlılığı ve gerçek ölçek; yüz göstermeme tercihi; ürün başına kararlaştırılan sekiz final görsel; çözünürlük/sıkıştırma, alt metin ve kırık medya kontrolü. Ölçü, malzeme, kaplama, bakım ve açıklama doğrulanmadan yayın yapılamaz. İlk premium pilot için Erkek Kolye kararı korunur veya değişiklik kayda geçirilir. |
| Orta | İade nedeni ve stok sonucu | Ürün/SKU bazlı standart iade/değişim nedeni; ürünün satılabilir, hasarlı veya inceleme bekliyor sonucu; buna göre denetlenebilir stok hareketi. Problemli sipariş çalışma alanı, yinelenen SKU önleme ve stok düzeltme gerekçesi. |
| Orta | E-posta teslim edilebilirliği ve fatura kontrolü | SPF/DKIM/DMARC doğrulaması, bounce/engellenme ve sağlayıcı mesaj sonucu, güvenli yeniden deneme; doğru sipariş/alıcı/PDF eşleşmesi ve gönderim geçmişi. Şablon testi gerçek müşteriye mail göndermeyen ortamda yapılır. Resmî e-fatura üretimi hâlâ ayrı kapsamdır. |
| Orta | Misafir ödeme taslak kurtarma | Yenileme veya başarısız ödeme dönüşünde gerekli adres alanlarının süreli, açıkça temizlenebilir biçimde kurtarılması; OTP, ödeme token'ı ve kart verisi hiçbir taslağa konmaz. |
| Sürekli kapı | Cihaz, erişilebilirlik ve performans matrisi | İlgili her yayında Android Chrome, iOS Safari/WebKit ve masaüstü akışları; klavye/odak/dokunma, yatay taşma, görsel ve kritik alışveriş testleri. Performans ölçümü mobil/masaüstü ve gerçek alan verisiyle ayrılır; sadece tek Lighthouse çalıştırması çıkış kanıtı değildir. |
| Sürekli kapı | Veri ve gözlemlenebilirlik kalitesi | Olay gövde/alan sınırı, IP/global bütçe, mükerrer olay, ham/temizlenmiş toplam, ölçüm dışı sipariş ve veri güncelliği. Aktif kategori süresi, arama/filtre, ürün geçişi, karar süresi ve kaynak/cihaz kırılımları Faz 1 sözleşmesiyle uyumlu tutulur; telemetri arızası alışverişi durdurmaz. |

Plan büyük olduğu için tek bir uzun deploy yerine küçük, geri alınabilir teslimatlar öneriliyor. İlk aşama ölçümlemeyi içeriyor; bütün ileri ekranların tek seferde eksiksiz hazır olduğu söylenmiyor.

### Dışarıdan gereken bilgiler / henüz doğrulanmayanlar

Faz 1 için veri saklama/izin kararları; e-posta çalışması için kullanılan gönderen alan adı, DNS teslim edilebilirlik kayıtları ve fatura PDF'sinin işletme tarafından nasıl üretildiği doğrulanmalıdır. Resend/API anahtarları veya doğrulama kodları sohbet mesajıyla paylaşılmamalı. Ertelenen Faz 2 yeniden açıldığında reklam hesabı ve Business Portfolio yetkisi; Pixel/dataset/mevcut otomatik olaylar; hesap para birimi, saat dilimi ve atıf ayarı; Search Console property yetkisi; gerçek maliyet kalemleri ile Trendyol satıcı hesabının güncel API/yetki sözleşmesi ayrıca doğrulanmalıdır. Bu bilgiler olmadan Meta başarısı, canlı ROAS, Google sıralaması, net kâr veya Trendyol senkronizasyon yetenekleri hesaplanmış/doğrulanmış gibi sunulamaz.

Araştırma sınırı: kamuya açık Reddit/Shopify örnekleri ile Meta/PayTR/Google/Shopify birincil kaynakları incelendi. İnternetin tamamı veya bütün mağaza sahiplerinin talepleri taranmış değildir. Meta developer kılavuzlarının bir kısmı 429/giriş kısıtına takıldığı için resmî SDK ve Meta'nın doğrulanmış API koleksiyonu kullanıldı. Kaynakların erişim tarihi 4 Eylül 2026; forum tarihleri kaynak örneğini tanımlar, fiyat/başarı garantisi değildir.
