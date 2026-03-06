"use client";

import type { FormEvent } from "react";
import { revokeUrls } from "../utils";

type Props = {
  open: boolean;
  onClose: () => void;

  // submit
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  creating: boolean;

  // images state (parent'ta tutuluyor)
  files: File[];
  setFiles: (files: File[]) => void;

  previews: string[];
  setPreviews: (urls: string[]) => void;

  moveImage: (index: number, direction: "left" | "right") => void;
};

export default function AddProductModal({
  open,
  onClose,
  onSubmit,
  creating,
  files,
  setFiles,
  previews,
  setPreviews,
  moveImage,
}: Props) {
  if (!open) return null;

  const handleClose = () => {
    revokeUrls(previews);
    setPreviews([]);
    setFiles([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-xl font-black">Yeni Ürün Ekle</h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 bg-gray-100 rounded-full font-bold"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex-1 overflow-y-auto space-y-4 pb-4 pr-2"
        >
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Ürün Adı
            </label>
            <input
              required
              name="name"
              type="text"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium"
            />
          </div>

          {/* ✅ SKU (Zorunlu - Barkoddan bağımsız - Serbest Format) */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              SKU (Zorunlu)
            </label>
            <input
              required
              name="sku"
              type="text"
              placeholder="Örn: YUZUK-01, PRSTG-KOLYE veya 102938"
              onChange={(e) => {
                e.currentTarget.value = e.currentTarget.value.toUpperCase();
              }}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium font-mono tracking-wider outline-none focus:ring-2 focus:ring-black transition-all"
            />
          </div>

          {/* Barkod opsiyonel - SKU’dan bağımsız */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Barkod (Opsiyonel)
            </label>
            <input
              name="barcode"
              type="text"
              placeholder="Örn: 8680..."
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium font-mono text-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">
                Fiyat (₺)
              </label>
              <input
                required
                name="price"
                type="number"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">
                Stok
              </label>
              <input
                required
                name="stock"
                type="number"
                defaultValue="1"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Kategori
            </label>
            <select
              required
              name="category"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium text-black outline-none focus:ring-2 focus:ring-black"
            >
              <option value="Kolyeler">Kolyeler</option>
              <option value="Yüzükler">Yüzükler</option>
              <option value="Bilezikler">Bilezikler</option>
              <option value="Küpeler">Küpeler</option>
              <option value="Setler">Setler</option>
              <option value="Masa Süsleri">Masa Süsleri</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Açıklama
            </label>
            <textarea
              required
              name="description"
              rows={3}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium resize-none"
            />
          </div>

          <div className="bg-gray-50 p-3 border border-gray-200 rounded-xl">
            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">
              Fotoğraflar
            </label>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const picked = Array.from(e.target.files || []);
                if (picked.length === 0) return;

                revokeUrls(previews);
                setFiles(picked);
                setPreviews(picked.map((f) => URL.createObjectURL(f)));
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-black file:text-white"
            />

            {previews.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {previews.map((url, i) => (
                  <div
                    key={i}
                    className="w-full h-20 rounded-lg overflow-hidden border border-gray-200 bg-white relative group"
                  >
                    <span className="absolute top-1 left-1 bg-black text-white text-[10px] px-1.5 py-0.5 rounded-md z-10">
                      {i + 1} {i === 0 && "(Kapak)"}
                    </span>

                    <img src={url} className="w-full h-20 object-cover" alt="" />

                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between px-1">
                      <button
                        type="button"
                        onClick={() => moveImage(i, "left")}
                        disabled={i === 0}
                        className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs disabled:opacity-40"
                        title="Sola al"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(i, "right")}
                        disabled={i === previews.length - 1}
                        className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs disabled:opacity-40"
                        title="Sağa al"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl">
            <input
              type="checkbox"
              name="is_bestseller"
              className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
            />
            <div>
              <span className="font-bold text-sm block text-gray-900">
                Çok Satan
              </span>
            </div>
          </label>

          <button
            type="submit"
            disabled={creating}
            className="w-full bg-black text-white py-4 rounded-xl font-bold mt-4 shadow-lg disabled:opacity-60"
          >
            {creating ? "Ekleniyor..." : "🚀 Ürünü Ekle"}
          </button>
        </form>
      </div>
    </div>
  );
}