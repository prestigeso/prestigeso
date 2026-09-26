import {buildAnalyticsReport,type OrderRow} from '../analytics/report.ts';
type Package={packageId:string;orderNumber:string;orderDate:number;status:string;amount:number;currency:string};
export function buildSalesReport(orders:OrderRow[],packages:Package[],days:number,now=Date.now()){
 const report=buildAnalyticsReport({sessions:[],events:[],links:[],orders},{days,device:'all',source:'all',traffic:'normal',audience:'all'},now);
 const from=now-days*86400000;
 const accepted=new Set(['Created','Picking','Invoiced','Shipped','Delivered','AtCollectionPoint']);
 const unique=[...new Map(packages.map(p=>[p.packageId,p])).values()];
 const selected=unique.filter(p=>p.orderDate>=from&&p.orderDate<now&&p.currency==='TRY'&&accepted.has(p.status));
 const excluded=unique.filter(p=>p.orderDate>=from&&p.orderDate<now&&!selected.includes(p));
 const cents=(n:number)=>Math.round(n*100);
 const gross=selected.reduce((n,p)=>n+cents(p.amount),0)/100;
 const orderKeys=new Map<string,number>();
 for(const p of selected)orderKeys.set(p.orderNumber,Math.min(orderKeys.get(p.orderNumber)??p.orderDate,p.orderDate));
 for(const row of report.series){
  const end=row.timestamp+(days<=2?3600000:86400000);
  row.gross=(cents(row.gross)+selected.filter(p=>p.orderDate>=row.timestamp&&p.orderDate<end).reduce((n,p)=>n+cents(p.amount),0))/100;
  row.orders+=[...orderKeys.values()].filter(t=>t>=row.timestamp&&t<end).length;
 }
 return {...report,finance:{...report.finance,gross:(cents(report.finance.gross)+cents(gross))/100,orders:report.finance.orders+orderKeys.size},
  channels:{store:{gross:report.finance.gross,orders:report.finance.orders},trendyol:{gross,orders:orderKeys.size,packages:selected.length,excludedPackages:excluded.length}},
  coverage:'Mağaza: doğrulanmış ödeme tarihi. Trendyol: aktif/teslim edilmiş paketlerin sipariş tarihi; iptal, bölünmüş eski paket, teslim edilemeyen ve iade paketleri hariç. Trendyol müşteri iadelerinin parasal mutabakatı henüz dahil değil; bu rapor banka tahsilatı veya net kâr değildir.'};
}
