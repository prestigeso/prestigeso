"use client";

import { useMemo } from "react";
import type { ProductRow, CampaignRow } from "../types";
import { safeParseIds } from "../utils";

type StockTab = "all" | "in" | "out";

type Props = {
  loading: boolean;

  dbProducts: ProductRow[];
  dbCampaigns: CampaignRow[];

  stockTab: StockTab;
  setStockTab: (t: StockTab) => void;

  searchTerm: string;
  setSearchTerm: (v: string) => void;

  onEditProduct: (id: number) => void;
  onRefresh: () => void;
};

export default function ProductList({
  loading,
  dbProducts,
  dbCampaigns,
  stockTab,
  setStockTab,
  searchTerm,
  setSearchTerm,
  onEditProduct,
  onRefresh,
}: Props) {
  const outOfStockCount = useMemo(
    () => dbProducts.filter((p) => Number(p.stock) <= 0).length,
    [dbProducts]
  );

  const filteredProducts = useMemo(() => {
    let result = dbProducts;

    if (stockTab === "in") result = result.filter((p) => Number(p.stock) > 0);
    if (stockTab === "out") result = result.filter((p) => Number(p.stock) <= 0);

    if (searchTerm && searchTerm.trim() !== "") {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const sku = (p["SKU"] || "").toLowerCase();
        const barcode = ((p.barcode ?? "") as any).toString().toLowerCase();
        return name.includes(q) || sku.includes(q) || barcode.includes(q);
      });
    }

    return result;
  }, [dbProducts, stockTab, searchTerm]);

  return (
    <div>
      {/* FİLTRE BUTONLARI */}
      <div className="flex items-center gap-2 px-1 overflow-x-auto">
        <button
          onClick={() => setStockTab("all")}
          className={`text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full transition-all ${
            stockTab === "all"
              ? "bg-black text-white shadow-md"
              : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          Tümü
        </button>

        <button
          onClick={() => setStockTab("in")}
          className={`text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full transition-all ${
            stockTab === "in"
              ? "bg-green-600 text-white shadow-md"
              : "bg-white border border-gray-200 text-green-700 hover:bg-green-50"
          }`}
        >
          Stokta Olanlar
        </button>

        <button
          onClick={() => setStockTab("out")}
          className={`text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full transition-all ${
            stockTab === "out"
              ? "bg-red-600 text-white shadow-md"
              : "bg-white border border-gray-200 text-red-600 hover:bg-red-50"
          }`}
        >
          Stoğu Bitenler ({outOfStockCount})
        </button>
      </div>

      {/* ÜRÜN ENVANTERİ LİSTESİ */}
      <div className="mt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 px-1 gap-3">
          <h2 className="font-bold text-sm uppercase tracking-widest text-gray-500">
            Ürün Envanteri
          </h2>

          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Ürün / SKU / Barkod ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black shadow-sm"
            />
            <span className="absolute left-3 top-2.5 text-gray-400 text-lg">
              🔍
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <p className="p-6 text-center text-gray-400">Yükleniyor...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="p-6 text-center text-gray-400">
              Aramanıza uygun ürün bulunamadı.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredProducts.map((p) => {
                const nowIso = new Date().toISOString();

                const activeCamp = dbCampaigns.find((c: any) => {
                  const ids = safeParseIds(c.product_ids);
                  return (
                    ids.includes(p.id) &&
                    nowIso >= (c as any).start_date &&
                    nowIso <= (c as any).end_date
                  );
                });

                const upcomingCamp = dbCampaigns.find((c: any) => {
                  const ids = safeParseIds(c.product_ids);
                  return ids.includes(p.id) && nowIso < (c as any).start_date;
                });

                let newPriceStr = "";
                if (activeCamp) {
                  const discounted =
                    Number(p.price) * (1 - (activeCamp as any).discount_percent / 100);
                  newPriceStr = discounted.toFixed(0);
                }

                return (
                  <div
                    key={p.id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2 flex-wrap">
                        <span className="truncate max-w-[280px] sm:max-w-[420px]">
                          {p.name}
                        </span>

                        {/* ✅ SKU etiketi */}
                        <span className="bg-black text-white px-2 py-0.5 rounded text-[9px] font-mono border border-black">
                          {p["SKU"]}
                        </span>

                        {/* Barkod etiketi (opsiyonel) */}
                        {p.barcode && (
                          <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[9px] font-mono border border-gray-200">
                            #{String(p.barcode)}
                          </span>
                        )}
                      </h3>

                      <p className="text-xs text-blue-600 font-black">
                        {Number(p.price).toLocaleString("tr-TR")} ₺
                      </p>

                      <p className="text-[10px] text-gray-400">
                        {p.category || "Kategori yok"}
                        {Number(p.stock) <= 0 && (
                          <span className="ml-2 text-red-600 font-bold">
                            (STOK BİTTİ)
                          </span>
                        )}
                      </p>

                      {/* KAMPANYA ETİKETLERİ */}
                      {activeCamp && (
                        <p className="text-[10px] font-bold text-green-600 mt-1">
                          🟢 {(activeCamp as any).name}: {newPriceStr} ₺
                        </p>
                      )}
                      {upcomingCamp && (
                        <p className="text-[10px] font-bold text-orange-500 mt-1">
                          ⏳ Bekleyen: {(upcomingCamp as any).name} (
                          {new Date((upcomingCamp as any).start_date).toLocaleDateString("tr-TR")}
                          )
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => onEditProduct(p.id)}
                      className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold active:scale-95 transition-transform flex-shrink-0"
                    >
                      Düzenle
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-3">
          <button
            onClick={onRefresh}
            className="text-xs font-bold text-gray-500 hover:text-black border border-gray-200 px-4 py-2 rounded-full"
          >
            ↻ Listeyi Yenile
          </button>
        </div>
      </div>
    </div>
  );
}