"use client";

import { adminDb } from "../adminDb";

import type { ReviewRow } from "../types";
import type { ShowToastOptions, AppToastType, ShowConfirmOptions } from "@/context/AppAlertContext";

interface UseReviewActionsParams {
  setDbReviews: React.Dispatch<React.SetStateAction<ReviewRow[]>>;
  showToast: (options: ShowToastOptions | string, type?: AppToastType) => void;
  showConfirm: (options: ShowConfirmOptions) => Promise<boolean>;
}

export function useReviewActions({
  setDbReviews,
  showToast,
  showConfirm,
}: UseReviewActionsParams) {
  const handleApproveReview = async (reviewId: string) => {
    const { error } = await adminDb({ action: "update", table: "reviews", data: { is_approved: true }, filters: [{ column: "id", op: "eq", value: reviewId }] });
    if (error) {
      showToast("Hata: " + error, "error");
      return;
    }

    showToast("Yorum yayına alındı.", "success");
    setDbReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, is_approved: true } : r)));
  };

  const handleDeleteReview = async (reviewId: string) => {
    const ok = await showConfirm({
      title: "Yorum silinsin mi?",
      message: "Bu yorumu tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      confirmText: "Sil",
      cancelText: "Vazgeç",
      tone: "danger",
    });
    if (!ok) return;

    const { error } = await adminDb({ action: "delete", table: "reviews", filters: [{ column: "id", op: "eq", value: reviewId }] });
    if (error) {
      showToast("Hata: " + error, "error");
      return;
    }

    showToast("Yorum silindi.", "success");
    setDbReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };

  return {
    handleApproveReview,
    handleDeleteReview,
  };
}
