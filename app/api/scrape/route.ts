// src/app/api/scrape/route.ts
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    // 1. Hedef Site: Prestigeso.com (veya istekten gelen url)
    const body = await request.json();
    const url = body.url || 'https://prestigeso.com'; 

    console.log(`📡 Bağlanılıyor: ${url}`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Gerçek kullanıcı taklidi yap
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36');

    // Siteye git ve yüklenmesini bekle
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Sayfanın HTML'ini al
    const content = await page.content();
    const $ = cheerio.load(content);
    const products: any[] = [];

    console.log("🔍 Ürünler taranıyor...");

    // 2. AKILLI SEÇİCİLER (Genel E-Ticaret Yapıları)
    // Çoğu sitede ürünler bu class'lardan birinin içindedir.
    const productSelectors = [
      '.product', '.product-item', '.item', 
      '.card', '.product-card', '.grid-item', 
      'li.product', 'div[class*="product"]'
    ];

    // Sayfada hangi yapının olduğunu bulmaya çalış
    let selectedContainer = '';
    for (const selector of productSelectors) {
      if ($(selector).length > 0) {
        selectedContainer = selector;
        console.log(`✅ Yapı bulundu: ${selector}`);
        break;
      }
    }

    if (!selectedContainer) {
      await browser.close();
      return NextResponse.json({ error: 'Ürünlerin HTML yapısı (class) bulunamadı. Lütfen siteyi inceleyip bana class ismini söyle.' }, { status: 404 });
    }

    // 3. VERİLERİ TOPLA
    $(selectedContainer).each((i, el) => {
      // Başlık Bul (h2, h3 veya .name, .title)
      const title = $(el).find('h2, h3, .name, .title, .product-title, .woocommerce-loop-product__title').first().text().trim();
      
      // Fiyat Bul (.price, .amount, .money)
      let priceText = $(el).find('.price, .amount, .money, .current-price, ins .amount').text().trim();
      // Temizlik: "1.250,00 TL" -> 1250
      const price = parseFloat(priceText.replace(/[^0-9,.]/g, '').replace(',', '.'));

      // Resim Bul (img src)
      let image = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
      
      // Link Bul
      const link = $(el).find('a').attr('href');

      if (title && title.length > 2) { // Boş başlıkları atla
        products.push({
          id: i + 1,
          name: title,
          price: isNaN(price) ? 0 : price,
          category: "PrestigeSO",
          image: image?.startsWith('http') ? image : `https://prestigeso.com${image}`, // Link tam değilse tamamla
          original_link: link?.startsWith('http') ? link : `https://prestigeso.com${link}`
        });
      }
    });

    await browser.close();
    console.log(`🎉 Toplam ${products.length} ürün bulundu.`);

    return NextResponse.json({ success: true, count: products.length, products });

  } catch (error: any) {
    console.error("Hata:", error);
    return NextResponse.json({ error: 'Siteye erişilemedi veya yapı çok farklı.', details: error.message }, { status: 500 });
  }
}