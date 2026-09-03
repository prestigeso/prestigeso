type BrowserStorageKind = "local" | "session";

function getStorage(kind: BrowserStorageKind) {
  if (typeof window === "undefined") return null;
  return kind === "local" ? window.localStorage : window.sessionStorage;
}

export function safeStorageGet(kind: BrowserStorageKind, key: string) {
  try {
    return getStorage(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function safeStorageSet(
  kind: BrowserStorageKind,
  key: string,
  value: string,
) {
  try {
    getStorage(kind)?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeStorageRemove(kind: BrowserStorageKind, key: string) {
  try {
    getStorage(kind)?.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
