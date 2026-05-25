"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useAppAlert } from "@/context/AppAlertContext";
import { revokeUrls } from "../utils";

const MAX_ADDED_IMAGE_COUNT = 8;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function validateImageFiles(files: File[]) {
  if (files.length > MAX_ADDED_IMAGE_COUNT) {
    return `Tek seferde en fazla ${MAX_ADDED_IMAGE_COUNT} fotoğraf seçebilirsiniz.`;
  }

  const invalidType = files.find((file) => !ALLOWED_IMAGE_TYPES.includes(file.type));

  if (invalidType) {
    return "Sadece JPG, PNG, WEBP veya AVIF formatında görsel yükleyebilirsiniz. SVG/HTML kabul edilmez.";
  }

  const oversized = files.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);

  if (oversized) {
    return `Her fotoğraf en fazla ${MAX_IMAGE_SIZE_MB} MB olmalıdır.`;
  }

  return null;
}

type Props = {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  editingProduct: any | null;
  setEditingProduct: (p: any | null) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  onDelete: (id: number) => void;
  moveImage: (index: number, direction: "left" | "right") => void;
  removeImage: (url: string) => void;
  addFiles: File[];
  setAddFiles: (files: File[]) => void;
  addPreviews: string[];
  setAddPreviews: (urls: string[]) => void;
  addUploading: boolean;
  onAddMoreImages: () => void;
};

export default function EditProductModal({
  open,
  onClose,
  loading,
  editingProduct,
  setEditingProduct,
  onSubmit,
  saving,
  onDelete,
  moveImage,
  removeImage,
  addFiles,
  setAddFiles,
  addPreviews,
  setAddPreviews,
  addUploading,
  onAddMoreImages,
}: Props) {
  const { showToast } = useAppAlert();

  if (!open) return null;

  const handleClose = () => {
    revokeUrls(addPreviews);
    setAddPreviews([]);
    setAddFiles([]);
    setEditingProduct(null);
    onClose();
  };

  const handleAddFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    const errorMessage = validateImageFiles(files);

    if (errorMessage) {
      event.currentTarget.value = "";
      showToast(errorMessage, "warning");
      return;
    }

    revokeUrls(addPreviews);
    setAddFiles(files);
    setAddPreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const copyText = async (text: string) => {
    const value = (text || "").toString();

    if (!value) {
      showToast("Kopyalanacak değer bulunamadı.", "warning");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      showToast("Kopyalandı.", "success");
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = value;
        el.style.position = "fixed";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        showToast("Kopyalandı.", "success");
      } catch {
        showToast("Kopyalama başarısız.", "error");
      }
    }
  };

  const skuValue = (editingProduct?.["SKU"] || "").toString();
  const barcodeValue = (editingProduct?.barcode ?? "").toString();

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black">Ürün Düzenle</h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 bg-gray-100 rounded-full font-bold"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {loading && (
          <p className="text-center text-gray-400 font-bold uppercase tracking-widest text-xs py-10">
            Yükleniyor...
          </p>
        )}

        {!loading && editingProduct && (
          <>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  SKU (Zorunlu)
                </p>
                <button
                  type="button"
                  onClick={() => copyText(skuValue)}
                  className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-3 py-1.5 rounded-lg active:scale-95"
                  title="SKU kopyala"
                >
                  Kopyala
                </button>
              </div>

              <input
                required
                type="text"
                value={skuValue}
                maxLength={64}
                onChange={(event) =>
                  setEditingProduct({
                    ...editingProduct,
                    ["SKU"]: event.target.value.toUpperCase(),
                  })
                }
                placeholder="Örn: YUZUK-01, PRSTG-KOLYE veya 102938"
                className="w-full p-3 bg-white border border-gray-200 rounded-xl font-medium font-mono tracking-wider outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="mt-2">
              <p className="text-xs font-black text-gray-700 mb-2">
                📸 Fotoğrafları Sırala
              </p>

              {Array.isArray(editingProduct.images) && editingProduct.images.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {editingProduct.images.map((url: string, idx: number) => (
                    <div
                      key={idx}
                      className="relative border border-gray-200 rounded-xl overflow-hidden bg-gray-50 group"
                    >
                      <img src={url} className="w-full h-20 object-cover" alt="" />

                      {idx === 0 && (
                        <span className="absolute top-1 left-1 bg-black text-white text-[10px] px-2 py-0.5 rounded z-10">
                          Kapak
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="absolute top-1 right-1 bg-white/90 text-red-600 text-xs font-black w-6 h-6 rounded-full z-10 shadow-sm"
                        title="Sil"
                      >
                        ✕
                      </button>

                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between px-1">
                        <button
                          type="button"
                          onClick={() => moveImage(idx, "left")}
                          disabled={idx === 0}
                          className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs shadow-md disabled:opacity-30"
                          title="Sola al"
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(idx, "right")}
                          disabled={idx === editingProduct.images.length - 1}
                          className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs shadow-md disabled:opacity-30"
                          title="Sağa al"
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Fotoğraf yok.</p>
              )}
            </div>

            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-3">
              <p className="text-xs font-black mb-2">➕ Galeriye Fotoğraf Ekle</p>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                onChange={handleAddFilesChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-black file:text-white"
              />

              <p className="text-[10px] text-gray-400 font-bold mt-2">
                Tek seferde en fazla {MAX_ADDED_IMAGE_COUNT} görsel. Her görsel en fazla {MAX_IMAGE_SIZE_MB} MB. SVG/HTML kabul edilmez.
              </p>

              {addPreviews.length > 0 && (
                <div className="flex gap-2 overflow-x-auto mt-3 pb-2">
                  {addPreviews.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      alt=""
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={addUploading || addFiles.length === 0}
                onClick={onAddMoreImages}
                className="w-full mt-2 bg-blue-600 text-white py-2 rounded-xl font-bold text-sm disabled:opacity-60"
              >
                {addUploading ? "Yükleniyor..." : "Ekle (Sonra Kaydet)"}
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4 mt-5">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Başlık
                </label>
                <input
                  required
                  type="text"
                  maxLength={140}
                  value={editingProduct.name || ""}
                  onChange={(event) =>
                    setEditingProduct({ ...editingProduct, name: event.target.value })
                  }
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Fiyat (₺)
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  max="9999999"
                  step="0.01"
                  value={editingProduct.price ?? ""}
                  onChange={(event) =>
                    setEditingProduct({ ...editingProduct, price: event.target.value })
                  }
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Barkod (Opsiyonel)
                  </label>
                  <button
                    type="button"
                    onClick={() => copyText(barcodeValue)}
                    className="text-[10px] font-black uppercase tracking-widest bg-gray-900 text-white px-3 py-1.5 rounded-lg active:scale-95 disabled:opacity-40"
                    title="Barkod kopyala"
                    disabled={!barcodeValue}
                  >
                    Kopyala
                  </button>
                </div>

                <input
                  type="text"
                  maxLength={80}
                  value={barcodeValue}
                  onChange={(event) =>
                    setEditingProduct({ ...editingProduct, barcode: event.target.value })
                  }
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium font-mono text-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Kategori
                </label>
                <select
                  value={editingProduct.category || "Kolyeler"}
                  onChange={(event) =>
                    setEditingProduct({ ...editingProduct, category: event.target.value })
                  }
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium text-black focus:ring-2 focus:ring-black outline-none transition-all"
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
                  Stok
                </label>
                <input
                  type="number"
                  min="0"
                  max="999999"
                  step="1"
                  value={editingProduct.stock ?? 0}
                  onChange={(event) =>
                    setEditingProduct({
                      ...editingProduct,
                      stock: Number(event.target.value),
                    })
                  }
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Açıklama
                </label>
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={editingProduct.description ?? ""}
                  onChange={(event) =>
                    setEditingProduct({
                      ...editingProduct,
                      description: event.target.value,
                    })
                  }
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium resize-none"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl">
                <input
                  type="checkbox"
                  checked={!!editingProduct.is_bestseller}
                  onChange={(event) =>
                    setEditingProduct({
                      ...editingProduct,
                      is_bestseller: event.target.checked,
                    })
                  }
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
                disabled={saving}
                className="w-full bg-black text-white py-4 rounded-xl font-bold mt-2 disabled:opacity-60"
              >
                {saving ? "Kaydediliyor..." : "KAYDET"}
              </button>
            </form>

            <div className="pt-4 border-t border-gray-100 mt-4">
              <button
                type="button"
                onClick={() => onDelete(editingProduct.id)}
                className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold text-sm border border-red-100"
              >
                🗑️ Ürünü Kaldır
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
