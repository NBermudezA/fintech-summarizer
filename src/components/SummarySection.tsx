"use client";

import Chat from "@/components/Chat";
import SentimentBadge from "@/components/SentimentBadge";
import { useLanguage, type Language } from "@/lib/i18n";
import type { NewsArticle, PartialSummary, Provider } from "@/lib/types";

interface SummarySectionProps {
  ticker: string | null;
  summary: PartialSummary | null;
  isStreaming: boolean;
  hasStarted: boolean;
  error: string | null;
  articles: NewsArticle[];
  provider: Provider;
  /** Language the summary was generated in; offers a re-run after a toggle. */
  summaryLanguage?: Language | null;
  onRegenerate?: () => void;
}

const BAR = "animate-pulse rounded-[2px] bg-highlight motion-reduce:animate-none";

function SummarySkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="space-y-2">
        <div className={`h-8 w-11/12 ${BAR}`} />
        <div className={`h-8 w-2/3 ${BAR}`} />
      </div>
      <div className="space-y-2">
        <div className={`h-4 w-full ${BAR}`} />
        <div className={`h-4 w-11/12 ${BAR}`} />
        <div className={`h-4 w-3/4 ${BAR}`} />
      </div>
      <div className="space-y-3 pt-2">
        <div className={`h-3 w-5/6 ${BAR}`} />
        <div className={`h-3 w-4/6 ${BAR}`} />
        <div className={`h-3 w-3/6 ${BAR}`} />
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
  summaryLanguage = null,
  onRegenerate,
}: SummarySectionProps) {
  const { t, language } = useLanguage();
  const langName = (l: Language) => t(l === "es" ? "languageNameEs" : "languageNameEn");
  const otherLanguage =
    !isStreaming && !error && summary?.headline && summaryLanguage && summaryLanguage !== language;
  const showSkeleton = isStreaming && !summary?.marketOverview;
  const headline = summary?.headline;
  const overview = summary?.marketOverview;
  const insights = summary?.keyInsights ?? [];
  const sentiment = summary?.sentiment ?? null;

  return (
    <section
      aria-labelledby="summary-heading"
      className="grid w-full gap-10 border-t-2 border-ink pt-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:gap-0"
    >
      <article className="flex min-h-[20rem] flex-col gap-6 lg:min-h-[28rem] lg:border-r lg:border-rule lg:pr-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="summary-heading"
            className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-subtle"
          >
            {t("summaryHeading")}
            {ticker ? (
              <>
                {" · "}
                <span className="text-ink">{ticker}</span>
              </>
            ) : null}
          </h2>
          <SentimentBadge sentiment={sentiment} />
        </header>

        <div className="flex-1">
          {error ? (
            <div
              role="alert"
              className="border-l-4 border-down bg-highlight px-5 py-4 text-sm text-ink"
            >
              {error}
            </div>
          ) : !hasStarted ? (
            <p className="text-sm text-subtle">{t("submitHint")}</p>
          ) : showSkeleton ? (
            <SummarySkeleton />
          ) : (
            <div className="flex flex-col gap-6">
              {otherLanguage && onRegenerate ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-rule py-2 text-sm text-ink-soft">
                  <span>{t("summaryInOtherLanguage", { lang: langName(summaryLanguage) })}</span>
                  <button
                    type="button"
                    onClick={onRegenerate}
                    className="min-h-9 font-medium text-ink underline underline-offset-4 hover:text-brand"
                  >
                    {t("regenerateSummary", { lang: langName(language) })}
                  </button>
                </div>
              ) : null}

              {headline ? (
                <h3 className="text-balance font-serif text-3xl font-medium leading-[1.1] tracking-tight text-ink sm:text-4xl">
                  {headline}
                </h3>
              ) : null}

              {overview ? (
                <p className="font-serif text-lg leading-relaxed text-ink-soft first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-serif first-letter:text-[3.4rem] first-letter:font-medium first-letter:leading-[0.8] first-letter:text-ink">
                  {overview}
                  {isStreaming ? (
                    <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-ink align-text-bottom motion-reduce:animate-none" />
                  ) : null}
                </p>
              ) : null}

              {insights.length > 0 ? (
                <div>
                  <h4 className="border-b border-ink pb-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink">
                    {t("keyInsights")}
                  </h4>
                  <ol className="divide-y divide-rule">
                    {insights.map((insight, i) => (
                      <li key={i} className="flex gap-4 py-3 text-[15px] leading-relaxed text-ink">
                        <span
                          className="pt-0.5 font-mono text-xs font-medium text-brand"
                          aria-hidden="true"
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span>{typeof insight === "string" ? insight : ""}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {!isStreaming && headline ? (
                <p className="text-xs italic text-subtle">{t("disclaimerShort")}</p>
              ) : null}
            </div>
          )}
        </div>
      </article>

      {/* On desktop the chat matches the summary's height (the summary sets
          the row height; the chat fills it absolutely and scrolls inside). */}
      <div className="h-[26rem] lg:relative lg:h-auto lg:min-h-[28rem]">
        <div className="h-full lg:absolute lg:inset-0 lg:pl-10">
          <Chat
            provider={provider}
            ticker={ticker}
            articles={articles}
            summary={summary}
          />
        </div>
      </div>
    </section>
  );
}
