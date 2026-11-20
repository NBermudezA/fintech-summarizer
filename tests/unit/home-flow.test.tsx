import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NewsArticle, StreamChunk } from "@/lib/types";

// The chat has its own tests; here it is a stub that exposes its props.
vi.mock("@/components/Chat", () => ({
  default: (p: { ticker: string | null; articles: unknown[] }) => (
    <div data-testid="chat">
      chat:{p.ticker ?? "none"}:{p.articles.length}
    </div>
  ),
}));

const gtag = vi.fn();

const { default: HomeApp } = await import("@/components/HomeApp");
const { default: Page } = await import("@/app/page");

const ARTICLES: NewsArticle[] = [
  {
    title: "Nvidia beats estimates",
    description: "Revenue up.",
    url: "https://news.test/1",
    publishedAt: "2026-11-16T10:00:00Z",
    source: { name: "Reuters" },
  },
  {
    title: "Second story",
    description: null,
    url: "https://news.test/2",
    publishedAt: "not-a-date",
    source: { name: "AP" },
  },
];

function sseResponse(chunks: StreamChunk[], split = 17): Response {
  const text = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("");
  const bytes = new TextEncoder().encode(text);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += split) controller.enqueue(bytes.slice(i, i + split));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream" } });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  (window as unknown as { gtag: typeof gtag }).gtag = gtag;
  gtag.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  delete (window as unknown as { gtag?: unknown }).gtag;
});

async function analyze(ticker: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Stock ticker symbol"), ticker);
  await user.click(screen.getByRole("button", { name: "Analyze" }));
  return user;
}

describe("Home page — full front-end pipeline", () => {
  it("renders JSON-LD and the landing copy before any search", () => {
    const { container } = render(<Page />);
    const ld = container.querySelector('script[type="application/ld+json"]');
    expect(JSON.parse(ld!.innerHTML)["@graph"][0]["@type"]).toBe("WebApplication");
    expect(screen.getByRole("heading", { level: 1, name: "Fintech Summarizer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How it works" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "FAQ" })).toBeInTheDocument();
    // Result panels stay hidden until the first search.
    expect(screen.queryByRole("heading", { name: /Latest news/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Nothing here is investment advice/)).toBeInTheDocument();
  });

  it("submits a ticker, streams news + summary, records history and analytics", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        { type: "articles", data: ARTICLES },
        { type: "object", data: { headline: "Nvidia surges" } },
        {
          type: "object",
          data: {
            headline: "Nvidia surges",
            marketOverview: "Chips rally.",
            keyInsights: ["One", "Two", "Three"],
            sentiment: "positive",
          },
        },
        { type: "done" },
      ]),
    );
    render(<HomeApp />);
    await analyze("nvda");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/summarize",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body).toEqual({ ticker: "NVDA", provider: "anthropic", language: "en" });

    expect(await screen.findByText("Nvidia beats estimates")).toBeInTheDocument();
    expect(await screen.findByText("Chips rally.")).toBeInTheDocument();
    expect(screen.getByText("BULLISH")).toBeInTheDocument();
    expect(screen.getByText("Three")).toBeInTheDocument();
    expect(screen.getByText("2 articles")).toBeInTheDocument();
    expect(screen.getByText("not-a-date")).toBeInTheDocument();
    expect(screen.getByText(/Not financial advice/)).toBeInTheDocument();
    expect(screen.getByTestId("chat")).toHaveTextContent("chat:NVDA:2");

    const link = screen.getByText("Nvidia beats estimates").closest("a")!;
    expect(link).toHaveAttribute("href", "https://news.test/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    expect(gtag).toHaveBeenCalledWith("event", "analyze_ticker", { ticker: "NVDA", language: "en" });
    expect(JSON.parse(localStorage.getItem("fintech-summarizer:recent-tickers")!)).toEqual(["NVDA"]);

    // Re-run from history chip.
    fetchMock.mockResolvedValueOnce(sseResponse([{ type: "articles", data: [ARTICLES[0]] }, { type: "done" }]));
    await userEvent.click(within(screen.getByText("Recent").parentElement!).getByRole("button", { name: "NVDA" }));
    await waitFor(() => expect(screen.getByText("1 article")).toBeInTheDocument());
  });

  it("offers to regenerate the summary after switching language", async () => {
    const done = () =>
      sseResponse([
        { type: "articles", data: ARTICLES },
        { type: "object", data: { headline: "Nvidia surges", marketOverview: "Chips rally." } },
        { type: "done" },
      ]);
    fetchMock.mockResolvedValueOnce(done());
    render(<HomeApp />);
    await analyze("nvda");
    await screen.findByText("Chips rally.");
    expect(screen.queryByText(/This summary was written in/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "ES" }));
    expect(screen.getByText("Este resumen está en inglés.")).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(done());
    await userEvent.click(screen.getByRole("button", { name: "Generarlo en español" }));
    const body = JSON.parse(fetchMock.mock.calls[1][1]!.body as string);
    expect(body).toMatchObject({ ticker: "NVDA", language: "es" });
    await waitFor(() =>
      expect(screen.queryByText("Este resumen está en inglés.")).not.toBeInTheDocument(),
    );
  });

  it("shows server errors in both panels", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ error: "Too many requests.", code: "rate_limited" }, { status: 429 }),
    );
    render(<HomeApp />);
    await analyze("AAPL");
    expect(
      await screen.findAllByText("Too many requests. Please wait a moment and try again."),
    ).toHaveLength(2);
    expect(gtag).toHaveBeenCalledWith("event", "analyze_error", { status: 429 });

    // Errors follow the language toggle.
    await userEvent.click(screen.getByRole("radio", { name: "ES" }));
    expect(
      screen.getAllByText("Demasiadas solicitudes. Espera un momento y vuelve a intentarlo."),
    ).toHaveLength(2);
  });

  it("falls back to a status message when the error body is not JSON", async () => {
    fetchMock.mockResolvedValueOnce(new Response("oops", { status: 500 }));
    render(<HomeApp />);
    await analyze("AAPL");
    expect(await screen.findAllByText("Request failed (500)")).toHaveLength(2);
  });

  it("shows stream errors and the empty-news state", async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        { type: "articles", data: [] },
        { type: "error", code: "no_articles", data: 'No recent articles found for "ZZZ".' },
        { type: "done" },
      ]),
    );
    render(<HomeApp />);
    await analyze("zzz");
    expect(await screen.findByText("No recent articles found for ZZZ.")).toBeInTheDocument();
    expect(screen.getByText("No articles found for ZZZ.")).toBeInTheDocument();
  });

  it("shows network failures and ignores aborts", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network down"));
    render(<HomeApp />);
    await analyze("AAPL");
    expect(
      await screen.findAllByText("Network error. Check your connection and try again."),
    ).toHaveLength(2);

    fetchMock.mockRejectedValueOnce(Object.assign(new Error("aborted"), { name: "AbortError" }));
    await userEvent.click(screen.getByRole("button", { name: "Analyze" }));
    await waitFor(() => expect(screen.queryByText("aborted")).not.toBeInTheDocument());

    // A stream error without a code falls back to the generic summary error.
    fetchMock.mockResolvedValueOnce(
      sseResponse([{ type: "articles", data: [] }, { type: "error", data: "boom" }, { type: "done" }]),
    );
    await userEvent.click(screen.getByRole("button", { name: "Analyze" }));
    expect(
      await screen.findByText("The AI summary could not be generated. Please try again."),
    ).toBeInTheDocument();
  });

  it("shows skeletons while waiting and aborts the stream on unmount", async () => {
    let firstSignal: AbortSignal | undefined;
    fetchMock.mockImplementationOnce((_u, init) => {
      firstSignal = init!.signal!;
      return new Promise(() => {}); // never resolves
    });
    const { unmount } = render(<HomeApp />);
    await analyze("AAPL");
    expect(screen.getByRole("button", { name: "Analyzing…" })).toBeDisabled();
    // Skeletons while waiting.
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);

    expect(firstSignal!.aborted).toBe(false);
    unmount();
    expect(firstSignal!.aborted).toBe(true);
  });

  it("switches language, persists it and updates <html lang>", async () => {
    render(<HomeApp />);
    await userEvent.click(screen.getByRole("radio", { name: "ES" }));
    expect(screen.getByRole("heading", { name: "Cómo funciona" })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("es");
    expect(localStorage.getItem("fintech-summarizer:language")).toBe("es");
    expect(screen.getByRole("radio", { name: "ES" })).toHaveAttribute("aria-checked", "true");
  });

  it("restores a saved language and ignores invalid values", async () => {
    localStorage.setItem("fintech-summarizer:language", "es");
    const { unmount } = render(<HomeApp />);
    expect(await screen.findByRole("button", { name: "Analizar" })).toBeInTheDocument();
    unmount();
    localStorage.setItem("fintech-summarizer:language", "fr");
    render(<HomeApp />);
    expect(screen.getByRole("button", { name: "Analyze" })).toBeInTheDocument();
  });
});
