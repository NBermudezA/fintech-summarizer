// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OPENAI_MODEL,
  isProviderConfigured,
  modelId,
  pickModel,
} from "@/lib/models";
import {
  chatLimiter,
  clientKey,
  createRateLimiter,
  isAllowedOrigin,
  summarizeLimiter,
  tooManyRequests,
} from "@/lib/rate-limit";
import { createSseParser, encodeSse, isStreamChunk } from "@/lib/sse";

afterEach(() => vi.unstubAllEnvs());

describe("createRateLimiter", () => {
  it("allows up to the limit per window, then blocks with Retry-After", () => {
    const rl = createRateLimiter(2, 1000);
    expect(rl.check("a", 0)).toEqual({ ok: true, remaining: 1, retryAfterSeconds: 0 });
    expect(rl.check("a", 100)).toEqual({ ok: true, remaining: 0, retryAfterSeconds: 0 });
    expect(rl.check("a", 200)).toEqual({ ok: false, remaining: 0, retryAfterSeconds: 1 });
    expect(rl.check("b", 200).ok).toBe(true);
    expect(rl.check("a", 1000).ok).toBe(true); // window reset
    rl.reset();
    expect(rl.check("a", 1001).remaining).toBe(1);
  });

  it("evicts expired keys once the map grows large", () => {
    const rl = createRateLimiter(1, 10);
    for (let i = 0; i <= 10_001; i++) rl.check(`k${i}`, 0);
    expect(rl.check("k0", 50).ok).toBe(true);
  });

  it("exports configured limiters and uses Date.now by default", () => {
    expect(summarizeLimiter.check("x").ok).toBe(true);
    expect(chatLimiter.check("x").ok).toBe(true);
  });
});

describe("request helpers", () => {
  const req = (headers: Record<string, string>) =>
    new Request("https://site.test/api", { method: "POST", headers });

  it("derives the client key from proxy headers", () => {
    expect(clientKey(req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("1.1.1.1");
    expect(clientKey(req({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3");
    expect(clientKey(req({}))).toBe("anon");
  });

  it("only allows same-origin browser calls", () => {
    expect(isAllowedOrigin(req({}))).toBe(true);
    expect(isAllowedOrigin(req({ origin: "https://site.test", host: "site.test" }))).toBe(true);
    expect(
      isAllowedOrigin(req({ origin: "https://site.test", "x-forwarded-host": "site.test" })),
    ).toBe(true);
    expect(isAllowedOrigin(req({ origin: "https://evil.test", host: "site.test" }))).toBe(false);
    expect(isAllowedOrigin(req({ origin: "garbage", host: "site.test" }))).toBe(false);
  });

  it("builds a 429 with a positive Retry-After", async () => {
    const res = tooManyRequests(0);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("1");
    expect(await res.json()).toHaveProperty("error");
  });
});

describe("SSE", () => {
  it("validates chunk shapes", () => {
    expect(isStreamChunk({ type: "done" })).toBe(true);
    expect(isStreamChunk({ type: "nope" })).toBe(false);
    expect(isStreamChunk(null)).toBe(false);
    expect(isStreamChunk("x")).toBe(false);
  });

  it("round-trips encoded chunks across arbitrary split points", () => {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const wire =
      dec.decode(encodeSse(enc, { type: "articles", data: [] })) +
      "event: ping\n\n" + // no data line
      "data: \n\n" + // empty payload
      "data: {broken\n\n" + // invalid JSON
      'data: {"type":"other"}\n\n' + // unknown type
      dec.decode(encodeSse(enc, { type: "done" }));

    const parse = createSseParser();
    const out = [...parse(wire.slice(0, 7)), ...parse(wire.slice(7, 40)), ...parse(wire.slice(40))];
    expect(out).toEqual([{ type: "articles", data: [] }, { type: "done" }]);
  });
});

describe("models", () => {
  it("uses defaults and honors env overrides", () => {
    vi.stubEnv("ANTHROPIC_MODEL", "");
    vi.stubEnv("OPENAI_MODEL", "");
    expect(modelId("anthropic")).toBe(DEFAULT_ANTHROPIC_MODEL);
    expect(modelId("openai")).toBe(DEFAULT_OPENAI_MODEL);
    vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-5-5");
    vi.stubEnv("OPENAI_MODEL", "gpt-x");
    expect(modelId("anthropic")).toBe("claude-haiku-5-5");
    expect(modelId("openai")).toBe("gpt-x");
  });

  it("builds provider models", () => {
    vi.stubEnv("ANTHROPIC_MODEL", "");
    expect(pickModel("anthropic")).toMatchObject({ modelId: DEFAULT_ANTHROPIC_MODEL });
    expect(pickModel("openai")).toMatchObject({ provider: expect.stringContaining("openai") });
  });

  it("reports whether a provider key is present", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "x");
    expect(isProviderConfigured("anthropic")).toBe(false);
    expect(isProviderConfigured("openai")).toBe(true);
  });
});
