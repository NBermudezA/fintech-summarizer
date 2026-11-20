import { Output, streamText } from "ai";

import { errorResponse } from "@/lib/errors";
import { isProviderConfigured, pickModel, providerOptions } from "@/lib/models";
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
    return errorResponse("forbidden", "Forbidden", 403);
  }
  const rl = summarizeLimiter.check(clientKey(req));
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_request", "Invalid JSON body", 400);
  }

  const parsed = summarizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("invalid_request", "Invalid request", 400, {
      issues: parsed.error.flatten(),
    });
  }

  const { ticker, provider, language } = parsed.data;

  if (!isProviderConfigured(provider)) {
    console.error(`[summarize] provider "${provider}" has no API key`);
    return errorResponse(
      "provider_unavailable",
      "The selected AI provider is not available.",
      503,
    );
  }

  let articles: NewsArticle[];
  try {
    articles = await fetchArticles(ticker);
  } catch (err) {
    console.error("[summarize] news fetch failed", err);
    return err instanceof NewsProviderError
      ? errorResponse(err.code, err.message, err.status)
      : errorResponse("news_unavailable", "Failed to fetch news", 502);
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
          code: "no_articles",
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
          // Thinking counts toward this cap on Claude 5.x, so leave headroom.
          maxOutputTokens: 2000,
          providerOptions: providerOptions(provider),
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
          send({ type: "error", code: "summary_failed", data: GENERIC_MODEL_ERROR });
        }
      } catch (err) {
        console.error("[summarize] handler error", err);
        send({ type: "error", code: "summary_failed", data: GENERIC_MODEL_ERROR });
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
