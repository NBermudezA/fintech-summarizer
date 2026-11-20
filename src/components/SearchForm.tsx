"use client";

import { ChevronDown, Search } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { useLanguage } from "@/lib/i18n";
import { POPULAR_TICKERS, type PopularTicker } from "@/lib/tickers";
import type { Provider } from "@/lib/types";

interface SearchFormProps {
  isLoading: boolean;
  provider: Provider;
  onSubmit: (ticker: string, provider: Provider) => void;
}

export default function SearchForm({
  isLoading,
  provider,
  onSubmit,
}: SearchFormProps) {
  const { t } = useLanguage();
  const [ticker, setTicker] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    const stocks: PopularTicker[] = [];
    const crypto: PopularTicker[] = [];
    for (const tk of POPULAR_TICKERS) {
      (tk.category === "stock" ? stocks : crypto).push(tk);
    }
    return { stocks, crypto };
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;

    const handleClick = (e: MouseEvent): void => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
      ) {
        setPickerOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setPickerOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [pickerOpen]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const cleaned = ticker.trim().toUpperCase();
    if (!cleaned || isLoading) return;
    onSubmit(cleaned, provider);
  };

  const pickTicker = (symbol: string): void => {
    setTicker(symbol);
    setPickerOpen(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative z-40 w-full"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="relative flex-1 rounded-[3px] border border-ink bg-paper-raised focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-subtle"
            aria-hidden="true"
          />
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder={t("tickerPlaceholder")}
            disabled={isLoading}
            spellCheck={false}
            autoComplete="off"
            maxLength={10}
            className="w-full bg-transparent py-3.5 pl-11 pr-32 font-mono text-base font-medium uppercase tracking-wide text-ink placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-subtle focus:outline-none disabled:opacity-50"
            aria-label={t("tickerLabel")}
          />

          <div
            ref={pickerRef}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              disabled={isLoading}
              aria-haspopup="listbox"
              aria-expanded={pickerOpen}
              className="inline-flex min-h-9 items-center gap-1 border-l border-rule px-3 text-xs font-medium uppercase tracking-wider text-ink-soft transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("popularButton")}
              <ChevronDown
                className={`size-3.5 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {pickerOpen ? (
              <div
                role="listbox"
                aria-label={t("popularPanelLabel")}
                className="absolute right-0 top-full z-50 mt-3 max-h-[min(26rem,60vh)] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-[3px] border border-ink bg-paper-raised shadow-xl shadow-black/10"
              >
                <PickerGroup
                  label={t("stocksGroup")}
                  tickers={groups.stocks}
                  onPick={pickTicker}
                />
                <PickerGroup
                  label={t("cryptoGroup")}
                  tickers={groups.crypto}
                  onPick={pickTicker}
                />
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || ticker.trim().length === 0}
          className="min-h-12 rounded-[3px] bg-ink px-6 text-sm font-semibold uppercase tracking-wider text-paper transition-colors motion-reduce:transition-none hover:bg-ink-soft disabled:cursor-not-allowed disabled:bg-highlight disabled:text-subtle"
        >
          {isLoading ? t("analyzing") : t("analyze")}
        </button>
      </div>
    </form>
  );
}

function PickerGroup({
  label,
  tickers,
  onPick,
}: {
  label: string;
  tickers: PopularTicker[];
  onPick: (symbol: string) => void;
}) {
  if (tickers.length === 0) return null;
  return (
    <div className="border-b border-rule last:border-b-0">
      <div className="px-3 pb-1 pt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-subtle">
        {label}
      </div>
      <ul className="pb-1">
        {tickers.map((tk) => (
          <li key={tk.symbol}>
            <button
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => onPick(tk.symbol)}
              className="flex min-h-10 w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-highlight"
            >
              <span className="text-sm text-ink">{tk.name}</span>
              <span className="font-mono text-xs font-medium text-brand">
                {tk.symbol}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
