import { test as base, expect } from "@playwright/test";

// Local builds may still point at the production database. Storefront checks
// must not record analytics, send email, create orders or start real payments.
export const test = base.extend({
  context: async ({ context }, provideContext) => {
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (["GET", "HEAD", "OPTIONS"].includes(request.method())) {
        await route.continue();
        return;
      }
      const path = new URL(request.url()).pathname;
      if (["/api/page_views", "/api/product-views", "/api/telemetry/client-error"].includes(path)) {
        await route.fulfill({ status: 204 });
        return;
      }
      await route.abort("blockedbyclient");
    });
    await provideContext(context);
  },
});

test.use({ serviceWorkers: "block" });
export { expect };
