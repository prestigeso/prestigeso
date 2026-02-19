import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = body.url || 'https://prestigeso.com'; 

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - Site erişimimizi engelliyor olabilir.`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const products: any[] = [];

    // TÜRKİYE'DEKİ E-TİCARET ALTYAPILARI EKLENDİ (IdeaSoft, Ticimax vb.)
    const productSelectors = [
      '.urun-kutu', '.vitrin-urun', '.pr-item', '.ProductList .item', 
      '.product', '.product-item', '.item', 
      '.card', '.product-card', '.grid-item', 
      'li.product', 'div[class*="product"]', '.product-details'
    ];

    let selectedContainer = '';
    for (const selector of productSelectors) {
      if ($(selector).length > 0) {
        selectedContainer = selector;
        break;
      }
    }

    if (!selectedContainer) {
      // HTML'in başını gönderelim ki site bize boş sayfa mı atıyor görelim
      const snippet = html.substring(0, 300);
      return NextResponse.json({ 
        error: 'Ürün kutularının ismi (class) bulunamadı.', 
        details: `Sitenin bize verdiği kodun başı: ${snippet}...` 
      }, { status: 404 });
    }

    $(selectedContainer).each((i, el) => {
      const title = $(el).find('h2, h3, h4, .name, .title, .product-title, .urun-adi').first().text().trim();
      let priceText = $(el).find('.price, .amount, .money, .current-price, ins .amount, .urun-fiyat').first().text().trim();
      const price = parseFloat(priceText.replace(/[^0-9,.]/g, '').replace(',', '.'));

      let image = $(el).find('img').attr('data-src') || 
                  $(el).find('img').attr('data-lazy-src') || 
                  $(el).find('img').attr('srcset')?.split(' ')[0] || 
                  $(el).find('img').attr('src');
      
      const link = $(el).find('a').attr('href');
      const description = $(el).find('.description, .short-description, .summary').text().trim();

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

    if (products.length === 0) {
       return NextResponse.json({ 
        error: `Kutu bulundu (${selectedContainer}) ama içi boş.`, 
        details: 'İsim veya fiyat etiketleri uyuşmuyor.' 
      }, { status: 404 });
    }

    return NextResponse.json({ success: true, count: products.length, products });

  } catch (error: any) {
    return NextResponse.json({ error: 'Bağlantı Hatası veya Engelleme.', details: error.message }, { status: 500 });
  }
}