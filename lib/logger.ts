import "server-only";

type LogLevel = "info" | "warn" | "error";

const SENSITIVE_KEY = /authorization|cookie|password|secret|token|key|salt/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 3) return "[truncated]";
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message.slice(0, 500),
      stack: process.env.NODE_ENV === "development" ? value.stack : undefined,
    };
  }
  if (Array.isArray(value))
    return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 30)
        .map(([key, item]) => [
          key,
          SENSITIVE_KEY.test(key) ? "[redacted]" : sanitize(item, depth + 1),
        ]),
    );
  }
  return typeof value === "string" ? value.slice(0, 1000) : value;
}

export function logServerEvent(
  level: LogLevel,
  event: string,
  context: Record<string, unknown> = {},
) {
  const safeContext = sanitize(context);
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event: event.slice(0, 100),
    ...(safeContext &&
    typeof safeContext === "object" &&
    !Array.isArray(safeContext)
      ? safeContext
      : {}),
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}
