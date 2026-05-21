import { NextResponse, type NextRequest } from "next/server";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from "@/lib/adminAuth";

// Vercel'e bu işlemin biraz sürebileceğini söylüyoruz
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;

  try {
    const adminSecret = (process.env.ADMIN_COOKIE_SECRET ?? "").trim();
    const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? "";

    const authed = adminSecret
      ? await verifyAdminSessionCookie(adminSecret, cookieValue)
      : false;

    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({} as any));
    const url = body.url || "https://prestigeso.com";

    console.log(`📡 Hayalet Tarayıcı ile Bağlanılıyor: ${url}`);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    const content = await page.content();
    const $ = cheerio.load(content);
    const products: any[] = [];

    const productSelectors = [
      ".product",
      ".product-item",
      ".item",
      ".card",
      ".product-card",
      ".grid-item",
      "li.product",
      'div[class*="product"]',
      ".urun-kutu",
    ];

    let selectedContainer = "";

    for (const selector of productSelectors) {
      if ($(selector).length > 0) {
        selectedContainer = selector;
        break;
      }
    }

    if (!selectedContainer) {
      await browser.close();
      browser = undefined;

      return NextResponse.json(
        { error: "Ürün kodları (class) bulunamadı." },
        { status: 404 }
      );
    }

    $(selectedContainer).each((i, el) => {
      const title = $(el)
        .find(
          "h2, h3, h4, .name, .title, .product-title, .woocommerce-loop-product__title"
        )
        .first()
        .text()
        .trim();

      const priceText = $(el)
        .find(".price, .amount, .money, .current-price, ins .amount")
        .first()
        .text()
        .trim();

      const price = parseFloat(
        priceText.replace(/[^0-9,.]/g, "").replace(",", ".")
      );

      const image =
        $(el).find("img").attr("data-src") ||
        $(el).find("img").attr("data-lazy-src") ||
        $(el).find("img").attr("src");

      const link = $(el).find("a").attr("href");
      const description = $(el)
        .find(".description, .short-description")
        .text()
        .trim();

      if (title && title.length > 2) {
        products.push({
          id: i + 1,
          name: title,
          price: Number.isNaN(price) ? 0 : price,
          category: "PrestigeSO",
          description,
          image: image?.startsWith("http")
            ? image
            : image
            ? `https://prestigeso.com${image}`
            : "https://via.placeholder.com/400x500?text=Resim+Yok",
          original_link: link?.startsWith("http")
            ? link
            : link
            ? `https://prestigeso.com${link}`
            : null,
        });
      }
    });

    await browser.close();
    browser = undefined;

    return NextResponse.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error: any) {
    if (browser) {
      await browser.close();
    }

    return NextResponse.json(
      {
        error: "Tarayıcı Başlatılamadı veya Zaman Aşımı.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}