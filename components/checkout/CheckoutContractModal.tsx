"use client";

import DistanceSellingContract from "@/components/contracts/DistanceSellingContract";
import { formatMoney } from "@/lib/checkout/checkoutFormatters";
import type { AddressForm } from "@/lib/checkout/checkoutTypes";
import { BUSINESS_INFO } from "@/lib/businessInfo";
import type { CartItem } from "@/types";

type CheckoutContractModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  cartItems: CartItem[];
  address: AddressForm;
  cartTotal: number;
  couponDiscount: number;
  shippingFee: number;
  finalTotal: number;
};

export default function CheckoutContractModal({
  isOpen,
  onClose,
  onApprove,
  cartItems,
  address,
  cartTotal,
  couponDiscount,
  shippingFee,
  finalTotal,
}: CheckoutContractModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl max-h-[90vh] flex flex-col relative z-10">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
          <h2 className="text-lg font-black uppercase tracking-tight">
            Ön Bilgilendirme ve Mesafeli Satış Sözleşmesi
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full font-bold hover:bg-gray-200"
            aria-label="Sözleşme penceresini kapat"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto pr-2 custom-scrollbar space-y-8">
          <section className="space-y-4 text-sm text-gray-700">
            <div>
              <h3 className="font-black text-black uppercase mb-2">
                Siparişe Özel Ön Bilgilendirme
              </h3>
              <p>
                Satıcı: {BUSINESS_INFO.sellerName} ({BUSINESS_INFO.brand}) ·{" "}
                {BUSINESS_INFO.address} · {BUSINESS_INFO.phoneDisplay} ·{" "}
                {BUSINESS_INFO.email}
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Ürün</th>
                    <th className="p-3 text-center">Adet</th>
                    <th className="p-3 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item) => (
                    <tr
                      key={`${item.id}-${item.variant_id || 0}`}
                      className="border-t border-gray-100"
                    >
                      <td className="p-3">
                        <span className="font-bold text-black">{item.name}</span>
                        {item.variant_label && (
                          <span className="block text-xs text-gray-500">
                            {item.variant_label}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-right font-bold">
                        {formatMoney(item.price * item.quantity)} ₺
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-1">
              <p className="flex justify-between">
                <span>Ara toplam</span>
                <strong>{formatMoney(cartTotal)} ₺</strong>
              </p>
              {couponDiscount > 0 && (
                <p className="flex justify-between">
                  <span>Kupon indirimi</span>
                  <strong>-{formatMoney(couponDiscount)} ₺</strong>
                </p>
              )}
              <p className="flex justify-between">
                <span>Kargo</span>
                <strong>
                  {shippingFee > 0 ? `${formatMoney(shippingFee)} ₺` : "Ücretsiz"}
                </strong>
              </p>
              <p className="flex justify-between pt-2 border-t border-gray-200 text-black">
                <span className="font-black">Vergiler dahil toplam</span>
                <strong>{formatMoney(finalTotal)} ₺</strong>
              </p>
            </div>

            <div className="space-y-2">
              <p>
                <strong className="text-black">Ödeme:</strong> PayTR üzerinden
                banka veya kredi kartı.
              </p>
              <p>
                <strong className="text-black">Teslimat adresi:</strong>{" "}
                {address.firstName} {address.lastName},{" "}
                {address.neighborhood ? `${address.neighborhood}, ` : ""}
                {address.fullAddress}
                {address.district ? `, ${address.district}` : ""}
                {address.city ? ` / ${address.city}` : ""}
              </p>
              <p>
                Ürünler ödeme onayından sonra kargoya hazırlanır ve en geç yasal
                azami süre içinde teslim edilir. Tüketici, yasal istisnalar
                dışında, teslimden itibaren 14 gün içinde cayma hakkına sahiptir.
              </p>
            </div>
          </section>

          <div className="border-t border-gray-200 pt-8">
            <h3 className="font-black text-black uppercase mb-5">
              Mesafeli Satış Sözleşmesi
            </h3>
          <DistanceSellingContract />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onApprove}
            className="bg-black text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md"
          >
            Okudum, Onaylıyorum
          </button>
        </div>
      </div>
    </div>
  );
}
