import { POPULAR_TICKERS } from "@/lib/tickers";
import type { NewsArticle } from "@/lib/types";

// Finnhub (https://finnhub.io/docs/api). Free plan: 60 calls/min, personal use.
//  - Stocks: /company-news returns articles tagged with the exact symbol, so
//    results are relevant by construction (no full-text matching).
//  - Crypto: Finnhub has no per-coin news, so /news?category=crypto is
//    filtered locally by symbol and coin name.
export const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
export const MAX_ARTICLES = 5;
export const COMPANY_NEWS_LOOKBACK_DAYS = 7;
/** Below this many on-topic articles, show the unfiltered feed instead. */
export const MIN_RELEVANT_ARTICLES = 2;

/** Raw Finnhub news item (company-news and market news share this shape). */
interface RawArticle {
  headline?: string | null;
  summary?: string | null;
  url?: string | null;
  source?: string | null;
  datetime?: number | null; // Unix seconds
  image?: string | null;
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

export function isCrypto(ticker: string): boolean {
  const symbol = ticker.toUpperCase();
  return POPULAR_TICKERS.some(
    (t) => t.symbol === symbol && t.category === "crypto",
  );
}

/** Words that identify a coin in a headline/summary, e.g. ["BTC", "Bitcoin"]. */
export function cryptoKeywords(ticker: string): string[] {
  const symbol = ticker.toUpperCase();
  const known = POPULAR_TICKERS.find((t) => t.symbol === symbol);
  return known ? [symbol, known.name] : [symbol];
}

export function mentions(article: RawArticle, keywords: string[]): boolean {
  const text = `${article.headline ?? ""} ${article.summary ?? ""}`;
  return keywords.some((k) =>
    new RegExp(`\\b${escapeRegExp(k)}\\b`, "i").test(text),
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "NVIDIA Corp" → "NVIDIA", "Alphabet Inc. Class A" → "Alphabet". */
export function normalizeCompanyName(name: string): string {
  let out = name.trim();
  const suffix =
    /[,\s]+(inc|corp|corporation|co|company|ltd|limited|plc|holdings?|group|sa|ag|nv|se|class [a-c])\.?$/i;
  while (suffix.test(out)) out = out.replace(suffix, "").trim();
  return out;
}

/** Names that identify a company in the press (popular-ticker aliases, else Finnhub's profile name). */
export function companyNames(symbol: string, profileName?: string | null): string[] {
  const known = POPULAR_TICKERS.find((t) => t.symbol === symbol.toUpperCase());
  const names = known
    ? [known.name.replace(/\s*\(.*\)\s*/, ""), ...(known.aliases ?? [])]
    : profileName
      ? [normalizeCompanyName(profileName)]
      : [];
  return [...new Set(names.filter((n) => n.length >= 2))];
}

/**
 * Finnhub tags company news loosely (an NVDA query returns SpaceX or retail
 * earnings stories), so keep articles whose headline/summary names the
 * company. The symbol matches case-sensitively ("NOW" must not match "now");
 * names match case-insensitively.
 */
export function mentionsCompany(article: RawArticle, symbol: string, names: string[]): boolean {
  const text = `${article.headline ?? ""} ${article.summary ?? ""}`;
  if (new RegExp(`\\b${escapeRegExp(symbol.toUpperCase())}\\b`).test(text)) return true;
  return names.some((n) => new RegExp(`\\b${escapeRegExp(n)}\\b`, "i").test(text));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function normalizeArticles(raw: RawArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  const out: NewsArticle[] = [];
  const sorted = [...raw].sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0));
  for (const a of sorted) {
    const url = sanitizeUrl(a.url);
    const title = a.headline ? decodeEntities(a.headline).trim() : "";
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    const summary = a.summary ? decodeEntities(a.summary).trim() : "";
    const image = sanitizeUrl(a.image);
    out.push({
      title,
      description: summary || null,
      url,
      publishedAt: a.datetime ? new Date(a.datetime * 1000).toISOString() : "",
      source: { name: a.source?.trim() || "Unknown" },
      // https only: an http image would be mixed content on our page.
      image: image?.startsWith("https:") ? image : null,
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

async function finnhubGet(
  path: string,
  params: Record<string, string>,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<RawArticle[]> {
  const url = new URL(`${FINNHUB_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  // Token goes in a header, not the query string, so it never lands in logs.
  const res = await fetchImpl(url, {
    cache: "no-store",
    headers: { "X-Finnhub-Token": apiKey },
  });
  if (!res.ok) {
    console.error("[news] Finnhub responded", res.status, path);
    throw new NewsProviderError(
      res.status === 429
        ? "News provider rate limit reached. Please try again in a minute."
        : "News provider is unavailable",
      502,
    );
  }
  const json: unknown = await res.json();
  return Array.isArray(json) ? (json as RawArticle[]) : [];
}

/** Company name from Finnhub's profile; null on any failure (filtering is best-effort). */
async function fetchCompanyName(
  symbol: string,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  try {
    const url = new URL(`${FINNHUB_BASE_URL}/stock/profile2`);
    url.searchParams.set("symbol", symbol);
    const res = await fetchImpl(url, {
      cache: "no-store",
      headers: { "X-Finnhub-Token": apiKey },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { name?: unknown };
    return typeof json?.name === "string" && json.name.trim() ? json.name : null;
  } catch {
    return null;
  }
}

export async function fetchArticles(
  ticker: string,
  apiKey: string | undefined = process.env.FINNHUB_API_KEY,
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<NewsArticle[]> {
  if (!apiKey) {
    throw new NewsProviderError("News provider is not configured", 500);
  }
  const symbol = ticker.toUpperCase();

  if (!isCrypto(symbol)) {
    const from = new Date(now.getTime() - COMPANY_NEWS_LOOKBACK_DAYS * 86_400_000);
    const needsProfile = companyNames(symbol).length === 0;
    const [company, profileName] = await Promise.all([
      finnhubGet(
        "/company-news",
        { symbol, from: isoDate(from), to: isoDate(now) },
        apiKey,
        fetchImpl,
      ),
      needsProfile ? fetchCompanyName(symbol, apiKey, fetchImpl) : null,
    ]);
    if (company.length > 0) {
      const names = companyNames(symbol, profileName);
      const relevant = company.filter((a) => mentionsCompany(a, symbol, names));
      return normalizeArticles(
        relevant.length >= MIN_RELEVANT_ARTICLES ? relevant : company,
      );
    }
    // Unknown to Finnhub as a stock (e.g. DOGE): fall through to crypto news.
  }

  const crypto = await finnhubGet("/news", { category: "crypto" }, apiKey, fetchImpl);
  const keywords = cryptoKeywords(symbol);
  return normalizeArticles(crypto.filter((a) => mentions(a, keywords)));
}
