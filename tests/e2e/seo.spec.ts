import { expect, test } from "@playwright/test";

test.describe("SEO / GEO / headers", () => {
  test("head has canonical, OG, Twitter and JSON-LD", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https:\/\/.+/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    const ld = await page.locator('script[type="application/ld+json"]').textContent();
    expect(JSON.parse(ld!)["@graph"][0]["@type"]).toBe("WebApplication");
  });

  test("robots, sitemap, manifest, llms.txt and OG image are served", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("User-Agent: GPTBot");
    expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);

    expect(await (await request.get("/sitemap.xml")).text()).toContain("/privacy");
    expect((await request.get("/manifest.webmanifest")).ok()).toBe(true);
    expect(await (await request.get("/llms.txt")).text()).toContain("# Fintech Summarizer");

    const og = await request.get("/opengraph-image");
    expect(og.ok()).toBe(true);
    expect(og.headers()["content-type"]).toBe("image/png");
  });

  test("security headers are set and the framework is not advertised", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("API rejects cross-origin and malformed requests", async ({ request }) => {
    const cross = await request.post("/api/summarize", {
      headers: { origin: "https://evil.example" },
      data: { ticker: "AAPL", provider: "anthropic" },
    });
    expect(cross.status()).toBe(403);
    const bad = await request.post("/api/summarize", { data: { ticker: "<script>", provider: "anthropic" } });
    expect(bad.status()).toBe(400);
  });

  test("unknown routes return 404", async ({ request }) => {
    expect((await request.get("/definitely-not-here")).status()).toBe(404);
  });
});
