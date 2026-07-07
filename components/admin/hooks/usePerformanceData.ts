"use client";

import { useMemo } from "react";

import type { ProductRow, ReviewRow } from "../types";

interface UsePerformanceDataParams {
  dbProducts: ProductRow[];
  dbReviews: ReviewRow[];
  dbAllFavorites: { product_id: number }[];
  dbProductViews: { product_id: number }[];
}

export function usePerformanceData({
  dbProducts,
  dbReviews,
  dbAllFavorites,
  dbProductViews,
}: UsePerformanceDataParams) {
  const favoritesRank = useMemo(() => {
    const favCounts = (dbAllFavorites || []).reduce((acc: Record<number, number>, curr: { product_id: number }) => {
      acc[curr.product_id] = (acc[curr.product_id] || 0) + 1;
      return acc;
    }, {});

    return (dbProducts || [])
      .map((p: ProductRow) => ({ ...p, count: favCounts[p.id] || 0 }))
      .filter((p: ProductRow & { count: number }) => p.count > 0)
      .sort((a: ProductRow & { count: number }, b: ProductRow & { count: number }) => b.count - a.count);
  }, [dbAllFavorites, dbProducts]);

  const viewsRank = useMemo(() => {
    const viewCounts = (dbProductViews || []).reduce((acc: Record<number, number>, curr: { product_id: number }) => {
      acc[curr.product_id] = (acc[curr.product_id] || 0) + 1;
      return acc;
    }, {});

    return (dbProducts || [])
      .map((p: ProductRow) => ({ ...p, count: viewCounts[p.id] || 0 }))
      .filter((p: ProductRow & { count: number }) => p.count > 0)
      .sort((a: ProductRow & { count: number }, b: ProductRow & { count: number }) => b.count - a.count);
  }, [dbProductViews, dbProducts]);

  const reviewsRank = useMemo(() => {
    return (dbProducts || [])
      .map((p: ProductRow) => {
        const pRevs = (dbReviews || []).filter(
          (r: ReviewRow) => String(r.product_id) === String(p.id) && r.is_approved
        );
        const count = pRevs.length;
        const avg = count > 0 ? pRevs.reduce((a: number, r: ReviewRow) => a + r.rating, 0) / count : 0;
        return { ...p, ratingCount: count, ratingAvg: avg };
      })
      .filter((p: ProductRow & { ratingCount: number; ratingAvg: number }) => p.ratingCount > 0)
      .sort((a: ProductRow & { ratingCount: number; ratingAvg: number }, b: ProductRow & { ratingCount: number; ratingAvg: number }) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount);
  }, [dbProducts, dbReviews]);

  return {
    favoritesRank,
    viewsRank,
    reviewsRank,
  };
}
