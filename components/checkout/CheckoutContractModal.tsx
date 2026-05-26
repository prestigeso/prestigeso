"use client";

import DistanceSellingContract from "@/components/contracts/DistanceSellingContract";

type CheckoutContractModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
};

export default function CheckoutContractModal({
  isOpen,
  onClose,
  onApprove,
}: CheckoutContractModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl max-h-[90vh] flex flex-col relative z-10">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
          <h2 className="text-lg font-black uppercase tracking-tight">
            Mesafeli Satış Sözleşmesi
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

        <div className="overflow-y-auto pr-2 custom-scrollbar">
          <DistanceSellingContract />
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
