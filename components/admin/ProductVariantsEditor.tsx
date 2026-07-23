"use client";

import { useEffect, useState } from "react";
import { useAppAlert } from "@/context/AppAlertContext";

type VariantForm = {
  id?: number;
  sku: string;
  barcode: string;
  optionName: string;
  optionValue: string;
  price: number | "";
  stock: number;
  is_active: boolean;
};

const emptyVariant = (): VariantForm => ({
  sku: "",
  barcode: "",
  optionName: "Beden",
  optionValue: "",
  price: "",
  stock: 0,
  is_active: true,
});

export default function ProductVariantsEditor({ productId }: { productId: number }) {
  const { showToast } = useAppAlert();
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/variants?productId=${productId}`, { credentials: "include" })
      .then((response) => response.json())
      .then((result) =>
        setVariants(
          (result.variants || []).map((row: Record<string, unknown>) => {
            const options = (row.option_values || {}) as Record<string, unknown>;
            const [optionName, optionValue] = Object.entries(options)[0] || ["Beden", ""];
            return {
              id: Number(row.id),
              sku: String(row.sku || ""),
              barcode: String(row.barcode || ""),
              optionName,
              optionValue: String(optionValue),
              price: row.price == null ? "" : Number(row.price),
              stock: Number(row.stock || 0),
              is_active: row.is_active !== false,
            };
          }),
        ),
      )
      .catch(() => setVariants([]));
  }, [productId]);

  const update = (index: number, patch: Partial<VariantForm>) =>
    setVariants((current) =>
      current.map((variant, position) =>
        position === index ? { ...variant, ...patch } : variant,
      ),
    );

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/variants", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variants }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Varyantlar kaydedilemedi.");
      showToast("Varyantlar kaydedildi.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Varyantlar kaydedilemedi.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase">Ürün varyantları</h3>
        <button type="button" onClick={() => setVariants((rows) => [...rows, emptyVariant()])} className="text-xs font-black underline">
          Varyant ekle
        </button>
      </div>
      {variants.map((variant, index) => (
        <div key={variant.id || `new-${index}`} className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3">
          <input value={variant.optionName} onChange={(e) => update(index, { optionName: e.target.value })} placeholder="Özellik (Beden)" className="rounded-lg border p-2 text-xs" />
          <input value={variant.optionValue} onChange={(e) => update(index, { optionValue: e.target.value })} placeholder="Değer (M)" className="rounded-lg border p-2 text-xs" />
          <input value={variant.sku} onChange={(e) => update(index, { sku: e.target.value })} placeholder="SKU" className="rounded-lg border p-2 text-xs" />
          <input value={variant.barcode} onChange={(e) => update(index, { barcode: e.target.value })} placeholder="Barkod" className="rounded-lg border p-2 text-xs" />
          <input type="number" min="0" value={variant.price} onChange={(e) => update(index, { price: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="Özel fiyat" className="rounded-lg border p-2 text-xs" />
          <input type="number" min="0" step="1" value={variant.stock} onChange={(e) => update(index, { stock: Math.max(0, Math.floor(Number(e.target.value))) })} placeholder="Stok" className="rounded-lg border p-2 text-xs" />
          <button type="button" onClick={() => setVariants((rows) => rows.filter((_, position) => position !== index))} className="col-span-2 text-left text-xs font-bold text-red-600">Varyantı kaldır</button>
        </div>
      ))}
      <button type="button" disabled={saving} onClick={() => void save()} className="w-full rounded-xl border border-black py-2 text-xs font-black uppercase disabled:opacity-50">
        {saving ? "Kaydediliyor..." : "Varyantları kaydet"}
      </button>
    </section>
  );
}
