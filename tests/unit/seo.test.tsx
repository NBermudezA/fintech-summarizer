import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-sans" }),
  Geist_Mono: () => ({ variable: "font-mono" }),
}));

const { default: robots, AI_CRAWLERS } = await import("@/app/robots");
const { default: sitemap } = await import("@/app/sitemap");
const { default: manifest } = await import("@/app/manifest");
const layout = await import("@/app/layout");
const { default: PrivacyPage, metadata: privacyMeta } = await import("@/app/privacy/page");
const og = await import("@/app/opengraph-image");
const { buildJsonLd, serializeJsonLd } = await import("@/lib/structured-data");
const { SITE_URL } = await import("@/lib/site");
const { chatTools } = await import("@/app/api/chat/tools");

describe("crawlability (SEO + GEO)", () => {
  it("robots allows search and AI crawlers, hides the API and links the sitemap", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    expect(rules).toContainEqual({ userAgent: "*", allow: "/", disallow: "/api/" });
    expect(rules).toContainEqual({ userAgent: AI_CRAWLERS, allow: "/", disallow: "/api/" });
    expect(AI_CRAWLERS).toEqual(expect.arrayContaining(["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]));
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it("sitemap lists the public pages", () => {
    expect(sitemap().map((e) => e.url)).toEqual([SITE_URL, `${SITE_URL}/privacy`]);
  });

  it("manifest is installable", () => {
    expect(manifest()).toMatchObject({ name: "Fintech Summarizer", display: "standalone" });
  });

  it("layout metadata sets canonical, Open Graph and Twitter cards", () => {
    const m = layout.metadata;
    expect(m.metadataBase?.toString()).toBe(`${SITE_URL}/`);
    expect(m.alternates?.canonical).toBe("/");
    expect(m.openGraph).toMatchObject({ siteName: "Fintech Summarizer", type: "website" });
    expect(m.twitter).toMatchObject({ card: "summary_large_image" });
    expect(layout.viewport.themeColor).toBe("#050505");
    expect(privacyMeta.alternates?.canonical).toBe("/privacy");
  });

  it("root layout renders html/body with font variables", () => {
    const el = layout.default({ children: <p>child</p> });
    expect(el.type).toBe("html");
    expect(el.props.lang).toBe("en");
    expect(el.props.className).toContain("font-sans");
  });

  it("JSON-LD describes a free WebApplication with an FAQ and is XSS-safe", () => {
    const ld = buildJsonLd() as { "@graph": Array<Record<string, unknown>> };
    expect(ld["@graph"][0]).toMatchObject({ "@type": "WebApplication", isAccessibleForFree: true });
    expect((ld["@graph"][1].mainEntity as unknown[]).length).toBe(4);
    expect(serializeJsonLd({ x: "</script><script>" })).not.toContain("</script>");
  });

  it("Open Graph image is 1200x630 PNG", () => {
    expect(og.size).toEqual({ width: 1200, height: 630 });
    expect(og.contentType).toBe("image/png");
    expect(og.alt).toMatch(/Fintech Summarizer/);
    const res = og.default();
    expect(res).toBeInstanceOf(Response);
  });

  it("privacy page carries the legal disclaimer in both languages", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { name: "Not financial advice" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Privacidad y aviso legal" })).toBeInTheDocument();
    expect(screen.getAllByText(/NewsAPI\.org/).length).toBeGreaterThanOrEqual(2);
  });

  it("chat tool registry stays a valid (empty) ToolSet", () => {
    expect(chatTools).toEqual({});
  });
});
