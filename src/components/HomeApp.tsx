"use client";

import { LineChart } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import Analytics from "@/components/Analytics";
import ConsentBanner from "@/components/ConsentBanner";
import Footer from "@/components/Footer";
import InfoSections from "@/components/InfoSections";
import LanguageToggle from "@/components/LanguageToggle";
import NewsFeed from "@/components/NewsFeed";
import SearchForm from "@/components/SearchForm";
import SummarySection from "@/components/SummarySection";
import { trackEvent } from "@/lib/analytics";
import { LanguageProvider, useLanguage } from "@/lib/i18n";
import { useRecentTickers } from "@/lib/recent-tickers";
import { createSseParser } from "@/lib/sse";
import type { NewsArticle, PartialSummary, Provider } from "@/lib/types";

const PROVIDER: Provider = "anthropic";

export function HomeContent() {
  const { t, language } = useLanguage();
  const [ticker, setTicker] = useState<string | null>(null);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [summary, setSummary] = useState<PartialSummary | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const { recentTickers, addTicker } = useRecentTickers();
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight stream when the page unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleSubmit = useCallback(
    async (nextTicker: string, nextProvider: Provider) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setTicker(nextTicker);
      setArticles([]);
      setSummary(null);
      setNewsError(null);
      setSummaryError(null);
      setHasStarted(true);
      setIsStreaming(true);
      addTicker(nextTicker);
      trackEvent("analyze_ticker", { ticker: nextTicker, language });

      try {
        const res = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker: nextTicker,
            provider: nextProvider,
            language,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const message = await res
            .json()
            .then((j: { error?: string }) => j.error)
            .catch(() => null);
          const text = message ?? `${t("requestFailed")} (${res.status})`;
          setNewsError(text);
          setSummaryError(text);
          trackEvent("analyze_error", { status: res.status });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const parse = createSseParser();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          for (const chunk of parse(decoder.decode(value, { stream: true }))) {
            if (chunk.type === "articles") setArticles(chunk.data);
            else if (chunk.type === "object") setSummary(chunk.data);
            else if (chunk.type === "error") setSummaryError(chunk.data);
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const message = err instanceof Error ? err.message : t("requestFailed");
        setSummaryError(message);
        setNewsError(message);
      } finally {
        if (abortRef.current === controller) {
          setIsStreaming(false);
          abortRef.current = null;
        }
      }
    },
    [language, t, addTicker],
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-14 lg:py-16">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>

      <header className="flex flex-col items-center gap-5 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-medium text-emerald-300">
          <LineChart className="size-3.5" aria-hidden="true" />
          {t("headerBadge")}
        </span>
        <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          {t("appTitle")}
        </h1>
        <p className="max-w-xl text-balance text-zinc-400">{t("appSubtitle")}</p>
        <div className="w-full max-w-2xl pt-2">
          <SearchForm
            isLoading={isStreaming}
            provider={PROVIDER}
            onSubmit={handleSubmit}
          />
        </div>

        {recentTickers.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="font-semibold uppercase tracking-wider text-zinc-500">
              {t("recentLabel")}
            </span>
            {recentTickers.map((tk) => (
              <button
                key={tk}
                type="button"
                disabled={isStreaming}
                onClick={() => handleSubmit(tk, PROVIDER)}
                className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 font-mono font-medium text-zinc-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tk}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      {hasStarted ? (
        <>
          <NewsFeed
            ticker={ticker}
            articles={articles}
            isLoading={isStreaming && articles.length === 0}
            error={newsError}
          />
          <SummarySection
            ticker={ticker}
            summary={summary}
            isStreaming={isStreaming}
            hasStarted={hasStarted}
            error={summaryError}
            articles={articles}
            provider={PROVIDER}
          />
        </>
      ) : null}

      <InfoSections />
    </main>
  );
}

export default function HomeApp() {
  return (
    <LanguageProvider>
      <HomeContent />
      <Footer />
      <ConsentBanner />
      <Analytics />
    </LanguageProvider>
  );
}
