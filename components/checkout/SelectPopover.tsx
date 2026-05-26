"use client";

import type { SelectPopoverProps } from "@/lib/checkout/checkoutTypes";

export default function SelectPopover<T>({
  search,
  setSearch,
  onClose,
  items,
  getKey,
  getLabel,
  onPick,
  placeholder,
  emptyText = "Sonuç yok",
}: SelectPopoverProps<T>) {
  return (
    <>
      <div className="fixed inset-0 z-[40]" onClick={onClose} />

      <div className="absolute z-[50] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-2">
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="p-3 border-b border-gray-100 outline-none text-sm font-bold bg-gray-50 text-black"
          autoFocus
        />

        <div className="max-h-48 overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <div className="p-3 text-xs font-bold text-gray-400">{emptyText}</div>
          ) : (
            items.map((item) => (
              <button
                type="button"
                key={getKey(item)}
                onClick={() => onPick(item)}
                className="w-full text-left p-3 text-sm font-medium hover:bg-gray-100 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
              >
                {getLabel(item)}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
