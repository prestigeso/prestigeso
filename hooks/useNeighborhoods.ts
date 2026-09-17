"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createLatestRequest } from "@/lib/checkout/latestRequest";
import type { LocationOption } from "@/lib/checkout/checkoutTypes";

export function useNeighborhoods() {
  const requests = useRef(createLatestRequest());
  const districtRef = useRef<LocationOption | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<LocationOption[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  useEffect(() => { const manager = requests.current; return () => manager.cancel(); }, []);

  const reset = useCallback(() => {
    requests.current.cancel();
    districtRef.current = null;
    setNeighborhoods([]);
    setStatus("idle");
  }, []);

  const load = useCallback(async (district: LocationOption) => {
    districtRef.current = district;
    const request = requests.current.start();
    setNeighborhoods([]);
    setStatus("loading");
    try {
      const response = await fetch(`/api/turkiyeapi/neighborhoods?districtId=${encodeURIComponent(district.id)}&limit=1000`, { signal: AbortSignal.any([request.signal, AbortSignal.timeout(12000)]) });
      const json: unknown = await response.json();
      if (!response.ok || !json || typeof json !== "object" ||
          !("status" in json) || json.status !== "OK" || !("data" in json) || !Array.isArray(json.data)) {
        throw new Error("Neighborhood lookup failed");
      }
      const entries = json.data.filter((item): item is LocationOption =>
        Boolean(item && typeof item === "object" && typeof item.name === "string" &&
          (typeof item.id === "number" || typeof item.id === "string")));
      if (entries.length !== json.data.length) throw new Error("Invalid neighborhood response");
      if (!request.isCurrent()) return;
      setNeighborhoods(entries.sort((a, b) => a.name.localeCompare(b.name, "tr")));
      setStatus("ready");
    } catch {
      if (request.isCurrent()) setStatus("error");
    }
  }, []);
  const retry = useCallback(() => districtRef.current ? load(districtRef.current) : Promise.resolve(), [load]);
  return { neighborhoods, status, load, reset, retry };
}
