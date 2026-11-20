// Single source of truth for public site identity. Canonical URLs, Open
// Graph, the sitemap, robots and JSON-LD all derive from SITE_URL.
// NEXT_PUBLIC_SITE_URL overrides it (e.g. for a staging domain).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://fintech.nicobermudez.com"
).replace(/\/+$/, "");

export const SITE_NAME = "Fintech Summarizer";

export const SITE_DESCRIPTION =
  "Free AI market briefings: type a stock or crypto ticker (AAPL, TSLA, BTC) and get the 5 latest news articles plus a streaming, structured AI summary with sentiment and key insights.";

export const AUTHOR_NAME = "Nicolás Bermúdez";
export const REPO_URL = "https://github.com/NBermudezA/fintech-summarizer";
