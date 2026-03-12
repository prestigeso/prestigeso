"use client";

import { useMemo, useState, useEffect } from "react";
import type { ProductRow, CampaignRow } from "../types";
import { safeParseIds } from "../utils";

type Props = {
  open: boolean;
  onClose: () => void;

  campaignName: string;
  setCampaignName: (v: string) => void;

  discountPercent: number;
  setDiscountPercent: (v: number) => void;

  campaignDates: { start: string; end: string };
  setCampaignDates: (v: { start: string; end: string }) => void;

  selectedCampaignProducts: number[];
  setSelectedCampaignProducts: (ids: number[]) => void;

  dbProducts: ProductRow[];
  dbCampaigns: CampaignRow[];

  onCreateCampaign: () => void;
  onDeleteCampaign: (id: number) => void;
};

export default function CampaignModal({
  open,
  onClose,
  campaignName = "",
  setCampaignName,
  discountPercent = 10,
  setDiscountPercent,
  campaignDates = { start: "", end: "" },
  setCampaignDates,
  selectedCampaignProducts = [],
  setSelectedCampaignProducts,
  dbProducts = [],
  dbCampaigns = [],
  onCreateCampaign,
  onDeleteCampaign,
}: Props) {
  const [productSearch, setProductSearch] = useState("");
  
  // ZIRH 1: HYDRATION KALKANI (Sadece Tarayıcıda Çalışmasını Sağlar)
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleCampaignProduct = (id: number) => {
    setSelectedCampaignProducts(
      selectedCampaignProducts.includes(id)
        ? selectedCampaignProducts.filter((x) => x !== id)
        : [...selectedCampaignProducts, id]
    );
  };

  const filteredProducts = useMemo(() => {
    if (!dbProducts || !Array.isArray(dbProducts)) return [];
    
    const q = productSearch.trim().toLowerCase();
    if (!q) return dbProducts;

    return dbProducts.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const sku = (p["SKU"] || "").toLowerCase();
      const barcode = ((p.barcode ?? "") as any).toString().toLowerCase();
      return name.includes(q) || sku.includes(q) || barcode.includes(q);
    });
  }, [dbProducts, productSearch]);

  const clearSelection = () => setSelectedCampaignProducts([]);

  // EĞER SAYFA YÜKLENMEDİYSE VEYA MODAL KAPALIYSA HİÇBİR ŞEY ÇİZME! (Çökmeyi Engeller)
  if (!isMounted || !open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl p-8 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
          <h2 className="text-2xl font-black flex items-center gap-3">
            <span>🏷️</span> Kampanya Yönetimi Merkezi
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full font-bold hover:bg-gray-200"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row gap-8 overflow-y-auto flex-1 pr-2 custom-scrollbar">
          {/* LEFT: Create */}
          <div className="w-full md:w-1/2 space-y-5 border-r border-gray-100 pr-0 md:pr-6">
            <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">
              Yeni Kampanya Oluştur
            </h3>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                Kampanya Adı
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black"
                placeholder="Örn: Sezon İndirimi"
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-2">
                İndirim Yüzdesi (%)
              </label>
              <input
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-full p-3 bg-white border border-blue-200 rounded-xl font-black text-blue-600 outline-none"
                min={1}
                max={89}
              />
              <p className="text-[10px] text-blue-700 font-bold mt-2">
                Önerilen: 10–40 arası.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Başlangıç
                </label>
                <input
                  type="date"
                  required
                  value={campaignDates.start}
                  onChange={(e) =>
                    setCampaignDates({ ...campaignDates, start: e.target.value })
                  }
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Bitiş
                </label>
                <input
                  type="date"
                  required
                  value={campaignDates.end}
                  onChange={(e) =>
                    setCampaignDates({ ...campaignDates, end: e.target.value })
                  }
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                />
              </div>
            </div>

            {/* ✅ ÜRÜN ARAMA + SEÇİM */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                  Ürün Seçimi ({selectedCampaignProducts.length} Seçildi)
                </label>

                {selectedCampaignProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-[10px] font-black text-red-600 hover:text-red-700 uppercase tracking-widest"
                  >
                    Seçimi Temizle
                  </button>
                )}
              </div>

              <div className="relative mb-3">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Ürün / SKU / Barkod ara..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>

                {productSearch.trim() !== "" && (
                  <button
                    type="button"
                    onClick={() => setProductSearch("")}
                    className="absolute right-2 top-2 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-black"
                    aria-label="Aramayı temizle"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-2 bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 text-center">
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                      Aramaya uygun ürün yok.
                    </p>
                  </div>
                ) : (
                  filteredProducts.map((p) => {
                    const isSelected = selectedCampaignProducts.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleCampaignProduct(p.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-black bg-black text-white"
                            : "border-gray-200 bg-white hover:border-gray-400"
                        }`}
                        title={`SKU: ${p["SKU"]}`}
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs truncate flex-1">{p.name}</p>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-mono border ${
                              isSelected
                                ? "bg-white/10 text-white border-white/20"
                                : "bg-black text-white border-black"
                            }`}
                          >
                            {p["SKU"]}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-1 gap-2">
                          <p className={`text-[10px] ${isSelected ? "text-gray-300" : "text-gray-500"}`}>
                            {Number(p.price).toLocaleString("tr-TR")} ₺
                          </p>

                          {p.barcode && (
                            <span
                              className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                                isSelected
                                  ? "border-white/20 text-gray-200"
                                  : "border-gray-200 text-gray-500 bg-gray-50"
                              }`}
                            >
                              #{String(p.barcode)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onCreateCampaign}
              className="w-full bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-transform"
            >
              🚀 Kampanyayı Başlat
            </button>
          </div>

          {/* RIGHT: List */}
          <div className="w-full md:w-1/2">
            <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">
              Sistemdeki Kampanyalar
            </h3>

            {!dbCampaigns || dbCampaigns.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-10 text-center border border-dashed border-gray-200">
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">
                  Henüz oluşturulmuş kampanya yok.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {dbCampaigns.map((camp: any) => {
                  const nowIso = new Date().toISOString();
                  const isActive = nowIso >= camp.start_date && nowIso <= camp.end_date;
                  const isExpired = nowIso > camp.end_date;
                  const pIds = safeParseIds(camp.product_ids);

                  return (
                    <div
                      key={camp.id}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        isActive
                          ? "border-green-400 bg-green-50/30"
                          : isExpired
                          ? "border-gray-200 bg-gray-50 opacity-70"
                          : "border-orange-300 bg-orange-50/30"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-black text-lg text-black">{camp.name}</h4>

                        {isActive && (
                          <span className="bg-green-500 text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase animate-pulse">
                            Aktif
                          </span>
                        )}
                        {isExpired && (
                          <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase">
                            Süresi Bitti
                          </span>
                        )}
                        {!isActive && !isExpired && (
                          <span className="bg-orange-500 text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase">
                            Bekliyor
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-bold text-blue-600 mb-2">
                        % {camp.discount_percent} İndirim
                      </p>

                      <p suppressHydrationWarning className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                        {camp.start_date ? new Date(camp.start_date).toLocaleDateString("tr-TR") : ""} -{" "}
                        {camp.end_date ? new Date(camp.end_date).toLocaleDateString("tr-TR") : ""}
                      </p>

                      <div className="flex justify-between items-center border-t border-gray-200/50 pt-3">
                        <p className="text-[10px] font-bold text-gray-500">
                          {pIds.length} Ürün Dahil
                        </p>

                        <button
                          type="button"
                          onClick={() => onDeleteCampaign(camp.id)}
                          className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-lg border border-red-100"
                        >
                          Sil / İptal Et
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}