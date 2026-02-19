import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = body.url || 'https://prestigeso.com'; 

    console.log(`📡 Bağlanılıyor: ${url}`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36');

    // domcontentloaded yerine networkidle2 kullandık ki arka plandaki yüklemeler de bitsin
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log("📜 Daha fazla ürün için sayfa aşağı kaydırılıyor (Beyin Nakli Devrede)...");
    
    // AKILLI KAYDIRMA (LAZY LOAD ÇÖZÜCÜ)
    // Bot, sayfayı yavaşça aşağı doğru kaydırarak gizli ürünlerin yüklenmesini tetikler
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 500; // Her adımda inilecek piksel
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          // Sayfa sonuna geldiysek veya çok fazla indiysek durdur
          if (totalHeight >= scrollHeight || totalHeight > 15000) {
            clearInterval(timer);
            resolve();
          }
        }, 400); // 400ms bekleyerek in ki site bot sanıp engellemesin
      });
    });

    const content = await page.content();
    const $ = cheerio.load(content);
    const products: any[] = [];

    console.log("🔍 Ürünler taranıyor...");

    const productSelectors = [
      '.product', '.product-item', '.item', 
      '.card', '.product-card', '.grid-item', 
      'li.product', 'div[class*="product"]'
    ];

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
      return NextResponse.json({ error: 'Ürünlerin HTML yapısı (class) bulunamadı.' }, { status: 404 });
    }

    // VERİLERİ TOPLA
    $(selectedContainer).each((i, el) => {
      const title = $(el).find('h2, h3, .name, .title, .product-title, .woocommerce-loop-product__title').first().text().trim();
      
      let priceText = $(el).find('.price, .amount, .money, .current-price, ins .amount').text().trim();
      const price = parseFloat(priceText.replace(/[^0-9,.]/g, '').replace(',', '.'));

      // Resim bulucu güçlendirildi (Lazy Load kullanan siteler data-src kullanır)
      let image = $(el).find('img').attr('data-src') || 
                  $(el).find('img').attr('data-lazy-src') || 
                  $(el).find('img').attr('src');
      
      const link = $(el).find('a').attr('href');
      
      // EKSTRA DETAY: Eğer ürün kartında kısa açıklama, marka vs. varsa onu da al
      const description = $(el).find('.description, .short-description, .summary').text().trim() || "Detaylı açıklama ürün sayfasındadır.";

      if (title && title.length > 2) { 
        products.push({
          id: i + 1,
          name: title,
          price: isNaN(price) ? 0 : price,
          category: "PrestigeSO",
          description: description,
          image: image?.startsWith('http') ? image : `https://prestigeso.com${image}`,
          original_link: link?.startsWith('http') ? link : `https://prestigeso.com${link}`
        });
      }
    });

    await browser.close();
    console.log(`🎉 Toplam ${products.length} ürün bulundu.`);

    return NextResponse.json({ success: true, count: products.length, products });

  } catch (error: any) {
    console.error("Hata:", error);
    return NextResponse.json({ error: 'Sistem hatası veya API zaman aşımı.', details: error.message }, { status: 500 });
  }
}