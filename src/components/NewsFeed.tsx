"use client";

import NewsCard from "@/components/NewsCard";
import { useLanguage } from "@/lib/i18n";
import type { NewsArticle } from "@/lib/types";

interface NewsFeedProps {
  ticker: string | null;
  articles: NewsArticle[];
  isLoading: boolean;
  error: string | null;
}

const BAR = "animate-pulse rounded-[2px] bg-highlight motion-reduce:animate-none";

function SkeletonCard() {
  return (
    <div className="flex h-full flex-col gap-3 border-t border-rule pt-4" aria-hidden="true">
      <div className={`aspect-[21/9] w-full sm:aspect-[16/9] ${BAR}`} />
      <div className="flex items-center justify-between gap-3">
        <div className={`h-3 w-20 ${BAR}`} />
        <div className={`h-3 w-24 ${BAR}`} />
      </div>
      <div className={`h-5 w-full ${BAR}`} />
      <div className={`h-5 w-3/4 ${BAR}`} />
    </div>
  );
}

export default function NewsFeed({
  ticker,
  articles,
  isLoading,
  error,
}: NewsFeedProps) {
  const { t } = useLanguage();
  const hasImages = articles.some((a) => Boolean(a.image));

  return (
    <section aria-labelledby="news-heading" className="w-full border-t-2 border-ink pt-4">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="news-heading" className="font-serif text-2xl font-medium text-ink sm:text-3xl">
          {t("newsHeading")}
          {ticker ? (
            <span className="ml-3 font-mono text-sm font-medium tracking-wide text-subtle">
              {ticker}
            </span>
          ) : null}
        </h2>
        {articles.length > 0 ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-subtle">
            {articles.length === 1
              ? t("articleCountSingular")
              : t("articleCountPlural", { count: articles.length })}
          </span>
        ) : null}
      </div>

      {error ? (
        <div role="alert" className="border-l-4 border-down bg-highlight px-5 py-4 text-sm text-ink">
          {error}
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <p className="border-y border-rule py-10 text-center font-serif text-lg italic text-subtle">
          {ticker ? t("noArticles", { ticker }) : t("enterTicker")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a, i) => (
            <NewsCard
              key={a.url}
              article={a}
              featured={i === 0 && articles.length % 3 === 2}
              placeholder={hasImages}
            />
          ))}
        </div>
      )}
    </section>
  );
}
