/** Aborting alone is insufficient: a cached/fake fetch can still resolve late. */
export function createLatestRequest() {
  let version = 0;
  let controller: AbortController | undefined;
  return {
    cancel() { version += 1; controller?.abort(); },
    start() {
      controller?.abort();
      controller = new AbortController();
      const current = ++version;
      return { signal: controller.signal, isCurrent: () => current === version };
    },
  };
}
