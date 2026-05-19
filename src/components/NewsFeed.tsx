import { Newspaper } from "lucide-react";

import NewsCard from "@/components/NewsCard";
import type { NewsArticle } from "@/lib/types";

interface NewsFeedProps {
  ticker: string | null;
  articles: NewsArticle[];
  isLoading: boolean;
  error: string | null;
}

function SkeletonCard() {
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="h-3 w-20 animate-pulse rounded bg-zinc-800" />
        <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
      </div>
      <div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-zinc-800/70" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-zinc-800/70" />
      </div>
    </div>
  );
}

export default function NewsFeed({
  ticker,
  articles,
  isLoading,
  error,
}: NewsFeedProps) {
  return (
    <section aria-labelledby="news-heading" className="w-full">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2
          id="news-heading"
          className="flex items-center gap-2 text-lg font-semibold text-zinc-100"
        >
          <Newspaper className="size-5 text-emerald-400" aria-hidden="true" />
          Latest news
          {ticker ? (
            <span className="text-zinc-500">
              · <span className="font-mono text-emerald-300">{ticker}</span>
            </span>
          ) : null}
        </h2>
        {articles.length > 0 ? (
          <span className="text-xs text-zinc-500">
            {articles.length} article{articles.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-5 py-4 text-sm text-rose-300">
          {error}
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 px-5 py-10 text-center text-sm text-zinc-500">
          {ticker
            ? `No articles found for ${ticker}.`
            : "Enter a ticker above to load the latest news."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <NewsCard key={a.url} article={a} />
          ))}
        </div>
      )}
    </section>
  );
}
