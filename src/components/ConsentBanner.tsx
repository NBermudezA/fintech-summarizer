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
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4 text-sm text-zinc-300 shadow-2xl backdrop-blur sm:flex-row sm:items-center"
    >
      <p className="flex-1 leading-relaxed">
        {t("consentText")}{" "}
        <Link href="/privacy" className="text-emerald-300 underline-offset-2 hover:underline">
          {t("privacyLink")}
        </Link>
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setConsent("denied")}
          className="rounded-lg px-3 py-2 font-medium text-zinc-300 ring-1 ring-inset ring-zinc-700 transition-colors hover:bg-zinc-800"
        >
          {t("consentDecline")}
        </button>
        <button
          type="button"
          onClick={() => setConsent("granted")}
          className="rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
        >
          {t("consentAccept")}
        </button>
      </div>
    </div>
  );
}
