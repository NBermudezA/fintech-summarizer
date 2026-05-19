import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { Output, streamText, type LanguageModel } from "ai";

import {
  type NewsApiResponse,
  type NewsArticle,
  type Provider,
  type StreamChunk,
  summarizeRequestSchema,
  summarySchema,
} from "@/lib/types";

export const maxDuration = 30;

const NEWS_API_URL = "https://newsapi.org/v2/everything";

function pickModel(provider: Provider): LanguageModel {
  if (provider === "anthropic") {
    return anthropic("claude-haiku-4-5-20251001");
  }
  return openai("gpt-4o-mini");
}

async function fetchArticles(ticker: string): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    throw new Error("NEWS_API_KEY is not configured");
  }

  const url = new URL(NEWS_API_URL);
  url.searchParams.set("q", `${ticker} stock finance`);
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("apiKey", apiKey);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`NewsAPI responded ${res.status}`);
  }

  const json = (await res.json()) as NewsApiResponse;
  return json.articles.slice(0, 5).map((a) => ({
    title: a.title,
    description: a.description,
    url: a.url,
    publishedAt: a.publishedAt,
    source: { name: a.source?.name ?? "Unknown" },
  }));
}

function buildPrompt(
  ticker: string,
  articles: NewsArticle[],
  language: "en" | "es",
): string {
  const formatted = articles
    .map(
      (a, i) =>
        `[${i + 1}] ${a.title}\nSource: ${a.source.name}\nPublished: ${a.publishedAt}\nDescription: ${a.description ?? "(no description)"}`,
    )
    .join("\n\n");

  const languageInstruction =
    language === "es"
      ? "IMPORTANT: Write ALL field values (headline, marketOverview, keyInsights items) in natural, fluent Spanish. The JSON keys and the sentiment enum values stay in English."
      : "Write all field values in clear, professional English.";

  return `You are a financial analyst writing a daily briefing on ${ticker.toUpperCase()}.

Below are the 5 most recent news articles about ${ticker.toUpperCase()}. Use ONLY these articles as your source — do not invent facts.

Produce a structured summary with:
- headline: a single punchy line that captures the dominant story.
- marketOverview: 2–3 sentences combining the broader macro/sector context with the specific situation for ${ticker.toUpperCase()}, written for a finance-literate reader.
- keyInsights: exactly 3 short, sharp bullet-style takeaways an investor would care about.
- sentiment: one of "positive", "negative", or "neutral" reflecting the overall tone of these articles toward ${ticker.toUpperCase()}.

${languageInstruction}

ARTICLES:
${formatted}`;
}

function encodeEvent(encoder: TextEncoder, chunk: StreamChunk): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`);
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = summarizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { ticker, provider, language } = parsed.data;

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

  let articles: NewsArticle[];
  try {
    articles = await fetchArticles(ticker);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch news";
    return Response.json({ error: message }, { status: 502 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: StreamChunk): void => {
        controller.enqueue(encodeEvent(encoder, chunk));
      };

      send({ type: "articles", data: articles });

      if (articles.length === 0) {
        send({
          type: "error",
          data: `No recent articles found for "${ticker.toUpperCase()}".`,
        });
        send({ type: "done" });
        controller.close();
        return;
      }

      let streamErrorMessage: string | null = null;

      try {
        const result = streamText({
          model: pickModel(provider),
          maxOutputTokens: 600,
          output: Output.object({ schema: summarySchema }),
          prompt: buildPrompt(ticker, articles, language),
          onError({ error }) {
            console.error("[summarize] streamText error", error);
            streamErrorMessage =
              error instanceof Error ? error.message : String(error);
          },
        });

        let yielded = false;
        for await (const partial of result.partialOutputStream) {
          yielded = true;
          send({ type: "object", data: partial });
        }

        if (streamErrorMessage) {
          send({ type: "error", data: streamErrorMessage });
        } else if (!yielded) {
          send({
            type: "error",
            data: "The model returned no structured output.",
          });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to summarize";
        send({ type: "error", data: message });
      } finally {
        send({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
