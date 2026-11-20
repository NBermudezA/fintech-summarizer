"use client";

import { useLanguage, type TranslationKey } from "@/lib/i18n";
import type { Sentiment } from "@/lib/types";

interface SentimentBadgeProps {
  sentiment: Sentiment | null;
}

// Glyph + word (never color alone) so the reading survives grayscale and
// color-blindness.
const STYLES: Record<Sentiment, { labelKey: TranslationKey; classes: string; glyph: string }> = {
  positive: { labelKey: "sentimentPositive", classes: "border-up text-up", glyph: "▲" },
  negative: { labelKey: "sentimentNegative", classes: "border-down text-down", glyph: "▼" },
  neutral: { labelKey: "sentimentNeutral", classes: "border-rule-strong text-ink-soft", glyph: "■" },
};

const BASE =
  "inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em]";

export default function SentimentBadge({ sentiment }: SentimentBadgeProps) {
  const { t } = useLanguage();

  if (!sentiment) {
    return (
      <span className={`${BASE} border-rule text-subtle`}>
        <span className="size-1.5 animate-pulse rounded-full bg-subtle motion-reduce:animate-none" />
        {t("sentimentAwaiting")}
      </span>
    );
  }

  const { labelKey, classes, glyph } = STYLES[sentiment];

  return (
    <span className={`${BASE} ${classes}`}>
      <span aria-hidden="true" className="text-[9px]">
        {glyph}
      </span>
      {t(labelKey)}
    </span>
  );
}
