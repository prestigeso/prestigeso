import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Vercel'in bu işlem için tanıdığı süreyi maksimuma çekiyoruz
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = body.url || 'https://prestigeso.com'; 

    console.log(`📡 Bağlanılıyor (Işık Hızı Modu): ${url}`);

    // Puppeteer yerine doğrudan hızlı bir HTTP isteği (Fetch) atıyoruz
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      cache: 'no-store' // Eski veriyi getirmemesi için önbelleği kapatıyoruz
    });

    if (!response.ok) {
      throw new Error(`Siteye ulaşılamadı. Status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const products: any[] = [];

    console.log("🔍 Sayfa kodları analiz ediliyor...");

    const productSelectors = [
      '.product', '.product-item', '.item', 
      '.card', '.product-card', '.grid-item', 
      'li.product', 'div[class*="product"]'
    ];

    let selectedContainer = '';
    for (const selector of productSelectors) {
      if ($(selector).length > 0) {
        selectedContainer = selector;
        break;
      }
    }

    if (!selectedContainer) {
      return NextResponse.json({ error: 'Ürünlerin HTML yapısı (class) bulunamadı.' }, { status: 404 });
    }

    // VERİLERİ TOPLA
    $(selectedContainer).each((i, el) => {
      const title = $(el).find('h2, h3, .name, .title, .product-title, .woocommerce-loop-product__title').first().text().trim();
      
      let priceText = $(el).find('.price, .amount, .money, .current-price, ins .amount').first().text().trim();
      const price = parseFloat(priceText.replace(/[^0-9,.]/g, '').replace(',', '.'));

      // LAZY LOAD ÇÖZÜCÜ: Sayfa kaydırılmadığı için asıl resimler data-src veya data-lazy-src içindedir.
      let image = $(el).find('img').attr('data-src') || 
                  $(el).find('img').attr('data-lazy-src') || 
                  $(el).find('img').attr('srcset')?.split(' ')[0] || 
                  $(el).find('img').attr('src');
      
      const link = $(el).find('a').attr('href');
      
      // Ürün açıklaması
      const description = $(el).find('.description, .short-description, .summary').text().trim() || 
                          "Sezonun en trend parçalarından biri. Kaliteli dokusu ve modern kesimiyle tarzınızı yeniden keşfedin. Stoklar tükenmeden sepetinize ekleyin.";

      if (title && title.length > 2) { 
        products.push({
          id: i + 1,
          name: title,
          price: isNaN(price) ? 0 : price,
          category: "PrestigeSO",
          description: description,
          image: image?.startsWith('http') ? image : (image ? `https://prestigeso.com${image}` : 'https://via.placeholder.com/400x500?text=Resim+Yok'),
          original_link: link?.startsWith('http') ? link : `https://prestigeso.com${link}`
        });
      }
    });

    console.log(`🎉 Toplam ${products.length} ürün bulundu.`);

    return NextResponse.json({ success: true, count: products.length, products });

  } catch (error: any) {
    console.error("Hata:", error);
    return NextResponse.json({ error: 'Vercel API Hatası.', details: error.message }, { status: 500 });
  }
}