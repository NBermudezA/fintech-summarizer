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
      className="relative z-40 w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-2 shadow-2xl shadow-emerald-500/5 backdrop-blur"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
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
            className="w-full rounded-xl bg-transparent py-3 pl-11 pr-32 text-base font-medium text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
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
              className="inline-flex items-center gap-1 rounded-lg bg-zinc-800/70 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/95 shadow-2xl backdrop-blur"
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
          className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
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
    <div className="border-b border-zinc-800/80 last:border-b-0">
      <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
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
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-zinc-800/60"
            >
              <span className="text-sm text-zinc-200">{tk.name}</span>
              <span className="font-mono text-xs text-emerald-300">
                {tk.symbol}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
