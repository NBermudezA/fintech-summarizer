"use client";

import { MessageSquare, Send, Sparkles } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

export default function ChatPlaceholder() {
  const { t } = useLanguage();

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60">
      <header className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <MessageSquare
            className="size-4 text-emerald-400"
            aria-hidden="true"
          />
          {t("chatTitle")}
        </div>
        <span className="rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          {t("chatBadge")}
        </span>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20">
            <Sparkles
              className="size-5 text-emerald-300"
              aria-hidden="true"
            />
          </div>
          <p className="text-sm font-medium text-zinc-300">
            {t("chatComingSoon")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{t("chatDescription")}</p>
        </div>
      </div>

      <div className="border-t border-zinc-800/80 p-3">
        <div className="flex items-end gap-2 rounded-xl bg-zinc-900/80 p-2 ring-1 ring-inset ring-zinc-800">
          <textarea
            disabled
            rows={1}
            placeholder={t("chatPlaceholder")}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none disabled:cursor-not-allowed"
            aria-label={t("chatInputLabel")}
          />
          <button
            type="button"
            disabled
            aria-label={t("sendLabel")}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-500 disabled:cursor-not-allowed"
          >
            <Send className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
