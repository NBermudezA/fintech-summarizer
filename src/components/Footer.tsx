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
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>
          {t("footerBuiltBy")}{" "}
          <span className="font-medium text-zinc-300">{AUTHOR_NAME}</span>
        </span>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-emerald-300"
        >
          {t("sourceCode")}
        </a>
        <Link href="/privacy" className="hover:text-emerald-300">
          {t("privacyLink")}
        </Link>
        {gaId() ? (
          <button
            type="button"
            onClick={() => setConsent(null)}
            className="hover:text-emerald-300"
          >
            {t("cookieSettings")}
          </button>
        ) : null}
      </div>
    </footer>
  );
}
