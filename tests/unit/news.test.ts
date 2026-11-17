// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import {
  buildNewsQuery,
  decodeEntities,
  EXCLUDED_DOMAINS,
  fetchArticles,
  NewsProviderError,
  normalizeArticles,
  sanitizeUrl,
} from "@/lib/news";

describe("decodeEntities", () => {
  it("decodes the common HTML entities NewsAPI leaks into URLs and titles", () => {
    expect(decodeEntities("a&amp;b &lt;x&gt; &quot;q&quot; it&#39;s it&#039;s &apos; &nbsp;")).toBe(
      `a&b <x> "q" it's it's '  `,
    );
  });

  it("leaves unknown entities alone", () => {
    expect(decodeEntities("&copy; &unknown;")).toBe("&copy; &unknown;");
  });
});

describe("sanitizeUrl", () => {
  it("accepts http and https and decodes &amp; in query strings", () => {
    expect(sanitizeUrl("https://slashdot.org/f.pl?op=view&amp;id=1")).toBe(
      "https://slashdot.org/f.pl?op=view&id=1",
    );
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("rejects dangerous or malformed URLs", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeUrl("data:text/html,hi")).toBeNull();
    expect(sanitizeUrl("not a url")).toBeNull();
    expect(sanitizeUrl("")).toBeNull();
    expect(sanitizeUrl(null)).toBeNull();
    expect(sanitizeUrl(undefined)).toBeNull();
  });
});

describe("buildNewsQuery", () => {
  it("adds the company name for known tickers and strips parentheticals", () => {
    expect(buildNewsQuery("aapl")).toMatch(/^\("AAPL" OR "Apple"\) AND \(/);
    expect(buildNewsQuery("GOOGL")).toContain('"Alphabet"');
  });

  it("quotes unknown symbols and still requires a finance term", () => {
    const q = buildNewsQuery("xyz");
    expect(q.startsWith('"XYZ" AND (')).toBe(true);
    expect(q).toContain("stock");
  });
});

describe("normalizeArticles", () => {
  const base = {
    title: "Title &amp; more",
    description: "Desc &quot;x&quot;",
    url: "https://a.com/1",
    publishedAt: "2026-01-01T00:00:00Z",
    source: { name: " Reuters " },
  };

  it("decodes, trims, dedupes, drops removed/invalid items and caps at 5", () => {
    const raw = [
      base,
      { ...base }, // duplicate URL
      { ...base, url: "javascript:x" },
      { ...base, url: "https://a.com/2", title: "[Removed]" },
      { ...base, url: "https://a.com/3", title: null },
      { url: "https://a.com/4", title: "Bare" },
      ...[5, 6, 7, 8, 9].map((n) => ({ ...base, url: `https://a.com/${n}` })),
    ];
    const out = normalizeArticles(raw);
    expect(out).toHaveLength(5);
    expect(out[0]).toEqual({
      title: "Title & more",
      description: 'Desc "x"',
      url: "https://a.com/1",
      publishedAt: "2026-01-01T00:00:00Z",
      source: { name: "Reuters" },
    });
    expect(out[1]).toEqual({
      title: "Bare",
      description: null,
      url: "https://a.com/4",
      publishedAt: "",
      source: { name: "Unknown" },
    });
  });
});

describe("fetchArticles", () => {
  it("throws a 500 NewsProviderError when no key is configured", async () => {
    await expect(fetchArticles("AAPL", "")).rejects.toMatchObject({
      name: "NewsProviderError",
      status: 500,
    });
  });

  it("sends the key in a header (not the URL) with the improved query", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ status: "ok", articles: [{ title: "T", url: "https://x.com" }] }),
    );
    const out = await fetchArticles("NVDA", "secret", fetchImpl as unknown as typeof fetch);

    expect(out).toHaveLength(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.searchParams.get("apiKey")).toBeNull();
    expect(url.toString()).not.toContain("secret");
    expect((init.headers as Record<string, string>)["X-Api-Key"]).toBe("secret");
    expect(url.searchParams.get("q")).toContain('"NVIDIA"');
    expect(url.searchParams.get("excludeDomains")).toBe(EXCLUDED_DOMAINS.join(","));
    expect(url.searchParams.get("searchIn")).toBe("title,description");
  });

  it("tolerates a response without articles", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ status: "ok" }));
    await expect(
      fetchArticles("NVDA", "k", fetchImpl as unknown as typeof fetch),
    ).resolves.toEqual([]);
  });

  it("maps upstream failures to a generic 502 without leaking details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn(async () => new Response("rate limited", { status: 429 }));
    const err = await fetchArticles("NVDA", "k", fetchImpl as unknown as typeof fetch).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(NewsProviderError);
    expect(err).toMatchObject({ status: 502, message: "News provider is unavailable" });
  });

  it("defaults the key to NEWS_API_KEY", async () => {
    vi.stubEnv("NEWS_API_KEY", "");
    await expect(fetchArticles("AAPL")).rejects.toBeInstanceOf(NewsProviderError);
    vi.unstubAllEnvs();
  });
});
