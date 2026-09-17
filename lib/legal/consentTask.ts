/** Stop optional telemetry immediately when permission is withdrawn. */
export function createConsentBoundTask(options: {
  allowed: () => boolean;
  run: (signal: AbortSignal) => Promise<void>;
  onRevoke?: () => void;
}) {
  let controller: AbortController | null = null;
  let completed = false;
  let disposed = false;
  const sync = () => {
    if (disposed) return;
    if (!options.allowed()) {
      controller?.abort();
      controller = null;
      completed = false;
      options.onRevoke?.();
      return;
    }
    if (completed || controller) return;
    const current = new AbortController();
    controller = current;
    void options
      .run(current.signal)
      .then(() => {
        if (!current.signal.aborted) completed = true;
      })
      .catch(() => {
        // Optional telemetry must never break purchasing or auto-retry after denial.
      })
      .finally(() => {
        if (controller === current) controller = null;
      });
  };
  return {
    sync,
    dispose: () => {
      disposed = true;
      controller?.abort();
      controller = null;
    },
  };
}
