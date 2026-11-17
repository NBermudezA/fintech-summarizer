import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Analytics from "@/components/Analytics";
import ConsentBanner from "@/components/ConsentBanner";
import Footer from "@/components/Footer";
import NewsFeed from "@/components/NewsFeed";
import SearchForm from "@/components/SearchForm";
import SentimentBadge from "@/components/SentimentBadge";
import SummarySection from "@/components/SummarySection";
import { LanguageProvider, useLanguage } from "@/lib/i18n";
import { useRecentTickers } from "@/lib/recent-tickers";

vi.mock("@/components/Chat", () => ({ default: () => <div data-testid="chat" /> }));
vi.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: ({ gaId }: { gaId: string }) => <div data-testid="ga">{gaId}</div>,
}));

const wrap = (ui: ReactNode, initial: "en" | "es" = "en") =>
  render(<LanguageProvider initial={initial}>{ui}</LanguageProvider>);

afterEach(() => vi.unstubAllEnvs());

describe("SearchForm", () => {
  it("picks from the popular list, closes on outside click / Escape, and submits uppercased", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    wrap(<SearchForm isLoading={false} provider="anthropic" onSubmit={onSubmit} />);

    const toggle = screen.getByRole("button", { name: /Popular/ });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Stocks")).toBeInTheDocument();
    expect(screen.getByText("Crypto")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Enter" }); // ignored
    fireEvent.mouseDown(screen.getByText("Stocks")); // inside — stays open
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.click(toggle);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.click(toggle);
    await user.click(screen.getByRole("option", { name: /Bitcoin/ }));
    expect(screen.getByLabelText("Stock ticker symbol")).toHaveValue("BTC");
    await user.click(screen.getByRole("button", { name: "Analyze" }));
    expect(onSubmit).toHaveBeenCalledWith("BTC", "anthropic");
  });

  it("does not submit blank input or while loading", () => {
    const onSubmit = vi.fn();
    const { rerender } = wrap(
      <SearchForm isLoading={false} provider="anthropic" onSubmit={onSubmit} />,
    );
    fireEvent.submit(screen.getByRole("button", { name: "Analyze" }).closest("form")!);
    fireEvent.change(screen.getByLabelText("Stock ticker symbol"), { target: { value: "aapl" } });
    rerender(
      <LanguageProvider>
        <SearchForm isLoading provider="anthropic" onSubmit={onSubmit} />
      </LanguageProvider>,
    );
    fireEvent.submit(screen.getByRole("button", { name: "Analyzing…" }).closest("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("NewsFeed", () => {
  it("prompts before a ticker is chosen", () => {
    wrap(<NewsFeed ticker={null} articles={[]} isLoading={false} error={null} />);
    expect(screen.getByText("Enter a ticker above to load the latest news.")).toBeInTheDocument();
  });

  it("renders in Spanish with locale dates", () => {
    wrap(
      <NewsFeed
        ticker="AAPL"
        articles={[
          {
            title: "T",
            description: "D",
            url: "https://x.test",
            publishedAt: "2026-01-02T00:00:00Z",
            source: { name: "S" },
          },
        ]}
        isLoading={false}
        error={null}
      />,
      "es",
    );
    expect(screen.getByText("Leer artículo")).toBeInTheDocument();
    expect(screen.getByText("1 artículo")).toBeInTheDocument();
  });
});

describe("NewsCard thumbnail", () => {
  it("shows the publisher image without referrer and hides it if it fails", () => {
    const { container } = wrap(
      <NewsFeed
        ticker="AAPL"
        articles={[
          {
            title: "With image",
            description: null,
            url: "https://x.test/1",
            publishedAt: "2026-01-02T00:00:00Z",
            source: { name: "S" },
            image: "https://img.test/a.jpg",
          },
        ]}
        isLoading={false}
        error={null}
      />,
    );
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("src", "https://img.test/a.jpg");
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(img).toHaveAttribute("alt", "");
    fireEvent.error(img);
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("SummarySection & SentimentBadge", () => {
  const base = {
    ticker: "AAPL",
    isStreaming: false,
    hasStarted: true,
    error: null,
    articles: [],
    provider: "anthropic" as const,
  };

  it("shows the idle hint, skeleton, streaming cursor and partial insights", () => {
    const { rerender, container } = wrap(<SummarySection {...base} summary={null} hasStarted={false} />);
    expect(screen.getByText("Submit a ticker above to generate a market summary.")).toBeInTheDocument();
    expect(screen.getByText("AWAITING")).toBeInTheDocument();

    rerender(
      <LanguageProvider>
        <SummarySection {...base} summary={null} isStreaming />
      </LanguageProvider>,
    );
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(3);

    rerender(
      <LanguageProvider>
        <SummarySection
          {...base}
          isStreaming
          summary={{ marketOverview: "Partial", keyInsights: ["x", undefined] }}
        />
      </LanguageProvider>,
    );
    expect(screen.getByText("Partial")).toBeInTheDocument();
    // Disclaimer waits until streaming ends and a headline exists.
    expect(screen.queryByText(/Not financial advice/)).not.toBeInTheDocument();
  });

  it("renders bearish and neutral badges", () => {
    const { rerender } = wrap(<SentimentBadge sentiment="negative" />);
    expect(screen.getByText("BEARISH")).toBeInTheDocument();
    rerender(
      <LanguageProvider>
        <SentimentBadge sentiment="neutral" />
      </LanguageProvider>,
    );
    expect(screen.getByText("NEUTRAL")).toBeInTheDocument();
  });
});

describe("consent, analytics and footer", () => {
  it("renders nothing analytics-related when GA is not configured", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "");
    wrap(
      <>
        <ConsentBanner />
        <Analytics />
        <Footer />
      </>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ga")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cookie settings" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Source code" })).toHaveAttribute(
      "href",
      "https://github.com/NBermudezA/fintech-summarizer",
    );
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  });

  it("asks for consent, loads GA only after accepting, and can be reset", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-TEST123");
    const user = userEvent.setup();
    wrap(
      <>
        <ConsentBanner />
        <Analytics />
        <Footer />
      </>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByTestId("ga")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Accept analytics" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("ga")).toHaveTextContent("G-TEST123");
    expect(localStorage.getItem("fintech-summarizer:analytics-consent")).toBe("granted");

    await user.click(screen.getByRole("button", { name: "Cookie settings" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByTestId("ga")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Decline" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ga")).not.toBeInTheDocument();
    expect(localStorage.getItem("fintech-summarizer:analytics-consent")).toBe("denied");
  });

  it("syncs consent across tabs via the storage event", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-TEST123");
    wrap(<Analytics />);
    act(() => {
      localStorage.setItem("fintech-summarizer:analytics-consent", "granted");
      window.dispatchEvent(new StorageEvent("storage"));
    });
    expect(screen.getByTestId("ga")).toBeInTheDocument();
  });

  it("ignores a malformed GA id", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "UA-123");
    wrap(<ConsentBanner />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("hooks", () => {
  it("useLanguage throws outside its provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Broken = () => {
      useLanguage();
      return null;
    };
    expect(() => render(<Broken />)).toThrow(/LanguageProvider/);
  });

  it("useRecentTickers ignores corrupt storage, dedupes, caps at 5 and skips blanks", () => {
    localStorage.setItem("fintech-summarizer:recent-tickers", "{corrupt");
    let api!: ReturnType<typeof useRecentTickers>;
    const Probe = () => {
      api = useRecentTickers();
      return <span>{api.recentTickers.join(",")}</span>;
    };
    const { container } = render(<Probe />);
    expect(container.textContent).toBe("");
    act(() => {
      ["a", "b", "c", "d", "e", "f", " a ", "  "].forEach((t) => api.addTicker(t));
    });
    expect(container.textContent).toBe("A,F,E,D,C");
  });

  it("useRecentTickers loads valid history and rejects non-string arrays", () => {
    localStorage.setItem("fintech-summarizer:recent-tickers", JSON.stringify(["X", "Y"]));
    const Probe = () => <span>{useRecentTickers().recentTickers.join(",")}</span>;
    const { container, unmount } = render(<Probe />);
    expect(container.textContent).toBe("X,Y");
    unmount();
    localStorage.setItem("fintech-summarizer:recent-tickers", JSON.stringify([1, 2]));
    const second = render(<Probe />);
    expect(second.container.textContent).toBe("");
  });
});
