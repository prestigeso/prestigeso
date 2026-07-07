"use client";

import { useMemo, useState } from "react";
import type { ProductRow, CampaignRow, CategoryRow } from "../types";
import { safeParseIds } from "../utils";

type StockTab = "all" | "in" | "out";

type Props = {
  loading: boolean;

  dbProducts: ProductRow[];
  dbCampaigns: CampaignRow[];
  dbCategories?: CategoryRow[];

  stockTab: StockTab;
  setStockTab: (t: StockTab) => void;

  searchTerm: string;
  setSearchTerm: (v: string) => void;

  onEditProduct: (id: number) => void;
  onRefresh: () => void;
  onInlineUpdate?: (id: number, field: "price" | "stock", value: number) => void;
};

export default function ProductList({
  loading,
  dbProducts,
  dbCampaigns,
  dbCategories = [],
  stockTab,
  setStockTab,
  searchTerm,
  setSearchTerm,
  onEditProduct,
  onRefresh,
  onInlineUpdate,
}: Props) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("newest");
  
  const categories = useMemo(() => {
    if (dbCategories && dbCategories.length > 0) {
      return dbCategories.map((c) => c.name);
    }
    const cats = new Set(dbProducts.map((p) => p.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [dbProducts, dbCategories]);

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

    if (categoryFilter !== "all") {
      result = result.filter(p => p.category === categoryFilter);
    }

    if (sortFilter === "newest") result = result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    if (sortFilter === "oldest") result = result.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    if (sortFilter === "price_asc") result = result.sort((a, b) => Number(a.price) - Number(b.price));
    if (sortFilter === "price_desc") result = result.sort((a, b) => Number(b.price) - Number(a.price));

    return result;
  }, [dbProducts, stockTab, searchTerm, categoryFilter, sortFilter]);

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

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-auto bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-black"
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value)}
              className="w-full sm:w-auto bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-black"
            >
              <option value="newest">En Yeniler</option>
              <option value="oldest">En Eskiler</option>
              <option value="price_asc">Fiyat (Artan)</option>
              <option value="price_desc">Fiyat (Azalan)</option>
            </select>

            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Ürün / SKU / Barkod ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black shadow-sm"
              />
              <span className="absolute left-3 top-2.5 text-gray-400 text-lg">
                🔍
              </span>
            </div>
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

                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          <span className="text-[10px] font-black text-gray-500 px-2">₺</span>
                          <input
                            type="number"
                            defaultValue={p.price}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              if (val !== Number(p.price) && onInlineUpdate) {
                                onInlineUpdate(p.id, "price", val);
                              }
                            }}
                            className="w-20 bg-transparent text-xs font-black text-blue-600 outline-none py-1"
                          />
                        </div>
                        <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          <span className="text-[10px] font-black text-gray-500 px-2">STOK</span>
                          <input
                            type="number"
                            defaultValue={p.stock}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              if (val !== Number(p.stock) && onInlineUpdate) {
                                onInlineUpdate(p.id, "stock", val);
                              }
                            }}
                            className="w-16 bg-transparent text-xs font-black outline-none py-1"
                          />
                        </div>
                      </div>

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