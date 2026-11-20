"use client";

import Link from "next/link";

import { gaId } from "@/lib/analytics";
import { useConsent } from "@/lib/consent";
import { useLanguage } from "@/lib/i18n";
import { AUTHOR_NAME, REPO_URL } from "@/lib/site";

export default function Footer() {
  const { t } = useLanguage();
  const { setConsent } = useConsent();

  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
      <div className="border-t-2 border-ink pt-6 text-xs leading-relaxed text-subtle">
      <p className="max-w-3xl">{t("footerDisclaimer")}</p>
      <p className="mt-2">{t("footerNewsSource")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-0 sm:mt-4 sm:gap-y-2">
        <span>
          {t("footerBuiltBy")}{" "}
          <span className="font-medium text-ink">{AUTHOR_NAME}</span>
        </span>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline sm:min-h-6"
        >
          {t("sourceCode")}
        </a>
        <Link href="/privacy" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline sm:min-h-6">
          {t("privacyLink")}
        </Link>
        {gaId() ? (
          <button
            type="button"
            onClick={() => setConsent(null)}
            className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline sm:min-h-6"
          >
            {t("cookieSettings")}
          </button>
        ) : null}
      </div>
      </div>
    </footer>
  );
}
