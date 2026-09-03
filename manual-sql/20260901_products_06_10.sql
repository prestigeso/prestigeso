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
  'MN-167-226',
  'Halat Detaylı Çapa Figürlü 316L Çelik Kolye - 70 cm | Denizci Temalı Tasarım',
  $desc06$
Denizci stilinin en tanınan sembollerinden birini güçlü metal işçiliğiyle buluşturan bu halat detaylı çapa kolye, sade kombinlere karakterli bir odak noktası eklemek isteyenler için hazırlanmıştır. Çapanın gövdesini ve kollarını çevreleyen kabartmalı halat dokusu, figüre klasik denizcilik aksesuarlarından ilham alan daha zengin ve üç boyutlu bir görünüm kazandırır.

Çapa Figürünün Güçlü Karakteri

Çapa sembolü denizcilik kültüründe sağlam duruş, kararlılık ve bağlılık temalarıyla ilişkilendirilir. Bu modelde çapanın kolları, sivri uçları, orta gövdesi ve üst bölümündeki halat sarımı belirgin biçimde işlenmiştir. Parlak çelik yüzey ile oyuk bölgelerdeki koyu eskitme etkisinin oluşturduğu kontrast, figürün küçük detaylarını daha görünür hale getirir.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Halat detaylı çapa
Zincir kalınlığı: 3 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik ve koyu eskitme detayları
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: Denizci, günlük, alternatif ve modern erkek aksesuarı

70 cm zincir uzunluğu, çapa figürünün göğüs hizasında görünür bir noktada durmasını sağlar. 3 mm zincir yapısı ise figürün ön plana çıkmasına yardımcı olur. Uzun zincirli formu sayesinde kolye; tişört, sweatshirt, triko ve açık gömlek gibi farklı üstlerle rahatlıkla eşleştirilebilir.

Kombin ve Hediye Önerisi

Siyah, beyaz, lacivert ve toprak tonlarındaki kıyafetlerle dengeli bir görünüm oluşturur. Denizcilik temasını sevenler, çapa sembolüne anlam yükleyenler veya standart zincirler yerine figürlü bir aksesuar tercih edenler için güçlü bir seçenektir. Deniz, yolculuk ve özgürlük temalarına ilgi duyan sevdiklerin için de anlamlı bir hediye alternatifi olabilir.

Kullanım ve Bakım Önerileri

Ürünü parfüm, deodorant, krem ve yoğun kimyasal içeren ürünlerle doğrudan temas ettirmemeni öneririz. Deniz veya havuz sonrasında yumuşak ve kuru bir bezle silerek saklayabilirsin. Kullanmadığın zamanlarda zincirin dolaşmaması ve figürün diğer aksesuarlarla sürtünmemesi için ayrı bir kutu ya da kesede muhafaza edebilirsin.

Halat dokusuyla zenginleştirilen çapa figürü ve 70 cm uzun zinciriyle bu kolye, günlük stiline denizci ruhu taşıyan güçlü ve anlamlı bir detay ekler.
$desc06$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MN-167-223',
  'ANKH Antik Mısır Sembollü 316L Çelik Kolye - 70 cm | Tarihi & Özgün Tasarım',
  $desc07$
Antik Mısır sanatının en tanınan formlarından biri olan ANKH sembolünü modern çelik takı anlayışıyla bir araya getiren bu kolye, tarihi motifleri günlük stilinde taşımak isteyenler için hazırlanmıştır. Üst bölümündeki halka, yatay kolları ve uzun dikey gövdesiyle karakteristik ANKH siluetini koruyan figür; merkezindeki göz biçimli detayla daha katmanlı ve dikkat çekici bir görünüm kazanır.

ANKH Sembolünün Tasarım Dili

ANKH motifi Antik Mısır görsel kültüründe yaşam ve süreklilik kavramlarıyla ilişkilendirilen tarihi bir simgedir. Bu kolyede sembolün klasik formu, parlak çelik yüzey ve koyu oyuk detaylarıyla belirginleştirilmiştir. Merkezdeki göz biçimli bölüm, kıvrımlı çizgiler ve küçük koyu taş görünümü tasarıma mistik ve özgün bir karakter katar.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: ANKH Antik Mısır sembolü ve göz biçimli merkez detayı
Zincir kalınlığı: 3 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik, koyu oyuklar ve siyah merkez detayı
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: Tarihi, sembolik, alternatif ve modern

70 cm uzunluğundaki zincir, figürün göğüs hizasında belirgin biçimde görünmesini sağlar. 3 mm zincir kalınlığı, kolye ucunun detaylı yapısını gölgelemeyen dengeli bir görünüm sunar. Ürün; kapalı yakalı tişörtler, düz sweatshirtler, gömlekler ve koyu tonlu üstlerle kolayca kombinlenebilir.

Kombin ve Hediye Önerisi

Antik uygarlıklara, sembolik takılara ve mistik tasarım diline ilgi duyanlar için karakterli bir aksesuar seçeneğidir. Siyah ve beyaz gibi düz renklerin üzerinde figür daha görünür hale gelir; deri veya sade çelik bilekliklerle birlikte kullanıldığında alternatif stil etkisi güçlenir. Tarihi motiflerden hoşlanan sevdiklerin için kişisel ve dikkat çekici bir hediye alternatifi olabilir.

Kullanım ve Bakım Önerileri

Kolyeyi parfüm, deodorant, krem ve benzeri kozmetik ürünlerle doğrudan temas ettirmemeni öneririz. Kullanım sonrasında yumuşak ve kuru bir bezle silmek, figürün oyuk bölümlerinde biriken yüzey kalıntılarını azaltmaya yardımcı olur. Zinciri dolaşmayacak biçimde, kolye ucunu ise diğer takılarla sürtünmeyecek şekilde ayrı saklayabilirsin.

ANKH sembolünün tarihi siluetini modern 316L çelik yapıyla buluşturan bu kolye, stiline anlamlı ve özgün bir vurgu eklemek için tasarlanmıştır.
$desc07$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MCN-15-11',
  'Dişli Çark Figürlü Katmanlı 316L Çelik Kolye - 45–50 cm | Endüstriyel Tasarım',
  $desc08$
Mekanik ayrıntılardan ve endüstriyel tasarım dilinden ilham alan bu dişli çark figürlü katmanlı kolye, klasik tek zincir görünümünden ayrılan özgün bir yapıya sahiptir. Farklı kalınlıklardaki zincirlerin birlikte kullanılması ve merkezdeki açık işçilikli çark figürü, ürüne hareketli, teknik ve modern bir karakter kazandırır.

Katmanlı Zincir Yapısı

Kolye tasarımında farklı dokulara ve kalınlıklara sahip zincir bölümleri bir araya gelir. İnce zincirlerin merkezdeki figüre yönelmesi, daha belirgin halkalı bölümün ise boyun çevresindeki yapıyı tamamlaması görsel olarak katmanlı bir etki oluşturur. Bu yapı, ayrıca birden fazla kolye takmadan tek ürünle zengin bir aksesuar görünümü elde etmeyi sağlar.

Dişli Çarkın Endüstriyel Estetiği

Merkezdeki dairesel figür, çevresindeki dişler ve iç bölümündeki geometrik boşluklarla mekanik bir çark görünümü taşır. Açık işçilik, figürün arkasındaki kıyafet renginin görünmesine izin vererek tasarımın çizgilerini belirginleştirir. Çark formu; üretim, hareket ve mekanik tasarım temalarını sevenler için dikkat çekici bir görsel detaydır.

Ürün Özellikleri ve Tasarım Detayları

Materyal: 316L çelik
Figür: Açık işçilikli dişli çark
Zincir uzunluğu: Yaklaşık 45–50 cm
Zincir kalınlıkları: Tasarımın farklı bölümlerinde 3 mm, 4 mm ve 5 mm
Uzatma zinciri: 5 cm ayarlanabilir ince zincir
Kilit tipi: Papağan kilit
Kullanım tipi: Tek parça halinde katmanlı görünüm
Stil: Endüstriyel, modern, alternatif ve şehirli

Ayarlanabilir uzunluk, kolyenin farklı yaka biçimleriyle kullanılmasına yardımcı olur. Daha kısa konumda boyun çevresinde belirgin bir görünüm elde edilebilir; uzatma zinciri kullanıldığında figür biraz daha aşağıda konumlandırılabilir.

Kombin ve Hediye Önerisi

Basic tişörtler, oversize gömlekler, deri ceketler ve sade sweatshirtlerle birlikte kullanıldığında çark figürü ve katmanlı zincir yapısı ön plana çıkar. Mekanik tasarımlara, motosiklet kültürüne veya steampunk estetiğine ilgi duyanlar için özgün bir hediye seçeneği olabilir.

Kullanım ve Bakım Önerileri

Farklı zincir bölümlerinin dolaşmaması için kolyeyi açık ve düzgün biçimde saklamanı öneririz. Parfüm ve kozmetik ürünlerle doğrudan temas ettirmemek, kullanım sonrası kuru bezle silmek ve ayrı bir kesede muhafaza etmek ürünün temiz görünümünü korumaya yardımcı olur.

Katmanlı zincir yapısı ile dişli çark figürünü bir araya getiren bu kolye, günlük stile teknik ve sıra dışı bir karakter kazandırır.
$desc08$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MN-167-208',
  'Kartal Başı Figürlü 316L Çelik Kolye - 60 cm | Güçlü & Özgün Tasarım',
  $desc09$
Kartalın keskin bakışını ve güçlü profilini üç boyutlu metal işçiliğiyle öne çıkaran bu kartal başı kolye, figürlü aksesuarları sevenler için karakterli bir tasarım sunar. Kavisli gaga, göz çevresindeki derin oyuklar ve tüyleri andıran kabartmalı çizgiler, kolye ucuna farklı açılardan incelenebilen heykelsi bir görünüm kazandırır.

Kartal Figürünün Etkileyici Duruşu

Kartal figürü farklı kültürlerde güç, özgürlük ve kararlılık temalarıyla ilişkilendirilir. Bu modelde kuşun başı yandan profil biçiminde tasarlanmış; gaga ve tüy detayları parlak yüzeylerle, derin bölgeler ise koyu eskitme etkisiyle ayrıştırılmıştır. Figürün asimetrik ve organik silueti, standart yuvarlak kolye uçlarından daha özgün bir görünüm oluşturur.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Üç boyutlu kartal başı profili
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 60 cm
Renk görünümü: Parlak çelik ve koyu oyuk detayları
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: Güçlü, sembolik, alternatif ve günlük

60 cm zincir uzunluğu, kolye ucunun üst göğüs bölgesinde görünür ve dengeli bir noktada durmasını sağlar. 4 mm zincir ise figürün hacimli görünümüyle uyumlu bir kalınlık sunar. Ürün, sade üstlerin üzerinde daha belirgin görünür ve tek başına kullanıldığında kombin içindeki ana aksesuar haline gelir.

Kombin ve Hediye Önerisi

Siyah, antrasit, beyaz ve koyu yeşil tonlu kıyafetlerle kolayca eşleştirilebilir. Deri ceket, denim gömlek, basic tişört veya sweatshirt kombinlerinde güçlü bir vurgu oluşturur. Kartal sembolüne ilgi duyanlar, özgürlüğü çağrıştıran tasarımları sevenler veya üç boyutlu figürlü takılar tercih edenler için anlamlı bir hediye seçeneğidir.

Kullanım ve Bakım Önerileri

Figürün kabartmalı yüzeyini kullanım sonrasında yumuşak ve kuru bir bezle nazikçe silebilirsin. Ürünü parfüm, deodorant, krem, deniz suyu ve havuz kloruyla uzun süreli temastan uzak tutmanı öneririz. Zincirin dolaşmaması için kolyeyi kapalı ve ayrı biçimde saklamak faydalı olur.

Keskin kartal profili, detaylı metal dokusu ve 60 cm dengeli zinciriyle bu kolye, stiline güçlü ve özgün bir sembol ekler.
$desc09$,
  1000.00,
  0.00,
  'Erkek Kolye',
  0,
  false,
  null,
  array[]::text[]
),
(
  'MN-167-202',
  'Yuvarlak Kartal Madalyon 316L Çelik Kolye - 70 cm | Güçlü & Modern Tasarım',
  $desc10$
Kartal figürünü yuvarlak bir madalyon formunda sunan bu 316L çelik kolye, sembolik tasarımla geometrik metal işçiliğini bir araya getirir. Madalyonun bir bölümünü dolduran kartal profili, diğer bölümdeki tekrarlayan çizgisel desen ve çevresindeki halat benzeri çerçeveyle dengeli, güçlü ve ayrıntılı bir kompozisyon oluşturur.

Kartal ve Geometrinin Buluşması

Kartal figürü tasarım dünyasında güç, özgürlük ve kararlılık temalarıyla sıkça ilişkilendirilir. Bu modelde kartalın başı ve tüyleri kabartmalı biçimde işlenmiş, madalyonun karşı bölümüne ise yıldız ve ağ görünümünü çağrıştıran geometrik çizgiler eklenmiştir. Parlak yüzeyler ile koyu oyukların kontrastı, figürün ve arka plan deseninin okunabilirliğini artırır.

Ürün Özellikleri ve Tasarım Detayları

Materyal: Zincir ve figür 316L çelik
Figür: Yuvarlak madalyon içerisinde kartal başı ve geometrik zemin
Zincir kalınlığı: 4 mm
Zincir uzunluğu: 70 cm
Renk görünümü: Parlak çelik ve koyu eskitme detayları
Kullanım tipi: Tek başına odak aksesuar olarak kullanım
Stil: Sembolik, modern, alternatif ve güçlü

70 cm zincir uzunluğu, yuvarlak madalyonun göğüs hizasında belirgin şekilde görünmesini sağlar. 4 mm zincir kalınlığı ise madalyonun görsel ağırlığıyla uyumlu bir duruş sunar. Uzun zincir formu sayesinde kolye, kapalı yakalı tişörtler ve sweatshirtler üzerinde rahatlıkla kullanılabilir.

Kombin ve Hediye Önerisi

Sade siyah veya beyaz tişörtlerle kullanıldığında madalyonun karmaşık yüzey detayları öne çıkar. Denim, deri ve koyu tonlu üstlerle birlikte daha sert bir stil; düz gömlek ve trikolarla ise daha dengeli bir görünüm oluşturulabilir. Kartal figürünü sevenler veya güçlü semboller taşıyan aksesuarları tercih edenler için dikkat çekici bir hediye alternatifidir.

Kullanım ve Bakım Önerileri

Madalyonun oyuk ve kabartmalı bölümlerini yumuşak, kuru bir bezle nazikçe temizleyebilirsin. Parfüm, deodorant ve yoğun kimyasal içeren ürünlerle doğrudan temastan kaçınmanı öneririz. Kolyeyi kullanmadığında zinciri dolaşmayacak ve figürü başka takılara sürtünmeyecek biçimde ayrı saklayabilirsin.

Yuvarlak madalyon formu, güçlü kartal profili ve geometrik arka planıyla bu kolye, günlük stiline ayrıntılı ve karakterli bir odak noktası kazandırır.
$desc10$,
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
  'MN-167-226',
  'MN-167-223',
  'MCN-15-11',
  'MN-167-208',
  'MN-167-202'
)
order by "SKU";
