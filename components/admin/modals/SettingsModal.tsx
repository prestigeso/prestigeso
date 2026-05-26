"use client";

import { useEffect, useState } from "react";
import type { Slide } from "../types";
import { revokeUrls } from "../utils";

type Props = {
  open: boolean;
  onClose: () => void;

  marquee: string;
  setMarquee: (v: string) => void;
  onSaveMarquee: () => void;

  dbSlides: Slide[];
  setDbSlides: (updater: (prev: Slide[]) => Slide[]) => void;

  newSlideFiles: File[];
  setNewSlideFiles: (files: File[]) => void;

  newSlidePreviews: string[];
  setNewSlidePreviews: (urls: string[]) => void;

  newSlide: { title: string; subtitle: string };
  setNewSlide: (v: { title: string; subtitle: string }) => void;

  onAddSlide: () => void;
  onUpdateSlide: (slide: Slide) => void;
  onDeleteSlide: (id: number) => void;
};

function toMoneyInput(value: unknown) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) && numberValue > 0 ? String(numberValue) : "";
}

function sanitizeMoneyInput(value: string) {
  return value.replace(/[^0-9.,]/g, "").replace(",", ".").slice(0, 12);
}

export default function SettingsModal({
  open,
  onClose,

  marquee,
  setMarquee,
  onSaveMarquee,

  dbSlides,
  setDbSlides,

  newSlideFiles,
  setNewSlideFiles,

  newSlidePreviews,
  setNewSlidePreviews,

  newSlide,
  setNewSlide,

  onAddSlide,
  onUpdateSlide,
  onDeleteSlide,
}: Props) {
  const [shippingFee, setShippingFee] = useState("");
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("");
  const [shippingEnabled, setShippingEnabled] = useState(true);
  const [shippingSaving, setShippingSaving] = useState(false);
  const [shippingStatus, setShippingStatus] = useState("");

  useEffect(() => {
    if (!open) return;

    const loadShippingSettings = async () => {
      try {
        const response = await fetch("/api/site-settings", {
          method: "GET",
          credentials: "include",
        });

        const result = await response.json();
        const shipping = result?.shipping || {};

        setShippingFee(toMoneyInput(shipping.shipping_fee));
        setFreeShippingThreshold(toMoneyInput(shipping.free_shipping_threshold));
        setShippingEnabled(shipping.shipping_enabled !== false);
      } catch {
        setShippingStatus("Kargo ayarları yüklenemedi.");
      }
    };

    loadShippingSettings();
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    revokeUrls(newSlidePreviews);
    setNewSlidePreviews([]);
    setNewSlideFiles([]);
    setShippingStatus("");
    onClose();
  };

  const handleSaveShipping = async () => {
    const shippingFeeValue = Number(shippingFee || 0);
    const freeShippingThresholdValue = Number(freeShippingThreshold || 0);

    if (!Number.isFinite(shippingFeeValue) || shippingFeeValue < 0) {
      setShippingStatus("Kargo ücreti geçerli değil.");
      return;
    }

    if (!Number.isFinite(freeShippingThresholdValue) || freeShippingThresholdValue < 0) {
      setShippingStatus("Ücretsiz kargo alt limiti geçerli değil.");
      return;
    }

    setShippingSaving(true);
    setShippingStatus("");

    try {
      const response = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping: {
            shipping_fee: shippingFeeValue,
            free_shipping_threshold: freeShippingThresholdValue,
            shipping_enabled: shippingEnabled,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Kargo ayarları kaydedilemedi.");
      }

      setShippingStatus("Kargo ayarları kaydedildi.");
    } catch (error: any) {
      setShippingStatus(error?.message || "Kargo ayarları kaydedilemedi.");
    } finally {
      setShippingSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-xl font-black">⚙️ Özel Sayfa Paneli</h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 bg-gray-100 rounded-full font-bold"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase block">
            Kayan Yazı
          </label>
          <input
            type="text"
            value={marquee}
            onChange={(e) => setMarquee(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium"
            placeholder="Örn: Ücretsiz kargo ✦ %20 indirim ✦ ..."
          />
          <button
            type="button"
            onClick={onSaveMarquee}
            className="w-full bg-black text-white py-3 rounded-xl font-bold shadow-md"
          >
            Kayan Yazıyı Kaydet
          </button>
        </div>

        <div className="pt-6 border-t border-gray-100 mt-6">
          <h3 className="text-sm font-black mb-3">🚚 Kargo Ayarları</h3>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-4 mb-5">
            <label className="flex items-center justify-between gap-3 bg-white border border-gray-100 rounded-xl p-3 cursor-pointer">
              <span className="text-xs font-black uppercase tracking-widest text-gray-600">
                Kargo Sistemi Aktif
              </span>
              <input
                type="checkbox"
                checked={shippingEnabled}
                onChange={(event) => setShippingEnabled(event.target.checked)}
                className="w-4 h-4 accent-black"
              />
            </label>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                Kargo Ücreti
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={shippingFee}
                onChange={(event) => setShippingFee(sanitizeMoneyInput(event.target.value))}
                placeholder="Örn: 69.90"
                className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                Ücretsiz Kargo Alt Limiti
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={freeShippingThreshold}
                onChange={(event) => setFreeShippingThreshold(sanitizeMoneyInput(event.target.value))}
                placeholder="Örn: 750"
                className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-black"
              />
            </div>

            {shippingStatus && (
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                {shippingStatus}
              </p>
            )}

            <button
              type="button"
              onClick={handleSaveShipping}
              disabled={shippingSaving}
              className="w-full bg-black text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-50 shadow-md"
            >
              {shippingSaving ? "Kaydediliyor..." : "Kargo Ayarlarını Kaydet"}
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 mt-6">
          <h3 className="text-sm font-black mb-3">🖼️ Slider Yönetimi</h3>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-5">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;

                revokeUrls(newSlidePreviews);

                setNewSlideFiles(files);
                setNewSlidePreviews(files.map((f) => URL.createObjectURL(f)));
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-black file:text-white"
            />

            {newSlidePreviews.length > 0 && (
              <div className="flex gap-2 overflow-x-auto mt-3 pb-2">
                <img
                  src={newSlidePreviews[0]}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  alt=""
                />
              </div>
            )}

            <input
              type="text"
              placeholder="Başlık"
              value={newSlide.title}
              onChange={(e) => setNewSlide({ ...newSlide, title: e.target.value })}
              className="w-full p-3 bg-white border border-gray-200 rounded-xl font-medium text-sm mt-3"
            />

            <input
              type="text"
              placeholder="Alt Yazı"
              value={newSlide.subtitle}
              onChange={(e) => setNewSlide({ ...newSlide, subtitle: e.target.value })}
              className="w-full p-3 bg-white border border-gray-200 rounded-xl font-medium text-sm mt-3"
            />

            <button
              type="button"
              onClick={onAddSlide}
              className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm mt-3"
            >
              + Ekle
            </button>
          </div>

          <div className="space-y-3">
            {dbSlides.map((s) => (
              <div
                key={s.id}
                className="bg-white border border-gray-200 rounded-2xl p-3 flex gap-3"
              >
                <img
                  src={s.image_url}
                  alt="slide"
                  className="w-16 h-16 rounded-xl object-cover"
                />

                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={s.title || ""}
                    onChange={(e) =>
                      setDbSlides((prev) =>
                        prev.map((x) =>
                          x.id === s.id ? { ...x, title: e.target.value } : x
                        )
                      )
                    }
                    placeholder="Başlık"
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium"
                  />

                  <input
                    type="text"
                    value={s.subtitle || ""}
                    onChange={(e) =>
                      setDbSlides((prev) =>
                        prev.map((x) =>
                          x.id === s.id ? { ...x, subtitle: e.target.value } : x
                        )
                      )
                    }
                    placeholder="Alt Yazı"
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium"
                  />

                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => onUpdateSlide(s)}
                      className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-xs font-bold"
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSlide(s.id)}
                      className="flex-1 bg-red-50 text-red-600 py-1.5 rounded-lg text-xs font-bold border border-red-100"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {dbSlides.length === 0 && (
              <div className="bg-gray-50 rounded-2xl p-10 text-center border border-dashed border-gray-200">
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">
                  Henüz slider görseli yok.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-full mt-6 bg-gray-100 text-black py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-gray-200"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
