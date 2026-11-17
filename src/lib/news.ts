import { POPULAR_TICKERS } from "@/lib/tickers";
import type { NewsArticle } from "@/lib/types";

export const NEWS_API_URL = "https://newsapi.org/v2/everything";
export const MAX_ARTICLES = 5;

// Domains that match ticker symbols but never carry market news (package
// registries, code hosts, forum firehoses).
export const EXCLUDED_DOMAINS = [
  "pypi.org",
  "npmjs.com",
  "github.com",
  "slashdot.org",
];

const FINANCE_TERMS =
  "stock OR shares OR market OR earnings OR investors OR price OR crypto";

interface RawArticle {
  title?: string | null;
  description?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  source?: { name?: string | null } | null;
}

interface RawNewsResponse {
  status?: string;
  message?: string;
  articles?: RawArticle[];
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#039;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function decodeEntities(input: string): string {
  return input.replace(
    /&(?:amp|lt|gt|quot|apos|nbsp|#0?39);/g,
    (match) => ENTITIES[match] ?? match,
  );
}

/** Returns a safe http(s) URL or null — never javascript:, data:, etc. */
export function sanitizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(decodeEntities(raw.trim()));
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Build a NewsAPI query. Bare symbols like "AAPL" match unrelated pages
 * (PyPI packages, code), so known tickers also search the company name and
 * every term is quoted.
 */
export function buildNewsQuery(ticker: string): string {
  const symbol = ticker.toUpperCase();
  const known = POPULAR_TICKERS.find((t) => t.symbol === symbol);
  const subject = known
    ? `("${symbol}" OR "${known.name.replace(/\s*\(.*\)\s*/, "").trim()}")`
    : `"${symbol}"`;
  return `${subject} AND (${FINANCE_TERMS})`;
}

export function normalizeArticles(raw: RawArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  const out: NewsArticle[] = [];
  for (const a of raw) {
    const url = sanitizeUrl(a.url);
    const title = a.title ? decodeEntities(a.title).trim() : "";
    if (!url || !title || title === "[Removed]" || seen.has(url)) continue;
    seen.add(url);
    out.push({
      title,
      description: a.description ? decodeEntities(a.description).trim() : null,
      url,
      publishedAt: a.publishedAt ?? "",
      source: { name: a.source?.name?.trim() || "Unknown" },
    });
    if (out.length === MAX_ARTICLES) break;
  }
  return out;
}

export class NewsProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "NewsProviderError";
  }
}

export async function fetchArticles(
  ticker: string,
  apiKey: string | undefined = process.env.NEWS_API_KEY,
  fetchImpl: typeof fetch = fetch,
): Promise<NewsArticle[]> {
  if (!apiKey) {
    throw new NewsProviderError("News provider is not configured", 500);
  }

  const url = new URL(NEWS_API_URL);
  url.searchParams.set("q", buildNewsQuery(ticker));
  url.searchParams.set("searchIn", "title,description");
  url.searchParams.set("excludeDomains", EXCLUDED_DOMAINS.join(","));
  url.searchParams.set("sortBy", "publishedAt");
  // Over-fetch so filtering removed/duplicate items still leaves 5.
  url.searchParams.set("pageSize", "15");
  url.searchParams.set("language", "en");

  // Key goes in a header, not the query string, so it never lands in logs.
  const res = await fetchImpl(url, {
    cache: "no-store",
    headers: { "X-Api-Key": apiKey },
  });
  if (!res.ok) {
    console.error("[news] provider responded", res.status);
    throw new NewsProviderError("News provider is unavailable", 502);
  }

  const json = (await res.json()) as RawNewsResponse;
  return normalizeArticles(json.articles ?? []);
}
