begin;

-- Kategori yoksa oluşturulur; varsa hiçbir mevcut kayda dokunulmaz.
insert into public.categories (name, slug)
values ('Erkek Kolye', 'erkek-kolye')
on conflict do nothing;

-- Yalnızca henüz eklenmemiş SKU'lar eklenir.
-- Görseller sonradan yükleneceği için image/images alanları başlangıçta boştur.
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
  'MN-167-135',
  'Uluyan Kurt ve Diş Uçlu 316L Çelik Kolye - 70 cm | Vahşi Doğa Temalı Tasarım',
  $desc16$
Uluyan kurt figürünü uzun diş ucu siluetiyle bir araya getiren bu çelik kolye, vahşi doğadan ilham alan güçlü ve karakterli aksesuarları sevenler için tasarlanmıştır. Figürün üst bölümünde yer alan kurt başı ve aşağı doğru uzanan diş formu, tek parçada hem hayvan figürü hem de keskin bir sembol etkisi oluşturur. Parlak çelik yüzeyler ile oyuklardaki koyu ayrıntılar, figürün yüz hatlarını ve kürk dokusunu daha belirgin hale getirir.

Vahşi Doğadan İlham Alan Bir Siluet

Kurt; özgürlük, dayanıklılık ve sürü bilinci gibi kavramlarla ilişkilendirilen güçlü bir hayvan figürüdür. Bu modelde yukarı yönelen kurt duruşu, aşağıdaki uzun diş ucu formuyla dengelenerek dikey ve dikkat çekici bir siluet elde edilmiştir. Detaylı işlenen baş bölümü ve figürün çevresindeki kabartmalar, kolyeye küçük ölçüsüne rağmen heykelsi bir karakter kazandırır.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Uluyan kurt ve diş ucu formu
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik ve koyu eskitme görünümlü ayrıntılar
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: Vahşi doğa, alternatif, gotik ve günlük sokak stili

70 cm zincir uzunluğu, uzun diş ucu figürünün göğüs hizasında rahatça görünmesini sağlar. 4 mm zincir kalınlığı, figürün dikey formunu dengeler ve tek başına kullanıldığında da belirgin bir görünüm sunar. Siyah, antrasit, bordo, koyu yeşil ve denim tonlarıyla kolayca eşleştirilebilir.

Kombin ve Bakım Önerileri

Basic tişört, deri ceket, sweatshirt ve açık yakalı gömleklerle güçlü bir görünüm oluşturur. Hayvan figürlü takıları, kurt sembolizmini veya alternatif metal aksesuarları sevenler için özgün bir hediye seçeneğidir. Kullanım sonrasında yumuşak, kuru bir bezle silmen; parfüm, deodorant, deniz suyu ve havuz kloruyla uzun süreli temastan kaçınman önerilir. Zincirin dolaşmaması için ürünü ayrı bir kutu ya da kesede saklayabilirsin.

Detaylı kurt figürü, uzun diş ucu formu ve 70 cm zinciriyle bu kolye günlük stile vahşi doğadan ilham alan güçlü bir odak noktası ekler.
$desc16$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MN-167-117',
  'Mızrak Ucu Figürlü 316L Çelik Kolye - 70 cm | Savaşçı Temalı Tasarım',
  $desc17$
Keskin mızrak ucu siluetini kabartmalı metal detaylarla birleştiren bu çelik kolye, savaşçı ve tarihsel esintili aksesuarları sevenler için hazırlanmıştır. Uzun, dengeli ve aşağı doğru incelen form; figürün göğüs hizasında belirgin görünmesini sağlarken üst bölümdeki halkalı ve kabartmalı detaylar tasarıma karakter katar. Parlak yüzeyler ile oyuk bölümlerdeki koyu tonlar, figürün çizgilerini daha okunaklı hale getirir.

Savaşçı Ruhlu Metal Tasarım

Mızrak figürü; kararlılık, yön duygusu ve mücadele temalarını çağrıştıran zamansız bir semboldür. Bu modelde mızrak ucu yalnızca düz bir geometrik form olarak bırakılmamış, sap ve bağlantı kısmındaki kabartmalarla daha zengin bir görünüm kazanmıştır. Dikey yapı, sade kıyafetlerin üzerinde net bir odak oluşturur; figürün ince oranı ise kolyeyi günlük kullanıma uygun tutar.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Kabartmalı mızrak ucu
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik ve koyu oyuk detayları
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: Savaşçı, tarihi esintili, alternatif ve günlük

70 cm zincir uzunluğu, uzun mızrak figürünün tişört, sweatshirt ve triko üzerinde rahatça seçilmesini sağlar. 4 mm zincir, figürün ince ve dikey yapısıyla dengeli bir bütün oluşturur. Siyah, gri, lacivert, kahverengi ve toprak tonlarındaki kombinlerle metal detay daha belirgin hale gelir.

Kombin ve Bakım Önerileri

Sade tişört, denim gömlek, deri ceket ve kapalı yakalı üstlerle birlikte güçlü ama abartısız bir aksesuar etkisi yaratır. Tarihsel sembollere, fantastik evrenlere veya savaşçı temalı tasarımlara ilgi duyanlar için kişisel bir hediye alternatifi olabilir. Ürünü kullanım sonrasında kuru ve yumuşak bir bezle silmen; parfüm, deodorant ve yoğun kimyasallarla doğrudan temastan kaçınman önerilir.

Kabartmalı mızrak ucu figürü ve uzun zincirli yapısıyla bu kolye, günlük stile savaşçı ruhlu ve net bir metal ayrıntı ekler.
$desc17$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MN-167-115',
  'Viking Kanadı Figürlü 316L Çelik Kolye - 70 cm | İskandinav Esintili Tasarım',
  $desc18$
Katmanlı tüy çizgileri ve aşağı doğru kıvrılan kanat formuyla öne çıkan bu çelik kolye, İskandinav esintili figürlü aksesuarları sevenler için tasarlanmıştır. Kanadın üst bölümündeki belirgin tüy kabartmaları, uçlara doğru incelen kıvrımlı yapı ve koyu oyuklar; figüre hareketli, heykelsi ve detaylı bir görünüm kazandırır. Tekli kanat silueti, simetrik olmayan formuyla klasik kolye uçlarından ayrılır.

İskandinav Esintili Kanat Motifi

Kanat figürü; özgürlük, hareket ve yolculuk kavramlarını çağrıştıran evrensel bir görsel öğedir. Bu modelde kanat, çizgisel ve kabartmalı tüy detayları sayesinde daha sert ve metalik bir karakter kazanır. Parlak çelik yüzeylerle koyu gölgeli alanlar arasındaki kontrast, özellikle farklı ışık açılarında figürün katmanlı yapısını öne çıkarır.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Katmanlı tüy detaylı tekli Viking kanadı
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik ve koyu kabartma ayrıntıları
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: İskandinav, alternatif, gotik ve günlük sokak stili

70 cm zincir uzunluğu, kıvrımlı kanat figürünün göğüs hizasında rahatça görünmesini sağlar. 4 mm zincir, figürün detaylı ama dengeli oranını tamamlar. Siyah, beyaz, gri, bordo ve koyu mavi parçalarla birlikte kullanıldığında metal yüzeyler daha belirgin bir kontrast oluşturur.

Kombin ve Bakım Önerileri

Minimal bir tişörtün üzerinde tek başına kullanılabileceği gibi deri ceket, denim gömlek ve sweatshirtlerle de alternatif bir stil oluşturur. İskandinav temalarına, kanat motiflerine veya detaylı metal aksesuarlara ilgi duyanlar için anlamlı bir hediye seçeneğidir. Kolyeyi yumuşak, kuru bir bezle temizlemen; nem, parfüm ve yoğun kimyasallarla uzun süreli temastan uzak tutman önerilir.

Katmanlı kanat figürü ve 70 cm zinciriyle bu kolye, günlük kombinlere İskandinav esintili özgün bir hareket katar.
$desc18$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MN-167-104',
  'İsa Figürlü Haç 316L Çelik Kolye - 70 cm | İnanç Temalı Tasarım',
  $desc19$
Klasik haç formunu merkezdeki İsa figürüyle birleştiren bu çelik kolye, inancını günlük stilinde taşımak isteyenler için hazırlanmıştır. Düz ve dengeli haç gövdesi, figürün etrafında sakin bir çerçeve oluştururken çapraz kolların uçlarındaki hafif kabartmalar tasarıma derinlik kazandırır. Parlak çelik yüzey ile koyu oyuk çizgiler, figürün detaylarının daha net görünmesine yardımcı olur.

Zamansız Haç Formu

Haç, yüzyıllardır kişisel inancı ve aidiyeti ifade etmek için kullanılan en bilinen sembollerden biridir. Bu modelde sembol, sade geometrik yapısıyla korunmuş; merkezdeki figür ve yüzey kabartmaları sayesinde daha detaylı ve üç boyutlu bir görünüm elde edilmiştir. Dengeli oranı sayesinde günlük kullanımda öne çıkarken gösterişli bir etki yaratmadan anlamını korur.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: İsa figürlü klasik haç
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik ve koyu kabartma ayrıntıları
Kullanım tipi: Günlük, kişisel ve hediye kullanımı
Stil: Klasik, sembolik ve sade erkek aksesuarı

70 cm zincir uzunluğu, haç figürünün göğüs hizasında rahatça görünmesini sağlar. 4 mm zincir kalınlığı, kolye ucunun oranıyla dengeli bir bütün oluşturur. Beyaz, siyah, lacivert, gri ve toprak tonlarındaki kıyafetlerle sade ve uyumlu bir görünüm verir.

Kombin ve Bakım Önerileri

Basic tişört, gömlek, triko ve sweatshirtlerle tek başına kullanılabilir. Dini sembol taşıyan, kişisel anlamı olan veya zamansız metal aksesuar arayan sevdiklerin için düşünülmüş bir hediye alternatifi olabilir. Ürünü yumuşak, kuru bir bezle silmen; parfüm, deodorant, deniz suyu ve havuz kloruyla uzun süreli temastan kaçınman önerilir.

İsa figürlü haç tasarımı ve 70 cm zinciriyle bu kolye, kişisel stile anlamlı ve zamansız bir ayrıntı ekler.
$desc19$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MN-167-49',
  'Ejderha Figürlü 316L Çelik Kolye - 70 cm | Mitolojik Tasarım',
  $desc20$
Kıvrımlı gövdesi, keskin baş formu ve akıcı çizgileriyle ejderha siluetini taşıyan bu çelik kolye, mitolojik ve fantastik temalı aksesuarları sevenler için hazırlanmıştır. Açık işçilikli yapı sayesinde figürün iç boşlukları kıyafet rengiyle kontrast oluşturur; parlak çelik çizgiler ise ejderhanın hareketli siluetini daha belirgin hale getirir. İnce ama karakterli form, kolyeyi günlük kullanım için dengeli bir seçenek haline getirir.

Mitolojik Ejderha Estetiği

Ejderha figürü, farklı kültürlerde güç, koruma, bilgelik ve dönüşüm gibi kavramlarla ilişkilendirilen güçlü bir görsel semboldür. Bu modelde figürün başı, kıvrılan gövdesi ve kanadı andıran çizgileri tek parçada okunaklı bir siluet oluşturur. Yüzeydeki kabartmalar ve koyu detaylar, metal figürün farklı açılarda derinlik kazanmasına yardımcı olur.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Açık işçilikli ejderha silueti
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik ve koyu oyuk ayrıntıları
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: Mitolojik, fantastik, alternatif ve günlük

70 cm zincir uzunluğu, kıvrımlı ejderha figürünün göğüs hizasında net biçimde görünmesini sağlar. 4 mm zincir, figürün ince çizgili yapısıyla dengeli bir duruş sunar. Siyah, koyu gri, bordo ve koyu mavi tonlarıyla kullanılan kombinlerde metal detay daha güçlü bir etki yaratır.

Kombin ve Bakım Önerileri

Deri ceket, denim gömlek, basic tişört ve sade sweatshirtlerle kolayca eşleştirilebilir. Fantastik hikâyelere, oyun dünyalarına, mitolojik sembollere veya ejderha figürlerine ilgi duyanlar için özgün bir hediye seçeneğidir. Kolyeyi nemli ortamlarda uzun süre bırakmamanı, kullanım sonrasında kuru bir bezle silmeni ve diğer takılarla sürtünmeyecek şekilde saklamanı öneririz.

Akıcı ejderha silueti ve 70 cm zinciriyle bu kolye, günlük stiline mitolojik ve dikkat çekici bir metal detay ekler.
$desc20$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MN-167-46',
  'Kafatası ve Ahtapot Figürlü 316L Çelik Kolye - 70 cm | Gotik Denizci Tasarımı',
  $desc21$
Kafatası formunu kıvrılan ahtapot kollarıyla birleştiren bu çelik kolye, denizci gotik estetiğini sevenler için hazırlanmış güçlü bir figür tasarımıdır. Göz çukurları, alın çizgileri ve ağız bölümündeki kabartmalar kafatası siluetini belirginleştirirken aşağıya ve yanlara yayılan tentaküller figüre hareketli bir yapı kazandırır. Parlak çelik yüzeylerle koyu oyukların kontrastı, küçük ayrıntıların farklı ışıklarda daha net görünmesini sağlar.

Denizci Gotik Temanın Karakteri

Kafatası ve ahtapot birlikteliği; deniz efsaneleri, okyanus gizemi ve alternatif metal estetiğini bir araya getiren dikkat çekici bir görsel dildir. Bu modelde tentaküllerin kıvrımlı yapısı sert kafatası formunu dengeler; ortaya hem organik hem de heykelsi görünen bir kolye ucu çıkar. Figürlü aksesuarlar içinde daha karakterli bir odak noktası arayanlar için güçlü bir seçenektir.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Kafatası ve ahtapot tentakülleri
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik ve koyu eskitme görünümlü ayrıntılar
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: Gotik, denizci, alternatif ve fantastik

70 cm zincir uzunluğu, ayrıntılı figürün göğüs hizasında rahatça görünmesini sağlar. 4 mm zincir kalınlığı, kolye ucunun görsel ağırlığıyla dengeli bir bütünlük kurar. Siyah, antrasit, koyu mavi, bordo ve denim tonlarıyla eşleştirildiğinde figürün koyu detayları daha belirgin hale gelir.

Kombin ve Bakım Önerileri

Deri ceket, oversize tişört, sweatshirt ve koyu tonlu gömleklerle alternatif bir görünüm oluşturur. Deniz temalı figürlere, gotik aksesuarlara veya fantastik tasarımlara ilgi duyan sevdiklerin için özgün bir hediye seçeneğidir. Figürün kabartmalı yüzeylerini yumuşak, kuru bir bezle temizlemen; parfüm, krem, deniz suyu ve havuz kloruyla doğrudan temastan kaçınman önerilir.

Kafatası ve kıvrımlı tentakül detaylarını bir araya getiren bu kolye, günlük stile denizci gotik karakteri güçlü bir biçimde taşır.
$desc21$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MN-167-41',
  'At Başı Figürlü 316L Çelik Kolye - 70 cm | Özgür Ruhlu Tasarım',
  $desc22$
Yandan görünümüyle işlenen at başı figürünü sade ve akıcı metal çizgilerle buluşturan bu çelik kolye, özgür ruhlu ve zamansız hayvan motifli aksesuarları sevenler için hazırlanmıştır. Yele, kulak, göz ve burun çizgilerindeki kabartmalar figürün at siluetini ilk bakışta okunaklı hale getirirken parlak yüzeyler tasarıma temiz bir metal görünüm kazandırır. Dengeli oranı sayesinde günlük kullanımda rahatlıkla öne çıkar.

Özgürlüğü Çağrıştıran At Figürü

At; hareket, özgürlük, sadakat ve güç duygularıyla ilişkilendirilen güçlü bir hayvan sembolüdür. Bu modelde baş figürü profilden işlenmiş; yeledeki çizgiler ve yüz hatlarındaki koyu gölgeler sayesinde derinlikli bir görünüm elde edilmiştir. Sade silueti, figürün yalnızca özel günlerde değil günlük kombinlerde de rahatça kullanılmasına olanak tanır.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Yandan görünüşlü at başı
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik ve koyu kabartma ayrıntıları
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: Hayvan figürlü, klasik, günlük ve özgür ruhlu

70 cm zincir uzunluğu, at başı figürünün göğüs hizasında belirgin bir konumda durmasını sağlar. 4 mm zincir, figürün ölçülü formuyla dengeli bir görünüm oluşturur. Beyaz, siyah, kahverengi, lacivert ve denim tonlu kıyafetlerle kolayca eşleştirilebilir.

Kombin ve Bakım Önerileri

Basic tişört, gömlek, triko ve denim ceketlerle sade ama anlamlı bir metal detay oluşturur. At sevgisi olanlar, binicilik temasını sevenler veya hayvan figürlü takıları tercih edenler için kişisel bir hediye alternatifi olabilir. Ürünü kullanım sonrasında kuru bir bezle silmeni; parfüm, deodorant, yoğun kimyasallar ve klorlu suyla uzun süreli temastan uzak tutmanı öneririz.

Akıcı at başı silueti ve 70 cm zinciriyle bu kolye, günlük stiline özgür ve zamansız bir karakter ekler.
$desc22$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MN-166-7',
  'Kelt Desenli Aslan Madalyon 316L Çelik Kolye - 70 cm | Güç ve Asalet Temalı Tasarım',
  $desc23$
Merkezdeki kabartmalı aslan başını dairesel madalyon formu ve örgü görünümlü çerçeve detaylarıyla birleştiren bu çelik kolye, güçlü hayvan sembollerini sevenler için hazırlanmıştır. Aslanın yelesi, bakışları ve yüz hatları katmanlı kabartmalarla belirginleştirilirken madalyonun alt bölümündeki dekoratif desenler tasarıma tarihsel ve zengin bir görünüm kazandırır. Yuvarlak form, figürü göğüs hizasında net ve dengeli bir odak noktasına dönüştürür.

Aslanın Güçlü ve Asil Sembolizmi

Aslan figürü, farklı kültürlerde cesaret, liderlik ve asalet kavramlarıyla ilişkilendirilen en tanınmış hayvan motiflerinden biridir. Bu modelde aslan başı, dairesel çerçevenin içinde öne çıkarılmış; çevresindeki örgü ve kıvrımlı detaylar metal yüzeyde derinlik oluşturacak biçimde işlenmiştir. Parlak yüzeyler ile koyu oyuklar arasındaki kontrast, yele çizgilerinin ve göz çevresinin daha belirgin görünmesini sağlar.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Kabartmalı aslan başı ve dairesel madalyon
Çerçeve: Örgü görünümlü dekoratif desenler
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik ve koyu kabartma ayrıntıları
Stil: Sembolik, klasik, hayvan figürlü ve günlük

70 cm zincir uzunluğu, madalyonun göğüs hizasında rahatça görünmesini sağlar. 4 mm zincir, dairesel figürün geniş formuyla dengeli bir duruş sunar. Siyah, beyaz, gri, lacivert ve toprak tonlarıyla kullanılan kombinlerde aslan figürü daha belirgin bir metal odak haline gelir.

Kombin ve Bakım Önerileri

Sade tişört, açık yakalı gömlek, triko ve deri ceketlerle tek başına kullanılabilir. Aslan sembolünü, madalyon formunu veya tarihsel görünümlü metal aksesuarları sevenler için anlamlı ve gösterişli bir hediye seçeneğidir. Figürün kabartmalı yüzeyini yumuşak, kuru bir bezle temizlemen; ürünün parfüm, deodorant, deniz suyu ve yoğun kimyasallarla uzun süreli temasından kaçınman önerilir.

Kabartmalı aslan başı, dekoratif madalyon çerçevesi ve 70 cm zinciriyle bu kolye, günlük stile güçlü ve asil bir ayrıntı ekler.
$desc23$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MN-167-206',
  'Uçan Kartal Figürlü 316L Çelik Kolye - 70 cm | Özgürlük Temalı Tasarım',
  $desc24$
Kanatlarını iki yana açmış uçan kartal siluetini taşıyan bu çelik kolye, özgürlük ve güç temalı figürlü aksesuarları sevenler için hazırlanmıştır. Kartalın açık kanatları, öne uzanan başı ve aşağı yönelen pençe detayları figüre hareket hissi verir. Tüy çizgilerindeki kabartmalar ile parlak çelik yüzeyler arasındaki kontrast, figürün farklı açılarda daha detaylı görünmesini sağlar.

Uçuş ve Özgürlükten İlham Alan Tasarım

Kartal; keskin görüşü, yüksekten uçuşu ve güçlü duruşuyla özgürlük temasını çağrıştıran en bilinen hayvan figürlerinden biridir. Bu modelde kuş figürü sabit bir madalyon içinde değil, açık kanatlı dinamik bir siluet olarak ele alınmıştır. Bu sayede kolye ucu, sade kıyafetlerin üzerinde daha hareketli ve dikkat çekici bir metal detay oluşturur.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Kanatları açık uçan kartal
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik ve koyu tüy detayları
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: Hayvan figürlü, özgür ruhlu, günlük ve alternatif

70 cm zincir uzunluğu, geniş kanatlı kartal figürünün göğüs hizasında rahatça görünmesini sağlar. 4 mm zincir, figürün yatay genişliğiyle dengeli bir görünüm oluşturur. Siyah, beyaz, antrasit, lacivert ve denim tonlarıyla birleştiğinde parlak çelik yüzey daha belirgin hale gelir.

Kombin ve Bakım Önerileri

Basic tişört, kapüşonlu sweatshirt, deri ceket ve denim gömleklerle güçlü bir aksesuar etkisi yaratır. Kartal figürlerine, özgürlük temalı tasarımlara veya detaylı metal işçiliğe ilgi duyanlar için dikkat çekici bir hediye seçeneğidir. Kullanım sonrasında ürünü kuru bir bezle silmeni ve nemli ortamlarda uzun süre bırakmamanı öneririz.

Açık kanatlı kartal figürü ve 70 cm zinciriyle bu kolye, günlük stiline özgür ve dinamik bir metal ayrıntı ekler.
$desc24$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MN-167-137',
  'Aslan Başı Figürlü 316L Çelik Kolye - 70 cm | Güç ve Cesaret Temalı Tasarım',
  $desc25$
Yoğun yele kabartmaları, doğrudan bakan yüz ifadesi ve aşağı doğru uzanan güçlü siluetiyle dikkat çeken bu aslan başı figürlü çelik kolye, cesaret ve liderlik temalı aksesuarları sevenler için hazırlanmıştır. Figürün göz, burun ve yele çizgileri oyuklarla ayrıştırılmış; parlak çelik yüzeyler ile koyu detaylar arasındaki kontrast sayesinde yüz hatları daha belirgin hale getirilmiştir. Dikey formu, kolyeyi tek başına kullanıldığında dahi güçlü bir odak noktası yapar.

Aslan Başının Karakterli Duruşu

Aslan başı, hayvan figürlü takılar içinde güçlü duruşu ve net siluetiyle öne çıkan klasik bir motiftir. Bu modelde yele parçaları başın çevresinde katmanlı biçimde işlenmiş, çene ve yüz hatları ise figüre daha heykelsi bir ifade kazandırmıştır. Ayrıntılı yapı, sade bir kombine dahi kişisel ve karakterli bir metal detay ekler.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Kabartmalı aslan başı
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik ve koyu oyuk detayları
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: Güç temalı, hayvan figürlü, klasik ve günlük

70 cm zincir uzunluğu, aslan başı figürünün göğüs hizasında belirgin bir konumda durmasını sağlar. 4 mm zincir, figürün yoğun kabartmalı yapısıyla dengeli bir bütün oluşturur. Siyah, gri, beyaz, koyu yeşil ve kahverengi tonlardaki kıyafetlerle birlikte güçlü bir kontrast yaratır.

Kombin ve Bakım Önerileri

Tişört, gömlek, triko, denim ve deri ceketlerle kolayca eşleştirilebilir. Aslan sembolünü, cesaret temalı figürleri veya detaylı metal takıları sevenler için kişisel bir hediye seçeneğidir. Kullanım sonrasında yumuşak ve kuru bir bezle silmen; kolyeyi parfüm, deodorant, deniz suyu ve yoğun kimyasallarla uzun süreli temas ettirmemen önerilir.

Detaylı yele kabartmaları ve 70 cm zinciriyle bu kolye, günlük stile güç ve cesaret çağrıştıran belirgin bir aksesuar dokunuşu ekler.
$desc25$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MN-167-69',
  'Kurt Başlı Diş Figürlü 316L Çelik Kolye - 70 cm | Vahşi ve Özgün Tasarım',
  $desc26$
Kabartmalı kurt başını aşağı doğru uzanan kıvrımlı diş formuyla buluşturan bu çelik kolye, vahşi doğa temalı ve alternatif metal aksesuarları sevenler için hazırlanmıştır. Üst bölümdeki kurt başı, göz ve kürk çizgilerindeki koyu ayrıntılarla belirginleşirken alt bölümdeki uzun diş silueti figüre keskin ve dinamik bir yön verir. İki farklı formun tek parçada birleşmesi, tasarımı klasik hayvan figürlü kolyelerden ayırır.

Kurt ve Diş Formunun Güçlü Birleşimi

Kurt figürü bağımsızlık, dayanıklılık ve güçlü bir duruşla; diş formu ise vahşi doğanın ham karakteriyle ilişkilendirilir. Bu modelde kurt başı figürün görsel ağırlığını üst bölümde toplarken kıvrımlı diş ucu aşağı doğru dengeli bir uzantı oluşturur. Kabartmalı yüzeylerdeki parlak ve koyu bölgeler, figürün ayrıntılarını farklı ışıklarda daha görünür hale getirir.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Kurt başı ve kıvrımlı diş ucu
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik ve koyu eskitme görünümlü ayrıntılar
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: Vahşi doğa, alternatif, gotik ve günlük sokak stili

70 cm zincir uzunluğu, uzun figürün göğüs hizasında rahatça görünmesini sağlar. 4 mm zincir kalınlığı, kurt başı ve diş formunun dengeli biçimde öne çıkmasına yardımcı olur. Siyah, antrasit, kahverengi, bordo ve denim tonlarıyla bir araya geldiğinde metal detay daha belirgin bir görünüm oluşturur.

Kombin ve Bakım Önerileri

Basic tişört, deri ceket, oversize sweatshirt ve denim gömleklerle birlikte kullanılabilir. Kurt sembolizmine, hayvan figürlü takılara veya gotik metal aksesuarlara ilgi duyanlar için özgün bir hediye seçeneğidir. Ürünü kullanım sonrasında kuru bir bezle silmeni; parfüm, krem, deniz suyu ve havuz kloruyla uzun süreli temastan uzak tutmanı öneririz. Figürün diğer takılarla sürtünmemesi için ayrı saklamak faydalı olur.

Kabartmalı kurt başı ve kıvrımlı diş ucu formuyla bu kolye, günlük stiline vahşi ve özgün bir metal karakter kazandırır.
$desc26$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
)
on conflict ("SKU") do nothing;

commit;

-- Çalıştırdıktan sonra yalnızca bu 11 SKU'nun eklendiğini doğrula.
select "SKU", name, price, discount_price, category, stock, image, images
from public.products
where "SKU" in (
  'MN-167-135',
  'MN-167-117',
  'MN-167-115',
  'MN-167-104',
  'MN-167-49',
  'MN-167-46',
  'MN-167-41',
  'MN-166-7',
  'MN-167-206',
  'MN-167-137',
  'MN-167-69'
)
order by "SKU";
