"use client";

import { useEffect, useState } from "react";
import { adminDb } from "../adminDb";
import { uploadToStorageAndGetPublicUrl, revokeUrls } from "../utils";

import type { Slide } from "../types";
import type { ShowToastOptions, AppToastType, ShowConfirmOptions } from "@/context/AppAlertContext";

interface UseSettingsActionsParams {
  loadAllData: () => Promise<void>;
  showToast: (options: ShowToastOptions | string, type?: AppToastType) => void;
  showConfirm: (options: ShowConfirmOptions) => Promise<boolean>;
}

export function useSettingsActions({
  loadAllData,
  showToast,
  showConfirm,
}: UseSettingsActionsParams) {
  const [marquee, setMarquee] = useState("");
  const [newSlideFiles, setNewSlideFiles] = useState<File[]>([]);
  const [newSlidePreviews, setNewSlidePreviews] = useState<string[]>([]);
  const [newSlide, setNewSlide] = useState({ title: "", subtitle: "" });

  useEffect(() => {
    setMarquee(localStorage.getItem("prestigeso_campaign") || "");
  }, []);

  const handleSaveMarquee = () => {
    localStorage.setItem("prestigeso_campaign", marquee);
    showToast("Kayan yazı kaydedildi.", "success");
  };

  const handleAddSlide = async () => {
    if (newSlideFiles.length === 0) {
      showToast("Lütfen en az bir görsel seçin.", "warning");
      return;
    }

    try {
      const urls = await Promise.all(newSlideFiles.map((file) => uploadToStorageAndGetPublicUrl(file, "hero")));
      const inserts = urls.map((url) => ({ image_url: url, title: newSlide.title.trim(), subtitle: newSlide.subtitle.trim() }));
      const { error } = await adminDb({ action: "insert", table: "hero_slides", data: inserts });
      if (error) throw error;

      showToast("Slide'lar eklendi.", "success");
      revokeUrls(newSlidePreviews);
      setNewSlideFiles([]);
      setNewSlidePreviews([]);
      setNewSlide({ title: "", subtitle: "" });
      loadAllData();
    } catch (err: unknown) {
      showToast("Slide eklenemedi: " + (err instanceof Error ? err.message : "Bilinmeyen hata"), "error");
    }
  };

  const handleDeleteSlide = async (id: number) => {
    const ok = await showConfirm({
      title: "Slide silinsin mi?",
      message: "Bu slide'ı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      confirmText: "Sil",
      cancelText: "Vazgeç",
      tone: "danger",
    });
    if (!ok) return;

    const { error } = await adminDb({ action: "delete", table: "hero_slides", filters: [{ column: "id", op: "eq", value: id }] });
    if (error) {
      showToast("Slide silinemedi: " + error, "error");
      return;
    }

    showToast("Slide silindi.", "success");
    loadAllData();
  };

  const handleUpdateSlide = async (slide: Slide) => {
    const { error } = await adminDb({ action: "update", table: "hero_slides", data: { image_url: slide.image_url, title: slide.title, subtitle: slide.subtitle }, filters: [{ column: "id", op: "eq", value: slide.id }] });
    if (error) {
      showToast("Slide güncellenemedi: " + error, "error");
      return;
    }

    showToast("Slide kaydedildi.", "success");
    loadAllData();
  };

  return {
    marquee,
    setMarquee,
    newSlideFiles,
    setNewSlideFiles,
    newSlidePreviews,
    setNewSlidePreviews,
    newSlide,
    setNewSlide,
    handleSaveMarquee,
    handleAddSlide,
    handleDeleteSlide,
    handleUpdateSlide,
  };
}
