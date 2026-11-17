import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import type { Provider } from "@/lib/types";

// Override per environment (e.g. ANTHROPIC_MODEL=claude-haiku-5-5) to try a
// new model on a Vercel preview before promoting it.
export const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export function modelId(provider: Provider): string {
  return provider === "anthropic"
    ? process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL
    : process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
}

export function pickModel(provider: Provider): LanguageModel {
  return provider === "anthropic"
    ? anthropic(modelId(provider))
    : openai(modelId(provider));
}

export function isProviderConfigured(provider: Provider): boolean {
  return provider === "anthropic"
    ? Boolean(process.env.ANTHROPIC_API_KEY)
    : Boolean(process.env.OPENAI_API_KEY);
}
