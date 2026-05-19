"use client";

import { Languages } from "lucide-react";

import { LANGUAGES, useLanguage } from "@/lib/i18n";

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="radiogroup"
      aria-label={t("languageLabel")}
      className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/60 p-1 backdrop-blur"
    >
      <Languages
        className="ml-1.5 size-3.5 text-zinc-500"
        aria-hidden="true"
      />
      {LANGUAGES.map((opt) => {
        const active = language === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLanguage(opt.value)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
              active
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
