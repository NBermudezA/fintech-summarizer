import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ARTICLES = [
  {
    title: "Nvidia beats revenue estimates",
    description: "Data-center sales jumped again as AI demand stayed strong.",
    url: "https://example.com/nvda-1",
    publishedAt: "2026-11-16T10:00:00Z",
    source: { name: "Reuters" },
  },
  {
    title: "Chip stocks rally into earnings",
    description: null,
    url: "https://example.com/nvda-2",
    publishedAt: "2026-11-15T10:00:00Z",
    source: { name: "AP" },
  },
];

const SUMMARY = {
  headline: "Nvidia rallies on strong AI demand",
  marketOverview: "Semiconductors led the market higher as Nvidia beat estimates.",
  keyInsights: ["Data-center revenue grew.", "Guidance was raised.", "Peers rallied too."],
  sentiment: "positive",
};

const sse = (chunks: unknown[]) => chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("");

async function mockSummarize(page: Page) {
  await page.route("**/api/summarize", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: sse([
        { type: "articles", data: ARTICLES },
        { type: "object", data: { headline: SUMMARY.headline } },
        { type: "object", data: SUMMARY },
        { type: "done" },
      ]),
    }),
  );
}

test("landing page renders, has no console errors and no horizontal scroll", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto("/");
  await expect(page).toHaveTitle(/Fintech Summarizer/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fintech Summarizer");
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await expect(page.getByText(/Nothing here is investment advice/)).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test("full analysis flow: search → news → streamed summary → chat", async ({ page }) => {
  await mockSummarize(page);
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "x-vercel-ai-ui-message-stream": "v1" },
      body: sse([
        { type: "start" },
        { type: "text-start", id: "t1" },
        { type: "text-delta", id: "t1", delta: "Revenue beat on AI demand." },
        { type: "text-end", id: "t1" },
        { type: "finish" },
      ]) + "data: [DONE]\n\n",
    }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: /Popular/ }).click();
  await page.getByRole("option", { name: /NVIDIA/ }).click();
  await page.getByRole("button", { name: "Analyze" }).click();

  await expect(page.getByText("Nvidia beats revenue estimates")).toBeVisible();
  await expect(page.getByRole("heading", { name: SUMMARY.headline })).toBeVisible();
  await expect(page.getByText("BULLISH")).toBeVisible();
  await expect(page.getByText("Peers rallied too.")).toBeVisible();
  await expect(page.getByText(/Not financial advice/)).toBeVisible();

  const card = page.getByRole("link", { name: /Nvidia beats revenue estimates/ });
  await expect(card).toHaveAttribute("href", "https://example.com/nvda-1");
  await expect(card).toHaveAttribute("rel", "noopener noreferrer");

  await expect(page.getByRole("button", { name: "NVDA" })).toBeVisible(); // recent chip

  const chatInput = page.getByLabel("Chat input");
  await chatInput.fill("Why did it go up?");
  const chatRequest = page.waitForRequest("**/api/chat");
  await chatInput.press("Enter");
  const body = (await chatRequest).postDataJSON() as { ticker: string; articles: unknown[] };
  expect(body.ticker).toBe("NVDA");
  expect(body.articles).toHaveLength(2);
  await expect(page.getByText("Revenue beat on AI demand.")).toBeVisible();
});

test("API errors are shown to the user", async ({ page }) => {
  await page.route("**/api/summarize", (route) =>
    route.fulfill({ status: 429, json: { error: "Too many requests.", code: "rate_limited" } }),
  );
  await page.goto("/");
  await page.getByLabel("Stock ticker symbol").fill("AAPL");
  await page.getByRole("button", { name: "Analyze" }).click();
  await expect(
    page.getByText("Too many requests. Please wait a moment and try again.").first(),
  ).toBeVisible();
  // The same error follows the language toggle.
  await page.getByRole("radio", { name: "ES" }).click();
  await expect(page.getByText(/Demasiadas solicitudes/).first()).toBeVisible();
});

test("language toggle switches copy and <html lang>, and persists", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "ES" }).click();
  await expect(page.getByRole("button", { name: "Analizar" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.reload();
  await expect(page.getByRole("button", { name: "Analizar" })).toBeVisible();
});

test("no WCAG A/AA violations on landing or results", async ({ page }) => {
  // Reduced motion so axe never samples colors mid-transition.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockSummarize(page);
  await page.goto("/");
  const wcag = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
  expect((await new AxeBuilder({ page }).withTags(wcag).analyze()).violations).toEqual([]);

  await page.getByLabel("Stock ticker symbol").fill("NVDA");
  await page.getByRole("button", { name: "Analyze" }).click();
  await expect(page.getByText("Peers rallied too.")).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(wcag).analyze()).violations).toEqual([]);
});

test("privacy page is reachable from the footer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { name: "Not financial advice" })).toBeVisible();
});
