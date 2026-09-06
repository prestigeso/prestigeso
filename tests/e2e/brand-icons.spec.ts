import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("public HTML advertises and serves PrestigeSO branding assets", async ({ request }) => {
  // Use HTTP only: rendering the client would create a visit in the shared DB.
  const home = await request.get("/");
  expect(home.ok()).toBeTruthy();
  const html = await home.text();
  const links = html.match(/<link\b[^>]*>/g) || [];
  const iconLinks = links.filter((link) => /rel="(?:icon|apple-touch-icon)"/.test(link));
  expect(iconLinks.some((link) => /href="\/favicon\.ico(?:[?\"])/.test(link))).toBeTruthy();
  expect(iconLinks.some((link) => /href="\/icon\.png(?:[?\"])/.test(link) && /sizes="96x96"/.test(link))).toBeTruthy();
  expect(iconLinks.some((link) => /rel="apple-touch-icon"/.test(link) && /sizes="180x180"/.test(link))).toBeTruthy();
  expect(links.some((link) => /rel="manifest"/.test(link) && /href="\/manifest\.json"/.test(link))).toBeTruthy();

  const favicon = await request.get("/favicon.ico");
  expect(favicon.ok()).toBeTruthy();
  expect(await favicon.body()).toEqual(await readFile("app/favicon.ico"));

  for (const path of ["/icon.png", "/apple-icon.png", "/icons/icon-192.png", "/icons/icon-512.png"]) {
    const response = await request.get(path);
    expect(response.ok(), path).toBeTruthy();
    expect(response.headers()["content-type"], path).toContain("image/png");
  }
  const manifest = await request.get("/manifest.json");
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).name).toBe("PrestigeSO");
});
