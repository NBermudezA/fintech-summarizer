"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "fintech-summarizer:recent-tickers";
const MAX_RECENT = 5;

interface UseRecentTickers {
  recentTickers: string[];
  addTicker: (symbol: string) => void;
}

export function useRecentTickers(): UseRecentTickers {
  const [tickers, setTickers] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.every((s): s is string => typeof s === "string")
      ) {
        // Hydrating client-only state from localStorage after SSR — the
        // initial render intentionally returns [] so server and first client
        // render match, then this effect picks up the stored value.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTickers(parsed.slice(0, MAX_RECENT));
      }
    } catch {
      // Corrupt storage — ignore and start fresh.
    }
  }, []);

  const addTicker = useCallback((symbol: string) => {
    const cleaned = symbol.trim().toUpperCase();
    if (!cleaned) return;
    setTickers((prev) => {
      const next = [cleaned, ...prev.filter((t) => t !== cleaned)].slice(
        0,
        MAX_RECENT,
      );
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage may be unavailable (private mode, quota) — ignore.
      }
      return next;
    });
  }, []);

  return { recentTickers: tickers, addTicker };
}
