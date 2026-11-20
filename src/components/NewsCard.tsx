"use client";

import { ExternalLink, Newspaper } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { useLanguage } from "@/lib/i18n";
import type { NewsArticle } from "@/lib/types";

interface NewsCardProps {
  article: NewsArticle;
  /** Wider lead card; the feed uses it so 2 or 5 articles fill the grid. */
  featured?: boolean;
  /** Draw a placeholder when this card has no image but others do, so
      card heights line up across the row. */
  placeholder?: boolean;
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
    timeZoneName: "short",
  });
}

export default function NewsCard({
  article,
  featured = false,
  placeholder = false,
}: NewsCardProps) {
  const { language, t } = useLanguage();
  const locale = language === "es" ? "es-ES" : "en-US";
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(article.image) && !imageFailed;
  const media = `relative -mx-5 -mt-5 mb-1 aspect-[21/9] overflow-hidden bg-zinc-900 sm:aspect-[16/9] ${
    featured ? "md:aspect-[21/9]" : ""
  }`;

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex h-full flex-col gap-3 overflow-hidden ${featured ? "md:col-span-2" : ""} rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur transition-all hover:border-emerald-500/40 hover:bg-zinc-900/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400`}
    >
      {showImage ? (
        <div className={media}>
          {/* Publisher thumbnails come from arbitrary hosts, so they are not
              routed through the Next image optimizer. */}
          <Image
            src={article.image as string}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            referrerPolicy="no-referrer"
            className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
            onError={() => setImageFailed(true)}
          />
        </div>
      ) : placeholder ? (
        <div
          className={`${media} flex items-center justify-center bg-gradient-to-br from-emerald-950/60 via-zinc-900 to-zinc-950`}
          aria-hidden="true"
        >
          <Newspaper className="size-8 text-emerald-500/40" />
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="truncate font-medium uppercase tracking-wide text-emerald-400/90">
          {article.source.name}
        </span>
        <span className="shrink-0 text-zinc-500">
          {formatDate(article.publishedAt, locale)}
        </span>
      </div>

      <h3
        className={`font-semibold leading-snug text-zinc-100 group-hover:text-white ${
          featured ? "text-base md:text-xl" : "text-base"
        }`}
      >
        {article.title}
      </h3>

      {article.description ? (
        <p className="line-clamp-4 text-sm leading-relaxed text-zinc-400">
          {article.description}
        </p>
      ) : null}

      <div className="mt-auto flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors group-hover:text-emerald-400">
        {t("readArticle")}
        <span className="sr-only"> ({article.source.name})</span>
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </div>
    </a>
  );
}
