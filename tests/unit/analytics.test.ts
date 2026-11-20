import { afterEach, describe, expect, it, vi } from "vitest";

import { gaId, trackEvent } from "@/lib/analytics";
import { readConsent, writeConsent } from "@/lib/consent";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("analytics", () => {
  it("only accepts GA4 measurement ids", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-ABC123");
    expect(gaId()).toBe("G-ABC123");
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "nope");
    expect(gaId()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_GA_ID", undefined as unknown as string);
    expect(gaId()).toBeNull();
  });

  it("trackEvent is a no-op until gtag exists", () => {
    expect(() => trackEvent("x")).not.toThrow();
    const gtag = vi.fn();
    (window as unknown as { gtag: typeof gtag }).gtag = gtag;
    trackEvent("x");
    expect(gtag).toHaveBeenCalledWith("event", "x", {});
    delete (window as unknown as { gtag?: unknown }).gtag;
  });

  it("trackEvent is safe during SSR", () => {
    vi.stubGlobal("window", undefined);
    expect(() => trackEvent("x")).not.toThrow();
    vi.unstubAllGlobals();
  });
});

describe("consent storage", () => {
  it("reads only known values and survives blocked storage", () => {
    expect(readConsent()).toBeNull();
    writeConsent("granted");
    expect(readConsent()).toBe("granted");
    localStorage.setItem("fintech-summarizer:analytics-consent", "maybe");
    expect(readConsent()).toBeNull();
    writeConsent(null);
    expect(localStorage.getItem("fintech-summarizer:analytics-consent")).toBeNull();

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readConsent()).toBeNull();
    expect(() => writeConsent("denied")).not.toThrow();
  });
});
