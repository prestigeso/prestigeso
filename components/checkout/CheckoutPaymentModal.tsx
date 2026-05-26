"use client";

type CheckoutPaymentModalProps = {
  isOpen: boolean;
  iframeUrl: string;
  merchantOid: string;
  onClose: () => void;
};

export default function CheckoutPaymentModal({
  isOpen,
  iframeUrl,
  merchantOid,
  onClose,
}: CheckoutPaymentModalProps) {
  if (!isOpen || !iframeUrl) return null;

  return (
    <div className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full h-full md:h-[90vh] md:max-w-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Güvenli Ödeme
            </p>

            <h2 className="text-lg font-black text-black">
              PayTR Ödeme Formu
            </h2>

            <p className="text-[11px] font-bold text-gray-500 mt-1">
              Sipariş No: {merchantOid}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full font-black hover:bg-gray-200"
            aria-label="Ödeme formunu kapat"
          >
            ✕
          </button>
        </div>

        <iframe
          src={iframeUrl}
          title="PayTR Ödeme Formu"
          className="w-full flex-1 bg-white"
          frameBorder="0"
          scrolling="yes"
        />
      </div>
    </div>
  );
}
