import { TRANSLATIONS } from "@/lib/translations";
import {
  AUTHOR_NAME,
  REPO_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

const FAQ = [1, 2, 3, 4] as const;

/** schema.org graph: the web app itself plus its FAQ (English copy). */
export function buildJsonLd(): Record<string, unknown> {
  const en = TRANSLATIONS.en;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Any (web browser)",
        inLanguage: ["en", "es"],
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        author: { "@type": "Person", name: AUTHOR_NAME, url: REPO_URL },
        sameAs: [REPO_URL],
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: FAQ.map((n) => ({
          "@type": "Question",
          name: en[`faqQ${n}`],
          acceptedAnswer: { "@type": "Answer", text: en[`faqA${n}`] },
        })),
      },
    ],
  };
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
