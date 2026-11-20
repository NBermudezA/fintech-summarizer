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
    <footer className="mx-auto w-full max-w-6xl border-t border-zinc-800/80 px-4 py-8 text-xs leading-relaxed text-zinc-500 sm:px-6">
      <p className="max-w-3xl">{t("footerDisclaimer")}</p>
      <p className="mt-2">{t("footerNewsSource")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-0 sm:mt-4 sm:gap-y-2">
        <span>
          {t("footerBuiltBy")}{" "}
          <span className="font-medium text-zinc-300">{AUTHOR_NAME}</span>
        </span>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center hover:text-emerald-300 sm:min-h-6"
        >
          {t("sourceCode")}
        </a>
        <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-emerald-300 sm:min-h-6">
          {t("privacyLink")}
        </Link>
        {gaId() ? (
          <button
            type="button"
            onClick={() => setConsent(null)}
            className="inline-flex min-h-11 items-center hover:text-emerald-300 sm:min-h-6"
          >
            {t("cookieSettings")}
          </button>
        ) : null}
      </div>
    </footer>
  );
}
