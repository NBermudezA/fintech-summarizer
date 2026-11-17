// @vitest-environment node
import type { LanguageModelV3StreamPart } from "@ai-sdk/provider";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NewsArticle, StreamChunk } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  model: null as unknown,
  configured: true,
  articles: [] as unknown[] | Error,
}));

vi.mock("@/lib/models", () => ({
  pickModel: () => {
    if (mocks.model instanceof Error) throw mocks.model;
    return mocks.model;
  },
  isProviderConfigured: () => mocks.configured,
}));

vi.mock("@/lib/news", async (orig) => {
  const actual = await orig<typeof import("@/lib/news")>();
  return {
    ...actual,
    fetchArticles: async () => {
      if (mocks.articles instanceof Error) throw mocks.articles;
      return mocks.articles;
    },
  };
});

const { POST: summarize } = await import("@/app/api/summarize/route");
const { POST: chat } = await import("@/app/api/chat/route");
const { NewsProviderError } = await import("@/lib/news");
const { chatLimiter, summarizeLimiter } = await import("@/lib/rate-limit");

const ARTICLE: NewsArticle = {
  title: "Apple rallies",
  description: "desc",
  url: "https://a.com/1",
  publishedAt: "2026-11-16T00:00:00Z",
  source: { name: "Reuters" },
};

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

function textModel(deltas: string[], extra: LanguageModelV3StreamPart[] = []) {
  const chunks: LanguageModelV3StreamPart[] = [
    { type: "text-start", id: "t" },
    ...deltas.map((delta) => ({ type: "text-delta" as const, id: "t", delta })),
    { type: "text-end", id: "t" },
    ...extra,
    { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage },
  ];
  return new MockLanguageModelV3({
    doStream: async () => ({ stream: simulateReadableStream({ chunks }) }),
  });
}

const SUMMARY = {
  headline: "Apple up",
  marketOverview: "Overview.",
  keyInsights: ["a", "b", "c"],
  sentiment: "positive",
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://site.test/api", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function readSse(res: Response): Promise<StreamChunk[]> {
  const text = await res.text();
  return text
    .split("\n\n")
    .filter((f) => f.startsWith("data: "))
    .map((f) => JSON.parse(f.slice(6)) as StreamChunk);
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  summarizeLimiter.reset();
  chatLimiter.reset();
  mocks.configured = true;
  mocks.articles = [ARTICLE];
  const json = JSON.stringify(SUMMARY);
  mocks.model = textModel([json.slice(0, 20), json.slice(20)]);
});

describe("POST /api/summarize", () => {
  const valid = { ticker: "AAPL", provider: "anthropic", language: "en" };

  it("streams articles, partial objects and done", async () => {
    const res = await summarize(post(valid));
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const chunks = await readSse(res);
    expect(chunks[0]).toEqual({ type: "articles", data: [ARTICLE] });
    const objects = chunks.filter((c) => c.type === "object");
    expect(objects.length).toBeGreaterThan(0);
    expect(objects.at(-1)).toEqual({ type: "object", data: SUMMARY });
    expect(chunks.at(-1)).toEqual({ type: "done" });
    expect(chunks.some((c) => c.type === "error")).toBe(false);
  });

  it("rejects cross-origin, bad JSON and invalid tickers", async () => {
    expect(
      (await summarize(post(valid, { origin: "https://evil.test", host: "site.test" }))).status,
    ).toBe(403);
    expect((await summarize(post("{not json"))).status).toBe(400);
    const bad = await summarize(post({ ...valid, ticker: "<script>" }));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ error: "Invalid request" });
  });

  it("rate limits per client", async () => {
    for (let i = 0; i < 10; i++) await summarize(post(valid, { "x-real-ip": "9.9.9.9" }));
    const res = await summarize(post(valid, { "x-real-ip": "9.9.9.9" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("returns 503 without leaking env var names when the provider key is missing", async () => {
    mocks.configured = false;
    const res = await summarize(post(valid));
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain("API_KEY");
  });

  it("maps news failures to their status", async () => {
    mocks.articles = new NewsProviderError("News provider is unavailable", 502);
    const res = await summarize(post(valid));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "News provider is unavailable" });

    mocks.articles = new Error("boom");
    const res2 = await summarize(post(valid));
    expect(res2.status).toBe(502);
    expect(await res2.json()).toEqual({ error: "Failed to fetch news" });
  });

  it("reports an empty news result", async () => {
    mocks.articles = [];
    const chunks = await readSse(await summarize(post(valid)));
    expect(chunks).toEqual([
      { type: "articles", data: [] },
      { type: "error", data: 'No recent articles found for "AAPL".' },
      { type: "done" },
    ]);
  });

  it("sends a generic error when the model stream errors", async () => {
    mocks.model = new MockLanguageModelV3({
      doStream: async () => {
        throw new Error("upstream secret detail");
      },
    });
    const chunks = await readSse(await summarize(post(valid)));
    const err = chunks.find((c) => c.type === "error");
    expect(err).toEqual({
      type: "error",
      data: "The AI summary could not be generated. Please try again.",
    });
    expect(chunks.at(-1)).toEqual({ type: "done" });
  });

  it("sends an error when the model yields no structured output", async () => {
    mocks.model = textModel([]);
    const chunks = await readSse(await summarize(post(valid)));
    expect(chunks.some((c) => c.type === "error")).toBe(true);
  });

  it("recovers if building the stream throws synchronously", async () => {
    mocks.model = null; // streamText throws on a null model
    const chunks = await readSse(await summarize(post(valid)));
    expect(chunks.some((c) => c.type === "error")).toBe(true);
    expect(chunks.at(-1)).toEqual({ type: "done" });
  });
});

describe("POST /api/chat", () => {
  const userMsg = (text: string) => ({
    id: "1",
    role: "user",
    parts: [{ type: "text", text }],
  });
  const valid = {
    messages: [userMsg("What happened?")],
    language: "en",
    ticker: "AAPL",
    articles: [ARTICLE],
    summary: { headline: "H" },
  };

  it("streams a UI message response grounded in the system prompt", async () => {
    const model = textModel(["Apple ", "rallied."]);
    mocks.model = model;
    const res = await chat(post(valid));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Apple ");
    expect(body).toContain("rallied.");
    const call = model.doStreamCalls[0];
    const system = call.prompt.find((m) => m.role === "system");
    expect(system?.content).toContain("Active ticker: AAPL");
  });

  it("validates origin, JSON, schema bounds and message length", async () => {
    expect(
      (await chat(post(valid, { origin: "https://evil.test", host: "site.test" }))).status,
    ).toBe(403);
    expect((await chat(post("nope"))).status).toBe(400);
    expect((await chat(post({ ...valid, messages: [] }))).status).toBe(400);
    expect(
      (await chat(post({ ...valid, articles: Array(6).fill(ARTICLE) }))).status,
    ).toBe(400);
    const long = await chat(post({ ...valid, messages: [userMsg("x".repeat(2001))] }));
    expect(long.status).toBe(413);
    // Messages without parts / non-text parts count as zero length.
    mocks.model = textModel(["ok"]);
    const odd = await chat(
      post({
        ...valid,
        messages: [{ id: "2", role: "user", parts: [{ type: "text", text: "hi" }, { type: "step-start" }] }],
      }),
    );
    expect(odd.status).toBe(200);
  });

  it("rejects malformed messages (wrong role, missing parts) with 400", async () => {
    expect((await chat(post({ ...valid, messages: [{ id: "x", role: "user" }] }))).status).toBe(400);
    expect(
      (await chat(post({ ...valid, messages: [{ id: "x", role: "system", parts: [] }] }))).status,
    ).toBe(400);
  });

  it("rate limits per client", async () => {
    for (let i = 0; i < 20; i++) await chat(post(valid, { "x-real-ip": "8.8.8.8" }));
    expect((await chat(post(valid, { "x-real-ip": "8.8.8.8" }))).status).toBe(429);
  });

  it("returns 503 when the provider is not configured", async () => {
    mocks.configured = false;
    expect((await chat(post(valid))).status).toBe(503);
  });

  it("returns a generic 500 without internal details when setup throws", async () => {
    mocks.model = new Error("internal provider misconfiguration");
    const res = await chat(post(valid));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to process chat request" });
  });

  it("masks model errors in the stream", async () => {
    mocks.model = new MockLanguageModelV3({
      doStream: async () => {
        throw new Error("secret upstream detail");
      },
    });
    const body = await (await chat(post(valid))).text();
    expect(body).not.toContain("secret upstream detail");
    expect(body).toContain("The assistant could not respond");
  });
});
