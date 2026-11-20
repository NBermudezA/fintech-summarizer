import { z } from "zod";

export type Sentiment = "positive" | "negative" | "neutral";

export type Provider = "anthropic" | "openai";

export type Language = "en" | "es";

export interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  source: { name: string };
  /** Thumbnail from the publisher (https only), when the provider has one. */
  image?: string | null;
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

// Chat payloads come from the browser, so every field is bounded to keep
// prompt size (and cost) predictable.
export const newsArticleSchema = z.object({
  title: z.string().max(500),
  description: z.string().max(2000).nullable(),
  url: z.string().url().max(2000),
  publishedAt: z.string().max(50),
  source: z.object({ name: z.string().max(200) }),
  image: z.string().url().max(2000).nullable().optional(),
});

export const partialSummarySchema = z
  .object({
    headline: z.string().max(500).optional(),
    marketOverview: z.string().max(3000).optional(),
    keyInsights: z.array(z.string().max(1000)).max(5).optional(),
    sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
  })
  .nullable();

export const MAX_CHAT_MESSAGES = 20;
export const MAX_CHAT_MESSAGE_CHARS = 2000;

const uiMessageSchema = z
  .object({
    id: z.string().max(100),
    role: z.enum(["user", "assistant"]),
    parts: z.array(z.object({ type: z.string() }).passthrough()).max(50),
  })
  .passthrough();

export const chatRequestSchema = z.object({
  messages: z.array(uiMessageSchema).min(1).max(MAX_CHAT_MESSAGES),
  provider: z.enum(["anthropic", "openai"]).default("anthropic"),
  language: z.enum(["en", "es"]).default("en"),
  ticker: z
    .string()
    .max(10)
    .regex(/^[A-Za-z0-9.\-]+$/)
    .nullable()
    .default(null),
  articles: z.array(newsArticleSchema).max(5).default([]),
  summary: partialSummarySchema.default(null),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

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
