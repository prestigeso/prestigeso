"use client";

import type { CheckoutMode, CouponRow } from "@/lib/checkout/checkoutTypes";
import { formatMoney } from "@/lib/checkout/checkoutFormatters";

type CheckoutSummaryProps = {
  cartTotal: number;
  couponDiscount: number;
  selectedCoupon: CouponRow | null;
  shippingFee: number;
  remainingForFreeShipping: number;
  finalTotal: number;
  agreeTerms: boolean;
  setAgreeTerms: (value: boolean) => void;
  setIsContractModalOpen: (value: boolean) => void;
  handleCompleteOrder: () => void | Promise<void>;
  isProcessing: boolean;
  paytrIframeUrl: string;
  checkoutMode: CheckoutMode | null;
};

export default function CheckoutSummary({
  cartTotal,
  couponDiscount,
  selectedCoupon,
  shippingFee,
  remainingForFreeShipping,
  finalTotal,
  agreeTerms,
  setAgreeTerms,
  setIsContractModalOpen,
  handleCompleteOrder,
  isProcessing,
  paytrIframeUrl,
  checkoutMode,
}: CheckoutSummaryProps) {
  return (
    <div className="w-full lg:w-[400px]">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm lg:sticky lg:top-24">
        <h3 className="text-lg font-black uppercase tracking-tighter mb-6 pb-2 border-b border-gray-50">
          Sipariş Özeti
        </h3>

        <div className="space-y-4 mb-8">
          <div className="flex justify-between text-xs font-bold text-gray-400">
            <span>Ara Toplam</span>
            <span>{formatMoney(cartTotal)} ₺</span>
          </div>

          {couponDiscount > 0 && selectedCoupon && (
            <div className="flex justify-between items-start text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
              <div>
                <span className="block">Kupon İndirimi</span>
                <span className="block text-[10px] font-black uppercase tracking-widest mt-1">
                  {selectedCoupon.code}
                </span>
              </div>
              <span>-{formatMoney(couponDiscount)} ₺</span>
            </div>
          )}

          <div className={`flex justify-between text-xs font-bold ${shippingFee > 0 ? "text-gray-500" : "text-green-600"}`}>
            <span>Kargo</span>
            <span>{shippingFee > 0 ? `${formatMoney(shippingFee)} ₺` : "ÜCRETSİZ"}</span>
          </div>

          {remainingForFreeShipping > 0 && (
            <div className="text-[10px] font-black text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-3 uppercase tracking-widest leading-relaxed">
              Ücretsiz kargo için {formatMoney(remainingForFreeShipping)} ₺ daha alışveriş yapın.
            </div>
          )}

          <div className="flex justify-between items-end pt-4 border-t border-gray-50">
            <span className="text-sm font-black uppercase tracking-widest text-gray-400">Toplam</span>
            <span className="text-3xl font-black">{formatMoney(finalTotal)} ₺</span>
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(event) => setAgreeTerms(event.target.checked)}
            className="mt-0.5 accent-black w-4 h-4 flex-shrink-0"
          />

          <span className="text-[10px] text-gray-500 font-medium leading-tight">
            <b>Ön Bilgilendirme Koşulları</b>&apos;nı ve{" "}
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                setIsContractModalOpen(true);
              }}
              className="text-black font-bold border-b border-black"
            >
              Mesafeli Satış Sözleşmesi
            </button>
            &apos;ni okudum, onaylıyorum.
          </span>
        </label>

        <button
          type="button"
          onClick={handleCompleteOrder}
          disabled={isProcessing || !!paytrIframeUrl || !checkoutMode}
          className="w-full bg-black text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
        >
          {isProcessing ? "Ödeme Başlatılıyor..." : paytrIframeUrl ? "Ödeme Formu Açıldı" : "Ödemeye Geç 💳"}
        </button>
      </div>
    </div>
  );
}
