"use client";

import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";

import type { Provider } from "@/lib/types";

interface SearchFormProps {
  isLoading: boolean;
  onSubmit: (ticker: string, provider: Provider) => void;
}

const PROVIDER_OPTIONS: { value: Provider; label: string }[] = [
  { value: "anthropic", label: "Claude" },
  { value: "openai", label: "GPT-4o" },
];

export default function SearchForm({ isLoading, onSubmit }: SearchFormProps) {
  const [ticker, setTicker] = useState("");
  const [provider, setProvider] = useState<Provider>("anthropic");

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const cleaned = ticker.trim().toUpperCase();
    if (!cleaned || isLoading) return;
    onSubmit(cleaned, provider);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-2 shadow-2xl shadow-emerald-500/5 backdrop-blur"
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
            placeholder="Enter a ticker (AAPL, TSLA, BTC...)"
            disabled={isLoading}
            spellCheck={false}
            autoComplete="off"
            maxLength={10}
            className="w-full rounded-xl bg-transparent py-3 pl-11 pr-4 text-base font-medium text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
            aria-label="Stock ticker symbol"
          />
        </div>

        <div className="flex items-stretch gap-2 sm:items-center">
          <div
            role="radiogroup"
            aria-label="AI provider"
            className="inline-flex rounded-xl bg-zinc-800/60 p-1"
          >
            {PROVIDER_OPTIONS.map((opt) => {
              const active = provider === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setProvider(opt.value)}
                  disabled={isLoading}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                    active
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={isLoading || ticker.trim().length === 0}
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {isLoading ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      </div>
    </form>
  );
}
