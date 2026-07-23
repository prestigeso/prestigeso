import type { Instrumentation } from "next";
import { logServerEvent } from "@/lib/logger";

export function register() {
  logServerEvent("info", "application_started", {
    runtime: process.env.NEXT_RUNTIME || "nodejs",
    environment: process.env.NODE_ENV,
  });
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  logServerEvent("error", "unhandled_request_error", {
    error,
    method: request.method,
    path: request.path,
    routeType: context.routeType,
    routePath: context.routePath,
  });
};
