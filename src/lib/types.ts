import { z } from "zod";

export type Sentiment = "positive" | "negative" | "neutral";

export type Provider = "anthropic" | "openai";

export interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  source: { name: string };
}

export interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

export const summarizeRequestSchema = z.object({
  ticker: z
    .string()
    .trim()
    .min(1, "Ticker is required")
    .max(10, "Ticker too long")
    .regex(/^[A-Za-z0-9.\-]+$/, "Invalid ticker"),
  provider: z.enum(["anthropic", "openai"]),
  language: z.enum(["en", "es"]).default("en"),
});

export type SummarizeRequest = z.infer<typeof summarizeRequestSchema>;

export const summarySchema = z.object({
  headline: z
    .string()
    .describe("A punchy one-line headline capturing the dominant story."),
  marketOverview: z
    .string()
    .describe(
      "Two to three sentences combining the broader context and the current market situation for this ticker, written for a finance-literate reader.",
    ),
  keyInsights: z
    .array(z.string())
    .length(3)
    .describe(
      "Exactly three concise bullet-style insights an investor should care about.",
    ),
  sentiment: z
    .enum(["positive", "negative", "neutral"])
    .describe(
      "Overall market sentiment toward this ticker based on the articles: positive (bullish), negative (bearish), or neutral.",
    ),
});

export type Summary = z.infer<typeof summarySchema>;

export interface PartialSummary {
  headline?: string;
  marketOverview?: string;
  keyInsights?: (string | undefined)[];
  sentiment?: Sentiment;
}

export type StreamChunk =
  | { type: "articles"; data: NewsArticle[] }
  | { type: "object"; data: PartialSummary }
  | { type: "done" }
  | { type: "error"; data: string };
