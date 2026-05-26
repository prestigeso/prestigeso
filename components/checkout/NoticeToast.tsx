"use client";

import type { NoticeType } from "@/lib/checkout/checkoutTypes";

type NoticeToastProps = {
  notice: {
    type: NoticeType;
    message: string;
  };
};

export default function NoticeToast({ notice }: NoticeToastProps) {
  const tone =
    notice.type === "success"
      ? "bg-green-600 text-white"
      : notice.type === "error"
      ? "bg-black text-white"
      : "bg-gray-900 text-white";

  const iconTone =
    notice.type === "success" ? "bg-white text-green-700" : "bg-white text-black";

  const icon = notice.type === "success" ? "✓" : "!";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[1200] w-[calc(100%-24px)] sm:w-auto sm:min-w-[520px] sm:max-w-[720px] rounded-2xl px-4 sm:px-6 py-3 shadow-2xl flex items-center justify-center gap-3 ${tone}`}
    >
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${iconTone}`}
      >
        {icon}
      </span>

      <span className="text-xs sm:text-sm font-black leading-snug sm:leading-none text-center sm:text-left">
        {notice.message}
      </span>
    </div>
  );
}
