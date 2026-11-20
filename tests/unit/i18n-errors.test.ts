// @vitest-environment node
import { describe, expect, it } from "vitest";

import { codeFromChatError, ERROR_CODES, errorKey, errorResponse, isErrorCode } from "@/lib/errors";
import { TRANSLATIONS } from "@/lib/translations";

describe("translations", () => {
  const en = Object.keys(TRANSLATIONS.en).sort();
  const es = Object.keys(TRANSLATIONS.es).sort();

  it("have the same keys in English and Spanish", () => {
    expect(es).toEqual(en);
  });

  it("have no empty strings, and placeholders match across languages", () => {
    for (const key of en as (keyof typeof TRANSLATIONS.en)[]) {
      const a = TRANSLATIONS.en[key];
      const b = TRANSLATIONS.es[key];
      expect(a.trim(), key).not.toBe("");
      expect(b.trim(), key).not.toBe("");
      const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
      expect(vars(b), key).toEqual(vars(a));
    }
  });

  it("translate every error code", () => {
    for (const code of ERROR_CODES) {
      expect(TRANSLATIONS.en[errorKey(code)]).toBeTruthy();
      expect(TRANSLATIONS.es[errorKey(code)]).toBeTruthy();
    }
  });
});

describe("error codes", () => {
  it("recognizes codes", () => {
    expect(isErrorCode("rate_limited")).toBe(true);
    expect(isErrorCode("nope")).toBe(false);
    expect(isErrorCode(42)).toBe(false);
  });

  it("extracts codes from chat errors", () => {
    expect(codeFromChatError("chat_failed")).toBe("chat_failed");
    expect(codeFromChatError(JSON.stringify({ error: "x", code: "message_too_long" }))).toBe(
      "message_too_long",
    );
    expect(codeFromChatError(JSON.stringify({ error: "x" }))).toBeNull();
    expect(codeFromChatError(JSON.stringify({ code: "made_up" }))).toBeNull();
    expect(codeFromChatError("null")).toBeNull();
    expect(codeFromChatError("socket hang up")).toBeNull();
  });

  it("builds JSON error responses with code and extras", async () => {
    const res = errorResponse("forbidden", "Forbidden", 403, { a: 1 }, { "X-Test": "1" });
    expect(res.status).toBe(403);
    expect(res.headers.get("X-Test")).toBe("1");
    expect(await res.json()).toEqual({ error: "Forbidden", code: "forbidden", a: 1 });
  });
});
