import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

import { chatTools } from "./tools";
import { errorResponse } from "@/lib/errors";
import { isProviderConfigured, pickModel, providerOptions } from "@/lib/models";
import { buildChatSystemPrompt } from "@/lib/prompts";
import {
  clientKey,
  chatLimiter,
  isAllowedOrigin,
  tooManyRequests,
} from "@/lib/rate-limit";
import { chatRequestSchema, MAX_CHAT_MESSAGE_CHARS } from "@/lib/types";

export const maxDuration = 30;

function textLength(message: { parts: Array<Record<string, unknown>> }): number {
  return message.parts.reduce<number>(
    (sum, p) => sum + (typeof p.text === "string" ? p.text.length : 0),
    0,
  );
}

export async function POST(req: Request): Promise<Response> {
  if (!isAllowedOrigin(req)) {
    return errorResponse("forbidden", "Forbidden", 403);
  }
  const rl = chatLimiter.check(clientKey(req));
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_request", "Invalid JSON body", 400);
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("invalid_request", "Invalid chat request", 400, {
      issues: parsed.error.flatten(),
    });
  }

  const { messages, provider, language, ticker, articles, summary } =
    parsed.data;

  if (messages.some((m) => textLength(m) > MAX_CHAT_MESSAGE_CHARS)) {
    return errorResponse(
      "message_too_long",
      `Messages are limited to ${MAX_CHAT_MESSAGE_CHARS} characters.`,
      413,
    );
  }

  if (!isProviderConfigured(provider)) {
    console.error(`[chat] provider "${provider}" has no API key`);
    return errorResponse(
      "provider_unavailable",
      "The selected AI provider is not available.",
      503,
    );
  }

  try {
    const result = streamText({
      model: pickModel(provider),
      // Thinking counts toward this cap on Claude 5.x; the prompt keeps
      // replies short.
      maxOutputTokens: 1500,
      providerOptions: providerOptions(provider),
      system: buildChatSystemPrompt(ticker, articles, summary, language),
      messages: await convertToModelMessages(messages as unknown as UIMessage[]),
      tools: chatTools,
      stopWhen: stepCountIs(5),
      onError({ error }) {
        console.error("[chat] streamText error", error);
      },
    });

    return result.toUIMessageStreamResponse({
      // The UI translates this code (see codeFromChatError).
      onError: () => "chat_failed",
    });
  } catch (err) {
    console.error("[chat] handler error", err);
    return errorResponse("chat_failed", "Failed to process chat request", 500);
  }
}
