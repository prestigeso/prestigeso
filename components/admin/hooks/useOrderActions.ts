"use client";

import { adminDb } from "../adminDb";

import type { OrderRow } from "../types";
import type { ShowToastOptions, AppToastType } from "@/context/AppAlertContext";
import { getErrorMessage } from "@/lib/utils";

const VALID_ORDER_STATUSES = [
  "Bekliyor",
  "Hazırlanıyor",
  "Kargolandı",
  "Teslim Edildi",
  "İptal Edildi",
  "İade Talebi",
  "İade Edildi",
];

interface UseOrderActionsParams {
  setDbOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  showToast: (options: ShowToastOptions | string, type?: AppToastType) => void;
}

export function useOrderActions({
  setDbOrders,
  showToast,
}: UseOrderActionsParams) {
  const handleUpdateOrderStatus = async (
    orderId: number,
    newStatus: string,
  ) => {
    if (!VALID_ORDER_STATUSES.includes(newStatus)) {
      showToast("Geçersiz sipariş durumu.", "error");
      return;
    }
    if (newStatus === "İptal Edildi" || newStatus === "İade Edildi") {
      try {
        const res = await fetch("/api/admin/orders/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, newStatus }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          showToast(data.error || "İade işlemi başarısız.", "error");
          return;
        }
        showToast(
          data.message ||
            `Sipariş durumu "${newStatus}" olarak güncellendi ve ücret iade edildi.`,
          "success",
        );
        setDbOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, status: newStatus, payment_status: "refunded" }
              : o,
          ),
        );
      } catch (error: unknown) {
        showToast("Bir hata oluştu: " + getErrorMessage(error), "error");
      }
      return;
    }

    const { error } = await adminDb({
      action: "update",
      table: "orders",
      data: { status: newStatus },
      filters: [{ column: "id", op: "eq", value: orderId }],
    });
    if (error) {
      showToast("Hata: " + error, "error");
      return;
    }

    showToast(`Sipariş durumu "${newStatus}" olarak güncellendi.`, "success");
    setDbOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
    );
  };

  const handleReturnDecision = async (
    orderId: number,
    decision: "approve" | "reject",
    note: string,
    returnShippingCode = "",
  ) => {
    try {
      const response = await fetch("/api/admin/returns", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, decision, note, returnShippingCode }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "İade kararı uygulanamadı.");
      setDbOrders((orders) =>
        orders.map((order) =>
          order.id === orderId ? { ...order, status: String(result.status) } : order,
        ),
      );
      showToast(
        decision === "approve"
          ? `İade onaylandı${result.refundAmount ? `: ${result.refundAmount} TL` : ""}.`
          : "İade talebi reddedildi.",
        "success",
      );
    } catch (error) {
      showToast(getErrorMessage(error, "İade kararı uygulanamadı."), "error");
    }
  };

  return {
    handleUpdateOrderStatus,
    handleReturnDecision,
  };
}
