"use client";

import { adminDb } from "../adminDb";

import type { OrderRow } from "../types";
import type { ShowToastOptions, AppToastType } from "@/context/AppAlertContext";

const VALID_ORDER_STATUSES = ["Bekliyor", "Hazırlanıyor", "Kargolandı", "Teslim Edildi", "İptal Edildi", "İade Talebi", "İade Edildi"];

interface UseOrderActionsParams {
  setDbOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  showToast: (options: ShowToastOptions | string, type?: AppToastType) => void;
}

export function useOrderActions({
  setDbOrders,
  showToast,
}: UseOrderActionsParams) {
  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    if (!VALID_ORDER_STATUSES.includes(newStatus)) {
      showToast("Geçersiz sipariş durumu.", "error");
      return;
    }
    if (newStatus === "İptal Edildi" || newStatus === "İade Edildi") {
      try {
        const res = await fetch("/api/admin/orders/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, newStatus })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          showToast(data.error || "İade işlemi başarısız.", "error");
          return;
        }
        showToast(data.message || `Sipariş durumu "${newStatus}" olarak güncellendi ve ücret iade edildi.`, "success");
        setDbOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, payment_status: "refunded" } : o)));
      } catch (err: any) {
        showToast("Bir hata oluştu: " + err.message, "error");
      }
      return;
    }

    // Diğer durumlar için normal güncelleme
    const { error } = await adminDb({ action: "update", table: "orders", data: { status: newStatus }, filters: [{ column: "id", op: "eq", value: orderId }] });
    if (error) {
      showToast("Hata: " + error, "error");
      return;
    }

    showToast(`Sipariş durumu "${newStatus}" olarak güncellendi.`, "success");
    setDbOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
  };

  return {
    handleUpdateOrderStatus,
  };
}
