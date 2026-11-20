"use client";

import { LANGUAGES, useLanguage } from "@/lib/i18n";

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="radiogroup"
      aria-label={t("languageLabel")}
      className="inline-flex items-center rounded-[3px] border border-rule-strong font-mono text-[11px] font-medium"
    >
      {LANGUAGES.map((opt) => {
        const active = language === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLanguage(opt.value)}
            className={`min-h-8 min-w-10 px-2.5 tracking-[0.12em] transition-colors ${
              active ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
