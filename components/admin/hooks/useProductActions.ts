"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { adminDb } from "../adminDb";
import {
  deleteStorageUrls,
  uploadToStorageAndGetPublicUrl,
  revokeUrls,
} from "../utils";
import { getErrorMessage } from "@/lib/utils";

import type { ProductRow } from "../types";
import type {
  ShowToastOptions,
  AppToastType,
  ShowConfirmOptions,
} from "@/context/AppAlertContext";

function normalizeSku(input: string | number | null | undefined) {
  return (input ?? "").toString().trim().toUpperCase();
}

interface UseProductActionsParams {
  dbProducts: ProductRow[];
  loadAllData: () => Promise<void>;
  showToast: (options: ShowToastOptions | string, type?: AppToastType) => void;
  showConfirm: (options: ShowConfirmOptions) => Promise<boolean>;
}

export function useProductActions({
  dbProducts,
  loadAllData,
  showToast,
  showConfirm,
}: UseProductActionsParams) {
  const [creating, setCreating] = useState(false);
  const [newProductFiles, setNewProductFiles] = useState<File[]>([]);
  const [newProductPreviews, setNewProductPreviews] = useState<string[]>([]);

  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editAddFiles, setEditAddFiles] = useState<File[]>([]);
  const [editAddPreviews, setEditAddPreviews] = useState<string[]>([]);
  const [editAddUploading, setEditAddUploading] = useState(false);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);
  const [pendingUploadedUrls, setPendingUploadedUrls] = useState<string[]>([]);

  useEffect(() => {
    if (editingProduct || pendingUploadedUrls.length === 0) return;
    const urls = pendingUploadedUrls;
    setPendingUploadedUrls([]);
    void deleteStorageUrls(urls).catch(() => undefined);
  }, [editingProduct, pendingUploadedUrls]);

  // ── Image reorder (new product) ──────────────────────────────
  const moveNewImage = (index: number, direction: "left" | "right") => {
    const files = [...newProductFiles];
    const previews = [...newProductPreviews];

    if (direction === "left" && index > 0) {
      [files[index], files[index - 1]] = [files[index - 1], files[index]];
      [previews[index], previews[index - 1]] = [
        previews[index - 1],
        previews[index],
      ];
    }

    if (direction === "right" && index < files.length - 1) {
      [files[index], files[index + 1]] = [files[index + 1], files[index]];
      [previews[index], previews[index + 1]] = [
        previews[index + 1],
        previews[index],
      ];
    }

    setNewProductFiles(files);
    setNewProductPreviews(previews);
  };

  // ── Image reorder (edit product) ─────────────────────────────
  const moveEditImage = (index: number, direction: "left" | "right") => {
    if (!editingProduct) return;

    const images: string[] = Array.isArray(editingProduct.images)
      ? [...editingProduct.images]
      : [];

    if (direction === "left" && index > 0) {
      [images[index], images[index - 1]] = [images[index - 1], images[index]];
    }

    if (direction === "right" && index < images.length - 1) {
      [images[index], images[index + 1]] = [images[index + 1], images[index]];
    }

    setEditingProduct((prev) =>
      prev ? { ...prev, images, image: images[0] || "" } : null,
    );
  };

  const removeImageFromGallery = (url: string) => {
    if (!editingProduct) return;
    const images: string[] = Array.isArray(editingProduct.images)
      ? editingProduct.images
      : [];
    const next = images.filter((x) => x !== url);
    setRemovedImageUrls((current) => [...new Set([...current, url])]);
    setEditingProduct((prev) =>
      prev ? { ...prev, images: next, image: next[0] || "" } : null,
    );
  };

  // ── Open edit ────────────────────────────────────────────────
  const openEditProduct = async (id: number) => {
    setEditLoading(true);
    setEditingProduct(null);
    revokeUrls(editAddPreviews);
    setEditAddFiles([]);
    setEditAddPreviews([]);
    setRemovedImageUrls([]);
    setPendingUploadedUrls([]);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();
    setEditLoading(false);

    if (error) {
      showToast("Ürün detayı çekilemedi: " + error.message, "error");
      return;
    }

    const row = data as ProductRow;
    const arr = Array.isArray(row.images) ? row.images : [];
    const normalizedImages =
      arr.length > 0 ? arr : row.image ? [row.image] : [];

    setEditingProduct({
      ...row,
      ["SKU"]: normalizeSku(row?.["SKU"]),
      images: normalizedImages,
      image: normalizedImages[0] || "",
    });
  };

  // ── Add more images to existing product ──────────────────────
  const handleAddMoreImagesToProduct = async () => {
    if (!editingProduct) return;

    if (editAddFiles.length === 0) {
      showToast("Eklemek için en az 1 fotoğraf seçin.", "warning");
      return;
    }

    setEditAddUploading(true);

    try {
      const urls: string[] = [];
      for (const file of editAddFiles) {
        const url = await uploadToStorageAndGetPublicUrl(file, "product_extra");
        urls.push(url);
      }

      const images: string[] = Array.isArray(editingProduct.images)
        ? editingProduct.images
        : [];
      const next = [...images, ...urls];
      setPendingUploadedUrls((current) => [...current, ...urls]);

      setEditingProduct((prev) =>
        prev ? { ...prev, images: next, image: next[0] || "" } : null,
      );
      revokeUrls(editAddPreviews);
      setEditAddFiles([]);
      setEditAddPreviews([]);
      showToast(
        "Fotoğraflar eklendi. Kaydet butonuna basmayı unutmayın.",
        "success",
      );
    } catch (err: unknown) {
      showToast(
        "Fotoğraf eklenemedi: " +
          (err instanceof Error ? err.message : "Bilinmeyen hata"),
        "error",
      );
    } finally {
      setEditAddUploading(false);
    }
  };

  // ── Update product ───────────────────────────────────────────
  const handleUpdateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProduct) return;

    const sku = normalizeSku(editingProduct?.["SKU"]);
    if (!sku) {
      showToast("SKU zorunludur.", "warning");
      return;
    }

    const skuDuplicate = dbProducts.find(
      (p: ProductRow) =>
        normalizeSku(p["SKU"]) === sku &&
        String(p.id) !== String(editingProduct.id),
    );
    if (skuDuplicate) {
      showToast(`Bu SKU başka bir ürüne ait: ${skuDuplicate.name}`, "warning");
      return;
    }

    setSaving(true);
    const images: string[] = Array.isArray(editingProduct.images)
      ? editingProduct.images
      : [];
    const payload: Partial<ProductRow> = {
      ["SKU"]: sku,
      name: editingProduct.name,
      price: Number(editingProduct.price),
      category: editingProduct.category,
      stock: Number(editingProduct.stock ?? 0),
      is_bestseller: !!editingProduct.is_bestseller,
      description: editingProduct.description ?? "",
      images,
      image: images[0] || "",
      barcode: (editingProduct.barcode ?? "").toString().trim() || null,
    };

    const { error } = await adminDb({
      action: "update",
      table: "products",
      data: payload,
      filters: [{ column: "id", op: "eq", value: editingProduct.id }],
    });
    setSaving(false);

    if (error) {
      showToast("Kaydetme hatası: " + error, "error");
      return;
    }

    showToast("Ürün kaydedildi.", "success");
    const deletedUrls = removedImageUrls;
    setRemovedImageUrls([]);
    setPendingUploadedUrls([]);
    await deleteStorageUrls(deletedUrls).catch(() => undefined);
    setEditingProduct(null);
    loadAllData();
  };

  // ── Delete product ───────────────────────────────────────────
  const handleDeleteProduct = async (id: number) => {
    const product = dbProducts.find((item) => item.id === id);
    const productImages = product
      ? [
          ...(Array.isArray(product.images) ? product.images : []),
          product.image || "",
        ]
      : [];
    const ok = await showConfirm({
      title: "Ürün silinsin mi?",
      message:
        "Bu ürünü kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      confirmText: "Sil",
      cancelText: "Vazgeç",
      tone: "danger",
    });
    if (!ok) return;

    const { error } = await adminDb({
      action: "delete",
      table: "products",
      filters: [{ column: "id", op: "eq", value: id }],
    });
    if (error) {
      showToast("Silinemedi: " + error, "error");
      return;
    }

    showToast("Ürün silindi.", "success");
    await deleteStorageUrls(productImages).catch(() => undefined);
    setEditingProduct(null);
    loadAllData();
  };

  // ── Add product ──────────────────────────────────────────────
  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const sku = normalizeSku(
      (form.elements.namedItem("sku") as HTMLInputElement).value,
    );

    if (!sku) {
      showToast("SKU zorunludur.", "warning");
      return;
    }

    const skuDuplicate = dbProducts.find(
      (p: ProductRow) => normalizeSku(p["SKU"]) === sku,
    );
    if (skuDuplicate) {
      showToast(`Bu SKU başka bir ürüne ait: ${skuDuplicate.name}`, "warning");
      return;
    }

    const price = Number(
      (form.elements.namedItem("price") as HTMLInputElement).value,
    );
    const category = (form.elements.namedItem("category") as HTMLSelectElement)
      .value;
    const stock = Number(
      (form.elements.namedItem("stock") as HTMLInputElement).value,
    );
    const barcode = (form.elements.namedItem("barcode") as HTMLInputElement)
      .value;
    const description = (
      form.elements.namedItem("description") as HTMLTextAreaElement
    ).value;
    const is_bestseller = (
      form.elements.namedItem("is_bestseller") as HTMLInputElement
    ).checked;

    if (newProductFiles.length === 0) {
      showToast("Lütfen en az bir ürün görseli seçin.", "warning");
      return;
    }

    setCreating(true);

    const urls: string[] = [];
    try {
      for (const file of newProductFiles) {
        const url = await uploadToStorageAndGetPublicUrl(file, "product");
        urls.push(url);
      }

      const { error } = await adminDb({
        action: "insert",
        table: "products",
        data: {
          ["SKU"]: sku,
          name,
          price,
          category,
          stock,
          barcode: barcode?.trim() || null,
          is_bestseller,
          description,
          images: urls,
          image: urls[0] || "",
          discount_price: 0,
        },
      });

      if (error) throw error;
      revokeUrls(newProductPreviews);
      setNewProductFiles([]);
      setNewProductPreviews([]);
      showToast("Ürün eklendi.", "success");
      loadAllData();

      return true; // signals caller to close modal
    } catch (err: unknown) {
      await deleteStorageUrls(urls).catch(() => undefined);
      showToast(
        "Ürün eklenemedi: " +
          (err instanceof Error ? err.message : "Bilinmeyen hata"),
        "error",
      );
      return false;
    } finally {
      setCreating(false);
    }
  };

  const handleInlineUpdate = async (
    id: number,
    field: "price" | "stock",
    value: number,
  ) => {
    try {
      const { error } = await adminDb({
        action: "update",
        table: "products",
        data: { [field]: value },
        filters: [{ column: "id", op: "eq", value: id }],
      });

      if (error) throw new Error(error);

      await loadAllData();
      showToast(
        `${field === "price" ? "Fiyat" : "Stok"} başarıyla güncellendi.`,
        "success",
      );
    } catch (error: unknown) {
      showToast("Güncelleme hatası: " + getErrorMessage(error), "error");
    }
  };

  return {
    // State
    creating,
    newProductFiles,
    setNewProductFiles,
    newProductPreviews,
    setNewProductPreviews,
    editingProduct,
    setEditingProduct,
    editLoading,
    saving,
    editAddFiles,
    setEditAddFiles,
    editAddPreviews,
    setEditAddPreviews,
    editAddUploading,

    // Actions
    moveNewImage,
    moveEditImage,
    removeImageFromGallery,
    openEditProduct,
    handleAddMoreImagesToProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    handleAddProduct,
    handleInlineUpdate,
  };
}
