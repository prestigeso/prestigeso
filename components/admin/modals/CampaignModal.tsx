"use client";

import { useMemo, useState, useEffect } from "react";
import type { ProductRow, CampaignRow } from "../types";
import { safeParseIds } from "../utils";
import { useAppAlert } from "@/context/AppAlertContext";

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

const MIN_DISCOUNT_PERCENT = 1;
const MAX_DISCOUNT_PERCENT = 89;
const MAX_CAMPAIGN_NAME_LENGTH = 80;

function todayAsInputDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidDateInput(value: string) {
  if (!value) return false;

  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

function getCampaignState(campaign: any) {
  const nowIso = new Date().toISOString();

  if (campaign.start_date && nowIso < campaign.start_date) {
    return "pending";
  }

  if (campaign.end_date && nowIso > campaign.end_date) {
    return "expired";
  }

  return "active";
}

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
  const { showToast, showConfirm } = useAppAlert();

  const [productSearch, setProductSearch] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const minDate = useMemo(() => todayAsInputDate(), []);

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

    return dbProducts.filter((product) => {
      const name = (product.name || "").toLowerCase();
      const sku = (product["SKU"] || "").toLowerCase();
      const barcode = ((product.barcode ?? "") as any).toString().toLowerCase();

      return name.includes(q) || sku.includes(q) || barcode.includes(q);
    });
  }, [dbProducts, productSearch]);

  const validationMessage = useMemo(() => {
    const trimmedName = campaignName.trim();
    const discount = Number(discountPercent);

    if (!trimmedName) return "Kampanya adı zorunludur.";

    if (trimmedName.length > MAX_CAMPAIGN_NAME_LENGTH) {
      return `Kampanya adı en fazla ${MAX_CAMPAIGN_NAME_LENGTH} karakter olabilir.`;
    }

    if (!Number.isFinite(discount)) return "İndirim yüzdesi geçerli olmalıdır.";

    if (discount < MIN_DISCOUNT_PERCENT || discount > MAX_DISCOUNT_PERCENT) {
      return `İndirim yüzdesi ${MIN_DISCOUNT_PERCENT} ile ${MAX_DISCOUNT_PERCENT} arasında olmalıdır.`;
    }

    if (!isValidDateInput(campaignDates.start)) return "Başlangıç tarihi zorunludur.";
    if (!isValidDateInput(campaignDates.end)) return "Bitiş tarihi zorunludur.";

    if (campaignDates.end < campaignDates.start) {
      return "Bitiş tarihi başlangıç tarihinden önce olamaz.";
    }

    if (campaignDates.end < minDate) {
      return "Bitiş tarihi geçmiş bir tarih olamaz.";
    }

    if (selectedCampaignProducts.length === 0) {
      return "Kampanyaya en az 1 ürün seçmelisiniz.";
    }

    return "";
  }, [
    campaignDates.end,
    campaignDates.start,
    campaignName,
    discountPercent,
    minDate,
    selectedCampaignProducts.length,
  ]);

  const clearSelection = () => setSelectedCampaignProducts([]);

  const handleDiscountChange = (value: string) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      setDiscountPercent(MIN_DISCOUNT_PERCENT);
      return;
    }

    const clamped = Math.min(
      Math.max(parsed, MIN_DISCOUNT_PERCENT),
      MAX_DISCOUNT_PERCENT
    );

    setDiscountPercent(clamped);
  };

  const handleCreateCampaign = () => {
    if (validationMessage) {
      showToast(validationMessage, "warning");
      return;
    }

    onCreateCampaign();
  };

  const handleDeleteCampaign = async (id: number, name?: string) => {
    const ok = await showConfirm({
      title: "Kampanya silinsin mi?",
      message: `${name || "Bu kampanya"} silinsin mi? Bu işlem geri alınamaz.`,
      confirmText: "Sil",
      cancelText: "Vazgeç",
      tone: "danger",
    });

    if (!ok) return;

    onDeleteCampaign(id);
  };

  if (!isMounted || !open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl p-8 shadow-2xl max-h-[90vh] flex flex-col">
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

        <div className="flex flex-col md:flex-row gap-8 overflow-y-auto flex-1 pr-2 custom-scrollbar">
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
                maxLength={MAX_CAMPAIGN_NAME_LENGTH}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black"
                placeholder="Örn: Sezon İndirimi"
              />

              <p className="text-[10px] text-gray-400 font-bold mt-1 text-right">
                {campaignName.length}/{MAX_CAMPAIGN_NAME_LENGTH}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-2">
                İndirim Yüzdesi (%)
              </label>

              <input
                type="number"
                value={discountPercent}
                onChange={(e) => handleDiscountChange(e.target.value)}
                className="w-full p-3 bg-white border border-blue-200 rounded-xl font-black text-blue-600 outline-none"
                min={MIN_DISCOUNT_PERCENT}
                max={MAX_DISCOUNT_PERCENT}
                step={1}
              />

              <p className="text-[10px] text-blue-700 font-bold mt-2">
                Geçerli aralık: %{MIN_DISCOUNT_PERCENT} – %{MAX_DISCOUNT_PERCENT}. Önerilen: 10–40 arası.
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
                  min={minDate}
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
                  min={campaignDates.start || minDate}
                  value={campaignDates.end}
                  onChange={(e) =>
                    setCampaignDates({ ...campaignDates, end: e.target.value })
                  }
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                />
              </div>
            </div>

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
                  filteredProducts.map((product) => {
                    const isSelected = selectedCampaignProducts.includes(product.id);

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleCampaignProduct(product.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-black bg-black text-white"
                            : "border-gray-200 bg-white hover:border-gray-400"
                        }`}
                        title={`SKU: ${product["SKU"] || "-"}`}
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs truncate flex-1">{product.name}</p>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-mono border ${
                              isSelected
                                ? "bg-white/10 text-white border-white/20"
                                : "bg-black text-white border-black"
                            }`}
                          >
                            {product["SKU"] || "SKU"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-1 gap-2">
                          <p className={`text-[10px] ${isSelected ? "text-gray-300" : "text-gray-500"}`}>
                            {Number(product.price || 0).toLocaleString("tr-TR")} ₺
                          </p>

                          {product.barcode && (
                            <span
                              className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                                isSelected
                                  ? "border-white/20 text-gray-200"
                                  : "border-gray-200 text-gray-500 bg-gray-50"
                              }`}
                            >
                              #{String(product.barcode)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {validationMessage && (
              <div className="bg-orange-50 border border-orange-100 text-orange-700 rounded-xl p-3 text-[11px] font-bold leading-relaxed">
                {validationMessage}
              </div>
            )}

            <button
              type="button"
              onClick={handleCreateCampaign}
              disabled={!!validationMessage}
              className="w-full bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              🚀 Kampanyayı Başlat
            </button>
          </div>

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
                {dbCampaigns.map((campaign: any) => {
                  const campaignState = getCampaignState(campaign);
                  const isActive = campaignState === "active";
                  const isExpired = campaignState === "expired";
                  const productIds = safeParseIds(campaign.product_ids);

                  return (
                    <div
                      key={campaign.id}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        isActive
                          ? "border-green-400 bg-green-50/30"
                          : isExpired
                          ? "border-gray-200 bg-gray-50 opacity-70"
                          : "border-orange-300 bg-orange-50/30"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-black text-lg text-black">{campaign.name}</h4>

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
                        % {campaign.discount_percent} İndirim
                      </p>

                      <p suppressHydrationWarning className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                        {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString("tr-TR") : ""} -{" "}
                        {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString("tr-TR") : ""}
                      </p>

                      <div className="flex justify-between items-center border-t border-gray-200/50 pt-3">
                        <p className="text-[10px] font-bold text-gray-500">
                          {productIds.length} Ürün Dahil
                        </p>

                        <button
                          type="button"
                          onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
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
