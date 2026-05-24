"use client";

import { ReactNode, useCallback, useRef, useState } from "react";
import {
  AppAlertContext,
  type AppToastType,
  type ShowConfirmOptions,
  type ShowToastOptions,
} from "@/context/AppAlertContext";

type ToastState = {
  id: number;
  message: string;
  type: AppToastType;
};

type ConfirmState = ShowConfirmOptions & {
  resolve: (value: boolean) => void;
};

const DEFAULT_TOAST_DURATION_MS = 2600;

function AppToast({ toast }: { toast: ToastState }) {
  const icon = toast.type === "success" ? "✓" : "!";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[1300] w-[calc(100%-24px)] sm:w-auto sm:min-w-[520px] sm:max-w-[760px] rounded-2xl bg-white text-black border border-gray-200 px-4 sm:px-6 py-3 shadow-2xl flex items-center justify-center gap-3"
    >
      <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm font-black shrink-0">
        {icon}
      </span>

      <span className="text-xs sm:text-sm font-black leading-snug sm:leading-none text-center">
        {toast.message}
      </span>
    </div>
  );
}

function AppConfirmModal({
  confirm,
  onClose,
}: {
  confirm: ConfirmState;
  onClose: (value: boolean) => void;
}) {
  const danger = confirm.tone === "danger";

  return (
    <div className="fixed inset-0 z-[1400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 p-6 animate-in zoom-in duration-150">
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0 ${
              danger ? "bg-red-50 text-red-600" : "bg-black text-white"
            }`}
          >
            !
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-black uppercase tracking-tight">
              {confirm.title}
            </h2>

            {confirm.message && (
              <p className="text-sm font-medium text-gray-500 leading-relaxed mt-2">
                {confirm.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-7">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="rounded-xl border border-gray-200 bg-white text-black py-3 text-xs font-black uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all"
          >
            {confirm.cancelText || "İptal"}
          </button>

          <button
            type="button"
            onClick={() => onClose(true)}
            className={`rounded-xl py-3 text-xs font-black uppercase tracking-widest text-white active:scale-95 transition-all ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-black hover:bg-gray-800"
            }`}
          >
            {confirm.confirmText || "Onayla"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppAlertProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (options: ShowToastOptions | string, type: AppToastType = "info") => {
      const normalizedOptions: ShowToastOptions =
        typeof options === "string" ? { message: options, type } : options;

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }

      setToast({
        id: Date.now(),
        message: normalizedOptions.message,
        type: normalizedOptions.type || type || "info",
      });

      toastTimerRef.current = setTimeout(() => {
        setToast(null);
      }, normalizedOptions.durationMs || DEFAULT_TOAST_DURATION_MS);
    },
    []
  );

  const showConfirm = useCallback((options: ShowConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirm({
        ...options,
        resolve,
      });
    });
  }, []);

  const closeConfirm = (value: boolean) => {
    if (confirm) {
      confirm.resolve(value);
    }

    setConfirm(null);
  };

  return (
    <AppAlertContext.Provider value={{ showToast, showConfirm }}>
      {children}
      {toast && <AppToast toast={toast} />}
      {confirm && <AppConfirmModal confirm={confirm} onClose={closeConfirm} />}
    </AppAlertContext.Provider>
  );
}
