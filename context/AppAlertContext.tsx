"use client";

import { createContext, useContext } from "react";

export type AppToastType = "success" | "error" | "warning" | "info";

export type ShowToastOptions = {
  message: string;
  type?: AppToastType;
  durationMs?: number;
};

export type ShowConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "danger";
};

type AppAlertContextValue = {
  showToast: (options: ShowToastOptions | string, type?: AppToastType) => void;
  showConfirm: (options: ShowConfirmOptions) => Promise<boolean>;
};

export const AppAlertContext = createContext<AppAlertContextValue | undefined>(
  undefined
);

export function useAppAlert() {
  const context = useContext(AppAlertContext);

  if (!context) {
    throw new Error("useAppAlert must be used within AppAlertProvider");
  }

  return context;
}
