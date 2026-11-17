"use client";

import { Newspaper, Search, Sparkles } from "lucide-react";

import { useLanguage, type TranslationKey } from "@/lib/i18n";

const STEPS: { Icon: typeof Search; title: TranslationKey; body: TranslationKey }[] = [
  { Icon: Search, title: "howStep1Title", body: "howStep1Body" },
  { Icon: Newspaper, title: "howStep2Title", body: "howStep2Body" },
  { Icon: Sparkles, title: "howStep3Title", body: "howStep3Body" },
];

export const FAQ_KEYS: { q: TranslationKey; a: TranslationKey }[] = [
  { q: "faqQ1", a: "faqA1" },
  { q: "faqQ2", a: "faqA2" },
  { q: "faqQ3", a: "faqA3" },
  { q: "faqQ4", a: "faqA4" },
];

/**
 * Static, crawlable copy. Search and AI answer engines need real text to
 * understand and cite the page; the interactive app alone gives them none.
 */
export default function InfoSections() {
  const { t } = useLanguage();

  return (
    <div className="grid w-full gap-10 lg:grid-cols-2">
      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="mb-4 text-lg font-semibold text-zinc-100">
          {t("howHeading")}
        </h2>
        <ol className="space-y-4">
          {STEPS.map(({ Icon, title, body }, i) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  {i + 1}. {t(title)}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{t(body)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="mb-4 text-lg font-semibold text-zinc-100">
          {t("faqHeading")}
        </h2>
        <div className="divide-y divide-zinc-800/80 rounded-2xl border border-zinc-800/80">
          {FAQ_KEYS.map(({ q, a }) => (
            <details key={q} className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center px-5 py-3 text-sm font-medium text-zinc-200 marker:hidden hover:text-white [&::-webkit-details-marker]:hidden">
                <span className="mr-2 inline-block text-emerald-400 transition-transform group-open:rotate-90">
                  ›
                </span>
                {t(q)}
              </summary>
              <p className="px-5 pb-4 pl-10 text-sm leading-relaxed text-zinc-400">{t(a)}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
