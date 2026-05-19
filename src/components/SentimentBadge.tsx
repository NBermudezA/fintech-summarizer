"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { useLanguage, type TranslationKey } from "@/lib/i18n";
import type { Sentiment } from "@/lib/types";

interface SentimentBadgeProps {
  sentiment: Sentiment | null;
}

const STYLES: Record<
  Sentiment,
  { labelKey: TranslationKey; classes: string; Icon: typeof TrendingUp }
> = {
  positive: {
    labelKey: "sentimentPositive",
    classes: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
    Icon: TrendingUp,
  },
  negative: {
    labelKey: "sentimentNegative",
    classes: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
    Icon: TrendingDown,
  },
  neutral: {
    labelKey: "sentimentNeutral",
    classes: "bg-zinc-500/10 text-zinc-300 ring-zinc-500/30",
    Icon: Minus,
  },
};

export default function SentimentBadge({ sentiment }: SentimentBadgeProps) {
  const { t } = useLanguage();

  if (!sentiment) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/60 px-3 py-1 text-xs font-medium tracking-wider text-zinc-500 ring-1 ring-inset ring-zinc-700/50">
        <span className="size-1.5 animate-pulse rounded-full bg-zinc-500" />
        {t("sentimentAwaiting")}
      </span>
    );
  }

  const { labelKey, classes, Icon } = STYLES[sentiment];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wider ring-1 ring-inset ${classes}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {t(labelKey)}
    </span>
  );
}
