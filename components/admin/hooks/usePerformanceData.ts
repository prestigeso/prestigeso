"use client";

import { useMemo } from "react";

import type { ProductRow } from "../types";

export type ProductMetric = {
  product_id: number;
  favorite_count: number | string;
  view_count: number | string;
  rating_avg: number | string;
  review_count: number | string;
};

interface UsePerformanceDataParams {
  dbProducts: ProductRow[];
  productMetrics: ProductMetric[];
}

export function usePerformanceData({
  dbProducts,
  productMetrics,
}: UsePerformanceDataParams) {
  const metricsByProduct = useMemo(
    () =>
      new Map(
        productMetrics.map((metric) => [Number(metric.product_id), metric]),
      ),
    [productMetrics],
  );

  const favoritesRank = useMemo(() => {
    return (dbProducts || [])
      .map((p: ProductRow) => ({
        ...p,
        count: Number(metricsByProduct.get(p.id)?.favorite_count || 0),
      }))
      .filter((p: ProductRow & { count: number }) => p.count > 0)
      .sort(
        (
          a: ProductRow & { count: number },
          b: ProductRow & { count: number },
        ) => b.count - a.count,
      );
  }, [dbProducts, metricsByProduct]);

  const viewsRank = useMemo(() => {
    return (dbProducts || [])
      .map((p: ProductRow) => ({
        ...p,
        count: Number(metricsByProduct.get(p.id)?.view_count || 0),
      }))
      .filter((p: ProductRow & { count: number }) => p.count > 0)
      .sort(
        (
          a: ProductRow & { count: number },
          b: ProductRow & { count: number },
        ) => b.count - a.count,
      );
  }, [dbProducts, metricsByProduct]);

  const reviewsRank = useMemo(() => {
    return (dbProducts || [])
      .map((p: ProductRow) => {
        const metric = metricsByProduct.get(p.id);
        const count = Number(metric?.review_count || 0);
        const avg = Number(metric?.rating_avg || 0);
        return { ...p, ratingCount: count, ratingAvg: avg };
      })
      .filter(
        (p: ProductRow & { ratingCount: number; ratingAvg: number }) =>
          p.ratingCount > 0,
      )
      .sort(
        (
          a: ProductRow & { ratingCount: number; ratingAvg: number },
          b: ProductRow & { ratingCount: number; ratingAvg: number },
        ) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount,
      );
  }, [dbProducts, metricsByProduct]);

  return {
    favoritesRank,
    viewsRank,
    reviewsRank,
  };
}
