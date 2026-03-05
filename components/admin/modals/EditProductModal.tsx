"use client";

import type { FormEvent } from "react";
import { revokeUrls } from "../utils";

type Props = {
  open: boolean;

  // modal close
  onClose: () => void;

  // loading state (product fetch)
  loading: boolean;

  // product state (parent’ta tutuluyor)
  editingProduct: any | null;
  setEditingProduct: (p: any | null) => void;

  // submit / delete
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  onDelete: (id: number) => void;

  // gallery operations
  moveImage: (index: number, direction: "left" | "right") => void;
  removeImage: (url: string) => void;

  // add more images
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
  if (!open) return null;

  const handleClose = () => {
    // local preview cleanup
    revokeUrls(addPreviews);
    setAddPreviews([]);
    setAddFiles([]);
    setEditingProduct(null);
    onClose();
  };

  const copyText = async (text: string) => {
    const value = (text || "").toString();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      alert("Kopyalandı ✅");
    } catch {
      // Fallback
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
        alert("Kopyalandı ✅");
      } catch {
        alert("Kopyalama başarısız ❌");
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
            {/* ✅ SKU KARTI (En Üstte + Kopyala) */}
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
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    ["SKU"]: e.target.value.toUpperCase(),
                  })
                }
                placeholder="PRS-KLY-0001"
                pattern="^[A-Z]{3}-[A-Z]{3}-\d{4}$"
                title="SKU formatı: PRS-KLY-0001 (3 harf - 3 harf - 4 rakam)"
                className="w-full p-3 bg-white border border-gray-200 rounded-xl font-medium font-mono tracking-wider outline-none focus:ring-2 focus:ring-black"
              />

              <p className="text-[10px] text-gray-400 mt-2 font-bold">
                Format: <span className="font-mono">PRS-KLY-0001</span>
              </p>
            </div>

            {/* GALERİ SIRALAMA */}
            <div className="mt-2">
              <p className="text-xs font-black text-gray-700 mb-2">
                📸 Fotoğrafları Sırala
              </p>

              {Array.isArray(editingProduct.images) &&
              editingProduct.images.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {editingProduct.images.map((url: string, idx: number) => (
                    <div
                      key={idx}
                      className="relative border border-gray-200 rounded-xl overflow-hidden bg-gray-50 group"
                    >
                      <img
                        src={url}
                        className="w-full h-20 object-cover"
                        alt=""
                      />

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

            {/* GALERİYE FOTO EKLE */}
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-3">
              <p className="text-xs font-black mb-2">➕ Galeriye Fotoğraf Ekle</p>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;

                  // önce eskileri temizle
                  revokeUrls(addPreviews);

                  setAddFiles(files);
                  setAddPreviews(files.map((f) => URL.createObjectURL(f)));
                }}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-black file:text-white"
              />

              {addPreviews.length > 0 && (
                <div className="flex gap-2 overflow-x-auto mt-3 pb-2">
                  {addPreviews.map((u, i) => (
                    <img
                      key={i}
                      src={u}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      alt=""
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={addUploading}
                onClick={onAddMoreImages}
                className="w-full mt-2 bg-blue-600 text-white py-2 rounded-xl font-bold text-sm disabled:opacity-60"
              >
                {addUploading ? "Yükleniyor..." : "Ekle (Sonra Kaydet)"}
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={onSubmit} className="space-y-4 mt-5">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Başlık
                </label>
                <input
                  required
                  type="text"
                  value={editingProduct.name || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
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
                  value={editingProduct.price ?? ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, price: e.target.value })
                  }
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium"
                />
              </div>

              {/* Barkod opsiyonel + Kopyala */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Barkod (Opsiyonel)
                  </label>
                  <button
                    type="button"
                    onClick={() => copyText(barcodeValue)}
                    className="text-[10px] font-black uppercase tracking-widest bg-gray-900 text-white px-3 py-1.5 rounded-lg active:scale-95"
                    title="Barkod kopyala"
                    disabled={!barcodeValue}
                    style={{ opacity: barcodeValue ? 1 : 0.4 }}
                  >
                    Kopyala
                  </button>
                </div>

                <input
                  type="text"
                  value={barcodeValue}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, barcode: e.target.value })
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
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, category: e.target.value })
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
                  value={editingProduct.stock ?? 0}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      stock: Number(e.target.value),
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
                  value={editingProduct.description ?? ""}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 font-medium resize-none"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl">
                <input
                  type="checkbox"
                  checked={!!editingProduct.is_bestseller}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      is_bestseller: e.target.checked,
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