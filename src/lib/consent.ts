"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ConsentState = "granted" | "denied" | null;

export const CONSENT_KEY = "fintech-summarizer:analytics-consent";
const CONSENT_EVENT = "fintech-summarizer:consent-change";

export function readConsent(): ConsentState {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function writeConsent(next: ConsentState): void {
  try {
    if (next === null) window.localStorage.removeItem(CONSENT_KEY);
    else window.localStorage.setItem(CONSENT_KEY, next);
  } catch {
    // Storage blocked — the choice still applies for this page view.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// "unknown" on the server so SSR never renders the banner or GA tag.
const serverSnapshot = (): ConsentState | "unknown" => "unknown";

export function useConsent(): {
  consent: ConsentState | "unknown";
  setConsent: (next: ConsentState) => void;
} {
  const consent = useSyncExternalStore(subscribe, readConsent, serverSnapshot);
  const setConsent = useCallback((next: ConsentState) => writeConsent(next), []);
  return { consent, setConsent };
}
