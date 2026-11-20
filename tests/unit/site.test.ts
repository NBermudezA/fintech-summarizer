// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("SITE_URL", () => {
  it("defaults to the custom domain", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const { SITE_URL } = await import("@/lib/site");
    expect(SITE_URL).toBe("https://fintech.nicobermudez.com");
  });

  it("can be overridden and drops trailing slashes", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.example.com//");
    const { SITE_URL } = await import("@/lib/site");
    expect(SITE_URL).toBe("https://staging.example.com");
  });
});
