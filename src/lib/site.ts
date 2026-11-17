// Single source of truth for public site identity. Override the URL with
// NEXT_PUBLIC_SITE_URL once a custom domain is attached.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://fintech-summarizer.vercel.app"
).replace(/\/+$/, "");

export const SITE_NAME = "Fintech Summarizer";

export const SITE_DESCRIPTION =
  "Free AI market briefings: type a stock or crypto ticker (AAPL, TSLA, BTC) and get the 5 latest news articles plus a streaming, structured AI summary with sentiment and key insights.";

export const AUTHOR_NAME = "Nicolás Bermúdez";
export const REPO_URL = "https://github.com/NBermudezA/fintech-summarizer";
