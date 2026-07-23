"use client";

import { useState } from "react";
import { adminDb } from "../adminDb";
import type { ShowToastOptions, AppToastType } from "@/context/AppAlertContext";

interface UseCampaignActionsParams {
  loadAllData: () => Promise<void>;
  showToast: (options: ShowToastOptions | string, type?: AppToastType) => void;
}

export function useCampaignActions({
  loadAllData,
  showToast,
}: UseCampaignActionsParams) {
  const [campaignName, setCampaignName] = useState("");
  const [selectedCampaignProducts, setSelectedCampaignProducts] = useState<
    number[]
  >([]);
  const [campaignDates, setCampaignDates] = useState({ start: "", end: "" });
  const [discountPercent, setDiscountPercent] = useState<number>(20);

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      showToast("Lütfen kampanya için bir isim girin.", "warning");
      return;
    }

    if (selectedCampaignProducts.length === 0) {
      showToast("Kampanyaya dahil edilecek ürünleri seçin.", "warning");
      return;
    }

    if (!campaignDates.start || !campaignDates.end) {
      showToast(
        "Lütfen kampanya başlangıç ve bitiş tarihlerini seçin.",
        "warning",
      );
      return;
    }

    if (
      new Date(campaignDates.start) >= new Date(campaignDates.end + "T23:59:59")
    ) {
      showToast(
        "Bitiş tarihi, başlangıç tarihinden sonra olmalıdır.",
        "warning",
      );
      return;
    }

    if (discountPercent <= 0 || discountPercent >= 90) {
      showToast("İndirim yüzdesi 1-89 arası olmalıdır.", "warning");
      return;
    }

    const startIso = new Date(campaignDates.start).toISOString();
    const endIso = new Date(campaignDates.end + "T23:59:59").toISOString();

    const { error } = await adminDb({
      action: "insert",
      table: "campaigns",
      data: {
        name: campaignName,
        discount_percent: discountPercent,
        start_date: startIso,
        end_date: endIso,
        product_ids: selectedCampaignProducts,
      },
    });

    if (error) {
      showToast("Kampanya oluşturulamadı: " + error, "error");
      return;
    }

    showToast("Yeni kampanya başarıyla kuruldu.", "success");
    setSelectedCampaignProducts([]);
    setCampaignDates({ start: "", end: "" });
    setCampaignName("");
    setDiscountPercent(20);
    loadAllData();
  };

  const handleDeleteCampaign = async (id: number) => {
    const { error } = await adminDb({
      action: "delete",
      table: "campaigns",
      filters: [{ column: "id", op: "eq", value: id }],
    });
    if (error) {
      showToast("Kampanya silinemedi: " + error, "error");
      return;
    }

    showToast("Kampanya silindi.", "success");
    loadAllData();
  };

  return {
    campaignName,
    setCampaignName,
    selectedCampaignProducts,
    setSelectedCampaignProducts,
    campaignDates,
    setCampaignDates,
    discountPercent,
    setDiscountPercent,
    handleCreateCampaign,
    handleDeleteCampaign,
  };
}
