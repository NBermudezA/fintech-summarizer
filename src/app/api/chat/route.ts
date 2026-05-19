import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type LanguageModel,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { chatTools } from "./tools";
import type { NewsArticle, Provider } from "@/lib/types";

export const maxDuration = 30;

const newsArticleSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  publishedAt: z.string(),
  source: z.object({ name: z.string() }),
});

const summarySchema = z
  .object({
    headline: z.string().optional(),
    marketOverview: z.string().optional(),
    keyInsights: z.array(z.string()).optional(),
    sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
  })
  .nullable();

const chatRequestSchema = z.object({
  messages: z.array(z.unknown()),
  provider: z.enum(["anthropic", "openai"]).default("anthropic"),
  language: z.enum(["en", "es"]).default("en"),
  ticker: z.string().nullable().default(null),
  articles: z.array(newsArticleSchema).default([]),
  summary: summarySchema.default(null),
});

type Summary = z.infer<typeof summarySchema>;

function pickModel(provider: Provider): LanguageModel {
  if (provider === "anthropic") {
    return anthropic("claude-haiku-4-5-20251001");
  }
  return openai("gpt-4o-mini");
}

function buildSystemPrompt(
  ticker: string | null,
  articles: NewsArticle[],
  summary: Summary,
  language: "en" | "es",
): string {
  const persona = `You are an experienced financial advisor helping the user understand markets and recent news. You can use your general financial knowledge to explain concepts (P/E ratio, market cap, dividend yield, volatility, etc.) and put events in context.

HARD RULE: For any specific factual claim about a company, ticker, price, news event, executive, partnership, earnings figure, or recent market move, you MUST ground your answer in the articles and AI summary provided in the CONTEXT section below. Do not invent facts, prices, dates, or events. If the user asks about something not covered by the provided context, say so plainly and suggest they pull a fresh summary for that ticker using the form above.

BREVITY IS A HARD REQUIREMENT:
- Simple questions: 1–2 sentences. Stop.
- Complex questions: 3–5 sentences, single paragraph. Stop.
- Never exceed 2 short paragraphs total.
- Plain prose; bullets ONLY when listing 3+ distinct items the user asked for.
- No preamble ("Great question!"), no recap of what was asked, no closing pleasantries.`;

  let context: string;
  if (ticker && articles.length > 0) {
    const articleList = articles
      .map(
        (a, i) =>
          `[${i + 1}] ${a.title}\n    Source: ${a.source.name} · Published: ${a.publishedAt}\n    ${a.description ?? "(no description)"}`,
      )
      .join("\n\n");

    const summaryLines = summary
      ? [
          summary.headline ? `Headline: ${summary.headline}` : null,
          summary.marketOverview
            ? `Market overview: ${summary.marketOverview}`
            : null,
          summary.keyInsights && summary.keyInsights.length > 0
            ? `Key insights:\n${summary.keyInsights.map((i) => `  - ${i}`).join("\n")}`
            : null,
          summary.sentiment ? `Sentiment: ${summary.sentiment}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      : "(summary not yet available)";

    context = `=== CONTEXT ===
Active ticker: ${ticker}

AI summary:
${summaryLines}

Source articles:
${articleList}
=== END CONTEXT ===`;
  } else {
    context = `=== CONTEXT ===
The user has not loaded a ticker yet. You can answer general financial questions and definitions, but you cannot give ticker-specific facts or current prices. If they ask about a specific company or symbol, encourage them to use the form above to pull the latest news for it.
=== END CONTEXT ===`;
  }

  const languageInstruction =
    language === "es"
      ? "IMPORTANT: Respond entirely in natural, fluent Spanish."
      : "Respond in clear, professional English.";

  return `${persona}

${context}

${languageInstruction}`;
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid chat request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { messages, provider, language, ticker, articles, summary } =
    parsed.data;

  if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 },
    );
  }
  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  try {
    const result = streamText({
      model: pickModel(provider),
      maxOutputTokens: 350,
      system: buildSystemPrompt(ticker, articles, summary, language),
      messages: await convertToModelMessages(messages as UIMessage[]),
      tools: chatTools,
      stopWhen: stepCountIs(5),
      onError({ error }) {
        console.error("[chat] streamText error", error);
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[chat] handler error", err);
    return Response.json(
      {
        error: "Failed to process chat request",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
