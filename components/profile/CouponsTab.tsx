"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppAlert } from "@/context/AppAlertContext";

type CouponRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number | string;
  min_order_amount: number | string;
  max_discount_amount?: number | string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit_total?: number | null;
  usage_limit_per_user?: number | null;
  used_count?: number | null;
  is_active: boolean;
  is_member_only: boolean;
  created_at?: string;
};

type CouponUsageRow = {
  id: string;
  coupon_id: string;
  user_id: string;
  order_id?: number | null;
  coupon_code: string;
  discount_amount: number | string;
  created_at?: string;
};

function formatMoney(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string | null) {
  if (!value) return "Süresiz";

  try {
    return new Date(value).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "Süresiz";
  }
}

function getCouponLabel(coupon: CouponRow) {
  if (coupon.discount_type === "fixed") {
    return `${formatMoney(coupon.discount_value)} TL`;
  }

  return `%${formatMoney(coupon.discount_value)}`;
}

function getCouponLongLabel(coupon: CouponRow) {
  if (coupon.discount_type === "fixed") {
    return `${formatMoney(coupon.discount_value)} TL İndirim`;
  }

  const maxDiscount = Number(coupon.max_discount_amount || 0);
  if (maxDiscount > 0) {
    return `%${formatMoney(coupon.discount_value)} İndirim / Maks. ${formatMoney(maxDiscount)} TL`;
  }

  return `%${formatMoney(coupon.discount_value)} İndirim`;
}

export default function CouponsTab() {
  const { showToast } = useAppAlert();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [usages, setUsages] = useState<CouponUsageRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<"available" | "used">("available");

  useEffect(() => {
    const loadCoupons = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setUser(null);
        setCoupons([]);
        setUsages([]);
        setLoading(false);
        return;
      }

      setUser(session.user);

      const [{ data: couponData, error: couponError }, { data: usageData, error: usageError }] =
        await Promise.all([
          supabase.from("coupons").select("*").order("created_at", { ascending: false }),
          supabase
            .from("coupon_usages")
            .select("*")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false }),
        ]);

      if (couponError) {
        console.error("Kuponlar yüklenemedi:", couponError);
        showToast("Kuponlar yüklenemedi.", "error");
      }

      if (usageError) {
        console.error("Kupon kullanımları yüklenemedi:", usageError);
      }

      setCoupons((couponData || []) as CouponRow[]);
      setUsages((usageData || []) as CouponUsageRow[]);
      setLoading(false);
    };

    loadCoupons();
  }, [showToast]);

  const usageCountsByCouponId = useMemo(() => {
    return usages.reduce((acc: Record<string, number>, usage) => {
      acc[usage.coupon_id] = (acc[usage.coupon_id] || 0) + 1;
      return acc;
    }, {});
  }, [usages]);

  const availableCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      const usageCount = usageCountsByCouponId[coupon.id] || 0;
      const limit = Number(coupon.usage_limit_per_user || 1);
      return usageCount < limit;
    });
  }, [coupons, usageCountsByCouponId]);

  const usedCoupons = useMemo(() => {
    return usages.map((usage) => {
      const coupon = coupons.find((item) => item.id === usage.coupon_id);
      return { usage, coupon };
    });
  }, [coupons, usages]);

  const copyCouponCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast(`${code} kupon kodu kopyalandı.`, "success");
    } catch {
      showToast("Kupon kodu kopyalanamadı.", "error");
    }
  };

  if (loading) {
    return (
      <div className="animate-in fade-in duration-300">
        <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">
          İndirim Kuponlarım
        </h3>

        <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <p className="text-gray-400 font-black uppercase tracking-widest text-xs animate-pulse">
            Kuponlar yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="animate-in fade-in duration-300">
        <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">
          İndirim Kuponlarım
        </h3>

        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200 relative overflow-hidden">
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border border-gray-200" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border border-gray-200" />
          <span className="text-4xl mb-4 opacity-50">🎟️</span>
          <p className="text-gray-400 font-black uppercase tracking-widest text-xs text-center px-6">
            Kuponlarınızı görmek için giriş yapmalısınız.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b-2 border-gray-100 pb-4">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight text-black">
            İndirim Kuponlarım
          </h3>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
            PrestigeSO üyelerine özel fırsatlar
          </p>
        </div>

        <div className="flex bg-gray-50 border border-gray-200 rounded-2xl p-1">
          <button
            type="button"
            onClick={() => setActiveFilter("available")}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeFilter === "available" ? "bg-black text-white shadow-sm" : "text-gray-400"
            }`}
          >
            Kullanılabilir
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("used")}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeFilter === "used" ? "bg-black text-white shadow-sm" : "text-gray-400"
            }`}
          >
            Kullanılmış
          </button>
        </div>
      </div>

      {activeFilter === "available" && (
        <>
          {availableCoupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200 relative overflow-hidden">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border border-gray-200" />
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border border-gray-200" />
              <span className="text-4xl mb-4 opacity-50">🎟️</span>
              <p className="text-gray-400 font-black uppercase tracking-widest text-xs text-center px-6">
                Şu an aktif bir kuponunuz bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableCoupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="bg-white border-2 border-gray-100 hover:border-black rounded-3xl p-5 shadow-sm transition-all relative overflow-hidden"
                >
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full border border-gray-200" />
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full border border-gray-200" />

                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Kupon Kodu
                      </p>
                      <h4 className="text-lg font-black text-black tracking-tight mt-1">
                        {coupon.code}
                      </h4>
                    </div>

                    <div className="bg-black text-white rounded-2xl px-4 py-3 text-center shrink-0">
                      <p className="text-lg font-black leading-none">{getCouponLabel(coupon)}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-70">
                        İndirim
                      </p>
                    </div>
                  </div>

                  <h5 className="text-sm font-black text-black mb-2">{coupon.name}</h5>

                  {coupon.description && (
                    <p className="text-xs text-gray-500 font-medium leading-relaxed mb-4">
                      {coupon.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        Min. Sepet
                      </p>
                      <p className="text-xs font-black text-black mt-1">
                        {formatMoney(coupon.min_order_amount)} TL
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        Geçerlilik
                      </p>
                      <p className="text-xs font-black text-black mt-1 line-clamp-1">
                        {formatDate(coupon.ends_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                    <p className="text-[10px] font-bold text-gray-400 leading-relaxed">
                      {getCouponLongLabel(coupon)} checkout aşamasında uygulanabilir.
                    </p>

                    <button
                      type="button"
                      onClick={() => copyCouponCode(coupon.code)}
                      className="bg-black text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shrink-0"
                    >
                      Kopyala
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeFilter === "used" && (
        <>
          {usedCoupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200 relative overflow-hidden">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border border-gray-200" />
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border border-gray-200" />
              <span className="text-4xl mb-4 opacity-50">🧾</span>
              <p className="text-gray-400 font-black uppercase tracking-widest text-xs text-center px-6">
                Henüz kullanılmış kuponunuz yok.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {usedCoupons.map(({ usage, coupon }) => (
                <div
                  key={usage.id}
                  className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm"
                >
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {usage.coupon_code}
                    </p>
                    <h4 className="text-sm font-black text-black mt-1">
                      {coupon?.name || "Kullanılmış Kupon"}
                    </h4>
                    <p className="text-[10px] font-bold text-gray-400 mt-1">
                      Kullanım tarihi: {formatDate(usage.created_at)}
                    </p>
                  </div>

                  <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-right">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Sağlanan İndirim
                    </p>
                    <p className="text-sm font-black text-black mt-1">
                      -{formatMoney(usage.discount_amount)} TL
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
