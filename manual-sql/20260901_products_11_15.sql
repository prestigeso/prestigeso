begin;

insert into public.categories (name, slug)
select 'Erkek Kolye', 'erkek-kolye'
where not exists (
  select 1
  from public.categories
  where lower(trim(name)) = lower('Erkek Kolye')
);

insert into public.products (
  "SKU",
  name,
  description,
  price,
  discount_price,
  category,
  stock,
  is_bestseller,
  image,
  images
)
values
(
  'MN-167-191',
  'Viking Savaşçı Temalı 316L Çelik Kolye - 70 cm | İskandinav Esintili Tasarım',
  $desc11$
İskandinav mitolojisinin sert ve gizemli görsel dünyasından ilham alan bu Viking savaşçı temalı kolye, ayrıntılı ve üç boyutlu figürlü aksesuarları sevenler için hazırlanmıştır. Simetrik biçimde işlenen keskin hatlar, maskeyi ve savaşçı başlığını çağrıştıran merkez formu ile aşağı doğru uzanan kıvrımlı parçalar, kolye ucuna güçlü ve fantastik bir karakter kazandırır.

Viking Esintili Tasarım Dili

Viking ve İskandinav temalı takılar; cesaret, mücadele, keşif ve kararlılık gibi kavramları çağrıştıran görsel öğelerle tanınır. Bu modelde figürün parlak yüksek yüzeyleri ile derin oyuklardaki koyu tonlar bir araya getirilerek küçük ayrıntılar belirginleştirilmiştir. Farklı açılardan bakıldığında değişen ışık yansımaları, figürün heykelsi yapısını öne çıkarır.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Viking savaşçı ve İskandinav estetiğinden ilham alan üç boyutlu motif
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik ve koyu eskitme ayrıntıları
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: Viking, alternatif, gotik ve sembolik

70 cm zincir uzunluğu, detaylı figürün göğüs hizasında rahatça görünmesini sağlar. 4 mm zincir kalınlığı ise kolye ucunun görsel ağırlığıyla dengeli bir bütünlük kurar. Uzun zincirli form, özellikle kapalı yakalı tişört, sweatshirt ve triko üzerinde figürün tamamının görünmesine yardımcı olur.

Kombin ve Hediye Önerisi

Siyah, gri, bordo ve koyu yeşil gibi renklerle güçlü bir uyum oluşturur. Deri ceket, denim gömlek ve sade oversize üstlerle birlikte alternatif stil etkisi belirginleşir. İskandinav mitolojisine, Viking kültürüne, fantastik dünyalara veya ayrıntılı metal figürlere ilgi duyan sevdiklerin için özgün bir hediye seçeneğidir.

Kullanım ve Bakım Önerileri

Figürün oyuk ve kabartmalı yüzeyini kullanım sonrasında yumuşak, kuru bir bezle nazikçe silebilirsin. Parfüm, deodorant, krem, deniz suyu ve havuz kloruyla uzun süreli temastan kaçınmanı öneririz. Kullanmadığın zamanlarda zinciri dolaşmayacak, figürü de başka takılarla sürtünmeyecek biçimde ayrı saklayabilirsin.

Detaylı savaşçı figürü ve 70 cm uzun zinciriyle bu kolye, günlük stile İskandinav esintili güçlü ve özgün bir odak noktası ekler.
$desc11$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MN-167-174',
  'Route 66 Tabela Figürlü 316L Çelik Kolye - 70 cm | Retro Yol Kültürü Tasarımı',
  $desc12$
Amerikan yol kültürünün en tanınan simgelerinden biri olan Route 66 tabelasını metal aksesuar formuna taşıyan bu kolye, seyahat ve özgür yol hikâyelerinden ilham alan retro bir tasarıma sahiptir. Kalkan biçimli tabela figürü, üst bölümdeki ROUTE yazısı ve merkezdeki büyük 66 rakamıyla kaynak tasarımın belirgin karakterini doğrudan yansıtır.

Route 66'nın Retro Yol Estetiği

Route 66 motifi; uzun yolculuklar, klasik otomobiller, motosiklet kültürü ve keşif duygusuyla ilişkilendirilen ikonik bir görsel öğedir. Bu modelde tabelanın koyu zeminli iç bölümü ile parlak çelik harf ve rakamlar arasında güçlü bir kontrast oluşturulmuştur. Dış çerçevenin kabartmalı yapısı, figüre gerçek yol tabelasını çağrıştıran belirgin bir siluet kazandırır.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Kalkan biçimli Route 66 yol tabelası
Figür üzerindeki yazı: ROUTE 66
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik çerçeve ve koyu zemin detayları
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: Retro, motosiklet, yol kültürü ve günlük sokak stili

70 cm zincir uzunluğu, tabela figürünün göğüs hizasında belirgin bir noktada durmasını sağlar. 4 mm zincir kalınlığı, madalyon biçimli figürle dengeli bir görünüm oluşturur. Ürün; basic tişört, denim gömlek, sweatshirt ve deri ceket gibi parçalarla kolayca kullanılabilir.

Kombin ve Hediye Önerisi

Siyah, beyaz, antrasit ve denim tonlarıyla eşleştirildiğinde ROUTE 66 detayı ön plana çıkar. Motosiklet sürmeyi sevenler, klasik otomobillere ilgi duyanlar, yolculuk temalı ürünler biriktirenler veya retro Amerikan stilini benimseyenler için dikkat çekici bir aksesuardır. Yol tutkunu sevdiklerin için kişisel bir hediye alternatifi olabilir.

Kullanım ve Bakım Önerileri

Figürün yazılı ve oyuk bölümlerini yumuşak, kuru bir bezle nazikçe temizleyebilirsin. Parfüm, deodorant ve yoğun kimyasal içeren ürünlerle doğrudan temastan kaçınmanı öneririz. Kolyeyi kullanmadığında zinciri dolaşmayacak ve figürü başka takılarla sürtünmeyecek şekilde ayrı saklamak faydalı olur.

ROUTE 66 yazılı retro tabela figürü ve 70 cm zinciriyle bu kolye, yol kültürünün özgür ruhunu günlük stiline taşıyan karakterli bir parçadır.
$desc12$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MN-167-170',
  'Valknut Sembollü 316L Çelik Kolye - 70 cm | İskandinav Temalı Tasarım',
  $desc13$
Birbirine geçen üç üçgenden oluşan Valknut sembolünü dairesel ve bitkisel görünümlü bir çerçeveyle buluşturan bu kolye, İskandinav esintili sembolik takıları sevenler için hazırlanmıştır. Açık işçilikli yapı, figürün arkasındaki kıyafet renginin görünmesine izin verirken parlak çelik çizgilerin daha net ve grafik bir etki oluşturmasını sağlar.

Valknut Sembolünün Geometrik Gücü

Valknut, İskandinav görsel kültürüyle ilişkilendirilen ve birbirine geçen üç üçgen biçiminden oluşan tanınmış bir motiftir. Bu modelde üçgenlerin kesintisiz geçişleri merkezde güçlü bir geometrik odak oluşturur. Figürü çevreleyen asimetrik dal ve yaprak benzeri kabartmalar ise sert geometrik çizgileri daha organik bir çerçeveyle dengeler.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Birbirine geçen üç üçgenli Valknut sembolü
Çerçeve: Dairesel, dal ve yaprak benzeri kabartmalı açık işçilik
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik ve derin bölgelerde koyu detaylar
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: İskandinav, sembolik, alternatif ve minimal-geometrik

70 cm zincir uzunluğu, dairesel figürün göğüs hizasında rahatça görünmesini sağlar. 4 mm zincir kalınlığı ise açık işçilikli madalyonun oranıyla dengeli bir duruş sunar. Figürün geniş ve okunaklı silueti, tek renkli tişört ve sweatshirtlerin üzerinde daha belirgin hale gelir.

Kombin ve Hediye Önerisi

Siyah, beyaz, gri, lacivert ve toprak tonlarındaki kıyafetlerle uyumlu bir görünüm oluşturur. İskandinav motiflerine, geometrik sembollere veya tarihi esintili tasarımlara ilgi duyanlar için karakterli bir aksesuardır. Sembolik ve anlamlı hediye arayanlar için de özgün bir seçenek sunar.

Kullanım ve Bakım Önerileri

Açık işçilikli figürü kullanım sonrasında yumuşak ve kuru bir bezle nazikçe silebilirsin. Ürünü parfüm, deodorant, krem ve yoğun kimyasallarla doğrudan temas ettirmemeni öneririz. Zincirin dolaşmasını ve figürün başka takılara takılmasını önlemek için ayrı bir kutu ya da kesede saklayabilirsin.

Valknut sembolünün keskin geometrisini organik dairesel çerçeveyle birleştiren bu kolye, günlük stiline İskandinav esintili anlamlı ve dikkat çekici bir ayrıntı ekler.
$desc13$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MCN-2-12',
  '5 mm Antrasit 316L Çelik Zincir Kolye - 55 cm | Modern & Güçlü Tasarım',
  $desc14$
Koyu antrasit tonunu belirgin ve dokulu zincir yapısıyla bir araya getiren bu 5 mm çelik zincir kolye, sade kombinlere güçlü ama kontrollü bir aksesuar detayı eklemek isteyenler için hazırlanmıştır. Birbirine geçen açık halkaların oluşturduğu örgülü görünüm, zincirin farklı açılarda değişen metal yansımalarıyla daha hareketli ve derin bir karakter kazanmasını sağlar.

Antrasit Rengin Modern Etkisi

Antrasit ton, klasik parlak çelik görünümünden daha koyu ve daha şehirli bir stil sunar. Halkaların iç ve yan yüzeylerindeki koyu bölgeler ile ışık alan parlak kenarlar arasında oluşan kontrast, zincir örgüsünü belirginleştirir. Bu renk yapısı, hem açık renk kıyafetler üzerinde güçlü bir karşıtlık hem de koyu kombinlerde bütünlüklü bir görünüm oluşturur.

Ürün Özellikleri ve Tasarım Detayları

Materyal: 316L çelik
Ürün tipi: Figürsüz zincir kolye
Zincir kalınlığı: 5 mm
Zincir uzunluğu: 55 cm
Renk: Antrasit
Kilit tipi: Papağan kilit
Kullanım tipi: Tek başına veya farklı uzunluktaki zincirlerle katmanlı kullanım
Stil: Modern, şehirli, günlük ve güçlü

55 cm uzunluk, zincirin boyun çevresinde dengeli ve görünür bir seviyede durmasına yardımcı olur. 5 mm kalınlık ise ince zincirlerden daha belirgin, çok kalın zincirlerden daha ölçülü bir görünüm sunar. Papağan kilit detayı kolyenin pratik biçimde takılıp çıkarılmasını sağlar.

Kombin ve Hediye Önerisi

Basic tişört, açık yakalı gömlek, sweatshirt, triko ve deri ceketlerle kolayca eşleştirilebilir. Tek başına kullanıldığında zincirin dokusu ön plana çıkar; farklı uzunluktaki daha ince bir zincirle birlikte kullanıldığında katmanlı bir görünüm elde edilebilir. Koyu metal aksesuarları sevenler için zamansız bir hediye seçeneğidir.

Kullanım ve Bakım Önerileri

Ürünü parfüm, deodorant, krem, deniz suyu ve havuz kloruyla uzun süreli temastan uzak tutmanı öneririz. Kullanım sonrasında yumuşak ve kuru bir bezle silmek, halkaların yüzeyini temiz tutmaya yardımcı olur. Zinciri dolaşmayacak ve başka takılarla sürtünmeyecek biçimde ayrı saklayabilirsin.

5 mm dengeli kalınlığı, 55 cm kullanım ölçüsü ve modern antrasit görünümüyle bu zincir, günlük stilini tek ve güçlü bir aksesuarla tamamlar.
$desc14$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MN-167-142',
  'Dambıl Figürlü 316L Çelik Kolye - 70 cm | Fitness Temalı Tasarım',
  $desc15$
Spor ve fitness tutkusunu günlük stile taşıyan bu dambıl figürlü çelik kolye, antrenman yaşamını yalnızca spor salonunda değil aksesuar seçiminde de yansıtmak isteyenler için hazırlanmıştır. Küçük yatay dambıl figürü, iki taraftaki katmanlı ağırlık plakaları, merkez barı ve koyu oyuk çizgileriyle gerçek bir ağırlık ekipmanının karakteristik görünümünü kompakt bir takı formunda sunar.

Fitness Tutkusunu Yansıtan Figür

Dambıl, düzenli çalışma, disiplin ve kişisel gelişim temalarını çağrıştıran güçlü bir spor sembolüdür. Bu modelde figür yatay konumda kullanılmış; iki taraftaki plaka katmanları ve merkez barı simetrik biçimde tasarlanmıştır. Parlak çelik yüzey ile plakalar arasındaki koyu çizgiler, figürün küçük ayrıntılarını daha görünür hale getirir.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Yatay dambıl
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik ve koyu oyuk detayları
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: Fitness, spor, günlük ve modern erkek aksesuarı

70 cm zincir uzunluğu, dambıl figürünün göğüs hizasında görünür bir noktada durmasını sağlar. 4 mm zincir, figürün kompakt yapısıyla dengeli bir görünüm oluşturur. Uzun zincirli form; tişört, sweatshirt ve spor üstleri üzerinde rahatça kullanılabilir.

Kombin ve Hediye Önerisi

Spor giyim, basic tişört, oversize sweatshirt ve günlük sokak stili parçalarıyla kolayca eşleştirilebilir. Vücut geliştirme, ağırlık antrenmanı veya genel fitness ile ilgilenenler için kişisel bir aksesuar seçeneğidir. Spor tutkunu bir arkadaşına, antrenörüne ya da hedeflerine bağlılığını simgeleyen bir hediye aradığın kişiye uygun ve anlamlı bir alternatif olabilir.

Kullanım ve Bakım Önerileri

Ürünü parfüm, deodorant, krem ve yoğun kimyasal içeren ürünlerle doğrudan temas ettirmemeni öneririz. Antrenman sonrasında ter ve nem kalıntısını yumuşak, kuru bir bezle silerek kolyeyi kuru biçimde saklayabilirsin. Zincirin dolaşmaması ve figürün diğer takılarla sürtünmemesi için ayrı bir kutu veya kesede muhafaza etmek faydalı olur.

Kompakt dambıl figürü, 70 cm uzun zinciri ve detaylı metal görünümüyle bu kolye, fitness tutkusunu günlük stilinde taşımanın sade ve karakterli bir yolunu sunar.
$desc15$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
)
on conflict ("SKU") do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  discount_price = excluded.discount_price,
  category = excluded.category;

commit;

select "SKU", name, price, category, stock
from public.products
where "SKU" in (
  'MN-167-191',
  'MN-167-174',
  'MN-167-170',
  'MCN-2-12',
  'MN-167-142'
)
order by "SKU";
