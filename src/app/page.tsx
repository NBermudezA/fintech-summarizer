"use client";

import { LineChart } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import LanguageToggle from "@/components/LanguageToggle";
import NewsFeed from "@/components/NewsFeed";
import SearchForm from "@/components/SearchForm";
import SummarySection from "@/components/SummarySection";
import { LanguageProvider, useLanguage } from "@/lib/i18n";
import type {
  NewsArticle,
  PartialSummary,
  Provider,
  StreamChunk,
} from "@/lib/types";

function isStreamChunk(value: unknown): value is StreamChunk {
  if (typeof value !== "object" || value === null) return false;
  const t = (value as { type?: unknown }).type;
  return (
    t === "articles" || t === "object" || t === "done" || t === "error"
  );
}

function HomeContent() {
  const { t, language } = useLanguage();
  const [ticker, setTicker] = useState<string | null>(null);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [summary, setSummary] = useState<PartialSummary | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(
    async (nextTicker: string, provider: Provider) => {
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

      try {
        const res = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker: nextTicker, provider, language }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const message = await res
            .json()
            .then((j: { error?: string }) => j.error)
            .catch(() => null);
          const fallback = `${t("requestFailed")} (${res.status})`;
          setNewsError(message ?? fallback);
          setSummaryError(message ?? fallback);
          setIsStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let sepIndex = buffer.indexOf("\n\n");
          while (sepIndex !== -1) {
            const frame = buffer.slice(0, sepIndex);
            buffer = buffer.slice(sepIndex + 2);
            sepIndex = buffer.indexOf("\n\n");

            const dataLine = frame
              .split("\n")
              .find((line) => line.startsWith("data: "));
            if (!dataLine) continue;

            const payload = dataLine.slice(6).trim();
            if (!payload) continue;

            let parsed: unknown;
            try {
              parsed = JSON.parse(payload);
            } catch {
              continue;
            }
            if (!isStreamChunk(parsed)) continue;

            switch (parsed.type) {
              case "articles":
                setArticles(parsed.data);
                break;
              case "object":
                setSummary(parsed.data);
                break;
              case "error":
                setSummaryError(parsed.data);
                break;
              case "done":
                break;
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : t("requestFailed");
        setSummaryError(message);
        setNewsError(message);
      } finally {
        if (abortRef.current === controller) {
          setIsStreaming(false);
          abortRef.current = null;
        }
      }
    },
    [language, t],
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:py-20">
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
        <p className="max-w-xl text-balance text-zinc-400">
          {t("appSubtitle")}
        </p>
        <div className="w-full max-w-2xl pt-2">
          <SearchForm isLoading={isStreaming} onSubmit={handleSubmit} />
        </div>
      </header>

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
      />
    </main>
  );
}

export default function Home() {
  return (
    <LanguageProvider>
      <HomeContent />
    </LanguageProvider>
  );
}
