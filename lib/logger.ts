import "server-only";
import { sanitizeLogContext, safeLogEventName } from "./logSanitizer";

type LogLevel = "info" | "warn" | "error";

export function logServerEvent(
  level: LogLevel,
  event: string,
  context: Record<string, unknown> = {},
) {
  const safeContext = sanitizeLogContext(context);
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event: safeLogEventName(event),
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
