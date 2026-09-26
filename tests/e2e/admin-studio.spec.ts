import {test,expect} from '@playwright/test';
import {createAdminSessionCookie,ADMIN_COOKIE_NAME} from '../../lib/adminAuth';
import {buildAnalyticsReport} from '../../lib/analytics/report';
import {buildProfitReport} from '../../lib/finance/profit-report';

test('profit report shows coverage and VAT inclusive platform draft',async({page},info)=>{
 await page.route('**/api/admin/trendyol/**',r=>r.fulfill({status:503,json:{error:'Sentetik testte sağlayıcı isteği kapalı.'}}));
 const settings={vatBps:2000,commissionBps:1500,shippingMinor:13000,packagingMinor:0,logisticsMinor:0,giftThresholdMinor:0,giftCostMinor:0,hiddenBps:1000,advertisingBps:0};
 const profiles=[{platform:'store' as const,version:1,effective_from:'2026-01-01T00:00:00Z',settings}];
 const period={since:Date.parse('2026-09-23T21:00:00Z'),until:Date.parse('2026-09-26T21:00:00Z')};
 const report={...buildProfitReport([{id:'TEST-1',platform:'store',at:'2026-09-24T10:00:00Z',amount:650,eligible:true,goods:20000},{id:'TEST-2',platform:'trendyol',at:'2026-09-24T10:00:00Z',amount:650,eligible:true,goods:null}],profiles),returns:{count:1,debtMinor:80000,covered:true,salesCovered:true,archiveCovered:true},period};
 await page.route('**/api/admin/finance/profit?**',r=>r.fulfill({json:report}));
 await page.route('**/api/admin/finance/profit-settings',r=>r.fulfill({json:{profiles}}));
 const metaEntries:Record<string,unknown>[]=[];
 await page.route('**/api/admin/finance/manual-meta',r=>{if(r.request().method()==='POST'){const input=r.request().postDataJSON();metaEntries.push({key:input.key,version:1,startDate:input.startDate,endDate:input.endDate,channel:input.channel,amountMinor:1000,note:input.note});return r.fulfill({json:{key:input.key,version:1}});}return r.fulfill({json:{entries:metaEntries}});});
 await open(page,'finance');await page.getByRole('button',{name:'Kâr analizi',exact:true}).click();const region=page.getByRole('region',{name:'Kâr analizi'});
 await expect(region).toContainText('49,17');
 await expect(region).toContainText('1 iade satırı');
 await expect(region).toContainText('800,00');
 await region.getByRole('button',{name:'Kâr ayarlarına git'}).click();
 const config=page.getByRole('region',{name:'Kâr ayarları'});
 await config.getByText('Meta reklam harcaması · elle giriş',{exact:true}).click();
 await config.getByLabel('Başlangıç günü').fill('2026-09-24');
 await config.getByLabel('Bitiş günü (dahil)').fill('2026-09-24');
 await config.getByLabel('Toplam harcama (TL)').fill('10,00');
 await config.getByLabel('Giderin ait olduğu kanal').selectOption('store');
 await config.getByLabel('Kısa açıklama (kişisel veri yazmayın)').fill('Meta sentetik test');
 await config.getByRole('button',{name:'Harcama ekle'}).click();
 await expect(config).toContainText('10,00');
 await config.getByRole('button',{name:'Kayıtlı ayarları forma getir'}).click();
 await config.getByText('Satış öncesi hesaplama denemesi',{exact:true}).click();
 await config.getByLabel('KDV dahil satış fiyatı (TL)',{exact:true}).fill('700');
 await config.getByLabel('Satıcının karşıladığı kupon (TL)',{exact:true}).fill('50');
 await config.getByLabel('KDV dahil toplam ürün maliyeti (TL)',{exact:true}).fill('200');
 await expect(config.locator('[aria-live]')).toContainText('49,17');
 await expect(config.getByRole('button',{name:'Yeni ayar sürümünü kaydet'})).toBeDisabled();
 let saved:Record<string,unknown>|null=null;
 await page.route('**/api/admin/finance/profit-settings',r=>{if(r.request().method()==='POST'){saved=r.request().postDataJSON();return r.fulfill({json:{version:2}});}return r.fulfill({json:{profiles}});});
 await config.getByLabel('Yeni sürümün geçerli olacağı gün').fill('2026-09-20');
 await config.getByRole('checkbox').check();await config.getByRole('button',{name:'Yeni ayar sürümünü kaydet'}).click();
 await expect(config.getByRole('status').filter({hasText:'Sürüm 2 kaydedildi'})).toBeVisible();
 expect(saved).toMatchObject({platform:'store',expectedVersion:1,settings,effectiveFrom:'2026-09-19T21:00:00.000Z'});
 await config.getByLabel('KDV dahil toplam ürün maliyeti (TL)',{exact:true}).fill('');
 await expect(config.locator('[aria-live]')).toContainText('Tüm giderleri');
 await config.screenshot({path:info.outputPath('profit-settings.png')});
 await nav(page,'Finans');
 await region.getByRole('button',{name:'Mağaza',exact:true}).first().click();
 await expect(region).toContainText('39,17');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await region.screenshot({path:info.outputPath('profit-analysis.png')});
 await page.route('**/api/admin/finance/profit?**',r=>r.fulfill({json:{...buildProfitReport([],profiles),returns:{count:0,debtMinor:0,covered:true,salesCovered:true,archiveCovered:true},period}}));
 await region.getByRole('button',{name:'Yenile',exact:true}).click();
 await expect(region.getByText('Hesaplanamadı',{exact:true}).first()).toBeVisible();
 await page.route('**/api/admin/finance/profit?**',r=>r.fulfill({status:503,json:{error:'Sentetik rapor hatası'}}));
 await region.getByRole('button',{name:'Yenile',exact:true}).click();
 await expect(region.getByRole('alert')).toContainText('Sentetik rapor hatası');
 await expect(region).not.toContainText('49,17');
});

test('bulk product options preview category, bestseller and numeric changes together', async ({page}, info) => {
 const products=[{id:81,name:'Test yüzük',SKU:'B81',price:100,stock:5,category:'Yüzük',is_bestseller:false,description:'Test',image:'/logo.jpeg'},{id:82,name:'Test kolye',SKU:'B82',price:200,stock:2,category:'Kolye',is_bestseller:false,description:'Test',image:'/logo.jpeg'}];
 await page.route('**/api/admin/dashboard',r=>r.fulfill({json:{products:[],slides:[],campaigns:[],messages:[],questions:[],orders:[],reviews:[],productMetrics:[],monthlyVisits:0,allVisits:0,categories:[{id:1,name:'Yüzük',slug:'yuzuk'},{id:2,name:'Kolye',slug:'kolye'}],totals:{},counts:{}}}));
 await page.route('**/api/admin/products?**',r=>r.fulfill({json:{products,total:2,outOfStockTotal:0}}));
 const writes:Record<string,unknown>[]=[];
 await page.route('**/api/admin/db',r=>{const b=r.request().postDataJSON();writes.push(b);return r.fulfill({json:{data:[{id:b.filters[0].value}]}});});
 await open(page,'products');
 await page.getByLabel('Test yüzük seç',{exact:true}).check();await page.getByLabel('Test kolye seç',{exact:true}).check();
 await page.getByRole('button',{name:'Toplu işlem (2)',exact:true}).click();
 const panel=page.getByRole('region',{name:'Toplu ürün işlemleri'});
 for(const label of ['Kategori','Stok','Çok satan']) await panel.getByRole('checkbox',{name:label,exact:true}).check();
 await panel.getByRole('combobox',{name:'Kategori yeni değer'}).selectOption('Kolye');
 await panel.getByRole('combobox',{name:'Çok satan yeni değer'}).selectOption('true');
 await panel.getByRole('textbox',{name:'Fiyat yeni değer'}).fill('150,50');
 await panel.getByRole('textbox',{name:'Stok yeni değer'}).fill('12');
 await panel.getByRole('button',{name:'Değişiklikleri önizle'}).click();
 await expect(panel.locator('tbody tr')).toHaveCount(2);expect(writes).toHaveLength(0);
 await expect(panel.locator('tbody')).toContainText('150,50');
 await page.screenshot({path:info.outputPath('bulk-multiple.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await panel.getByRole('button',{name:'Tüm değişiklikleri onayla'}).click();
 await expect(panel).toHaveCount(0);expect(writes).toHaveLength(2);
 expect(writes[0].data).toEqual({category:'Kolye',price:150.5,stock:12,is_bestseller:true});
});

test('bulk cost preserves finance version and deletion needs typed confirmation', async ({page},info) => {
 await page.route('**/api/admin/products?**',r=>r.fulfill({json:{products:[{id:81,name:'Test yüzük',SKU:'B81',price:100,stock:5,category:'Yüzük',description:'Test',image:'/logo.jpeg'}],total:1,outOfStockTotal:0}}));
 const costs:Record<string,unknown>[]=[];let deletions=0;
 await page.route('**/api/admin/phase2/records?**',r=>r.fulfill({json:{records:[{version:7,payload:{amountMinor:3000,taxBasis:'inclusive'}}],truncated:false}}));
 await page.route('**/api/admin/phase2/records',r=>{costs.push(r.request().postDataJSON());return r.fulfill({json:{version:8}});});
 await page.route('**/api/admin/db',r=>{deletions++;return r.fulfill({json:{success:true}});});
 await open(page,'products');await page.getByLabel('Test yüzük seç',{exact:true}).check();await page.getByRole('button',{name:'Toplu işlem (1)',exact:true}).click();
 const panel=page.getByRole('region',{name:'Toplu ürün işlemleri'});
 await panel.getByRole('checkbox',{name:'Fiyat',exact:true}).uncheck();await panel.getByRole('checkbox',{name:'Birim maliyet (KDV dahil)'}).check();await panel.getByRole('textbox',{name:'Birim maliyet (KDV dahil) yeni değer'}).fill('45,75');
 await expect(panel.getByText('Maliyet açıklaması')).toHaveCount(0);
 await panel.getByRole('button',{name:'Değişiklikleri önizle'}).click();await expect(panel.locator('tbody')).toContainText('30,00');expect(costs).toHaveLength(0);
 await page.screenshot({path:info.outputPath('bulk-cost.png'),fullPage:true});
 await panel.getByRole('button',{name:'Tüm değişiklikleri onayla'}).click();await expect(panel).toHaveCount(0);
 expect(costs[0]).toMatchObject({expectedVersion:7,key:'B81',kind:'product_cost',amount:'45,75',taxBasis:'inclusive',note:'Toplu ürün maliyeti güncellemesi'});
 await page.getByLabel('Test yüzük seç',{exact:true}).check();await page.getByRole('button',{name:'Toplu işlem (1)',exact:true}).click();
 await panel.getByRole('checkbox',{name:'Ürünleri sil (ayrı işlem)'}).check();await panel.getByRole('button',{name:'Değişiklikleri önizle'}).click();
 const remove=panel.getByRole('button',{name:'1 ürünü kalıcı sil'});await expect(remove).toBeDisabled();expect(deletions).toBe(0);
 await panel.getByLabel('Onaylamak için SİL yazın').fill('SİL');await remove.click();await expect(panel).toHaveCount(0);expect(deletions).toBe(1);
});

test('bulk failures retain failed selections and reject invalid stock',async({page})=>{
 const products=[81,82].map(id=>({id,name:`Test ürün ${id}`,SKU:`B${id}`,price:100,stock:5,category:'Yüzük',description:'Test',image:'/logo.jpeg'}));
 await page.route('**/api/admin/products?**',r=>r.fulfill({json:{products,total:2,outOfStockTotal:0}}));
 let writes=0;
 await page.route('**/api/admin/db',r=>{writes++;const id=r.request().postDataJSON().filters[0].value;return r.fulfill({status:id===82?409:200,json:id===82?{error:'Çakışma'}:{data:[{id}]}});});
 await open(page,'products');
 await page.getByLabel('Test ürün 81 seç',{exact:true}).check();await page.getByLabel('Test ürün 82 seç',{exact:true}).check();await page.getByRole('button',{name:'Toplu işlem (2)',exact:true}).click();
 const panel=page.getByRole('region',{name:'Toplu ürün işlemleri'});
 await panel.getByRole('checkbox',{name:'Fiyat',exact:true}).uncheck();await panel.getByRole('checkbox',{name:'Stok',exact:true}).check();
 for(const invalid of ['','-1','1.5','1000000001']){await panel.getByRole('textbox',{name:'Stok yeni değer'}).fill(invalid);await expect(panel.getByRole('button',{name:'Değişiklikleri önizle'})).toBeDisabled();}
 expect(writes).toBe(0);
 await panel.getByRole('textbox',{name:'Stok yeni değer'}).fill('4');await panel.getByRole('button',{name:'Değişiklikleri önizle'}).click();await panel.getByRole('button',{name:'Tüm değişiklikleri onayla'}).click();
 await expect(panel).toHaveCount(0);await expect(page.getByLabel('Test ürün 81 seç',{exact:true})).not.toBeChecked();await expect(page.getByLabel('Test ürün 82 seç',{exact:true})).toBeChecked();expect(writes).toBe(2);
});

test('category and inclusive cost share preview; partial cost failure stays selected',async({page})=>{
 const product={id:91,name:'Test ürün 91',SKU:'B91',price:100,stock:5,category:'Yüzük',description:'Test',image:'/logo.jpeg'};
 await page.route('**/api/admin/dashboard',r=>r.fulfill({json:{products:[],slides:[],campaigns:[],messages:[],questions:[],orders:[],reviews:[],productMetrics:[],monthlyVisits:0,allVisits:0,categories:[{id:1,name:'Yüzük'},{id:2,name:'Kolye'}],totals:{},counts:{}}}));
 await page.route('**/api/admin/products?**',r=>r.fulfill({json:{products:[product],total:1,outOfStockTotal:0}}));
 await page.route('**/api/admin/phase2/records?**',r=>r.fulfill({json:{records:[{version:2,payload:{amountMinor:2000,taxBasis:'inclusive'}}],truncated:false}}));
 const updates:Record<string,unknown>[]=[];
 await page.route('**/api/admin/db',r=>{updates.push(r.request().postDataJSON());return r.fulfill({json:{data:[{id:91}]}});});
 await page.route('**/api/admin/phase2/records',r=>r.fulfill({status:503,json:{error:'Sentetik maliyet hatası'}}));
 await open(page,'products');await page.getByLabel('Test ürün 91 seç',{exact:true}).check();await page.getByRole('button',{name:'Toplu işlem (1)'}).click();
 const panel=page.getByRole('region',{name:'Toplu ürün işlemleri'});
 await panel.getByRole('checkbox',{name:'Fiyat',exact:true}).uncheck();
 await panel.getByRole('checkbox',{name:'Kategori',exact:true}).check();await panel.getByRole('checkbox',{name:'Birim maliyet (KDV dahil)'}).check();
 await panel.getByRole('combobox',{name:'Kategori yeni değer'}).selectOption('Kolye');await panel.getByRole('textbox',{name:'Birim maliyet (KDV dahil) yeni değer'}).fill('40');
 await panel.getByRole('button',{name:'Değişiklikleri önizle'}).click();await expect(panel.locator('tbody')).toContainText('Kolye');await expect(panel.locator('tbody')).toContainText('₺40,00');expect(updates).toHaveLength(0);
 await panel.getByRole('button',{name:'Tüm değişiklikleri onayla'}).click();await expect(panel).toHaveCount(0);
 expect(updates[0].data).toEqual({category:'Kolye'});
 await expect(page.getByRole('status').filter({hasText:'maliyet doğrulanamadı'})).toBeVisible();
 await expect(page.getByLabel('Test ürün 91 seç',{exact:true})).toBeChecked();
});

test('product list grows downwards, keeps selections, and resets for new filters',async({page})=>{
 const calls:number[]=[];
 await page.route('**/api/admin/products?**',r=>{
   const url=new URL(r.request().url()),n=Number(url.searchParams.get('page'));calls.push(n);
   const q=url.searchParams.get('q')||'';
   const products=q?[]:Array.from({length:n===1?25:2},(_,i)=>({id:(n-1)*25+i+1,name:`Test ürün ${(n-1)*25+i+1}`,SKU:`B${(n-1)*25+i+1}`,price:100,stock:2,category:'Yüzük',description:'Test',image:'/logo.jpeg'}));
   return r.fulfill({json:{products,total:q?0:27,outOfStockTotal:0}});
 });
 await open(page,'products');await expect(page.getByLabel('Test ürün 1 seç',{exact:true})).toBeVisible();
 await page.getByLabel('Test ürün 1 seç',{exact:true}).check();
 await page.getByRole('button',{name:'Daha fazla ürün göster'}).click();
 await expect(page.getByLabel('Test ürün 27 seç',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Test ürün 1 seç',{exact:true})).toBeChecked();
 await expect(page.getByText('Tüm 27 ürün gösteriliyor.')).toBeVisible();
 expect(calls.slice(0,2)).toEqual([1,2]);
 await page.getByRole('searchbox',{name:'Ürün veya SKU ara'}).fill('yok');
 await expect(page.getByText('Bu filtreye uygun ürün yok.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Toplu işlem (0)'})).toBeDisabled();
});

test('failed next product batch keeps loaded items and can retry',async({page})=>{
 let fail=true;
 await page.route('**/api/admin/products?**',r=>{
  const n=Number(new URL(r.request().url()).searchParams.get('page'));
  if(n===2&&fail)return r.fulfill({status:503,json:{error:'Sentetik sayfa hatası'}});
  return r.fulfill({json:{products:Array.from({length:n===1?25:1},(_,i)=>({id:(n-1)*25+i+1,name:`Test ürün ${(n-1)*25+i+1}`,SKU:`B${(n-1)*25+i+1}`,price:100,stock:2,category:'Yüzük',description:'Test',image:'/logo.jpeg'})),total:26,outOfStockTotal:0}});
 });
 await open(page,'products');await expect(page.getByLabel('Test ürün 1 seç',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Daha fazla ürün göster'}).click();
 await expect(page.getByRole('alert').filter({hasText:'Sentetik sayfa hatası'})).toBeVisible();
 await expect(page.getByLabel('Test ürün 1 seç',{exact:true})).toBeVisible();
 fail=false;await page.getByRole('button',{name:'Yüklemeyi tekrar dene'}).click();
 await expect(page.getByLabel('Test ürün 26 seç',{exact:true})).toBeVisible();
});

test.beforeEach(async({context,page,baseURL})=>{
 test.skip(!baseURL||!['127.0.0.1','localhost'].includes(new URL(baseURL).hostname),'Local fixtures only');
 const secret=process.env.PHASE0_ADMIN_TEST_SECRET;test.skip(!secret,'Local fixture secret required');
 await context.addCookies([{name:ADMIN_COOKIE_NAME,value:await createAdminSessionCookie(secret!),url:baseURL!,httpOnly:true,sameSite:'Lax'}]);
 await page.route('**/api/admin/dashboard',route=>route.fulfill({json:{products:[],slides:[],campaigns:[],categories:[],messages:[],questions:[],orders:[],reviews:[],productMetrics:[],totals:{monthly_order_count:12,monthly_revenue:12000},monthlyVisits:150,allVisits:250,counts:{actionablePayments:2}}}));
 const month=new Date().toISOString().slice(0,7);
 await page.route('**/api/admin/analysis',route=>route.fulfill({json:{orders:[{day:`${month}-01`,order_count:5,revenue:5000},{day:`${month}-02`,order_count:7,revenue:7000}],visits:[{day:`${month}-01`,visit_count:60},{day:`${month}-02`,visit_count:90}]}}));
 await page.route('**/api/admin/customers/summary?**',route=>route.fulfill({json:{total:12,newCustomers:3,series:[{label:'01.09',value:1},{label:'02.09',value:2}]}}));
 await page.route('**/api/admin/lists?**',route=>route.fulfill({json:{items:[],total:0}}));
 await page.route('**/api/admin/trendyol/sync',route=>route.fulfill({json:{complete:true,fresh:true}}));
 await page.route('**/api/admin/trendyol/finance-sync',route=>route.fulfill({json:{complete:true,fresh:true}}));
 await page.route('**/api/admin/trendyol/archive?**',route=>route.fulfill({json:{packages:[],total:0,page:0,totalPages:0,hasNext:false}}));
 await page.route('**/api/admin/phase2/search-console?**',route=>route.fulfill({status:503,json:{error:'Sentetik ortam: bağlantı kapalı.'}}));
 await page.route('**/api/admin/phase2/records?**',route=>route.fulfill({json:{records:[],truncated:false}}));
 const report=buildAnalyticsReport({sessions:[],events:[],orders:[],links:[]},{days:7,device:'all',source:'all',traffic:'normal',audience:'all'});
 await page.route('**/api/admin/analytics?**',route=>route.fulfill({json:{...report,timeline:[],timelineTotal:0}}));
 await page.route('**/api/admin/finance/summary?**',route=>route.fulfill({json:{...report,visits:0,series:report.series.map(r=>({...r,visits:0}))}}));
});

test('all channels share a table, filters work, and a provider failure preserves store orders',async({page},info)=>{
 let fail=false;
 await page.route('**/api/admin/lists?**',route=>route.fulfill({json:{items:[{id:91,order_no:'PS-91',created_at:'2026-09-20T10:00:00Z',status:'Bekliyor',payment_status:'paid',total_amount:1500,shipping_address:{fullName:'Test müşteri'},items:[{name:'Test bileklik',quantity:1,image:'/logo.jpeg'}]}],total:1}}));
 await page.route('**/api/admin/trendyol/archive?**',route=>route.fulfill({status:fail?502:200,json:fail?{error:'Trendyol geçici olarak kullanılamıyor.'}:{page:0,total:2,totalPages:1,hasNext:false,packages:[{packageId:'42',orderNumber:'TY-42',status:'Created',orderDate:Date.parse('2026-09-21T10:00:00Z'),amount:1000,currency:'TRY',lines:[{sku:'Q316',name:'Test kolye',quantity:1}]},{packageId:'43',orderNumber:'TY-43',status:'Delivered',orderDate:Date.parse('2026-09-19T10:00:00Z'),amount:2000,currency:'TRY',lines:[{sku:'Q317',name:'Test yüzük',quantity:1}]}]}}));
 await open(page,'orders');
 const channels=page.getByRole('group',{name:'Satış kanalı'}),table=page.getByRole('region',{name:'Sipariş listesi'});
 await expect(channels.getByRole('button',{name:'Tümü',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Yeni siparişleri kontrol et'}).click();
 await expect(table.getByRole('button',{name:'PS-91'})).toBeVisible();await expect(table.getByRole('button',{name:'TY-42'})).toBeVisible();
 await expect(table.getByRole('button',{name:'TY-43'})).toHaveCount(0);
 await expect(table.locator('tbody tr').first()).toContainText('TY-42');
 await page.screenshot({path:info.outputPath('orders-unified.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('group',{name:'Sipariş durumu'}).getByRole('button',{name:'Tümü',exact:true}).click();
 await expect(table.getByRole('button',{name:'TY-43'})).toBeVisible();
 await channels.getByRole('button',{name:'Mağaza',exact:true}).click();await expect(table.getByRole('button',{name:'TY-42'})).toHaveCount(0);
 await channels.getByRole('button',{name:'Tümü',exact:true}).click();
 fail=true;await page.getByRole('button',{name:'Yeni siparişleri kontrol et'}).click();
 await expect(page.getByRole('alert').filter({hasText:'Trendyol geçici'})).toBeVisible();
 await expect(table.getByRole('button',{name:'PS-91'})).toBeVisible();await expect(table.getByRole('button',{name:'TY-42'})).toBeVisible();
});

test('chart values are selectable and expired sessions have a recovery action',async({page})=>{
 await page.route('**/api/admin/finance/summary?**',route=>route.fulfill({json:{finance:{gross:5000,orders:1},visits:0,series:[{timestamp:Date.now(),gross:5000,orders:1,visits:0}]}}));
 await open(page);
 await expect(page.getByRole('img',{name:'Ciro (₺): günlük performans grafiği'})).toBeVisible();
 await page.getByLabel('Grafikte gün seç').selectOption('0');
 await expect(page.locator('[aria-live="polite"]').filter({hasText:'5.000'})).toBeVisible();
 await page.route('**/api/admin/lists?**',route=>route.fulfill({status:401,json:{error:'Unauthorized'}}));
 await nav(page,'Siparişler');await expect(page.getByRole('alert').filter({hasText:'Oturumunuz'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Yeniden giriş yap'})).toHaveAttribute('href','/admin/login');
});

test('dense chart keeps exact values and real zero available',async({page},info)=>{
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 await page.route('**/api/admin/finance/summary?**',route=>route.fulfill({json:{finance:{gross:33333711,orders:28},visits:0,series:Array.from({length:28},(_,i)=>({timestamp:Date.parse(today+'T12:00:00Z')+(i-27)*86400000,gross:i===0?0:1234567+i,orders:1,visits:0}))}}));
 await open(page);
 await page.getByLabel('Rapor dönemi').selectOption('28');
 await page.getByLabel('Grafikte gün seç').selectOption('0');
 await expect(page.locator('output')).toHaveText('Ciro (₺): 0');
 await page.getByLabel('Grafikte gün seç').selectOption('27');
 await expect(page.locator('[aria-live="polite"]').filter({hasText:'1.234.594'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('dense-chart.png'),fullPage:true});
});
async function open(page:import('@playwright/test').Page,view='overview'){
 await page.goto(`/admin?view=${view}`);
 const consent=page.getByRole('button',{name:'Yalnızca zorunlu',exact:true});
 await consent.click();
}
async function nav(page:import('@playwright/test').Page,name:string){
 const menu=page.getByRole('button',{name:'Menü',exact:true});
 if(await menu.isVisible())await menu.click();
 await page.getByRole('navigation',{name:'Yönetim menüsü'}).getByRole('link',{name,exact:true}).click();
}
test('studio navigation, mobile bounds, and cost draft persistence',async({page},info)=>{
 await open(page);
 await expect(page.getByRole('heading',{name:'PrestigeSO Yönetim Paneli'})).toBeVisible();
 for(const label of ['Ürünler','Siparişler','Müşteriler','Mağaza performansı','Pazarlama','Finans','Ayarlar']){
  await nav(page,label);await expect(page.getByRole('heading',{name:label,exact:true}).first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`${label}-soft.png`),fullPage:true});
 }
 await page.getByRole('button',{name:'Maliyet kayıtları',exact:true}).click();
 await page.getByLabel('Kayıt anahtarı').fill('Q316-draft');
 await nav(page,'Genel bakış');await nav(page,'Ayarlar');
 await expect(page.getByLabel('Kayıt anahtarı')).toHaveValue('Q316-draft');
 await page.screenshot({path:info.outputPath('settings.png'),fullPage:true});
 await nav(page,'Genel bakış');await expect(page.getByRole('img',{name:'Ciro (₺): günlük performans grafiği'})).toBeVisible();await page.screenshot({path:info.outputPath('overview.png'),fullPage:true});
});

test('background cost read keeps editing available and cannot authorize a different key',async({page})=>{
 let release!:()=>void;
 const pending=new Promise<void>(resolve=>{release=resolve;});
 let requested=false;
 await page.route('**/api/admin/phase2/records?**',async route=>{requested=true;await pending;await route.fulfill({json:{records:[],truncated:false}});});
 await open(page,'settings');
 await page.getByRole('button',{name:'Maliyet kayıtları',exact:true}).click();
 await page.getByRole('heading',{name:'Kalıcı maliyet kayıtları & SKU eşleme'}).scrollIntoViewIfNeeded();
 await expect.poll(()=>requested).toBe(true);
 const key=page.getByLabel('Kayıt anahtarı');
 await expect(key).toBeEnabled();
 await key.fill('Q316-draft');
 await page.getByLabel('Kaynak / düzeltme gerekçesi (kişisel veri yazmayın)').fill('Sentetik test');
 release();
 await expect(key).toHaveValue('Q316-draft');
 await expect(page.getByRole('button',{name:'Kaydı kaydet',exact:true})).toBeDisabled();
 await nav(page,'Genel bakış');await nav(page,'Ayarlar');
 await expect(key).toHaveValue('Q316-draft');
});

test('studio quick price update persists without reload and failure restores value',async({page},info)=>{
 let price=1000,fail=false;
 await page.route('**/api/admin/products?**',route=>route.fulfill({json:{products:[{id:247,name:'Fixture ürün',SKU:'T-247',price,stock:10,category:'Erkek Kolye',description:'Test',images:['/logo.jpeg'],image:'/logo.jpeg'}],total:1,outOfStockTotal:0}}));
 await page.route('**/api/admin/db',route=>{if(fail)return route.fulfill({status:503,json:{error:'Kayıt reddedildi'}});price=route.request().postDataJSON().data.price;return route.fulfill({json:{data:[]}});});
 await open(page,'products');const input=page.getByLabel('Fixture ürün fiyat');
 await input.fill('1250');await input.press('Enter');await expect(input).toHaveValue('1250');
 await expect.poll(()=>price).toBe(1250);await expect(input).toBeEnabled();
 fail=true;await input.fill('1400');await input.press('Enter');await expect(input).toHaveValue('1250');
 await page.screenshot({path:info.outputPath('products.png'),fullPage:true});
});
test('studio Trendyol loads automatically, remains read only and preserves archived data on failure',async({page})=>{
 let calls=0,fail=false;
 await page.route('**/api/admin/trendyol/archive?**',route=>{calls++;return route.fulfill({status:fail?502:200,json:fail?{error:'Bağlantı doğrulanamadı.'}:{page:0,total:1,totalPages:1,hasNext:false,packages:[{source:'trendyol',packageId:'42',orderNumber:'TY-42',status:'Created',orderDate:Date.now(),amount:1000,currency:'TRY',lines:[{sku:'Q316',name:'Fixture kolye',quantity:1}]}]}});});
 await open(page,'orders');await page.getByRole('button',{name:'Trendyol',exact:true}).click();
 await expect.poll(()=>calls).toBeGreaterThan(0);await page.getByRole('button',{name:'Yeni siparişleri kontrol et'}).click();
 await page.getByRole('button',{name:/TY-42/}).click();
 await expect(page.getByText('Bu sipariş burada iptal edilemez.',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:/İptal et/i})).toHaveCount(0);
 await page.getByRole('button',{name:'Detayı kapat'}).click();
 fail=true;await page.getByRole('button',{name:'Yeni siparişleri kontrol et'}).click();
 await expect(page.getByRole('alert').filter({hasText:'Bağlantı doğrulanamadı.'})).toBeVisible();
 await expect(page.getByText('TY-42',{exact:true})).toBeVisible();
});
test('studio shipping empty and zero serialize differently',async({page})=>{
 const saved:unknown[]=[];
 await page.route('**/api/admin/site-settings',route=>{saved.push(route.request().postDataJSON());return route.fulfill({json:route.request().postDataJSON()});});
 await open(page,'settings');
 const input=page.getByLabel('Ücretsiz kargo alt limiti');
 await input.fill('');await page.getByRole('button',{name:'Kargo Ayarlarını Kaydet'}).click();
 await expect.poll(()=>saved.length).toBe(1);
 expect(saved[0]).toMatchObject({shipping:{rules_version:2,free_shipping_threshold:null}});
 await input.fill('0');await page.getByRole('button',{name:'Kargo Ayarlarını Kaydet'}).click();
 await expect.poll(()=>saved.length).toBe(2);
 expect(saved[1]).toMatchObject({shipping:{rules_version:2,free_shipping_threshold:0}});
});

test('order row opens accessible shipping, address, invoice and product details',async({page},info)=>{
 await page.route('**/api/admin/trendyol/archive?**',route=>route.fulfill({json:{page:0,total:1,totalPages:1,hasNext:false,packages:[{packageId:'42',orderNumber:'TY-DETAIL',status:'Created',orderDate:Date.now(),amount:1000,currency:'TRY',shipping:{carrier:'Test Kargo',trackingNumber:'000123456789',trackingLink:'https://tracking.trendyol.com/?id=fixture'},deliveryAddress:{name:'Test Alıcı',address:'Sentetik teslimat adresi',city:'İstanbul',district:'Kadıköy',phone:'05000000000'},invoiceNumber:'TEST-FATURA-1',discount:0,history:[{status:'Created',date:Date.now()}],lines:[{sku:'Q316',name:'Detay test ürünü',quantity:2,barcode:'TEST-BARKOD',unitPrice:500}]}]}}));
 await page.route('**/api/admin/trendyol/order-finance?**',route=>route.fulfill({json:{claims:[{claim_id:'00000000-0000-4000-8000-000000000001',original_package_id:'42',claim_date:Date.now(),modified_at:Date.now(),statuses:['Accepted']}],returns:[{transaction_id:'fixture-return-1',package_id:'42',transaction_at:new Date().toISOString(),debt:800,credit:0,commission_amount:180,seller_revenue:620}],lastChecked:new Date().toISOString()}}));
 await open(page,'orders');await page.getByRole('button',{name:'Yeni siparişleri kontrol et'}).click();
 await page.getByRole('region',{name:'Sipariş listesi'}).getByText('Detay test ürünü',{exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Sipariş TY-DETAIL'});await expect(dialog).toBeVisible();
 for(const text of ['000123456789','Test Kargo','Test Alıcı','Sentetik teslimat adresi','TEST-FATURA-1','TEST-BARKOD'])await expect(dialog.getByText(text,{exact:true})).toBeVisible();
 await expect(dialog.getByRole('heading',{name:'İade ve cari hesap'})).toBeVisible();
 await expect(dialog.getByText('fixture-return-1')).toBeVisible();
 await expect(dialog.getByText('800,00 ₺')).toBeVisible();
 await dialog.getByRole('heading',{name:'İade ve cari hesap'}).scrollIntoViewIfNeeded();
 await dialog.screenshot({path:info.outputPath('order-finance.png')});
 await expect(dialog.getByRole('link',{name:'Kargoyu takip et'})).toHaveAttribute('href','https://tracking.trendyol.com/?id=fixture');
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('order-details.png'),fullPage:true});
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
 await page.getByRole('button',{name:'TY-DETAIL',exact:true}).focus();await page.keyboard.press('Enter');await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'Detayı kapat'}).click();await expect(dialog).toHaveCount(0);
});

test('store row opens existing customer and shipping details',async({page})=>{
 await page.route('**/api/admin/lists?**',route=>route.fulfill({json:{items:[{id:91,order_no:'PS-DETAIL',user_email:'fixture@example.invalid',created_at:'2026-09-20T10:00:00Z',status:'Kargolandı',payment_status:'paid',total_amount:1500,shipping_carrier:'Mağaza Test Kargo',tracking_number:'STORE-TRACK-123',shipping_address:{fullName:'Mağaza Test Alıcı'},items:[{name:'Mağaza detay ürünü',quantity:1,price:1500}]}],total:1}}));
 await open(page,'orders');await page.getByRole('region',{name:'Sipariş listesi'}).getByText('Mağaza detay ürünü',{exact:true}).click();
 await expect(page.getByRole('heading',{name:'📦 Sipariş & Kargo Yönetimi'})).toBeVisible();
 await expect(page.getByText('STORE-TRACK-123',{exact:true})).toBeVisible();
 await expect(page.getByText('Mağaza Test Kargo',{exact:true})).toBeVisible();
 await expect(page.getByText('fixture@example.invalid',{exact:true})).toBeVisible();
});

test('studio metric selection and hourly period are interactive',async({page})=>{
 let requestedDays='';
 await page.route('**/api/admin/analytics?**',route=>{
  requestedDays=new URL(route.request().url()).searchParams.get('days')||'7';
  return route.fulfill({json:buildAnalyticsReport({sessions:[],events:[],orders:[],links:[]},{days:Number(requestedDays),device:'all',source:'all',traffic:'normal',audience:'all'})});
 });
 await open(page,'performance');
 await page.getByRole('button',{name:/Sepete ekleyen.*İncelemeden/}).click();
 await expect(page.getByRole('img',{name:'Sepete ekleyen: günlük performans grafiği'})).toBeVisible();
 await page.getByRole('combobox',{name:/Dönem/}).first().selectOption('2');
 await expect.poll(()=>requestedDays).toBe('2');
 await expect(page.getByText('Saatlik değişim',{exact:false})).toBeVisible();
 await page.getByRole('group',{name:'Analiz görünümü'}).getByRole('button',{name:'Ürünler ve dönüşüm'}).click();
 await expect(page.getByRole('img',{name:'Sepete ekleyen: günlük performans grafiği'})).not.toBeVisible();
 await expect(page.getByRole('heading',{name:'En çok ilgi gören ürünler'})).toBeVisible();
});

test('finance supports 90 and 365 day combined reports',async({page},info)=>{
 let requested=0;
 await page.route('**/api/admin/finance/summary?**',route=>{
  requested=Number(new URL(route.request().url()).searchParams.get('days'));
  const report=buildAnalyticsReport({sessions:[],events:[],orders:[],links:[]},{days:requested,device:'all',source:'all',traffic:'normal',audience:'all'});
  return route.fulfill({json:{...report,finance:{orders:33,gross:19817.99,refunds:0,unmeasuredOrders:0}}});
 });
 await open(page,'finance');
 const period=page.getByRole('combobox',{name:'Dönem',exact:true});
 for(const days of ['90','365']){await period.selectOption(days);await expect.poll(()=>requested).toBe(Number(days));await expect(page.getByRole('button',{name:/Satış tutarı.*19.817,99/})).toBeVisible();}
 await expect(page.getByText('Mağaza + Trendyol',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('finance-year.png'),fullPage:true});
});

test('performance and marketing support 90 and 365 day analytics',async({page},info)=>{
 let requested=0;
 await page.route('**/api/admin/analytics?**',route=>{
  requested=Number(new URL(route.request().url()).searchParams.get('days'));
  const report=buildAnalyticsReport({sessions:[],events:[],orders:[],links:[]},{days:requested,device:'all',source:'all',traffic:'normal',audience:'all'});
  return route.fulfill({json:{...report,timeline:[],timelineTotal:0}});
 });
 for(const view of ['performance','marketing']){
  if(view==='performance') await open(page,view);
  else await nav(page,'Pazarlama');
  const period=page.getByRole('combobox',{name:'Dönem',exact:true});
  for(const days of ['90','365']){
   await period.selectOption(days);
   await expect.poll(()=>requested).toBe(Number(days));
   await expect(page.getByText('Günlük görünüm',{exact:false})).toBeVisible();
   await expect(page.getByLabel('Grafikte gün seç').locator('option')).toHaveCount(Number(days)+1);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`${view}-year.png`),fullPage:true});
 }
});

test('overview periods share combined sales and keep zero buckets connected',async({page},info)=>{
 let requested='';
 await page.route('**/api/admin/finance/summary?**',route=>{
  requested=new URL(route.request().url()).searchParams.get('days')||'28';
  const now=Date.now();
  return route.fulfill({json:{finance:{gross:700,orders:2},visits:3,series:[{timestamp:now-7200000,gross:700,orders:2,visits:3},{timestamp:now-3600000,gross:0,orders:0,visits:0},{timestamp:now,gross:0,orders:0,visits:0}]}});
 });
 await open(page);
 for(const days of ['1','2','7','28','90','365']){
  await page.getByLabel('Rapor dönemi').selectOption(days);
  await expect.poll(()=>requested).toBe(days);
  await expect(page.getByRole('button',{name:/Mağaza cirosu.*700/})).toBeVisible();
 }
 await page.getByRole('group',{name:'Grafik metriği'}).getByRole('button',{name:'Ziyaret',exact:true}).click();
 await page.getByLabel('Grafikte gün seç').selectOption('1');
 await expect(page.locator('output')).toHaveText('Sayfa ziyareti: 0');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('overview-zero.png'),fullPage:true});
 await page.route('**/api/admin/finance/summary?**',route=>route.fulfill({status:503,json:{error:'Rapor alınamadı'}}));
 await page.getByLabel('Rapor dönemi').selectOption('7');
 await expect(page.getByRole('alert').filter({hasText:'Rapor alınamadı'})).toBeVisible();
 await expect(page.getByRole('button',{name:/Mağaza cirosu.*Veri yok/})).toBeVisible();
});

test('customer channel counts stay separate and missing marketplace data is not zero',async({page},info)=>{
 await page.route('**/api/admin/customers/summary?**',route=>route.fulfill({json:{total:12,newCustomers:3,series:[],store:{total:12,newCustomers:3,series:[]},trendyol:null}}));
 await open(page,'customers');
 await expect(page.getByRole('heading',{name:'Kanallara göre alıcılar'})).toBeVisible();
 const group=page.getByRole('group',{name:'Müşteri kanalı'});
 await group.getByRole('button',{name:'Trendyol',exact:true}).click();
 await expect(page.getByText('Henüz hazırlanmadı',{exact:true})).toHaveCount(2);
 await expect(page.getByRole('button',{name:'Mesajlar',exact:true})).not.toBeVisible();
 await expect(page.getByText(/Trendyol mesaj, soru ve yorum bağlantısı henüz bağlı değil/)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('customers-channels.png'),fullPage:true});
 await group.getByRole('button',{name:'Mağaza',exact:true}).click();
 await expect(page.getByRole('button',{name:'Mesajlar',exact:true})).toBeVisible();
});

test('studio decision screens prioritize useful summaries and reveal tools on demand',async({page},info)=>{
 const now=Date.now(),at=new Date(now-3600000).toISOString();
 const report=buildAnalyticsReport({sessions:[{id:'s',visitor_id:'v',started_at:at,last_seen:at,entry_page:'home',source:'search',device:'android',traffic:'normal'}],events:[],orders:[{id:1,payment_status:'paid',paid_at:at,created_at:at,total_amount:1000,refunded_amount:100}],links:[]},{days:7,device:'all',source:'all',traffic:'normal',audience:'all'},now);
 await page.route('**/api/admin/analytics?**',route=>route.fulfill({json:{...report,timeline:[],timelineTotal:0}}));
 await open(page,'performance');
 await expect(page.getByRole('heading',{name:'Alışverişin hangi aşamasındalar?'})).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Analiz bölümleri'})).not.toBeVisible();
 await expect(page.getByRole('heading',{name:'En çok ilgi gören ürünler'})).toBeVisible();
 await page.screenshot({path:info.outputPath('performance-studio.png'),fullPage:true});
 await nav(page,'Pazarlama');await expect(page.getByRole('heading',{name:'Ziyaret kaynakları'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Hazırlık durumunu getir'})).not.toBeVisible();
 await page.screenshot({path:info.outputPath('marketing-studio.png'),fullPage:true});
 await nav(page,'Finans');await expect(page.getByRole('heading',{name:'Satış tutarı',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Kârı neden henüz göstermiyoruz?'})).toBeVisible();
 await expect(page.getByLabel('Sipariş veritabanı ID')).not.toBeVisible();
 await page.screenshot({path:info.outputPath('finance-studio.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByText('Sipariş katkısı ve fiyat araçları',{exact:true}).click();await expect(page.getByLabel('Sipariş veritabanı ID')).toBeVisible();
});
