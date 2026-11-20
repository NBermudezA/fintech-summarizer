import type { TranslationKey } from "@/lib/translations";

/**
 * Machine-readable error codes. The API sends a code next to its English
 * message; the UI shows the translation for the active language, so no
 * server text reaches the user untranslated.
 */
export const ERROR_CODES = [
  "rate_limited",
  "forbidden",
  "invalid_request",
  "provider_unavailable",
  "news_not_configured",
  "news_rate_limited",
  "news_unavailable",
  "no_articles",
  "summary_failed",
  "message_too_long",
  "chat_failed",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && (ERROR_CODES as readonly string[]).includes(value);
}

const KEYS: Record<ErrorCode, TranslationKey> = {
  rate_limited: "errorRateLimited",
  forbidden: "errorForbidden",
  invalid_request: "errorInvalidRequest",
  provider_unavailable: "errorProviderUnavailable",
  news_not_configured: "errorNewsUnavailable",
  news_rate_limited: "errorNewsRateLimited",
  news_unavailable: "errorNewsUnavailable",
  no_articles: "errorNoArticles",
  summary_failed: "errorSummaryFailed",
  message_too_long: "errorMessageTooLong",
  chat_failed: "errorChatFailed",
};

export function errorKey(code: ErrorCode): TranslationKey {
  return KEYS[code];
}

/** JSON error body for API routes: English message for logs/clients + code for the UI. */
export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  extra: Record<string, unknown> = {},
  headers?: HeadersInit,
): Response {
  return Response.json({ error: message, code, ...extra }, { status, headers });
}

/**
 * Pulls an error code out of whatever the chat SDK surfaces: a JSON body
 * (`{"error": …, "code": …}`) for HTTP errors, or the bare code string the
 * stream's onError returns.
 */
export function codeFromChatError(message: string): ErrorCode | null {
  if (isErrorCode(message)) return message;
  try {
    const parsed: unknown = JSON.parse(message);
    const code = (parsed as { code?: unknown })?.code;
    return isErrorCode(code) ? code : null;
  } catch {
    return null;
  }
}
