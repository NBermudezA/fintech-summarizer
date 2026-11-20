// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  COMPANY_NEWS_LOOKBACK_DAYS,
  companyNames,
  cryptoKeywords,
  decodeEntities,
  fetchArticles,
  FINNHUB_BASE_URL,
  isCrypto,
  mentions,
  mentionsCompany,
  NewsProviderError,
  normalizeArticles,
  normalizeCompanyName,
  sanitizeUrl,
} from "@/lib/news";

afterEach(() => vi.unstubAllEnvs());

const NOW = new Date("2026-11-17T12:00:00Z");

function item(n: number, extra: Record<string, unknown> = {}) {
  return {
    headline: `Headline ${n}`,
    summary: `Summary ${n}`,
    url: `https://news.test/${n}`,
    source: "Reuters",
    datetime: 1_700_000_000 + n,
    image: `https://img.test/${n}.jpg`,
    ...extra,
  };
}

function fakeFetch(routes: Record<string, unknown>) {
  return vi.fn(async (input: URL | RequestInfo) => {
    const url = new URL(String(input));
    const body = routes[url.pathname.replace("/api/v1", "")];
    if (body instanceof Response) return body;
    return Response.json(body ?? []);
  });
}

describe("decodeEntities / sanitizeUrl", () => {
  it("decodes the common HTML entities that leak into feeds", () => {
    expect(decodeEntities("a&amp;b &lt;x&gt; &quot;q&quot; it&#39;s it&#039;s &apos; &nbsp;")).toBe(
      `a&b <x> "q" it's it's '  `,
    );
    expect(decodeEntities("&copy; &unknown;")).toBe("&copy; &unknown;");
  });

  it("accepts only http(s) URLs", () => {
    expect(sanitizeUrl("https://x.test/f?a=1&amp;b=2")).toBe("https://x.test/f?a=1&b=2");
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
    for (const bad of ["javascript:alert(1)", "data:text/html,hi", "not a url", "", null, undefined]) {
      expect(sanitizeUrl(bad)).toBeNull();
    }
  });
});

describe("crypto helpers", () => {
  it("knows which popular tickers are crypto", () => {
    expect(isCrypto("btc")).toBe(true);
    expect(isCrypto("AAPL")).toBe(false);
    expect(isCrypto("UNKNOWN")).toBe(false);
  });

  it("matches coins by whole-word symbol or name", () => {
    expect(cryptoKeywords("btc")).toEqual(["BTC", "Bitcoin"]);
    expect(cryptoKeywords("pepe")).toEqual(["PEPE"]);
    expect(mentions({ headline: "Bitcoin hits a record" }, ["BTC", "Bitcoin"])).toBe(true);
    expect(mentions({ summary: "the BTC rally" }, ["BTC"])).toBe(true);
    expect(mentions({ headline: "BTCS shares jump" }, ["BTC"])).toBe(false);
    expect(mentions({}, ["BTC"])).toBe(false);
    expect(mentions({ headline: "C++ rocks" }, ["C++"])).toBe(false); // regex-safe
  });
});

describe("company relevance", () => {
  it("normalizes company names from Finnhub profiles", () => {
    expect(normalizeCompanyName("NVIDIA Corp")).toBe("NVIDIA");
    expect(normalizeCompanyName("Alphabet Inc. Class A")).toBe("Alphabet");
    expect(normalizeCompanyName("Berkshire Hathaway Holdings, Inc.")).toBe("Berkshire Hathaway");
    expect(normalizeCompanyName("  Tesla  ")).toBe("Tesla");
  });

  it("uses popular-ticker names and aliases, else the profile name", () => {
    expect(companyNames("googl")).toEqual(["Alphabet", "Google"]);
    expect(companyNames("META")).toEqual(["Meta Platforms", "Meta", "Facebook"]);
    expect(companyNames("AAPL")).toEqual(["Apple"]);
    expect(companyNames("SNOW", "Snowflake Inc")).toEqual(["Snowflake"]);
    expect(companyNames("XYZ")).toEqual([]);
    expect(companyNames("XYZ", null)).toEqual([]);
  });

  it("matches the symbol case-sensitively and names case-insensitively", () => {
    expect(mentionsCompany({ headline: "Why NVDA fell" }, "NVDA", [])).toBe(true);
    expect(mentionsCompany({ summary: "nvidia guidance" }, "NVDA", ["NVIDIA"])).toBe(true);
    expect(mentionsCompany({ headline: "Buy now or wait?" }, "NOW", [])).toBe(false);
    expect(mentionsCompany({ headline: "ServiceNow (NOW) beats" }, "NOW", [])).toBe(true);
    expect(mentionsCompany({ headline: "SpaceX raises $32B" }, "NVDA", ["NVIDIA"])).toBe(false);
    expect(mentionsCompany({}, "NVDA", ["NVIDIA"])).toBe(false);
  });
});

describe("normalizeArticles", () => {
  it("sorts newest first, dedupes, drops invalid items, caps at 5", () => {
    const raw = [
      item(1),
      item(2, { headline: "Tom &amp; Jerry", summary: "", source: " ", image: "http://insecure.test/x.jpg" }),
      item(3, { url: "javascript:x" }),
      item(4, { headline: null }),
      item(5, { url: "https://news.test/1" }), // duplicate URL, newer → kept instead of 1
      ...[6, 7, 8, 9].map((n) => item(n)),
      { headline: "Bare", url: "https://news.test/bare" },
    ];
    const out = normalizeArticles(raw);
    expect(out.map((a) => a.url)).toEqual([
      "https://news.test/9",
      "https://news.test/8",
      "https://news.test/7",
      "https://news.test/6",
      "https://news.test/1",
    ]);
    expect(out[0]).toEqual({
      title: "Headline 9",
      description: "Summary 9",
      url: "https://news.test/9",
      publishedAt: new Date((1_700_000_000 + 9) * 1000).toISOString(),
      source: { name: "Reuters" },
      image: "https://img.test/9.jpg",
    });

    const two = normalizeArticles([item(2, { headline: "Tom &amp; Jerry", summary: "", source: " ", image: "http://insecure.test/x.jpg" })]);
    expect(two[0]).toMatchObject({
      title: "Tom & Jerry",
      description: null,
      source: { name: "Unknown" },
      image: null,
    });

    expect(normalizeArticles([{ headline: "Bare", url: "https://news.test/bare" }])[0]).toMatchObject({
      publishedAt: "",
      image: null,
      description: null,
    });
  });
});

describe("fetchArticles (Finnhub)", () => {
  it("throws a 500 NewsProviderError when no key is configured", async () => {
    vi.stubEnv("FINNHUB_API_KEY", "");
    await expect(fetchArticles("AAPL")).rejects.toMatchObject({ name: "NewsProviderError", status: 500 });
  });

  it("uses company-news for stocks with a 7-day window and the token in a header", async () => {
    const f = fakeFetch({ "/company-news": [item(1), item(2)] });
    const out = await fetchArticles("aapl", "secret", f as unknown as typeof fetch, NOW);

    expect(out).toHaveLength(2);
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.origin + url.pathname).toBe(`${FINNHUB_BASE_URL}/company-news`);
    expect(url.searchParams.get("symbol")).toBe("AAPL");
    expect(url.searchParams.get("to")).toBe("2026-11-17");
    expect(url.searchParams.get("from")).toBe(
      new Date(NOW.getTime() - COMPANY_NEWS_LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10),
    );
    expect(url.toString()).not.toContain("secret");
    expect((init.headers as Record<string, string>)["X-Finnhub-Token"]).toBe("secret");
  });

  it("keeps only company news that names the company", async () => {
    const f = fakeFetch({
      "/company-news": [
        item(1, { headline: "Nvidia beats estimates" }),
        item(2, { headline: "SpaceX raises $32B for AI chips", summary: "" }),
        item(3, { headline: "Chip stocks rally", summary: "NVDA led the gains" }),
        item(4, { headline: "BJ's Wholesale Q3 earnings call", summary: "" }),
      ],
    });
    const out = await fetchArticles("NVDA", "k", f as unknown as typeof fetch, NOW);
    expect(out.map((a) => a.url)).toEqual(["https://news.test/3", "https://news.test/1"]);
    expect(f).toHaveBeenCalledTimes(1); // known ticker: no profile lookup
  });

  it("looks up the profile name for other tickers and filters with it", async () => {
    const f = fakeFetch({
      "/company-news": [
        item(1, { headline: "Snowflake raises guidance" }),
        item(2, { headline: "Unrelated retail story", summary: "" }),
        item(3, { headline: "Data stocks", summary: "snowflake and peers rose" }),
      ],
      "/stock/profile2": { name: "Snowflake Inc" },
    });
    const out = await fetchArticles("SNOW", "k", f as unknown as typeof fetch, NOW);
    expect(out).toHaveLength(2);
    const profileCall = f.mock.calls.find(([u]) => String(u).includes("/stock/profile2"));
    expect(new URL(String(profileCall![0])).searchParams.get("symbol")).toBe("SNOW");
  });

  it("falls back to the unfiltered feed when too few articles match", async () => {
    const f = fakeFetch({
      "/company-news": [
        item(1, { headline: "Apple unveils glasses" }),
        item(2, { headline: "Fund letter", summary: "" }),
        item(3, { headline: "Macro outlook", summary: "" }),
      ],
    });
    const out = await fetchArticles("AAPL", "k", f as unknown as typeof fetch, NOW);
    expect(out).toHaveLength(3);
  });

  it("ignores profile lookup failures", async () => {
    const throwing = vi.fn(async (input: URL | RequestInfo) => {
      const path = new URL(String(input)).pathname;
      if (path.endsWith("/stock/profile2")) throw new Error("network");
      return Response.json([item(1, { headline: "Zeta news" }), item(2, { headline: "Other" })]);
    });
    await expect(
      fetchArticles("ZETA", "k", throwing as unknown as typeof fetch, NOW),
    ).resolves.toHaveLength(2);

    const notOk = fakeFetch({
      "/company-news": [item(1), item(2)],
      "/stock/profile2": new Response("", { status: 403 }),
    });
    await expect(fetchArticles("ZETA", "k", notOk as unknown as typeof fetch, NOW)).resolves.toHaveLength(2);

    const emptyName = fakeFetch({ "/company-news": [item(1)], "/stock/profile2": { name: "  " } });
    await expect(fetchArticles("ZETA", "k", emptyName as unknown as typeof fetch, NOW)).resolves.toHaveLength(1);
  });

  it("uses filtered crypto market news for known coins", async () => {
    const f = fakeFetch({
      "/news": [
        item(1, { headline: "Bitcoin rallies past resistance" }),
        item(2, { headline: "Ethereum upgrade ships", summary: "" }),
        item(3, { headline: "Markets", summary: "BTC and ETH both rose" }),
      ],
    });
    const out = await fetchArticles("BTC", "k", f as unknown as typeof fetch, NOW);
    expect(out.map((a) => a.url)).toEqual(["https://news.test/3", "https://news.test/1"]);
    const [url] = f.mock.calls[0] as unknown as [URL];
    expect(url.pathname).toBe("/api/v1/news");
    expect(url.searchParams.get("category")).toBe("crypto");
  });

  it("falls back to crypto news when an unknown symbol has no company news", async () => {
    const f = fakeFetch({
      "/company-news": [],
      "/news": [item(1, { headline: "PEPE memecoin surges" }), item(2, { headline: "Other coin" })],
    });
    const out = await fetchArticles("PEPE", "k", f as unknown as typeof fetch, NOW);
    expect(f).toHaveBeenCalledTimes(3); // company-news + profile2 + crypto news
    expect(out).toHaveLength(1);
  });

  it("treats a non-array body as no news", async () => {
    const f = fakeFetch({ "/company-news": { error: "x" }, "/news": { error: "x" } });
    await expect(fetchArticles("AAPL", "k", f as unknown as typeof fetch, NOW)).resolves.toEqual([]);
  });

  it("maps upstream failures to generic 502s (with a clearer rate-limit message)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const limited = fakeFetch({ "/company-news": new Response("", { status: 429 }) });
    await expect(fetchArticles("AAPL", "k", limited as unknown as typeof fetch, NOW)).rejects.toMatchObject({
      status: 502,
      message: "News provider rate limit reached. Please try again in a minute.",
    });

    const down = fakeFetch({ "/news": new Response("", { status: 503 }) });
    const err = await fetchArticles("ETH", "k", down as unknown as typeof fetch, NOW).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NewsProviderError);
    expect(err).toMatchObject({ status: 502, message: "News provider is unavailable" });
  });

  it("defaults the clock to now", async () => {
    const f = fakeFetch({ "/company-news": [item(1)] });
    await fetchArticles("AAPL", "k", f as unknown as typeof fetch);
    const [url] = f.mock.calls[0] as unknown as [URL];
    expect(url.searchParams.get("to")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
