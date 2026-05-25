"use client";

import { useEffect, useMemo, useState } from "react";
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

type Props = {
  open: boolean;
  onClose: () => void;
};

type CouponForm = {
  code: string;
  name: string;
  description: string;
  discountType: "percent" | "fixed";
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  startsAt: string;
  endsAt: string;
  usageLimitTotal: string;
  usageLimitPerUser: string;
  isActive: boolean;
  isMemberOnly: boolean;
};

const initialForm: CouponForm = {
  code: "",
  name: "",
  description: "",
  discountType: "fixed",
  discountValue: "",
  minOrderAmount: "0",
  maxDiscountAmount: "",
  startsAt: "",
  endsAt: "",
  usageLimitTotal: "",
  usageLimitPerUser: "1",
  isActive: true,
  isMemberOnly: true,
};

const MAX_CODE_LENGTH = 40;
const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 250;

function normalizeCouponCode(value: string) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, MAX_CODE_LENGTH);
}

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

function inputDateToIso(value: string, endOfDay = false) {
  if (!value) return null;

  const suffix = endOfDay ? "T23:59:59" : "T00:00:00";
  const date = new Date(`${value}${suffix}`);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function getDiscountLabel(coupon: CouponRow) {
  if (coupon.discount_type === "fixed") {
    return `${formatMoney(coupon.discount_value)} TL`;
  }

  return `%${formatMoney(coupon.discount_value)}`;
}

function validateCouponForm(form: CouponForm) {
  const code = normalizeCouponCode(form.code);
  const name = form.name.trim();
  const discountValue = Number(form.discountValue);
  const minOrderAmount = Number(form.minOrderAmount || 0);
  const maxDiscountAmount = form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null;
  const usageLimitTotal = form.usageLimitTotal ? Number(form.usageLimitTotal) : null;
  const usageLimitPerUser = Number(form.usageLimitPerUser || 1);

  if (!code) return "Kupon kodu zorunludur.";
  if (!name) return "Kupon adı zorunludur.";
  if (name.length > MAX_NAME_LENGTH) return `Kupon adı en fazla ${MAX_NAME_LENGTH} karakter olabilir.`;
  if (form.description.length > MAX_DESCRIPTION_LENGTH) return `Açıklama en fazla ${MAX_DESCRIPTION_LENGTH} karakter olabilir.`;
  if (!Number.isFinite(discountValue) || discountValue <= 0) return "İndirim değeri 0'dan büyük olmalıdır.";
  if (form.discountType === "percent" && discountValue > 89) return "Yüzde indirim 1-89 arası olmalıdır.";
  if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) return "Minimum sepet tutarı 0 veya daha büyük olmalıdır.";
  if (maxDiscountAmount !== null && (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount < 0)) return "Maksimum indirim tutarı 0 veya daha büyük olmalıdır.";
  if (usageLimitTotal !== null && (!Number.isFinite(usageLimitTotal) || usageLimitTotal < 0)) return "Toplam kullanım limiti 0 veya daha büyük olmalıdır.";
  if (!Number.isFinite(usageLimitPerUser) || usageLimitPerUser < 1) return "Kullanıcı başı kullanım limiti en az 1 olmalıdır.";
  if (form.startsAt && form.endsAt && form.endsAt < form.startsAt) return "Bitiş tarihi başlangıç tarihinden önce olamaz.";

  return null;
}

function buildPayload(form: CouponForm) {
  return {
    code: normalizeCouponCode(form.code),
    name: form.name.trim(),
    description: form.description.trim() || null,
    discount_type: form.discountType,
    discount_value: Number(form.discountValue),
    min_order_amount: Number(form.minOrderAmount || 0),
    max_discount_amount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
    starts_at: inputDateToIso(form.startsAt),
    ends_at: inputDateToIso(form.endsAt, true),
    usage_limit_total: form.usageLimitTotal ? Number(form.usageLimitTotal) : null,
    usage_limit_per_user: Number(form.usageLimitPerUser || 1),
    is_active: form.isActive,
    is_member_only: form.isMemberOnly,
  };
}

export default function CouponsModal({ open, onClose }: Props) {
  const { showToast, showConfirm } = useAppAlert();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CouponForm>(initialForm);

  const loadCoupons = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/coupons", {
        method: "GET",
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Kuponlar yüklenemedi.");
      }

      setCoupons((result?.coupons || []) as CouponRow[]);
    } catch (error: any) {
      showToast(error?.message || "Kuponlar yüklenemedi.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filteredCoupons = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    if (!query) return coupons;

    return coupons.filter((coupon) => {
      const code = (coupon.code || "").toLocaleLowerCase("tr-TR");
      const name = (coupon.name || "").toLocaleLowerCase("tr-TR");
      const description = (coupon.description || "").toLocaleLowerCase("tr-TR");

      return code.includes(query) || name.includes(query) || description.includes(query);
    });
  }, [coupons, search]);

  const resetForm = () => setForm(initialForm);

  const handleClose = () => {
    resetForm();
    setSearch("");
    onClose();
  };

  const updateForm = (key: keyof CouponForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateCoupon = async () => {
    const validationError = validateCouponForm(form);

    if (validationError) {
      showToast(validationError, "warning");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Kupon oluşturulamadı.");
      }

      showToast("Kupon oluşturuldu.", "success");
      resetForm();
      await loadCoupons();
    } catch (error: any) {
      showToast(error?.message || "Kupon oluşturulamadı.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCoupon = async (coupon: CouponRow) => {
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: coupon.id, action: "toggle" }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Kupon durumu güncellenemedi.");
      }

      setCoupons((prev) =>
        prev.map((item) => (item.id === coupon.id ? (result.coupon as CouponRow) : item))
      );

      showToast(result.coupon?.is_active ? "Kupon aktif edildi." : "Kupon pasif edildi.", "success");
    } catch (error: any) {
      showToast(error?.message || "Kupon durumu güncellenemedi.", "error");
    }
  };

  const handleDeleteCoupon = async (coupon: CouponRow) => {
    const ok = await showConfirm({
      title: "Kupon silinsin mi?",
      message: `${coupon.code} kodlu kuponu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      confirmText: "Sil",
      cancelText: "Vazgeç",
      tone: "danger",
    });

    if (!ok) return;

    try {
      const response = await fetch("/api/admin/coupons", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: coupon.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Kupon silinemedi.");
      }

      setCoupons((prev) => prev.filter((item) => item.id !== coupon.id));
      showToast("Kupon silindi.", "success");
    } catch (error: any) {
      showToast(error?.message || "Kupon silinemedi.", "error");
    }
  };

  const fillExampleCoupon = () => {
    setForm({
      code: "YENI50",
      name: "50 TL Hoş Geldin İndirimi",
      description: "500 TL ve üzeri alışverişlerde kullanılabilir.",
      discountType: "fixed",
      discountValue: "50",
      minOrderAmount: "500",
      maxDiscountAmount: "",
      startsAt: new Date().toISOString().slice(0, 10),
      endsAt: "",
      usageLimitTotal: "100",
      usageLimitPerUser: "1",
      isActive: true,
      isMemberOnly: true,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-6xl rounded-3xl p-6 md:p-8 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
          <div>
            <h2 className="text-2xl font-black flex items-center gap-3 tracking-tight">
              <span>🎟️</span> Kupon Yönetimi
            </h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
              Üye kuponları, limitler ve indirim kuralları
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-10 h-10 bg-gray-100 rounded-full font-bold hover:bg-gray-200"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 overflow-y-auto pr-1 custom-scrollbar">
          <div className="w-full lg:w-[410px] bg-gray-50 border border-gray-100 rounded-3xl p-5 h-max">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">
                Yeni Kupon
              </h3>

              <button
                type="button"
                onClick={fillExampleCoupon}
                className="text-[10px] font-black uppercase tracking-widest bg-white border border-gray-200 px-3 py-2 rounded-xl hover:border-black"
              >
                Örnek Doldur
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Kupon Kodu
                </label>
                <input
                  value={form.code}
                  maxLength={MAX_CODE_LENGTH}
                  onChange={(event) => updateForm("code", normalizeCouponCode(event.target.value))}
                  placeholder="Örn: PRESTIGE50"
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl font-black uppercase tracking-widest outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Kupon Adı
                </label>
                <input
                  value={form.name}
                  maxLength={MAX_NAME_LENGTH}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="Örn: 50 TL İndirim"
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Açıklama
                </label>
                <textarea
                  value={form.description}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  onChange={(event) => updateForm("description", event.target.value)}
                  placeholder="Checkout ve profil sayfasında görünür."
                  rows={3}
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl font-medium resize-none outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Tip
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(event) => updateForm("discountType", event.target.value as "percent" | "fixed")}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-black"
                  >
                    <option value="fixed">TL İndirim</option>
                    <option value="percent">% İndirim</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Değer
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={form.discountType === "percent" ? 89 : 999999}
                    step="0.01"
                    value={form.discountValue}
                    onChange={(event) => updateForm("discountValue", event.target.value)}
                    placeholder={form.discountType === "fixed" ? "50" : "10"}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Min. Sepet
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minOrderAmount}
                    onChange={(event) => updateForm("minOrderAmount", event.target.value)}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Maks. İndirim
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.maxDiscountAmount}
                    onChange={(event) => updateForm("maxDiscountAmount", event.target.value)}
                    placeholder="Opsiyonel"
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Başlangıç
                  </label>
                  <input
                    type="date"
                    value={form.startsAt}
                    onChange={(event) => updateForm("startsAt", event.target.value)}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Bitiş
                  </label>
                  <input
                    type="date"
                    value={form.endsAt}
                    min={form.startsAt || undefined}
                    onChange={(event) => updateForm("endsAt", event.target.value)}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Toplam Limit
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.usageLimitTotal}
                    onChange={(event) => updateForm("usageLimitTotal", event.target.value)}
                    placeholder="Sınırsız"
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Kullanıcı Limiti
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.usageLimitPerUser}
                    onChange={(event) => updateForm("usageLimitPerUser", event.target.value)}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => updateForm("isActive", event.target.checked)}
                    className="w-4 h-4 accent-black"
                  />
                  <span className="text-xs font-black uppercase tracking-widest">Aktif</span>
                </label>

                <label className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isMemberOnly}
                    onChange={(event) => updateForm("isMemberOnly", event.target.checked)}
                    className="w-4 h-4 accent-black"
                  />
                  <span className="text-xs font-black uppercase tracking-widest">Üyeye Özel</span>
                </label>
              </div>

              <button
                type="button"
                onClick={handleCreateCoupon}
                disabled={saving}
                className="w-full bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg disabled:opacity-50 active:scale-95 transition-all"
              >
                {saving ? "Oluşturuluyor..." : "Kupon Oluştur"}
              </button>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">
                  Mevcut Kuponlar
                </h3>
                <p className="text-[10px] font-bold text-gray-400 mt-1">
                  Toplam {coupons.length} kupon
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Kupon ara..."
                  className="w-full sm:w-56 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black"
                />

                <button
                  type="button"
                  onClick={loadCoupons}
                  className="bg-white border border-gray-200 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-black"
                >
                  Yenile
                </button>
              </div>
            </div>

            {loading ? (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-16 text-center">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">
                  Kuponlar yükleniyor...
                </p>
              </div>
            ) : filteredCoupons.length === 0 ? (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-16 text-center">
                <span className="text-4xl opacity-40 block mb-4">🎟️</span>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Kupon bulunamadı.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredCoupons.map((coupon) => {
                  const usedCount = Number(coupon.used_count || 0);
                  const totalLimit = coupon.usage_limit_total ?? null;
                  const isExpired = coupon.ends_at ? new Date(coupon.ends_at).getTime() < Date.now() : false;

                  return (
                    <div
                      key={coupon.id}
                      className={`bg-white rounded-3xl p-5 border-2 shadow-sm transition-all ${
                        coupon.is_active && !isExpired
                          ? "border-gray-100 hover:border-black"
                          : "border-gray-100 opacity-70 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-lg font-black text-black tracking-tight">
                              {coupon.code}
                            </h4>
                            <span
                              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                coupon.is_active && !isExpired
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-200 text-gray-500"
                              }`}
                            >
                              {isExpired ? "Süresi Bitti" : coupon.is_active ? "Aktif" : "Pasif"}
                            </span>
                          </div>

                          <p className="text-sm font-bold text-gray-700 mt-1 line-clamp-1">
                            {coupon.name}
                          </p>
                        </div>

                        <div className="bg-black text-white rounded-2xl px-4 py-3 text-center shrink-0">
                          <p className="text-base font-black leading-none">{getDiscountLabel(coupon)}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-70">
                            {coupon.discount_type === "fixed" ? "TL" : "Yüzde"}
                          </p>
                        </div>
                      </div>

                      {coupon.description && (
                        <p className="text-xs text-gray-500 font-medium leading-relaxed mb-4 line-clamp-2">
                          {coupon.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Min. Sepet
                          </p>
                          <p className="text-xs font-black text-black mt-1">
                            {formatMoney(coupon.min_order_amount)} TL
                          </p>
                        </div>

                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Maks. İndirim
                          </p>
                          <p className="text-xs font-black text-black mt-1">
                            {coupon.max_discount_amount ? `${formatMoney(coupon.max_discount_amount)} TL` : "Yok"}
                          </p>
                        </div>

                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Kullanım
                          </p>
                          <p className="text-xs font-black text-black mt-1">
                            {usedCount} / {totalLimit === null ? "∞" : totalLimit}
                          </p>
                        </div>

                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Bitiş
                          </p>
                          <p className="text-xs font-black text-black mt-1 line-clamp-1">
                            {formatDate(coupon.ends_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => handleToggleCoupon(coupon)}
                          className="flex-1 bg-gray-50 border border-gray-200 text-black py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-black"
                        >
                          {coupon.is_active ? "Pasif Yap" : "Aktif Yap"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCoupon(coupon)}
                          className="flex-1 bg-red-50 border border-red-100 text-red-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-red-300"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
