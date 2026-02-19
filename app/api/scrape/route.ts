import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

// Vercel'e bu işlemin biraz sürebileceğini söylüyoruz
export const maxDuration = 60;

export async function POST(request: Request) {
  let browser;
  try {
    const body = await request.json();
    const url = body.url || 'https://prestigeso.com'; 

    console.log(`📡 Hayalet Tarayıcı ile Bağlanılıyor: ${url}`);

    // Güvenlik duvarını (403) aşmak için gerçek tarayıcı açıyoruz
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled' // Bot olduğumuzu gizler
      ]
    });

    const page = await browser.newPage();
    
    // Cloudflare vb. sistemleri kandırmak için tam bir insan taklidi
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
    });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Timeout yememek için 'networkidle2' yerine daha hızlı olan 'domcontentloaded' kullanıyoruz
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

    const content = await page.content();
    const $ = cheerio.load(content);
    const products: any[] = [];

    // TÜRKİYE'DEKİ E-TİCARET ALTYAPILARI (WooCommerce, Ticimax vb.)
    const productSelectors = [
      '.product', '.product-item', '.item', 
      '.card', '.product-card', '.grid-item', 
      'li.product', 'div[class*="product"]', '.urun-kutu'
    ];

    let selectedContainer = '';
    for (const selector of productSelectors) {
      if ($(selector).length > 0) {
        selectedContainer = selector;
        break;
      }
    }

    if (!selectedContainer) {
      await browser.close();
      return NextResponse.json({ error: 'Ürün kodları (class) bulunamadı.' }, { status: 404 });
    }

    // VERİLERİ TOPLA
    $(selectedContainer).each((i, el) => {
      const title = $(el).find('h2, h3, h4, .name, .title, .product-title, .woocommerce-loop-product__title').first().text().trim();
      let priceText = $(el).find('.price, .amount, .money, .current-price, ins .amount').first().text().trim();
      const price = parseFloat(priceText.replace(/[^0-9,.]/g, '').replace(',', '.'));

      let image = $(el).find('img').attr('data-src') || 
                  $(el).find('img').attr('data-lazy-src') || 
                  $(el).find('img').attr('src');
      
      const link = $(el).find('a').attr('href');
      const description = $(el).find('.description, .short-description').text().trim();

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

    await browser.close();
    return NextResponse.json({ success: true, count: products.length, products });

  } catch (error: any) {
    if (browser) await browser.close();
    return NextResponse.json({ error: 'Tarayıcı Başlatılamadı veya Zaman Aşımı.', details: error.message }, { status: 500 });
  }
}