"use client";

import { Activity, Lightbulb } from "lucide-react";

import Chat from "@/components/Chat";
import SentimentBadge from "@/components/SentimentBadge";
import { useLanguage } from "@/lib/i18n";
import type { NewsArticle, PartialSummary, Provider } from "@/lib/types";

interface SummarySectionProps {
  ticker: string | null;
  summary: PartialSummary | null;
  isStreaming: boolean;
  hasStarted: boolean;
  error: string | null;
  articles: NewsArticle[];
  provider: Provider;
}

function SummarySkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-2/3 animate-pulse rounded bg-zinc-800" />
      <div className="space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-zinc-800/70" />
        <div className="h-4 w-11/12 animate-pulse rounded bg-zinc-800/70" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800/70" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-3 w-5/6 animate-pulse rounded bg-zinc-800/60" />
        <div className="h-3 w-4/6 animate-pulse rounded bg-zinc-800/60" />
        <div className="h-3 w-3/6 animate-pulse rounded bg-zinc-800/60" />
      </div>
    </div>
  );
}

export default function SummarySection({
  ticker,
  summary,
  isStreaming,
  hasStarted,
  error,
  articles,
  provider,
}: SummarySectionProps) {
  const { t } = useLanguage();
  const showSkeleton = isStreaming && !summary?.marketOverview;
  const headline = summary?.headline;
  const overview = summary?.marketOverview;
  const insights = summary?.keyInsights ?? [];
  const sentiment = summary?.sentiment ?? null;

  return (
    <section
      aria-labelledby="summary-heading"
      className="grid w-full gap-4 lg:grid-cols-[1.6fr_1fr]"
    >
      <article className="flex h-[34rem] flex-col gap-5 rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="summary-heading"
            className="flex items-center gap-2 text-lg font-semibold text-zinc-100"
          >
            <Activity className="size-5 text-emerald-400" aria-hidden="true" />
            {t("summaryHeading")}
            {ticker ? (
              <span className="text-zinc-500">
                · <span className="font-mono text-emerald-300">{ticker}</span>
              </span>
            ) : null}
          </h2>
          <SentimentBadge sentiment={sentiment} />
        </header>

        <div className="flex-1 overflow-y-auto pr-1 [scrollbar-color:theme(colors.zinc.700)_transparent] [scrollbar-width:thin]">

        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-5 py-4 text-sm text-rose-300">
            {error}
          </div>
        ) : !hasStarted ? (
          <p className="text-sm text-zinc-500">{t("submitHint")}</p>
        ) : showSkeleton ? (
          <SummarySkeleton />
        ) : (
          <div className="flex flex-col gap-5">
            {headline ? (
              <h3 className="text-xl font-semibold leading-snug text-zinc-50">
                {headline}
              </h3>
            ) : null}

            {overview ? (
              <p className="text-sm leading-relaxed text-zinc-300">
                {overview}
                {isStreaming ? (
                  <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-emerald-400 align-text-bottom" />
                ) : null}
              </p>
            ) : null}

            {insights.length > 0 ? (
              <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <Lightbulb className="size-3.5" aria-hidden="true" />
                  {t("keyInsights")}
                </h4>
                <ul className="space-y-2">
                  {insights.map((insight, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-sm leading-relaxed text-zinc-300"
                    >
                      <span
                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400"
                        aria-hidden="true"
                      />
                      <span>
                        {typeof insight === "string" ? insight : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
        </div>
      </article>

      <Chat
        provider={provider}
        ticker={ticker}
        articles={articles}
        summary={summary}
      />
    </section>
  );
}
