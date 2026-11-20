"use client";

import { ArrowUpRight, Newspaper } from "lucide-react";
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
  const media = `relative mb-1 aspect-[21/9] overflow-hidden rounded-[2px] bg-highlight sm:aspect-[16/9] ${
    featured ? "md:aspect-[21/9]" : ""
  }`;

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex h-full flex-col gap-3 border-t border-rule pt-4 ${featured ? "md:col-span-2" : ""}`}
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
            className="object-cover grayscale-[35%] transition-[filter] duration-300 group-hover:grayscale-0 motion-reduce:transition-none"
            onError={() => setImageFailed(true)}
          />
        </div>
      ) : placeholder ? (
        <div className={`${media} flex items-center justify-center`} aria-hidden="true">
          <Newspaper className="size-7 text-rule-strong" strokeWidth={1.25} />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.12em]">
        <span className="truncate font-medium text-ink">{article.source.name}</span>
        <span className="shrink-0 text-subtle">{formatDate(article.publishedAt, locale)}</span>
      </div>

      <h3
        className={`text-balance font-serif font-medium leading-snug text-ink decoration-1 underline-offset-4 group-hover:underline ${
          featured ? "text-xl md:text-3xl md:leading-tight" : "text-xl"
        }`}
      >
        {article.title}
      </h3>

      {article.description ? (
        <p className="line-clamp-4 text-sm leading-relaxed text-ink-soft">
          {article.description}
        </p>
      ) : null}

      <div className="mt-auto flex items-center gap-1 text-xs font-medium text-subtle transition-colors group-hover:text-ink">
        {t("readArticle")}
        <span className="sr-only"> ({article.source.name})</span>
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </div>
    </a>
  );
}
