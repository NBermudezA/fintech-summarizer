import { Output, streamText } from "ai";

import { isProviderConfigured, pickModel } from "@/lib/models";
import { fetchArticles, NewsProviderError } from "@/lib/news";
import { buildSummaryPrompt } from "@/lib/prompts";
import {
  clientKey,
  summarizeLimiter,
  isAllowedOrigin,
  tooManyRequests,
} from "@/lib/rate-limit";
import { encodeSse } from "@/lib/sse";
import {
  type NewsArticle,
  type StreamChunk,
  summarizeRequestSchema,
  summarySchema,
} from "@/lib/types";

export const maxDuration = 30;

const GENERIC_MODEL_ERROR =
  "The AI summary could not be generated. Please try again.";

export async function POST(req: Request): Promise<Response> {
  if (!isAllowedOrigin(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const rl = summarizeLimiter.check(clientKey(req));
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

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

  if (!isProviderConfigured(provider)) {
    console.error(`[summarize] provider "${provider}" has no API key`);
    return Response.json(
      { error: "The selected AI provider is not available." },
      { status: 503 },
    );
  }

  let articles: NewsArticle[];
  try {
    articles = await fetchArticles(ticker);
  } catch (err) {
    const status = err instanceof NewsProviderError ? err.status : 502;
    const message =
      err instanceof NewsProviderError
        ? err.message
        : "Failed to fetch news";
    console.error("[summarize] news fetch failed", err);
    return Response.json({ error: message }, { status });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: StreamChunk): void => {
        controller.enqueue(encodeSse(encoder, chunk));
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

      let failed = false;

      try {
        const result = streamText({
          model: pickModel(provider),
          maxOutputTokens: 800,
          output: Output.object({ schema: summarySchema }),
          prompt: buildSummaryPrompt(ticker, articles, language),
          onError({ error }) {
            console.error("[summarize] streamText error", error);
            failed = true;
          },
        });

        let yielded = false;
        for await (const partial of result.partialOutputStream) {
          yielded = true;
          send({ type: "object", data: partial });
        }

        if (failed || !yielded) {
          send({ type: "error", data: GENERIC_MODEL_ERROR });
        }
      } catch (err) {
        console.error("[summarize] handler error", err);
        send({ type: "error", data: GENERIC_MODEL_ERROR });
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
