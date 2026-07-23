"use client";

type Props = {
  message: string;
  onClose: () => void;
  onLogin: () => void;
};

export default function ProductAuthModal({ message, onClose, onLogin }: Props) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl animate-in zoom-in">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
            🔐
          </div>
          <h2 className="mb-3 text-lg font-black uppercase tracking-tight text-black">
            Giriş Gerekli
          </h2>
          <p className="mb-6 text-sm font-medium leading-relaxed text-gray-600">
            {message}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-gray-100 py-3 text-xs font-black uppercase tracking-widest text-black hover:bg-gray-200"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="w-full rounded-xl bg-black py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-gray-800"
            >
              Giriş Yap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
