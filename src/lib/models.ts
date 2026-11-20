import { createAnthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel, streamText } from "ai";

import type { Provider } from "@/lib/types";

type ProviderOptions = Parameters<typeof streamText>[0]["providerOptions"];

// Claude Haiku 5.5: the current, cheapest Haiku ($0.10 / $0.50 per MTok vs
// $1 / $5 for Haiku 4.5). Override per environment with ANTHROPIC_MODEL.
export const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-5-5";
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export function modelId(provider: Provider): string {
  return provider === "anthropic"
    ? process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL
    : process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
}

/**
 * Anthropic key for this deployment. Production uses ANTHROPIC_PROD_KEY, a
 * separate key with its own spend limit in the Anthropic console; other
 * environments (local, preview) use ANTHROPIC_API_KEY.
 */
export function anthropicApiKey(): string | undefined {
  return process.env.ANTHROPIC_PROD_KEY || process.env.ANTHROPIC_API_KEY || undefined;
}

export function pickModel(provider: Provider): LanguageModel {
  return provider === "anthropic"
    ? createAnthropic({ apiKey: anthropicApiKey() })(modelId(provider))
    : openai(modelId(provider));
}

/** Claude 5.x models accept `effort`; Haiku 4.5 and older reject it (400). */
export function supportsEffort(id: string): boolean {
  return /^claude-(haiku|sonnet|opus|fable|mythos)-5(\b|-)/.test(id);
}

/**
 * Haiku 5.5 thinks adaptively by default. Short summaries and chat replies
 * don't need deep reasoning, so `low` effort keeps latency and cost down.
 */
export function providerOptions(provider: Provider): ProviderOptions {
  if (provider !== "anthropic" || !supportsEffort(modelId(provider))) return undefined;
  return { anthropic: { effort: "low" } };
}

export function isProviderConfigured(provider: Provider): boolean {
  return provider === "anthropic"
    ? Boolean(anthropicApiKey())
    : Boolean(process.env.OPENAI_API_KEY);
}
