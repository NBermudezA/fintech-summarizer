/** GA4 measurement ID, or null when unset/malformed (analytics off). */
export function gaId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_ID ?? "";
  return /^G-[A-Z0-9]+$/.test(id) ? id : null;
}

type GtagFn = (command: "event", name: string, params?: object) => void;

/**
 * Send a GA4 event. No-op until the user has consented and the GA script has
 * loaded (window.gtag only exists after that), so callers never need guards.
 */
export function trackEvent(
  name: string,
  params: Record<string, string | number | boolean> = {},
): void {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: GtagFn }).gtag;
  if (typeof gtag === "function") gtag("event", name, params);
}
