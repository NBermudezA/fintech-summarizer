"use client";

import { ExternalLink } from "lucide-react";

import { useLanguage } from "@/lib/i18n";
import type { NewsArticle } from "@/lib/types";

interface NewsCardProps {
  article: NewsArticle;
}

function formatDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NewsCard({ article }: NewsCardProps) {
  const { language, t } = useLanguage();
  const locale = language === "es" ? "es-ES" : "en-US";

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur transition-all hover:border-emerald-500/40 hover:bg-zinc-900/70"
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="truncate font-medium uppercase tracking-wide text-emerald-400/90">
          {article.source.name}
        </span>
        <span className="shrink-0 text-zinc-500">
          {formatDate(article.publishedAt, locale)}
        </span>
      </div>

      <h3 className="line-clamp-2 text-base font-semibold leading-snug text-zinc-100 group-hover:text-white">
        {article.title}
      </h3>

      {article.description ? (
        <p className="line-clamp-3 text-sm leading-relaxed text-zinc-400">
          {article.description}
        </p>
      ) : null}

      <div className="mt-auto flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors group-hover:text-emerald-400">
        {t("readArticle")}
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </div>
    </a>
  );
}
