"use client";

import Link from "next/link";

import { gaId } from "@/lib/analytics";
import { useConsent } from "@/lib/consent";
import { useLanguage } from "@/lib/i18n";

export default function ConsentBanner() {
  const { t } = useLanguage();
  const { consent, setConsent } = useConsent();

  if (!gaId() || consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("cookieSettings")}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-[3px] border border-ink bg-paper-raised p-4 text-sm text-ink-soft shadow-xl shadow-black/15 sm:flex-row sm:items-center"
    >
      <p className="flex-1 leading-relaxed">
        {t("consentText")}{" "}
        <Link href="/privacy" className="font-medium text-ink underline underline-offset-4">
          {t("privacyLink")}
        </Link>
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setConsent("denied")}
          className="min-h-10 rounded-[3px] border border-rule-strong px-4 font-medium text-ink transition-colors hover:bg-highlight"
        >
          {t("consentDecline")}
        </button>
        <button
          type="button"
          onClick={() => setConsent("granted")}
          className="min-h-10 rounded-[3px] bg-ink px-4 font-semibold text-paper transition-colors hover:bg-ink-soft"
        >
          {t("consentAccept")}
        </button>
      </div>
    </div>
  );
}
