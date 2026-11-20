"use client";

import { useLanguage, type TranslationKey } from "@/lib/i18n";

const STEPS: { title: TranslationKey; body: TranslationKey }[] = [
  { title: "howStep1Title", body: "howStep1Body" },
  { title: "howStep2Title", body: "howStep2Body" },
  { title: "howStep3Title", body: "howStep3Body" },
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
    <div className="grid w-full gap-12 lg:grid-cols-2 lg:gap-16">
      <section aria-labelledby="how-heading" className="border-t-2 border-ink pt-4">
        <h2 id="how-heading" className="mb-6 font-serif text-2xl font-medium text-ink sm:text-3xl">
          {t("howHeading")}
        </h2>
        <ol className="divide-y divide-rule border-y border-rule">
          {STEPS.map(({ title, body }, i) => (
            <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-x-2 py-4">
              <span className="font-mono text-sm font-medium text-brand" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-serif text-lg font-medium text-ink">{t(title)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t(body)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="faq-heading" className="border-t-2 border-ink pt-4">
        <h2 id="faq-heading" className="mb-6 font-serif text-2xl font-medium text-ink sm:text-3xl">
          {t("faqHeading")}
        </h2>
        <div className="divide-y divide-rule border-y border-rule">
          {FAQ_KEYS.map(({ q, a }) => (
            <details key={q} className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 font-serif text-lg text-ink marker:hidden hover:text-ink-soft [&::-webkit-details-marker]:hidden">
                {t(q)}
                <span
                  aria-hidden="true"
                  className="font-mono text-base text-subtle transition-transform group-open:rotate-45 motion-reduce:transition-none"
                >
                  +
                </span>
              </summary>
              <p className="pb-4 pr-8 text-sm leading-relaxed text-ink-soft">{t(a)}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
