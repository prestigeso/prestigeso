import { notFound } from "next/navigation";
import ProductDetailClient from "@/components/product/ProductDetailClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Product } from "@/types";

export const revalidate = 60;

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isSafeInteger(productId) || productId <= 0) notFound();
  const { data: product, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();
  if (error || !product) notFound();
  return <ProductDetailClient initialProduct={product as Product} />;
}
