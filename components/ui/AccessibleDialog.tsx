"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Native top-layer dialog supplies focus containment and an inert background. */
export default function AccessibleDialog({
  open, onClose, labelledBy, children, className = "", busy = false,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  className?: string;
  busy?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) return;
    const rememberOpener = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>("button, input, a[href]") : null;
      if (target && !target.closest("dialog")) openerRef.current = target;
    };
    document.addEventListener("click", rememberOpener, true);
    return () => document.removeEventListener("click", rememberOpener, true);
  }, [open]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    // Safari clicks need not focus buttons; async actions may disable their opener.
    const previous = openerRef.current || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-dialog-autofocus]")?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      aria-modal="true"
      aria-busy={busy || undefined}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const dialog = event.currentTarget;
        const targets = Array.from(dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        )).filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
        const first = targets[0];
        const last = targets.at(-1);
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (!targets.includes(document.activeElement as HTMLElement) || document.activeElement === first)) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] border-0 text-black max-h-[90dvh] overflow-y-auto overscroll-contain backdrop:bg-black/60 backdrop:backdrop-blur-sm ${className}`}
    >
      {open ? children : null}
    </dialog>
  );
}
