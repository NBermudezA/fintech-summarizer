"use client";

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
import { errorKey, isErrorCode } from "@/lib/errors";
import {
  LanguageProvider,
  useLanguage,
  type Language,
  type TranslationKey,
} from "@/lib/i18n";
import { useRecentTickers } from "@/lib/recent-tickers";
import { createSseParser } from "@/lib/sse";
import type { NewsArticle, PartialSummary, Provider } from "@/lib/types";

const PROVIDER: Provider = "anthropic";

interface UiError {
  key: TranslationKey;
  vars?: Record<string, string | number>;
  suffix?: string;
}

export function HomeContent() {
  const { t, language } = useLanguage();
  const [ticker, setTicker] = useState<string | null>(null);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [summary, setSummary] = useState<PartialSummary | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  // Language the current summary was generated in (the model writes it once).
  const [summaryLanguage, setSummaryLanguage] = useState<Language | null>(null);
  // Errors are stored as translation keys and rendered with t(), so they
  // follow the language toggle like the rest of the UI.
  const [newsError, setNewsError] = useState<UiError | null>(null);
  const [summaryError, setSummaryError] = useState<UiError | null>(null);

  const { recentTickers, addTicker } = useRecentTickers();
  const renderError = (e: UiError | null): string | null =>
    e ? `${t(e.key, e.vars)}${e.suffix ?? ""}` : null;
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
      setSummaryLanguage(language);
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
          const code: unknown = await res
            .json()
            .then((j: { code?: unknown }) => j.code)
            .catch(() => null);
          const uiError: UiError = isErrorCode(code)
            ? { key: errorKey(code), vars: { ticker: nextTicker } }
            : { key: "requestFailed", suffix: ` (${res.status})` };
          setNewsError(uiError);
          setSummaryError(uiError);
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
            else if (chunk.type === "error")
              setSummaryError(
                chunk.code
                  ? { key: errorKey(chunk.code), vars: { ticker: nextTicker } }
                  : { key: "errorSummaryFailed" },
              );
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setSummaryError({ key: "networkError" });
        setNewsError({ key: "networkError" });
      } finally {
        if (abortRef.current === controller) {
          setIsStreaming(false);
          abortRef.current = null;
        }
      }
    },
    [language, addTicker],
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-12 pt-4 sm:px-6 sm:gap-16">
      <header>
        <div className="flex items-center justify-between gap-4 border-b border-rule pb-3">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">
            {t("headerBadge")}
          </p>
          <LanguageToggle />
        </div>

        <div className="border-b-2 border-ink pb-6 pt-8 sm:pt-12">
          <h1 className="font-serif text-5xl font-medium leading-[0.95] tracking-tight text-ink sm:text-7xl">
            {t("appTitle")}
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-lg italic leading-snug text-ink-soft sm:text-xl">
            {t("appSubtitle")}
          </p>
        </div>

        <div className="mt-6 max-w-3xl">
          <SearchForm
            isLoading={isStreaming}
            provider={PROVIDER}
            onSubmit={handleSubmit}
          />

          {recentTickers.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
              <span className="mr-2 font-mono text-[11px] uppercase tracking-[0.18em] text-subtle">
                {t("recentLabel")}
              </span>
              {recentTickers.map((tk) => (
                <button
                  key={tk}
                  type="button"
                  disabled={isStreaming}
                  onClick={() => handleSubmit(tk, PROVIDER)}
                  className="min-h-9 px-2 font-mono text-sm font-medium text-ink underline decoration-rule-strong underline-offset-4 transition-colors hover:decoration-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {tk}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {hasStarted ? (
        <>
          {/* Briefing first, sources below. */}
          <SummarySection
            ticker={ticker}
            summary={summary}
            isStreaming={isStreaming}
            hasStarted={hasStarted}
            error={renderError(summaryError)}
            summaryLanguage={summaryLanguage}
            onRegenerate={() => ticker && handleSubmit(ticker, PROVIDER)}
            articles={articles}
            provider={PROVIDER}
          />
          <NewsFeed
            ticker={ticker}
            articles={articles}
            isLoading={isStreaming && articles.length === 0}
            error={renderError(newsError)}
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
